from __future__ import annotations

from django.db import models

from common.models import TimeStampedModel

class NotificationPreference(TimeStampedModel):
    user = models.OneToOneField(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="notification_preferences",
    )
    email_new_sales = models.BooleanField(default=True)
    email_event_reminders = models.BooleanField(default=True)
    email_marketing = models.BooleanField(default=False)
    push_check_ins = models.BooleanField(default=True)
    push_event_updates = models.BooleanField(default=True)
    sms_important = models.BooleanField(default=False)

    def __str__(self) -> str:  # pragma: no cover
        return f"NotificationPreference({self.user_id})"



class EmailOptOut(TimeStampedModel):
    CATEGORY_CHOICES = [
        ("reminders", "Event Reminders"),
        ("marketing", "Marketing"),
    ]

    email = models.EmailField(db_index=True)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ("email", "category")
        indexes = [
            models.Index(fields=["email", "category"]),
        ]

    def __str__(self) -> str:  # pragma: no cover
        return f"EmailOptOut({self.email}, {self.category})"


class Notification(TimeStampedModel):
    """In-app notification for attendees and organizers."""

    TYPE_CHOICES = [
        ("ticket_confirmed", "Ticket Confirmed"),
        ("event_reminder", "Event Reminder"),
        ("event_cancelled", "Event Cancelled"),
        ("event_updated", "Event Updated"),
        ("event_submitted", "Event Submitted"),
        ("event_pending_review", "Event Pending Review"),
        ("event_approved", "Event Approved"),
        ("event_rejected", "Event Rejected"),
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
