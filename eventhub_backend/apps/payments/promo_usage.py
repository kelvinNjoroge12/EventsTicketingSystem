from __future__ import annotations

from django.db.models import F

from apps.orders.models import Order
from apps.tickets.models import PromoCode


def consume_promo_code_usage(order: Order) -> bool:
    """
    Increments promo usage exactly once when an order is confirmed.
    Returns True if a promo row was updated.
    """
    if not getattr(order, "promo_code_id", None):
        return False
    updated = PromoCode.objects.filter(id=order.promo_code_id).update(
        times_used=F("times_used") + 1
    )
    return bool(updated)


def release_promo_code_usage(order: Order) -> bool:
    """
    Decrements promo usage on full reversals (refund/chargeback).
    Returns True if a promo row was updated.
    """
    if not getattr(order, "promo_code_id", None):
        return False
    updated = PromoCode.objects.filter(
        id=order.promo_code_id,
        times_used__gt=0,
    ).update(times_used=F("times_used") - 1)
    return bool(updated)
