from __future__ import annotations

from datetime import time

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.tests.factories import OrganizerUserFactory
from apps.events.models import Event
from apps.tickets.models import PromoCode, RegistrationCategory, RegistrationQuestion, TicketType


def test_edit_endpoint_returns_management_payload_for_event_editor(db):
    organizer = OrganizerUserFactory()
    client = APIClient()
    client.force_authenticate(user=organizer)

    event_date = timezone.localdate()
    event = Event.objects.create(
        organizer=organizer,
        title="Fast Edit Event",
        slug="fast-edit-event",
        format="online",
        status="published",
        start_date=event_date,
        start_time=time(10, 0),
        end_date=event_date,
        end_time=time(12, 0),
    )

    category = RegistrationCategory.objects.create(
        event=event,
        category="guest",
        label="VIP Guest",
        is_active=False,
        sort_order=0,
    )
    RegistrationQuestion.objects.create(
        category=category,
        label="Company",
        field_type="text",
        is_required=True,
        sort_order=0,
    )
    ticket = TicketType.objects.create(
        event=event,
        registration_category=category,
        name="VIP Access",
        ticket_class="vip",
        price=2500,
        quantity=25,
        is_active=False,
        sort_order=0,
    )
    PromoCode.objects.create(
        event=event,
        code="VIPONLY",
        discount_type="percent",
        discount_value=15,
        usage_limit=50,
        is_active=False,
        minimum_order_amount=0,
    )

    response = client.get(reverse("event-update", kwargs={"slug": event.slug}))

    assert response.status_code == status.HTTP_200_OK
    assert any(item["id"] == ticket.id for item in response.data["tickets"])
    assert any(
        item["code"] == "VIPONLY" and item["isActive"] is False
        for item in response.data["promo_codes"]
    )
    assert any(
        item["category"] == "guest"
        and item["is_active"] is False
        and len(item["questions"]) == 1
        and item["questions"][0]["label"] == "Company"
        for item in response.data["registration_categories"]
    )
