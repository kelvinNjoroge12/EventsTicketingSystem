import requests
import json

resp = requests.get("https://eventsticketingsystem.onrender.com/api/tickets/?event_slug=startup-pitch-night-east-africa-575ab640")
data = resp.json()["data"]
ticket_id = data[0]["id"]
print("TICKET ID", ticket_id)

payload = {
    "event_slug": "startup-pitch-night-east-africa-575ab640",
    "items": [{
        "ticket_type_id": ticket_id,
        "quantity": 1,
        "attendee_name": "Test",
        "attendee_email": "test@example.com"
    }],
    "payment_method": "free",
    "attendee_first_name": "Test",
    "attendee_last_name": "Test",
    "attendee_email": "test@example.com",
    "attendee_phone": ""
}

try:
    resp = requests.post("https://eventsticketingsystem.onrender.com/api/orders/create/", json=payload)
    print("STATUS", resp.status_code)
    print("BODY", resp.text[:2000])
except Exception as e:
    print("ERROR", e)
