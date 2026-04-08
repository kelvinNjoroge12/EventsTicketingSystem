from __future__ import annotations

from django.db import models

from common.models import TimeStampedModel


class Sponsor(TimeStampedModel):
    event = models.ForeignKey(
        "events.Event",
        on_delete=models.CASCADE,
        related_name="event_sponsors",
    )
    name = models.CharField(max_length=255)
    logo = models.ImageField(upload_to="sponsor_logos/", null=True, blank=True)
    website = models.URLField(blank=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "name"]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.name} @ {self.event_id}"
