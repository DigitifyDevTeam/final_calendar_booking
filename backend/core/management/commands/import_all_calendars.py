"""
Django management command to import all calendar data from JSON files.
Usage: python manage.py import_all_calendars [--clear]
"""
from django.core.management.base import BaseCommand
from django.core.management import call_command


class Command(BaseCommand):
    help = 'Import all calendar bookings (Pose, SAV, Metré) from JSON files into the database'

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
