from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("events", "0004_event_reminders_sent"),
    ]

    operations = [
        migrations.AddField(
            model_name="event",
            name="display_priority",
            field=models.IntegerField(
                default=0,
                help_text="Higher numbers appear first in public event listings.",
            ),
        ),
        migrations.AlterModelOptions(
            name="event",
            options={"ordering": ["-display_priority", "start_date", "start_time", "-published_at"]},
        ),
        migrations.AddIndex(
            model_name="event",
            index=models.Index(
                fields=["status", "display_priority", "start_date"],
                name="events_status_priority_idx",
            ),
        ),
    ]
