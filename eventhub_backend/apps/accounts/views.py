from __future__ import annotations

import uuid
import logging

import stripe

from django.contrib.auth import get_user_model
from django.conf import settings
from django.core.cache import cache
from django.core.mail import send_mail
from django.db import models, transaction
from django.db.models import Prefetch, Q as DjangoQ
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.middleware.csrf import get_token
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

from .access import user_can_access_organizer_dashboard, user_requires_assigned_event_scope
from .serializers import (
    ChangePasswordSerializer,
    EmailVerificationSerializer,
    ForgotPasswordSerializer,
    LoginSerializer,
    PublicOrganizerSerializer,
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
logger = logging.getLogger(__name__)


def _require_organizer_dashboard_access(user: User, message: str) -> None:
    if not user_can_access_organizer_dashboard(user):
        raise PermissionDenied(message)
    if user_requires_assigned_event_scope(user):
        raise PermissionDenied("This account is limited to assigned event check-in.")


def _ensure_organizer_profile(user: User) -> OrganizerProfile:
    profile = getattr(user, "organizer_profile", None)
    if profile:
        return profile
    profile, _ = OrganizerProfile.objects.get_or_create(
        user=user,
        defaults={"organization_name": user.get_full_name() or user.email},
    )
    return profile


def _stripe_enabled() -> bool:
    return bool(getattr(settings, "STRIPE_SECRET_KEY", ""))


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


def _jwt_cookie_settings():
    secure = getattr(settings, "JWT_COOKIE_SECURE", not settings.DEBUG)
    samesite = getattr(settings, "JWT_COOKIE_SAMESITE", "Lax")
    domain = getattr(settings, "JWT_COOKIE_DOMAIN", "") or None
    return secure, samesite, domain


def _set_auth_cookies(response: Response, access_token: str | None, refresh_token: str | None) -> None:
    if not access_token and not refresh_token:
        return

    secure, samesite, domain = _jwt_cookie_settings()
    access_cookie = getattr(settings, "JWT_AUTH_COOKIE", "strathmore_university_access")
    refresh_cookie = getattr(settings, "JWT_REFRESH_COOKIE", "strathmore_university_refresh")
    access_ttl = int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds())
    refresh_ttl = int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds())

    if access_token:
        response.set_cookie(
            access_cookie,
            access_token,
            max_age=access_ttl,
            httponly=True,
            secure=secure,
            samesite=samesite,
            domain=domain,
        )

    if refresh_token:
        response.set_cookie(
            refresh_cookie,
            refresh_token,
            max_age=refresh_ttl,
            httponly=True,
            secure=secure,
            samesite=samesite,
            domain=domain,
        )


def _clear_auth_cookies(response: Response) -> None:
    secure, samesite, domain = _jwt_cookie_settings()
    access_cookie = getattr(settings, "JWT_AUTH_COOKIE", "strathmore_university_access")
    refresh_cookie = getattr(settings, "JWT_REFRESH_COOKIE", "strathmore_university_refresh")
    response.delete_cookie(access_cookie, domain=domain, samesite=samesite)
    response.delete_cookie(refresh_cookie, domain=domain, samesite=samesite)


def _client_ip_from_request(request: Request) -> str | None:
    forwarded = (request.META.get("HTTP_X_FORWARDED_FOR") or "").strip()
    if forwarded:
        # Security: Use the LAST IP in the chain (the one inserted by our
        # trusted reverse-proxy), NOT the first (which is user-controllable).
        # This prevents attackers from spoofing their IP to bypass rate limits
        # by sending: X-Forwarded-For: <spoofed-ip>, <real-ip>
        ips = [ip.strip() for ip in forwarded.split(",") if ip.strip()]
        return ips[-1] if ips else None
    remote = (request.META.get("REMOTE_ADDR") or "").strip()
    return remote or None


def _get_location_from_ip(ip: str | None) -> str:
    """
    Fetch geographical location for an IP address (City, Country).
    Results are cached to avoid API rate limits and speed up rendering.
    """
    if not ip or ip in ("127.0.0.1", "::1", "localhost"):
        return "Local Network"
        
    cache_key = f"geo_ip:{ip}"
    cached = cache.get(cache_key)
    if cached:
        return cached
        
    try:
        # 45 requests per minute limit, but caching mostly avoids it
        import requests
        resp = requests.get(f"http://ip-api.com/json/{ip}", timeout=2)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("status") == "success":
                loc = f"{data.get('city', '')}, {data.get('country', '')}".strip(" ,")
                cache.set(cache_key, loc, timeout=604800)  # cache for 7 days
                return loc
    except Exception:
        pass
        
    return "Unknown Location"


