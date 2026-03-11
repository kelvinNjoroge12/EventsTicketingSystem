from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models
from django.template.defaultfilters import slugify

from common.models import TimeStampedModel


class Category(TimeStampedModel):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(unique=True)
    icon = models.CharField(max_length=10, blank=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "name"]

    def __str__(self) -> str:  # pragma: no cover
        return self.name


class Tag(TimeStampedModel):
    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(unique=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:  # pragma: no cover
        return self.name


class Event(TimeStampedModel):
    EVENT_TYPE_CHOICES = (
        ("public", "Public"),
        ("private", "Private"),
    )
    FORMAT_CHOICES = (
        ("in_person", "In-Person"),
        ("online", "Online"),
        ("hybrid", "Hybrid"),
    )
    STATUS_CHOICES = (
        ("draft", "Draft"),
        ("pending", "Pending Approval"),
        ("published", "Published"),
        ("cancelled", "Cancelled"),
        ("completed", "Completed"),
    )
    REFUND_POLICY_CHOICES = (
        ("no_refund", "No Refund"),
        ("48_hours", "48 Hours"),
        ("7_days", "7 Days"),
        ("custom", "Custom"),
    )

    organizer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="events",
    )
    title = models.CharField(max_length=255)
    slug = models.SlugField(unique=True, max_length=300)
    description = models.TextField(blank=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name="events")
    tags = models.ManyToManyField(Tag, blank=True, related_name="events")
    event_type = models.CharField(choices=EVENT_TYPE_CHOICES, max_length=10, default="public")
    format = models.CharField(choices=FORMAT_CHOICES, max_length=10)
    status = models.CharField(choices=STATUS_CHOICES, max_length=20, default="draft")
    cover_image = models.ImageField(upload_to="event_covers/", null=True, blank=True)
    gallery_images = models.JSONField(default=list, blank=True)
    start_date = models.DateField()
    start_time = models.TimeField()
    end_date = models.DateField()
    end_time = models.TimeField()
    timezone = models.CharField(max_length=50, default="Africa/Nairobi")
    venue_name = models.CharField(max_length=255, blank=True)
    venue_address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, default="Kenya")
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    streaming_link = models.URLField(blank=True)
    capacity = models.PositiveIntegerField(null=True, blank=True)
    is_featured = models.BooleanField(default=False)
    theme_color = models.CharField(max_length=7, default="#1E4DB7")
    accent_color = models.CharField(max_length=7, default="#7C3AED")
    refund_policy = models.CharField(choices=REFUND_POLICY_CHOICES, max_length=20, default="no_refund")
    custom_refund_policy = models.TextField(blank=True)
    stickers = models.JSONField(default=list, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)
    scheduled_publish_at = models.DateTimeField(null=True, blank=True)
    attendee_count = models.PositiveIntegerField(default=0)
    view_count = models.PositiveIntegerField(default=0)
    send_reminders = models.BooleanField(default=True)
    enable_waitlist = models.BooleanField(default=False)
    reminders_sent = models.BooleanField(default=False)

    class Meta:
        indexes = [
            models.Index(fields=["status", "start_date"]),
            models.Index(fields=["organizer", "status"]),
            models.Index(fields=["category", "status"]),
            models.Index(fields=["slug"]),
            models.Index(fields=["is_featured", "status"]),
        ]
        ordering = ["-published_at"]

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.title)
            self.slug = f"{base}-{str(uuid.uuid4())[:8]}"
            
        super().save(*args, **kwargs)

    def __str__(self) -> str:  # pragma: no cover
        return self.title

