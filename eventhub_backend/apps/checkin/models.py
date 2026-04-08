from __future__ import annotations

from django.db import models

from common.models import TimeStampedModel


class CheckIn(TimeStampedModel):
    """Record each time a ticket QR code is scanned at entry."""

    ticket = models.OneToOneField(
        "orders.Ticket",
        on_delete=models.CASCADE,
        related_name="checkin",
    )
    event = models.ForeignKey(
        "events.Event",
        on_delete=models.CASCADE,
        related_name="checkins",
    )
    checked_in_by = models.ForeignKey(
        "accounts.User",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="checkins_done",
    )
    # Duplicate for fast queries without joins
    attendee_name = models.CharField(max_length=300)
    attendee_email = models.EmailField()
    note = models.TextField(blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["event"]),
            models.Index(fields=["ticket"]),
        ]

    def __str__(self) -> str:  # pragma: no cover
        return f"CheckIn({self.attendee_name} → {self.event_id})"
