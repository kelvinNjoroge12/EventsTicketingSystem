import os
from django.db.models.signals import post_delete, pre_save
from django.dispatch import receiver
from django.db import models

def _delete_file(file_field):
    """Safely deletes the file associated with a FileField/ImageField."""
    if file_field and hasattr(file_field, 'name') and file_field.name:
        try:
            # If using local storage
            if hasattr(file_field, 'path') and os.path.isfile(file_field.path):
                os.remove(file_field.path)
            # General fallback to storage backend
            elif hasattr(file_field, 'storage'):
                file_field.storage.delete(file_field.name)
        except Exception:
            pass

def _get_file_fields(instance):
    return [
        f for f in instance._meta.fields 
        if hasattr(f, "upload_to") or type(f).__name__ in ('FileField', 'ImageField')
    ]

@receiver(post_delete)
def delete_files_on_model_delete(sender, instance, **kwargs):
    """Deletes old files attached to the model instance when it gets deleted."""
    # We only care about models that have file fields
    fields = _get_file_fields(instance)
    if not fields:
        return

    for field in fields:
        _delete_file(getattr(instance, field.name, None))

@receiver(pre_save)
def delete_files_on_model_update(sender, instance, **kwargs):
    """Deletes old files when they are overwritten."""
    if not instance.pk:
        return
        
    fields = _get_file_fields(instance)
    if not fields:
        return

    try:
        old_instance = sender.objects.get(pk=instance.pk)
    except sender.DoesNotExist:
        return

    for field in fields:
        old_file = getattr(old_instance, field.name, None)
        new_file = getattr(instance, field.name, None)
        if old_file and old_file != new_file:
            _delete_file(old_file)
