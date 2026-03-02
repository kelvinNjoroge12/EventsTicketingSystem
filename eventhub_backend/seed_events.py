"""
seed_events.py  –  Run this from the eventhub_backend folder
in the same terminal that already has all env vars set:

    python seed_events.py

It will:
  1. Delete all existing events (cascades to tickets, speakers, etc.)
  2. Create 5 rich events with speakers, MC, sponsors, schedule & tickets
  3. Download cover + avatar + logo images from the internet
"""
import os
import sys
import django
import urllib.request

# ── Bootstrap Django ──────────────────────────────────────────────────────
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.base")
django.setup()

# ── Imports (after django.setup) ─────────────────────────────────────────
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
from apps.accounts.models import User


# ── Helpers ───────────────────────────────────────────────────────────────
def dl(url, name):
    """Download image → ContentFile, or None on failure."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=15) as r:
            return ContentFile(r.read(), name=name)
    except Exception as e:
        print(f"  [WARN] {name}: {e}")
        return None


def get_or_make_cat(name):
    cat, _ = Category.objects.get_or_create(
        name=name, defaults={"slug": slugify(name), "is_active": True}
    )
    return cat


# ── Event Data ────────────────────────────────────────────────────────────
EVENTS = [
    {
        "title": "Nairobi Tech Summit 2025",
        "description": (
            "East Africa's premier technology conference bringing together 2,000+ innovators, "
            "engineers, founders, and investors for two days of cutting-edge talks, hands-on "
            "workshops, and unparalleled networking.\n\n"
            "Deep dives into AI, cloud architecture, fintech, and the future of African tech. "
            "Meals and refreshments included."
        ),
        "category": "Tech",
        "format": "in_person",
        "theme_color": "#1E4DB7",
        "accent_color": "#06B6D4",
        "start_date": "2025-09-12", "start_time": "08:00",
        "end_date": "2025-09-13", "end_time": "18:00",
        "venue_name": "Kenyatta International Convention Centre",
        "address": "City Square", "city": "Nairobi", "country": "Kenya",
        "refund_policy": "7_days", "is_featured": True, "attendee_count": 1842,
        "cover_url": "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80",
        "tickets": [
            {"name": "Early Bird", "cls": "early_bird", "price": 3500, "qty": 200,
             "desc": "Limited early-access tickets – grab them before they're gone!"},
            {"name": "Standard", "cls": "paid", "price": 5500, "qty": 800,
             "desc": "Full 2-day access with meals."},
            {"name": "VIP", "cls": "vip", "price": 15000, "qty": 50,
             "desc": "Front-row seating, speaker dinner & exclusive networking lounge."},
        ],
        "speakers": [
            {"name": "Dr. Amina Osei", "title": "Chief AI Officer", "org": "Safaricom PLC",
             "bio": "Pioneer in ML for African languages. 15+ years at the intersection of NLP and mobile tech.",
             "mc": False, "img_seed": 237},
            {"name": "Marcus Ndungu", "title": "CTO", "org": "Cellulant",
             "bio": "Architect of Africa's largest payment infrastructure. Speaker at AWS re:Invent.",
             "mc": False, "img_seed": 342},
            {"name": "Priya Sharma", "title": "VP Engineering", "org": "Andela",
             "bio": "Led engineering teams across 5 continents. Passionate about distributed systems.",
             "mc": False, "img_seed": 488},
            {"name": "Victor Mutua", "title": "Host", "org": "TechCabal Live",
             "bio": "Award-winning tech journalist. Makes complex topics accessible and engaging.",
             "mc": True, "img_seed": 101},
        ],
        "sponsors": [
            {"name": "Safaricom", "tier": "platinum", "web": "https://safaricom.co.ke", "seed": 11},
            {"name": "Google Africa", "tier": "gold", "web": "https://google.com", "seed": 22},
            {"name": "Microsoft", "tier": "gold", "web": "https://microsoft.com", "seed": 33},
            {"name": "Equity Bank", "tier": "silver", "web": "https://equitybank.co.ke", "seed": 44},
            {"name": "Andela", "tier": "partner", "web": "https://andela.com", "seed": 55},
        ],
        "schedule": [
            {"title": "Registration & Breakfast", "start": "08:00", "end": "09:00",
             "desc": "Pick up your badge, enjoy breakfast and meet fellow attendees.", "type": "Break"},
            {"title": "Opening Keynote: Africa's AI Decade", "start": "09:00", "end": "10:00",
             "desc": "The state of AI on the continent and what comes next.", "type": "Keynote"},
            {"title": "Panel: Building for a Billion Users", "start": "10:15", "end": "11:15",
             "desc": "Lessons from scaling products across 54 African markets.", "type": "Panel"},
            {"title": "Workshop: LLMs in Production", "start": "11:30", "end": "13:00",
             "desc": "Hands-on lab deploying fine-tuned models on low-bandwidth devices.", "type": "Workshop"},
            {"title": "Lunch & Expo Floor", "start": "13:00", "end": "14:00",
             "desc": "Explore 30+ exhibitor booths over a hot Kenyan lunch.", "type": "Break"},
            {"title": "Fireside: Fundraising in 2025", "start": "14:00", "end": "15:00",
             "desc": "VCs and founders discuss the funding climate for African startups.", "type": "Fireside"},
            {"title": "Closing & Networking", "start": "17:00", "end": "18:00",
             "desc": "Award ceremony and open cocktail networking.", "type": "Ceremony"},
        ],
    },
    {
        "title": "Afro Beats & Culture Festival",
        "description": (
            "Three stages, 30 artists, one unforgettable night under the Nairobi sky. "
            "Afro Beats & Culture Festival spotlights Afrobeats, Amapiano, Bongo Flava and Afro-Soul.\n\n"
            "Beyond music: curated art installations, pan-African cuisine, fashion pop-ups and live body art."
        ),
        "category": "Music",
        "format": "in_person",
        "theme_color": "#7C3AED",
        "accent_color": "#F59E0B",
        "start_date": "2025-10-04", "start_time": "14:00",
        "end_date": "2025-10-04", "end_time": "23:59",
        "venue_name": "Uhuru Gardens", "address": "Langata Road",
        "city": "Nairobi", "country": "Kenya",
        "refund_policy": "48_hours", "is_featured": True, "attendee_count": 3500,
        "cover_url": "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200&q=80",
        "tickets": [
            {"name": "General Admission", "cls": "paid", "price": 1500, "qty": 2000,
             "desc": "Access to all three stages and festival grounds."},
            {"name": "VIP Lounge", "cls": "vip", "price": 6000, "qty": 150,
             "desc": "Raised platform, dedicated bar, personal food service & artist meet-and-greet."},
            {"name": "Kids Under 12", "cls": "free", "price": 0, "qty": 300,
             "desc": "Children under 12 enter free with a paying adult."},
        ],
        "speakers": [
            {"name": "DJ Afroking", "title": "Headline DJ & Producer", "org": "Independent",
             "bio": "4× African Music Award winner blending traditional rhythms with electronic production.",
             "mc": False, "img_seed": 512},
            {"name": "Amara Diallo", "title": "Singer-Songwriter", "org": "Diallo Music Group",
             "bio": "Senegalese-Kenyan vocalist whose debut album 'Ubuntu' hit #1 across 12 African countries.",
             "mc": False, "img_seed": 768},
            {"name": "Zara Mwangi", "title": "Festival Host & Comedian", "org": "Comedy Store Kenya",
             "bio": "Stand-up comedian and actress. Will keep the energy high all night long.",
             "mc": True, "img_seed": 199},
        ],
        "sponsors": [
            {"name": "Tusker Lager", "tier": "platinum", "web": "https://tusker.com", "seed": 66},
            {"name": "Airtel Kenya", "tier": "gold", "web": "https://airtel.co.ke", "seed": 77},
            {"name": "Sunlight Events", "tier": "silver", "web": "", "seed": 88},
        ],
        "schedule": [
            {"title": "Gates Open & Street Food Market", "start": "14:00", "end": "16:00",
             "desc": "Explore food stalls, art installations and fashion market.", "type": "Break"},
            {"title": "Afternoon Performances", "start": "16:00", "end": "18:30",
             "desc": "Emerging artists set the mood on secondary stages.", "type": "Performance"},
            {"title": "Main Stage: Amara Diallo", "start": "19:00", "end": "20:00",
             "desc": "Soulful Afro-Soul set with live band.", "type": "Performance"},
            {"title": "Headline Set: DJ Afroking", "start": "21:30", "end": "23:45",
             "desc": "Two-hour DJ set with full light and pyrotechnics show.", "type": "Performance"},
        ],
    },
    {
        "title": "Startup Pitch Night: East Africa",
        "description": (
            "12 pre-selected startups compete before top investors and 500 live audience members. "
            "Winners share KES 5 million in grants and investor introductions.\n\n"
            "Free to attend! Applications open for startups at any stage. Live-streamed on YouTube."
        ),
        "category": "Business",
        "format": "hybrid",
        "theme_color": "#059669",
        "accent_color": "#1E4DB7",
        "start_date": "2025-08-22", "start_time": "17:00",
        "end_date": "2025-08-22", "end_time": "21:00",
        "venue_name": "iHub Nairobi", "address": "Senteu Plaza, Milimani Road",
        "city": "Nairobi", "country": "Kenya",
        "streaming_link": "https://youtube.com/live/pitchnight2025",
        "refund_policy": "no_refund", "is_featured": False, "attendee_count": 480,
        "cover_url": "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200&q=80",
        "tickets": [
            {"name": "In-Person (Free)", "cls": "free", "price": 0, "qty": 400,
             "desc": "Free in-person seat at iHub. First come, first seated."},
            {"name": "Online Stream (Free)", "cls": "free", "price": 0, "qty": 2000,
             "desc": "Free live-stream access via YouTube."},
        ],
        "speakers": [
            {"name": "Wanjiku Kamau", "title": "Managing Partner", "org": "Savannah Fund",
             "bio": "Invested in 40+ African startups. Former engineer at Google Zurich.",
             "mc": False, "img_seed": 321},
            {"name": "Ben Okafor", "title": "Investment Director", "org": "GSMA Accelerator",
             "bio": "Specialist in mobile-first business models across sub-Saharan Africa.",
             "mc": False, "img_seed": 654},
            {"name": "Sarah Njoroge", "title": "MC & Ecosystem Builder", "org": "Nairobi Garage",
             "bio": "Co-founder of Nairobi Garage and passionate startup community builder.",
             "mc": True, "img_seed": 987},
        ],
        "sponsors": [
            {"name": "Savannah Fund", "tier": "gold", "web": "https://savannah.fund", "seed": 111},
            {"name": "GSMA Africa", "tier": "silver", "web": "https://gsma.com", "seed": 222},
            {"name": "iHub", "tier": "partner", "web": "https://ihub.co.ke", "seed": 333},
        ],
        "schedule": [
            {"title": "Doors Open & Networking", "start": "17:00", "end": "18:00",
             "desc": "Meet investors, mentors and fellow founders.", "type": "Break"},
            {"title": "Welcome & Ground Rules", "start": "18:00", "end": "18:15",
             "desc": "MC introduces format and judging criteria.", "type": "Keynote"},
            {"title": "Pitch Rounds 1–6", "start": "18:15", "end": "19:30",
             "desc": "Six startups pitch 5 min each + 3-min Q&A.", "type": "Panel"},
            {"title": "Break & Sponsor Demos", "start": "19:30", "end": "19:45",
             "desc": "Short break while judges deliberate.", "type": "Break"},
            {"title": "Pitch Rounds 7–12 & Winners", "start": "19:45", "end": "21:00",
             "desc": "Remaining pitches plus announcement of winners.", "type": "Panel"},
        ],
    },
    {
        "title": "Women in Leadership Summit",
        "description": (
            "A transformative one-day summit accelerating gender equity in boardrooms, government, "
            "and civil society across Africa. Theme: \"Bold Moves\".\n\n"
            "Keynotes, panel conversations, mentorship roundtables and a curated exhibition. "
            "Childcare facilities available on request."
        ),
        "category": "Business",
        "format": "in_person",
        "theme_color": "#DB2777",
        "accent_color": "#7C3AED",
        "start_date": "2025-11-08", "start_time": "08:30",
        "end_date": "2025-11-08", "end_time": "17:30",
        "venue_name": "Movenpick Hotel", "address": "Westlands, Parklands Road",
        "city": "Nairobi", "country": "Kenya",
        "refund_policy": "7_days", "is_featured": True, "attendee_count": 620,
        "cover_url": "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=1200&q=80",
        "tickets": [
            {"name": "Early Bird", "cls": "early_bird", "price": 4500, "qty": 100,
             "desc": "Discounted tickets available until 30 Oct 2025."},
            {"name": "Standard Delegate", "cls": "paid", "price": 6500, "qty": 400,
             "desc": "Full day access including meals and summit materials."},
            {"name": "Corporate Table (10 seats)", "cls": "vip", "price": 55000, "qty": 20,
             "desc": "Reserved table with premium branding for your team."},
        ],
        "speakers": [
            {"name": "Hon. Martha Karua", "title": "Senior Advocate & Former MP", "org": "Narc Kenya",
             "bio": "Veteran politician and constitutional lawyer who has shaped Kenyan legislation for 30 years.",
             "mc": False, "img_seed": 411},
            {"name": "Dr. Ngozi Okonkwo", "title": "CEO", "org": "AfriHealth Initiative",
             "bio": "Built a network of 200 clinics across rural Africa. TIME 100 Most Influential 2023.",
             "mc": False, "img_seed": 522},
            {"name": "Fatima Al-Hassan", "title": "Chief People Officer", "org": "Jumia Group",
             "bio": "Leading D&I strategy across 11 African markets.",
             "mc": False, "img_seed": 633},
            {"name": "Ciku Mwangi", "title": "Event Host", "org": "NTV Kenya",
             "bio": "Award-winning journalist known for sharp wit and inclusive facilitation.",
             "mc": True, "img_seed": 744},
        ],
        "sponsors": [
            {"name": "UN Women", "tier": "platinum", "web": "https://unwomen.org", "seed": 444},
            {"name": "Equity Bank", "tier": "gold", "web": "https://equitybank.co.ke", "seed": 555},
            {"name": "Safaricom Foundation", "tier": "silver", "web": "https://safaricom.co.ke", "seed": 666},
            {"name": "Movenpick Hotel", "tier": "partner", "web": "https://movenpick.com", "seed": 777},
        ],
        "schedule": [
            {"title": "Registration & Breakfast", "start": "08:30", "end": "09:15",
             "desc": "Networking breakfast and exhibition viewing.", "type": "Break"},
            {"title": "Opening Keynote: Bold Moves", "start": "09:15", "end": "10:00",
             "desc": "Lessons from thirty years of bold leadership.", "type": "Keynote"},
            {"title": "Panel: Breaking the Glass Ceiling", "start": "10:15", "end": "11:30",
             "desc": "C-suite women on barriers, biases and breakthroughs.", "type": "Panel"},
            {"title": "Mentorship Roundtables", "start": "11:45", "end": "13:00",
             "desc": "Small-group sessions with industry leaders.", "type": "Workshop"},
            {"title": "Lunch & Networking", "start": "13:00", "end": "14:00",
             "desc": "Catered lunch and curated networking circles.", "type": "Break"},
            {"title": "Fireside: Resilience & Scale", "start": "14:00", "end": "15:00",
             "desc": "Candid conversation on failure, pivot and impact.", "type": "Fireside"},
            {"title": "Closing & Action Planning", "start": "16:30", "end": "17:30",
             "desc": "Guided session to set personal Bold Moves goals.", "type": "Workshop"},
        ],
    },
    {
        "title": "Digital Marketing Masterclass",
        "description": (
            "Full-day intensive training for marketers, entrepreneurs and content creators. "
            "Master paid media, SEO, social strategy and analytics in 2025 — led by practitioners "
            "who have managed combined ad spends exceeding $50 million.\n\n"
            "Leave with a 90-day roadmap, private Slack community access and 6 months of Q&A support. "
            "Laptops required. Lunch and snacks provided."
        ),
        "category": "Marketing",
        "format": "in_person",
        "theme_color": "#EA580C",
        "accent_color": "#1E4DB7",
        "start_date": "2025-07-19", "start_time": "09:00",
        "end_date": "2025-07-19", "end_time": "17:00",
        "venue_name": "Strathmore Business School", "address": "Ole Sangale Road, Madaraka",
        "city": "Nairobi", "country": "Kenya",
        "refund_policy": "48_hours", "is_featured": False, "attendee_count": 120,
        "cover_url": "https://images.unsplash.com/photo-1432888622747-4eb9a8f5a07d?w=1200&q=80",
        "tickets": [
            {"name": "Standard", "cls": "paid", "price": 8500, "qty": 80,
             "desc": "Full day with materials, meals and community access."},
            {"name": "Team of 3", "cls": "paid", "price": 22000, "qty": 15,
             "desc": "Bring your team — 3 seats at a discounted bundle price."},
            {"name": "Early Bird", "cls": "early_bird", "price": 6000, "qty": 30,
             "desc": "Grab early access before 5 July 2025."},
        ],
        "speakers": [
            {"name": "James Kariuki", "title": "Head of Performance Marketing", "org": "Jumia Kenya",
             "bio": "Managed Google and Meta campaigns with combined budget of $12M+. Google-certified trainer.",
             "mc": False, "img_seed": 851},
            {"name": "Linda Achieng", "title": "SEO & Content Strategist", "org": "Freelance",
             "bio": "Grew three Kenyan brands from 0 to 100K organic visitors per month.",
             "mc": False, "img_seed": 962},
            {"name": "Tom Odhiambo", "title": "Training Coordinator", "org": "Strathmore Business School",
             "bio": "Facilitator with 10+ years running executive education across East Africa.",
             "mc": True, "img_seed": 173},
        ],
        "sponsors": [
            {"name": "Google Kenya", "tier": "gold", "web": "https://google.com", "seed": 888},
            {"name": "Meta for Developers", "tier": "silver", "web": "https://developers.facebook.com", "seed": 999},
            {"name": "Strathmore University", "tier": "partner", "web": "https://strathmore.edu", "seed": 123},
        ],
        "schedule": [
            {"title": "Welcome & Icebreaker", "start": "09:00", "end": "09:30",
             "desc": "Introductions and goal-setting exercise.", "type": "Workshop"},
            {"title": "Module 1: Paid Media Fundamentals", "start": "09:30", "end": "11:00",
             "desc": "Google Ads, Meta Ads and campaign architecture deep dive.", "type": "Workshop"},
            {"title": "Module 2: SEO in 2025", "start": "11:15", "end": "12:30",
             "desc": "Technical SEO, E-E-A-T and AI-powered content strategy.", "type": "Workshop"},
            {"title": "Lunch Break", "start": "12:30", "end": "13:15",
             "desc": "Catered lunch and informal networking.", "type": "Break"},
            {"title": "Module 3: Social & Influencer Strategy", "start": "13:15", "end": "14:45",
             "desc": "TikTok, Instagram and micro-influencer ROI frameworks.", "type": "Workshop"},
            {"title": "Module 4: Analytics & Reporting", "start": "15:00", "end": "16:00",
             "desc": "GA4, dashboards and data-driven decisions.", "type": "Workshop"},
            {"title": "90-Day Roadmap Workshop + Q&A", "start": "16:00", "end": "17:00",
             "desc": "Build your personal marketing roadmap with trainer guidance.", "type": "Workshop"},
        ],
    },
    {
        "title": "Gourmet Nairobi: A Fine Dining Experience",
        "description": "An exquisite 7-course tasting menu prepared by Nairobi's top chefs. Each course is paired with premium wines and live jazz music.",
        "category": "Creative",
        "format": "in_person",
        "theme_color": "#78350F", "accent_color": "#FCD34D",
        "start_date": "2025-12-20", "start_time": "19:00",
        "end_date": "2025-12-20", "end_time": "23:00",
        "venue_name": "The Lord Erroll", "address": "Ruaka Road", "city": "Nairobi", "country": "Kenya",
        "refund_policy": "no_refund", "is_featured": False, "attendee_count": 80,
        "cover_url": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=1200",
        "tickets": [{"name": "Single Seat", "cls": "paid", "price": 12000, "qty": 40, "desc": "Includes 7-course meal and wine pairing."}],
        "speakers": [{"name": "Chef Samuel Gichuru", "title": "Executive Chef", "img_seed": 551}],
        "sponsors": [{"name": "Moët & Chandon", "tier": "platinum", "seed": 91}],
        "schedule": [{"title": "Welcome Cocktails", "start": "19:00", "end": "19:45", "type": "Break"}],
    },
    {
        "title": "East Africa Football Derby: Gor Mahia vs AFC Leopards",
        "description": "The biggest rivalry in Kenyan football returns. Experience the passion and energy of the Mashemeji Derby live at Nyayo Stadium.",
        "category": "Creative",
        "format": "in_person",
        "theme_color": "#059669", "accent_color": "#DC2626",
        "start_date": "2025-06-15", "start_time": "15:00",
        "end_date": "2025-06-15", "end_time": "18:00",
        "venue_name": "Nyayo National Stadium", "address": "Aerodrome Road", "city": "Nairobi", "country": "Kenya",
        "refund_policy": "no_refund", "is_featured": True, "attendee_count": 30000,
        "cover_url": "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200",
        "tickets": [
            {"name": "Terraces", "cls": "paid", "price": 500, "qty": 25000},
            {"name": "VIP", "cls": "vip", "price": 2000, "qty": 5000}
        ],
        "speakers": [],
        "sponsors": [{"name": "SportPesa", "tier": "platinum", "seed": 92}],
        "schedule": [{"title": "Kickoff", "start": "15:00", "end": "17:00", "type": "Performance"}],
    },
    {
        "title": "Nairobi Chess Open 2025",
        "description": "A FIDE-rated open tournament for chess enthusiasts of all levels. Compete for a total prize pool of KES 1 million.",
        "category": "Creative",
        "format": "in_person",
        "theme_color": "#1F2937", "accent_color": "#6366F1",
        "start_date": "2025-08-10", "start_time": "09:00",
        "end_date": "2025-08-12", "end_time": "18:00",
        "venue_name": "The Sarit Centre", "address": "Parklands Road", "city": "Nairobi", "country": "Kenya",
        "refund_policy": "7_days", "is_featured": False, "attendee_count": 200,
        "cover_url": "https://images.unsplash.com/photo-1529692236671-f1f639860b57?w=1200",
        "tickets": [{"name": "Player Registration", "cls": "paid", "price": 1500, "qty": 200}],
        "speakers": [{"name": "Grandmaster Peter Svidler", "title": "Guest commentator", "img_seed": 553}],
        "sponsors": [{"name": "Safaricom", "tier": "gold", "seed": 93}],
        "schedule": [{"title": "Round 1", "start": "09:00", "end": "13:00", "type": "Workshop"}],
    },
    {
        "title": "Canvas & Cocktails: Modern African Art",
        "description": "An evening of creativity and social painting. No experience required – all materials provided along with top-shelf cocktails.",
        "category": "Creative",
        "format": "in_person",
        "theme_color": "#F43F5E", "accent_color": "#8B5CF6",
        "start_date": "2025-05-24", "start_time": "18:00",
        "end_date": "2025-05-24", "end_time": "21:00",
        "venue_name": "Village Market", "address": "Limuru Road", "city": "Nairobi", "country": "Kenya",
        "refund_policy": "no_refund", "is_featured": False, "attendee_count": 50,
        "cover_url": "https://images.unsplash.com/photo-1460661419201-fd4cecdc8a8b?w=1200",
        "tickets": [{"name": "Standard Entry", "cls": "paid", "price": 3500, "qty": 50}],
        "speakers": [{"name": "Joy Kendi", "title": "Artist & Influencer", "img_seed": 554}],
        "sponsors": [{"name": "Tanqueray", "tier": "gold", "seed": 94}],
        "schedule": [{"title": "Painting Session", "start": "18:30", "end": "20:30", "type": "Workshop"}],
    },
    {
        "title": "Wellness & Yoga Retreat: Karura Forest",
        "description": "Reconnect with nature through guided meditation, hatha yoga, and forest bathing in the heart of Nairobi's largest forest.",
        "category": "Health",
        "format": "in_person",
        "theme_color": "#10B981", "accent_color": "#60A5FA",
        "start_date": "2025-07-05", "start_time": "07:00",
        "end_date": "2025-07-05", "end_time": "11:00",
        "venue_name": "Karura Forest", "address": "Kiambu Road", "city": "Nairobi", "country": "Kenya",
        "refund_policy": "no_refund", "is_featured": False, "attendee_count": 100,
        "cover_url": "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1200",
        "tickets": [{"name": "Retreat Pass", "cls": "paid", "price": 2000, "qty": 100}],
        "speakers": [{"name": "Maya Rao", "title": "Yoga Instructor", "img_seed": 555}],
        "sponsors": [{"name": "Bio Food Products", "tier": "silver", "seed": 95}],
        "schedule": [{"title": "Sunrise Yoga", "start": "07:30", "end": "08:30", "type": "Workshop"}],
    }
]

EVENTS_EXTENDED = []
for i in range(2):
    for ev in EVENTS:
        new_ev = ev.copy()
        if i > 0:
            new_ev["title"] = f"{new_ev['title']} (Upcoming Edition)"
            new_ev["start_date"] = "2026-05-15"
            new_ev["end_date"] = "2026-05-16"
        EVENTS_EXTENDED.append(new_ev)

EVENTS = EVENTS_EXTENDED

# ── Main ──────────────────────────────────────────────────────────────────
print("=" * 60)
print("EventHub Seed Script")
print("=" * 60)

# Get or create users
organizer = User.objects.filter(email="admin@eventhub.test").first()
if not organizer:
    print("Creating admin user admin@eventhub.test...")
    organizer = User.objects.create_superuser(
        first_name="Admin",
        last_name="User",
        email="admin@eventhub.test",
        password="password123",
        is_active=True,
    )
    # For some models
    if hasattr(organizer, 'is_verified'):
        organizer.is_verified = True
        organizer.save()

kelvin = User.objects.filter(email="kelvin@eventhub.test").first()
if not kelvin:
    print("Creating regular user kelvin@eventhub.test...")
    kelvin = User.objects.create_user(
        first_name="Kelvin",
        last_name="Njoroge",
        email="kelvin@eventhub.test",
        password="password123",
        is_active=True,
    )
    if hasattr(kelvin, 'is_verified'):
        kelvin.is_verified = True
        kelvin.save()

print(f"Using organizer: {organizer.email}\n")

# Delete all events
print("🗑  Deleting existing events…")
count, _ = Event.objects.all().delete()
print(f"   Deleted {count} records.\n")

for idx, ev in enumerate(EVENTS, 1):
    print(f"[{idx}/{len(EVENTS)}] {ev['title']}")
    cat = get_or_make_cat(ev["category"])

    event = Event.objects.create(
        organizer=organizer,
        title=ev["title"],
        description=ev["description"],
        category=cat,
        format=ev["format"],
        event_type="public",
        status="published",
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
        theme_color=ev["theme_color"],
        accent_color=ev["accent_color"],
        refund_policy=ev.get("refund_policy", "no_refund"),
        is_featured=ev.get("is_featured", False),
        attendee_count=ev.get("attendee_count", 0),
        published_at=timezone.now(),
        stickers=[],
    )

    # Cover image
    print("  📸  Downloading cover image…", end=" ", flush=True)
    img = dl(ev["cover_url"], f"cover_{event.id}.jpg")
    if img:
        event.cover_image.save(f"cover_{event.id}.jpg", img, save=True)
        print("✓")
    else:
        print("skipped")

    # Tickets
    for t in ev["tickets"]:
        TicketType.objects.create(
            event=event, name=t["name"], ticket_class=t["cls"],
            price=t["price"], quantity=t["qty"],
            description=t.get("desc", ""), currency="KES", is_active=True,
        )
    print(f"  🎟  {len(ev['tickets'])} ticket types created")

    # Speakers / MC
    for sp in ev["speakers"]:
        s = Speaker.objects.create(
            event=event, name=sp["name"], title=sp.get("title", ""),
            organization=sp.get("org", ""), bio=sp.get("bio", ""),
            is_mc=sp.get("mc", False),
        )
        avatar_url = f"https://picsum.photos/seed/{sp['img_seed']}/300/300"
        avatar = dl(avatar_url, f"spk_{s.id}.jpg")
        if avatar:
            s.avatar.save(f"spk_{s.id}.jpg", avatar, save=True)
    print(f"  🎤  {len(ev['speakers'])} speakers created")

    # Schedule
    for i, item in enumerate(ev["schedule"]):
        ScheduleItem.objects.create(
            event=event, title=item["title"],
            description=item.get("desc", ""),
            start_time=dtime.fromisoformat(item["start"]),
            end_time=dtime.fromisoformat(item["end"]),
            session_type=item.get("type", ""),
            sort_order=i, day=1,
        )
    print(f"  📅  {len(ev['schedule'])} schedule items created")

    # Sponsors
    for sp in ev["sponsors"]:
        sponsor = Sponsor.objects.create(
            event=event, name=sp["name"], tier=sp["tier"],
            website=sp.get("web", ""),
        )
        logo_url = f"https://picsum.photos/seed/logo{sp['seed']}/200/100"
        logo = dl(logo_url, f"logo_{sponsor.id}.jpg")
        if logo:
            sponsor.logo.save(f"logo_{sponsor.id}.jpg", logo, save=True)
    print(f"  🏢  {len(ev['sponsors'])} sponsors created")

    print(f"  ✅  Done → slug: {event.slug}\n")

print(f"🎉  All {len(EVENTS)} events seeded successfully!")