def _record_user_session(user: User, refresh_token: str | None, request: Request) -> None:
    jti = _extract_refresh_jti(refresh_token or "")
    if not jti:
        return
    UserSession.objects.update_or_create(
        user=user,
        refresh_jti=jti,
        defaults={
            "ip_address": _client_ip_from_request(request),
            "user_agent": (request.META.get("HTTP_USER_AGENT") or "")[:500],
            "device": _device_from_user_agent(request.META.get("HTTP_USER_AGENT", "")),
            "last_seen": timezone.now(),
            "revoked_at": None,
        },
    )


def _blacklist_refresh_jtis(jtis: list[str]) -> None:
    if not jtis:
        return
    try:
        from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

        for token in OutstandingToken.objects.filter(jti__in=jtis):
            BlacklistedToken.objects.get_or_create(token=token)
    except Exception:  # pragma: no cover - best effort
        logger.exception("Failed to blacklist one or more refresh tokens.")


def _revoke_user_sessions(user: User, exclude_jti: str | None = None) -> int:
    sessions = UserSession.objects.filter(user=user, revoked_at__isnull=True)
    if exclude_jti:
        sessions = sessions.exclude(refresh_jti=exclude_jti)

    jtis = list(sessions.values_list("refresh_jti", flat=True))
    _blacklist_refresh_jtis([jti for jti in jtis if jti])
    revoked_count = sessions.update(revoked_at=timezone.now())
    return revoked_count


def _enqueue_task(task, *args) -> None:
    try:
        task.delay(*args)
    except Exception:  # pragma: no cover - depends on broker availability
        logger.exception("Background task dispatch failed for %s", getattr(task, "name", task))


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    @method_decorator(ratelimit(key="ip", rate="10/h", block=True))
    def post(self, request: Request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        data = serializer.data
        response = Response(data, status=status.HTTP_201_CREATED, headers=self.get_success_headers(data))

        user = User.objects.get(id=data["user"]["id"])
        tokens = data.get("tokens", {}) if isinstance(data, dict) else {}
        _record_user_session(user, tokens.get("refresh"), request)
        _set_auth_cookies(response, tokens.get("access"), tokens.get("refresh"))

        _enqueue_task(send_verification_email, str(user.id))
        if user.role == "organizer":
            _enqueue_task(send_welcome_email, str(user.id))
        get_token(request)  # ensure CSRF cookie is set
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
        _record_user_session(user, refresh_token, request)

        response = Response(data, status=status.HTTP_200_OK)
        tokens = data.get("tokens", {}) if isinstance(data, dict) else {}
        _set_auth_cookies(response, tokens.get("access"), tokens.get("refresh"))
        get_token(request)  # ensure CSRF cookie is set
        return response


class LogoutView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request: Request):
        refresh_token = request.data.get("refresh") or request.COOKIES.get(
            getattr(settings, "JWT_REFRESH_COOKIE", "strathmore_university_refresh")
        )
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
                jti = token.get("jti")
                if jti and request.user and request.user.is_authenticated:
                    UserSession.objects.filter(
                        user=request.user,
                        refresh_jti=jti,
                        revoked_at__isnull=True,
                    ).update(revoked_at=timezone.now())
            except Exception:
                pass
        response = Response({"success": True, "data": None, "message": "Logged out."})
        _clear_auth_cookies(response)
        return response


