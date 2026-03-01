import os
import sys
import django
from django.core.files import File

# Bootstrap Django
sys.path.append(r"c:\Users\lmbua\Downloads\EventFrontend\eventhub_backend")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from apps.events.models import Event

BASE_MEDIA = r"c:\Users\lmbua\Downloads\EventFrontend\eventhub_backend\media\event_covers"

MAPPING = {
    "Nairobi Tech Summit 2025": "tech_summit.png",
    "Afro Beats & Culture Festival": "afrobeats.png",
    "Startup Pitch Night: East Africa": "startup.png",
    "Women in Leadership Summit": "women.png",
    "Digital Marketing Masterclass": "marketing.png",
    "Gourmet Nairobi: A Fine Dining Experience": "dining.png",
    "East Africa Football Derby: Gor Mahia vs AFC Leopards": "football.png",
    "Nairobi Chess Open 2025": "chess.png",
    "Canvas & Cocktails: Modern African Art": "art.png",
    "Wellness & Yoga Retreat: Karura Forest": "yoga.png",
}

def update():
    for title, filename in MAPPING.items():
        event = Event.objects.filter(title=title).first()
        if event:
            filepath = os.path.join(BASE_MEDIA, filename)
            if os.path.exists(filepath):
                with open(filepath, 'rb') as f:
                    event.cover_image.save(filename, File(f), save=True)
                print(f"✅ Updated image for: {title}")
            else:
                print(f"❌ File not found: {filepath}")
        else:
            print(f"❓ Event not found: {title}")

if __name__ == "__main__":
    update()
