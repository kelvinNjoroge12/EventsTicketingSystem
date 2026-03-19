from __future__ import annotations

import csv
from collections import OrderedDict
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.tickets.models import School, Course


class Command(BaseCommand):
    help = "Seed School and Course data from an Excel or CSV file."

    def add_arguments(self, parser):
        parser.add_argument(
            "--path",
            required=True,
            help="Path to the Excel (.xlsx) or CSV file containing School and Course columns.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Parse and report counts without writing to the database.",
        )

    def handle(self, *args, **options):
        path = Path(options["path"])
        if not path.exists():
            raise CommandError(f"File not found: {path}")

        rows = self._load_rows(path)
        if not rows:
            self.stdout.write(self.style.WARNING("No rows found in file."))
            return

        schools_map: OrderedDict[str, dict] = OrderedDict()
        for school_name, course_name in rows:
            school = (school_name or "").strip()
            course = (course_name or "").strip()
            if not school or not course:
                continue

            key = school.lower()
            if key not in schools_map:
                schools_map[key] = {"name": school, "courses": OrderedDict()}
            course_key = course.lower()
            schools_map[key]["courses"][course_key] = course

        if not schools_map:
            self.stdout.write(self.style.WARNING("No valid school/course pairs found."))
            return

        if options["dry_run"]:
            total_courses = sum(len(item["courses"]) for item in schools_map.values())
            self.stdout.write(self.style.SUCCESS(
                f"Dry run: {len(schools_map)} schools, {total_courses} courses ready to seed."
            ))
            return

        created_schools = 0
        created_courses = 0

        with transaction.atomic():
            for order, (school_key, payload) in enumerate(schools_map.items()):
                school_name = payload["name"]
                school = School.objects.filter(name__iexact=school_name).first()
                if not school:
                    school = School.objects.create(name=school_name, sort_order=order)
                    created_schools += 1

                for course_order, course_name in enumerate(payload["courses"].values()):
                    course = Course.objects.filter(school=school, name__iexact=course_name).first()
                    if course:
                        continue
                    Course.objects.create(name=course_name, school=school, sort_order=course_order)
                    created_courses += 1

        self.stdout.write(self.style.SUCCESS(
            f"Seeded {created_schools} new schools and {created_courses} new courses."
        ))

    def _load_rows(self, path: Path):
        suffix = path.suffix.lower()
        if suffix == ".csv":
            return self._load_csv(path)
        if suffix == ".xlsx":
            return self._load_xlsx(path)
        raise CommandError("Unsupported file type. Please upload a .csv or .xlsx file.")

    def _load_csv(self, path: Path):
        rows = []
        with path.open("r", encoding="utf-8-sig") as handle:
            reader = csv.reader(handle)
            for idx, row in enumerate(reader):
                if not row:
                    continue
                if idx == 0 and self._looks_like_header(row):
                    continue
                school = row[0] if len(row) > 0 else ""
                course = row[1] if len(row) > 1 else ""
                rows.append((school, course))
        return rows

    def _load_xlsx(self, path: Path):
        try:
            import openpyxl
        except Exception as exc:
            raise CommandError("openpyxl is required to parse Excel files.") from exc

        wb = openpyxl.load_workbook(path, data_only=True)
        ws = wb.active
        rows = []
        for idx, row in enumerate(ws.iter_rows(values_only=True)):
            if not row:
                continue
            if idx == 0 and self._looks_like_header(row):
                continue
            school = row[0] if len(row) > 0 else ""
            course = row[1] if len(row) > 1 else ""
            rows.append((school, course))
        return rows

    @staticmethod
    def _looks_like_header(row):
        header = " ".join(str(item or "").lower() for item in row[:2])
        return "school" in header and "course" in header
