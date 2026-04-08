from __future__ import annotations

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse

from apps.tickets.models import Course, School


def _admin_client(client):
    user_model = get_user_model()
    admin_user = user_model.objects.create_superuser(
        email="admin@example.com",
        password="StrongPass1",
        first_name="Admin",
        last_name="User",
    )
    client.force_login(admin_user)
    return client


def test_school_admin_upload_imports_csv(db, client):
    admin_client = _admin_client(client)
    upload = SimpleUploadedFile(
        "schools.csv",
        b"name,code,sort_order\nSchool of Accounting,SOA,7\n",
        content_type="text/csv",
    )

    response = admin_client.post(
        reverse("admin:tickets_school_upload"),
        {"file": upload},
        follow=True,
    )

    assert response.status_code == 200
    school = School.objects.get(name="School of Accounting")
    assert school.code == "SOA"
    assert school.sort_order == 7


def test_course_admin_upload_imports_csv_without_school(db, client):
    admin_client = _admin_client(client)
    upload = SimpleUploadedFile(
        "courses.csv",
        (
            b"name,code,sort_order\n"
            b"Bachelor of Business Information Technology,BBIT,0\n"
        ),
        content_type="text/csv",
    )

    response = admin_client.post(
        reverse("admin:tickets_course_upload"),
        {"file": upload},
        follow=True,
    )

    assert response.status_code == 200
    course = Course.objects.get(name="Bachelor of Business Information Technology")
    assert course.code == "BBIT"
    assert course.sort_order == 0
    assert course.school is None
