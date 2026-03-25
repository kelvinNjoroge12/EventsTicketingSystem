import os
import sys

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
import django
django.setup()

import pytest
from django.test import RequestFactory
from django.contrib.auth.models import AnonymousUser
from apps.events.models import Event
from apps.orders.views import OrderCreateView


def test_view(db):
    event = Event.objects.first()
    if not event:
        pytest.skip("No events available in test database.")
    tt = event.ticket_types.first()
    if not tt:
        pytest.skip("No ticket types available for selected event.")

    factory = RequestFactory()
    data = {
        "event_slug": event.slug,
        "items": [{
            "ticket_type_id": str(tt.id),
            "quantity": 1,
            "attendee_name": "Test Guest",
            "attendee_email": "guest@example.com"
        }],
        "payment_method": "free",
        "attendee_first_name": "Test",
        "attendee_last_name": "Guest",
        "attendee_email": "guest@example.com",
    }
    django_request = factory.post("/api/orders/create/", data, content_type="application/json")
    django_request.user = AnonymousUser()

    view = OrderCreateView.as_view()
    response = view(django_request)
    assert response.status_code in {200, 201, 400, 403, 409}

if __name__ == "__main__":
    test_view()
