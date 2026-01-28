# Generated migration to add raison field to Booking model

from django.db import migrations, models


def add_or_modify_raison_column(apps, schema_editor):
    """
    Add raison column if it doesn't exist, or modify it if it does.
    This handles the case where the column might already exist in the database.
    """
    with schema_editor.connection.cursor() as cursor:
        # Check if column exists
        cursor.execute("""
            SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'core_booking'
            AND COLUMN_NAME = 'raison'
        """)
        column_exists = cursor.fetchone()[0] > 0
        
        if column_exists:
            # Column exists, just modify it to ensure correct length
            cursor.execute("""
                ALTER TABLE core_booking 
                MODIFY COLUMN raison VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL
            """)
        else:
            # Column doesn't exist, add it
            cursor.execute("""
                ALTER TABLE core_booking 
                ADD COLUMN raison VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL
            """)


def reverse_add_or_modify_raison_column(apps, schema_editor):
    """Reverse migration - drop the raison column if it exists."""
    with schema_editor.connection.cursor() as cursor:
        cursor.execute("""
            SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'core_booking'
            AND COLUMN_NAME = 'raison'
        """)
        column_exists = cursor.fetchone()[0] > 0
        
        if column_exists:
            cursor.execute("ALTER TABLE core_booking DROP COLUMN raison")


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0023_fix_livraison_column_length'),
    ]

    operations = [
        # Separate database operations from state operations
        # This allows us to handle the case where the column might already exist
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(
                    add_or_modify_raison_column,
                    reverse_add_or_modify_raison_column,
                ),
            ],
            state_operations=[
                migrations.AddField(
                    model_name='booking',
                    name='raison',
                    field=models.CharField(blank=True, choices=[('erreur_poseur', 'Erreur Poseur'), ('erreur_concepteur', 'Erreur concepteur'), ('erreur_livraison', 'Erreur livraison'), ('manquant', 'Manquant')], help_text='Raison du SAV (SAV calendar only)', max_length=50, null=True),
                ),
            ],
        ),
    ]