class TokenRefreshView(SimpleJWTTokenRefreshView):
    """
    Uses SimpleJWT's refresh logic; our renderer wraps the response.
    """

    def post(self, request: Request, *args, **kwargs):
        data = request.data.copy()
        if not data.get("refresh"):
            data["refresh"] = request.COOKIES.get(
                getattr(settings, "JWT_REFRESH_COOKIE", "strathmore_university_refresh")
            )

        refresh_token = data.get("refresh")
        session = None
        if refresh_token:
            try:
                refresh_obj = RefreshToken(refresh_token)
                incoming_jti = refresh_obj.get("jti")
                user_id = refresh_obj.get("user_id")
            except Exception:
                incoming_jti = None
                user_id = None

            if incoming_jti and user_id:
                session = (
                    UserSession.objects.filter(
                        user_id=user_id,
                        refresh_jti=incoming_jti,
                        revoked_at__isnull=True,
                    )
                    .order_by("-created_at")
                    .first()
                )

            if not session:
                response = Response(
                    {"detail": "Session is no longer active. Please sign in again."},
                    status=status.HTTP_401_UNAUTHORIZED,
                )
                _clear_auth_cookies(response)
                return response

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)

        new_refresh = serializer.validated_data.get("refresh") or refresh_token
        new_jti = _extract_refresh_jti(new_refresh) if new_refresh else None
        if session:
            session.last_seen = timezone.now()
            update_fields = ["last_seen"]
            if new_jti and new_jti != session.refresh_jti:
                session.refresh_jti = new_jti
                update_fields.append("refresh_jti")
            session.save(update_fields=update_fields)

        response = Response(serializer.validated_data, status=status.HTTP_200_OK)
        _set_auth_cookies(
            response,
            serializer.validated_data.get("access"),
            serializer.validated_data.get("refresh"),
        )
        get_token(request)  # ensure CSRF cookie is set
        return response


class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return User.objects.prefetch_related(
            Prefetch(
                "team_memberships",
                queryset=OrganizerTeamMember.objects.select_related("organizer").prefetch_related("assigned_events"),
            )
        ).get(pk=self.request.user.pk)


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request: Request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        request.user.must_reset_password = False
        request.user.save(update_fields=["must_reset_password"])
        _revoke_user_sessions(request.user)

        response = Response({"message": "Password updated successfully. Please sign in again."})
        _clear_auth_cookies(response)
        return response


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

        # Memory-less token is generated implicitly in the notification service/task. 
        # We don't save anything to the DB anymore.
        _enqueue_task(send_password_reset_email, str(user.id))
        return Response({"message": "If that account exists, you will receive an email shortly."})


class ResetPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request: Request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        _revoke_user_sessions(user)
        return Response({"message": "Password has been reset successfully. Please sign in with your new password."})


class EmailVerificationView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request: Request):
        serializer = EmailVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # Token is already verified inside the serializer's validate() method
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

        _enqueue_task(send_verification_email, str(user.id))
        return Response({"message": "Verification email sent."})


class OrganizerProfileView(generics.RetrieveAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = PublicOrganizerSerializer
    lookup_url_kwarg = "id"

    def get_queryset(self):
        return (
            User.objects.select_related("organizer_profile")
            .filter(
                DjangoQ(organizer_profile__is_approved=True)
                | DjangoQ(events__status__in=["published", "completed"])
            )
            .distinct()
        )


class SecuritySettingsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request: Request):
        settings_obj, _ = UserSecuritySettings.objects.get_or_create(user=request.user)
        if settings_obj.two_factor_enabled:
            settings_obj.two_factor_enabled = False
            settings_obj.save(update_fields=["two_factor_enabled"])
        serializer = SecuritySettingsSerializer(
            {
                "two_factor_enabled": False,
                "two_factor_supported": False,
            }
        )
        return Response(serializer.data)


