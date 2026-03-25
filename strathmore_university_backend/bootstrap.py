"""
bootstrap.py â€” Run from strathmore_university_backend/ folder with:
   python bootstrap.py

Creates superuser + seeds 5 events. No database password needed (SQLite).
"""
import os, sys, django, urllib.request
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
os.environ.setdefault("SECRET_KEY", "strathmore-university-dev-secret-key-2025")
sys.path.insert(0, os.path.dirname(__file__))
django.setup()

from django.core.files.base import ContentFile
from django.utils import timezone
from django.utils.text import slugify
from django.db import transaction
from datetime import date, time as dtime
from apps.events.models import Event, Category
from apps.tickets.models import TicketType
from apps.speakers.models import Speaker
from apps.sponsors.models import Sponsor
from apps.schedules.models import ScheduleItem
from apps.accounts.models import User, OrganizerProfile


def dl(url, name):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=15) as r:
            return ContentFile(r.read(), name=name)
    except Exception as e:
        print(f"    [img skip] {e}")
        return None

# â”€â”€ Create/ensure organizer user â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
print("\n[1/7] Setting up organizer account...")
if User.objects.filter(email="admin@strathmoreuniversity.com").exists():
    organizer = User.objects.get(email="admin@strathmoreuniversity.com")
    print("  Already exists â€” using admin@strathmoreuniversity.com")
else:
    organizer = User.objects.create_superuser(
        email="admin@strathmoreuniversity.com", password="Admin1234!",
        first_name="Strathmore University", last_name="Admin",
    )
    print("  Created: admin@strathmoreuniversity.com / Admin1234!")

organizer.role = "organizer"
organizer.is_staff = True
organizer.is_email_verified = True
organizer.save()

OrganizerProfile.objects.get_or_create(
    user=organizer,
    defaults={"organization_name": "Strathmore University Official", "is_approved": True, "is_verified": True},
)
print("  Organizer profile ready âœ“")

# â”€â”€ Delete existing events â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
print("\n[2/7] Deleting existing events...")
n, _ = Event.objects.all().delete()
print(f"  Deleted {n} records.")

