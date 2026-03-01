from __future__ import annotations

from django.db import models

from common.models import TimeStampedModel


class Notification(TimeStampedModel):
    """In-app notification for attendees and organizers."""

    TYPE_CHOICES = [
        ("ticket_confirmed", "Ticket Confirmed"),
        ("event_reminder", "Event Reminder"),
        ("event_cancelled", "Event Cancelled"),
        ("event_updated", "Event Updated"),
        ("checkin_success", "Check-in Successful"),
        ("refund_processed", "Refund Processed"),
        ("organizer_message", "Organizer Message"),
    ]

    recipient = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    notification_type = models.CharField(max_length=50, choices=TYPE_CHOICES)
    title = models.CharField(max_length=255)
    message = models.TextField()
    event = models.ForeignKey(
        "events.Event",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="notifications",
    )
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    # Optional deep-link for frontend routing
    action_url = models.CharField(max_length=500, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient", "is_read"]),
            models.Index(fields=["recipient", "created_at"]),
        ]

    def __str__(self) -> str:  # pragma: no cover
        return f"Notification({self.recipient_id}, {self.notification_type})"
