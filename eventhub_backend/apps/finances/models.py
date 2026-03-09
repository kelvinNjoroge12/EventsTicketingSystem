from django.db import models
from common.models import TimeStampedModel
from apps.events.models import Event

class Expense(TimeStampedModel):
    CATEGORY_CHOICES = [
        ('speakers', 'Speakers'),
        ('mc', 'MC / Host'),
        ('venue', 'Venue / Tent'),
        ('equipment', 'Equipment Hire'),
        ('transport', 'Transport / Logistics'),
        ('marketing', 'Marketing'),
        ('catering', 'Catering'),
        ('other', 'Other'),
    ]

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='expenses')
    description = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='other')
    date = models.DateField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.description} - {self.amount} ({self.event.title})"


class Revenue(TimeStampedModel):
    SOURCE_CHOICES = [
        ("ticket_sales", "Ticket Sales"),
        ("sponsorship", "Sponsorship"),
        ("vendor", "Vendor Booth"),
        ("donation", "Donation"),
        ("other", "Other"),
    ]

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="revenues")
    description = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default="other")
    date = models.DateField(auto_now_add=True)

    class Meta:
        ordering = ["-date", "-created_at"]

    def __str__(self):
        return f"{self.description} +{self.amount} ({self.event.title})"
