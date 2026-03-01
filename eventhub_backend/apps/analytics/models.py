from __future__ import annotations

from django.db import models

from common.models import TimeStampedModel


class EventView(TimeStampedModel):
    """Track individual page views on an event detail page."""

    event = models.ForeignKey(
        "events.Event",
        on_delete=models.CASCADE,
        related_name="page_views",
    )
    session_key = models.CharField(max_length=64, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    referrer = models.URLField(blank=True)

    class Meta:
        indexes = [models.Index(fields=["event", "created_at"])]


class DailyEventStats(TimeStampedModel):
    """Aggregated daily snapshot for an event (generated nightly or on-demand)."""

    event = models.ForeignKey(
        "events.Event",
        on_delete=models.CASCADE,
        related_name="daily_stats",
    )
    date = models.DateField()
    views = models.PositiveIntegerField(default=0)
    tickets_sold = models.PositiveIntegerField(default=0)
    revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    checkins = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = [("event", "date")]
        ordering = ["-date"]
        indexes = [models.Index(fields=["event", "date"])]

    def __str__(self) -> str:  # pragma: no cover
        return f"Stats({self.event_id}, {self.date})"
