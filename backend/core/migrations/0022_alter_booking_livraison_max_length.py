# Generated migration to ensure livraison field has correct max_length

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0021_booking_livraison'),
    ]

    operations = [
        # Use RunSQL to directly alter the column in MySQL to ensure max_length=50
        migrations.RunSQL(
            sql="ALTER TABLE core_booking MODIFY COLUMN livraison VARCHAR(50) NULL;",
            reverse_sql="ALTER TABLE core_booking MODIFY COLUMN livraison VARCHAR(20) NULL;",
        ),
        migrations.AlterField(
            model_name='booking',
            name='livraison',
            field=models.CharField(blank=True, choices=[('livre_chez_client', 'Livré chez le client'), ('venir_chercher_magasin', 'Venir chercher au magasin')], help_text='Mode de livraison (SAV calendar only)', max_length=50, null=True),
        ),
    ]
