import random
import urllib.request
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.core.files.base import ContentFile
from django.utils import timezone
from django.utils.text import slugify

# Adjust paths if models are in different apps
from apps.events.models import Event, Category
from apps.tickets.models import TicketType, School, Course, RegistrationCategory, RegistrationQuestion
from apps.accounts.models import User

SCHOOLS_COURSES = {
    "Strathmore Institute of Mathematical Sciences": ["BBS Financial Engineering", "BBS Acturial Science"],
    "Strathmore Law School": ["Bachelors of Laws (LL.B)"],
    "Strathmore University Business School": ["Bachelor of Supply Chain and Operations Management", "Bachelor of Commerce", "BBS Financial Economics"],
    "School of Computing and Engineering Sciences": ["BBIT", "CNS", "BSEEE"],
    "School of Tourism and Hospitality": ["BSC Tourism Management", "BSC in Hospitality  Management"],
    "School of Humanities and Social Sciences": ["Bachelor of Arts in International Studies", "Bachelor of Arts in Communication"],
}

EVENT_TEMPLATES = [
    "Symposium 2026", "Gala Dinner", "Orientation & Networking", 
    "Hackathon & Ideation", "Alumni Mixer", "Career Fair", "Research Presentations"
]

IMAGES = [
    "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200",
    "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200",
    "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=1200",
    "https://images.unsplash.com/photo-1432888622747-4eb9a8f5a07d?w=1200",
    "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=1200",
    "https://images.unsplash.com/photo-1529692236671-f1f639860b57?w=1200",
]

def dl(url, name):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=15) as r:
            return ContentFile(r.read(), name=name)
    except Exception as e:
        print(f"  [WARN] Failed to download {name}: {e}")
        return None

class Command(BaseCommand):
    help = "Seeds Strathmore schools, courses, and 20 sample events for Render/Production running."

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(self.style.SUCCESS("Seeding Strathmore Events & Schools directly on DB..."))
        self.stdout.write(self.style.SUCCESS('=' * 60))

        # Create/Get Admin
        admin_email = "admin@strathmoreuniversity.test"
        admin_user, _ = User.objects.get_or_create(
            email=admin_email,
            defaults={
                "first_name": "Admin", "last_name": "User",
                "is_active": True, "is_staff": True, "is_superuser": True
            }
        )
        admin_user.set_password("password123")
        admin_user.save()

        # Delete existing events
        deleted_count, _ = Event.objects.all().delete()
        self.stdout.write(f"Deleted {deleted_count} existing events.")

        default_category, _ = Category.objects.get_or_create(
            name="University Events",
            defaults={"slug": "university-events", "is_active": True}
        )

        base_date = timezone.now() + timedelta(days=10)
        events_to_create = []
        event_id = 1

        self.stdout.write("1. Seeding Schools and Courses into DB...")
        school_objs = []
        for s_idx, (school_name, courses) in enumerate(SCHOOLS_COURSES.items()):
            school_obj, _ = School.objects.get_or_create(name=school_name, defaults={"is_active": True, "sort_order": s_idx})
            school_objs.append(school_obj)
            for c_idx, course_name in enumerate(courses):
                Course.objects.get_or_create(school=school_obj, name=course_name, defaults={"is_active": True, "sort_order": c_idx})

        # List string for dropdowns
        all_school_names = [s for s in SCHOOLS_COURSES.keys()]

        self.stdout.write(f"2. Generating Events with Ticket forms and questions...")
        
        while len(events_to_create) < 20:
            school_name, courses = random.choice(list(SCHOOLS_COURSES.items()))
            course_name = random.choice(courses)
            
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
                format="hybrid",
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
            
            self.stdout.write(f"  ðŸ“¸  Downloading cover image for: {title[:30]}...")
            img = dl(random.choice(IMAGES), f"cover_{ev.id}.jpg")
            if img:
                ev.cover_image.save(f"cover_{ev.id}.jpg", img, save=True)
            
            # --- 3. Registration Setup ---
            
            # Student Category
            reg_student = RegistrationCategory.objects.create(
                event=ev, category="student", label="Strathmore Current Student",
                require_student_email=True, require_admission_number=True,
                ask_course=True, ask_school=True
            )
            
            # Add custom dropdown questions for Student
            RegistrationQuestion.objects.create(
                category=reg_student, label="How did you hear about this event?",
                field_type="dropdown", is_required=True, sort_order=1,
                options=[{"label": "Class Rep", "value": "class_rep"}, {"label": "Email", "value": "email"}, {"label": "Posters", "value": "posters"}]
            )
            RegistrationQuestion.objects.create(
                category=reg_student, label="Dietary Restrictions",
                field_type="dropdown", is_required=False, sort_order=2,
                options=[{"label": "None", "value": "none"}, {"label": "Vegetarian", "value": "veg"}, {"label": "Vegan", "value": "vegan"}]
            )
            
            TicketType.objects.create(
                event=ev, registration_category=reg_student, name="Student Pass", 
                ticket_class="free", price=0, quantity=100, is_active=True, description="Bring Student ID at check-in"
            )
            
            # Alumni/Guest Category
            reg_alumni = RegistrationCategory.objects.create(
                event=ev, category="alumni", label="Strathmore Alumni / External Guest",
                require_student_email=False, require_admission_number=False,
                ask_course=False, ask_school=False, ask_graduation_year=True
            )
            
            RegistrationQuestion.objects.create(
                category=reg_alumni, label="Which School were you loosely affiliated with?",
                field_type="dropdown", is_required=True, sort_order=1,
                options=[{"label": name, "value": name} for name in all_school_names]
            )
            RegistrationQuestion.objects.create(
                category=reg_alumni, label="Emergency Contact Phone",
                field_type="phone", is_required=True, sort_order=3, options=[]
            )
            RegistrationQuestion.objects.create(
                category=reg_alumni, label="Company / Employer currently working for",
                field_type="text", is_required=False, sort_order=2, options=[]
            )
            
            TicketType.objects.create(
                event=ev, registration_category=reg_alumni, name="Alumni/Guest Pass", 
                ticket_class="paid", price=random.choice([2000, 3500]), quantity=50, is_active=True
            )
            
            events_to_create.append(ev)
            event_id += 1

        self.stdout.write(self.style.SUCCESS(f"\nâœ… Successfully seeded Schools, Courses, Registration Tiers/Questions, & {len(events_to_create)} Events with images!"))
