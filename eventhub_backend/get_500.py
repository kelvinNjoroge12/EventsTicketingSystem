import requests

try:
    # 1. Get Event Details
    r1 = requests.get("https://eventsticketingsystem.onrender.com/api/events/startup-pitch-night-east-africa-575ab640/")
    event_data = r1.json()
    ticket_id = event_data['data']['ticket_types'][0]['id']

    # 2. Add Order with NO AUTH so we simulate guest
    payload = {
        "event_slug": "startup-pitch-night-east-africa-575ab640",
        "items": [{
            "ticket_type_id": ticket_id,
            "quantity": 1,
            "attendee_name": "Guest Test",
            "attendee_email": "guest@example.com"
        }],
        "payment_method": "free",
        "attendee_first_name": "Guest",
        "attendee_last_name": "Test",
        "attendee_email": "guest@example.com",
        "attendee_phone": ""
    }
    
    r2 = requests.post("https://eventsticketingsystem.onrender.com/api/orders/create/", json=payload)
    print("STATUS", r2.status_code)
    print("BODY", r2.text[:1000])

except Exception as e:
    print("ERROR", e)
