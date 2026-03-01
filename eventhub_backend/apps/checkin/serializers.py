from __future__ import annotations

from django.utils import timezone
from rest_framework import serializers

from apps.orders.models import Ticket
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

    qr_code_data = serializers.UUIDField()

    def validate_qr_code_data(self, value):
        try:
            ticket = Ticket.objects.select_related("event", "order").get(qr_code_data=value)
        except Ticket.DoesNotExist:
            raise serializers.ValidationError("Invalid QR code — ticket not found.")

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
