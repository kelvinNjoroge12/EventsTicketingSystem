from __future__ import annotations

from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import OrganizerProfile, User


@receiver(post_save, sender=User)
def create_organizer_profile(sender, instance: User, created: bool, **kwargs):
    if not created:
        return
    if instance.role == "organizer":
        OrganizerProfile.objects.get_or_create(user=instance, defaults={"organization_name": instance.get_full_name()})

