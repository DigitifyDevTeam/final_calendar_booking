"""
Django management command to import all calendar data from JSON files and delete Sunday bookings.
Usage: python manage.py import_and_clean_calendars [--clear]
"""
from django.core.management.base import BaseCommand
from django.core.management import call_command
from core.models import Booking


class Command(BaseCommand):
    help = 'Import all calendar bookings (Pose, SAV, Metré) from JSON files and delete Sunday bookings'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear all existing bookings before importing'
        )

    def handle(self, *args, **options):
        clear_existing = options['clear']
        
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(self.style.SUCCESS('Importing All Calendar Data'))
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write('')
        
        # Import Pose calendar
        self.stdout.write(self.style.WARNING('Importing Pose calendar (calendar1)...'))
        call_command('import_pose_data', clear=clear_existing)
        self.stdout.write('')
        
        # Import SAV calendar
        self.stdout.write(self.style.WARNING('Importing SAV calendar (calendar2)...'))
        call_command('import_sav_data', clear=clear_existing)
        self.stdout.write('')
        
        # Import Metré calendar
        self.stdout.write(self.style.WARNING('Importing Metré calendar (calendar3)...'))
        call_command('import_metre_data', clear=clear_existing)
        self.stdout.write('')
        
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(self.style.SUCCESS('All imports completed!'))
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write('')
        
        # Delete all bookings on Sunday (dimanche)
        # weekday() returns 0=Monday, 6=Sunday
        self.stdout.write(self.style.WARNING('Deleting all bookings on Sunday (dimanche)...'))
        
        # Get all bookings and filter for Sunday (weekday == 6)
        # Use iterator() to process bookings in chunks for memory efficiency
        all_bookings = Booking.objects.all().iterator(chunk_size=1000)
        sunday_bookings_ids = [
            booking.id for booking in all_bookings 
            if booking.booking_date.weekday() == 6
        ]
        sunday_count = len(sunday_bookings_ids)
        
        if sunday_count > 0:
            # Delete Sunday bookings using bulk delete
            deleted_count, _ = Booking.objects.filter(id__in=sunday_bookings_ids).delete()
            self.stdout.write(self.style.SUCCESS(f'Deleted {deleted_count} booking(s) on Sunday'))
        else:
            self.stdout.write(self.style.SUCCESS('No Sunday bookings found to delete'))
        
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(self.style.SUCCESS('Import and cleanup completed!'))
        self.stdout.write(self.style.SUCCESS('=' * 60))
