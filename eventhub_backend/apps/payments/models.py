from __future__ import annotations

from decimal import Decimal

from django.db import models

from common.models import TimeStampedModel


class Payment(TimeStampedModel):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("processing", "Processing"),
        ("succeeded", "Succeeded"),
        ("failed", "Failed"),
        ("refunded", "Refunded"),
        ("partially_refunded", "Partially Refunded"),
    ]

    order = models.OneToOneField("orders.Order", on_delete=models.CASCADE, related_name="payment")
    method = models.CharField(max_length=20, choices=[("stripe", "Stripe"), ("mpesa", "M-Pesa")])
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default="pending")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default="KES")

    stripe_payment_intent_id = models.CharField(max_length=255, blank=True, db_index=True)
    stripe_payment_method_id = models.CharField(max_length=255, blank=True)

    mpesa_checkout_request_id = models.CharField(max_length=255, blank=True, db_index=True)
    mpesa_merchant_request_id = models.CharField(max_length=255, blank=True)
    mpesa_transaction_id = models.CharField(max_length=100, blank=True, db_index=True)
    mpesa_phone_number = models.CharField(max_length=20, blank=True)

    raw_response = models.JSONField(default=dict)
    failure_reason = models.TextField(blank=True)
    refund_id = models.CharField(max_length=255, blank=True)
    refunded_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0"))
    refunded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["order"]),
            models.Index(fields=["status"]),
        ]


