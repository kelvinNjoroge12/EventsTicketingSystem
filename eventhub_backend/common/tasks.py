import io
import os
import logging
from PIL import Image
from celery import shared_task
from django.apps import apps
from django.core.files.base import ContentFile
from django.db import transaction

logger = logging.getLogger(__name__)

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
