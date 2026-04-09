from django.http import Http404
from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied

from apps.events.models import Event
from apps.events.revisions import translate_revision_object_id
from .models import ScheduleItem
from .serializers import ScheduleItemSerializer, ScheduleItemCreateSerializer


def _can_view_unpublished_event(user, slug: str) -> bool:
    if not user or not user.is_authenticated:
        return False
    if user.is_staff or getattr(user, "role", None) == "admin":
        return True
    return Event.objects.filter(slug=slug, organizer=user).exists()


class ScheduleListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/events/{slug}/schedule/   → list all schedule items (public)
    POST /api/events/{slug}/schedule/   → create (organizer only)
    """

    def get_permissions(self):
        if self.request.method == "GET":
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ScheduleItemCreateSerializer
        return ScheduleItemSerializer

    def get_event(self):
        return generics.get_object_or_404(Event, slug=self.kwargs["slug"])

    def get_queryset(self):
        queryset = ScheduleItem.objects.filter(event__slug=self.kwargs["slug"]).select_related("speaker")
        if _can_view_unpublished_event(self.request.user, self.kwargs["slug"]):
            return queryset
        return queryset.filter(event__status="published")

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["event_id"] = self.get_event().id
        return ctx

    def perform_create(self, serializer):
        event = self.get_event()
        if event.organizer != self.request.user:
            raise PermissionDenied("Only the event organizer can add schedule items.")
        serializer.save(event=event)


class ScheduleItemDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/events/{slug}/schedule/{id}/"""

    def get_permissions(self):
        if self.request.method == "GET":
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return ScheduleItemCreateSerializer
        return ScheduleItemSerializer

    def get_queryset(self):
        slug = self.kwargs["slug"]
        user = self.request.user
        # IDOR protection: For write operations, only return schedule items belonging to
        # events owned by the requesting user. This prevents cross-organizer data tampering.
        if self.request.method not in permissions.SAFE_METHODS and user.is_authenticated:
            if not (user.is_staff or getattr(user, "role", None) == "admin"):
                return ScheduleItem.objects.filter(event__slug=slug, event__organizer=user).select_related("speaker")
        queryset = ScheduleItem.objects.filter(event__slug=slug).select_related("speaker")
        if _can_view_unpublished_event(user, slug):
            return queryset
        return queryset.filter(event__status="published")

    def get_object(self):
        queryset = self.filter_queryset(self.get_queryset())
        lookup_value = self.kwargs.get(self.lookup_field or "pk")
        resolved = queryset.filter(pk=lookup_value).first()
        if resolved is None and self.request.method not in permissions.SAFE_METHODS and self.request.user.is_authenticated:
            event = generics.get_object_or_404(Event, slug=self.kwargs["slug"], organizer=self.request.user)
            translated_id = translate_revision_object_id(event, "schedule", lookup_value)
            if translated_id:
                resolved = queryset.filter(pk=translated_id).first()
        if resolved is None:
            raise Http404("No ScheduleItem matches the given query.")
        self.check_object_permissions(self.request, resolved)
        return resolved

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        if request.method not in permissions.SAFE_METHODS:
            is_admin = request.user.is_staff or getattr(request.user, "role", None) == "admin"
            if obj.event.organizer != request.user and not is_admin:
                raise PermissionDenied("Only the event organizer can modify schedule items.")
