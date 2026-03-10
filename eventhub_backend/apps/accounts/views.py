from __future__ import annotations

import uuid

from django.contrib.auth import get_user_model
from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone
from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView as SimpleJWTTokenRefreshView
from rest_framework.throttling import ScopedRateThrottle

from .serializers import (
    ChangePasswordSerializer,
    EmailVerificationSerializer,
    ForgotPasswordSerializer,
    LoginSerializer,
    RegisterSerializer,
    ResendVerificationSerializer,
    ResetPasswordSerializer,
    UserProfileSerializer,
    OrganizerTeamMemberSerializer,
    SecuritySettingsSerializer,
    UserSessionSerializer,
)
from .models import (
    OrganizerProfile,
    OrganizerTeamMember,
    Integration,
    UserIntegration,
    UserSession,
    UserSecuritySettings,
)
from apps.events.models import Event
from apps.notifications.models import Notification
from .tasks import send_password_reset_email, send_verification_email, send_welcome_email

User = get_user_model()


def _extract_refresh_jti(token_str: str) -> str | None:
    try:
        token = RefreshToken(token_str)
        return token.get("jti")
    except Exception:
        return None


def _device_from_user_agent(user_agent: str) -> str:
    if not user_agent:
        return "Unknown device"
    ua = user_agent.lower()
    if "iphone" in ua or "ios" in ua:
        return "iPhone"
    if "android" in ua:
        return "Android"
    if "mac" in ua:
        return "MacOS"
    if "windows" in ua:
        return "Windows"
    if "linux" in ua:
        return "Linux"
    return "Browser"


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    @method_decorator(ratelimit(key="ip", rate="10/h", block=True))
    def post(self, request: Request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        user = User.objects.get(id=response.data["user"]["id"])
        send_verification_email.delay(str(user.id))
        if user.role == "organizer":
            send_welcome_email.delay(str(user.id))
        return response


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    @method_decorator(ratelimit(key="ip", rate="5/m", block=True))
    def post(self, request: Request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        user.last_login_ip = request.META.get("REMOTE_ADDR")
        user.last_login = timezone.now()
        user.save(update_fields=["last_login_ip", "last_login"])
        data = serializer.data

        refresh_token = data.get("tokens", {}).get("refresh")
        jti = _extract_refresh_jti(refresh_token) if refresh_token else None
        if jti:
            UserSession.objects.create(
                user=user,
                refresh_jti=jti,
                ip_address=request.META.get("REMOTE_ADDR"),
                user_agent=request.META.get("HTTP_USER_AGENT", "")[:500],
                device=_device_from_user_agent(request.META.get("HTTP_USER_AGENT", "")),
                last_seen=timezone.now(),
            )

        return Response(data, status=status.HTTP_200_OK)


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request: Request):
        refresh_token = request.data.get("refresh")
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
                jti = token.get("jti")
                if jti:
                    UserSession.objects.filter(
                        user=request.user,
                        refresh_jti=jti,
                        revoked_at__isnull=True,
                    ).update(revoked_at=timezone.now())
            except Exception:
                pass
        return Response({"success": True, "data": None, "message": "Logged out."})


class TokenRefreshView(SimpleJWTTokenRefreshView):
    """
    Uses SimpleJWT's refresh logic; our renderer wraps the response.
    """


class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request: Request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"message": "Password updated successfully."})


class ForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    @method_decorator(ratelimit(key="ip", rate="3/h", block=True))
    def post(self, request: Request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].lower()
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            # Always return 200 to avoid user enumeration
            return Response({"message": "If that account exists, you will receive an email shortly."})

        user.password_reset_token = uuid.uuid4()
        user.password_reset_token_expires = timezone.now() + timezone.timedelta(hours=1)
        user.save(update_fields=["password_reset_token", "password_reset_token_expires"])
        send_password_reset_email.delay(str(user.id))
        return Response({"message": "If that account exists, you will receive an email shortly."})


class ResetPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request: Request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"message": "Password has been reset successfully."})


class EmailVerificationView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request: Request):
        serializer = EmailVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token = serializer.validated_data["token"]
        try:
            user = User.objects.get(email_verification_token=token)
        except User.DoesNotExist:
            return Response({"detail": "Invalid token."}, status=status.HTTP_400_BAD_REQUEST)
        user.is_email_verified = True
        user.save(update_fields=["is_email_verified"])
        return Response({"message": "Email verified successfully."})


