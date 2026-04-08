from __future__ import annotations

from typing import Optional

from django.conf import settings
from django.core import signing

from .models import NotificationPreference, EmailOptOut

OPT_OUT_SALT = "strathmore_university.notifications.optout"


def get_notification_preferences(user) -> Optional[NotificationPreference]:
    if not user or not getattr(user, "is_authenticated", False):
        return None
    prefs, _ = NotificationPreference.objects.get_or_create(user=user)
    return prefs


def should_send_in_app_notification(user, notification_type: str) -> bool:
    prefs = get_notification_preferences(user)
    if not prefs:
        return True

    mapping = {
        "checkin_success": prefs.push_check_ins,
        "event_updated": prefs.push_event_updates,
        "event_cancelled": prefs.push_event_updates,
        "event_reminder": prefs.push_event_updates,
        "refund_processed": prefs.push_event_updates,
    }
    return mapping.get(notification_type, True)


def should_send_email_notification(user, category: str) -> bool:
    prefs = get_notification_preferences(user)
    if not prefs:
        return True

    mapping = {
        "new_sales": prefs.email_new_sales,
        "event_reminders": prefs.email_event_reminders,
        "marketing": prefs.email_marketing,
    }
    return mapping.get(category, True)


def generate_opt_out_token(email: str, category: str) -> str:
    payload = {"email": (email or "").strip().lower(), "category": category}
    return signing.dumps(payload, salt=OPT_OUT_SALT)


def verify_opt_out_token(token: str) -> Optional[dict]:
    if not token:
        return None
    try:
        data = signing.loads(token, salt=OPT_OUT_SALT)
    except Exception:
        return None
    if not isinstance(data, dict):
        return None
    return data


def build_opt_out_link(email: str, category: str) -> str:
    base = getattr(settings, "BACKEND_URL", "").rstrip("/") or "https://eventsticketingsystem.onrender.com"
    token = generate_opt_out_token(email, category)
    return f"{base}/api/notifications/opt-out/?token={token}"


def is_email_opted_out(email: str, category: str) -> bool:
    if not email:
        return False
    return EmailOptOut.objects.filter(
        email__iexact=email.strip(), category=category, is_active=True
    ).exists()
