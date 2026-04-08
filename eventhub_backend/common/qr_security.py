"""
Secure QR token generation with HMAC-based verification.
Prevents screenshot sharing by adding a time-based component (issue #9).
"""
from __future__ import annotations

import hashlib
import hmac
import time

from django.conf import settings


def _get_qr_secret() -> str:
    """Use Django SECRET_KEY as the HMAC signing key."""
    return settings.SECRET_KEY


def generate_secure_qr_payload(qr_code_data: str) -> str:
    """
    Generate a QR payload that includes a time-bucketed HMAC.
    Format: {uuid}:{timestamp_bucket}:{hmac_hex[:16]}

    The HMAC rotates every 30 seconds, making screenshots from
    a different time window invalid.
    """
    bucket = int(time.time()) // 30
    message = f"{qr_code_data}:{bucket}"
    sig = hmac.new(
        _get_qr_secret().encode(),
        message.encode(),
        hashlib.sha256,
    ).hexdigest()[:16]
    return f"{qr_code_data}:{bucket}:{sig}"


def verify_secure_qr_payload(payload: str, tolerance: int = 2) -> str | None:
    """
    Verify a secure QR payload and extract the UUID.
    Allows +-tolerance time buckets (default +-60 seconds).

    Returns the UUID string if valid, None if invalid/expired.
    """
    raw = (payload or "").strip()
    if not raw:
        return None

    parts = raw.split(":")
    strict_validation = bool(getattr(settings, "QR_STRICT_VALIDATION", True))
    if len(parts) != 3:
        # Non-strict mode allows temporary backwards compatibility for legacy UUID payloads.
        return raw if not strict_validation else None

    uuid_str, bucket_raw, sig = parts
    try:
        bucket = int(bucket_raw)
    except (ValueError, TypeError):
        return raw if not strict_validation else None

    current_bucket = int(time.time()) // 30
    for offset in range(-tolerance, tolerance + 1):
        test_bucket = current_bucket + offset
        message = f"{uuid_str}:{test_bucket}"
        expected = hmac.new(
            _get_qr_secret().encode(),
            message.encode(),
            hashlib.sha256,
        ).hexdigest()[:16]
        if hmac.compare_digest(expected, sig) and test_bucket == bucket:
            return uuid_str

    return None
