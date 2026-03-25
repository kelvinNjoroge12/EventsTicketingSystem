from __future__ import annotations

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0003_add_must_reset_password"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="user",
            name="password_reset_token",
        ),
        migrations.RemoveField(
            model_name="user",
            name="password_reset_token_expires",
        ),
    ]
