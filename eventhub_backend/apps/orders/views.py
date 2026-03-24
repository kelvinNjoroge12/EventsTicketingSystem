from __future__ import annotations

import logging
import threading

from django.conf import settings
from django.core.mail import send_mail
from django.db import DatabaseError, transaction
from django.db.models import F
from django.db.models import Q
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status, throttling
from rest_framework.response import Response

from apps.tickets.models import TicketType
from apps.waitlist.models import WaitlistEntry
from .models import Order, Ticket
from .serializers import AttendeeTicketSerializer, OrderCreateSerializer, OrderDetailSerializer, OrderPublicDetailSerializer
from .utils import send_ticket_email, _dispatch_ticket_email_async

logger = logging.getLogger(__name__)




def _notify_waitlist_if_available(event):
    if not event or not getattr(event, "enable_waitlist", False):
        return

    has_available = TicketType.objects.filter(
        event=event,
        is_active=True,
        quantity__gt=F("quantity_sold") + F("quantity_reserved"),
    ).exists()
    if not has_available:
        return

    entry = (
        WaitlistEntry.objects.filter(event=event, status="waiting")
        .order_by("position", "created_at")
        .first()
    )
    if not entry:
        return

    entry.status = "notified"
    entry.notified_at = timezone.now()
    entry.save(update_fields=["status", "notified_at"])

    try:
        frontend_url = getattr(settings, "FRONTEND_URL", "https://events-ticketing-system.vercel.app")
        send_mail(
            subject=f"Ticket available: {event.title}",
            message=(
                f"Hi {entry.name},\n\n"
                f"Great news! A ticket for '{event.title}' is now available.\n"
                f"Head over to grab yours before it's gone: {frontend_url}/events/{event.slug}\n\n"
                f"- EventHub"
            ),
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@eventhub.com"),
            recipient_list=[entry.email],
            fail_silently=True,
        )
    except Exception:
        pass


class OrderCreateView(generics.GenericAPIView):
    serializer_class = OrderCreateSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [throttling.ScopedRateThrottle]
    throttle_scope = "checkout"

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        try:
            with transaction.atomic():
                event = serializer.validated_data["event"]
                items = serializer.validated_data["items"]
                ticket_ids = [i["ticket_type_id"] for i in items]
                # Fetch (not just .exists()) so Postgres actually acquires row locks.
                # .exists() evaluates to True/False without touching rows and NO lock is taken.
                list(TicketType.objects.select_for_update(nowait=True).filter(event=event, id__in=ticket_ids))
                order = serializer.save()
        except DatabaseError:
            return Response(
                {"detail": "Tickets are being reserved. Please retry in a moment."},
                status=status.HTTP_409_CONFLICT,
            )

        if order.status == "confirmed":
            _dispatch_ticket_email_async(order)

        data = OrderDetailSerializer(order).data
        return Response(data, status=status.HTTP_201_CREATED)


