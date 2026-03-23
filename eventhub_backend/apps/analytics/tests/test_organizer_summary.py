from __future__ import annotations

from datetime import date, time
from decimal import Decimal

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.tests.factories import OrganizerUserFactory
from apps.events.models import Event
from apps.orders.models import Order, OrderItem, OrderRegistration, Ticket
from apps.tickets.models import Course, School, TicketType


def _create_event(organizer, year: int, suffix: str) -> Event:
    return Event.objects.create(
        organizer=organizer,
        title=f"Analytics {suffix}",
        slug=f"analytics-{suffix.lower()}-{year}",
        format="in_person",
        start_date=date(year, 9, 1),
        start_time=time(9, 0),
        end_date=date(year, 9, 1),
        end_time=time(16, 0),
        status="published",
        venue_name="Auditorium",
        city="Nairobi",
        country="Kenya",
    )


def _create_ticket_with_registration(
    *,
    event: Event,
    ticket_type: TicketType,
    index: int,
    school: School | None = None,
    course: Course | None = None,
) -> Ticket:
    attendee_email = f"analytics{index}@example.com"
    order = Order.objects.create(
        order_number=f"AN{event.start_date.year}{index:05d}",
        attendee=None,
        event=event,
        status="confirmed",
        subtotal=Decimal("80.00"),
        service_fee=Decimal("0.00"),
        discount_amount=Decimal("0.00"),
        total=Decimal("80.00"),
        currency="KES",
        attendee_first_name="Analytics",
        attendee_last_name=str(index),
        attendee_email=attendee_email,
        attendee_phone=f"+254711{index:04d}",
        payment_method="card",
    )
    order_item = OrderItem.objects.create(
        order=order,
        ticket_type=ticket_type,
        ticket_type_name=ticket_type.name,
        ticket_class=ticket_type.ticket_class,
        unit_price=ticket_type.price,
        quantity=1,
        subtotal=ticket_type.price,
    )
    ticket = Ticket.objects.create(
        order=order,
        order_item=order_item,
        event=event,
        ticket_type=ticket_type,
        attendee_name=f"Analytics {index}",
        attendee_email=attendee_email,
        status="valid",
    )
    OrderRegistration.objects.create(
        order=order,
        category="student",
        category_label="Student",
        graduation_year=event.start_date.year + 1,
        school=school,
        course=course,
    )
    return ticket


def test_organizer_summary_defaults_to_current_year_and_supports_year_switch(db):
    organizer = OrganizerUserFactory()
    client = APIClient()
    client.force_authenticate(user=organizer)

    current_year = timezone.now().year
    previous_year = current_year - 1

    event_current = _create_event(organizer, current_year, "Current")
    event_previous = _create_event(organizer, previous_year, "Previous")
    type_current = TicketType.objects.create(
        event=event_current,
        name="General",
        ticket_class="paid",
        price=Decimal("80.00"),
        quantity=200,
    )
    type_previous = TicketType.objects.create(
        event=event_previous,
        name="General",
        ticket_class="paid",
        price=Decimal("80.00"),
        quantity=200,
    )

    _create_ticket_with_registration(event=event_current, ticket_type=type_current, index=1)
    _create_ticket_with_registration(event=event_previous, ticket_type=type_previous, index=2)

    url = reverse("organizer-analytics-summary")

    default_resp = client.get(url)
    default_payload = default_resp.data.get("data", default_resp.data)
    assert default_resp.status_code == status.HTTP_200_OK
    assert default_payload["selected_year"] == current_year
    assert default_payload["kpis"]["total_events"] == 1
    assert default_payload["kpis"]["total_attendees"] == 1
    assert current_year in default_payload["filters"]["years"]
    assert previous_year in default_payload["filters"]["years"]

    previous_resp = client.get(url, {"year": previous_year})
    previous_payload = previous_resp.data.get("data", previous_resp.data)
    assert previous_resp.status_code == status.HTTP_200_OK
    assert previous_payload["selected_year"] == previous_year
    assert previous_payload["kpis"]["total_events"] == 1
    assert previous_payload["kpis"]["total_attendees"] == 1


def test_organizer_summary_filters_by_school_within_selected_year(db):
    organizer = OrganizerUserFactory()
    client = APIClient()
    client.force_authenticate(user=organizer)

    current_year = timezone.now().year
    event_current = _create_event(organizer, current_year, "SchoolFilter")
    ticket_type = TicketType.objects.create(
        event=event_current,
        name="General",
        ticket_class="paid",
        price=Decimal("80.00"),
        quantity=200,
    )

    school_a = School.objects.create(name="Analytics School A", code="ASA")
    school_b = School.objects.create(name="Analytics School B", code="ASB")
    course_a = Course.objects.create(name="Analytics Course A", code="ACA", school=school_a)
    course_b = Course.objects.create(name="Analytics Course B", code="ACB", school=school_b)

    _create_ticket_with_registration(
        event=event_current,
        ticket_type=ticket_type,
        index=11,
        school=school_a,
        course=course_a,
    )
    _create_ticket_with_registration(
        event=event_current,
        ticket_type=ticket_type,
        index=12,
        school=school_b,
        course=course_b,
    )

    resp = client.get(
        reverse("organizer-analytics-summary"),
        {"year": current_year, "school_id": str(school_a.id)},
    )
    payload = resp.data.get("data", resp.data)
    assert resp.status_code == status.HTTP_200_OK
    assert payload["kpis"]["total_events"] == 1
    assert payload["kpis"]["total_attendees"] == 1
    assert payload["filters"]["schools"]

