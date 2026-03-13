from django.utils import timezone
from django.http import HttpResponse
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification, NotificationPreference, EmailOptOut
from .serializers import NotificationSerializer, NotificationPreferenceSerializer
from .utils import verify_opt_out_token

User = get_user_model()


class NotificationListView(generics.ListAPIView):
    """
    GET /api/notifications/
    Returns the authenticated user's notifications (most recent first).
    Supports ?unread_only=true query param.
    """

    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Notification.objects.filter(recipient=self.request.user)
        if self.request.query_params.get("unread_only") == "true":
            qs = qs.filter(is_read=False)
        return qs


class NotificationMarkReadView(APIView):
    """
    POST /api/notifications/{id}/read/
    Marks a single notification as read.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        notification = generics.get_object_or_404(
            Notification, pk=pk, recipient=request.user
        )
        if not notification.is_read:
            notification.is_read = True
            notification.read_at = timezone.now()
            notification.save(update_fields=["is_read", "read_at"])
        return Response({"marked_read": True})


class NotificationMarkAllReadView(APIView):
    """
    POST /api/notifications/read-all/
    Marks all of the user's notifications as read.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        updated = Notification.objects.filter(
            recipient=request.user, is_read=False
        ).update(is_read=True, read_at=timezone.now())
        return Response({"marked_read": updated})


class UnreadCountView(APIView):
    """
    GET /api/notifications/unread-count/
    Returns { "count": N } — used by the Navbar badge.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(
            recipient=request.user, is_read=False
        ).count()
        return Response({"count": count})


class NotificationPreferenceView(APIView):
    """
    GET /api/settings/notifications/
    PUT /api/settings/notifications/
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        prefs, _ = NotificationPreference.objects.get_or_create(user=request.user)
        serializer = NotificationPreferenceSerializer(prefs)
        return Response(serializer.data)

    def put(self, request):
        prefs, _ = NotificationPreference.objects.get_or_create(user=request.user)
        serializer = NotificationPreferenceSerializer(prefs, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class NotificationOptOutView(APIView):
    """
    GET /api/notifications/opt-out/?token=...
    Public opt-out endpoint for reminders or marketing emails.
    """

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        token = request.query_params.get("token", "")
        data = verify_opt_out_token(token)
        if not data:
            return HttpResponse("Invalid or expired opt-out link.", status=400, content_type="text/plain")

        email = (data.get("email") or "").strip().lower()
        category = (data.get("category") or "").strip().lower()
        if not email or category not in ["reminders", "marketing"]:
            return HttpResponse("Invalid opt-out request.", status=400, content_type="text/plain")

        EmailOptOut.objects.update_or_create(
            email=email,
            category=category,
            defaults={"is_active": True},
        )

        user = User.objects.filter(email__iexact=email).first()
        if user:
            prefs, _ = NotificationPreference.objects.get_or_create(user=user)
            if category == "reminders" and prefs.email_event_reminders:
                prefs.email_event_reminders = False
                prefs.save(update_fields=["email_event_reminders"])
            if category == "marketing" and prefs.email_marketing:
                prefs.email_marketing = False
                prefs.save(update_fields=["email_marketing"])

        frontend = getattr(settings, "FRONTEND_URL", "").rstrip("/")
        settings_url = f"{frontend}/organizer-dashboard?tab=settings&settingsTab=notifications" if frontend else ""
        label = "event reminders" if category == "reminders" else "marketing emails"

        html = f"""
        <html>
          <body style="font-family: Arial, sans-serif; padding: 24px; color: #0f172a;">
            <h2 style="margin-bottom: 8px;">You're unsubscribed</h2>
            <p style="margin-top: 0;">You will no longer receive {label} at <strong>{email}</strong>.</p>
            {'<p>Manage your preferences here: <a href="' + settings_url + '">' + settings_url + '</a></p>' if settings_url else ''}
          </body>
        </html>
        """
        return HttpResponse(html, content_type="text/html")
