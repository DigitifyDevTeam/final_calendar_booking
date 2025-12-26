"""
Django management command to import all calendar data from JSON files and filter out Sunday bookings.
Usage: python manage.py import_and_clean_calendars [--clear]

This script performs the following operations:
1. Reads JSON files from the data/ directory (pose.json, sav.json, metré.json)
2. Transforms data: Creates cleaned JSON files (new_pose.json, new_sav.json, new_metre.json) with Sundays removed
3. Removes Sundays: Filters out all Sunday bookings from JSON data BEFORE importing
4. Maps fields: Converts JSON fields to database model fields
5. Handles duplicates: Updates existing bookings instead of creating duplicates
6. Converts timestamps: Converts JavaScript timestamp (milliseconds) to Python datetime
7. Sets designer_name: All imported bookings have designer_name set to "ancien_rdv"
8. Sets calendar_id: Automatically assigns calendar_id based on file

Field Mapping (JSON → Database):
---------------------------------
| JSON Field | Database Field | Notes |
|-----------|----------------|-------|
| `id` | (not used) | Auto-generated in database |
| `date` | `booking_date` | Converted from string to date |
| `name` | `client_name` | Client name |
| `phone` | `client_phone` | Client phone number |
| `designer` | `designer_name` | Always set to "ancien_rdv" for all imported bookings |
| `message` | `message` | Booking message/notes |
| `time` | `booking_time` | Time slot (required for SAV and Metré) |
| `timestamp` | `created_at` | Converted from milliseconds to datetime |
| (added) | `calendar_id` | Automatically set based on file: `calendar1`, `calendar2`, or `calendar3` |

Calendar Mapping:
- pose.json → calendar_id = "calendar1" (Pose calendar)
- sav.json → calendar_id = "calendar2" (SAV calendar)
- metré.json → calendar_id = "calendar3" (Metré calendar)
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
    help = 'Import all calendar bookings (Pose, SAV, Metré) from JSON files with field mapping and filter out Sunday bookings before import'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear all existing bookings before importing'
        )
        parser.add_argument(
            '--file',
            type=str,
            help='Path to a specific JSON file (default: imports all calendars)'
        )

    def get_project_root(self):
        """Find the project root directory containing the data/ folder"""
        try:
            possible_roots = []
            
            # Try BASE_DIR from Django settings
            try:
                possible_roots.append(settings.BASE_DIR)
                possible_roots.append(os.path.dirname(settings.BASE_DIR))
            except AttributeError:
                pass
            
            # Fallback: go up from commands/management/core/backend to project root
            current_file_dir = os.path.dirname(__file__)
            for _ in range(5):  # Go up 5 levels max
                current_file_dir = os.path.dirname(current_file_dir)
                possible_roots.append(current_file_dir)
            
            # Find the first root that contains the data directory
            for root in possible_roots:
                data_dir = os.path.join(root, 'data')
                if os.path.exists(data_dir) and os.path.isdir(data_dir):
                    return root
            
            # Default to going up 5 levels from command file
            return os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))))
        except Exception:
            return os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))))

    def create_cleaned_json_file(self, original_file_path, output_file_name):
        """Read original JSON file, filter out Sundays, and create a new cleaned JSON file"""
        # Get absolute path
        if not os.path.isabs(original_file_path):
            project_root = self.get_project_root()
            original_file_path = os.path.join(project_root, original_file_path)
        
        if not os.path.exists(original_file_path):
            raise CommandError(f'File not found: {original_file_path}')
        
        self.stdout.write(f'Reading original JSON file: {original_file_path}')
        
        try:
            with open(original_file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except json.JSONDecodeError as e:
            raise CommandError(f'Invalid JSON file: {e}')
        except Exception as e:
            raise CommandError(f'Error reading file: {e}')
        
        bookings_data = data.get('bookings', [])
        if not bookings_data:
            self.stdout.write(self.style.WARNING(f'No bookings found in {original_file_path}'))
            return None, 0
        
        self.stdout.write(f'Found {len(bookings_data)} bookings in original file')
        
        # Filter out Sunday bookings
        # weekday() returns 0=Monday, 6=Sunday
        filtered_bookings = []
        sunday_count = 0
        
        for booking_data in bookings_data:
            date_str = booking_data.get('date')
            if date_str:
                try:
                    booking_date = parse_date(date_str)
                    if booking_date and booking_date.weekday() == 6:  # Sunday
                        sunday_count += 1
                        continue  # Skip Sunday bookings
                    filtered_bookings.append(booking_data)
                except (ValueError, TypeError):
                    # Invalid date, skip this booking
                    continue
        
        if sunday_count > 0:
            self.stdout.write(self.style.WARNING(f'Filtered out {sunday_count} Sunday booking(s)'))
        
        # Create cleaned data structure
        cleaned_data = {
            'bookings': filtered_bookings
        }
        
        # Write to new cleaned file
        project_root = self.get_project_root()
        output_file_path = os.path.join(project_root, 'data', output_file_name)
        
        try:
            with open(output_file_path, 'w', encoding='utf-8') as f:
                json.dump(cleaned_data, f, ensure_ascii=False, indent=2)
            self.stdout.write(self.style.SUCCESS(f'Created cleaned file: {output_file_path}'))
            self.stdout.write(f'  - Original bookings: {len(bookings_data)}')
            self.stdout.write(f'  - Sundays removed: {sunday_count}')
            self.stdout.write(f'  - Cleaned bookings: {len(filtered_bookings)}')
        except Exception as e:
            raise CommandError(f'Error writing cleaned file: {e}')
        
        return output_file_path, sunday_count

    def import_calendar(self, file_path, calendar_id, calendar_name, clear_existing):
        """Import bookings from a cleaned JSON file"""
        # Get absolute path
        if not os.path.isabs(file_path):
            project_root = self.get_project_root()
            file_path = os.path.join(project_root, file_path)
        
        if not os.path.exists(file_path):
            raise CommandError(f'File not found: {file_path}')
        
        self.stdout.write(f'Reading cleaned JSON file: {file_path}')
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except json.JSONDecodeError as e:
            raise CommandError(f'Invalid JSON file: {e}')
        except Exception as e:
            raise CommandError(f'Error reading file: {e}')
        
        bookings_data = data.get('bookings', [])
        if not bookings_data:
            self.stdout.write(self.style.WARNING(f'No bookings found in {file_path}'))
            return
        
        self.stdout.write(f'Importing {len(bookings_data)} bookings from cleaned file')
        
        # Clear existing bookings if requested
        if clear_existing:
            deleted_count = Booking.objects.filter(calendar_id=calendar_id).delete()[0]
            self.stdout.write(self.style.WARNING(f'Cleared {deleted_count} existing {calendar_name} calendar bookings'))
        
        # Import bookings
        created_count = 0
        updated_count = 0
        skipped_count = 0
        error_count = 0
        
        for idx, booking_data in enumerate(bookings_data, 1):
            try:
                # Map JSON fields to database fields
                booking_date_str = booking_data.get('date')
                if not booking_date_str:
                    skipped_count += 1
                    continue
                
                booking_date = parse_date(booking_date_str)
                if not booking_date:
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
                    'designer_name': 'ancien_rdv',  # Always set to "ancien_rdv" for imported bookings
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
        self.stdout.write(self.style.SUCCESS(f'{calendar_name} Import Summary:'))
        self.stdout.write(self.style.SUCCESS(f'  Created: {created_count}'))
        self.stdout.write(self.style.SUCCESS(f'  Updated: {updated_count}'))
        self.stdout.write(self.style.SUCCESS(f'  Skipped: {skipped_count}'))
        if error_count > 0:
            self.stdout.write(self.style.ERROR(f'  Errors: {error_count}'))
        self.stdout.write(self.style.SUCCESS('=' * 50))

    def handle(self, *args, **options):
        clear_existing = options['clear']
        specific_file = options.get('file')
        
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(self.style.SUCCESS('Calendar Data Transformation and Import'))
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write('')
        self.stdout.write('Step 1: Creating cleaned JSON files (removing Sundays)')
        self.stdout.write('')
        
        project_root = self.get_project_root()
        
        # Define calendar files and their mappings
        calendars = [
            {
                'original_file': 'data/pose.json',
                'cleaned_file': 'new_pose.json',
                'calendar_id': 'calendar1',
                'name': 'Pose'
            },
            {
                'original_file': 'data/sav.json',
                'cleaned_file': 'new_sav.json',
                'calendar_id': 'calendar2',
                'name': 'SAV'
            },
            {
                'original_file': 'data/metré.json',
                'cleaned_file': 'new_metre.json',
                'calendar_id': 'calendar3',
                'name': 'Metré'
            }
        ]
        
        # Check if user wants to import from existing cleaned files
        if specific_file and specific_file.startswith('new_'):
            # User wants to import from a cleaned file directly
            cleaned_file_path = os.path.join(project_root, 'data', specific_file)
            
            # Find matching calendar for the cleaned file
            calendar = None
            for cal in calendars:
                if cal['cleaned_file'] == specific_file:
                    calendar = cal
                    break
            
            if not calendar:
                raise CommandError(f'Unknown cleaned file: {specific_file}')
            
            if not os.path.exists(cleaned_file_path):
                raise CommandError(f'Cleaned file not found: {cleaned_file_path}')
            
            self.stdout.write(self.style.WARNING(f'Importing {calendar["name"]} calendar from cleaned file ({calendar["calendar_id"]})...'))
            self.import_calendar(
                cleaned_file_path,
                calendar['calendar_id'],
                calendar['name'],
                clear_existing
            )
            return
        
        # Step 1: Create cleaned JSON files
        cleaned_files_created = []
        total_sundays_filtered = 0
        
        if specific_file:
            # Find matching calendar
            calendar = None
            for cal in calendars:
                if cal['original_file'] == specific_file or os.path.basename(cal['original_file']) == specific_file:
                    calendar = cal
                    break
            
            if not calendar:
                raise CommandError(f'Unknown calendar file: {specific_file}')
            
            calendars_to_process = [calendar]
        else:
            calendars_to_process = calendars
        
        for calendar in calendars_to_process:
            self.stdout.write(self.style.WARNING(f'Processing {calendar["name"]} calendar...'))
            cleaned_file_path, sunday_count = self.create_cleaned_json_file(
                calendar['original_file'],
                calendar['cleaned_file']
            )
            if cleaned_file_path:
                cleaned_files_created.append({
                    'cleaned_file': cleaned_file_path,
                    'calendar_id': calendar['calendar_id'],
                    'name': calendar['name'],
                    'sundays_filtered': sunday_count
                })
                total_sundays_filtered += sunday_count
            self.stdout.write('')
        
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(self.style.SUCCESS(f'Created {len(cleaned_files_created)} cleaned JSON file(s)'))
        self.stdout.write(self.style.SUCCESS(f'Total Sundays filtered: {total_sundays_filtered}'))
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write('')
        
        # Step 2: Import from cleaned files
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(self.style.SUCCESS('Step 2: Importing from cleaned JSON files'))
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write('')
        
        for file_info in cleaned_files_created:
            self.stdout.write(self.style.WARNING(f'Importing {file_info["name"]} calendar ({file_info["calendar_id"]})...'))
            self.import_calendar(
                file_info['cleaned_file'],
                file_info['calendar_id'],
                file_info['name'],
                clear_existing
            )
            self.stdout.write('')
        
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(self.style.SUCCESS('Transformation and import completed!'))
        self.stdout.write(self.style.SUCCESS('=' * 60))
