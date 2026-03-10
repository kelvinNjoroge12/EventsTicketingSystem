from __future__ import annotations

import uuid

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models

from common.models import TimeStampedModel

from .managers import UserManager


class User(AbstractBaseUser, PermissionsMixin, TimeStampedModel):
    ROLE_CHOICES = (
        ("attendee", "Attendee"),
        ("organizer", "Organizer"),
        ("admin", "Admin"),
        ("staff", "Staff"),
        ("checkin", "Check-in Staff"),
    )

    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    phone_number = models.CharField(max_length=20, blank=True)
    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="attendee")
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_email_verified = models.BooleanField(default=False)
    email_verification_token = models.UUIDField(default=uuid.uuid4, editable=False)
    password_reset_token = models.UUIDField(null=True, blank=True)
    password_reset_token_expires = models.DateTimeField(null=True, blank=True)
    must_reset_password = models.BooleanField(default=False)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    objects = UserManager()

    def __str__(self) -> str:  # pragma: no cover - trivial
        return self.email

    def get_full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

    def get_short_name(self) -> str:
        return self.first_name


class OrganizerProfile(TimeStampedModel):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="organizer_profile")
    organization_name = models.CharField(max_length=255)
    organization_bio = models.TextField(blank=True)
    website = models.URLField(blank=True)
    logo = models.ImageField(upload_to="organizer_logos/", null=True, blank=True)
    brand_color = models.CharField(max_length=7, default="#1E4DB7")
    is_approved = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)
    twitter = models.URLField(blank=True)
    linkedin = models.URLField(blank=True)
    instagram = models.URLField(blank=True)
    total_events = models.PositiveIntegerField(default=0)
    total_attendees = models.PositiveIntegerField(default=0)
    stripe_account_id = models.CharField(max_length=255, blank=True)

    def __str__(self) -> str:  # pragma: no cover - trivial
        return f"OrganizerProfile({self.user.email})"


class UserSecuritySettings(TimeStampedModel):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="security_settings")
    two_factor_enabled = models.BooleanField(default=False)

    def __str__(self) -> str:  # pragma: no cover - trivial
        return f"SecuritySettings({self.user_id})"


class UserSession(TimeStampedModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sessions")
    refresh_jti = models.CharField(max_length=255, db_index=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    device = models.CharField(max_length=255, blank=True)
    last_seen = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "revoked_at"]),
            models.Index(fields=["refresh_jti"]),
        ]

    def __str__(self) -> str:  # pragma: no cover
        return f"Session({self.user_id}, revoked={bool(self.revoked_at)})"


class Integration(TimeStampedModel):
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    description = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:  # pragma: no cover
        return self.name


class UserIntegration(TimeStampedModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="integrations")
    integration = models.ForeignKey(Integration, on_delete=models.CASCADE, related_name="connections")
    is_connected = models.BooleanField(default=False)
    connected_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("user", "integration")

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.user_id} -> {self.integration.slug}"


class OrganizerTeamMember(TimeStampedModel):
    ROLE_CHOICES = (
        ("owner", "Owner"),
        ("admin", "Admin"),
        ("checkin", "Check-in Staff"),
    )

    organizer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="organizer_team")
    member = models.ForeignKey(User, on_delete=models.CASCADE, related_name="team_memberships")
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="checkin")
    assigned_events = models.ManyToManyField("events.Event", related_name="assigned_staff", blank=True)

    class Meta:
        unique_together = ("organizer", "member")

    def __str__(self) -> str:  # pragma: no cover
        return f"TeamMember({self.organizer_id} -> {self.member_id})"
