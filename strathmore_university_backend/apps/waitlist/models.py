from __future__ import annotations

from django.conf import settings
from django.db import models

from common.models import TimeStampedModel
from apps.events.models import Event


class WaitlistEntry(TimeStampedModel):
    STATUS_CHOICES = [
        ("waiting", "Waiting"),
        ("notified", "Notified"),
        ("converted", "Converted"),
        ("expired", "Expired"),
    ]

    event = models.ForeignKey(
        Event, on_delete=models.CASCADE, related_name="waitlist_entries"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="waitlist_entries",
        null=True,
        blank=True,
    )
    # Allow anonymous sign-ups too (if user is not logged in)
    name = models.CharField(max_length=200)
    email = models.EmailField()
    phone = models.CharField(max_length=30, blank=True)
    notes = models.TextField(blank=True)
    position = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="waiting")
    notified_at = models.DateTimeField(null=True, blank=True)
    converted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["position", "created_at"]
        unique_together = [["event", "email"]]
        indexes = [
            models.Index(fields=["event", "status"]),
        ]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.name} – waitlisted for {self.event.title}"
