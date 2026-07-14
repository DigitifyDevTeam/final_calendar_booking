from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0028_booking_overdue_notified_at'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='is_referent',
            field=models.BooleanField(
                default=False,
                help_text='Concepteur référent du magasin — consultation magasin, modification limitée aux siennes',
            ),
        ),
    ]
