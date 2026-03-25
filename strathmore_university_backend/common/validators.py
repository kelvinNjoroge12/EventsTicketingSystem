from __future__ import annotations

import imghdr
import os

from django.conf import settings
from rest_framework import serializers


def validate_upload_image(file_obj) -> None:
    """
    Server-side file checks. Never trust client-provided content-type.
    - size <= 10MB
    - extension/content type in whitelist
    """
    max_bytes = getattr(settings, "FILE_UPLOAD_MAX_SIZE_BYTES", 10 * 1024 * 1024)
    allowed_exts = set(getattr(settings, "FILE_UPLOAD_ALLOWED_EXTENSIONS", ("jpg", "jpeg", "png", "webp", "gif")))

    if hasattr(file_obj, "size") and file_obj.size and file_obj.size > max_bytes:
        raise serializers.ValidationError(f"File too large. Max size is {max_bytes // (1024 * 1024)}MB.")

    name = getattr(file_obj, "name", "")
    ext = os.path.splitext(name)[1].lstrip(".").lower()
    if ext and ext not in allowed_exts:
        raise serializers.ValidationError("Unsupported file type.")

    # Try to read a small header for signature checking
    try:
        pos = file_obj.tell()
        header = file_obj.read(512)
        file_obj.seek(pos)
    except Exception:
        header = b""

    kind = imghdr.what(None, h=header) if header else None
    if kind == "jpeg":
        kind = "jpg"
    if kind and kind not in allowed_exts:
        raise serializers.ValidationError("Unsupported file content.")

