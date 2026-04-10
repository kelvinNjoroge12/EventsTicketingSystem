from django.http import Http404
from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied

from apps.events.models import Event
from apps.events.revisions import (
    delete_live_speaker_from_pending_revision,
    sync_live_speaker_to_pending_revision,
    translate_revision_object_id,
)
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
        speaker = serializer.save(event=event)
        sync_live_speaker_to_pending_revision(speaker)


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

    def get_object(self):
        queryset = self.filter_queryset(self.get_queryset())
        lookup_value = self.kwargs.get(self.lookup_field or "pk")
        resolved = queryset.filter(pk=lookup_value).first()
        if resolved is None and self.request.method not in permissions.SAFE_METHODS and self.request.user.is_authenticated:
            event = generics.get_object_or_404(Event, slug=self.kwargs["slug"], organizer=self.request.user)
            translated_id = translate_revision_object_id(event, "speakers", lookup_value)
            if translated_id:
                resolved = queryset.filter(pk=translated_id).first()
        if resolved is None:
            raise Http404("No Speaker matches the given query.")
        self.check_object_permissions(self.request, resolved)
        return resolved

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

    def perform_update(self, serializer):
        speaker = serializer.save()
        sync_live_speaker_to_pending_revision(speaker)

    def perform_destroy(self, instance):
        event = instance.event
        speaker_id = instance.id
        instance.delete()
        delete_live_speaker_from_pending_revision(event, speaker_id)
