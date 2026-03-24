from celery import shared_task
from django.utils import timezone
from datetime import timedelta
import logging

from .models import Event

logger = logging.getLogger(__name__)

@shared_task
def cleanup_abandoned_drafts():
    """
    Deletes event drafts that have been untouched for over 30 days.
    This prevents the database and storage from bloating with abandoned creations.
    """
    threshold_date = timezone.now() - timedelta(days=30)
    
    # Find events that are still in "draft" status and haven't been updated in 30 days
    abandoned_drafts = Event.objects.filter(
        status="draft",
        updated_at__lt=threshold_date
    )
    
    count = abandoned_drafts.count()
    if count > 0:
        # Calling delete() on a QuerySet executes purely in SQL for speed,
        # but to trigger the new signals (to delete cover images attached to drafts),
        # we need to delete them individually (or let the DB cascade if the file storage
        # was somehow cleaned, but we implemented signals for it!)
        for draft in abandoned_drafts:
            draft.delete()
        logger.info(f"Successfully cleaned up {count} abandoned event drafts.")
    else:
        logger.info("No abandoned event drafts found to clean up.")
        
    return f"Deleted {count} drafts"
