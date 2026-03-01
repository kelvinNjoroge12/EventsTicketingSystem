"""
Management command: seed_events
Usage: python manage.py seed_events
Deletes all events and creates 5 rich sample events with
speakers, MC, sponsors, schedule items, tickets, and cover images
pulled from Unsplash (no auth required).
"""
from __future__ import annotations
import urllib.request, os
from django.core.management.base import BaseCommand
from django.core.files.base import ContentFile
from django.utils import timezone
from django.utils.text import slugify
from django.db import transaction

EVENTS = [
    {
        "title": "Nairobi Tech Summit 2025",
        "description": (
            "East Africa's premier technology conference bringing together 2,000+ innovators, "
            "engineers, founders, and investors for two days of cutting-edge talks, hands-on "
            "workshops, and unparalleled networking. Expect deep dives into AI, cloud architecture, "
            "fintech, and the future of African tech ecosystems.\n\n"
            "Whether you're a seasoned CTO or a curious developer, Tech Summit gives you actionable "
            "insights and connections that fuel real growth. Meals and refreshments are included."
        ),
        "category": "Technology",
        "format": "in_person",
        "theme_color": "#1E4DB7",
        "accent_color": "#06B6D4",
        "start_date": "2025-09-12",
        "start_time": "08:00",
        "end_date": "2025-09-13",
        "end_time": "18:00",
        "venue_name": "Kenyatta International Convention Centre",
        "address": "City Square",
        "city": "Nairobi",
        "country": "Kenya",
        "refund_policy": "7_days",
        "is_featured": True,
        "attendee_count": 1842,
        "cover_url": "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80",
        "tickets": [
            {"name": "Early Bird", "ticket_class": "early_bird", "price": 3500, "qty": 200, "desc": "Limited early-access tickets – grab them before they're gone!"},
            {"name": "Standard", "ticket_class": "paid", "price": 5500, "qty": 800, "desc": "Full 2-day conference access with meals included."},
            {"name": "VIP", "ticket_class": "vip", "price": 15000, "qty": 50, "desc": "Front-row seating, speaker dinner, and exclusive networking lounge access."},
        ],
        "speakers": [
            {"name": "Dr. Amina Osei", "title": "Chief AI Officer", "org": "Safaricom PLC", "bio": "Pioneer in ML systems for African languages. 15+ years at the intersection of NLP and mobile tech.", "is_mc": False},
            {"name": "Marcus Ndungu", "title": "CTO", "org": "Cellulant", "bio": "Architect of Africa's largest payment infrastructure. Speaker at AWS re:Invent and Google I/O.", "is_mc": False},
            {"name": "Priya Sharma", "title": "VP Engineering", "org": "Andela", "bio": "Led engineering teams across 5 continents. Passionate about distributed systems and developer experience.", "is_mc": False},
            {"name": "Victor Mutua", "title": "Host", "org": "TechCabal Live", "bio": "Award-winning tech journalist and conference host. Makes complex topics accessible and engaging.", "is_mc": True},
        ],
        "sponsors": [
            {"name": "Safaricom", "tier": "platinum", "website": "https://safaricom.co.ke"},
            {"name": "Google Africa", "tier": "gold", "website": "https://google.com"},
            {"name": "Microsoft", "tier": "gold", "website": "https://microsoft.com"},
            {"name": "Equity Bank", "tier": "silver", "website": "https://equitybank.co.ke"},
            {"name": "Andela", "tier": "partner", "website": "https://andela.com"},
        ],
        "schedule": [
            {"title": "Registration & Breakfast", "start": "08:00", "end": "09:00", "desc": "Pick up your badge, enjoy a hot breakfast and meet fellow attendees.", "type": "Break"},
            {"title": "Opening Keynote: Africa's AI Decade", "start": "09:00", "end": "10:00", "desc": "The state of artificial intelligence across the continent and what comes next.", "type": "Keynote"},
            {"title": "Panel: Building for a Billion Users", "start": "10:15", "end": "11:15", "desc": "Lessons from scaling products across 54 African markets.", "type": "Panel"},
            {"title": "Workshop: LLMs in Production", "start": "11:30", "end": "13:00", "desc": "Hand-on lab deploying fine-tuned language models on low-bandwidth devices.", "type": "Workshop"},
            {"title": "Lunch Break & Expo Floor", "start": "13:00", "end": "14:00", "desc": "Explore 30+ exhibitor booths while enjoying a hot Kenyan lunch.", "type": "Break"},
            {"title": "Fireside: Fundraising in 2025", "start": "14:00", "end": "15:00", "desc": "VCs and founders discuss the current funding climate for African startups.", "type": "Fireside"},
            {"title": "Closing Ceremony & Networking", "start": "17:00", "end": "18:00", "desc": "Wrap-up, award ceremony and open cocktail networking session.", "type": "Ceremony"},
        ],
    },
    {
        "title": "Afro Beats & Culture Festival",
        "description": (
            "Three stages, 30 artists, one unforgettable night under the Nairobi sky. "
            "Afro Beats & Culture Festival is the continent's fastest-growing outdoor music "
            "celebration, spotlighting Afrobeats, Amapiano, Bongo Flava, and Afro-Soul artists "
            "from across Africa.\n\n"
            "Beyond music, immerse yourself in curated art installations, a pan-African cuisine "
            "market, fashion pop-ups, and live body art. Family-friendly afternoon sessions "
            "transition into an electric evening headlined by top chart artists."
        ),
        "category": "Music & Arts",
        "format": "in_person",
        "theme_color": "#7C3AED",
        "accent_color": "#F59E0B",
        "start_date": "2025-10-04",
        "start_time": "14:00",
        "end_date": "2025-10-04",
        "end_time": "23:59",
        "venue_name": "Uhuru Gardens",
        "address": "Langata Road",
        "city": "Nairobi",
        "country": "Kenya",
        "refund_policy": "48_hours",
        "is_featured": True,
        "attendee_count": 3500,
        "cover_url": "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200&q=80",
        "tickets": [
            {"name": "General Admission", "ticket_class": "paid", "price": 1500, "qty": 2000, "desc": "Access to all three stages and festival grounds."},
            {"name": "VIP Lounge", "ticket_class": "vip", "price": 6000, "qty": 150, "desc": "Exclusive raised platform, dedicated bar, personal food service and artist meet & greet."},
            {"name": "Kids (Under 12)", "ticket_class": "free", "price": 0, "qty": 300, "desc": "Children under 12 enter free when accompanied by a paying adult."},
        ],
        "speakers": [
            {"name": "DJ Afroking", "title": "Headline DJ & Producer", "org": "Independent", "bio": "4× African Music Award winner. Known for blending traditional rhythms with electronic production.", "is_mc": False},
            {"name": "Amara Diallo", "title": "Singer-Songwriter", "org": "Diallo Music Group", "bio": "Senegalese-Kenyan vocalist whose debut album 'Ubuntu' hit #1 across 12 African countries.", "is_mc": False},
            {"name": "Zara Mwangi", "title": "Festival Host & Comedian", "org": "Comedy Store Kenya", "bio": "Stand-up comedian, actress and crowd favourite. Will keep the energy high all night long.", "is_mc": True},
        ],
        "sponsors": [
            {"name": "Tusker Lager", "tier": "platinum", "website": "https://tusker.com"},
            {"name": "Airtel Kenya", "tier": "gold", "website": "https://airtel.co.ke"},
            {"name": "Sunlight Events", "tier": "silver", "website": ""},
        ],
        "schedule": [
            {"title": "Gates Open & Street Food Market", "start": "14:00", "end": "16:00", "desc": "Explore food stalls, art installations and the fashion market.", "type": "Break"},
            {"title": "Afternoon Performances (Stage 2 & 3)", "start": "16:00", "end": "18:30", "desc": "Emerging artists set the mood on secondary stages.", "type": "Performance"},
            {"title": "Main Stage: Amara Diallo", "start": "19:00", "end": "20:00", "desc": "Soulful Afro-Soul set with live band.", "type": "Performance"},
            {"title": "Headline Set: DJ Afroking", "start": "21:30", "end": "23:45", "desc": "Two-hour headline DJ set with full light and pyrotechnics show.", "type": "Performance"},
        ],
    },
    {
        "title": "Startup Pitch Night: East Africa Edition",
        "description": (
            "The most competitive pitch night in East Africa is back! 12 pre-selected startups "
            "will compete before a panel of top investors and a live audience of 500 ecosystem "
            "players. Winners share KES 5 million in grants and investor introductions.\n\n"
            "This event is free to attend — applications are open for startups at any stage. "
            "Come ready to network, celebrate entrepreneurship and discover the next big thing "
            "coming out of the region."
        ),
        "category": "Business",
        "format": "hybrid",
        "theme_color": "#059669",
        "accent_color": "#1E4DB7",
        "start_date": "2025-08-22",
        "start_time": "17:00",
        "end_date": "2025-08-22",
        "end_time": "21:00",
        "venue_name": "iHub Nairobi",
        "address": "Senteu Plaza, Milimani Road",
        "city": "Nairobi",
        "country": "Kenya",
        "streaming_link": "https://youtube.com/live/pitchnight2025",
        "refund_policy": "no_refund",
        "is_featured": False,
        "attendee_count": 480,
        "cover_url": "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200&q=80",
        "tickets": [
            {"name": "Free Admission", "ticket_class": "free", "price": 0, "qty": 400, "desc": "In-person attendance at iHub. First come, first seated."},
            {"name": "Online Stream", "ticket_class": "free", "price": 0, "qty": 2000, "desc": "Free live-stream access via YouTube."},
        ],
        "speakers": [
            {"name": "Wanjiku Kamau", "title": "Managing Partner", "org": "Savannah Fund", "bio": "Invested in 40+ African startups at seed stage. Former engineer at Google Zurich.", "is_mc": False},
            {"name": "Ben Okafor", "title": "Investment Director", "org": "GSMA Ecosystem Accelerator", "bio": "Specialist in mobile-first business models and startup scaling across sub-Saharan Africa.", "is_mc": False},
            {"name": "Sarah Njoroge", "title": "MC & Ecosystem Builder", "org": "Nairobi Garage", "bio": "Co-founder of Nairobi Garage and passionate startup community builder.", "is_mc": True},
        ],
        "sponsors": [
            {"name": "Savannah Fund", "tier": "gold", "website": "https://savannah.fund"},
            {"name": "GSMA Africa", "tier": "silver", "website": "https://gsma.com"},
            {"name": "iHub", "tier": "partner", "website": "https://ihub.co.ke"},
        ],
        "schedule": [
            {"title": "Doors Open & Networking", "start": "17:00", "end": "18:00", "desc": "Meet investors, mentors and fellow founders.", "type": "Break"},
            {"title": "Welcome & Ground Rules", "start": "18:00", "end": "18:15", "desc": "MC introduces the evening format and judging criteria.", "type": "Keynote"},
            {"title": "Pitch Rounds 1–6", "start": "18:15", "end": "19:30", "desc": "First six startups pitch 5 minutes each followed by 3-minute Q&A.", "type": "Panel"},
            {"title": "Break & Sponsor Demos", "start": "19:30", "end": "19:45", "desc": "Short break while judges deliberate.", "type": "Break"},
            {"title": "Pitch Rounds 7–12", "start": "19:45", "end": "21:00", "desc": "Remaining six pitches plus announcement of winners.", "type": "Panel"},
        ],
    },
    {
        "title": "Women in Leadership Summit",
        "description": (
            "A transformative one-day summit dedicated to accelerating gender equity in "
            "boardrooms, government, and civil society across Africa. This year's theme — "
            "\"Bold Moves\" — centres on stories of women who disrupted industries, fought "
            "systemic barriers, and built legacies.\n\n"
            "Through keynotes, candid panel conversations, mentorship roundtables and a "
            "curated exhibition, attendees leave with a personal action plan and a powerful "
            "peer network. Childcare facilities are available on request."
        ),
        "category": "Education",
        "format": "in_person",
        "theme_color": "#DB2777",
        "accent_color": "#7C3AED",
        "start_date": "2025-11-08",
        "start_time": "08:30",
        "end_date": "2025-11-08",
        "end_time": "17:30",
        "venue_name": "Movenpick Hotel",
        "address": "Westlands, Parklands Road",
        "city": "Nairobi",
        "country": "Kenya",
        "refund_policy": "7_days",
        "is_featured": True,
        "attendee_count": 620,
        "cover_url": "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=1200&q=80",
        "tickets": [
            {"name": "Early Bird", "ticket_class": "early_bird", "price": 4500, "qty": 100, "desc": "Discounted ticket available until 30 Oct 2025."},
            {"name": "Standard Delegate", "ticket_class": "paid", "price": 6500, "qty": 400, "desc": "Full day access including meals and summit materials."},
            {"name": "Corporate Table (10 seats)", "ticket_class": "vip", "price": 55000, "qty": 20, "desc": "Reserved table for your team with premium branding."},
        ],
        "speakers": [
            {"name": "Hon. Martha Karua", "title": "Senior Advocate & Former MP", "org": "Narc Kenya", "bio": "Veteran politician, constitutional lawyer and women's rights champion who has shaped Kenyan legislation for three decades.", "is_mc": False},
            {"name": "Dr. Ngozi Okonkwo", "title": "CEO", "org": "AfriHealth Initiative", "bio": "Healthcare entrepreneur who built a network of 200 clinics across rural Africa. TIME 100 Most Influential 2023.", "is_mc": False},
            {"name": "Fatima Al-Hassan", "title": "Chief People Officer", "org": "Jumia Group", "bio": "HR executive leading diversity and inclusion strategy across 11 African markets.", "is_mc": False},
            {"name": "Ciku Mwangi", "title": "Event Host", "org": "NTV Kenya", "bio": "Award-winning journalist and television host known for sharp wit and inclusive facilitation.", "is_mc": True},
        ],
        "sponsors": [
            {"name": "UN Women", "tier": "platinum", "website": "https://unwomen.org"},
            {"name": "Equity Bank", "tier": "gold", "website": "https://equitybank.co.ke"},
            {"name": "Safaricom Foundation", "tier": "silver", "website": "https://safaricom.co.ke"},
            {"name": "Movenpick Hotel", "tier": "partner", "website": "https://movenpick.com"},
        ],
        "schedule": [
            {"title": "Registration & Breakfast", "start": "08:30", "end": "09:15", "desc": "Networking breakfast and exhibition viewing.", "type": "Break"},
            {"title": "Opening Keynote: Bold Moves", "start": "09:15", "end": "10:00", "desc": "Hon. Martha Karua shares lessons from thirty years of bold leadership.", "type": "Keynote"},
            {"title": "Panel: Breaking the Glass Ceiling", "start": "10:15", "end": "11:30", "desc": "C-suite women discuss barriers, biases and breakthroughs.", "type": "Panel"},
            {"title": "Mentorship Roundtables", "start": "11:45", "end": "13:00", "desc": "Small-group sessions with industry leaders. Pre-selection required.", "type": "Workshop"},
            {"title": "Lunch & Networking", "start": "13:00", "end": "14:00", "desc": "Catered lunch and curated networking circles.", "type": "Break"},
            {"title": "Fireside Chat: Dr. Okonkwo on Resilience", "start": "14:00", "end": "15:00", "desc": "Candid conversation on failure, pivot and scaling impact.", "type": "Fireside"},
            {"title": "Closing & Action Planning", "start": "16:30", "end": "17:30", "desc": "Guided session to set personal Bold Moves goals.", "type": "Workshop"},
        ],
    },
    {
        "title": "Digital Marketing Masterclass",
        "description": (
            "A full-day intensive training designed for marketing professionals, entrepreneurs "
            "and content creators ready to master paid media, SEO, social strategy and analytics "
            "in 2025. Led by practitioners who have managed combined ad spends exceeding $50 million.\n\n"
            "You will leave with a custom 90-day digital marketing roadmap, access to a private "
            "Slack community, and six months of post-training Q&A support. Laptops required. "
            "Lunch and snacks provided."
        ),
        "category": "Education",
        "format": "in_person",
        "theme_color": "#EA580C",
        "accent_color": "#1E4DB7",
        "start_date": "2025-07-19",
        "start_time": "09:00",
        "end_date": "2025-07-19",
        "end_time": "17:00",
        "venue_name": "Strathmore Business School",
        "address": "Ole Sangale Road, Madaraka",
        "city": "Nairobi",
        "country": "Kenya",
        "refund_policy": "48_hours",
        "is_featured": False,
        "attendee_count": 120,
        "cover_url": "https://images.unsplash.com/photo-1432888622747-4eb9a8f5a07d?w=1200&q=80",
        "tickets": [
            {"name": "Standard", "ticket_class": "paid", "price": 8500, "qty": 80, "desc": "Full day masterclass with materials, meals and community access."},
            {"name": "Team of 3", "ticket_class": "paid", "price": 22000, "qty": 15, "desc": "Bring your team — 3 seats at a discounted bundle price."},
            {"name": "Early Bird", "ticket_class": "early_bird", "price": 6000, "qty": 30, "desc": "Grab early access before 5 July 2025."},
        ],
        "speakers": [
            {"name": "James Kariuki", "title": "Head of Performance Marketing", "org": "Jumia Kenya", "bio": "Managed Google and Meta campaigns with combined budget of $12M+. Google-certified trainer.", "is_mc": False},
            {"name": "Linda Achieng", "title": "SEO & Content Strategist", "org": "Freelance / Speaker", "bio": "Grew three Kenyan brands from zero to 100K organic visitors per month using content-first SEO.", "is_mc": False},
            {"name": "Tom Odhiambo", "title": "Training Coordinator & Host", "org": "Strathmore Business School", "bio": "Facilitator with 10+ years running executive education programmes across East Africa.", "is_mc": True},
        ],
        "sponsors": [
            {"name": "Google Kenya", "tier": "gold", "website": "https://google.com"},
            {"name": "Meta for Developers", "tier": "silver", "website": "https://developers.facebook.com"},
            {"name": "Strathmore University", "tier": "partner", "website": "https://strathmore.edu"},
        ],
        "schedule": [
            {"title": "Welcome & Icebreaker", "start": "09:00", "end": "09:30", "desc": "Introductions and goal-setting exercise.", "type": "Workshop"},
            {"title": "Module 1: Paid Media Fundamentals", "start": "09:30", "end": "11:00", "desc": "Google Ads, Meta Ads and campaign architecture deep dive.", "type": "Workshop"},
            {"title": "Module 2: SEO in 2025", "start": "11:15", "end": "12:30", "desc": "Technical SEO, E-E-A-T and AI-powered content strategy.", "type": "Workshop"},
            {"title": "Lunch Break", "start": "12:30", "end": "13:15", "desc": "Catered lunch and informal networking.", "type": "Break"},
            {"title": "Module 3: Social & Influencer Strategy", "start": "13:15", "end": "14:45", "desc": "TikTok, Instagram, and micro-influencer ROI frameworks.", "type": "Workshop"},
            {"title": "Module 4: Analytics & Reporting", "start": "15:00", "end": "16:00", "desc": "GA4, dashboards and data-driven decisions.", "type": "Workshop"},
            {"title": "90-Day Roadmap Workshop + Q&A", "start": "16:00", "end": "17:00", "desc": "Build your personal marketing roadmap with trainer guidance.", "type": "Workshop"},
        ],
    },
]


