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
        ("chargeback", "Chargeback"),
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


class PaymentWebhookEvent(TimeStampedModel):
    PROVIDER_CHOICES = [
        ("stripe", "Stripe"),
        ("mpesa", "M-Pesa"),
    ]

    PROCESSING_STATUS_CHOICES = [
        ("received", "Received"),
        ("processed", "Processed"),
        ("failed", "Failed"),
    ]

    provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES)
    provider_event_id = models.CharField(max_length=255)
    event_type = models.CharField(max_length=120, blank=True)
    payment = models.ForeignKey(
        "payments.Payment",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="webhook_events",
    )
    payload = models.JSONField(default=dict)
    processing_status = models.CharField(
        max_length=20,
        choices=PROCESSING_STATUS_CHOICES,
        default="received",
    )
    processing_error = models.TextField(blank=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["provider", "provider_event_id"],
                name="payments_unique_provider_event",
            ),
        ]
        indexes = [
            models.Index(fields=["provider", "created_at"]),
            models.Index(fields=["event_type"]),
            models.Index(fields=["processing_status"]),
        ]


class ChargebackCase(TimeStampedModel):
    STATUS_CHOICES = [
        ("warning_needs_response", "Warning Needs Response"),
        ("warning_under_review", "Warning Under Review"),
        ("warning_closed", "Warning Closed"),
        ("needs_response", "Needs Response"),
        ("under_review", "Under Review"),
        ("won", "Won"),
        ("lost", "Lost"),
    ]

    payment = models.ForeignKey("payments.Payment", on_delete=models.CASCADE, related_name="chargebacks")
    provider = models.CharField(max_length=20, default="stripe")
    provider_case_id = models.CharField(max_length=255, unique=True)
    status = models.CharField(max_length=40, choices=STATUS_CHOICES, default="needs_response")
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0"))
    currency = models.CharField(max_length=3, default="KES")
    reason = models.CharField(max_length=120, blank=True)
    due_by = models.DateTimeField(null=True, blank=True)
    evidence_details_due_by = models.DateTimeField(null=True, blank=True)
    opened_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    raw_payload = models.JSONField(default=dict)

    class Meta:
        indexes = [
            models.Index(fields=["provider", "provider_case_id"]),
            models.Index(fields=["status"]),
            models.Index(fields=["created_at"]),
        ]