# â”€â”€ Event definitions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
EVENTS = [
    {
        "title": "Nairobi Tech Summit 2025",
        "description": "East Africa's premier technology conference bringing together 2,000+ innovators, engineers, founders, and investors for two days of cutting-edge talks, hands-on workshops, and unparalleled networking.\n\nDeep dives into AI, cloud architecture, fintech, and the future of African tech ecosystems. Meals and refreshments included.",
        "category": "Technology", "format": "in_person",
        "theme_color": "#1E4DB7", "accent_color": "#06B6D4",
        "start_date": "2025-09-12", "start_time": "08:00",
        "end_date": "2025-09-13", "end_time": "18:00",
        "venue_name": "Kenyatta International Convention Centre",
        "address": "City Square", "city": "Nairobi", "country": "Kenya",
        "refund_policy": "7_days", "is_featured": True, "attendee_count": 1842,
        "cover_url": "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80",
        "tickets": [
            {"name": "Early Bird", "cls": "early_bird", "price": 3500, "qty": 200, "desc": "Limited early-access tickets."},
            {"name": "Standard", "cls": "paid", "price": 5500, "qty": 800, "desc": "Full 2-day access with meals."},
            {"name": "VIP", "cls": "vip", "price": 15000, "qty": 50, "desc": "Front-row seating + speaker dinner + networking lounge."},
        ],
        "speakers": [
            {"name": "Dr. Amina Osei", "title": "Chief AI Officer", "org": "Safaricom PLC", "bio": "Pioneer in ML for African languages. 15+ years at intersection of NLP and mobile tech.", "mc": False, "seed": 237},
            {"name": "Marcus Ndungu", "title": "CTO", "org": "Cellulant", "bio": "Architect of Africa's largest payment infrastructure. Speaker at AWS re:Invent.", "mc": False, "seed": 342},
            {"name": "Priya Sharma", "title": "VP Engineering", "org": "Andela", "bio": "Led engineering teams across 5 continents. Passionate about distributed systems.", "mc": False, "seed": 488},
            {"name": "Victor Mutua", "title": "Host", "org": "TechCabal Live", "bio": "Award-winning tech journalist. Makes complex topics engaging.", "mc": True, "seed": 101},
        ],
        "sponsors": [
            {"name": "Safaricom", "tier": "platinum", "web": "https://safaricom.co.ke", "seed": 11},
            {"name": "Google Africa", "tier": "gold", "web": "https://google.com", "seed": 22},
            {"name": "Microsoft", "tier": "gold", "web": "https://microsoft.com", "seed": 33},
            {"name": "Equity Bank", "tier": "silver", "web": "https://equitybank.co.ke", "seed": 44},
        ],
        "schedule": [
            {"title": "Registration & Breakfast", "start": "08:00", "end": "09:00", "desc": "Pick up your badge and enjoy breakfast.", "type": "Break"},
            {"title": "Opening Keynote: Africa's AI Decade", "start": "09:00", "end": "10:00", "desc": "The state of AI across the continent.", "type": "Keynote"},
            {"title": "Panel: Building for a Billion Users", "start": "10:15", "end": "11:15", "desc": "Scaling products across 54 African markets.", "type": "Panel"},
            {"title": "Workshop: LLMs in Production", "start": "11:30", "end": "13:00", "desc": "Hands-on lab with fine-tuned language models.", "type": "Workshop"},
            {"title": "Lunch & Expo Floor", "start": "13:00", "end": "14:00", "desc": "30+ exhibitor booths over a hot Kenyan lunch.", "type": "Break"},
            {"title": "Fireside: Fundraising in 2025", "start": "14:00", "end": "15:00", "desc": "VCs and founders on the funding climate.", "type": "Fireside"},
            {"title": "Closing & Networking", "start": "17:00", "end": "18:00", "desc": "Award ceremony and cocktail networking.", "type": "Ceremony"},
        ],
    },
    {
        "title": "Afro Beats & Culture Festival",
        "description": "Three stages, 30 artists, one unforgettable night under the Nairobi sky. Afro Beats & Culture Festival spotlights Afrobeats, Amapiano, Bongo Flava, and Afro-Soul.\n\nBeyond music: curated art installations, pan-African cuisine, fashion pop-ups and live body art.",
        "category": "Music & Arts", "format": "in_person",
        "theme_color": "#7C3AED", "accent_color": "#F59E0B",
        "start_date": "2025-10-04", "start_time": "14:00",
        "end_date": "2025-10-04", "end_time": "23:59",
        "venue_name": "Uhuru Gardens", "address": "Langata Road",
        "city": "Nairobi", "country": "Kenya",
        "refund_policy": "48_hours", "is_featured": True, "attendee_count": 3500,
        "cover_url": "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200&q=80",
        "tickets": [
            {"name": "General Admission", "cls": "paid", "price": 1500, "qty": 2000, "desc": "Access to all three stages."},
            {"name": "VIP Lounge", "cls": "vip", "price": 6000, "qty": 150, "desc": "Raised platform, dedicated bar & artist meet-and-greet."},
            {"name": "Kids Under 12", "cls": "free", "price": 0, "qty": 300, "desc": "Children under 12 free with a paying adult."},
        ],
        "speakers": [
            {"name": "DJ Afroking", "title": "Headline DJ & Producer", "org": "Independent", "bio": "4Ã— African Music Award winner blending traditional rhythms with electronic production.", "mc": False, "seed": 512},
            {"name": "Amara Diallo", "title": "Singer-Songwriter", "org": "Diallo Music Group", "bio": "Senegalese-Kenyan vocalist. Debut album Unity hit #1 across 12 African countries.", "mc": False, "seed": 768},
            {"name": "Zara Mwangi", "title": "Festival Host & Comedian", "org": "Comedy Store Kenya", "bio": "Stand-up comedian and actress. Will keep the energy high all night long.", "mc": True, "seed": 199},
        ],
        "sponsors": [
            {"name": "Tusker Lager", "tier": "platinum", "web": "https://tusker.com", "seed": 66},
            {"name": "Airtel Kenya", "tier": "gold", "web": "https://airtel.co.ke", "seed": 77},
            {"name": "Sunlight Events", "tier": "silver", "web": "", "seed": 88},
        ],
        "schedule": [
            {"title": "Gates Open & Street Food Market", "start": "14:00", "end": "16:00", "desc": "Explore food stalls, art installations and fashion.", "type": "Break"},
            {"title": "Afternoon Performances", "start": "16:00", "end": "18:30", "desc": "Emerging artists on secondary stages.", "type": "Performance"},
            {"title": "Main Stage: Amara Diallo", "start": "19:00", "end": "20:00", "desc": "Soulful Afro-Soul set with live band.", "type": "Performance"},
            {"title": "Headline Set: DJ Afroking", "start": "21:30", "end": "23:45", "desc": "Two-hour DJ set with full pyrotechnics.", "type": "Performance"},
        ],
    },
    {
        "title": "Startup Pitch Night: East Africa",
        "description": "12 pre-selected startups compete before top investors and a live audience of 500. Winners share KES 5 million in grants.\n\nFree to attend. Live-streamed on YouTube. Applications open for all stage startups.",
        "category": "Business", "format": "hybrid",
        "theme_color": "#059669", "accent_color": "#1E4DB7",
        "start_date": "2025-08-22", "start_time": "17:00",
        "end_date": "2025-08-22", "end_time": "21:00",
        "venue_name": "iHub Nairobi", "address": "Senteu Plaza, Milimani Road",
        "city": "Nairobi", "country": "Kenya", "streaming_link": "https://youtube.com/live/pitchnight2025",
        "refund_policy": "no_refund", "is_featured": False, "attendee_count": 480,
        "cover_url": "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200&q=80",
        "tickets": [
            {"name": "In-Person (Free)", "cls": "free", "price": 0, "qty": 400, "desc": "Free in-person seat at iHub."},
            {"name": "Online Stream (Free)", "cls": "free", "price": 0, "qty": 2000, "desc": "Free live-stream via YouTube."},
        ],
        "speakers": [
            {"name": "Wanjiku Kamau", "title": "Managing Partner", "org": "Savannah Fund", "bio": "Invested in 40+ African startups at seed stage. Former Google Zurich engineer.", "mc": False, "seed": 321},
            {"name": "Ben Okafor", "title": "Investment Director", "org": "GSMA Accelerator", "bio": "Specialist in mobile-first business models across sub-Saharan Africa.", "mc": False, "seed": 654},
            {"name": "Sarah Njoroge", "title": "MC & Ecosystem Builder", "org": "Nairobi Garage", "bio": "Co-founder of Nairobi Garage and passionate startup community builder.", "mc": True, "seed": 987},
        ],
        "sponsors": [
            {"name": "Savannah Fund", "tier": "gold", "web": "https://savannah.fund", "seed": 111},
            {"name": "GSMA Africa", "tier": "silver", "web": "https://gsma.com", "seed": 222},
            {"name": "iHub", "tier": "partner", "web": "https://ihub.co.ke", "seed": 333},
        ],
        "schedule": [
            {"title": "Doors Open & Networking", "start": "17:00", "end": "18:00", "desc": "Meet investors, mentors and founders.", "type": "Break"},
            {"title": "Welcome & Ground Rules", "start": "18:00", "end": "18:15", "desc": "MC introduces format and judging criteria.", "type": "Keynote"},
            {"title": "Pitch Rounds 1-6", "start": "18:15", "end": "19:30", "desc": "Six startups pitch 5 min + 3-min Q&A each.", "type": "Panel"},
            {"title": "Break & Sponsor Demos", "start": "19:30", "end": "19:45", "desc": "Short break while judges deliberate.", "type": "Break"},
            {"title": "Pitch Rounds 7-12 + Winners", "start": "19:45", "end": "21:00", "desc": "Remaining pitches and winner announcement.", "type": "Panel"},
        ],
    },
    {
        "title": "Women in Leadership Summit",
        "description": "A transformative one-day summit accelerating gender equity in boardrooms and civil society across Africa. Theme: Bold Moves.\n\nKeynotes, panel conversations, mentorship roundtables and a curated exhibition. Childcare available on request.",
        "category": "Education", "format": "in_person",
        "theme_color": "#DB2777", "accent_color": "#7C3AED",
        "start_date": "2025-11-08", "start_time": "08:30",
        "end_date": "2025-11-08", "end_time": "17:30",
        "venue_name": "Movenpick Hotel", "address": "Westlands, Parklands Road",
        "city": "Nairobi", "country": "Kenya",
        "refund_policy": "7_days", "is_featured": True, "attendee_count": 620,
        "cover_url": "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=1200&q=80",
        "tickets": [
            {"name": "Early Bird", "cls": "early_bird", "price": 4500, "qty": 100, "desc": "Discounted tickets until 30 Oct 2025."},
            {"name": "Standard Delegate", "cls": "paid", "price": 6500, "qty": 400, "desc": "Full day access including meals."},
            {"name": "Corporate Table (10 seats)", "cls": "vip", "price": 55000, "qty": 20, "desc": "Reserved table with premium branding."},
        ],
        "speakers": [
            {"name": "Hon. Martha Karua", "title": "Senior Advocate & Former MP", "org": "Narc Kenya", "bio": "Veteran politician and constitutional lawyer who shaped Kenyan legislation for 30 years.", "mc": False, "seed": 411},
            {"name": "Dr. Ngozi Okonkwo", "title": "CEO", "org": "AfriHealth Initiative", "bio": "Built 200 clinics across rural Africa. TIME 100 Most Influential 2023.", "mc": False, "seed": 522},
            {"name": "Fatima Al-Hassan", "title": "Chief People Officer", "org": "Jumia Group", "bio": "Leading diversity and inclusion strategy across 11 African markets.", "mc": False, "seed": 633},
            {"name": "Ciku Mwangi", "title": "Event Host", "org": "NTV Kenya", "bio": "Award-winning journalist known for sharp wit and inclusive facilitation.", "mc": True, "seed": 744},
        ],
        "sponsors": [
            {"name": "UN Women", "tier": "platinum", "web": "https://unwomen.org", "seed": 444},
            {"name": "Equity Bank", "tier": "gold", "web": "https://equitybank.co.ke", "seed": 555},
            {"name": "Safaricom Foundation", "tier": "silver", "web": "https://safaricom.co.ke", "seed": 666},
        ],
        "schedule": [
            {"title": "Registration & Breakfast", "start": "08:30", "end": "09:15", "desc": "Networking breakfast and exhibition viewing.", "type": "Break"},
            {"title": "Opening Keynote: Bold Moves", "start": "09:15", "end": "10:00", "desc": "Lessons from thirty years of bold leadership.", "type": "Keynote"},
            {"title": "Panel: Breaking the Glass Ceiling", "start": "10:15", "end": "11:30", "desc": "C-suite women on barriers, biases and breakthroughs.", "type": "Panel"},
            {"title": "Mentorship Roundtables", "start": "11:45", "end": "13:00", "desc": "Small-group sessions with industry leaders.", "type": "Workshop"},
            {"title": "Lunch & Networking", "start": "13:00", "end": "14:00", "desc": "Catered lunch and networking circles.", "type": "Break"},
            {"title": "Fireside: Resilience & Scale", "start": "14:00", "end": "15:00", "desc": "Candid conversation on failure, pivot and impact.", "type": "Fireside"},
            {"title": "Closing & Action Planning", "start": "16:30", "end": "17:30", "desc": "Set your personal Bold Moves goals.", "type": "Workshop"},
        ],
    },
    {
        "title": "Digital Marketing Masterclass",
        "description": "Full-day intensive training for marketers, entrepreneurs and content creators. Master paid media, SEO, social strategy and analytics â€” led by practitioners who managed $50M+ in ad spend.\n\nLeave with a 90-day roadmap, private community access and 6-month Q&A support. Laptops required.",
        "category": "Education", "format": "in_person",
        "theme_color": "#EA580C", "accent_color": "#1E4DB7",
        "start_date": "2025-07-19", "start_time": "09:00",
        "end_date": "2025-07-19", "end_time": "17:00",
        "venue_name": "Strathmore Business School", "address": "Ole Sangale Road, Madaraka",
        "city": "Nairobi", "country": "Kenya",
        "refund_policy": "48_hours", "is_featured": False, "attendee_count": 120,
        "cover_url": "https://images.unsplash.com/photo-1432888622747-4eb9a8f5a07d?w=1200&q=80",
        "tickets": [
            {"name": "Standard", "cls": "paid", "price": 8500, "qty": 80, "desc": "Full day with materials, meals and community access."},
            {"name": "Team of 3", "cls": "paid", "price": 22000, "qty": 15, "desc": "3 seats at a bundle discount."},
            {"name": "Early Bird", "cls": "early_bird", "price": 6000, "qty": 30, "desc": "Grab early access before 5 July 2025."},
        ],
        "speakers": [
            {"name": "James Kariuki", "title": "Head of Performance Marketing", "org": "Jumia Kenya", "bio": "Managed Google and Meta campaigns with $12M+ budget. Google-certified trainer.", "mc": False, "seed": 851},
            {"name": "Linda Achieng", "title": "SEO & Content Strategist", "org": "Freelance", "bio": "Grew three Kenyan brands to 100K+ organic visitors per month.", "mc": False, "seed": 962},
            {"name": "Tom Odhiambo", "title": "Training Coordinator", "org": "Strathmore Business School", "bio": "Facilitator with 10+ years running executive education across East Africa.", "mc": True, "seed": 173},
        ],
        "sponsors": [
            {"name": "Google Kenya", "tier": "gold", "web": "https://google.com", "seed": 888},
            {"name": "Meta for Developers", "tier": "silver", "web": "https://developers.facebook.com", "seed": 999},
            {"name": "Strathmore University", "tier": "partner", "web": "https://strathmore.edu", "seed": 123},
        ],
        "schedule": [
            {"title": "Welcome & Icebreaker", "start": "09:00", "end": "09:30", "desc": "Introductions and goal-setting exercise.", "type": "Workshop"},
            {"title": "Module 1: Paid Media Fundamentals", "start": "09:30", "end": "11:00", "desc": "Google Ads, Meta Ads and campaign architecture.", "type": "Workshop"},
            {"title": "Module 2: SEO in 2025", "start": "11:15", "end": "12:30", "desc": "Technical SEO, E-E-A-T and AI-powered content strategy.", "type": "Workshop"},
            {"title": "Lunch Break", "start": "12:30", "end": "13:15", "desc": "Catered lunch and informal networking.", "type": "Break"},
            {"title": "Module 3: Social & Influencer Strategy", "start": "13:15", "end": "14:45", "desc": "TikTok, Instagram and micro-influencer ROI frameworks.", "type": "Workshop"},
            {"title": "Module 4: Analytics & Reporting", "start": "15:00", "end": "16:00", "desc": "GA4, dashboards and data-driven decisions.", "type": "Workshop"},
            {"title": "90-Day Roadmap Workshop", "start": "16:00", "end": "17:00", "desc": "Build your marketing roadmap with trainer guidance.", "type": "Workshop"},
        ],
    },
]

