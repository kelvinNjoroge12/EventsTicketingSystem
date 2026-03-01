from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied

from apps.events.models import Event
from .models import ScheduleItem
from .serializers import ScheduleItemSerializer, ScheduleItemCreateSerializer


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
        return ScheduleItem.objects.filter(event__slug=self.kwargs["slug"]).select_related("speaker")

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
        return ScheduleItem.objects.filter(event__slug=self.kwargs["slug"]).select_related("speaker")

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        if request.method not in permissions.SAFE_METHODS:
            if obj.event.organizer != request.user:
                raise PermissionDenied("Only the event organizer can modify schedule items.")
