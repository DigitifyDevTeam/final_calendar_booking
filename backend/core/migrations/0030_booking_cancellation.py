from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0029_user_is_referent'),
    ]

    operations = [
        migrations.AlterField(
            model_name='booking',
            name='status',
            field=models.CharField(
                choices=[
                    ('en_attente', 'En attente'),
                    ('termine', 'Terminé'),
                    ('annule', 'Annulé'),
                ],
                default='en_attente',
                help_text='Statut de la réservation (en attente, terminé ou annulé)',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='booking',
            name='cancellation_motif',
            field=models.TextField(blank=True, help_text="Motif d'annulation de l'intervention"),
        ),
        migrations.AddField(
            model_name='booking',
            name='cancelled_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
