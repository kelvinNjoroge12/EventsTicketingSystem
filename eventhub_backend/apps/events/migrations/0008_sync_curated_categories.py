from django.db import migrations

from apps.events.category_catalog import ensure_curated_categories


def sync_curated_categories(apps, schema_editor):
    Category = apps.get_model("events", "Category")
    Event = apps.get_model("events", "Event")
    ensure_curated_categories(Category, Event)


class Migration(migrations.Migration):

    dependencies = [
        ("events", "0007_alter_event_options_and_more"),
    ]

    operations = [
        migrations.RunPython(sync_curated_categories, migrations.RunPython.noop),
    ]
