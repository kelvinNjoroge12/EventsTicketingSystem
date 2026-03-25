import io
import os
import logging
import urllib.request
import urllib.error
from datetime import timedelta
from PIL import Image
from celery import shared_task
from django.apps import apps
from django.conf import settings
from django.core.cache import cache
from django.core.files.base import ContentFile
from django.db import transaction
from django.utils import timezone

logger = logging.getLogger(__name__)

_EVENT_CACHE_VERSION_KEY = "events:cache_version"


def _bump_event_cache_version():
    current = cache.get(_EVENT_CACHE_VERSION_KEY)
    if not isinstance(current, int) or current < 1:
        current = 1
    cache.set(_EVENT_CACHE_VERSION_KEY, current + 1, None)

@shared_task
def keep_alive_ping_task():
    """
    Periodically ping the health endpoint to keep the instance awake.
    """
    if not getattr(settings, "ENABLE_KEEP_ALIVE_PING", False):
        return

    url = getattr(settings, "KEEP_ALIVE_URL", "")
    if not url:
        return

    try:
        req = urllib.request.Request(url)
        urllib.request.urlopen(req, timeout=10)
    except urllib.error.URLError:
        # Best-effort only
        return

@shared_task
def optimize_image_task(app_label, model_name, instance_id, field_name, max_width=1200, quality=80):
    """
    Asynchronously compresses an image field to WEBP format.
    """
    try:
        Model = apps.get_model(app_label, model_name)
        instance = Model.objects.get(pk=instance_id)
        image_field = getattr(instance, field_name)
        
        if not image_field:
            return
            
        # Already optimized or not a local file we can easily process here 
        # (Though we can process anything PIL can open from the field's file stream)
        if image_field.name.lower().endswith('.webp'):
            return

        with image_field.open('rb') as f:
            img = Image.open(f)
            
            # Skip animated images
            if getattr(img, 'is_animated', False):
                return

            # Convert mode
            if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
                img = img.convert('RGBA')
            else:
                img = img.convert('RGB')
                
            # Resize
            if img.width > max_width:
                ratio = max_width / float(img.width)
                new_height = int(img.height * ratio)
                img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)
                
            # Compress to WEBP
            output_io = io.BytesIO()
            img.save(output_io, format='WEBP', quality=quality)
            output_io.seek(0)
            
            # Prepare new filename
            name_without_ext = os.path.splitext(os.path.basename(image_field.name))[0]
            new_name = f"{name_without_ext}.webp"
            
            # Save back to instance without triggering signals again (important!)
            # We use a transaction and update only the specific field.
            with transaction.atomic():
                # Refetch to avoid stale data
                latest_instance = Model.objects.get(pk=instance_id)
                # Check if it still matches or was changed mid-flight
                if getattr(latest_instance, field_name).name != image_field.name:
                    return
                
                # Save the new file content
                new_file = ContentFile(output_io.read(), name=new_name)
                getattr(latest_instance, field_name).save(new_name, new_file, save=False)
                latest_instance.save(update_fields=[field_name])
                
        logger.info(f"Optimized {app_label}.{model_name} (ID: {instance_id}) field '{field_name}' to WEBP.")
        
    except Exception as e:
        logger.error(f"Failed to optimize image in background for {app_label}.{model_name}.{field_name}: {e}")


@shared_task(name="common.tasks.sync_event_lifecycle_task")
def sync_event_lifecycle_task():
    from apps.events.models import Event
    from apps.orders.models import Ticket

    now = timezone.now()
    retention_hours = max(0, int(getattr(settings, "EXPIRED_TICKET_RETENTION_HOURS", 72)))
    retention_window = timedelta(hours=retention_hours)

    # 1. Mark events that have ended as "completed"
    completed_event_ids = []
    for event in Event.objects.filter(status="published").only(
        "id", "status", "start_date", "start_time",
        "end_date", "end_time", "timezone",
    ):
        if event.has_ended(now):
            completed_event_ids.append(event.id)

    if completed_event_ids:
        Event.objects.filter(id__in=completed_event_ids).update(status="completed")
        _bump_event_cache_version()

    # 2. Expire tickets — scope to completed events only (not ALL valid tickets)
    all_completed_ids = list(
        Event.objects.filter(status="completed").values_list("id", flat=True)
    )
    expired_count = 0
    if all_completed_ids:
        expired_count = Ticket.objects.filter(
            status="valid",
            event_id__in=all_completed_ids,
        ).update(status="expired")

    # 3. Purge long-expired tickets
    purge_count = 0
    if retention_window and all_completed_ids:
        cutoff = now - retention_window
        purge_qs = Ticket.objects.filter(
            status="expired",
            event__status="completed",
            event__end_date__lte=cutoff.date(),
        )
        purge_count = purge_qs.count()
        if purge_count:
            purge_qs.delete()

    return {
        "completed_events": len(completed_event_ids),
        "expired_tickets": expired_count,
        "purged_tickets": purge_count,
    }

