from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from .models import Order

@shared_task
def cancel_stale_orders():
    """
    Finds pending/processing orders that are older than 15 minutes 
    and cancels them to release tickets.
    """
    stale_threshold = timezone.now() - timedelta(minutes=15)
    stale_orders = Order.objects.filter(
        status__in=["pending", "payment_processing"],
        created_at__lt=stale_threshold
    )
    
    count = 0
    for order in stale_orders:
        if order.cancel_order(reason="System: Order expired after 15 minutes"):
            count += 1
            
    return f"Cancelled {count} stale orders."