class OrderDetailView(generics.RetrieveAPIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [throttling.ScopedRateThrottle]
    throttle_scope = "order_lookup"
    lookup_field = "order_number"

    def get_serializer_class(self):
        user = self.request.user
        if user and user.is_authenticated:
            return OrderDetailSerializer
        return OrderPublicDetailSerializer

    def get_queryset(self):
        user = self.request.user
        email = (self.request.query_params.get("email") or "").strip().lower()
        # The order_number is always available from the URL kwargs.
        # We scope every query to it so the email parameter can only VERIFY
        # ownership of that specific order — never enumerate orders across events.
        order_number = self.kwargs.get(self.lookup_field, "")

        # Guest (unauthenticated) lookup: email must match the specific order.
        if email:
            return Order.objects.filter(
                order_number=order_number,
                attendee_email__iexact=email,
            )

        # Authenticated user lookup: must own the order.
        if user and user.is_authenticated:
            if user.is_staff or getattr(user, "role", None) == "admin":
                return Order.objects.filter(order_number=order_number)
            return Order.objects.filter(order_number=order_number, attendee=user)

        return Order.objects.none()


class OrderListView(generics.ListAPIView):
    serializer_class = OrderDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(attendee=self.request.user).order_by("-created_at")


class AttendeeTicketListView(generics.ListAPIView):
    serializer_class = AttendeeTicketSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return (
            Ticket.objects.select_related("event", "ticket_type", "order", "order_item")
            .filter(order__status="confirmed")
            .filter(
                Q(order__attendee=user)
                | Q(attendee_email__iexact=user.email)
                | Q(order__attendee_email__iexact=user.email)
            )
            .exclude(status__in=["cancelled", "refunded", "expired"])
            .order_by("event__start_date", "event__start_time", "-created_at")
            .distinct()
        )


class OrderCancelView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = "order_number"

    def post(self, request, order_number: str):
        order = get_object_or_404(Order, order_number=order_number, attendee=request.user)
        if not order.cancel_order(reason="User cancelled through dashboard"):
            return Response({"detail": "Only pending or payment processing orders can be cancelled."}, status=status.HTTP_400_BAD_REQUEST)
        
        event = order.event
        if event:
             transaction.on_commit(lambda: _notify_waitlist_if_available(event))
             
        return Response({"message": "Order cancelled."})


class OrderResendEmailView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [throttling.ScopedRateThrottle]
    throttle_scope = "resend_email"
    lookup_field = "order_number"

    def post(self, request, order_number: str):
        email = (request.data.get("email") or "").strip().lower()
        if not email:
            return Response({"error": "Email is required to verify ownership."}, status=status.HTTP_400_BAD_REQUEST)

        order = get_object_or_404(Order, order_number=order_number)
        
        # Verify the requested email matches the order's email
        if order.attendee_email.strip().lower() != email:
            return Response({"error": "Order not found for this email address."}, status=status.HTTP_404_NOT_FOUND)

        if order.status != "confirmed":
            return Response({"error": "Only confirmed orders can have their tickets resent."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            send_ticket_email(order)
            return Response({"message": "Ticket email has been resent."})
        except Exception as e:
            logger.error(f"Failed to resend email for order {order.order_number}: {e}")
            return Response({"error": "Failed to send the email. Please try again later."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

import io
import qrcode
from django.http import HttpResponse

class TicketQRView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [throttling.ScopedRateThrottle]
    throttle_scope = "qr_generation"

    def get(self, request, qr_code_data, *args, **kwargs):
        # Dynamically generate QR code to bypass any auth/S3 headers from storages
        # This becomes a pure 100% public PNG accessible via a simple HTTP GET.
        qr = qrcode.QRCode(version=1, box_size=10, border=4)
        qr.add_data(str(qr_code_data))
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
        
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        
        return HttpResponse(buffer.getvalue(), content_type="image/png")

class TicketVerificationDetailView(generics.GenericAPIView):
    """
    Public endpoint for verifying a ticket.
    Returns safe, non-PII details about a ticket given its UUID or QR Data.
    Used by the generic web QR scanning feature.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, qr_code_data, *args, **kwargs):
        from apps.orders.models import Ticket
        ticket = get_object_or_404(Ticket.objects.select_related("event", "ticket_type", "order"), qr_code_data=qr_code_data)
        order = ticket.order
        event = ticket.event
        viewer = request.user if request.user and request.user.is_authenticated else None

        def mask_name(name):
            if not name:
                return "Private"
            parts = [part for part in name.strip().split() if part]
            if not parts:
                return "Private"
            if len(parts) == 1:
                return f"{parts[0][:1]}***"
            return f"{parts[0][:1]}*** {parts[-1][:1]}***"

        def mask_order_number(value):
            if not value:
                return "Hidden"
            tail = str(value)[-4:]
            return f"****{tail}"

        can_view_pii = False
        if viewer:
            if viewer.is_staff or getattr(viewer, "role", None) == "admin":
                can_view_pii = True
            elif str(viewer.id) == str(event.organizer_id):
                can_view_pii = True
            elif order and str(order.attendee_id) == str(viewer.id):
                can_view_pii = True
            else:
                try:
                    from apps.accounts.models import OrganizerTeamMember
                    if OrganizerTeamMember.objects.filter(member=viewer, assigned_events=event).exists():
                        can_view_pii = True
                except Exception:
                    pass
        
        # Build masked email for privacy since this is a public endpoint
        email = ticket.attendee_email
        if email and "@" in email:
            name_part, domain_part = email.split("@", 1)
            masked_email = f"{name_part[:2]}***@{domain_part}"
        else:
            masked_email = "Unknown"

        effective_status = ticket.status
        if ticket.status == "valid" and event and event.has_ended():
            effective_status = "expired"

        return Response({
            "id": str(ticket.id),
            "qr_code_data": str(ticket.qr_code_data),
            "status": effective_status,
            "attendee_name": ticket.attendee_name if can_view_pii else mask_name(ticket.attendee_name),
            "attendee_email_masked": masked_email,
            "attendee_email": ticket.attendee_email if can_view_pii else None,
            "ticket_type_name": ticket.ticket_type.name if ticket.ticket_type else "General Admission",
            "order_number": order.order_number if (order and can_view_pii) else mask_order_number(order.order_number if order else ""),
            "checked_in_at": ticket.checked_in_at,
            "event": {
                "id": str(event.id),
                "slug": event.slug,
                "title": event.title,
                "start_date": event.start_date,
                "start_time": event.start_time,
                "end_date": event.end_date,
                "end_time": event.end_time,
                "venue_name": event.venue_name,
                "organizer_id": str(event.organizer_id),
                "time_state": event.get_time_state(),
            }
        })
