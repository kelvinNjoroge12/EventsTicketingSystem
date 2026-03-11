from __future__ import annotations

from django.core.cache import cache
from django.db import models
from django.db.models import Exists, OuterRef, Prefetch, Q, Subquery
from django.shortcuts import get_object_or_404
from django_ratelimit.decorators import ratelimit
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page

from apps.accounts.permissions import IsOrganizer, IsOrganizerRole
from apps.schedules.models import ScheduleItem
from apps.speakers.models import Speaker
from apps.sponsors.models import Sponsor
from apps.tickets.models import PromoCode, TicketType
from .filters import EventFilter
from .models import Category, Event
from .serializers import CategorySerializer, EventCreateSerializer, EventDetailSerializer, EventListSerializer, EventStatusSerializer


def _with_list_optimizations(queryset):
    active_tickets = TicketType.objects.filter(event=OuterRef("pk"), is_active=True)
    lowest_price = Subquery(
        active_tickets.order_by("price").values("price")[:1],
        output_field=models.DecimalField(max_digits=10, decimal_places=2),
    )
    return queryset.select_related(
        "category", "organizer", "organizer__organizer_profile"
    ).annotate(
        lowest_ticket_price_annotated=lowest_price,
        has_active_tickets_annotated=Exists(active_tickets),
        has_paid_tickets_annotated=Exists(active_tickets.filter(price__gt=0)),
    )


def _with_detail_optimizations(queryset):
    return queryset.select_related(
        "category", "organizer", "organizer__organizer_profile"
    ).prefetch_related(
        "tags",
        Prefetch(
            "ticket_types",
            queryset=TicketType.objects.filter(is_active=True).order_by("sort_order", "price"),
            to_attr="prefetched_ticket_types_active",
        ),
        Prefetch(
            "promo_codes",
            queryset=PromoCode.objects.filter(is_active=True),
            to_attr="prefetched_promo_codes_active",
        ),
        Prefetch(
            "speakers",
            queryset=Speaker.objects.order_by("sort_order", "name"),
            to_attr="prefetched_speakers_ordered",
        ),
        Prefetch(
            "schedule_items",
            queryset=ScheduleItem.objects.select_related("speaker").order_by("day", "sort_order", "start_time"),
            to_attr="prefetched_schedule_items",
        ),
        Prefetch(
            "event_sponsors",
            queryset=Sponsor.objects.order_by("tier", "sort_order", "name"),
            to_attr="prefetched_sponsors",
        ),
    )


_CACHE_VERSION_KEY = "events:cache_version"


def _get_cache_version() -> int:
    version = cache.get(_CACHE_VERSION_KEY)
    if not isinstance(version, int) or version < 1:
        version = 1
        cache.set(_CACHE_VERSION_KEY, version, None)
    return version


def _bump_cache_version() -> int:
    try:
        return cache.incr(_CACHE_VERSION_KEY)
    except Exception:
        version = _get_cache_version() + 1
        cache.set(_CACHE_VERSION_KEY, version, None)
        return version


class EventListView(generics.ListAPIView):
    serializer_class = EventListSerializer
    permission_classes = [permissions.AllowAny]
    filterset_class = EventFilter

    def get_queryset(self):
        return _with_list_optimizations(Event.objects.filter(status="published"))

    def list(self, request, *args, **kwargs):
        version = _get_cache_version()
        cache_key = f"events:list:v{version}:{request.get_full_path()}"
        cached = cache.get(cache_key)
        if cached:
            response = Response(cached)
            response["Cache-Control"] = "public, max-age=300"
            return response
        response = super().list(request, *args, **kwargs)
        cache.set(cache_key, response.data, 300)  # 5 minutes
        response["Cache-Control"] = "public, max-age=300"
        return response