def download_image(url: str, filename: str) -> ContentFile:
    """Download an image from URL and return as Django ContentFile."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            return ContentFile(resp.read(), name=filename)
    except Exception as exc:
        print(f"    [WARN] Could not download {url}: {exc}")
        return None


class Command(BaseCommand):
    help = "Delete all events and seed 5 rich sample events with all related data."

    def handle(self, *args, **options):
        from apps.events.models import Event, Category, Tag
        from apps.tickets.models import TicketType
        from apps.speakers.models import Speaker
        from apps.sponsors.models import Sponsor
        from apps.schedules.models import ScheduleItem
        from apps.accounts.models import User

        self.stdout.write(self.style.WARNING("Deleting all existing events…"))
        Event.objects.all().delete()
        self.stdout.write(self.style.SUCCESS("  Done.\n"))

        # Find or pick an organizer (prefer superuser)
        organizer = User.objects.filter(is_superuser=True).first() or User.objects.first()
        if not organizer:
            self.stderr.write("No users found. Please create a superuser first.")
            return

        for idx, ev in enumerate(EVENTS, 1):
            self.stdout.write(f"[{idx}/5] Creating: {ev['title']}")
            with transaction.atomic():
                cat = Category.objects.filter(name__icontains=ev["category"]).first()
                if not cat:
                    cat, _ = Category.objects.get_or_create(
                        name=ev["category"],
                        defaults={"slug": slugify(ev["category"]), "is_active": True},
                    )

                from django.utils.timezone import make_aware
                from datetime import datetime, date, time as dtime

                start_d = date.fromisoformat(ev["start_date"])
                end_d = date.fromisoformat(ev["end_date"])
                start_t = dtime.fromisoformat(ev["start_time"])
                end_t = dtime.fromisoformat(ev["end_time"])

                event = Event.objects.create(
                    organizer=organizer,
                    title=ev["title"],
                    description=ev["description"],
                    category=cat,
                    format=ev["format"],
                    event_type="public",
                    status="published",
                    start_date=start_d,
                    start_time=start_t,
                    end_date=end_d,
                    end_time=end_t,
                    timezone="Africa/Nairobi",
                    venue_name=ev.get("venue_name", ""),
                    venue_address=ev.get("address", ""),
                    city=ev.get("city", "Nairobi"),
                    country=ev.get("country", "Kenya"),
                    streaming_link=ev.get("streaming_link", ""),
                    theme_color=ev["theme_color"],
                    accent_color=ev["accent_color"],
                    refund_policy=ev.get("refund_policy", "no_refund"),
                    is_featured=ev.get("is_featured", False),
                    attendee_count=ev.get("attendee_count", 0),
                    published_at=timezone.now(),
                    stickers=[],
                )

                # Cover image
                self.stdout.write("  Downloading cover image…")
                img = download_image(ev["cover_url"], f"cover_{event.id}.jpg")
                if img:
                    event.cover_image.save(f"cover_{event.id}.jpg", img, save=True)

                # Tickets
                for t in ev["tickets"]:
                    TicketType.objects.create(
                        event=event,
                        name=t["name"],
                        ticket_class=t["ticket_class"],
                        price=t["price"],
                        quantity=t["qty"],
                        description=t.get("desc", ""),
                        currency="KES",
                        is_active=True,
                    )
                self.stdout.write(f"  ✓ {len(ev['tickets'])} ticket types")

                # Speakers / MC
                speaker_objs = {}
                for sp in ev["speakers"]:
                    s = Speaker.objects.create(
                        event=event,
                        name=sp["name"],
                        title=sp.get("title", ""),
                        organization=sp.get("org", ""),
                        bio=sp.get("bio", ""),
                        is_mc=sp.get("is_mc", False),
                    )
                    # Use Unsplash source for speaker avatar (portrait category)
                    seed = abs(hash(sp["name"])) % 1000
                    avatar_url = f"https://picsum.photos/seed/{seed}/300/300"
                    avatar = download_image(avatar_url, f"speaker_{s.id}.jpg")
                    if avatar:
                        s.avatar.save(f"speaker_{s.id}.jpg", avatar, save=True)
                    speaker_objs[sp["name"]] = s
                self.stdout.write(f"  ✓ {len(ev['speakers'])} speakers")

                # Schedule
                for i, item in enumerate(ev["schedule"]):
                    st = dtime.fromisoformat(item["start"])
                    et = dtime.fromisoformat(item["end"])
                    ScheduleItem.objects.create(
                        event=event,
                        title=item["title"],
                        description=item.get("desc", ""),
                        start_time=st,
                        end_time=et,
                        session_type=item.get("type", ""),
                        sort_order=i,
                        day=1,
                    )
                self.stdout.write(f"  ✓ {len(ev['schedule'])} schedule items")

                # Sponsors
                for sp in ev["sponsors"]:
                    sponsor = Sponsor.objects.create(
                        event=event,
                        name=sp["name"],
                        tier=sp["tier"],
                        website=sp.get("website", ""),
                    )
                    seed = abs(hash(sp["name"])) % 500
                    logo_url = f"https://picsum.photos/seed/logo{seed}/200/100"
                    logo = download_image(logo_url, f"sponsor_{sponsor.id}.jpg")
                    if logo:
                        sponsor.logo.save(f"sponsor_{sponsor.id}.jpg", logo, save=True)
                self.stdout.write(f"  ✓ {len(ev['sponsors'])} sponsors")

                self.stdout.write(self.style.SUCCESS(f"  ✅ {ev['title']} — slug: {event.slug}\n"))

        self.stdout.write(self.style.SUCCESS("🎉 All 5 events seeded successfully!"))
