from __future__ import annotations

from datetime import date, time
from decimal import Decimal

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.tests.factories import OrganizerUserFactory
from apps.events.models import Event
from apps.orders.models import Order, OrderAnswer, OrderItem, OrderRegistration, Ticket
from apps.tickets.models import Course, RegistrationCategory, RegistrationQuestion, School, TicketType


def _create_event(organizer, year: int, suffix: str) -> Event:
    return Event.objects.create(
        organizer=organizer,
        title=f"Event {suffix}",
        slug=f"event-{suffix.lower()}-{year}",
        format="in_person",
        start_date=date(year, 7, 10),
        start_time=time(10, 0),
        end_date=date(year, 7, 10),
        end_time=time(18, 0),
        status="published",
        venue_name="Main Hall",
        city="Nairobi",
        country="Kenya",
    )


def _create_attendee_ticket(
    *,
    event: Event,
    ticket_type: TicketType,
    index: int,
    course: Course | None = None,
    school: School | None = None,
    graduation_year: int | None = None,
    category: str = "student",
    category_label: str = "Student",
    checked_in: bool = False,
    question: RegistrationQuestion | None = None,
    answer_value: str = "",
) -> Ticket:
    attendee_email = f"attendee{index}@example.com"
    order = Order.objects.create(
        order_number=f"ORD{event.start_date.year}{index:04d}",
        attendee=None,
        event=event,
        status="confirmed",
        subtotal=Decimal("100.00"),
        service_fee=Decimal("0.00"),
        discount_amount=Decimal("0.00"),
        total=Decimal("100.00"),
        currency="KES",
        attendee_first_name="Attendee",
        attendee_last_name=str(index),
        attendee_email=attendee_email,
        attendee_phone=f"+254700{index:04d}",
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
        attendee_name=f"Attendee {index}",
        attendee_email=attendee_email,
        status="used" if checked_in else "valid",
        checked_in_at=timezone.now() if checked_in else None,
    )
    registration = OrderRegistration.objects.create(
        order=order,
        category=category,
        category_label=category_label,
        course=course,
        school=school,
        graduation_year=graduation_year,
        admission_number=f"ADM{index:04d}",
        student_email=f"student{index}@strathmore.edu",
        location_text="Nairobi, Kenya",
        location_city="Nairobi",
        location_country="Kenya",
    )
    if question and answer_value:
        OrderAnswer.objects.create(
            registration=registration,
            question=question,
            value=answer_value,
        )
    return ticket


