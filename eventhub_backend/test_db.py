import os, django
print("Importing os, django...")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.base")

print("Running django.setup()...")
django.setup()

print("Importing User model...")
from apps.accounts.models import User

print("Getting count...")
try:
    print('Count:', User.objects.count())
except Exception as e:
    print('Error:', e)
