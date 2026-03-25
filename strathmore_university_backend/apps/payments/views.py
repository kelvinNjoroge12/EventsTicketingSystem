from __future__ import annotations

import hmac
import json
import logging
import uuid
from datetime import datetime, timezone as dt_timezone
from decimal import Decimal

import stripe
from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import F
from django.http import HttpRequest, HttpResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from rest_framework import permissions, status, throttling
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.notifications.serializers import create_notification
from apps.notifications.email_service import EmailService
from apps.notifications.utils import should_send_email_notification
from apps.orders.models import Order, Ticket
from apps.orders.utils import send_ticket_email
from apps.tickets.models import TicketType
from .models import ChargebackCase, Payment, PaymentWebhookEvent
from .mpesa_service import MpesaService
from .promo_usage import consume_promo_code_usage, release_promo_code_usage
from .simulation import verify_simulation_token
from .stripe_service import StripeService

logger = logging.getLogger(__name__)


def _confirm_order_and_issue_tickets(order: Order) -> tuple[Order, bool]:
    """
    Idempotent finalization:
    - move order pending -> confirmed
    - move ticket reservation -> sold
    - create one Ticket row per purchased unit
    """
    with transaction.atomic():
        locked = (
            Order.objects.select_for_update()
            .prefetch_related("items__ticket_type")
            .get(pk=order.pk)
        )

        if locked.status == "confirmed":
            return locked, False
        if locked.status not in ("pending", "payment_processing"):
            raise ValueError("Order is not pending.")

        locked.status = "confirmed"
        locked.save(update_fields=["status"])
        consume_promo_code_usage(locked)

        tickets_to_create: list[Ticket] = []
        for item in locked.items.all():
            for _ in range(item.quantity):
                tickets_to_create.append(
                    Ticket(
                        order=locked,
                        order_item=item,
                        event=locked.event,
                        ticket_type=item.ticket_type,
                        attendee_name=f"{locked.attendee_first_name} {locked.attendee_last_name}",
                        attendee_email=locked.attendee_email,
                        status="valid",
                        qr_code_data=uuid.uuid4(),
                    )
                )

            if item.ticket_type_id:
                TicketType.objects.filter(id=item.ticket_type_id).update(
                    quantity_reserved=F("quantity_reserved") - item.quantity,
                    quantity_sold=F("quantity_sold") + item.quantity,
                )

        if tickets_to_create:
            Ticket.objects.bulk_create(tickets_to_create)

        return locked, True


