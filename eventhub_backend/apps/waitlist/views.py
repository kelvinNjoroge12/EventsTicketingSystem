from __future__ import annotations

from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.events.models import Event
from apps.accounts.permissions import IsOrganizer
from .models import WaitlistEntry
from .serializers import WaitlistEntrySerializer, WaitlistJoinSerializer


class WaitlistJoinView(APIView):
    """
    POST /api/events/<slug>/waitlist/join/
    Anyone (auth or anon) can join the waitlist for a sold-out event.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, slug):
        try:
            event = Event.objects.get(slug=slug, status="published")
        except Event.DoesNotExist:
            return Response({"detail": "Event not found."}, status=status.HTTP_404_NOT_FOUND)

        if not event.enable_waitlist:
            return Response({"detail": "Waitlist is not enabled for this event."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = WaitlistJoinSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        email = data["email"]
        if WaitlistEntry.objects.filter(event=event, email=email).exists():
            return Response({"detail": "You are already on the waitlist."}, status=status.HTTP_409_CONFLICT)

        # Assign next position
        last_pos = WaitlistEntry.objects.filter(event=event).count()
        entry = WaitlistEntry.objects.create(
            event=event,
            user=request.user if request.user.is_authenticated else None,
            name=data["name"],
            email=email,
            phone=data.get("phone", ""),
            notes=data.get("notes", ""),
            position=last_pos + 1,
        )
        return Response(
            {"detail": "You've been added to the waitlist!", "position": entry.position},
            status=status.HTTP_201_CREATED,
        )


class WaitlistListView(generics.ListAPIView):
    """
    GET /api/events/<slug>/waitlist/
    Organizer-only: list all waitlisted entries for an event.
    """
    serializer_class = WaitlistEntrySerializer
    permission_classes = [permissions.IsAuthenticated, IsOrganizer]

    def get_queryset(self):
        event = Event.objects.get(slug=self.kwargs["slug"], organizer=self.request.user)
        status_filter = self.request.query_params.get("status")
        qs = event.waitlist_entries.all()
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs


class WaitlistEntryDetailView(generics.RetrieveDestroyAPIView):
    """
    GET/DELETE /api/events/<slug>/waitlist/<pk>/
    Organizer can view or remove individual waitlist entries.
    """
    serializer_class = WaitlistEntrySerializer
    permission_classes = [permissions.IsAuthenticated, IsOrganizer]

    def get_queryset(self):
        event = Event.objects.get(slug=self.kwargs["slug"], organizer=self.request.user)
        return event.waitlist_entries.all()


class WaitlistNotifyView(APIView):
    """
    POST /api/events/<slug>/waitlist/<pk>/notify/
    Organizer marks a waitlisted person as 'notified' (a ticket has become available).
    """
    permission_classes = [permissions.IsAuthenticated, IsOrganizer]

    def post(self, request, slug, pk):
        try:
            event = Event.objects.get(slug=slug, organizer=request.user)
            entry = event.waitlist_entries.get(pk=pk)
        except (Event.DoesNotExist, WaitlistEntry.DoesNotExist):
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        entry.status = "notified"
        entry.notified_at = timezone.now()
        entry.save(update_fields=["status", "notified_at"])

        # Send a simple notification email
        try:
            from django.core.mail import send_mail
            from django.conf import settings
            frontend_url = getattr(settings, "FRONTEND_URL", "https://events-ticketing-system.vercel.app")
            send_mail(
                subject=f"🎟 A spot opened up: {event.title}",
                message=(
                    f"Hi {entry.name},\n\n"
                    f"Great news! A ticket for '{event.title}' is now available.\n"
                    f"Head over to grab yours before it's gone: {frontend_url}/events/{slug}\n\n"
                    f"– EventHub"
                ),
                from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@eventhub.com"),
                recipient_list=[entry.email],
                fail_silently=True,
            )
        except Exception:
            pass

        return Response({"detail": f"Notified {entry.email} successfully."})
