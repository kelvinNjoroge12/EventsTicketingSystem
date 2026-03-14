from __future__ import annotations

from django.contrib import admin
from .models import Category, Tag, Event

@admin.action(description="Approve selected events (Mark as Published)")
def approve_events(modeladmin, request, queryset):
    queryset.update(status="published")

@admin.action(description="Unapprove selected events (Mark as Pending)")
def unapprove_events(modeladmin, request, queryset):
    queryset.update(status="pending")

@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ("title", "organizer", "category", "status", "format", "start_date", "published_at")
    list_filter = ("status", "format", "event_type", "is_featured", "category")
    search_fields = ("title", "organizer__email", "organizer__first_name", "organizer__last_name", "venue_name", "city")
    actions = [approve_events, unapprove_events]
    readonly_fields = ("slug", "attendee_count", "view_count", "published_at")
    date_hierarchy = 'start_date'
    
    fieldsets = (
        ("Basic Info", {
            "fields": ("organizer", "title", "slug", "description", "category", "tags", "cover_image")
        }),
        ("Status & Type", {
            "fields": ("status", "format", "event_type", "is_featured", "published_at", "scheduled_publish_at")
        }),
        ("Dates & Times", {
            "fields": ("start_date", "start_time", "end_date", "end_time", "timezone")
        }),
        ("Location", {
            "fields": ("venue_name", "venue_address", "city", "country", "latitude", "longitude", "streaming_link")
        }),
        ("Metrics & Policy", {
            "fields": ("capacity", "attendee_count", "view_count", "refund_policy", "custom_refund_policy")
        }),
        ("Styling", {
            "fields": ("theme_color", "accent_color", "gallery_images", "stickers")
        }),
        ("Waitlist & Reminders", {
            "fields": ("enable_waitlist", "send_reminders", "reminders_sent")
        })
    )

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_active", "sort_order")
    list_editable = ("is_active", "sort_order")
    search_fields = ("name",)
    prepopulated_fields = {"slug": ("name",)}

@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ("name", "slug")
    search_fields = ("name",)
    prepopulated_fields = {"slug": ("name",)}
