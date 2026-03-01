from __future__ import annotations

import factory
from django.contrib.auth import get_user_model

from apps.accounts.models import OrganizerProfile

User = get_user_model()


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User

    email = factory.Sequence(lambda n: f"user{n}@example.com")
    first_name = "Test"
    last_name = factory.Sequence(lambda n: f"User{n}")
    role = "attendee"
    is_email_verified = True

    @factory.post_generation
    def password(self, create, extracted, **kwargs):
        pwd = extracted or "StrongPass1"
        self.set_password(pwd)
        if create:
            self.save()


class OrganizerUserFactory(UserFactory):
    role = "organizer"

    @factory.post_generation
    def organizer_profile(self, create, extracted, **kwargs):
        if not create:
            return
        OrganizerProfile.objects.get_or_create(
            user=self,
            defaults={"organization_name": f"Org {self.first_name}"},
        )

