from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0002_integration_alter_user_role_usersecuritysettings_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="must_reset_password",
            field=models.BooleanField(default=False),
        ),
    ]
