from __future__ import annotations

from django.contrib.auth import get_user_model


def test_user_str(db):
    user = get_user_model().objects.create_user(
        email="test@example.com",
        password="StrongPass1",
        first_name="Test",
        last_name="User",
    )
    assert str(user) == "test@example.com"

