from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.tickets.models import Course, School

from .seed_strathmore import SCHOOLS_COURSES


class Command(BaseCommand):
    help = "Idempotently seed the Strathmore schools and courses catalog without modifying events."

    def add_arguments(self, parser):
        parser.add_argument(
            "--deactivate-missing",
            action="store_true",
            help="Mark schools/courses that are not in the catalog as inactive instead of leaving them untouched.",
        )

    def handle(self, *args, **options):
        deactivate_missing = options.get("deactivate_missing", False)
        school_names = list(SCHOOLS_COURSES.keys())

        created_schools = 0
        updated_schools = 0
        created_courses = 0
        updated_courses = 0

        with transaction.atomic():
            for school_index, (school_name, courses) in enumerate(SCHOOLS_COURSES.items()):
                school, school_created = School.objects.get_or_create(
                    name=school_name,
                    defaults={
                        "is_active": True,
                        "sort_order": school_index,
                    },
                )
                if school_created:
                    created_schools += 1
                school_updates = []
                if not school.is_active:
                    school.is_active = True
                    school_updates.append("is_active")
                if school.sort_order != school_index:
                    school.sort_order = school_index
                    school_updates.append("sort_order")
                if school_updates:
                    school.save(update_fields=school_updates)
                    if not school_created:
                        updated_schools += 1

                for course_index, course_name in enumerate(courses):
                    course, course_created = Course.objects.get_or_create(
                        school=school,
                        name=course_name,
                        defaults={
                            "is_active": True,
                            "sort_order": course_index,
                        },
                    )
                    if course_created:
                        created_courses += 1
                    course_updates = []
                    if not course.is_active:
                        course.is_active = True
                        course_updates.append("is_active")
                    if course.sort_order != course_index:
                        course.sort_order = course_index
                        course_updates.append("sort_order")
                    if course_updates:
                        course.save(update_fields=course_updates)
                        if not course_created:
                            updated_courses += 1

            if deactivate_missing:
                updated_schools += School.objects.exclude(name__in=school_names).update(is_active=False)
                updated_courses += (
                    Course.objects.exclude(
                        pk__in=Course.objects.filter(
                            school__name__in=school_names,
                        ).values_list("pk", flat=True)
                    )
                    .exclude(school__isnull=True)
                    .update(is_active=False)
                )
                # Deactivate courses linked to seeded schools that are absent from the catalog.
                for school_name in school_names:
                    allowed_courses = set(SCHOOLS_COURSES[school_name])
                    updated_courses += (
                        Course.objects.filter(school__name=school_name)
                        .exclude(name__in=allowed_courses)
                        .update(is_active=False)
                    )

        self.stdout.write(
            self.style.SUCCESS(
                "Academic catalog seeded. "
                f"Schools: +{created_schools} created, {updated_schools} updated. "
                f"Courses: +{created_courses} created, {updated_courses} updated."
            )
        )
