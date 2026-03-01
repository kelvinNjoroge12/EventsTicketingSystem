from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone

from common.models import TimeStampedModel


class Order(TimeStampedModel):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("payment_processing", "Payment Processing"),
        ("confirmed", "Confirmed"),
        ("cancelled", "Cancelled"),
        ("refunded", "Refunded"),
        ("partially_refunded", "Partially Refunded"),
    ]

    order_number = models.CharField(max_length=20, unique=True)
    attendee = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="orders"
    )
    event = models.ForeignKey("events.Event", on_delete=models.SET_NULL, null=True)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default="pending")

    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    service_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default="KES")

    promo_code = models.ForeignKey("tickets.PromoCode", null=True, blank=True, on_delete=models.SET_NULL)
    promo_code_discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    attendee_first_name = models.CharField(max_length=150)
    attendee_last_name = models.CharField(max_length=150)
    attendee_email = models.EmailField()
    attendee_phone = models.CharField(max_length=20, blank=True)

    payment_method = models.CharField(
        max_length=20,
        choices=[("stripe", "Stripe"), ("mpesa", "M-Pesa"), ("free", "Free")],
    )
    notes = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    refund_reason = models.TextField(blank=True)
    refunded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["attendee", "status"]),
            models.Index(fields=["event", "status"]),
            models.Index(fields=["order_number"]),
        ]
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self.order_number:
            self.order_number = self.generate_order_number()
        super().save(*args, **kwargs)

    @staticmethod
    def generate_order_number() -> str:
        prefix = "EH"
        timestamp = timezone.now().strftime("%y%m%d")
        random_part = str(uuid.uuid4())[:6].upper()
        return f"{prefix}{timestamp}{random_part}"


class OrderItem(TimeStampedModel):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    ticket_type = models.ForeignKey("tickets.TicketType", on_delete=models.SET_NULL, null=True)
    ticket_type_name = models.CharField(max_length=100)
    ticket_class = models.CharField(max_length=20)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField()
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)


class Ticket(TimeStampedModel):
    STATUS_CHOICES = [
        ("valid", "Valid"),
        ("used", "Used"),
        ("cancelled", "Cancelled"),
        ("refunded", "Refunded"),
    ]

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="tickets")
    order_item = models.ForeignKey(OrderItem, on_delete=models.CASCADE, related_name="tickets")
    event = models.ForeignKey("events.Event", on_delete=models.SET_NULL, null=True)
    ticket_type = models.ForeignKey("tickets.TicketType", on_delete=models.SET_NULL, null=True)
    attendee_name = models.CharField(max_length=300)
    attendee_email = models.EmailField()
    qr_code = models.ImageField(upload_to="qr_codes/", null=True, blank=True)
    qr_code_data = models.UUIDField(default=uuid.uuid4, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="valid")
    checked_in_at = models.DateTimeField(null=True, blank=True)
    checked_in_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="checkins_performed",
    )

    class Meta:
        indexes = [
            models.Index(fields=["qr_code_data"]),
            models.Index(fields=["event", "status"]),
        ]

