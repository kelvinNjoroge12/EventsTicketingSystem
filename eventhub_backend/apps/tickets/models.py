from __future__ import annotations

from django.db import models
from django.utils import timezone

from common.models import TimeStampedModel
from apps.events.models import Event


class RegistrationCategory(TimeStampedModel):
    CATEGORY_CHOICES = (
        ("student", "Student"),
        ("alumni", "Alumni"),
        ("guest", "Guest"),
    )

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="registration_categories")
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    label = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)

    # Fixed field toggles
    require_student_email = models.BooleanField(default=False)
    require_admission_number = models.BooleanField(default=False)
    ask_graduation_year = models.BooleanField(default=False)
    ask_course = models.BooleanField(default=False)
    ask_school = models.BooleanField(default=False)
    ask_location = models.BooleanField(default=False)

    class Meta:
        unique_together = ("event", "category")
        ordering = ["sort_order", "category"]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.get_category_display()} ({self.event.title})"


class RegistrationQuestion(TimeStampedModel):
    FIELD_TYPE_CHOICES = (
        ("text", "Text"),
        ("number", "Number"),
        ("dropdown", "Dropdown"),
        ("email", "Email"),
        ("phone", "Phone"),
        ("date", "Date"),
    )

    category = models.ForeignKey(RegistrationCategory, on_delete=models.CASCADE, related_name="questions")
    label = models.CharField(max_length=255)
    field_type = models.CharField(max_length=20, choices=FIELD_TYPE_CHOICES)
    is_required = models.BooleanField(default=False)
    options = models.JSONField(default=list, blank=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "created_at"]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.label} ({self.category.get_category_display()})"


class School(TimeStampedModel):
    name = models.CharField(max_length=200, unique=True)
    code = models.CharField(max_length=50, blank=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "name"]

    def __str__(self) -> str:  # pragma: no cover
        return self.name


class Course(TimeStampedModel):
    school = models.ForeignKey(School, on_delete=models.SET_NULL, null=True, blank=True, related_name="courses")
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=50, blank=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ("school", "name")
        ordering = ["sort_order", "name"]

    def __str__(self) -> str:  # pragma: no cover
        return self.name


class TicketType(TimeStampedModel):
    TICKET_CLASS_CHOICES = (
        ("free", "Free"),
        ("paid", "Paid"),
        ("vip", "VIP"),
        ("early_bird", "Early Bird"),
        ("donation", "Donation"),
    )

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="ticket_types")
    registration_category = models.ForeignKey(
        RegistrationCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ticket_types",
    )
    name = models.CharField(max_length=100)
    ticket_class = models.CharField(max_length=20, choices=TICKET_CLASS_CHOICES)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default="KES")
    quantity = models.PositiveIntegerField()
    quantity_sold = models.PositiveIntegerField(default=0)
    quantity_reserved = models.PositiveIntegerField(default=0)
    description = models.TextField(blank=True)
    sale_start = models.DateTimeField(null=True, blank=True)
    sale_end = models.DateTimeField(null=True, blank=True)
    min_per_order = models.PositiveIntegerField(default=1)
    max_per_order = models.PositiveIntegerField(default=10)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "price"]

    @property
    def quantity_available(self) -> int:
        return self.quantity - self.quantity_sold - self.quantity_reserved

    @property
    def is_sold_out(self) -> bool:
        return self.quantity_available <= 0

    @property
    def is_almost_sold_out(self) -> bool:
        return 0 < self.quantity_available <= int(self.quantity * 0.1)

    @property
    def is_on_sale(self) -> bool:
        now = timezone.now()
        if self.sale_start and now < self.sale_start:
            return False
        if self.sale_end and now > self.sale_end:
            return False
        return True

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.name} ({self.event.title})"


class PromoCode(TimeStampedModel):
    DISCOUNT_TYPE_CHOICES = (
        ("percent", "Percent"),
        ("fixed", "Fixed Amount"),
    )

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="promo_codes")
    code = models.CharField(max_length=50)
    discount_type = models.CharField(max_length=10, choices=DISCOUNT_TYPE_CHOICES)
    discount_value = models.DecimalField(max_digits=10, decimal_places=2)
    expiry = models.DateTimeField(null=True, blank=True)
    usage_limit = models.PositiveIntegerField(null=True, blank=True)
    times_used = models.PositiveIntegerField(default=0)
    applicable_ticket_types = models.ManyToManyField(TicketType, blank=True)
    is_active = models.BooleanField(default=True)
    minimum_order_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    class Meta:
        unique_together = ["event", "code"]

    def is_valid(self):
        if not self.is_active:
            return False, "Promo code is inactive"
        if self.expiry and timezone.now() > self.expiry:
            return False, "Promo code has expired"
        if self.usage_limit and self.times_used >= self.usage_limit:
            return False, "Promo code usage limit reached"
        return True, "Valid"

    def calculate_discount(self, subtotal):
        if self.discount_type == "percent":
            return min((self.discount_value / 100) * subtotal, subtotal)
        return min(self.discount_value, subtotal)

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.code} ({self.event.title})"