class ResendVerificationView(APIView):
    permission_classes = [permissions.AllowAny]

    @method_decorator(ratelimit(key="ip", rate="3/h", block=True))
    def post(self, request: Request):
        serializer = ResendVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].lower()
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response({"message": "If that account exists, you will receive an email shortly."})

        if user.is_email_verified:
            return Response({"message": "Email already verified."})

        user.email_verification_token = uuid.uuid4()
        user.save(update_fields=["email_verification_token"])
        send_verification_email.delay(str(user.id))
        return Response({"message": "Verification email sent."})


class OrganizerProfileView(generics.RetrieveAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = UserProfileSerializer
    lookup_url_kwarg = "id"

    def get_queryset(self):
        return User.objects.filter(role="organizer", organizer_profile__is_approved=True)


class SecuritySettingsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request: Request):
        settings_obj, _ = UserSecuritySettings.objects.get_or_create(user=request.user)
        serializer = SecuritySettingsSerializer({"two_factor_enabled": settings_obj.two_factor_enabled})
        return Response(serializer.data)


class TwoFactorToggleView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request: Request):
        enabled = bool(request.data.get("enabled", False))
        settings_obj, _ = UserSecuritySettings.objects.get_or_create(user=request.user)
        settings_obj.two_factor_enabled = enabled
        settings_obj.save(update_fields=["two_factor_enabled"])
        return Response({"two_factor_enabled": settings_obj.two_factor_enabled})


class SessionListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request: Request):
        sessions = list(
            UserSession.objects.filter(user=request.user).order_by("-created_at")
        )
        current_id = sessions[0].id if sessions else None
        data = [
            {
                "id": session.id,
                "device": session.device or "Unknown device",
                "location": session.ip_address or "",
                "current": session.id == current_id and session.revoked_at is None,
            }
            for session in sessions
        ]
        serializer = UserSessionSerializer(data, many=True)
        return Response(serializer.data)


class SessionRevokeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request: Request, pk):
        session = generics.get_object_or_404(UserSession, pk=pk, user=request.user)
        if session.revoked_at is None:
            session.revoked_at = timezone.now()
            session.save(update_fields=["revoked_at"])
        return Response({"revoked": True})


class IntegrationListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    DEFAULT_INTEGRATIONS = [
        {"slug": "mailchimp", "name": "Mailchimp", "description": "Email marketing"},
        {"slug": "zapier", "name": "Zapier", "description": "Automation"},
        {"slug": "slack", "name": "Slack", "description": "Team messaging"},
        {"slug": "google-analytics", "name": "Google Analytics", "description": "Analytics"},
        {"slug": "zoom", "name": "Zoom", "description": "Video conferencing"},
        {"slug": "hubspot", "name": "HubSpot", "description": "CRM"},
    ]

    def get(self, request: Request):
        if not Integration.objects.exists():
            Integration.objects.bulk_create(
                [Integration(**item) for item in self.DEFAULT_INTEGRATIONS],
                ignore_conflicts=True,
            )

        integrations = Integration.objects.all().order_by("name")
        connections = {
            conn.integration_id: conn
            for conn in UserIntegration.objects.filter(user=request.user)
        }

        payload = [
            {
                "id": integration.slug,
                "name": integration.name,
                "description": integration.description,
                "connected": connections.get(integration.id, None).is_connected
                if connections.get(integration.id, None)
                else False,
            }
            for integration in integrations
        ]
        return Response(payload)


class IntegrationConnectView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request: Request, integration_id: str):
        integration = Integration.objects.filter(slug=integration_id).first()
        if not integration:
            integration = generics.get_object_or_404(Integration, id=integration_id)
        connection, _ = UserIntegration.objects.get_or_create(
            user=request.user, integration=integration
        )
        connection.is_connected = True
        connection.connected_at = timezone.now()
        connection.save(update_fields=["is_connected", "connected_at"])
        return Response({"connected": True})


class IntegrationDisconnectView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request: Request, integration_id: str):
        integration = Integration.objects.filter(slug=integration_id).first()
        if not integration:
            integration = generics.get_object_or_404(Integration, id=integration_id)
        connection, _ = UserIntegration.objects.get_or_create(
            user=request.user, integration=integration
        )
        connection.is_connected = False
        connection.save(update_fields=["is_connected"])
        return Response({"connected": False})


class OrganizerTeamListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request: Request):
        if request.user.role not in ["organizer", "admin"] and not request.user.is_staff:
            raise PermissionDenied("Only organizers can view team members.")

        members = OrganizerTeamMember.objects.filter(organizer=request.user).select_related("member").prefetch_related("assigned_events")
        serializer = OrganizerTeamMemberSerializer(members, many=True)
        return Response(serializer.data)


class OrganizerTeamInviteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request: Request):
        if request.user.role not in ["organizer", "admin"] and not request.user.is_staff:
            raise PermissionDenied("Only organizers can invite team members.")

        email = (request.data.get("email") or "").lower().strip()
        name = (request.data.get("name") or "").strip()
        role = request.data.get("role") or "checkin"
        event_id = request.data.get("event_id")

        if not email:
            return Response({"detail": "email is required."}, status=status.HTTP_400_BAD_REQUEST)

        first_name = name.split(" ")[0] if name else "Team"
        last_name = " ".join(name.split(" ")[1:]) if name else "Member"

        assigned_event = None
        with transaction.atomic():
            member, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "first_name": first_name,
                    "last_name": last_name or "Member",
                    "role": "checkin",
                    "is_active": True,
                },
            )
            if created:
                temp_password = User.objects.make_random_password()
                member.set_password(temp_password)
                member.save(update_fields=["password"])
            else:
                temp_password = None

            if member.role not in ["organizer", "admin"] and role in ["checkin", "admin"]:
                if member.role != "checkin":
                    member.role = "checkin"
                    member.save(update_fields=["role"])

            team_member, _ = OrganizerTeamMember.objects.get_or_create(
                organizer=request.user,
                member=member,
                defaults={"role": role},
            )
            team_member.role = role
            team_member.save(update_fields=["role"])

            if event_id:
                assigned_event = generics.get_object_or_404(Event, id=event_id, organizer=request.user)
                team_member.assigned_events.set([assigned_event])

        # Send email invite/assignment notification (best-effort)
        try:
            frontend = getattr(settings, "FRONTEND_URL", "").rstrip("/")
            login_url = f"{frontend}/login" if frontend else ""
            reset_url = f"{frontend}/forgot-password" if frontend else ""
            organizer_name = request.user.get_full_name() or request.user.email
            event_label = assigned_event.title if assigned_event else "your assigned events"
            if created and temp_password:
                subject = "You're invited as EventHub check-in staff"
                body = (
                    f"Hi {first_name},\n\n"
                    f"{organizer_name} invited you to help with event check-ins for {event_label}.\n\n"
                    f"Login email: {email}\n"
                    f"Temporary password: {temp_password}\n"
                    f"Login here: {login_url}\n\n"
                    f"Please reset your password immediately after logging in: {reset_url}\n\n"
                    "If you did not expect this invite, you can ignore this email."
                )
            else:
                subject = "You've been assigned to event check-in"
                body = (
                    f"Hi {first_name},\n\n"
                    f"{organizer_name} assigned you as check-in staff for {event_label}.\n\n"
                    f"Login here: {login_url}\n\n"
                    "Once logged in, you'll only see the event(s) you're assigned to."
                )
            send_mail(
                subject,
                body,
                getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@eventhub.com"),
                [email],
                fail_silently=True,
            )
        except Exception:
            pass

        # In-app notification for existing users
        try:
            Notification.objects.create(
                recipient=member,
                notification_type="organizer_message",
                title="Assigned to check-in",
                message=f"You've been assigned to check-in for {assigned_event.title if assigned_event else 'an event'}.",
                event=assigned_event,
                action_url=f"/organizer/events/{assigned_event.slug}/checkin" if assigned_event else "",
            )
        except Exception:
            pass

        serializer = OrganizerTeamMemberSerializer(team_member)
        response = serializer.data
        if temp_password:
            response["temporary_password"] = temp_password
        return Response(response, status=status.HTTP_201_CREATED)


class OrganizerTeamMemberDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request: Request, pk):
        if request.user.role not in ["organizer", "admin"] and not request.user.is_staff:
            raise PermissionDenied("Only organizers can update team members.")

        member = generics.get_object_or_404(OrganizerTeamMember, pk=pk, organizer=request.user)
        role = request.data.get("role")
        assigned_events = request.data.get("assigned_events") or []
        assigned_event_id = request.data.get("assigned_event_id")

        if role:
            member.role = role
            member.save(update_fields=["role"])

        if assigned_event_id:
            assigned_events = [assigned_event_id]

        if assigned_events is not None:
            valid_events = Event.objects.filter(organizer=request.user, id__in=assigned_events)
            member.assigned_events.set(valid_events)

        serializer = OrganizerTeamMemberSerializer(member)
        return Response(serializer.data)

    def delete(self, request: Request, pk):
        if request.user.role not in ["organizer", "admin"] and not request.user.is_staff:
            raise PermissionDenied("Only organizers can remove team members.")

        member = generics.get_object_or_404(OrganizerTeamMember, pk=pk, organizer=request.user)
        member.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def health(request: Request):
    return Response({"status": "ok"})
