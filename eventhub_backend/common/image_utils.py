import io
import os
import logging
from PIL import Image
from django.core.files.uploadedfile import InMemoryUploadedFile, TemporaryUploadedFile
from django.db.models.signals import pre_save
from django.dispatch import receiver
from django.apps import apps
from django.db.models import ImageField

logger = logging.getLogger(__name__)

def compress_image_field(instance, field_name, max_width=1200, quality=80):
    image_field = getattr(instance, field_name)
    if not image_field:
        return

    # Skip files that aren't fresh uploads.
    # We only want to compress newly uploaded InMemoryUploadedFile or TemporaryUploadedFile files
    if not isinstance(image_field.file, (InMemoryUploadedFile, TemporaryUploadedFile)):
        return
        
    try:
        image_field.file.seek(0)
        img = Image.open(image_field.file)
        
        # Convert retaining transparency if any
        if getattr(img, 'is_animated', False):
            # Do not compress animated GIFs into static WEBPs abruptly, or choose to strip frames.
            # We skip animated images for safety.
            return

        if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
            img = img.convert('RGBA')
        else:
            img = img.convert('RGB')
            
        # Scale down if it exceeds max_width
        if img.width > max_width:
            ratio = max_width / float(img.width)
            new_height = int(img.height * ratio)
            img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)
            
        output_io = io.BytesIO()
        img.save(output_io, format='WEBP', quality=quality)
        output_io.seek(0)
        
        name_without_ext = os.path.splitext(image_field.name)[0]
        new_name = f"{name_without_ext}.webp"
        
        new_file = InMemoryUploadedFile(
            file=output_io,
            field_name='ImageField',
            name=new_name,
            content_type='image/webp',
            size=output_io.getbuffer().nbytes,
            charset=None
        )
        
        # Override the field with the new compressed file
        setattr(instance, field_name, new_file)
    except Exception as e:
        logger.warning(f"Failed to optimize image on {instance.__class__.__name__}.{field_name}: {e}")

@receiver(pre_save)
def auto_compress_images(sender, instance, **kwargs):
    # Only hook into our own app models to avoid third-party libraries
    if not sender._meta.app_label.startswith('apps.'):
        return

    # Find all ImageFields on the model and compress those that are newly uploaded
    for field in sender._meta.fields:
        if isinstance(field, ImageField):
            compress_image_field(instance, field.name)
