from __future__ import annotations

from django.utils import timezone

from .models import OrganizerTeamMember


def _get_organizer_profile(user):
    try:
        return user.organizer_profile
    except Exception:
        return None


def user_can_access_organizer_dashboard(user) -> bool:
    if not user or not user.is_authenticated:
        return False

    role = getattr(user, "role", None)
    if getattr(user, "is_staff", False) or role == "admin":
        return True
    if role == "organizer":
        return True

    profile = _get_organizer_profile(user)
    if profile and getattr(profile, "is_approved", False):
        return True

    from apps.events.models import Event

    return Event.objects.filter(organizer=user).only("id").exists()


def get_active_assigned_checkin_events_for_user(user):
    if not user or not user.is_authenticated:
        return []

    memberships = (
        OrganizerTeamMember.objects.filter(member=user)
        .exclude(organizer=user)
        .prefetch_related("assigned_events")
    )

    now = timezone.now()
    assigned_events = []
    seen_ids = set()
    for membership in memberships:
        for event in membership.assigned_events.all():
            if not event or event.id in seen_ids or getattr(event, "status", None) == "cancelled":
                continue
            try:
                if event.has_ended(now):
                    continue
            except Exception:
                pass
            seen_ids.add(event.id)
            assigned_events.append(event)

    return assigned_events


def user_requires_assigned_event_scope(user) -> bool:
    if not user or not user.is_authenticated:
        return False
    if user_can_access_organizer_dashboard(user):
        return False
    return bool(get_active_assigned_checkin_events_for_user(user))
