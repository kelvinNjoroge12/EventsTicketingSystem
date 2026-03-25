# Generated manually to update payment_method choices

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0002_add_email_tracking_to_order'),
    ]

    operations = [
        migrations.AlterField(
            model_name='order',
            name='payment_method',
            field=models.CharField(choices=[('card', 'Card'), ('stripe', 'Stripe'), ('mpesa', 'M-Pesa'), ('free', 'Free')], max_length=20),
        ),
    ]
