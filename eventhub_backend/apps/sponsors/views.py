from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied

from apps.events.models import Event
from .models import Sponsor
from .serializers import SponsorSerializer, SponsorCreateSerializer


def _can_view_unpublished_event(user, slug: str) -> bool:
    if not user or not user.is_authenticated:
        return False
    if user.is_staff or getattr(user, "role", None) == "admin":
        return True
    return Event.objects.filter(slug=slug, organizer=user).exists()


class SponsorListCreateView(generics.ListCreateAPIView):
    def get_permissions(self):
        return [permissions.AllowAny()] if self.request.method == "GET" else [permissions.IsAuthenticated()]

    def get_serializer_class(self):
        return SponsorCreateSerializer if self.request.method == "POST" else SponsorSerializer

    def get_event(self):
        return generics.get_object_or_404(Event, slug=self.kwargs["slug"])

    def get_queryset(self):
        queryset = Sponsor.objects.filter(event__slug=self.kwargs["slug"])
        if _can_view_unpublished_event(self.request.user, self.kwargs["slug"]):
            return queryset
        return queryset.filter(event__status="published")

    def perform_create(self, serializer):
        event = self.get_event()
        if event.organizer != self.request.user:
            raise PermissionDenied("Only the event organizer can add sponsors.")
        serializer.save(event=event)


class SponsorDetailView(generics.RetrieveUpdateDestroyAPIView):
    def get_permissions(self):
        return [permissions.AllowAny()] if self.request.method == "GET" else [permissions.IsAuthenticated()]

    def get_serializer_class(self):
        return SponsorCreateSerializer if self.request.method in ("PUT", "PATCH") else SponsorSerializer

    def get_queryset(self):
        queryset = Sponsor.objects.filter(event__slug=self.kwargs["slug"])
        if _can_view_unpublished_event(self.request.user, self.kwargs["slug"]):
            return queryset
        return queryset.filter(event__status="published")

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        if request.method not in permissions.SAFE_METHODS:
            if obj.event.organizer != request.user:
                raise PermissionDenied("Only the event organizer can modify sponsors.")
