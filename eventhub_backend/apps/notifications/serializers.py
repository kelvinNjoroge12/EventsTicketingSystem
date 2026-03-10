from __future__ import annotations

from django.utils import timezone
from rest_framework import serializers
from .models import Notification, NotificationPreference


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id",
            "notification_type",
            "title",
            "message",
            "event",
            "is_read",
            "read_at",
            "action_url",
            "created_at",
        ]
        read_only_fields = fields


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = [
            "email_new_sales",
            "email_event_reminders",
            "email_marketing",
            "push_check_ins",
            "push_event_updates",
            "sms_important",
        ]


def create_notification(
    recipient,
    notification_type: str,
    title: str,
    message: str,
    event=None,
    action_url: str = "",
) -> Notification:
    """
    Helper used by other apps (payments, orders, checkin) to fire notifications.
    Usage:
        from apps.notifications.serializers import create_notification
        create_notification(user, "ticket_confirmed", "Your ticket is confirmed!", "...", event=event)
    """
    return Notification.objects.create(
        recipient=recipient,
        notification_type=notification_type,
        title=title,
        message=message,
        event=event,
        action_url=action_url,
    )
