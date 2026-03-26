from __future__ import annotations

from django.core.management import call_command

from apps.tickets.models import Course, School


def test_seed_academics_catalog_is_idempotent_and_reactivates_catalog_rows(db):
    call_command("seed_academics_catalog")

    initial_school_count = School.objects.count()
    initial_course_count = Course.objects.count()

    school = School.objects.get(name="School of Accounting")
    course = Course.objects.get(
        school__name="Strathmore University Business School",
        name="Project Management Professional (PMP)",
    )

    school.is_active = False
    school.sort_order = 999
    school.save(update_fields=["is_active", "sort_order"])

    course.is_active = False
    course.sort_order = 999
    course.save(update_fields=["is_active", "sort_order"])

    call_command("seed_academics_catalog")

    school.refresh_from_db()
    course.refresh_from_db()

    assert school.is_active is True
    assert school.sort_order != 999
    assert course.is_active is True
    assert course.sort_order != 999
    assert School.objects.count() == initial_school_count
    assert Course.objects.count() == initial_course_count
