"""
Refund flow for Stripe and M-Pesa payments (issue #6).
Handles full and partial refunds with audit logging.
"""
from __future__ import annotations

import logging
import uuid
from decimal import Decimal

import stripe
from django.conf import settings
from django.db import transaction
from django.db.models import F
from django.utils import timezone
from rest_framework import permissions, status, throttling
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.events.models import Event
from apps.orders.models import Order, Ticket
from apps.tickets.models import TicketType
from apps.notifications.serializers import create_notification
from common.audit import log_action
from .models import Payment

logger = logging.getLogger(__name__)


class RefundOrderView(APIView):
    """
    POST /api/payments/refund/
    Body: { "order_number": "...", "reason": "...", "amount": null (full) or Decimal }
    
    Organizer or admin can issue a full or partial refund.
    """
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [throttling.ScopedRateThrottle]
    throttle_scope = "checkout"

    def post(self, request):
        order_number = (request.data.get("order_number") or "").strip()
        reason = (request.data.get("reason") or "").strip()
        refund_amount = request.data.get("amount")

        if not order_number:
            return Response(
                {"detail": "order_number is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            order = Order.objects.select_related("event", "payment").get(
                order_number=order_number,
            )
        except Order.DoesNotExist:
            return Response(
                {"detail": "Order not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Authorization: organizer of the event, or admin/staff
        user = request.user
        is_organizer = order.event and order.event.organizer_id == user.id
        if not (user.is_staff or user.role == "admin" or is_organizer):
            return Response(
                {"detail": "Only the event organizer or admin can issue refunds."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if order.status not in ("confirmed", "partially_refunded"):
            return Response(
                {"detail": f"Cannot refund an order with status '{order.status}'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get payment record
        try:
            payment = order.payment
        except Payment.DoesNotExist:
            return Response(
                {"detail": "No payment record found for this order."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if payment.status not in ("succeeded",):
            return Response(
                {"detail": "Payment has not succeeded; cannot refund."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Calculate refund amount
        max_refundable = payment.amount - payment.refunded_amount
        if refund_amount is not None:
            try:
                refund_amount = Decimal(str(refund_amount))
            except Exception:
                return Response(
                    {"detail": "Invalid refund amount."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if refund_amount <= 0 or refund_amount > max_refundable:
                return Response(
                    {"detail": f"Refund amount must be between 0.01 and {max_refundable}."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            refund_amount = max_refundable  # Full refund

        is_full_refund = refund_amount >= max_refundable

        # Process the refund through the payment provider
        try:
            refund_id = self._process_provider_refund(payment, refund_amount)
        except Exception as exc:
            logger.exception("Refund failed for order %s", order_number)
            return Response(
                {"detail": f"Refund failed: {str(exc)}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        # Update payment and order records atomically
        with transaction.atomic():
            payment.refunded_amount = F("refunded_amount") + refund_amount
            payment.refunded_at = timezone.now()
            if refund_id:
                payment.refund_id = refund_id
            payment.status = "refunded" if is_full_refund else "partially_refunded"
            payment.save(update_fields=[
                "refunded_amount", "refunded_at", "refund_id", "status",
            ])

            order.status = "refunded" if is_full_refund else "partially_refunded"
            order.refund_reason = reason
            order.refunded_at = timezone.now()
            order.save(update_fields=["status", "refund_reason", "refunded_at"])

            # If full refund, cancel all tickets and release inventory
            if is_full_refund:
                tickets = Ticket.objects.filter(order=order).exclude(
                    status__in=["cancelled", "refunded"]
                )
                for ticket in tickets:
                    ticket.status = "refunded"
                    ticket.save(update_fields=["status"])
                    if ticket.ticket_type_id:
                        TicketType.objects.filter(id=ticket.ticket_type_id).update(
                            quantity_sold=F("quantity_sold") - 1,
                        )

        # Audit log
        log_action(
            action="refund_issued",
            entity_type="Order",
            entity_id=order.id,
            actor=user,
            metadata={
                "order_number": order_number,
                "refund_amount": str(refund_amount),
                "is_full_refund": is_full_refund,
                "reason": reason,
                "payment_method": payment.method,
                "refund_id": refund_id or "",
            },
            ip_address=request.META.get("REMOTE_ADDR"),
        )

        # Notify the attendee
        if order.attendee:
            create_notification(
                recipient=order.attendee,
                notification_type="refund_processed",
                title="Refund processed",
                message=(
                    f"A refund of {order.currency} {refund_amount} has been issued "
                    f"for your order #{order_number}. "
                    f"{'Full refund.' if is_full_refund else 'Partial refund.'}"
                ),
                event=order.event,
                action_url=f"/orders/{order_number}",
            )

        return Response({
            "success": True,
            "message": f"Refund of {order.currency} {refund_amount} processed.",
            "is_full_refund": is_full_refund,
            "refund_id": refund_id or "",
        })

    def _process_provider_refund(self, payment: Payment, amount: Decimal) -> str:
        """
        Execute the refund on the payment provider's side.
        Returns a refund ID string.
        """
        if payment.method == "stripe":
            return self._refund_stripe(payment, amount)
        elif payment.method == "mpesa":
            return self._refund_mpesa(payment, amount)
        else:
            raise ValueError(f"Unsupported payment method: {payment.method}")

    def _refund_stripe(self, payment: Payment, amount: Decimal) -> str:
        stripe.api_key = settings.STRIPE_SECRET_KEY
        if not payment.stripe_payment_intent_id:
            raise ValueError("No Stripe payment intent ID found.")

        refund = stripe.Refund.create(
            payment_intent=payment.stripe_payment_intent_id,
            amount=int(amount * 100),  # Stripe uses cents
            metadata={"order_number": payment.order.order_number},
        )
        return refund.id

    def _refund_mpesa(self, payment: Payment, amount: Decimal) -> str:
        """
        M-Pesa B2C reversal. This is a placeholder — actual implementation
        requires Daraja B2C API registration with Safaricom.
        For now, we log the refund and return a tracking ID.
        """
        logger.warning(
            "M-Pesa refund requested for order %s (amount=%s). "
            "B2C API not yet implemented — manual reversal required.",
            payment.order.order_number,
            amount,
        )
        # Generate a tracking ID for manual processing
        return f"MPESA-MANUAL-{uuid.uuid4().hex[:8].upper()}"
