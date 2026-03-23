from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0004_order_registration"),
    ]

    operations = [
        migrations.AlterField(
            model_name="ticket",
            name="status",
            field=models.CharField(
                choices=[
                    ("valid", "Valid"),
                    ("used", "Used"),
                    ("expired", "Expired"),
                    ("cancelled", "Cancelled"),
                    ("refunded", "Refunded"),
                ],
                default="valid",
                max_length=20,
            ),
        ),
    ]
