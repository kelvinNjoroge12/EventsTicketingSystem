from __future__ import annotations

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.tickets.models import Course, School


def _payload(response):
    data = response.data
    if isinstance(data, dict) and "data" in data:
        return data["data"]
    return data


def test_public_academics_endpoints_return_unpaginated_active_lists(db):
    active_school = School.objects.create(name="School of Computing and Engineering Sciences", is_active=True)
    inactive_school = School.objects.create(name="Inactive School", is_active=False)
    active_course = Course.objects.create(
        name="Bachelor of Business Information Technology",
        school=active_school,
        is_active=True,
    )
    Course.objects.create(
        name="Archived Course",
        school=inactive_school,
        is_active=False,
    )

    client = APIClient()

    schools_response = client.get(reverse("schools-list"))
    schools_payload = _payload(schools_response)

    assert schools_response.status_code == status.HTTP_200_OK
    assert isinstance(schools_payload, list)
    assert [item["name"] for item in schools_payload] == [active_school.name]

    courses_response = client.get(reverse("courses-list"), {"school": str(active_school.id)})
    courses_payload = _payload(courses_response)

    assert courses_response.status_code == status.HTTP_200_OK
    assert isinstance(courses_payload, list)
    assert [item["name"] for item in courses_payload] == [active_course.name]
