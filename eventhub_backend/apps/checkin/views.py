from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.events.models import Event
from .models import CheckIn
from .serializers import CheckInSerializer, QRScanSerializer


class QRScanView(APIView):
    """
    POST /api/events/{slug}/checkin/scan/
    Body: { "qr_code_data": "<uuid>" }
    Organizer-only. Validates ticket, marks as used, returns check-in record.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, slug):
        event = generics.get_object_or_404(Event, slug=slug)
        if event.organizer != request.user and not request.user.is_staff:
            raise PermissionDenied("Only the event organizer can perform check-ins.")

        serializer = QRScanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        checkin = serializer.save(user=request.user, event=event)

        return Response(
            {
                "success": True,
                "message": f"{checkin.attendee_name} checked in successfully.",
                "checkin": CheckInSerializer(checkin).data,
            },
            status=status.HTTP_200_OK,
        )


class CheckInListView(generics.ListAPIView):
    """
    GET /api/events/{slug}/checkin/
    Paginated list of all check-ins for an event (organizer only).
    """

    serializer_class = CheckInSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        event = generics.get_object_or_404(Event, slug=self.kwargs["slug"])
        if event.organizer != self.request.user and not self.request.user.is_staff:
            raise PermissionDenied("Only the event organizer can view check-ins.")
        return CheckIn.objects.filter(event=event).select_related("ticket", "checked_in_by").order_by("-created_at")