class TwoFactorToggleView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request: Request):
        enabled = bool(request.data.get("enabled", False))
        settings_obj, _ = UserSecuritySettings.objects.get_or_create(user=request.user)

        if enabled:
            # 2FA is not yet implemented. Return a clear error WITHOUT
            # mutating state â€” previously this accidentally disabled 2FA
            # when a user tried to enable it (logic inversion bug).
            return Response(
                {
                    "detail": "Two-factor authentication setup is not available yet.",
                    "two_factor_enabled": False,
                    "two_factor_supported": False,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # User is disabling 2FA â€” safely turn it off.
        if settings_obj.two_factor_enabled:
            settings_obj.two_factor_enabled = False
            settings_obj.save(update_fields=["two_factor_enabled"])
        return Response({"two_factor_enabled": False, "two_factor_supported": False})


class SessionListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request: Request):
        # Identify the current session by matching the live refresh token JTI
        # from the request cookie â€” not by assuming the newest session is current.
        current_jti = None
        refresh_cookie_name = getattr(settings, "JWT_REFRESH_COOKIE", "strathmore_university_refresh")
        live_refresh = request.COOKIES.get(refresh_cookie_name)
        if live_refresh:
            current_jti = _extract_refresh_jti(live_refresh)

        sessions = list(
            UserSession.objects.filter(user=request.user).order_by("-created_at")
        )
        data = [
            {
                "id": session.id,
                "device": session.device or "Unknown device",
                "location": _get_location_from_ip(session.ip_address),
                "ip_address": session.ip_address or "",
                "revoked": session.revoked_at is not None,
                "last_seen": session.last_seen.isoformat() if session.last_seen else None,
                # A session is "current" if its JTI matches the live cookie AND it's not revoked.
                "current": (
                    current_jti is not None
                    and session.refresh_jti == current_jti
                    and session.revoked_at is None
                ),
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
            _blacklist_refresh_jtis([session.refresh_jti])
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
        if not cache.get("integrations_seeded"):
            if not Integration.objects.exists():
                Integration.objects.bulk_create(
                    [Integration(**item) for item in self.DEFAULT_INTEGRATIONS],
                    ignore_conflicts=True,
                )
            cache.set("integrations_seeded", True, None)

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


class OrganizerPaymentSettingsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request: Request):
        _require_organizer_dashboard_access(request.user, "Only organizers can manage payment settings.")

        profile = _ensure_organizer_profile(request.user)
        stripe_account_id = profile.stripe_account_id or ""
        stripe_ready = _stripe_enabled()

        payload = {
            "stripe_enabled": stripe_ready,
            "stripe_account_id": stripe_account_id or None,
            "connected": bool(stripe_account_id),
            "charges_enabled": False,
            "payouts_enabled": False,
            "details_submitted": False,
            "requirements": {},
            "disabled_reason": "",
            "status": "not_connected" if not stripe_account_id else "pending",
        }

        if not stripe_ready or not stripe_account_id:
            return Response(payload)

        try:
            stripe.api_key = settings.STRIPE_SECRET_KEY
            account = stripe.Account.retrieve(stripe_account_id)
        except stripe.error.StripeError as exc:
            payload["status"] = "error"
            payload["stripe_error"] = exc.user_message or str(exc)
            return Response(payload)

        requirements = account.get("requirements") or {}
        disabled_reason = requirements.get("disabled_reason") or ""
        charges_enabled = bool(account.get("charges_enabled"))
        payouts_enabled = bool(account.get("payouts_enabled"))
        details_submitted = bool(account.get("details_submitted"))

        status_label = "enabled" if charges_enabled and payouts_enabled else "pending"
        if disabled_reason:
            status_label = "restricted"

        payload.update(
            {
                "charges_enabled": charges_enabled,
                "payouts_enabled": payouts_enabled,
                "details_submitted": details_submitted,
                "requirements": requirements,
                "disabled_reason": disabled_reason,
                "status": status_label,
            }
        )
        return Response(payload)


class OrganizerPaymentConnectView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request: Request):
        _require_organizer_dashboard_access(request.user, "Only organizers can manage payment settings.")

        if not _stripe_enabled():
            return Response(
                {"detail": "Stripe is not configured."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        profile = _ensure_organizer_profile(request.user)
        stripe.api_key = settings.STRIPE_SECRET_KEY

        country = (request.data.get("country") or "").upper().strip()
        if not country:
            country = getattr(settings, "STRIPE_CONNECT_COUNTRY", "US")

        try:
            if not profile.stripe_account_id:
                account = stripe.Account.create(
                    type="express",
                    country=country,
                    email=request.user.email,
                    capabilities={
                        "card_payments": {"requested": True},
                        "transfers": {"requested": True},
                    },
                )
                profile.stripe_account_id = account.id
                profile.save(update_fields=["stripe_account_id"])

            frontend_base = getattr(settings, "FRONTEND_URL", "").rstrip("/")
            refresh_url = f"{frontend_base}/organizer-dashboard?tab=settings&settingsTab=payment&stripe=refresh"
            return_url = f"{frontend_base}/organizer-dashboard?tab=settings&settingsTab=payment&stripe=return"

            account_link = stripe.AccountLink.create(
                account=profile.stripe_account_id,
                refresh_url=refresh_url,
                return_url=return_url,
                type="account_onboarding",
            )
        except stripe.error.StripeError as exc:
            return Response(
                {"detail": exc.user_message or "Unable to start Stripe onboarding."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "stripe_account_id": profile.stripe_account_id,
                "url": account_link.url,
            }
        )


class OrganizerPaymentDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request: Request):
        _require_organizer_dashboard_access(request.user, "Only organizers can manage payment settings.")

        if not _stripe_enabled():
            return Response(
                {"detail": "Stripe is not configured."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        profile = _ensure_organizer_profile(request.user)
        if not profile.stripe_account_id:
            return Response(
                {"detail": "No Stripe account connected yet."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        stripe.api_key = settings.STRIPE_SECRET_KEY
        try:
            login_link = stripe.Account.create_login_link(profile.stripe_account_id)
        except stripe.error.StripeError as exc:
            return Response(
                {"detail": exc.user_message or "Unable to open Stripe dashboard."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({"url": login_link.url})


class OrganizerTeamListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request: Request):
        _require_organizer_dashboard_access(request.user, "Only organizers can view team members.")

        members = OrganizerTeamMember.objects.filter(organizer=request.user).select_related("member").prefetch_related("assigned_events")
        serializer = OrganizerTeamMemberSerializer(members, many=True)
        return Response(serializer.data)


class OrganizerTeamInviteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request: Request):
        _require_organizer_dashboard_access(request.user, "Only organizers can invite team members.")

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
                member.must_reset_password = True
                member.save(update_fields=["password", "must_reset_password"])
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
                subject = "You're invited as Strathmore University check-in staff"
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
                checkin_message = (
                    "Once logged in, open Check-in from your organizer dashboard to access this event."
                    if user_can_access_organizer_dashboard(member)
                    else "Once logged in, you'll only see the event(s) you're assigned to."
                )
                body = (
                    f"Hi {first_name},\n\n"
                    f"{organizer_name} assigned you as check-in staff for {event_label}.\n\n"
                    f"Login here: {login_url}\n\n"
                    f"{checkin_message}"
                )
            send_mail(
                subject,
                body,
                getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@strathmoreuniversity.com"),
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
            response["temporary_password_sent"] = True
        return Response(response, status=status.HTTP_201_CREATED)


class OrganizerTeamMemberDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request: Request, pk):
        _require_organizer_dashboard_access(request.user, "Only organizers can update team members.")

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
        _require_organizer_dashboard_access(request.user, "Only organizers can remove team members.")

        member = generics.get_object_or_404(OrganizerTeamMember, pk=pk, organizer=request.user)
        member.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def health(request: Request):
    return Response({"status": "ok"})

class RequestOrganizerRoleView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request: Request, *args, **kwargs):
        user = request.user
        if user.role != "attendee":
            return Response(
                {"success": False, "message": "You already have a special role."},
                status=status.HTTP_400_BAD_REQUEST
            )

        organization_name = (request.data.get("organization_name") or "").strip()
        if not organization_name:
            organization_name = f"{user.first_name} {user.last_name}'s Organization"

        profile, created = OrganizerProfile.objects.get_or_create(
            user=user,
            defaults={"organization_name": organization_name, "is_approved": False}
        )

        if not created and profile.is_approved:
            user.role = "organizer"
            user.save(update_fields=["role"])
            return Response({"success": True, "message": "You are already approved as an organizer."})

        # Notify ALL admin/staff users in-app so the approval queue is never invisible.
        try:
            admin_users = User.objects.filter(
                DjangoQ(is_staff=True) | DjangoQ(role="admin")
            ).only("id")
            notifications = [
                Notification(
                    recipient=admin,
                    notification_type="organizer_message",
                    title="New organizer role request",
                    message=(
                        f"{user.get_full_name() or user.email} has requested an organizer account "
                        f"for '{organization_name}'. Please review and approve or reject."
                    ),
                    action_url="/hub-control-99/accounts/organizerprofile/",
                )
                for admin in admin_users
            ]
            if notifications:
                Notification.objects.bulk_create(notifications, ignore_conflicts=True)
        except Exception:
            logger.exception("Failed to notify admins of organizer request for user %s", user.id)

        return Response(
            {"success": True, "message": "Your request to become an organizer has been submitted and is pending approval."}
        )
