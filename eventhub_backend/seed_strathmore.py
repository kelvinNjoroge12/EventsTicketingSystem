"""
seed_strathmore.py  –  Run this from the eventhub_backend folder
python seed_strathmore.py
"""
import os
import sys
import django
import random
import urllib.request
from datetime import timedelta

# Bootstrap Django
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.base")
django.setup()

from django.core.files.base import ContentFile
from django.utils import timezone
from django.utils.text import slugify
from apps.events.models import Event, Category
from apps.tickets.models import TicketType, School, Course
from apps.accounts.models import User

# Data definitions
SCHOOLS_COURSES = {
    "Strathmore Institute of Mathematical Sciences": ["BBS Financial Engineering", "BBS Acturial Science"],
    "Strathmore Law School": ["Bachelors of Laws (LL.B)"],
    "Strathmore University Business School": ["Bachelor of Supply Chain and Operations Management", "Bachelor of Commerce", "BBS Financial Economics"],
    "School of Computing and Engineering Sciences": ["BBIT", "CNS", "BSEEE"],
    "School of Tourism and Hospitality": ["BSC Tourism Management", "BSC in Hospitality  Management"],
    "School of Humanities and Social Sciences": ["Bachelor of Arts in International Studies", "Bachelor of Arts in Communication"],
}

EVENT_TEMPLATES = [
    "Symposium 2026",
    "Gala Dinner",
    "Orientation & Networking",
    "Hackathon & Ideation",
    "Alumni Mixer",
    "Career Fair",
    "Research Presentations"
]

IMAGES = [
    "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80",
    "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200&q=80",
    "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=1200&q=80",
    "https://images.unsplash.com/photo-1432888622747-4eb9a8f5a07d?w=1200&q=80",
    "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=1200&q=80",
    "https://images.unsplash.com/photo-1529692236671-f1f639860b57?w=1200&q=80",
]

def dl(url, name):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=15) as r:
            return ContentFile(r.read(), name=name)
    except Exception as e:
        print(f"  [WARN] Failed to download {name}: {e}")
        return None

print("=" * 60)
print("Seeding Strathmore Events & Schools...")
print("=" * 60)

# Create/Get Admin
admin_email = "admin@eventhub.test"
admin_user, created = User.objects.get_or_create(
    email=admin_email,
    defaults={
        "first_name": "Admin",
        "last_name": "User",
        "is_active": True,
        "is_staff": True,
        "is_superuser": True
    }
)
admin_user.set_password("password123")
admin_user.save()

deleted_count, _ = Event.objects.all().delete()
print(f"Deleted {deleted_count} existing events.")

default_category, _ = Category.objects.get_or_create(
    name="University Events",
    defaults={"slug": "university-events", "is_active": True}
)

base_date = timezone.now() + timedelta(days=10)
events_to_create = []
event_id = 1

# Seed Schools and Courses
for school_name, courses in SCHOOLS_COURSES.items():
    school_obj, _ = School.objects.get_or_create(name=school_name, is_active=True)
    
    for course_name in courses:
        Course.objects.get_or_create(school=school_obj, name=course_name, is_active=True)
        
        # Create 1-2 events per course
        for i in range(2): 
            if len(events_to_create) >= 20:
                break
            
            title = f"{school_name} - {course_name} {random.choice(EVENT_TEMPLATES)}"
            description = f"Join us for an exclusive event tailored for {course_name} students and alumni from the {school_name}. Network with professionals, explore career opportunities, and engage in meaningful discussions."
            
            e_start = base_date + timedelta(days=event_id * 2)
            e_end = e_start + timedelta(hours=4)
            
            ev = Event(
                organizer=admin_user,
                title=title,
                slug=slugify(title)[:100] + f"-{event_id}",
                description=description,
                category=default_category,
                format="in_person",
                event_type="public",
                status="published",
                start_date=e_start.date(),
                start_time=e_start.time(),
                end_date=e_end.date(),
                end_time=e_end.time(),
                timezone="Africa/Nairobi",
                venue_name="Strathmore University Auditorium",
                venue_address="Ole Sangale Road, Madaraka",
                city="Nairobi",
                country="Kenya",
                theme_color="#1E4DB7",
                accent_color="#06B6D4",
                published_at=timezone.now(),
            )
            ev.save()
            
            print(f"  📸  Downloading cover image for {title}...")
            img = dl(random.choice(IMAGES), f"cover_{ev.id}.jpg")
            if img:
                ev.cover_image.save(f"cover_{ev.id}.jpg", img, save=True)
            
            TicketType.objects.create(
                event=ev, name="Student Registration", ticket_class="free", price=0, quantity=100, is_active=True
            )
            TicketType.objects.create(
                event=ev, name="Alumni / Guest Pass", ticket_class="paid", price=2000, quantity=50, is_active=True
            )
            
            print(f"Created: {title}")
            events_to_create.append(ev)
            event_id += 1

while len(events_to_create) < 20:
    school_name, courses = random.choice(list(SCHOOLS_COURSES.items()))
    course_name = random.choice(courses)
    title = f"{school_name} - {course_name} Extra {random.choice(EVENT_TEMPLATES)}"
    description = f"Special additional {course_name} event at {school_name}."
    
    e_start = base_date + timedelta(days=event_id * 2)
    e_end = e_start + timedelta(hours=4)
    
    ev = Event.objects.create(
        organizer=admin_user, title=title, slug=slugify(title)[:100] + f"-{event_id}", description=description,
        category=default_category, format="in_person", status="published", start_date=e_start.date(),
        start_time=e_start.time(), end_date=e_end.date(), end_time=e_end.time(), timezone="Africa/Nairobi",
        venue_name="Strathmore University", city="Nairobi", country="Kenya", published_at=timezone.now(),
    )
    img = dl(random.choice(IMAGES), f"cover_{ev.id}.jpg")
    if img:
        ev.cover_image.save(f"cover_{ev.id}.jpg", img, save=True)
        
    TicketType.objects.create(event=ev, name="General Pass", ticket_class="free", price=0, quantity=100, is_active=True)
    events_to_create.append(ev)
    event_id += 1

print(f"\nSuccesfully seeded Schools, Courses & {len(events_to_create)} Events with images!")
