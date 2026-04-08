from __future__ import annotations

from functools import lru_cache

from django.db import connection

from .models import Event


OPTIONAL_EVENT_FIELDS = {
    "display_priority": "display_priority",
    "approval_requested_at": "approval_requested_at",
    "reviewed_at": "reviewed_at",
    "reviewed_by": "reviewed_by_id",
    "review_notes": "review_notes",
}


@lru_cache(maxsize=1)
def get_available_optional_event_fields() -> set[str]:
    try:
        with connection.cursor() as cursor:
            description = connection.introspection.get_table_description(cursor, Event._meta.db_table)
    except Exception:
        return set(OPTIONAL_EVENT_FIELDS)

    available_columns = {column.name for column in description}
    return {
        field_name
        for field_name, column_name in OPTIONAL_EVENT_FIELDS.items()
        if column_name in available_columns
    }


def has_optional_event_field(field_name: str) -> bool:
    return field_name in get_available_optional_event_fields()


def missing_optional_event_fields() -> list[str]:
    available = get_available_optional_event_fields()
    return [field_name for field_name in OPTIONAL_EVENT_FIELDS if field_name not in available]


def apply_event_schema_compat(queryset):
    missing_fields = missing_optional_event_fields()
    if missing_fields:
        queryset = queryset.defer(*missing_fields)
    return queryset


def get_event_attr(obj, field_name: str, default=None):
    deferred_fields = set()
    if hasattr(obj, "get_deferred_fields"):
        deferred_fields = obj.get_deferred_fields()
    if field_name in deferred_fields and field_name in OPTIONAL_EVENT_FIELDS:
        return default
    try:
        return getattr(obj, field_name)
    except Exception:
        return default


def update_event_with_available_fields(event: Event, **values) -> Event:
    update_fields = []
    for field_name, value in values.items():
        if field_name in OPTIONAL_EVENT_FIELDS and not has_optional_event_field(field_name):
            continue
        setattr(event, field_name, value)
        update_fields.append(field_name)

    if update_fields:
        event.save(update_fields=update_fields)
    return event
