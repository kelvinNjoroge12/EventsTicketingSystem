from __future__ import annotations

from celery import shared_task
from django.contrib.auth import get_user_model

from apps.notifications.email_service import EmailService

User = get_user_model()


@shared_task
def send_verification_email(user_id: str) -> None:
    user = User.objects.get(id=user_id)
    EmailService().send_verification_email(user)


@shared_task
def send_password_reset_email(user_id: str) -> None:
    user = User.objects.get(id=user_id)
    EmailService().send_password_reset(user)


@shared_task
def send_welcome_email(user_id: str) -> None:
    user = User.objects.get(id=user_id)
    EmailService().send_organizer_welcome(user)

