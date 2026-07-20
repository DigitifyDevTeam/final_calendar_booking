from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0030_booking_cancellation'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='booking',
            name='overdue_notified_at',
        ),
    ]
