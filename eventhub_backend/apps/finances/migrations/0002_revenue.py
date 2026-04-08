from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    dependencies = [
        ("events", "0002_make_description_optional"),
        ("finances", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Revenue",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("description", models.CharField(max_length=255)),
                ("amount", models.DecimalField(decimal_places=2, max_digits=12)),
                (
                    "source",
                    models.CharField(
                        choices=[
                            ("ticket_sales", "Ticket Sales"),
                            ("sponsorship", "Sponsorship"),
                            ("vendor", "Vendor Booth"),
                            ("donation", "Donation"),
                            ("other", "Other"),
                        ],
                        default="other",
                        max_length=20,
                    ),
                ),
                ("date", models.DateField(auto_now_add=True)),
                (
                    "event",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="revenues",
                        to="events.event",
                    ),
                ),
            ],
            options={
                "ordering": ["-date", "-created_at"],
            },
        ),
    ]
