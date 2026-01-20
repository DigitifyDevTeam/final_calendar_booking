# Generated manually to set existing SAV bookings to null

from django.db import migrations


def set_existing_sav_bookings_to_null(apps, schema_editor):
    """Set pose_effectue_par_wood_agency to null for all existing SAV bookings"""
    Booking = apps.get_model('core', 'Booking')
    
    # Update all SAV bookings (calendar2 or '2') to have null for this field
    Booking.objects.filter(
        calendar_id__in=['calendar2', '2']
    ).update(pose_effectue_par_wood_agency=None)


def reverse_migration(apps, schema_editor):
    """Reverse migration - set to False (but this shouldn't be needed)"""
    Booking = apps.get_model('core', 'Booking')
    Booking.objects.filter(
        calendar_id__in=['calendar2', '2'],
        pose_effectue_par_wood_agency__isnull=True
    ).update(pose_effectue_par_wood_agency=False)


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0013_alter_booking_pose_effectue_par_wood_agency'),
    ]

    operations = [
        migrations.RunPython(set_existing_sav_bookings_to_null, reverse_migration),
    ]
