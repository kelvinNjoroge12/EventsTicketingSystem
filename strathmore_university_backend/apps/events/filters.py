from __future__ import annotations

import django_filters
from django.contrib.postgres.search import SearchVector
from django.db.models import Exists, OuterRef, Q

from apps.tickets.models import TicketType
from .models import Event


class EventFilter(django_filters.FilterSet):
    category = django_filters.CharFilter(field_name="category__slug", lookup_expr="iexact")
    format = django_filters.CharFilter(field_name="format", lookup_expr="iexact")
    event_type = django_filters.CharFilter(field_name="event_type", lookup_expr="iexact")
    status = django_filters.CharFilter(field_name="status", lookup_expr="iexact")
    city = django_filters.CharFilter(field_name="city", lookup_expr="icontains")
    country = django_filters.CharFilter(field_name="country", lookup_expr="iexact")
    is_featured = django_filters.BooleanFilter(field_name="is_featured")
    start_date__gte = django_filters.DateFilter(field_name="start_date", lookup_expr="gte")
    start_date__lte = django_filters.DateFilter(field_name="start_date", lookup_expr="lte")
    price_type = django_filters.CharFilter(method="filter_price_type")
    search = django_filters.CharFilter(method="filter_search")
    ordering = django_filters.OrderingFilter(
        fields=(
            ("start_date", "start_date"),
            ("attendee_count", "attendee_count"),
            ("view_count", "view_count"),
            ("published_at", "published_at"),
        )
    )

    class Meta:
        model = Event
        fields = []

    def filter_price_type(self, queryset, name, value):
        value = (value or "").lower()
        ticket_qs = TicketType.objects.filter(event=OuterRef("pk"), is_active=True)
        if value == "free":
            return queryset.annotate(
                has_paid=Exists(ticket_qs.filter(price__gt=0)), has_any=Exists(ticket_qs)
            ).filter(has_any=True, has_paid=False)
        if value == "paid":
            return queryset.annotate(has_paid=Exists(ticket_qs.filter(price__gt=0))).filter(has_paid=True)
        return queryset

    def filter_search(self, queryset, name, value):
        if not value:
            return queryset
        vector = SearchVector("title", "description", "venue_name", "city")
        return queryset.annotate(search=vector).filter(
            Q(search=value) | Q(title__icontains=value) | Q(description__icontains=value)
        )

