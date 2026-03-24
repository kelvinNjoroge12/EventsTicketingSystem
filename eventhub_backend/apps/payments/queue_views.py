"""
Virtual Queue for high-demand ticket sales.
Assigns users a queue position before they can access checkout,
preventing server overload during flash sales.
"""
from __future__ import annotations

import hashlib
import logging
import time
import uuid

from django.core.cache import cache
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.events.models import Event

logger = logging.getLogger(__name__)

# ── Cache key patterns ──────────────────────────────────────────
# Queue counter:    "queue:{event_id}:counter"       -> int (next position)
# User position:    "queue:{event_id}:user:{token}"   -> int (user's position)
# Serving window:   "queue:{event_id}:serving"        -> int (max position currently allowed to buy)
# Queue enabled:    "queue:{event_id}:enabled"         -> bool
# Queue settings:   stored on Event model or cache

QUEUE_TTL = 3600  # 1 hour max queue lifetime
QUEUE_BATCH_SIZE = 50  # How many users to let through at a time
QUEUE_BATCH_INTERVAL = 30  # Seconds between letting batches through


def _queue_key(event_id, suffix: str) -> str:
    return f"queue:{event_id}:{suffix}"


def _user_token(request) -> str:
    """
    Generate a stable token for the user in this queue session.
    Authenticated users get their user ID. Anonymous users get a fingerprint.
    """
    if request.user and request.user.is_authenticated:
        return f"u:{request.user.id}"
    # For anonymous: hash IP + user agent for consistency
    ip = request.META.get("REMOTE_ADDR", "")
    ua = request.META.get("HTTP_USER_AGENT", "")
    fingerprint = hashlib.sha256(f"{ip}:{ua}".encode()).hexdigest()[:16]
    return f"a:{fingerprint}"


class QueueStatusView(APIView):
    """
    GET /api/events/{slug}/queue/status/
    
    Returns queue state for the user:
    - If queue is disabled: { "queue_active": false }
    - If user is in queue: { "queue_active": true, "position": N, "estimated_wait": M, "can_purchase": false }
    - If user can purchase: { "queue_active": true, "position": N, "can_purchase": true, "purchase_token": "..." }
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        event = get_object_or_404(Event, slug=slug)
        
        enabled = cache.get(_queue_key(event.id, "enabled"))
        if not enabled:
            return Response({
                "queue_active": False,
                "can_purchase": True,
                "message": "No queue — tickets available for purchase.",
            })

        token = _user_token(request)
        user_pos_key = _queue_key(event.id, f"user:{token}")
        position = cache.get(user_pos_key)
        
        serving = cache.get(_queue_key(event.id, "serving")) or 0
        total_in_queue = cache.get(_queue_key(event.id, "counter")) or 0

        if position is None:
            # User hasn't joined queue yet
            return Response({
                "queue_active": True,
                "in_queue": False,
                "can_purchase": False,
                "total_ahead": max(0, total_in_queue - serving),
                "message": "You need to join the queue before purchasing.",
            })

        can_purchase = position <= serving
        ahead = max(0, position - serving)
        estimated_wait = int(ahead / QUEUE_BATCH_SIZE) * QUEUE_BATCH_INTERVAL if ahead > 0 else 0

        response_data = {
            "queue_active": True,
            "in_queue": True,
            "position": position,
            "total_in_queue": total_in_queue,
            "ahead_of_you": ahead,
            "can_purchase": can_purchase,
            "estimated_wait_seconds": estimated_wait,
        }

        if can_purchase:
            # Issue a time-limited purchase token
            purchase_token = _issue_purchase_token(event.id, token)
            response_data["purchase_token"] = purchase_token
            response_data["message"] = "It's your turn! You have 10 minutes to complete your purchase."
        else:
            response_data["message"] = f"You're #{position} in the queue. {ahead} people ahead of you."

        return Response(response_data)


class QueueJoinView(APIView):
    """
    POST /api/events/{slug}/queue/join/
    
    Adds the user to the virtual queue. Returns their position.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, slug):
        event = get_object_or_404(Event, slug=slug)
        
        enabled = cache.get(_queue_key(event.id, "enabled"))
        if not enabled:
            return Response({
                "queue_active": False,
                "can_purchase": True,
                "message": "No queue — proceed to purchase directly.",
            })

        token = _user_token(request)
        user_pos_key = _queue_key(event.id, f"user:{token}")
        
        # Check if already in queue
        existing = cache.get(user_pos_key)
        if existing is not None:
            serving = cache.get(_queue_key(event.id, "serving")) or 0
            can_purchase = existing <= serving
            return Response({
                "queue_active": True,
                "in_queue": True,
                "position": existing,
                "can_purchase": can_purchase,
                "message": f"Already in queue at position #{existing}.",
            })

        # Atomically increment the counter
        counter_key = _queue_key(event.id, "counter")
        try:
            position = cache.incr(counter_key)
        except ValueError:
            # Counter doesn't exist yet, initialize
            cache.set(counter_key, 1, QUEUE_TTL)
            position = 1

        # Store user's position
        cache.set(user_pos_key, position, QUEUE_TTL)

        serving = cache.get(_queue_key(event.id, "serving")) or 0
        can_purchase = position <= serving
        ahead = max(0, position - serving)

        return Response({
            "queue_active": True,
            "in_queue": True,
            "position": position,
            "ahead_of_you": ahead,
            "can_purchase": can_purchase,
            "message": f"You're #{position} in the queue." if not can_purchase else "It's your turn!",
        }, status=status.HTTP_201_CREATED)


