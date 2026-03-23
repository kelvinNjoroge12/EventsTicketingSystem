from __future__ import annotations

from django.contrib.auth.tokens import default_token_generator
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import UserSession
from common.tokens import generate_secure_token
from .factories import OrganizerUserFactory, UserFactory


def test_register_attendee_success(db):
    client = APIClient()
    url = reverse("register")
    payload = {
        "email": "newuser@example.com",
        "first_name": "New",
        "last_name": "User",
        "password": "StrongPass1",
        "confirm_password": "StrongPass1",
        "role": "attendee",
    }
    resp = client.post(url, payload, format="json")
    assert resp.status_code == status.HTTP_201_CREATED


def test_register_organizer_creates_profile(db):
    client = APIClient()
    url = reverse("register")
    payload = {
        "email": "org@example.com",
        "first_name": "Org",
        "last_name": "User",
        "password": "StrongPass1",
        "confirm_password": "StrongPass1",
        "role": "organizer",
    }
    resp = client.post(url, payload, format="json")
    assert resp.status_code == status.HTTP_201_CREATED
    # Public registration should always resolve to attendee.
    assert resp.data["user"]["role"] == "attendee"


def test_register_duplicate_email_fails(db):
    existing = UserFactory(email="dup@example.com")
    client = APIClient()
    url = reverse("register")
    payload = {
        "email": existing.email,
        "first_name": "New",
        "last_name": "User",
        "password": "StrongPass1",
        "confirm_password": "StrongPass1",
        "role": "attendee",
    }
    resp = client.post(url, payload, format="json")
    assert resp.status_code == status.HTTP_400_BAD_REQUEST


def test_register_weak_password_fails(db):
    client = APIClient()
    url = reverse("register")
    payload = {
        "email": "weak@example.com",
        "first_name": "Weak",
        "last_name": "Pass",
        "password": "weak",
        "confirm_password": "weak",
        "role": "attendee",
    }
    resp = client.post(url, payload, format="json")
    assert resp.status_code == status.HTTP_400_BAD_REQUEST


def test_login_success_returns_tokens(db):
    user = UserFactory(password="StrongPass1")
    client = APIClient()
    url = reverse("login")
    resp = client.post(url, {"email": user.email, "password": "StrongPass1"}, format="json")
    assert resp.status_code == status.HTTP_200_OK
    assert "tokens" in resp.data


def test_login_unverified_email_fails(db, settings):
    settings.REQUIRE_EMAIL_VERIFICATION = True
    user = UserFactory(is_email_verified=False, password="StrongPass1")
    client = APIClient()
    url = reverse("login")
    resp = client.post(url, {"email": user.email, "password": "StrongPass1"}, format="json")
    assert resp.status_code == status.HTTP_400_BAD_REQUEST


def test_login_wrong_password_fails(db):
    user = UserFactory(password="StrongPass1")
    client = APIClient()
    url = reverse("login")
    resp = client.post(url, {"email": user.email, "password": "WrongPass1"}, format="json")
    assert resp.status_code == status.HTTP_400_BAD_REQUEST


def test_forgot_password_always_returns_200(db):
    user = UserFactory()
    client = APIClient()
    url = reverse("forgot_password")
    resp = client.post(url, {"email": user.email}, format="json")
    assert resp.status_code == status.HTTP_200_OK


def test_reset_password_valid_token(db, django_user_model):
    user = UserFactory()

    client = APIClient()
    url = reverse("reset_password")
    token = generate_secure_token(user, default_token_generator)
    resp = client.post(
        url,
        {
            "token": token,
            "new_password": "NewStrong1",
            "confirm_password": "NewStrong1",
        },
        format="json",
    )
    assert resp.status_code == status.HTTP_200_OK


def test_reset_password_expired_token_fails(db):
    user = UserFactory()
    invalid_token = "invalid.token"

    client = APIClient()
    url = reverse("reset_password")
    resp = client.post(
        url,
        {
            "token": invalid_token,
            "new_password": "NewStrong1",
            "confirm_password": "NewStrong1",
        },
        format="json",
    )
    assert resp.status_code == status.HTTP_400_BAD_REQUEST


def test_public_organizer_profile_hides_sensitive_fields(db):
    organizer = OrganizerUserFactory()
    organizer.organizer_profile.is_approved = True
    organizer.organizer_profile.stripe_account_id = "acct_12345"
    organizer.organizer_profile.save(update_fields=["is_approved", "stripe_account_id"])

    client = APIClient()
    url = reverse("organizer_profile", kwargs={"id": organizer.id})
    resp = client.get(url)

    assert resp.status_code == status.HTTP_200_OK
    assert "email" not in resp.data
    assert "is_email_verified" not in resp.data
    assert "must_reset_password" not in resp.data
    assert "created_at" not in resp.data
    assert "stripe_account_id" not in resp.data["organizer_profile"]


def test_refresh_rejected_for_revoked_session(db):
    user = UserFactory(password="StrongPass1")
    client = APIClient()
    login_resp = client.post(
        reverse("login"),
        {"email": user.email, "password": "StrongPass1"},
        format="json",
    )
    assert login_resp.status_code == status.HTTP_200_OK

    refresh_token = login_resp.data["tokens"]["refresh"]
    access_token = login_resp.data["tokens"]["access"]
    session = UserSession.objects.get(user=user, refresh_jti__isnull=False, revoked_at__isnull=True)

    client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
    revoke_resp = client.post(reverse("session-revoke", kwargs={"pk": session.id}), {}, format="json")
    assert revoke_resp.status_code == status.HTTP_200_OK

    client.credentials()
    refresh_resp = client.post(reverse("token_refresh"), {"refresh": refresh_token}, format="json")
    assert refresh_resp.status_code == status.HTTP_401_UNAUTHORIZED


def test_reset_password_revokes_existing_refresh_sessions(db):
    user = UserFactory(password="StrongPass1")
    client = APIClient()
    login_resp = client.post(
        reverse("login"),
        {"email": user.email, "password": "StrongPass1"},
        format="json",
    )
    assert login_resp.status_code == status.HTTP_200_OK

    old_refresh = login_resp.data["tokens"]["refresh"]
    user.refresh_from_db()
    token = generate_secure_token(user, default_token_generator)
    reset_resp = client.post(
        reverse("reset_password"),
        {
            "token": token,
            "new_password": "BrandNewPass1",
            "confirm_password": "BrandNewPass1",
        },
        format="json",
    )
    assert reset_resp.status_code == status.HTTP_200_OK

    refresh_resp = client.post(reverse("token_refresh"), {"refresh": old_refresh}, format="json")
    assert refresh_resp.status_code == status.HTTP_401_UNAUTHORIZED


def test_two_factor_enable_returns_error_until_supported(db):
    user = UserFactory(password="StrongPass1")
    client = APIClient()
    login_resp = client.post(
        reverse("login"),
        {"email": user.email, "password": "StrongPass1"},
        format="json",
    )
    assert login_resp.status_code == status.HTTP_200_OK

    access_token = login_resp.data["tokens"]["access"]
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
    resp = client.post(reverse("two-factor-toggle"), {"enabled": True}, format="json")

    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert resp.data.get("two_factor_enabled") is False
    assert resp.data.get("two_factor_supported") is False
