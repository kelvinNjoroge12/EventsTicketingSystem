from __future__ import annotations

import uuid
from datetime import timedelta

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import OrganizerTeamMember
from apps.accounts.tests.factories import OrganizerUserFactory, UserFactory
from apps.events.models import Event


def _create_event(*, organizer, start_days: int, end_days: int, title_prefix: str) -> Event:
    now = timezone.now()
    start_dt = now + timedelta(days=start_days)
    end_dt = now + timedelta(days=end_days)
    if end_dt <= start_dt:
        end_dt = start_dt + timedelta(hours=2)

    return Event.objects.create(
        organizer=organizer,
        title=f"{title_prefix} {uuid.uuid4().hex[:8]}",
        format="in_person",
        status="published",
        start_date=start_dt.date(),
        start_time=start_dt.time().replace(microsecond=0),
        end_date=end_dt.date(),
        end_time=end_dt.time().replace(microsecond=0),
        timezone="UTC",
        venue_name="Hall A",
        venue_address="123 Main Street",
    )


def _login_as(user) -> APIClient:
    client = APIClient()
    response = client.post(
        reverse("login"),
        {"email": user.email, "password": "StrongPass1"},
        format="json",
        REMOTE_ADDR=f"10.0.0.{(uuid.uuid4().int % 250) + 1}",
    )
    assert response.status_code == status.HTTP_200_OK
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['tokens']['access']}")
    return client


def test_organizer_with_assignment_can_only_access_assigned_checkin_event(db):
    host = OrganizerUserFactory()
    assigned_organizer = OrganizerUserFactory()
    allowed_event = _create_event(organizer=host, start_days=1, end_days=1, title_prefix="Allowed")
    blocked_event = _create_event(organizer=host, start_days=2, end_days=2, title_prefix="Blocked")

    membership = OrganizerTeamMember.objects.create(
        organizer=host,
        member=assigned_organizer,
        role="checkin",
    )
    membership.assigned_events.set([allowed_event])

    client = _login_as(assigned_organizer)
    allowed_response = client.get(reverse("checkin-attendance", kwargs={"slug": allowed_event.slug}))
    blocked_response = client.get(reverse("checkin-attendance", kwargs={"slug": blocked_event.slug}))

    assert allowed_response.status_code == status.HTTP_200_OK
    assert blocked_response.status_code == status.HTTP_403_FORBIDDEN


def test_checkin_staff_without_event_assignment_cannot_access_checkin(db):
    host = OrganizerUserFactory()
    checkin_user = UserFactory(role="checkin")
    event = _create_event(organizer=host, start_days=1, end_days=1, title_prefix="No Assignment")

    OrganizerTeamMember.objects.create(
        organizer=host,
        member=checkin_user,
        role="checkin",
    )

    client = _login_as(checkin_user)
    response = client.get(reverse("checkin-attendance", kwargs={"slug": event.slug}))

    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.parametrize(
    ("endpoint_name", "method", "payload"),
    [
        ("checkin-list", "get", None),
        ("checkin-attendance", "get", None),
        ("checkin-scan", "post", {"qr_code_data": "not-used-when-closed"}),
        ("checkin-resend", "post", {"order_number": "EH-TEST-ORDER"}),
    ],
)
def test_checkin_endpoints_expire_after_event_end(db, endpoint_name, method, payload):
    organizer = OrganizerUserFactory()
    ended_event = _create_event(organizer=organizer, start_days=-2, end_days=-1, title_prefix="Ended")
    client = _login_as(organizer)
    url = reverse(endpoint_name, kwargs={"slug": ended_event.slug})

    if method == "get":
        response = client.get(url)
    else:
        response = client.post(url, payload or {}, format="json")

    assert response.status_code == status.HTTP_410_GONE
    message = response.data.get("error", {}).get("message", "") if isinstance(response.data, dict) else ""
    assert "closed" in str(message).lower()


def test_profile_assignment_payload_excludes_ended_events(db):
    host = OrganizerUserFactory()
    checkin_user = UserFactory(role="checkin")
    active_event = _create_event(organizer=host, start_days=2, end_days=2, title_prefix="Active")
    ended_event = _create_event(organizer=host, start_days=-2, end_days=-1, title_prefix="Past")

    membership = OrganizerTeamMember.objects.create(
        organizer=host,
        member=checkin_user,
        role="checkin",
    )
    membership.assigned_events.set([active_event, ended_event])

    client = _login_as(checkin_user)
    response = client.get(reverse("profile"))

    assert response.status_code == status.HTTP_200_OK
    assigned_ids = set(response.data.get("assigned_events", []))
    detail_ids = {item["id"] for item in response.data.get("assigned_event_details", [])}

    assert str(active_event.id) in assigned_ids
    assert str(active_event.id) in detail_ids
    assert str(ended_event.id) not in assigned_ids
    assert str(ended_event.id) not in detail_ids
