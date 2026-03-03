import os
import sys

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
import django
django.setup()

from django.test import RequestFactory
from rest_framework.request import Request
from apps.orders.views import OrderCreateView

def test_view():
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
    view = OrderCreateView.as_view()
    try:
        response = view(django_request)
        print("Response:", response.status_code, response.data)
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_view()
