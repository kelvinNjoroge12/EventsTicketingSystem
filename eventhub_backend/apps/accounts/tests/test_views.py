from __future__ import annotations

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

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


def test_login_unverified_email_fails(db):
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
    from django.utils import timezone
    import uuid

    user.password_reset_token = uuid.uuid4()
    user.password_reset_token_expires = timezone.now() + timezone.timedelta(hours=1)
    user.save()

    client = APIClient()
    url = reverse("reset_password")
    resp = client.post(
        url,
        {
            "token": str(user.password_reset_token),
            "new_password": "NewStrong1",
            "confirm_password": "NewStrong1",
        },
        format="json",
    )
    assert resp.status_code == status.HTTP_200_OK


def test_reset_password_expired_token_fails(db):
    from django.utils import timezone
    import uuid

    user = UserFactory()
    user.password_reset_token = uuid.uuid4()
    user.password_reset_token_expires = timezone.now() - timezone.timedelta(hours=1)
    user.save()

    client = APIClient()
    url = reverse("reset_password")
    resp = client.post(
        url,
        {
            "token": str(user.password_reset_token),
            "new_password": "NewStrong1",
            "confirm_password": "NewStrong1",
        },
        format="json",
    )
    assert resp.status_code == status.HTTP_400_BAD_REQUEST

