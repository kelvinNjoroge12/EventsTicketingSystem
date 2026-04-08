from __future__ import annotations

from rest_framework.permissions import BasePermission

from .access import user_can_access_organizer_dashboard


class IsOrganizerRole(BasePermission):
    """Allows any user whose role is 'organizer', regardless of approval status.
    Use this for creating/editing draft events so unapproved organizers can still
    manage their content; use IsOrganizer for publishing.
    """
    message = "You must have an organizer account to perform this action."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user_can_access_organizer_dashboard(user))


class IsOrganizer(BasePermission):
    """Requires both organizer role AND admin approval.
    Used on actions that make content publicly visible (e.g. publish).
    """
    message = (
        "Your organizer account is pending approval. Once approved by an admin "
        "you will be able to publish events. You can still save drafts."
    )

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        role = getattr(user, "role", None)
        if getattr(user, "is_staff", False) or role == "admin":
            return True

        if not user_can_access_organizer_dashboard(user):
            return False

        try:
            profile = user.organizer_profile
        except Exception:
            profile = None

        return bool(profile and getattr(profile, "is_approved", False))


class IsAdmin(BasePermission):
    message = "Only administrators can perform this action."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (getattr(user, "role", None) == "admin" or getattr(user, "is_staff", False))
        )


class IsAttendee(BasePermission):
    message = "Only attendees can perform this action."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and getattr(user, "role", None) == "attendee")


class IsOwnerOrAdmin(BasePermission):
    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if getattr(user, "role", None) == "admin":
            return True
        owner = getattr(obj, "user", None) or getattr(obj, "attendee", None)
        return owner == user


class IsEmailVerified(BasePermission):
    message = "Please verify your email address before performing this action."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and getattr(user, "is_email_verified", False))