class QueueAdminView(APIView):
    """
    POST /api/events/{slug}/queue/admin/
    
    Organizer controls for the queue:
    - Enable/disable queue
    - Advance the serving window (let more people through)
    - Set batch size
    
    Body: { "action": "enable" | "disable" | "advance" | "reset", "batch_size": 50 }
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, slug):
        event = get_object_or_404(Event, slug=slug)
        
        # Authorization
        user = request.user
        if not (user.is_staff or user.role == "admin" or event.organizer_id == user.id):
            return Response(
                {"detail": "Only the event organizer or admin can manage the queue."},
                status=status.HTTP_403_FORBIDDEN,
            )

        action = (request.data.get("action") or "").strip().lower()
        batch_size = request.data.get("batch_size", QUEUE_BATCH_SIZE)

        if action == "enable":
            cache.set(_queue_key(event.id, "enabled"), True, QUEUE_TTL)
            cache.set(_queue_key(event.id, "serving"), 0, QUEUE_TTL)
            cache.set(_queue_key(event.id, "counter"), 0, QUEUE_TTL)
            return Response({
                "success": True,
                "message": "Queue enabled. No one is being served yet.",
            })

        elif action == "disable":
            cache.delete(_queue_key(event.id, "enabled"))
            return Response({
                "success": True,
                "message": "Queue disabled. All users can purchase directly.",
            })

        elif action == "advance":
            # Let the next batch through
            serving_key = _queue_key(event.id, "serving")
            current_serving = cache.get(serving_key) or 0
            total = cache.get(_queue_key(event.id, "counter")) or 0
            
            try:
                batch_size = int(batch_size)
            except (ValueError, TypeError):
                batch_size = QUEUE_BATCH_SIZE

            new_serving = min(current_serving + batch_size, total)
            cache.set(serving_key, new_serving, QUEUE_TTL)
            
            return Response({
                "success": True,
                "now_serving_up_to": new_serving,
                "total_in_queue": total,
                "message": f"Now serving up to position #{new_serving} of {total}.",
            })

        elif action == "reset":
            for suffix in ("enabled", "serving", "counter"):
                cache.delete(_queue_key(event.id, suffix))
            return Response({
                "success": True,
                "message": "Queue reset completely.",
            })

        return Response(
            {"detail": f"Unknown action: {action}"},
            status=status.HTTP_400_BAD_REQUEST,
        )


def _issue_purchase_token(event_id, user_token: str) -> str:
    """
    Issue a time-limited token allowing the user to proceed to checkout.
    Valid for 10 minutes.
    """
    from django.core.signing import TimestampSigner
    signer = TimestampSigner(salt="eventhub.queue.purchase")
    token_data = f"{event_id}:{user_token}"
    return signer.sign(token_data)


def verify_purchase_token(event_id, token: str, max_age: int = 600) -> bool:
    """
    Verify a queue purchase token (10-minute expiry by default).
    """
    from django.core.signing import TimestampSigner, BadSignature, SignatureExpired
    signer = TimestampSigner(salt="eventhub.queue.purchase")
    try:
        data = signer.unsign(token, max_age=max_age)
    except (BadSignature, SignatureExpired):
        return False
    
    expected_prefix = f"{event_id}:"
    return data.startswith(expected_prefix)
