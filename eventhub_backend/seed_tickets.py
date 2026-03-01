import os
import django
import random
from datetime import timedelta
from django.utils import timezone

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')
django.setup()

from apps.events.models import Event
from apps.tickets.models import TicketType

def seed_tickets():
    events = Event.objects.all()
    print(f"Adding ticket types to {events.count()} events...")
    
    for event in events:
        # Clear existing tickets to avoid duplicates if run multiple times
        event.ticket_types.all().delete()
        
        # 1. Early Bird
        TicketType.objects.create(
            event=event,
            name="Early Bird",
            ticket_class="early_bird",
            price=random.choice([500, 1000, 1500]),
            quantity=50,
            sale_start=timezone.now(),
            sale_end=event.start_date - timedelta(days=7), # Ends 7 days before event
            sort_order=1
        )
        
        # 2. Standard
        TicketType.objects.create(
            event=event,
            name="General Admission",
            ticket_class="paid",
            price=random.choice([1500, 2000, 2500, 3000]),
            quantity=200,
            sale_start=timezone.now(),
            sale_end=event.start_date, # Ends on event day
            sort_order=2
        )
        
        # 3. VIP
        TicketType.objects.create(
            event=event,
            name="VIP Pass",
            ticket_class="vip",
            price=random.choice([5000, 7500, 10000]),
            quantity=20,
            sale_start=timezone.now(),
            sale_end=event.start_date,
            sort_order=3
        )
        
        print(f"  Added tickets to: {event.title}")

    print("Successfully seeded ticket types!")

if __name__ == "__main__":
    seed_tickets()