# â”€â”€ Seed events â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
print(f"\n[3/7] Seeding {len(EVENTS)} events...\n")

for idx, ev in enumerate(EVENTS, 1):
    print(f"  [{idx}/5] {ev['title']}")
    with transaction.atomic():
        cat, _ = Category.objects.get_or_create(
            name=ev["category"],
            defaults={"slug": slugify(ev["category"]), "is_active": True},
        )
        event = Event.objects.create(
            organizer=organizer, title=ev["title"],
            description=ev["description"], category=cat,
            format=ev["format"], event_type="public", status="published",
            start_date=date.fromisoformat(ev["start_date"]),
            start_time=dtime.fromisoformat(ev["start_time"]),
            end_date=date.fromisoformat(ev["end_date"]),
            end_time=dtime.fromisoformat(ev["end_time"]),
            timezone="Africa/Nairobi",
            venue_name=ev.get("venue_name", ""),
            venue_address=ev.get("address", ""),
            city=ev.get("city", "Nairobi"),
            country=ev.get("country", "Kenya"),
            streaming_link=ev.get("streaming_link", ""),
            theme_color=ev["theme_color"], accent_color=ev["accent_color"],
            refund_policy=ev.get("refund_policy", "no_refund"),
            is_featured=ev.get("is_featured", False),
            attendee_count=ev.get("attendee_count", 0),
            published_at=timezone.now(), stickers=[],
        )
        # Cover
        img = dl(ev["cover_url"], f"cover_{event.id}.jpg")
        if img:
            event.cover_image.save(f"cover_{event.id}.jpg", img, save=True)

        # Tickets
        for t in ev["tickets"]:
            TicketType.objects.create(
                event=event, name=t["name"], ticket_class=t["cls"],
                price=t["price"], quantity=t["qty"],
                description=t.get("desc",""), currency="KES", is_active=True,
            )

        # Speakers
        for sp in ev["speakers"]:
            s = Speaker.objects.create(
                event=event, name=sp["name"], title=sp.get("title",""),
                organization=sp.get("org",""), bio=sp.get("bio",""),
                is_mc=sp.get("mc", False),
            )
            av = dl(f"https://picsum.photos/seed/{sp['seed']}/300/300", f"spk_{s.id}.jpg")
            if av:
                s.avatar.save(f"spk_{s.id}.jpg", av, save=True)

        # Schedule
        for i, item in enumerate(ev["schedule"]):
            ScheduleItem.objects.create(
                event=event, title=item["title"],
                description=item.get("desc",""),
                start_time=dtime.fromisoformat(item["start"]),
                end_time=dtime.fromisoformat(item["end"]),
                session_type=item.get("type",""),
                sort_order=i, day=1,
            )

        # Sponsors
        for sp in ev["sponsors"]:
            sponsor = Sponsor.objects.create(
                event=event, name=sp["name"], tier=sp["tier"],
                website=sp.get("web",""),
            )
            logo = dl(f"https://picsum.photos/seed/logo{sp['seed']}/200/100", f"logo_{sponsor.id}.jpg")
            if logo:
                sponsor.logo.save(f"logo_{sponsor.id}.jpg", logo, save=True)

        print(f"     âœ… Created â€” {len(ev['tickets'])} tickets | {len(ev['speakers'])} speakers | {len(ev['schedule'])} sessions | {len(ev['sponsors'])} sponsors")

print(f"\nðŸŽ‰ All {len(EVENTS)} events seeded successfully!")
print(f"\nðŸ“‹ Login credentials:")
print(f"   Email:    admin@strathmoreuniversity.com")
print(f"   Password: Admin1234!")
print(f"\nðŸŒ Visit: http://localhost:5173/events")
