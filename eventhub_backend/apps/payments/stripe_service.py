from __future__ import annotations

import stripe
from django.conf import settings

from .models import Payment
from apps.orders.models import Order


class StripeService:
    def __init__(self) -> None:
        stripe.api_key = settings.STRIPE_SECRET_KEY

    def create_payment_intent(self, order: Order) -> str:
        amount = int(order.total * 100)
        intent = stripe.PaymentIntent.create(
            amount=amount,
            currency=order.currency.lower(),
            metadata={
                "order_number": order.order_number,
                "event_id": str(order.event_id or ""),
                "attendee_id": str(order.attendee_id or ""),
            },
        )
        payment, _ = Payment.objects.get_or_create(
            order=order,
            defaults={
                "method": "stripe",
                "amount": order.total,
                "currency": order.currency,
                "status": "processing",
            },
        )
        payment.stripe_payment_intent_id = intent.id
        payment.status = "processing"
        payment.save(update_fields=["stripe_payment_intent_id", "status"])
        return intent.client_secret

