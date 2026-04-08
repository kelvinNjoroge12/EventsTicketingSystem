import os
import sys

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
import django
django.setup()

from django.test import RequestFactory
from django.contrib.auth.models import AnonymousUser
from apps.orders.views import OrderCreateView


def test_view(db):
    factory = RequestFactory()
    data = {
        "event_slug": "startup-pitch-night-east-africa-575ab640",
        "items": [{
            "ticket_type_id": "00000000-0000-0000-0000-000000000000",
            "quantity": 1,
            "attendee_name": "Test",
            "attendee_email": "test@example.com"
        }],
        "payment_method": "free",
        "attendee_first_name": "Test",
        "attendee_last_name": "Test",
        "attendee_email": "test@example.com",
    }
    django_request = factory.post("/api/orders/create/", data, content_type="application/json")
    django_request.user = AnonymousUser()
    view = OrderCreateView.as_view()
    response = view(django_request)
    assert response.status_code in {400, 403, 404, 409}

if __name__ == "__main__":
    test_view()
