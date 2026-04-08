from __future__ import annotations

from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsOwnerOrAdmin(BasePermission):
    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if getattr(user, "role", None) == "admin" or getattr(user, "is_staff", False):
            return True
        owner = getattr(obj, "user", None) or getattr(obj, "organizer", None) or getattr(obj, "attendee", None)
        return owner == user


class ReadOnly(BasePermission):
    def has_permission(self, request, view):
        return request.method in SAFE_METHODS

