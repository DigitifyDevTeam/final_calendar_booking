from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0027_add_ascenseur_escaliers'),
    ]

    operations = [
        migrations.AddField(
            model_name='booking',
            name='overdue_notified_at',
            field=models.DateTimeField(
                blank=True,
                help_text='Date d\'envoi de la notification admin pour dépassement de la date de fin (SAV/Métré)',
                null=True,
            ),
        ),
    ]
