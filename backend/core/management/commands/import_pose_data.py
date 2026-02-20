"""
Django management command to import Pose calendar data from JSON file.
Usage: python manage.py import_pose_data [--file path/to/pose.json] [--clear]
"""
import json
import os
from datetime import datetime
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from django.utils import timezone
from django.utils.dateparse import parse_date
from core.models import Booking


class Command(BaseCommand):
    help = 'Import Pose calendar bookings from JSON file into the database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            type=str,
            default='data/pose.json',
            help='Path to the JSON file (default: data/pose.json)'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear all existing Pose calendar bookings before importing'
        )

    def handle(self, *args, **options):
        file_path = options['file']
        clear_existing = options['clear']
        
        # Get absolute path
        if not os.path.isabs(file_path):
            # Try multiple possible project root locations
            possible_roots = []
            
            # Try BASE_DIR from Django settings
            try:
                possible_roots.append(settings.BASE_DIR)
                # BASE_DIR might be backend/, so try parent
                possible_roots.append(os.path.dirname(settings.BASE_DIR))
            except AttributeError:
                pass
            
            # Fallback: go up from commands/management/core/backend to project root
            current_file_dir = os.path.dirname(__file__)
            for _ in range(5):  # Go up 5 levels max
                current_file_dir = os.path.dirname(current_file_dir)
                possible_roots.append(current_file_dir)
            
            # Find the first root that contains the data directory or the file
            project_root = None
            for root in possible_roots:
                test_path = os.path.join(root, file_path)
                if os.path.exists(test_path):
                    project_root = root
                    break
                # Also check if data directory exists
                data_dir = os.path.join(root, 'data')
                if os.path.exists(data_dir) and os.path.isdir(data_dir):
                    project_root = root
                    break
            
            if not project_root:
                # Default to going up 5 levels from command file
                project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))))
            
            file_path = os.path.join(project_root, file_path)
        
        if not os.path.exists(file_path):
            raise CommandError(f'File not found: {file_path}')
        
        self.stdout.write(f'Reading JSON file: {file_path}')
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except json.JSONDecodeError as e:
            raise CommandError(f'Invalid JSON file: {e}')
        except Exception as e:
            raise CommandError(f'Error reading file: {e}')
        
        bookings_data = data.get('bookings', [])
        if not bookings_data:
            raise CommandError('No bookings found in JSON file')
        
        self.stdout.write(f'Found {len(bookings_data)} bookings in JSON file')
        
        # Clear existing bookings if requested
        if clear_existing:
            deleted_count = Booking.objects.filter(calendar_id='calendar1').delete()[0]
            self.stdout.write(self.style.WARNING(f'Cleared {deleted_count} existing Pose calendar bookings'))
        
        # Import bookings
        calendar_id = 'calendar1'  # Pose calendar
        created_count = 0
        updated_count = 0
        skipped_count = 0
        error_count = 0
        
        for idx, booking_data in enumerate(bookings_data, 1):
            try:
                # Map JSON fields to database fields
                booking_date_str = booking_data.get('date')
                if not booking_date_str:
                    self.stdout.write(self.style.WARNING(f'  [{idx}] Skipping: missing date'))
                    skipped_count += 1
                    continue
                
                booking_date = parse_date(booking_date_str)
                if not booking_date:
                    self.stdout.write(self.style.WARNING(f'  [{idx}] Skipping: invalid date format: {booking_date_str}'))
                    skipped_count += 1
                    continue
                
                # Convert timestamp to datetime (timezone-aware)
                timestamp = booking_data.get('timestamp')
                created_at = None
                if timestamp:
                    try:
                        # Convert milliseconds to seconds and create timezone-aware datetime
                        naive_dt = datetime.fromtimestamp(timestamp / 1000)
                        created_at = timezone.make_aware(naive_dt)
                    except (ValueError, OSError):
                        created_at = timezone.now()
                else:
                    created_at = timezone.now()
                
                # Check if booking already exists (by calendar_id, date, time, and client)
                existing_booking = Booking.objects.filter(
                    calendar_id=calendar_id,
                    booking_date=booking_date,
                    booking_time=booking_data.get('time', ''),
                    client_name=booking_data.get('name', ''),
                    client_phone=booking_data.get('phone', '')
                ).first()
                
                booking_data_mapped = {
                    'calendar_id': calendar_id,
                    'booking_date': booking_date,
                    'booking_time': booking_data.get('time', '21h00'),  # Default for Pose
                    'client_name': booking_data.get('name', ''),
                    'client_phone': booking_data.get('phone', ''),
                    'designer_name': 'ancien_rdv',  # Set all imported bookings to "ancien_rdv"
                    'message': booking_data.get('message', ''),
                }
                
                if existing_booking:
                    # Update existing booking
                    for key, value in booking_data_mapped.items():
                        setattr(existing_booking, key, value)
                    existing_booking.created_at = created_at
                    existing_booking.save()
                    updated_count += 1
                    if idx % 50 == 0:
                        self.stdout.write(f'  Processed {idx}/{len(bookings_data)} bookings...')
                else:
                    # Create new booking
                    booking = Booking(**booking_data_mapped)
                    booking.created_at = created_at
                    booking.save()
                    created_count += 1
                    if idx % 50 == 0:
                        self.stdout.write(f'  Processed {idx}/{len(bookings_data)} bookings...')
                        
            except Exception as e:
                error_count += 1
                self.stdout.write(self.style.ERROR(f'  [{idx}] Error: {str(e)}'))
                continue
        
        # Summary
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('=' * 50))
        self.stdout.write(self.style.SUCCESS('Import Summary:'))
        self.stdout.write(self.style.SUCCESS(f'  Created: {created_count}'))
        self.stdout.write(self.style.SUCCESS(f'  Updated: {updated_count}'))
        self.stdout.write(self.style.SUCCESS(f'  Skipped: {skipped_count}'))
        if error_count > 0:
            self.stdout.write(self.style.ERROR(f'  Errors: {error_count}'))
        self.stdout.write(self.style.SUCCESS('=' * 50))