class EventDetailView(generics.RetrieveAPIView):
    serializer_class = EventDetailSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"

    def get_queryset(self):
        """Allow organizers to view their own draft/pending events."""
        user = self.request.user
        status_filter = Q(status__in=["published", "completed"])
        if user.is_authenticated:
            status_filter |= Q(organizer=user, status__in=["draft", "pending"])
        return _with_detail_optimizations(Event.objects.filter(status_filter).distinct())

    def retrieve(self, request, *args, **kwargs):
        slug = kwargs.get(self.lookup_field)
        is_anon = not request.user.is_authenticated

        # Only serve cached responses to anonymous users.
        # Authenticated users bypass cache so draft/pending events
        # owned by the organizer are never leaked into the public cache.
        cache_key = f"events:detail:v2:{slug}"
        if is_anon:
            cached = cache.get(cache_key)
            if cached:
                response = Response(cached)
                response["Cache-Control"] = "public, max-age=600"
                return response

        event = self.get_object()
        serializer = self.get_serializer(event)
        response = Response(serializer.data)
        if event.status in ("published", "completed"):
            # Only populate cache from public (published/completed) events
            if is_anon:
                cache.set(cache_key, response.data, 600)  # 10 minutes
            response["Cache-Control"] = "public, max-age=600"
        else:
            response["Cache-Control"] = "no-store, no-cache, private"
        return response

    def delete(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            raise PermissionDenied("Authentication required.")

        if request.user.is_staff or request.user.role == "admin":
            qs = Event.objects.all()
        else:
            if request.user.role != "organizer":
                raise PermissionDenied("Only organizers can delete events.")
            qs = Event.objects.filter(organizer=request.user)

        event = get_object_or_404(qs, slug=kwargs.get(self.lookup_field))
        event.status = "cancelled"
        event.save(update_fields=["status"])
        _bump_cache_version()
        cache.delete(f"events:detail:v2:{event.slug}")
        return Response(status=status.HTTP_204_NO_CONTENT)


class EventCreateView(generics.CreateAPIView):
    serializer_class = EventCreateSerializer
    permission_classes = [permissions.IsAuthenticated, IsOrganizerRole]

    def perform_create(self, serializer):
        serializer.save()
        _bump_cache_version()


class EventUpdateView(generics.RetrieveUpdateAPIView):
    serializer_class = EventCreateSerializer
    permission_classes = [permissions.IsAuthenticated, IsOrganizerRole]
    lookup_field = "slug"

    def get_queryset(self):
        return Event.objects.filter(organizer=self.request.user)

    def perform_update(self, serializer):
        serializer.save()
        _bump_cache_version()
        # Use serializer.instance.slug — avoids a redundant SELECT after save()
        cache.delete(f"events:detail:v2:{serializer.instance.slug}")


class EventDeleteView(generics.DestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsOrganizerRole]
    lookup_field = "slug"

    def get_queryset(self):
        return Event.objects.filter(organizer=self.request.user)

    def perform_destroy(self, instance):
        instance.status = "cancelled"
        instance.save(update_fields=["status"])
        _bump_cache_version()
        cache.delete(f"events:detail:v2:{instance.slug}")


class EventPublishView(generics.UpdateAPIView):
    serializer_class = EventStatusSerializer
    permission_classes = [permissions.IsAuthenticated, IsOrganizer]
    lookup_field = "slug"

    def get_queryset(self):
        return Event.objects.filter(organizer=self.request.user, status__in=["draft", "pending"])

    def update(self, request, *args, **kwargs):
        event = self.get_object()
        event.status = "published"
        event.save(update_fields=["status"])
        _bump_cache_version()
        cache.delete(f"events:detail:v2:{event.slug}")
        serializer = EventDetailSerializer(event, context=self.get_serializer_context())
        return Response(serializer.data)


class OrganizerEventListView(generics.ListAPIView):
    serializer_class = EventListSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        organizer_id = self.kwargs["id"]
        return _with_list_optimizations(
            Event.objects.filter(organizer_id=organizer_id, status="published")
        )


class MyEventsListView(generics.ListAPIView):
    """Returns all events owned by the current authenticated organizer."""
    serializer_class = EventListSerializer
    permission_classes = [permissions.IsAuthenticated, IsOrganizerRole]

    def get_queryset(self):
        return _with_list_optimizations(
            Event.objects.filter(organizer=self.request.user).order_by("-created_at")
        )


class FeaturedEventsView(generics.ListAPIView):
    serializer_class = EventListSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return _with_list_optimizations(
            Event.objects.filter(status="published", is_featured=True)
        )

    def list(self, request, *args, **kwargs):
        version = _get_cache_version()
        cache_key = f"events:featured:v{version}"
        cached = cache.get(cache_key)
        if cached:
            response = Response(cached)
            response["Cache-Control"] = "public, max-age=900"
            return response
        response = super().list(request, *args, **kwargs)
        cache.set(cache_key, response.data, 900)  # 15 minutes
        response["Cache-Control"] = "public, max-age=900"
        return response


class CategoryListView(generics.ListAPIView):
    queryset = Category.objects.filter(is_active=True).order_by("sort_order", "name")
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
@ratelimit(key="ip", rate="30/m", block=False)
def related_events(request, slug: str):
    """
    Simple related events endpoint based on category.
    Used by EventDetailPage to show "related" events instead of static data.
    """
    # Use same logic as EventDetailView to find the base event
    user = request.user
    if user.is_authenticated and user.role == "admin":
        qs_base = Event.objects.all()
    elif user.is_authenticated:
        qs_base = Event.objects.filter(Q(status__in=["published", "completed"]) | Q(organizer=user))
    else:
        qs_base = Event.objects.filter(status__in=["published", "completed"])
    
    event = get_object_or_404(qs_base.distinct(), slug=slug)
    
    version = _get_cache_version()
    cache_key = f"events:related:v{version}:{slug}"
    cached = cache.get(cache_key)
    if cached:
        return Response(cached)
        
    qs = (
        Event.objects.filter(category=event.category, status="published")
        .select_related("category", "organizer", "organizer__organizer_profile")
        .prefetch_related("ticket_types")
        .exclude(id=event.id)
        .order_by("-attendee_count")[:4]
    )
    serializer = EventListSerializer(qs, many=True, context={"request": request})
    cache.set(cache_key, serializer.data, 900)  # 15 minutes
    return Response(serializer.data)
