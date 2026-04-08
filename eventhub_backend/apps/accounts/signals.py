from __future__ import annotations

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

from .models import OrganizerProfile, User


@receiver(post_save, sender=User)
def create_organizer_profile(sender, instance: User, created: bool, **kwargs):
    if not created:
        return
    if instance.role == "organizer":
        OrganizerProfile.objects.get_or_create(user=instance, defaults={"organization_name": instance.get_full_name()})

def _update_organizer_stats(organizer):
    from apps.events.models import Event
    from apps.orders.models import Ticket
    
    if not organizer:
        return

    events = Event.objects.filter(organizer=organizer)
    total_e = events.count()
    total_a = Ticket.objects.filter(event__in=events).count()
    
    try:
        profile = OrganizerProfile.objects.get(user=organizer)
        profile.total_events = total_e
        profile.total_attendees = total_a
        profile.save(update_fields=['total_events', 'total_attendees'])
    except OrganizerProfile.DoesNotExist:
        pass

@receiver(post_save, sender='events.Event')
@receiver(post_delete, sender='events.Event')
def update_event_counts(sender, instance, **kwargs):
    _update_organizer_stats(getattr(instance, 'organizer', None))

@receiver(post_save, sender='orders.Ticket')
@receiver(post_delete, sender='orders.Ticket')
def update_attendee_counts(sender, instance, **kwargs):
    event = getattr(instance, 'event', None)
    if event:
        _update_organizer_stats(getattr(event, 'organizer', None))

