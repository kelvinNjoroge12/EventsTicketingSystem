from __future__ import annotations

from django.urls import path

from .views import (
    ChangePasswordView,
    EmailVerificationView,
    ForgotPasswordView,
    LoginView,
    LogoutView,
    OrganizerProfileView,
    RegisterView,
    ResendVerificationView,
    ResetPasswordView,
    TokenRefreshView,
    UserProfileView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("profile/", UserProfileView.as_view(), name="profile"),
    path("change-password/", ChangePasswordView.as_view(), name="change_password"),
    path("forgot-password/", ForgotPasswordView.as_view(), name="forgot_password"),
    path("reset-password/", ResetPasswordView.as_view(), name="reset_password"),
    path("verify-email/", EmailVerificationView.as_view(), name="verify_email"),
    path("resend-verification/", ResendVerificationView.as_view(), name="resend_verification"),
    path("organizers/<uuid:id>/", OrganizerProfileView.as_view(), name="organizer_profile"),
]

