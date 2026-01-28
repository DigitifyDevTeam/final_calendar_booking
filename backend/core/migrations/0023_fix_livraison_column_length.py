# Migration to fix livraison column length in MySQL database
# This ensures the column has max_length=50 to accommodate 'venir_chercher_magasin' (23 chars)

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0022_alter_booking_livraison_max_length'),
    ]

    operations = [
        # Force alter the column to VARCHAR(50) in MySQL
        migrations.RunSQL(
            sql=[
                "ALTER TABLE core_booking MODIFY COLUMN livraison VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL;",
            ],
            reverse_sql=[
                "ALTER TABLE core_booking MODIFY COLUMN livraison VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL;",
            ],
        ),
    ]
