import logging
from django.conf import settings
from django.db.models import ImageField
from django.db.models.signals import post_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)

@receiver(post_save)
def trigger_image_compression(sender, instance, created, **kwargs):
    """
    Hook to trigger background image compression after a model is saved.
    This replaces synchronous pre_save compression to avoid blocking requests.
    """
    if not getattr(settings, "ENABLE_IMAGE_OPTIMIZATION", True):
        return
    # Only hook into our own app models to avoid third-party libraries
    if not sender._meta.app_label.startswith('apps.'):
        return

    # Importing here to avoid circular imports
    from common.tasks import optimize_image_task

    # Find all ImageFields on the model
    for field in sender._meta.fields:
        if isinstance(field, ImageField):
            image_field = getattr(instance, field.name)
            if not image_field or not image_field.name:
                continue
            
            # If it's already a .webp file, skip as it's either optimized or doesn't need it.
            # This serves as a simple idempotency check to avoid infinite loops if the task updates the same field.
            if image_field.name.lower().endswith('.webp'):
                continue
            
            # Enqueue the background task
            optimize_image_task.delay(
                sender._meta.app_label,
                sender._meta.model_name,
                str(instance.pk),
                field.name
            )
