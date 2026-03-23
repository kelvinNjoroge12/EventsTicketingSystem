from __future__ import annotations

import logging

from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.exceptions import APIException, PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import OrganizerTeamMember
from apps.events.models import Event
from apps.notifications.serializers import create_notification
from apps.orders.models import Order
from apps.orders.utils import send_ticket_email
from .models import CheckIn
from .serializers import CheckInSerializer, QRScanSerializer

logger = logging.getLogger(__name__)


def _can_manage_checkin(user, event) -> bool:
    if not user or not event:
        return False

    if user.is_staff or user.role == "admin":
        return True

    membership = (
        OrganizerTeamMember.objects.filter(member=user, organizer=event.organizer)
        .prefetch_related("assigned_events")
        .first()
    )
    if membership:
        if membership.assigned_events.exists():
            return membership.assigned_events.filter(id=event.id).exists()
        return False

    if event.organizer_id == user.id:
        return True

    return False


class CheckInClosed(APIException):
    status_code = status.HTTP_410_GONE
    default_detail = "Check-in is closed because this event has already ended."
    default_code = "checkin_closed"


def _raise_if_checkin_closed(event) -> None:
    if event.status == "cancelled":
        raise CheckInClosed("Check-in is closed because this event was cancelled.")
    if event.has_ended():
        raise CheckInClosed("Check-in is closed because this event has already ended.")


class QRScanView(APIView):
    """
    POST /api/events/{slug}/checkin/scan/
    Body: { "qr_code_data": "<uuid>" }
    Organizer-only. Validates ticket, marks as used, returns check-in record.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, slug):
        event = get_object_or_404(Event, slug=slug)
        if not _can_manage_checkin(request.user, event):
            raise PermissionDenied("Only assigned staff can perform check-ins.")
        _raise_if_checkin_closed(event)

        serializer = QRScanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if serializer.ticket.event_id != event.id:
            return Response(
                {"detail": "Ticket does not belong to this event."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        checkin = serializer.save(user=request.user, event=event)

        if event.organizer and event.organizer != request.user:
            create_notification(
                recipient=event.organizer,
                notification_type="checkin_success",
                title="Check-in recorded",
                message=f"{checkin.attendee_name} checked in for {event.title}.",
                event=event,
                action_url=f"/organizer/events/{event.slug}/checkin",
            )

        return Response(
            {
                "success": True,
                "message": f"{checkin.attendee_name} checked in successfully.",
                "checkin": CheckInSerializer(checkin).data,
            },
            status=status.HTTP_200_OK,
        )


class CheckInListView(generics.ListAPIView):
    """
    GET /api/events/{slug}/checkin/
    Paginated list of all check-ins for an event (organizer only).
    """

    serializer_class = CheckInSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        event = get_object_or_404(Event, slug=self.kwargs["slug"])
        if not _can_manage_checkin(self.request.user, event):
            raise PermissionDenied("Only assigned staff can view check-ins.")
        _raise_if_checkin_closed(event)
        return CheckIn.objects.filter(event=event).select_related("ticket", "checked_in_by").order_by("-created_at")


class AttendanceDashboardView(APIView):
    """
    GET /api/events/{slug}/checkin/attendance/
    Returns attendance stats and full ticket list with email delivery status.
    Organizer-only.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, slug):
        event = get_object_or_404(Event, slug=slug)
        if not _can_manage_checkin(request.user, event):
            raise PermissionDenied("Only assigned staff can view attendance.")
        _raise_if_checkin_closed(event)

        orders = Order.objects.filter(
            event=event, status="confirmed"
        ).prefetch_related("tickets", "items").order_by("-created_at")

        total_tickets = 0
        checked_in = 0
        email_sent_count = 0
        email_failed_count = 0
        rows = []

        for order in orders:
            tickets = list(order.tickets.all())
            order_checked_in = sum(1 for t in tickets if t.status == "used")
            total_tickets += len(tickets)
            checked_in += order_checked_in
            if order.email_sent:
                email_sent_count += 1
            elif order.email_error:
                email_failed_count += 1

            first_ticket = tickets[0] if tickets else None

            rows.append({
                "order_number": order.order_number,
                "attendee_name": f"{order.attendee_first_name} {order.attendee_last_name}",
                "attendee_email": order.attendee_email,
                "attendee_phone": order.attendee_phone,
                "qr_code_uuid": str(first_ticket.qr_code_data) if first_ticket else "",
                "tickets": [
                    {
                        "id": str(t.id),
                        "ticket_type": t.ticket_type.name if t.ticket_type else "-",
                        "status": t.status,
                        "qr_code_data": str(t.qr_code_data),
                        "qr_code_uuid": str(t.qr_code_data),
                        "checked_in_at": t.checked_in_at.isoformat() if t.checked_in_at else None,
                    }
                    for t in tickets
                ],
                "email_sent": order.email_sent,
                "email_sent_at": order.email_sent_at.isoformat() if order.email_sent_at else None,
                "email_error": order.email_error or None,
                "total": str(order.total),
                "payment_method": order.payment_method,
                "created_at": order.created_at.isoformat(),
            })

        return Response({
            "success": True,
            "data": {
                "stats": {
                    "total_orders": len(rows),
                    "total_tickets": total_tickets,
                    "checked_in": checked_in,
                    "not_checked_in": total_tickets - checked_in,
                    "email_sent": email_sent_count,
                    "email_failed": email_failed_count,
                },
                "attendees": rows,
            }
        })


class ResendTicketEmailView(APIView):
    """
    POST /api/events/{slug}/checkin/resend/
    Body: { "order_number": "EH..." }
    Organizer can resend a ticket email directly to any attendee.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, slug):
        event = get_object_or_404(Event, slug=slug)
        if not _can_manage_checkin(request.user, event):
            raise PermissionDenied("Only assigned staff can resend tickets.")
        _raise_if_checkin_closed(event)

        order_number = request.data.get("order_number")
        if not order_number:
            return Response({"detail": "order_number is required."}, status=status.HTTP_400_BAD_REQUEST)

        order = get_object_or_404(Order, order_number=order_number, event=event, status="confirmed")

        try:
            send_ticket_email(order)
        except Exception:
            logger.exception("Ticket resend failed for order %s", order.order_number)
            return Response(
                {"detail": "Unable to resend the ticket email right now. Please try again shortly."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response({"success": True, "message": f"Ticket email resent to {order.attendee_email}."})


class RetrieveTicketView(APIView):
    """
    POST /api/checkin/retrieve-ticket/
    Public endpoint - attendee provides order_number + email to recover their lost ticket.
    Body: { "order_number": "EH...", "email": "..." }
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        order_number = request.data.get("order_number", "").strip()
        email = request.data.get("email", "").strip().lower()

        if not order_number or not email:
            return Response(
                {"detail": "order_number and email are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        order = Order.objects.filter(
            order_number=order_number,
            attendee_email__iexact=email,
            status="confirmed",
        ).first()

        if not order:
            return Response(
                {"detail": "No confirmed ticket found for that order number and email."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            send_ticket_email(order)
        except Exception:
            logger.exception("Public ticket retrieval resend failed for order %s", order.order_number)
            return Response(
                {"detail": "Unable to resend the ticket email right now. Please try again shortly."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response({
            "success": True,
            "message": f"Your ticket has been resent to {order.attendee_email}. Please check your inbox (and spam folder).",
        })
