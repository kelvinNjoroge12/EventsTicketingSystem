import requests

try:
    slug = "startup-pitch-night-east-africa-upcoming-edition-e820132e"
    # 1. Get Ticket Details
    r1 = requests.get(f"https://eventsticketingsystem.onrender.com/api/events/{slug}/")
    event_data = r1.json()
    if 'data' not in event_data or 'ticket_types' not in event_data['data'] or len(event_data['data']['ticket_types']) == 0:
        print("NO TICKETS FOUND", event_data)
        exit(1)
        
    ticket_id = event_data['data']['ticket_types'][0]['id']

    payload = {
        "event_slug": slug,
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
    
    headers = {"Authorization": "Bearer BAD_TOKEN"}
    r2 = requests.post("https://eventsticketingsystem.onrender.com/api/orders/create/", json=payload, headers=headers)
    print("STATUS", r2.status_code)
    print("BODY", r2.text[:2000])

except Exception as e:
    print("ERROR", e)
