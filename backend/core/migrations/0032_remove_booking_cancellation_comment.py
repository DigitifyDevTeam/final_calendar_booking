from django.db import migrations, models


def drop_cancellation_comment_column(apps, schema_editor):
    """
    Orphan MySQL column left from a removed cancel feature.
    It has no Django model field and no default, so INSERT into core_booking fails.
    """
    with schema_editor.connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'core_booking'
              AND COLUMN_NAME = 'cancellation_comment'
            """
        )
        exists = cursor.fetchone()[0] > 0
        if exists:
            cursor.execute("ALTER TABLE core_booking DROP COLUMN cancellation_comment")


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0031_remove_booking_overdue_notified_at'),
    ]

    operations = [
        migrations.RunPython(drop_cancellation_comment_column, noop_reverse),
        migrations.AlterField(
            model_name='booking',
            name='cancellation_motif',
            field=models.TextField(
                blank=True,
                default='',
                help_text="Motif d'annulation de l'intervention",
            ),
        ),
    ]
