from __future__ import annotations

from uuid import UUID

from django.core.cache import cache
from django.db import models
from django.db.models import Case, Exists, IntegerField, OuterRef, Prefetch, Q, Subquery, Value, When
from django.http import Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django_ratelimit.decorators import ratelimit
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page

from apps.accounts.access import get_active_assigned_checkin_events_for_user, user_requires_assigned_event_scope
from apps.accounts.permissions import IsAdmin, IsOrganizerRole
from apps.schedules.models import ScheduleItem
from apps.speakers.models import Speaker
from apps.sponsors.models import Sponsor
from apps.tickets.models import PromoCode, TicketType
from .category_catalog import CURATED_CATEGORY_SLUGS, ensure_curated_categories
from .compat import apply_event_schema_compat, has_optional_event_field
from .filters import EventFilter
from .models import Category, Event
from .revisions import get_editable_event
from .serializers import (
    CategorySerializer,
    EventCreateSerializer,
    EventDetailSerializer,
    EventListSerializer,
    EventLiveSettingsSerializer,
    EventReviewQueueSerializer,
    EventReviewRejectSerializer,
    EventStatusSerializer,
)
from .services import approve_event_submission, reject_event_submission, submit_event_for_review


def _with_list_optimizations(queryset):
    active_tickets = TicketType.objects.filter(event=OuterRef("pk"), is_active=True)
    lowest_price = Subquery(
        active_tickets.order_by("price").values("price")[:1],
        output_field=models.DecimalField(max_digits=10, decimal_places=2),
    )
    return apply_event_schema_compat(queryset.select_related(
        "category", "organizer", "organizer__organizer_profile"
    ).annotate(
        lowest_ticket_price_annotated=lowest_price,
        has_active_tickets_annotated=Exists(active_tickets),
        has_paid_tickets_annotated=Exists(active_tickets.filter(price__gt=0)),
    ))


def _with_detail_optimizations(queryset, exclude_fields: set[str] | None = None):
    exclude_fields = exclude_fields or set()
    prefetches = [
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
    ]

    if "speakers" not in exclude_fields:
        prefetches.append(
            Prefetch(
                "speakers",
                queryset=Speaker.objects.order_by("sort_order", "name"),
                to_attr="prefetched_speakers_ordered",
            )
        )
    if "schedule" not in exclude_fields:
        prefetches.append(
            Prefetch(
                "schedule_items",
                queryset=ScheduleItem.objects.select_related("speaker").order_by("day", "sort_order", "start_time"),
                to_attr="prefetched_schedule_items",
            )
        )
    if "sponsors" not in exclude_fields:
        prefetches.append(
            Prefetch(
                "event_sponsors",
                queryset=Sponsor.objects.order_by("sort_order", "name"),
                to_attr="prefetched_sponsors",
            )
        )

    return apply_event_schema_compat(
        queryset.select_related("category", "organizer", "organizer__organizer_profile")
        .prefetch_related(*prefetches)
        .annotate(
            speakers_count=models.Count("speakers", filter=Q(speakers__is_mc=False), distinct=True),
            schedule_count=models.Count("schedule_items", distinct=True),
            sponsors_count=models.Count("event_sponsors", distinct=True),
        )
    )


def _apply_public_event_ordering(queryset):
    today = timezone.localdate()
    current_time = timezone.localtime().time()

    queryset = queryset.annotate(
        public_time_bucket=Case(
            When(
                Q(status="completed")
                | Q(end_date__lt=today)
                | Q(end_date=today, end_time__lte=current_time),
                then=Value(2),
            ),
            When(
                Q(start_date=today) | Q(start_date__lt=today, end_date__gte=today),
                then=Value(0),
            ),
            default=Value(1),
            output_field=IntegerField(),
        ),
    )

    if not has_optional_event_field("display_priority"):
        return queryset.order_by("public_time_bucket", "start_date", "start_time", "-published_at")

    return queryset.annotate(
        priority_override=models.Case(
            When(display_priority__gt=0, then=Value(0)),
            default=Value(1),
            output_field=IntegerField(),
        ),
    ).order_by(
        "priority_override",
        "public_time_bucket",
        "-display_priority",
        "start_date",
        "start_time",
        "-published_at",
    )


