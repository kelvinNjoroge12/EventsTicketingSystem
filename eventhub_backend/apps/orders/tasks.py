from celery import shared_task
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from .models import Order


@shared_task
def cancel_stale_orders():
    """
    Finds pending/processing orders older than ORDER_RESERVATION_TTL_MINUTES
    and cancels them to release reserved tickets back to inventory.
    """
    ttl_minutes = getattr(settings, "ORDER_RESERVATION_TTL_MINUTES", 15)
    stale_threshold = timezone.now() - timedelta(minutes=ttl_minutes)
    stale_orders = Order.objects.filter(
        status__in=["pending", "payment_processing"],
        created_at__lt=stale_threshold,
    )

    count = 0
    for order in stale_orders:
        if order.cancel_order(reason=f"System: Order expired after {ttl_minutes} minutes"):
            count += 1

    return f"Cancelled {count} stale orders."
