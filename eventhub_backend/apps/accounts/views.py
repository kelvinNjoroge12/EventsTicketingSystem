from __future__ import annotations

import uuid

from django.contrib.auth import get_user_model
from django.utils import timezone
from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit
from rest_framework import generics, permissions, status
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
)
from .tasks import send_password_reset_email, send_verification_email, send_welcome_email

User = get_user_model()


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
        return Response(serializer.data, status=status.HTTP_200_OK)


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request: Request):
        refresh_token = request.data.get("refresh")
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
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


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def health(request: Request):
    return Response({"status": "ok"})

