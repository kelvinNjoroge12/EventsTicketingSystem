from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="email_sent",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="order",
            name="email_sent_at",
            field=models.DateTimeField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name="order",
            name="email_error",
            field=models.TextField(blank=True, default=""),
            preserve_default=False,
        ),
    ]
