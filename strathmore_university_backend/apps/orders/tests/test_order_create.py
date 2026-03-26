from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.contrib.auth.models import AnonymousUser
from django.utils import timezone
from rest_framework.test import APIRequestFactory

from apps.accounts.tests.factories import OrganizerUserFactory
from apps.events.models import Event
from apps.orders.models import OrderRegistration
from apps.orders.serializers import OrderCreateSerializer
from apps.tickets.models import Course, RegistrationCategory, School, TicketType


def _create_event(organizer) -> Event:
    start_at = timezone.now() + timedelta(days=5)
    end_at = start_at + timedelta(hours=3)
    return Event.objects.create(
        organizer=organizer,
        title="Custom Course Checkout",
        slug="custom-course-checkout",
        format="in_person",
        event_type="public",
        status="published",
        start_date=start_at.date(),
        start_time=start_at.time().replace(microsecond=0),
        end_date=end_at.date(),
        end_time=end_at.time().replace(microsecond=0),
        venue_name="Auditorium",
        city="Nairobi",
        country="Kenya",
    )


def test_order_create_accepts_custom_course_name_and_creates_course(db):
    organizer = OrganizerUserFactory()
    event = _create_event(organizer)
    school = School.objects.get(name="School of Computing and Engineering Sciences")
    registration_category = RegistrationCategory.objects.create(
        event=event,
        category="student",
        label="Student",
        is_active=True,
        require_student_email=True,
        require_admission_number=True,
        ask_school=True,
        ask_course=True,
    )
    ticket_type = TicketType.objects.create(
        event=event,
        registration_category=registration_category,
        name="Student Pass",
        ticket_class="free",
        price=Decimal("0.00"),
        quantity=50,
        is_active=True,
    )

    payload = {
        "event_slug": event.slug,
        "items": [
            {
                "ticket_type_id": str(ticket_type.id),
                "quantity": 1,
                "attendee_name": "Jane Doe",
                "attendee_email": "jane@example.com",
            }
        ],
        "payment_method": "free",
        "attendee_first_name": "Jane",
        "attendee_last_name": "Doe",
        "attendee_email": "jane@example.com",
        "attendee_phone": "+254700000000",
        "registration": {
            "category_id": str(registration_category.id),
            "category_type": "student",
            "category_label": "Student",
            "school_id": str(school.id),
            "course_id": None,
            "custom_course_name": "Bachelor of Cloud Engineering",
            "admission_number": "123456",
            "student_email": "jane@strathmore.edu",
            "answers": [],
        },
    }

    request = APIRequestFactory().post("/api/orders/create/", payload, format="json")
    request.user = AnonymousUser()

    serializer = OrderCreateSerializer(data=payload, context={"request": request})

    assert serializer.is_valid(), serializer.errors
    order = serializer.save()

    created_course = Course.objects.get(
        school=school,
        name="Bachelor of Cloud Engineering",
    )
    registration = OrderRegistration.objects.get(order=order)

    assert registration.course_id == created_course.id
    assert registration.school_id == school.id
    assert order.status == "confirmed"
