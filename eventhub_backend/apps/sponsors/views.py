from django.http import Http404
from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied

from apps.events.models import Event
from apps.events.revisions import translate_revision_object_id
from .models import Sponsor
from .serializers import SponsorSerializer, SponsorCreateSerializer


def _can_view_unpublished_event(user, slug: str) -> bool:
    if not user or not user.is_authenticated:
        return False
    if user.is_staff or getattr(user, "role", None) == "admin":
        return True
    return Event.objects.filter(slug=slug, organizer=user).exists()


class SponsorListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/events/{slug}/sponsors/   → list sponsors (public)
    POST /api/events/{slug}/sponsors/   → create sponsor (organizer only)
    """

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
    """
    GET/PATCH/DELETE /api/events/{slug}/sponsors/{id}/
    """

    def get_permissions(self):
        return [permissions.AllowAny()] if self.request.method == "GET" else [permissions.IsAuthenticated()]

    def get_serializer_class(self):
        return SponsorCreateSerializer if self.request.method in ("PUT", "PATCH") else SponsorSerializer

    def get_queryset(self):
        slug = self.kwargs["slug"]
        user = self.request.user
        # IDOR protection: For write operations, only return sponsors belonging to
        # events owned by the requesting user. This prevents one organizer from
        # tampering with another organizer's sponsor data.
        if self.request.method not in permissions.SAFE_METHODS and user.is_authenticated:
            if not (user.is_staff or getattr(user, "role", None) == "admin"):
                return Sponsor.objects.filter(event__slug=slug, event__organizer=user)
        queryset = Sponsor.objects.filter(event__slug=slug)
        if _can_view_unpublished_event(user, slug):
            return queryset
        return queryset.filter(event__status="published")

    def get_object(self):
        queryset = self.filter_queryset(self.get_queryset())
        lookup_value = self.kwargs.get(self.lookup_field or "pk")
        resolved = queryset.filter(pk=lookup_value).first()
        if resolved is None and self.request.method not in permissions.SAFE_METHODS and self.request.user.is_authenticated:
            event = generics.get_object_or_404(Event, slug=self.kwargs["slug"], organizer=self.request.user)
            translated_id = translate_revision_object_id(event, "sponsors", lookup_value)
            if translated_id:
                resolved = queryset.filter(pk=translated_id).first()
        if resolved is None:
            raise Http404("No Sponsor matches the given query.")
        self.check_object_permissions(self.request, resolved)
        return resolved

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        if request.method not in permissions.SAFE_METHODS:
            is_admin = request.user.is_staff or getattr(request.user, "role", None) == "admin"
            if obj.event.organizer != request.user and not is_admin:
                raise PermissionDenied("Only the event organizer can modify sponsors.")
