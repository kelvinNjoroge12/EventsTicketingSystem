from __future__ import annotations

from django.core.cache import cache
from django.db import models
from django.db.models import F, Q
from django.shortcuts import get_object_or_404
from django_ratelimit.decorators import ratelimit
from rest_framework import generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page

from apps.accounts.permissions import IsOrganizer, IsOrganizerRole
from .filters import EventFilter
from .models import Category, Event
from .serializers import CategorySerializer, EventCreateSerializer, EventDetailSerializer, EventListSerializer, EventStatusSerializer


class EventListView(generics.ListAPIView):
    queryset = Event.objects.filter(status="published").select_related(
        "category", "organizer", "organizer__organizer_profile"
    ).prefetch_related("ticket_types")
    serializer_class = EventListSerializer
    permission_classes = [permissions.AllowAny]
    filterset_class = EventFilter

    def list(self, request, *args, **kwargs):
        cache_key = f"events:list:{request.get_full_path()}"
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
        qs = Event.objects.select_related(
            "category", "organizer", "organizer__organizer_profile"
        ).prefetch_related(
            "tags",
            "ticket_types",
            "promo_codes",
            "speakers",
            "schedule_items__speaker",
            "event_sponsors"
        )
        qs_pub = qs.filter(status__in=["published", "completed"])
        user = self.request.user
        if user.is_authenticated:
            qs_pub = qs_pub | qs.filter(
                organizer=user,
                status__in=["draft", "pending"],
            )
        return qs_pub.distinct()

    def retrieve(self, request, *args, **kwargs):
        slug = kwargs.get(self.lookup_field)
        event = self.get_object()
        # Only use cache for public events, not draft/pending owner views
        if event.status in ("published", "completed"):
            cache_key = f"events:detail:{slug}"
            cached = cache.get(cache_key)
            if cached:
                response = Response(cached)
                response["Cache-Control"] = "public, max-age=600"
                return response
            response = super().retrieve(request, *args, **kwargs)
            cache.set(cache_key, response.data, 600)  # 10 minutes
            response["Cache-Control"] = "public, max-age=600"
            return response
        # Draft/pending events — no cache, no view count
        serializer = self.get_serializer(event)
        response = Response(serializer.data)
        response["Cache-Control"] = "no-store, no-cache, private"
        return response


class EventCreateView(generics.CreateAPIView):
    serializer_class = EventCreateSerializer
    permission_classes = [permissions.IsAuthenticated, IsOrganizerRole]

    def perform_create(self, serializer):
        serializer.save()
        # Default redis backend doesn't support delete_pattern. 
        # For a full production fix, either use django-redis or keys-based explicit invalidation.
        cache.clear()


class EventUpdateView(generics.RetrieveUpdateAPIView):
    serializer_class = EventCreateSerializer
    permission_classes = [permissions.IsAuthenticated, IsOrganizerRole]
    lookup_field = "slug"

    def get_queryset(self):
        return Event.objects.filter(organizer=self.request.user)

    def perform_update(self, serializer):
        serializer.save()
        cache.clear()
        cache.delete(f"events:detail:{self.get_object().slug}")


class EventDeleteView(generics.DestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsOrganizerRole]
    lookup_field = "slug"

    def get_queryset(self):
        return Event.objects.filter(organizer=self.request.user)

    def perform_destroy(self, instance):
        instance.status = "cancelled"
        instance.save(update_fields=["status"])
        cache.clear()
        cache.delete(f"events:detail:{instance.slug}")


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
        cache.clear()
        cache.delete(f"events:detail:{event.slug}")
        serializer = EventDetailSerializer(event, context=self.get_serializer_context())
        return Response(serializer.data)


class OrganizerEventListView(generics.ListAPIView):
    serializer_class = EventListSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        organizer_id = self.kwargs["id"]
        return Event.objects.filter(organizer_id=organizer_id, status="published").select_related(
            "category", "organizer", "organizer__organizer_profile"
        ).prefetch_related("ticket_types")


class MyEventsListView(generics.ListAPIView):
    """Returns all events owned by the current authenticated organizer."""
    serializer_class = EventListSerializer
    permission_classes = [permissions.IsAuthenticated, IsOrganizerRole]

    def get_queryset(self):
        return Event.objects.filter(organizer=self.request.user).select_related(
            "category", "organizer", "organizer__organizer_profile"
        ).prefetch_related("ticket_types").order_by("-created_at")


class FeaturedEventsView(generics.ListAPIView):
    serializer_class = EventListSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return Event.objects.filter(status="published", is_featured=True).select_related(
            "category", "organizer", "organizer__organizer_profile"
        ).prefetch_related("ticket_types")

    def list(self, request, *args, **kwargs):
        cache_key = "events:featured"
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
    
    cache_key = f"events:related:{slug}"
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