def test_attendee_module_returns_rich_fields_and_paginates_25(db):
    organizer = OrganizerUserFactory()
    client = APIClient()
    client.force_authenticate(user=organizer)

    current_year = timezone.now().year
    previous_year = current_year - 1
    current_event = _create_event(organizer, current_year, "Current")
    previous_event = _create_event(organizer, previous_year, "Previous")

    school = School.objects.create(name="School of Computing", code="SCS")
    course = Course.objects.create(name="Computer Science", code="CS", school=school)

    registration_category = RegistrationCategory.objects.create(
        event=current_event,
        category="student",
        label="Student",
        ask_course=True,
        ask_school=True,
        ask_graduation_year=True,
    )
    custom_question = RegistrationQuestion.objects.create(
        category=registration_category,
        label="Favorite club",
        field_type="text",
        is_required=False,
    )

    current_ticket_type = TicketType.objects.create(
        event=current_event,
        registration_category=registration_category,
        name="General",
        ticket_class="paid",
        price=Decimal("100.00"),
        quantity=500,
    )
    previous_ticket_type = TicketType.objects.create(
        event=previous_event,
        name="General",
        ticket_class="paid",
        price=Decimal("100.00"),
        quantity=200,
    )

    for idx in range(30):
        _create_attendee_ticket(
            event=current_event,
            ticket_type=current_ticket_type,
            index=idx,
            course=course,
            school=school,
            graduation_year=current_year + 1,
        )

    for idx in range(30, 35):
        _create_attendee_ticket(
            event=previous_event,
            ticket_type=previous_ticket_type,
            index=idx,
            course=course,
            school=school,
            graduation_year=previous_year + 1,
        )

    # Ensure the newest record carries custom answers and checked-in status.
    _create_attendee_ticket(
        event=current_event,
        ticket_type=current_ticket_type,
        index=99,
        course=course,
        school=school,
        graduation_year=current_year + 1,
        checked_in=True,
        question=custom_question,
        answer_value="Tech Club",
    )

    resp = client.get(reverse("organizer-attendee-list"))
    payload = resp.data.get("data", resp.data)

    assert resp.status_code == status.HTTP_200_OK
    assert payload["count"] == 36
    assert len(payload["results"]) == 25
    assert payload["non_deletable"] is True
    assert current_year in payload["filters"]["years"]
    assert previous_year in payload["filters"]["years"]

    sample_row = payload["results"][0]
    assert sample_row["attendee_name"]
    assert sample_row["attendee_email"]
    assert sample_row["attendee_phone"]
    assert sample_row["relationship"] == "student"
    assert sample_row["course_name"] == "Computer Science"
    assert sample_row["school_name"] == "School of Computing"

    enriched_row = next((row for row in payload["results"] if row["custom_answers"]), None)
    assert enriched_row is not None
    assert enriched_row["attendance_status"] == "checked_in"
    assert enriched_row["custom_answers"][0]["question"] == "Favorite club"
    assert enriched_row["custom_answers"][0]["value"] == "Tech Club"


def test_attendee_module_filters_by_year_school_and_attendance(db):
    organizer = OrganizerUserFactory()
    client = APIClient()
    client.force_authenticate(user=organizer)

    current_year = timezone.now().year
    previous_year = current_year - 1
    current_event = _create_event(organizer, current_year, "FilterCurrent")
    previous_event = _create_event(organizer, previous_year, "FilterPrevious")

    school_a = School.objects.create(name="School A", code="SA")
    school_b = School.objects.create(name="School B", code="SB")
    course_a = Course.objects.create(name="Course A", code="CA", school=school_a)
    course_b = Course.objects.create(name="Course B", code="CB", school=school_b)

    category = RegistrationCategory.objects.create(event=current_event, category="student", label="Student")
    ticket_type_current = TicketType.objects.create(
        event=current_event,
        registration_category=category,
        name="Main",
        ticket_class="paid",
        price=Decimal("50.00"),
        quantity=100,
    )
    ticket_type_previous = TicketType.objects.create(
        event=previous_event,
        name="Main",
        ticket_class="paid",
        price=Decimal("50.00"),
        quantity=100,
    )

    _create_attendee_ticket(
        event=current_event,
        ticket_type=ticket_type_current,
        index=1,
        course=course_a,
        school=school_a,
        graduation_year=current_year + 2,
        checked_in=True,
    )
    _create_attendee_ticket(
        event=current_event,
        ticket_type=ticket_type_current,
        index=2,
        course=course_b,
        school=school_b,
        graduation_year=current_year + 2,
        checked_in=False,
    )
    _create_attendee_ticket(
        event=previous_event,
        ticket_type=ticket_type_previous,
        index=3,
        course=course_a,
        school=school_a,
        graduation_year=previous_year + 2,
        checked_in=True,
    )

    resp = client.get(
        reverse("organizer-attendee-list"),
        {
            "year": current_year,
            "school_id": str(school_a.id),
            "course_id": str(course_a.id),
            "attendance_status": "checked_in",
            "relationship": "student",
        },
    )
    payload = resp.data.get("data", resp.data)

    assert resp.status_code == status.HTTP_200_OK
    assert payload["count"] == 1
    assert len(payload["results"]) == 1
    assert payload["results"][0]["school_name"] == "School A"
    assert payload["results"][0]["attendance_status"] == "checked_in"
    assert payload["results"][0]["event_year"] == current_year
