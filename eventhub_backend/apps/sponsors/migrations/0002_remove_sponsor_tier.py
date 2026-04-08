from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("sponsors", "0001_initial"),
    ]

    operations = [
        migrations.AlterModelOptions(
            name="sponsor",
            options={"ordering": ["sort_order", "name"]},
        ),
        migrations.RemoveIndex(
            model_name="sponsor",
            name="sponsors_sp_event_i_51140c_idx",
        ),
        migrations.RemoveField(
            model_name="sponsor",
            name="tier",
        ),
    ]
