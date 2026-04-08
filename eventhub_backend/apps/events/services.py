from __future__ import annotations

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.db.models import Q
from django.utils import timezone

from apps.notifications.serializers import create_notification
from .compat import get_event_attr, update_event_with_available_fields

User = get_user_model()


def _frontend_url() -> str:
    return getattr(settings, "FRONTEND_URL", "https://events-ticketing-system.vercel.app").rstrip("/")


def _from_email() -> str:
    return getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@strathmoreuniversity.com")


def _send_email(subject: str, message: str, recipients: list[str]) -> None:
    cleaned = [email for email in recipients if email]
    if not cleaned:
        return
    send_mail(subject, message, _from_email(), cleaned, fail_silently=True)


def _event_url(event) -> str:
    return f"{_frontend_url()}/events/{event.slug}"


def _edit_url(event) -> str:
    return f"{_frontend_url()}/edit-event/{event.slug}"


def _review_url(event) -> str:
    return f"{_frontend_url()}/admin/event-reviews/{event.slug}"


def _admin_users():
    return (
        User.objects.filter(Q(role="admin") | Q(is_staff=True), is_active=True)
        .exclude(email="")
        .distinct()
    )


def submit_event_for_review(event, submitted_by=None):
    now = timezone.now()
    update_event_with_available_fields(
        event,
        status="pending",
        approval_requested_at=now,
        reviewed_at=None,
        reviewed_by=None,
        review_notes="",
    )

    organizer = event.organizer
    organizer_name = organizer.get_short_name() or organizer.get_full_name() or organizer.email
    organizer_message = (
        f"Hi {organizer_name},\n\n"
        f"Your event \"{event.title}\" has been submitted for publication.\n"
        "You will be notified as soon as an admin approves or rejects it.\n\n"
        f"View your event: {_event_url(event)}\n\n"
        "Strathmore University Team"
    )
    _send_email(
        subject=f"Event submitted for review: {event.title}",
        message=organizer_message,
        recipients=[organizer.email],
    )
    create_notification(
        organizer,
        "event_submitted",
        "Event submitted for publication",
        f"\"{event.title}\" has been submitted for admin review. We will notify you once a decision is made.",
        event=event,
        action_url=f"/events/{event.slug}",
    )

    for admin_user in _admin_users():
        reviewer_name = admin_user.get_short_name() or admin_user.get_full_name() or admin_user.email
        admin_message = (
            f"Hi {reviewer_name},\n\n"
            f"A new event is waiting for review.\n\n"
            f"Title: {event.title}\n"
            f"Organizer: {organizer.get_full_name() or organizer.email}\n"
            f"Review page: {_review_url(event)}\n\n"
            "Strathmore University Team"
        )
        _send_email(
            subject=f"Pending event review: {event.title}",
            message=admin_message,
            recipients=[admin_user.email],
        )
        create_notification(
            admin_user,
            "event_pending_review",
            "Pending event review",
            f"\"{event.title}\" is waiting for review.",
            event=event,
            action_url=f"/admin/event-reviews/{event.slug}",
        )

    return event


def approve_event_submission(event, reviewer):
    organizer = event.organizer
    reviewed_at = timezone.now()
    approval_requested_at = get_event_attr(event, "approval_requested_at")
    update_event_with_available_fields(
        event,
        status="published",
        approval_requested_at=approval_requested_at or reviewed_at,
        reviewed_at=reviewed_at,
        reviewed_by=reviewer,
        review_notes="",
    )

    organizer_name = organizer.get_short_name() or organizer.get_full_name() or organizer.email
    message = (
        f"Hi {organizer_name},\n\n"
        f"Good news. Your event \"{event.title}\" has been approved and is now live.\n\n"
        f"View event: {_event_url(event)}\n\n"
        "Strathmore University Team"
    )
    _send_email(
        subject=f"Event approved: {event.title}",
        message=message,
        recipients=[organizer.email],
    )
    create_notification(
        organizer,
        "event_approved",
        "Event approved",
        f"\"{event.title}\" has been approved and published.",
        event=event,
        action_url=f"/events/{event.slug}",
    )
    return event


def reject_event_submission(event, reviewer, reason: str):
    organizer = event.organizer
    reviewed_at = timezone.now()
    review_notes = reason.strip()
    approval_requested_at = get_event_attr(event, "approval_requested_at")
    update_event_with_available_fields(
        event,
        status="rejected",
        approval_requested_at=approval_requested_at or reviewed_at,
        reviewed_at=reviewed_at,
        reviewed_by=reviewer,
        review_notes=review_notes,
    )

    organizer_name = organizer.get_short_name() or organizer.get_full_name() or organizer.email
    message = (
        f"Hi {organizer_name},\n\n"
        f"Your event \"{event.title}\" was not approved for publication.\n\n"
        f"Reason: {review_notes}\n\n"
        f"Update your event here: {_edit_url(event)}\n\n"
        "Strathmore University Team"
    )
    _send_email(
        subject=f"Event rejected: {event.title}",
        message=message,
        recipients=[organizer.email],
    )
    create_notification(
        organizer,
        "event_rejected",
        "Event needs changes",
        f"\"{event.title}\" was rejected. Reason: {review_notes}",
        event=event,
        action_url=f"/edit-event/{event.slug}",
    )
    return event
