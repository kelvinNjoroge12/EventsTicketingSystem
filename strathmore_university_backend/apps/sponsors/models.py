from __future__ import annotations

from django.db import models

from common.models import TimeStampedModel


class Sponsor(TimeStampedModel):
    TIER_CHOICES = [
        ("platinum", "Platinum"),
        ("gold", "Gold"),
        ("silver", "Silver"),
        ("bronze", "Bronze"),
        ("partner", "Partner"),
    ]

    event = models.ForeignKey(
        "events.Event",
        on_delete=models.CASCADE,
        related_name="event_sponsors",
    )
    name = models.CharField(max_length=255)
    logo = models.ImageField(upload_to="sponsor_logos/", null=True, blank=True)
    website = models.URLField(blank=True)
    tier = models.CharField(max_length=20, choices=TIER_CHOICES, default="bronze")
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["tier", "sort_order", "name"]
        indexes = [models.Index(fields=["event", "tier"])]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.name} ({self.tier}) @ {self.event_id}"
