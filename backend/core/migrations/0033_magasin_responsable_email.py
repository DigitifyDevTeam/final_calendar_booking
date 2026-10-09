from django.db import migrations, models


def ensure_responsable_email_column(apps, schema_editor):
    """
    Add responsable_email only if missing.
    Some local DBs already have the column from earlier experiments.
    """
    with schema_editor.connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'core_magasin'
              AND COLUMN_NAME = 'responsable_email'
            """
        )
        exists = cursor.fetchone()[0] > 0
        if not exists:
            cursor.execute(
                "ALTER TABLE core_magasin "
                "ADD COLUMN responsable_email VARCHAR(254) NOT NULL DEFAULT ''"
            )


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0032_remove_booking_cancellation_comment'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name='magasin',
                    name='responsable_email',
                    field=models.EmailField(
                        blank=True,
                        default='',
                        help_text='Adresse e-mail du responsable du magasin',
                        max_length=254,
                    ),
                ),
            ],
            database_operations=[
                migrations.RunPython(ensure_responsable_email_column, noop_reverse),
            ],
        ),
    ]
