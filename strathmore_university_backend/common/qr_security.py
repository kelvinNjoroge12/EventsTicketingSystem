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
    bucket = int(time.time()) // 30  # 30-second windows
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
    Allows ±tolerance time buckets (default ±60 seconds).
    
    Returns the UUID string if valid, None if invalid/expired.
    """
    parts = payload.strip().split(":")
    
    # If it's a plain UUID (legacy), accept it directly
    if len(parts) <= 1:
        return payload.strip()
    
    # Handle standard UUID format (5 hyphen-separated parts)
    # A UUID like "550e8400-e29b-41d4-a716-446655440000" has 5 parts when split by ":"
    # But our format is "uuid:bucket:sig", so check if last part looks like a hex sig
    if len(parts) < 3:
        return payload.strip()  # Plain UUID, accept
    
    # Try to parse as secure format: {uuid}:{bucket}:{sig}
    sig = parts[-1]
    try:
        bucket = int(parts[-2])
    except (ValueError, IndexError):
        # Not our format — treat as plain UUID
        return payload.strip()
    
    uuid_str = ":".join(parts[:-2])
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
    
    return None  # Invalid or expired