def _validate_confirmation_access(request, order: Order) -> Response | None:
    simulation_token = (request.data.get("simulation_token") or "").strip()
    attendee_email = (request.data.get("attendee_email") or "").strip().lower()

    if not simulation_token:
        return Response(
            {"detail": "simulation_token is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    max_age_seconds = int(getattr(settings, "SIMULATED_PAYMENT_TOKEN_MAX_AGE_SECONDS", 3600))
    if not verify_simulation_token(order.order_number, simulation_token, max_age_seconds=max_age_seconds):
        return Response(
            {"detail": "Invalid or expired confirmation token."},
            status=status.HTTP_403_FORBIDDEN,
        )

    user = request.user
    if order.attendee_id:
        if user.is_authenticated and (user.id == order.attendee_id or user.is_staff):
            return None
        return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)

    if not attendee_email or attendee_email.lower() != (order.attendee_email or "").lower():
        return Response(
            {"detail": "attendee_email is required for guest orders."},
            status=status.HTTP_403_FORBIDDEN,
        )

    return None


def _notify_and_email(order: Order, title: str):
    if order.attendee:
        create_notification(
            recipient=order.attendee,
            notification_type="ticket_confirmed",
            title=title,
            message=(
                f"Your order #{order.order_number} for "
                f"{order.event.title if order.event else 'the event'} has been confirmed. "
                f"Check your tickets below."
            ),
            event=order.event,
            action_url=f"/confirmation/{order.order_number}",
        )

    if order.event and order.event.organizer and order.event.organizer != order.attendee:
        organizer = order.event.organizer
        create_notification(
            recipient=order.event.organizer,
            notification_type="ticket_confirmed",
            title="New ticket sale",
            message=(
                f"New order #{order.order_number} for "
                f"{order.event.title if order.event else 'your event'} "
                f"by {order.attendee_first_name} {order.attendee_last_name}."
            ),
            event=order.event,
            action_url=f"/organizer/events/{order.event.slug}",
        )
        try:
            if should_send_email_notification(organizer, "new_sales"):
                EmailService().send_new_sale_email(organizer, order)
        except Exception:  # pragma: no cover
            logger.exception("Organizer sale email failed for order %s", order.order_number)

    if getattr(settings, "ASYNC_TICKET_EMAIL", True):
        _dispatch_ticket_email_async(order)
        return

    try:
        send_ticket_email(order)
    except Exception as exc:  # pragma: no cover
        logger.error(
            "Email failed for order %s: %s - %s",
            order.order_number,
            exc.__class__.__name__,
            exc,
        )


def _dispatch_ticket_email_async(order: Order) -> None:
    """
    Dispatch ticket email via Celery task instead of raw threads (issue #5).
    Uses transaction.on_commit to avoid enqueueing before DB changes are visible.
    """
    from apps.notifications.tasks import send_ticket_email_task

    order_id = str(order.pk)

    def _enqueue():
        try:
            send_ticket_email_task.delay(order_id)
        except Exception:
            logger.exception("Celery enqueue failed for order %s; sending email inline", order.order_number)
            send_ticket_email(order)

    try:
        transaction.on_commit(_enqueue)
    except RuntimeError:
        # No transaction active â€” fire immediately
        _enqueue()



class StripeCreatePaymentIntentView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [throttling.ScopedRateThrottle]
    throttle_scope = "checkout"

    def post(self, request):
        order_number = (request.data.get("order_number") or "").strip()
        if not order_number:
            return Response({"detail": "order_number is required."}, status=status.HTTP_400_BAD_REQUEST)

        order = Order.objects.filter(
            order_number=order_number,
            status__in=["pending", "payment_processing"],
        ).first()
        if not order:
            return Response({"detail": "Order not found or not payable."}, status=status.HTTP_400_BAD_REQUEST)

        access_error = _validate_confirmation_access(request, order)
        if access_error:
            return access_error

        if order.status != "payment_processing":
            order.status = "payment_processing"
            order.save(update_fields=["status"])

        service = StripeService()
        client_secret = service.create_payment_intent(order)
        return Response({"client_secret": client_secret})


class FreeOrderConfirmView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [throttling.ScopedRateThrottle]
    throttle_scope = "checkout"

    def post(self, request):
        order_number = (request.data.get("order_number") or "").strip()
        if not order_number:
            return Response({"detail": "order_number is required."}, status=status.HTTP_400_BAD_REQUEST)

        order = Order.objects.filter(
            order_number=order_number,
            status__in=["pending", "payment_processing"],
        ).first()
        if not order:
            return Response({"detail": "Order not found or not pending."}, status=status.HTTP_400_BAD_REQUEST)

        access_error = _validate_confirmation_access(request, order)
        if access_error:
            return access_error

        if order.payment_method != "free" or order.total > 0:
            return Response({"detail": "Order is not free."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            order, created = _confirm_order_and_issue_tickets(order)
        except ValueError:
            return Response(
                {"detail": "Order cannot be confirmed in its current state."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if created:
            _notify_and_email(order, title="Your free tickets are confirmed! ðŸŽ‰")

        return Response({"success": True, "message": "Free order confirmed."})


class SimulatePaymentConfirmView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [throttling.ScopedRateThrottle]
    throttle_scope = "checkout"

    def post(self, request):
        if not getattr(settings, "ENABLE_SIMULATED_PAYMENTS", False):
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        order_number = (request.data.get("order_number") or "").strip()
        if not order_number:
            return Response({"detail": "order_number is required."}, status=status.HTTP_400_BAD_REQUEST)

        order = Order.objects.filter(
            order_number=order_number,
            status__in=["pending", "payment_processing"],
        ).first()
        if not order:
            return Response({"detail": "Order not found or not pending."}, status=status.HTTP_400_BAD_REQUEST)

        access_error = _validate_confirmation_access(request, order)
        if access_error:
            return access_error

        try:
            order, created = _confirm_order_and_issue_tickets(order)
        except ValueError:
            return Response(
                {"detail": "Order cannot be confirmed in its current state."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if created:
            _notify_and_email(order, title="Your tickets are confirmed! ðŸŽ‰")

        return Response({"success": True, "message": "Order confirmed. Ticket email dispatched."})


def _resolve_payment_for_stripe_object(stripe_object: dict) -> Payment | None:
    payment_intent_id = ""
    order_number = ""
    object_type = stripe_object.get("object")

    if object_type == "payment_intent":
        payment_intent_id = stripe_object.get("id", "")
    else:
        payment_intent_id = stripe_object.get("payment_intent", "") or ""

    metadata = stripe_object.get("metadata", {}) or {}
    order_number = (metadata.get("order_number") or "").strip()

    # Dispute/refund events often provide only the charge ID.
    if not payment_intent_id and stripe_object.get("charge"):
        try:
            charge = stripe.Charge.retrieve(stripe_object["charge"])
            payment_intent_id = charge.get("payment_intent", "") or ""
            order_number = order_number or (charge.get("metadata", {}) or {}).get("order_number", "")
        except Exception:
            logger.exception("Failed to resolve Stripe charge %s", stripe_object.get("charge"))

    payment = None
    if payment_intent_id:
        payment = Payment.objects.select_related("order").filter(
            stripe_payment_intent_id=payment_intent_id
        ).first()

    if payment is None and order_number:
        payment = Payment.objects.select_related("order").filter(
            order__order_number=order_number
        ).first()

    return payment


def _mark_webhook_processed(
    webhook_event: PaymentWebhookEvent,
    payment: Payment | None = None,
) -> None:
    webhook_event.processing_status = "processed"
    webhook_event.processing_error = ""
    webhook_event.processed_at = timezone.now()
    if payment is not None:
        webhook_event.payment = payment
    webhook_event.save(
        update_fields=[
            "processing_status",
            "processing_error",
            "processed_at",
            "payment",
            "updated_at",
        ]
    )


def _mark_webhook_failed(webhook_event: PaymentWebhookEvent, exc: Exception) -> None:
    webhook_event.processing_status = "failed"
    webhook_event.processing_error = str(exc)[:1000]
    webhook_event.save(update_fields=["processing_status", "processing_error", "updated_at"])


def _sync_order_refund_state(order: Order, payment: Payment) -> None:
    if payment.refunded_amount >= payment.amount:
        order.status = "refunded"
        order.refunded_at = timezone.now()
        order.save(update_fields=["status", "refunded_at"])
    elif payment.refunded_amount > Decimal("0"):
        order.status = "partially_refunded"
        order.save(update_fields=["status"])


def _handle_stripe_payment_intent_succeeded(intent: dict) -> Payment | None:
    payment = _resolve_payment_for_stripe_object(intent)
    if payment is None:
        logger.warning("Stripe success event has no matching payment intent=%s", intent.get("id"))
        return None

    payment.status = "succeeded"
    payment.failure_reason = ""
    payment.raw_response = intent
    payment.save(update_fields=["status", "failure_reason", "raw_response"])

    try:
        order, created = _confirm_order_and_issue_tickets(payment.order)
    except ValueError:
        return payment

    if created:
        _notify_and_email(order, title="Your tickets are confirmed!")
    return payment


def _handle_stripe_payment_intent_failed(intent: dict) -> Payment | None:
    payment = _resolve_payment_for_stripe_object(intent)
    if payment is None:
        return None

    last_error = (intent.get("last_payment_error") or {}).get("message", "")
    payment.status = "failed"
    payment.failure_reason = last_error[:1000]
    payment.raw_response = intent
    payment.save(update_fields=["status", "failure_reason", "raw_response"])
    return payment


def _handle_stripe_payment_intent_canceled(intent: dict) -> Payment | None:
    payment = _resolve_payment_for_stripe_object(intent)
    if payment is None:
        return None

    payment.status = "failed"
    payment.failure_reason = f"Cancelled: {intent.get('cancellation_reason', 'unknown')}"[:1000]
    payment.raw_response = intent
    payment.save(update_fields=["status", "failure_reason", "raw_response"])
    return payment


def _handle_stripe_charge_refunded(charge: dict) -> Payment | None:
    payment = _resolve_payment_for_stripe_object(charge)
    if payment is None:
        return None

    order_was_refunded = payment.order.status == "refunded"
    amount_refunded = Decimal(str(charge.get("amount_refunded", 0))) / Decimal("100")
    latest_refund_id = ""
    refunds = (charge.get("refunds") or {}).get("data") or []
    if refunds:
        latest_refund_id = refunds[-1].get("id", "")

    payment.refunded_amount = amount_refunded
    payment.refund_id = latest_refund_id or payment.refund_id
    payment.refunded_at = timezone.now()
    payment.status = "refunded" if amount_refunded >= payment.amount else "partially_refunded"
    payment.raw_response = charge
    payment.save(
        update_fields=[
            "refunded_amount",
            "refund_id",
            "refunded_at",
            "status",
            "raw_response",
        ]
    )

    _sync_order_refund_state(payment.order, payment)
    if payment.status == "refunded" and not order_was_refunded:
        release_promo_code_usage(payment.order)
    return payment


def _handle_stripe_dispute(dispute: dict) -> Payment | None:
    payment = _resolve_payment_for_stripe_object(dispute)
    if payment is None:
        logger.warning("Stripe dispute has no matching payment: %s", dispute.get("id"))
        return None

    amount = Decimal(str(dispute.get("amount", 0))) / Decimal("100")
    dispute_id = (dispute.get("id") or "").strip()
    if not dispute_id:
        logger.warning("Stripe dispute event missing id.")
        return payment

    status_value = dispute.get("status", "needs_response")
    allowed_statuses = {choice[0] for choice in ChargebackCase.STATUS_CHOICES}
    if status_value not in allowed_statuses:
        status_value = "under_review"
    due_by = dispute.get("evidence_details", {}).get("due_by")

    chargeback, created = ChargebackCase.objects.update_or_create(
        provider_case_id=dispute_id,
        defaults={
            "payment": payment,
            "provider": "stripe",
            "status": status_value,
            "amount": amount,
            "currency": (dispute.get("currency") or payment.currency).upper(),
            "reason": dispute.get("reason", "")[:120],
            "due_by": datetime.fromtimestamp(due_by, tz=dt_timezone.utc) if due_by else None,
            "closed_at": timezone.now() if status_value in ("won", "lost", "warning_closed") else None,
            "raw_payload": dispute,
        },
    )
    if not chargeback.opened_at:
        chargeback.opened_at = timezone.now()
        chargeback.save(update_fields=["opened_at", "updated_at"])

    payment.failure_reason = f"Stripe dispute {chargeback.provider_case_id}: {status_value}"[:1000]
    if status_value in ("won", "warning_closed"):
        payment.status = "succeeded" if payment.refunded_amount < payment.amount else "refunded"
    elif status_value == "lost":
        order_was_refunded = payment.order.status == "refunded"
        payment.status = "refunded"
        payment.refunded_amount = payment.amount
        payment.refunded_at = payment.refunded_at or timezone.now()
        payment.order.status = "refunded"
        payment.order.refunded_at = payment.order.refunded_at or timezone.now()
        payment.order.save(update_fields=["status", "refunded_at"])
        if not order_was_refunded:
            release_promo_code_usage(payment.order)
    else:
        payment.status = "chargeback"

    payment.raw_response = dispute
    payment.save(
        update_fields=[
            "status",
            "failure_reason",
            "refunded_amount",
            "refunded_at",
            "raw_response",
        ]
    )
    return payment


def _stripe_webhook_impl(request: HttpRequest) -> HttpResponse:
    stripe.api_key = settings.STRIPE_SECRET_KEY
    payload = request.body
    sig_header = request.META.get("HTTP_STRIPE_SIGNATURE", "")
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
    except Exception:
        return HttpResponse(status=400)

    event_id = str(event.get("id") or uuid.uuid4())
    event_type = str(event.get("type") or "")
    stripe_object = event.get("data", {}).get("object", {}) or {}

    try:
        webhook_event, _ = PaymentWebhookEvent.objects.get_or_create(
            provider="stripe",
            provider_event_id=event_id,
            defaults={
                "event_type": event_type,
                "payload": event,
                "processing_status": "received",
            },
        )
    except IntegrityError:
        webhook_event = PaymentWebhookEvent.objects.get(
            provider="stripe",
            provider_event_id=event_id,
        )

    if webhook_event.processing_status == "processed":
        return HttpResponse(status=200)

    webhook_event.event_type = event_type
    webhook_event.payload = event
    webhook_event.processing_error = ""
    webhook_event.save(update_fields=["event_type", "payload", "processing_error", "updated_at"])

    payment = None
    try:
        if event_type == "payment_intent.succeeded":
            payment = _handle_stripe_payment_intent_succeeded(stripe_object)
        elif event_type == "payment_intent.payment_failed":
            payment = _handle_stripe_payment_intent_failed(stripe_object)
        elif event_type in ("payment_intent.canceled", "payment_intent.cancelled"):
            payment = _handle_stripe_payment_intent_canceled(stripe_object)
        elif event_type in ("charge.refunded", "charge.refund.updated"):
            payment = _handle_stripe_charge_refunded(stripe_object)
        elif event_type.startswith("charge.dispute."):
            payment = _handle_stripe_dispute(stripe_object)

        _mark_webhook_processed(webhook_event, payment=payment)
        return HttpResponse(status=200)
    except Exception as exc:
        logger.exception("Stripe webhook processing failed for event %s", event_id)
        _mark_webhook_failed(webhook_event, exc)
        return HttpResponse(status=500)


@csrf_exempt
def stripe_webhook(request: HttpRequest) -> HttpResponse:
    return _stripe_webhook_impl(request)

class MpesaInitiateView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [throttling.ScopedRateThrottle]
    throttle_scope = "checkout"

    def post(self, request):
        order_number = (request.data.get("order_number") or "").strip()
        phone = (request.data.get("phone") or "").strip()
        if not order_number:
            return Response({"detail": "order_number is required."}, status=status.HTTP_400_BAD_REQUEST)

        order = Order.objects.filter(
            order_number=order_number,
            status__in=["pending", "payment_processing"],
        ).first()
        if not order:
            return Response({"detail": "Order not found or not payable."}, status=status.HTTP_400_BAD_REQUEST)

        access_error = _validate_confirmation_access(request, order)
        if access_error:
            return access_error

        if not phone:
            return Response({"detail": "Phone number is required."}, status=status.HTTP_400_BAD_REQUEST)

        if order.status != "payment_processing":
            order.status = "payment_processing"
            order.save(update_fields=["status"])

        service = MpesaService()
        try:
            payment = service.stk_push(order, phone_number=phone)
            return Response({"checkout_request_id": payment.mpesa_checkout_request_id}, status=status.HTTP_200_OK)
        except Exception:
            logger.exception("M-Pesa STK push failed for order %s", order.order_number)
            return Response(
                {"detail": "M-Pesa service is currently unavailable. Please try again shortly."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )


@csrf_exempt
def mpesa_callback(request: HttpRequest) -> HttpResponse:
    expected_token = (getattr(settings, "MPESA_CALLBACK_SECRET", "") or "").strip()

    provided_token = (
        (request.META.get("HTTP_X_MPESA_CALLBACK_SECRET", "") or "").strip()
        or (request.GET.get("token", "") or "").strip()
    )
    auth_header = (request.META.get("HTTP_AUTHORIZATION", "") or "").strip()
    if auth_header.lower().startswith("bearer "):
        provided_token = provided_token or auth_header.split(" ", 1)[1].strip()

    if expected_token:
        if not provided_token or not hmac.compare_digest(provided_token, expected_token):
            return HttpResponse(status=403)
    elif not getattr(settings, "DEBUG", False):
        return HttpResponse(status=403)

    try:
        data = json.loads(request.body.decode("utf-8"))
    except Exception:
        return HttpResponse(status=400)

    stk_payload = (data.get("Body") or {}).get("stkCallback") or {}
    checkout_id = str(stk_payload.get("CheckoutRequestID") or "unknown")
    result_code = str(stk_payload.get("ResultCode") or "unknown")
    event_id = f"{checkout_id}:{result_code}"

    try:
        webhook_event, _ = PaymentWebhookEvent.objects.get_or_create(
            provider="mpesa",
            provider_event_id=event_id,
            defaults={
                "event_type": "stk.callback",
                "payload": data,
                "processing_status": "received",
            },
        )
    except IntegrityError:
        webhook_event = PaymentWebhookEvent.objects.get(
            provider="mpesa",
            provider_event_id=event_id,
        )

    if webhook_event.processing_status == "processed":
        return HttpResponse(
            json.dumps({"ResultCode": 0, "ResultDesc": "Success"}),
            content_type="application/json",
            status=200,
        )

    webhook_event.payload = data
    webhook_event.processing_error = ""
    webhook_event.save(update_fields=["payload", "processing_error", "updated_at"])

    payment = Payment.objects.filter(mpesa_checkout_request_id=checkout_id).first()
    service = MpesaService()
    try:
        service.handle_callback(data)
        _mark_webhook_processed(webhook_event, payment=payment)
        return HttpResponse(
            json.dumps({"ResultCode": 0, "ResultDesc": "Success"}),
            content_type="application/json",
            status=200,
        )
    except Exception as exc:
        logger.exception("M-Pesa callback processing failed for checkout_id=%s", checkout_id)
        _mark_webhook_failed(webhook_event, exc)
        return HttpResponse(status=500)


class MpesaQueryView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [throttling.ScopedRateThrottle]
    throttle_scope = "order_lookup"

    def post(self, request):
        checkout_request_id = request.data.get("checkout_request_id")
        if not checkout_request_id:
            return Response({"detail": "checkout_request_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            payment = Payment.objects.select_related("order").get(mpesa_checkout_request_id=checkout_request_id)
        except Payment.DoesNotExist:
            return Response({"detail": "Payment not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            attendee = request.user if request.user.is_authenticated else None
        except Exception:
            attendee = None

        if payment.order.attendee:
            # Registered event order: only the buyer can check status
            if payment.order.attendee != attendee:
                return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)
        else:
            # Guest order: do not allow authenticated users to sniff checkout requests
            if attendee is not None:
                return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)

        return Response({"status": payment.status}, status=status.HTTP_200_OK)

