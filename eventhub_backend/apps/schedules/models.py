from __future__ import annotations

from django.db import models

from common.models import TimeStampedModel


class ScheduleItem(TimeStampedModel):
    """A single agenda item / session in an event schedule."""

    event = models.ForeignKey(
        "events.Event",
        on_delete=models.CASCADE,
        related_name="schedule_items",
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    speaker = models.ForeignKey(
        "speakers.Speaker",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="schedule_items",
    )
    start_time = models.TimeField()
    end_time = models.TimeField(null=True, blank=True)
    day = models.PositiveIntegerField(
        default=1, help_text="Day number within the event (1-based)"
    )
    session_type = models.CharField(
        max_length=50,
        blank=True,
        help_text="e.g. Keynote, Workshop, Break, Panel",
    )
    location = models.CharField(
        max_length=255, blank=True, help_text="Room or stage name"
    )
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["day", "sort_order", "start_time"]
        indexes = [models.Index(fields=["event", "day"])]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.title} ({self.event_id})"
