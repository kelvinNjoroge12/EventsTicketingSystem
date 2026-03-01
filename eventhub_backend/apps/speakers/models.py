from __future__ import annotations

import uuid

from django.db import models

from common.models import TimeStampedModel


class Speaker(TimeStampedModel):
    """A speaker or panelist at an event."""

    event = models.ForeignKey(
        "events.Event",
        on_delete=models.CASCADE,
        related_name="speakers",
    )
    name = models.CharField(max_length=255)
    title = models.CharField(max_length=255, blank=True)
    organization = models.CharField(max_length=255, blank=True)
    bio = models.TextField(blank=True)
    avatar = models.ImageField(upload_to="speaker_avatars/", null=True, blank=True)
    twitter = models.URLField(blank=True)
    linkedin = models.URLField(blank=True)
    is_mc = models.BooleanField(default=False, help_text="Mark this speaker as the MC/Host")
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "name"]
        indexes = [models.Index(fields=["event", "is_mc"])]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.name} @ {self.event_id}"
