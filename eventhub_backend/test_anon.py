import os
import sys

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
import django
django.setup()

from django.test import RequestFactory
from apps.events.models import Event
from apps.orders.views import OrderCreateView

def test_view():
    event = Event.objects.first()
    tt = event.ticket_types.first()
    if not tt:
        print("No ticket types found")
        return

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
    
    # We must explicitly instantiate the AnonymousUser since the view does NOT have AuthenticationMiddleware attached for RequestFactory
    from django.contrib.auth.models import AnonymousUser
    django_request.user = AnonymousUser()

    view = OrderCreateView.as_view()
    try:
        response = view(django_request)
        print("Response:", response.status_code, response.data)
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_view()
