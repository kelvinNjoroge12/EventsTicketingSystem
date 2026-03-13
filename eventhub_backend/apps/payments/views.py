from __future__ import annotations

import json
import logging
import threading
import uuid

import stripe
from django.conf import settings
from django.db import transaction
from django.db.models import F
from django.http import HttpRequest, HttpResponse
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
from .models import Payment
from .mpesa_service import MpesaService
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
        if locked.status != "pending":
            raise ValueError("Order is not pending.")

        locked.status = "confirmed"
        locked.save(update_fields=["status"])

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
    order_id = order.pk
    order_number = order.order_number

    def _send():
        try:
            fresh = Order.objects.select_related("event").get(pk=order_id)
            send_ticket_email(fresh)
        except Exception as exc:  # pragma: no cover
            logger.error(
                "Email failed for order %s: %s - %s",
                order_number,
                exc.__class__.__name__,
                exc,
            )

    def _schedule():
        threading.Thread(target=_send, daemon=True).start()

    try:
        transaction.on_commit(_schedule)
    except RuntimeError:
        _schedule()


class StripeCreatePaymentIntentView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        order_number = (request.data.get("order_number") or "").strip()
        if not order_number:
            return Response({"detail": "order_number is required."}, status=status.HTTP_400_BAD_REQUEST)

        order = Order.objects.filter(order_number=order_number, status="pending").first()
        if not order:
            return Response({"detail": "Order not found or not payable."}, status=status.HTTP_400_BAD_REQUEST)

        access_error = _validate_confirmation_access(request, order)
        if access_error:
            return access_error

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

        order = Order.objects.filter(order_number=order_number, status="pending").first()
        if not order:
            return Response({"detail": "Order not found or not pending."}, status=status.HTTP_400_BAD_REQUEST)

        access_error = _validate_confirmation_access(request, order)
        if access_error:
            return access_error

        if order.payment_method != "free" or order.total > 0:
            return Response({"detail": "Order is not free."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            order, created = _confirm_order_and_issue_tickets(order)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        if created:
            _notify_and_email(order, title="Your free tickets are confirmed! 🎉")

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

        order = Order.objects.filter(order_number=order_number, status="pending").first()
        if not order:
            return Response({"detail": "Order not found or not pending."}, status=status.HTTP_400_BAD_REQUEST)

        access_error = _validate_confirmation_access(request, order)
        if access_error:
            return access_error

        try:
            order, created = _confirm_order_and_issue_tickets(order)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        if created:
            _notify_and_email(order, title="Your tickets are confirmed! 🎉")

        return Response({"success": True, "message": "Order confirmed. Ticket email dispatched."})


@csrf_exempt
def stripe_webhook(request: HttpRequest) -> HttpResponse:
    payload = request.body
    sig_header = request.META.get("HTTP_STRIPE_SIGNATURE", "")
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
    except Exception:
        return HttpResponse(status=400)

    if event["type"] == "payment_intent.succeeded":
        intent = event["data"]["object"]
        pi_id = intent["id"]
        try:
            payment = Payment.objects.select_related("order").get(stripe_payment_intent_id=pi_id)
        except Payment.DoesNotExist:
            return HttpResponse(status=200)

        payment.status = "succeeded"
        payment.raw_response = intent
        payment.save(update_fields=["status", "raw_response"])

        try:
            order, created = _confirm_order_and_issue_tickets(payment.order)
        except ValueError:
            return HttpResponse(status=200)

        if created:
            _notify_and_email(order, title="Your tickets are confirmed! 🎉")

    return HttpResponse(status=200)


class MpesaInitiateView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        order_number = (request.data.get("order_number") or "").strip()
        phone = (request.data.get("phone") or "").strip()
        if not order_number:
            return Response({"detail": "order_number is required."}, status=status.HTTP_400_BAD_REQUEST)

        order = Order.objects.filter(order_number=order_number, status="pending").first()
        if not order:
            return Response({"detail": "Order not found or not payable."}, status=status.HTTP_400_BAD_REQUEST)

        access_error = _validate_confirmation_access(request, order)
        if access_error:
            return access_error

        if not phone:
            return Response({"detail": "Phone number is required."}, status=status.HTTP_400_BAD_REQUEST)

        service = MpesaService()
        try:
            payment = service.stk_push(order, phone_number=phone)
            return Response({"checkout_request_id": payment.mpesa_checkout_request_id}, status=status.HTTP_200_OK)
        except Exception as exc:
            return Response({"detail": f"Mpesa Service unavailable: {exc}"}, status=status.HTTP_400_BAD_REQUEST)


@csrf_exempt
def mpesa_callback(request: HttpRequest) -> HttpResponse:
    expected_token = getattr(settings, "MPESA_CALLBACK_SECRET", None)
    if not expected_token:
        if not getattr(settings, "DEBUG", False):
            return HttpResponse(status=403)
    elif request.GET.get("token") != expected_token:
        return HttpResponse(status=403)
        
    try:
        data = json.loads(request.body.decode("utf-8"))
    except Exception:
        return HttpResponse(status=400)
    service = MpesaService()
    service.handle_callback(data)
    return HttpResponse(
        json.dumps({"ResultCode": 0, "ResultDesc": "Success"}), content_type="application/json", status=200
    )


class MpesaQueryView(APIView):
    permission_classes = [permissions.AllowAny]

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
