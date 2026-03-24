from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied

from apps.events.models import Event
from .models import Speaker
from .serializers import SpeakerSerializer, SpeakerCreateSerializer


def _can_view_unpublished_event(user, slug: str) -> bool:
    if not user or not user.is_authenticated:
        return False
    if user.is_staff or getattr(user, "role", None) == "admin":
        return True
    return Event.objects.filter(slug=slug, organizer=user).exists()


class SpeakerListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/events/{slug}/speakers/   → list speakers (public)
    POST /api/events/{slug}/speakers/   → create speaker (organizer only)
    """

    def get_permissions(self):
        if self.request.method == "GET":
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return SpeakerCreateSerializer
        return SpeakerSerializer

    def get_event(self):
        return generics.get_object_or_404(Event, slug=self.kwargs["slug"])

    def get_queryset(self):
        queryset = Speaker.objects.filter(event__slug=self.kwargs["slug"])
        if _can_view_unpublished_event(self.request.user, self.kwargs["slug"]):
            return queryset
        return queryset.filter(event__status="published")

    def perform_create(self, serializer):
        event = self.get_event()
        if event.organizer != self.request.user:
            raise PermissionDenied("Only the event organizer can add speakers.")
        serializer.save(event=event)


class SpeakerDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET/PATCH/DELETE /api/events/{slug}/speakers/{id}/
    """
    serializer_class = SpeakerSerializer

    def get_permissions(self):
        if self.request.method == "GET":
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        slug = self.kwargs["slug"]
        user = self.request.user
        # For write operations: restrict to speakers on THIS organizer's events only.
        # This prevents IDOR attacks where an attacker sends a crafted
        # PATCH /api/events/<other-slug>/speakers/<id>/ to tamper with
        # a different organizer's speaker records.
        if self.request.method not in permissions.SAFE_METHODS and user.is_authenticated:
            if not (user.is_staff or getattr(user, "role", None) == "admin"):
                return Speaker.objects.filter(event__slug=slug, event__organizer=user)
        queryset = Speaker.objects.filter(event__slug=slug)
        if _can_view_unpublished_event(user, slug):
            return queryset
        return queryset.filter(event__status="published")

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return SpeakerCreateSerializer
        return SpeakerSerializer

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        if request.method not in permissions.SAFE_METHODS:
            is_admin = request.user.is_staff or getattr(request.user, "role", None) == "admin"
            if obj.event.organizer != request.user and not is_admin:
                raise PermissionDenied("Only the event organizer can modify speakers.")