def _is_admin_user(user) -> bool:
    return bool(
        user
        and user.is_authenticated
        and (getattr(user, "role", None) == "admin" or getattr(user, "is_staff", False))
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
        queryset = Event.objects.filter(status__in=["published", "completed"])
        return _apply_public_event_ordering(_with_list_optimizations(queryset))

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
        if _is_admin_user(user):
            base_queryset = Event.objects.all()
        else:
            status_filter = Q(status__in=["published", "completed"])
            if user.is_authenticated:
                status_filter |= Q(organizer=user, status__in=["draft", "pending", "rejected"])
            base_queryset = Event.objects.filter(status_filter).distinct()
        exclude_fields = self._get_exclude_fields()
        return _with_detail_optimizations(base_queryset, exclude_fields=exclude_fields)

    def _get_exclude_fields(self) -> set[str]:
        raw = self.request.query_params.get("exclude", "")
        if not raw:
            return set()
        return {part.strip().lower() for part in raw.split(",") if part.strip()}

    def retrieve(self, request, *args, **kwargs):
        slug = kwargs.get(self.lookup_field)
        is_anon = not request.user.is_authenticated
        exclude_fields = self._get_exclude_fields()
        exclude_key = "full" if not exclude_fields else f"exclude:{','.join(sorted(exclude_fields))}"
        version = _get_cache_version()

        # Only serve cached responses to anonymous users.
        # Authenticated users bypass cache so draft/pending events
        # owned by the organizer are never leaked into the public cache.
        cache_key = f"events:detail:v3:{version}:{slug}:{exclude_key}"
        if is_anon:
            cached = cache.get(cache_key)
            if cached:
                response = Response(cached)
                response["Cache-Control"] = "public, max-age=600"
                return response

        event = self.get_object()
        serializer = self.get_serializer(event, exclude_fields=exclude_fields)
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

        if _is_admin_user(request.user):
            qs = apply_event_schema_compat(Event.objects.all())
        else:
            if request.user.role != "organizer":
                raise PermissionDenied("Only organizers can delete events.")
            if user_requires_assigned_event_scope(request.user):
                raise PermissionDenied("This account is limited to assigned event check-in.")
            qs = apply_event_schema_compat(Event.objects.filter(organizer=request.user))

        event = get_object_or_404(qs, slug=kwargs.get(self.lookup_field))
        event.status = "cancelled"
        event.save(update_fields=["status"])
        _bump_cache_version()
        return Response(status=status.HTTP_204_NO_CONTENT)


class EventCreateView(generics.CreateAPIView):
    serializer_class = EventCreateSerializer
    permission_classes = [permissions.IsAuthenticated, IsOrganizerRole]

    def perform_create(self, serializer):
        if user_requires_assigned_event_scope(self.request.user):
            raise PermissionDenied("This account is limited to assigned event check-in.")
        serializer.save()
        _bump_cache_version()


class EventUpdateView(generics.RetrieveUpdateAPIView):
    serializer_class = EventCreateSerializer
    permission_classes = [permissions.IsAuthenticated, IsOrganizerRole]
    lookup_field = "slug"

    def get_queryset(self):
        if user_requires_assigned_event_scope(self.request.user):
            return Event.objects.none()
        return apply_event_schema_compat(Event.objects.filter(organizer=self.request.user))

    def _get_requested_event(self):
        queryset = self.filter_queryset(self.get_queryset())
        lookup_value = self.kwargs.get(self.lookup_field)
        event = queryset.filter(slug=lookup_value).first()
        if event is None:
            raise Http404("No Event matches the given query.")
        self.check_object_permissions(self.request, event)
        return event

    def retrieve(self, request, *args, **kwargs):
        requested_event = self._get_requested_event()
        editable_event = get_editable_event(requested_event, create_if_missing=False)
        serializer = EventDetailSerializer(editable_event, context=self.get_serializer_context())
        return Response(serializer.data)

    def update(self, request, *args, **kwargs):
        requested_event = self._get_requested_event()
        editable_event = get_editable_event(requested_event, create_if_missing=True)
        serializer = self.get_serializer(editable_event, data=request.data, partial=kwargs.pop("partial", False))
        serializer.is_valid(raise_exception=True)
        serializer.save()
        _bump_cache_version()
        detail_serializer = EventDetailSerializer(serializer.instance, context=self.get_serializer_context())
        return Response(detail_serializer.data)
        # Use serializer.instance.slug — avoids a redundant SELECT after save()


class EventDeleteView(generics.DestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsOrganizerRole]
    lookup_field = "slug"

    def get_queryset(self):
        if user_requires_assigned_event_scope(self.request.user):
            return Event.objects.none()
        return apply_event_schema_compat(Event.objects.filter(organizer=self.request.user))

    def perform_destroy(self, instance):
        instance.status = "cancelled"
        instance.save(update_fields=["status"])
        _bump_cache_version()


class EventLiveSettingsView(generics.UpdateAPIView):
    serializer_class = EventLiveSettingsSerializer
    permission_classes = [permissions.IsAuthenticated, IsOrganizerRole]
    lookup_field = "slug"

    def get_queryset(self):
        if user_requires_assigned_event_scope(self.request.user):
            return Event.objects.none()
        return apply_event_schema_compat(Event.objects.filter(organizer=self.request.user))

    def get_object(self):
        queryset = self.filter_queryset(self.get_queryset())
        lookup_value = self.kwargs.get(self.lookup_field)
        event = queryset.filter(slug=lookup_value).first()
        if event is None:
            raise Http404("No Event matches the given query.")
        self.check_object_permissions(self.request, event)
        return event

    def _sync_pending_revision(self, event, payload, partial):
        pending_revision = get_editable_event(event, create_if_missing=False)
        if pending_revision.id == event.id:
            return

        serializer = self.get_serializer(pending_revision, data=payload, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()

    def update(self, request, *args, **kwargs):
        event = self.get_object()
        partial = kwargs.pop("partial", False)
        serializer = self.get_serializer(event, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        self._sync_pending_revision(event, request.data, partial)
        _bump_cache_version()
        detail_serializer = EventDetailSerializer(event, context=self.get_serializer_context())
        return Response(detail_serializer.data)


class EventPublishView(generics.UpdateAPIView):
    serializer_class = EventStatusSerializer
    permission_classes = [permissions.IsAuthenticated, IsOrganizerRole]
    lookup_field = "slug"

    def get_queryset(self):
        if user_requires_assigned_event_scope(self.request.user):
            return Event.objects.none()
        return apply_event_schema_compat(Event.objects.filter(organizer=self.request.user))

    def get_object(self):
        queryset = self.filter_queryset(self.get_queryset())
        lookup_value = self.kwargs.get(self.lookup_field)
        resolved = None

        if lookup_value:
            resolved = queryset.filter(slug=lookup_value).first()
            if resolved is None:
                try:
                    parsed_uuid = UUID(str(lookup_value))
                except (TypeError, ValueError):
                    parsed_uuid = None
                if parsed_uuid:
                    resolved = queryset.filter(id=parsed_uuid).first()

        if resolved is None:
            raise Http404("No Event matches the given query.")

        self.check_object_permissions(self.request, resolved)
        return resolved

    def update(self, request, *args, **kwargs):
        event = self.get_object()
        event = get_editable_event(event, create_if_missing=True)
        submit_event_for_review(event, request.user)
        _bump_cache_version()
        serializer = EventDetailSerializer(event, context=self.get_serializer_context())
        return Response(serializer.data)


class EventReviewQueueView(generics.ListAPIView):
    serializer_class = EventReviewQueueSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get_queryset(self):
        raw_status = self.request.query_params.get("status", "pending")
        requested = [item.strip() for item in raw_status.split(",") if item.strip()]
        allowed = {"pending", "published", "rejected", "draft", "cancelled", "completed"}
        statuses = [item for item in requested if item in allowed] or ["pending"]
        queryset = apply_event_schema_compat(
            Event.objects.filter(status__in=statuses).select_related(
                "organizer", "organizer__organizer_profile", "category"
            )
        )
        if has_optional_event_field("approval_requested_at"):
            return queryset.order_by("-approval_requested_at", "-created_at")
        return queryset.order_by("-created_at")


class EventApproveView(generics.UpdateAPIView):
    serializer_class = EventDetailSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    lookup_field = "slug"

    def get_queryset(self):
        return apply_event_schema_compat(Event.objects.all())

    def update(self, request, *args, **kwargs):
        event = self.get_object()
        if event.status in {"cancelled", "completed"}:
            raise ValidationError("This event can no longer be approved.")
        approve_event_submission(event, request.user)
        _bump_cache_version()
        serializer = EventDetailSerializer(event, context=self.get_serializer_context())
        return Response(serializer.data)


class EventRejectView(generics.UpdateAPIView):
    serializer_class = EventReviewRejectSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    lookup_field = "slug"

    def get_queryset(self):
        return apply_event_schema_compat(Event.objects.all())

    def update(self, request, *args, **kwargs):
        event = self.get_object()
        if event.status == "published":
            raise ValidationError("Published events cannot be rejected from the review screen.")
        if event.status in {"cancelled", "completed"}:
            raise ValidationError("This event can no longer be rejected.")
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reject_event_submission(event, request.user, serializer.validated_data["reason"])
        _bump_cache_version()
        detail_serializer = EventDetailSerializer(event, context=self.get_serializer_context())
        return Response(detail_serializer.data)


class OrganizerEventListView(generics.ListAPIView):
    serializer_class = EventListSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        organizer_id = self.kwargs["id"]
        return _with_list_optimizations(
            Event.objects.filter(organizer_id=organizer_id, status__in=["published", "completed"])
        )


class MyEventsListView(generics.ListAPIView):
    """Returns all events created/owned by the current authenticated organizer.
    This endpoint is EXCLUSIVELY for organizers to see their own events.
    Check-in staff must use the /checkin/assigned-events/ endpoint instead.
    """
    serializer_class = EventListSerializer
    permission_classes = [permissions.IsAuthenticated, IsOrganizerRole]

    def get_queryset(self):
        # Strict owner-only filter: regardless of any check-in assignments,
        # this endpoint only ever shows events where request.user is the organizer.
        return _with_list_optimizations(
            Event.objects.filter(organizer=self.request.user, source_event__isnull=True).order_by("-created_at")
        )


class AssignedCheckinEventsView(generics.ListAPIView):
    """Returns events that have been explicitly assigned to the current user for check-in.
    This endpoint is EXCLUSIVELY for check-in staff.
    It does NOT overlap with an organizer's own dashboard regardless of that user's role.
    An organizer who is also assigned check-in for another organizer's event will:
      - See THEIR OWN events on /api/events/organizer/ (their dashboard)
      - See ONLY assigned events on this endpoint (check-in use only)
    """
    serializer_class = EventListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        assigned_events = get_active_assigned_checkin_events_for_user(self.request.user)
        if not assigned_events:
            return Event.objects.none()
        assigned_ids = [event.id for event in assigned_events]
        return _with_list_optimizations(
            Event.objects.filter(id__in=assigned_ids, status__in=["published", "completed"])
            .order_by("start_date", "start_time", "title")
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
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        ensure_curated_categories(Category, Event)
        return Category.objects.filter(
            is_active=True,
            slug__in=CURATED_CATEGORY_SLUGS,
        ).order_by("sort_order", "name")


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
        qs_base = apply_event_schema_compat(Event.objects.all())
    elif user.is_authenticated:
        qs_base = apply_event_schema_compat(
            Event.objects.filter(Q(status__in=["published", "completed"]) | Q(organizer=user))
        )
    else:
        qs_base = apply_event_schema_compat(Event.objects.filter(status__in=["published", "completed"]))
    
    event = get_object_or_404(qs_base.distinct(), slug=slug)
    
    version = _get_cache_version()
    cache_key = f"events:related:v2:{version}:{slug}"
    cached = cache.get(cache_key)
    if cached:
        return Response(cached)
        
    qs = _apply_public_event_ordering(
        _with_list_optimizations(
            Event.objects.filter(category=event.category, status="published").exclude(id=event.id)
        )
    )[:4]
    serializer = EventListSerializer(qs, many=True, context={"request": request})
    cache.set(cache_key, serializer.data, 900)  # 15 minutes
    return Response(serializer.data)
