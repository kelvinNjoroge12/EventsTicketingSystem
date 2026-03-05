from __future__ import annotations

import logging

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.events.models import Event
from apps.orders.models import Order, Ticket
from apps.orders.utils import send_ticket_email
from .models import CheckIn
from .serializers import CheckInSerializer, QRScanSerializer

logger = logging.getLogger(__name__)


class QRScanView(APIView):
    """
    POST /api/events/{slug}/checkin/scan/
    Body: { "qr_code_data": "<uuid>" }
    Organizer-only. Validates ticket, marks as used, returns check-in record.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, slug):
        event = get_object_or_404(Event, slug=slug)
        if event.organizer != request.user and not request.user.is_staff:
            raise PermissionDenied("Only the event organizer can perform check-ins.")

        serializer = QRScanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        checkin = serializer.save(user=request.user, event=event)

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
        if event.organizer != self.request.user and not self.request.user.is_staff:
            raise PermissionDenied("Only the event organizer can view check-ins.")
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
        if event.organizer != request.user and not request.user.is_staff:
            raise PermissionDenied("Only the event organizer can view attendance.")

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

            rows.append({
                "order_number": order.order_number,
                "attendee_name": f"{order.attendee_first_name} {order.attendee_last_name}",
                "attendee_email": order.attendee_email,
                "attendee_phone": order.attendee_phone,
                "tickets": [
                    {
                        "id": str(t.id),
                        "ticket_type": t.ticket_type.name if t.ticket_type else "—",
                        "status": t.status,
                        "qr_code_data": str(t.qr_code_data),
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
        if event.organizer != request.user and not request.user.is_staff:
            raise PermissionDenied("Only the event organizer can resend tickets.")

        order_number = request.data.get("order_number")
        if not order_number:
            return Response({"detail": "order_number is required."}, status=status.HTTP_400_BAD_REQUEST)

        order = get_object_or_404(Order, order_number=order_number, event=event, status="confirmed")

        try:
            send_ticket_email(order)
        except Exception as e:
            return Response(
                {"detail": f"Email resend failed: {e.__class__.__name__} - {e}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response({"success": True, "message": f"Ticket email resent to {order.attendee_email}."})


class RetrieveTicketView(APIView):
    """
    POST /api/checkin/retrieve-ticket/
    Public endpoint — attendee provides order_number + email to recover their lost ticket.
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
        except Exception as e:
            return Response(
                {"detail": f"Could not send email: {e.__class__.__name__} - {e}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response({
            "success": True,
            "message": f"Your ticket has been resent to {order.attendee_email}. Please check your inbox (and spam folder).",
        })
