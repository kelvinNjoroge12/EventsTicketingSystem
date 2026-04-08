from __future__ import annotations

import uuid

from django.conf import settings
from django.utils import timezone
from rest_framework import serializers

from apps.orders.models import Order, Ticket
from .models import CheckIn


class CheckInSerializer(serializers.ModelSerializer):
    attendee_name = serializers.CharField(read_only=True)
    attendee_email = serializers.CharField(read_only=True)
    checked_in_at = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = CheckIn
        fields = ["id", "ticket", "attendee_name", "attendee_email", "checked_in_at", "note"]
        read_only_fields = ["id", "attendee_name", "attendee_email", "checked_in_at"]


class QRScanSerializer(serializers.Serializer):
    """Accepts a QR code UUID and validates the ticket."""

    qr_code_data = serializers.CharField()

    def validate_qr_code_data(self, value):
        raw_value = str(value).strip()
        if not raw_value:
            raise serializers.ValidationError("QR code data is required.")

        ticket = None
        parsed_uuid = None

        # Verify as secure time-bucketed QR payload (issue #9)
        from common.qr_security import verify_secure_qr_payload
        verified_uuid_str = verify_secure_qr_payload(raw_value)

        if verified_uuid_str:
            try:
                parsed_uuid = uuid.UUID(verified_uuid_str)
            except ValueError:
                parsed_uuid = None
        elif ":" in raw_value:
            raise serializers.ValidationError("QR code is expired. Please refresh your ticket.")
        elif not bool(getattr(settings, "QR_STRICT_VALIDATION", True)):
            # Temporary backwards compatibility for legacy UUID-only QR values in non-strict mode.
            try:
                parsed_uuid = uuid.UUID(raw_value)
            except ValueError:
                parsed_uuid = None

        if parsed_uuid:
            ticket = Ticket.objects.select_related("event", "order").filter(
                qr_code_data=parsed_uuid
            ).first()

        if ticket is None:
            order = Order.objects.filter(order_number__iexact=raw_value).first()
            if order:
                valid_ticket = order.tickets.filter(status="valid").first()
                if valid_ticket:
                    ticket = valid_ticket
                else:
                    any_ticket = order.tickets.first()
                    if any_ticket:
                        raise serializers.ValidationError(
                            "All tickets for this order are already checked in."
                        )
                    raise serializers.ValidationError("No tickets found for this order.")

        if ticket is None:
            raise serializers.ValidationError("Invalid QR code, order number, or ticket ID.")

        if ticket.status != "valid":
            raise serializers.ValidationError(
                f"Ticket is {ticket.status}. Cannot check in."
            )

        if hasattr(ticket, "checkin"):
            raise serializers.ValidationError(
                f"Already checked in at {ticket.checkin.created_at.strftime('%H:%M on %d %b %Y')}."
            )

        self.ticket = ticket
        return value

    def save(self, user, event):
        ticket = self.ticket
        checkin = CheckIn.objects.create(
            ticket=ticket,
            event=event,
            checked_in_by=user,
            attendee_name=ticket.attendee_name,
            attendee_email=ticket.attendee_email,
        )
        # Mark ticket as used
        ticket.status = "used"
        ticket.checked_in_at = timezone.now()
        ticket.checked_in_by = user
        ticket.save(update_fields=["status", "checked_in_at", "checked_in_by"])
        return checkin
