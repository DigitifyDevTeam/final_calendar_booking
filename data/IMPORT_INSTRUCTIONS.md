# JSON Data Import Instructions

This directory contains JSON files with booking data that need to be imported into the database.

## Files

- `pose.json` - Pose calendar bookings (calendar1)
- `Sav.json` - SAV calendar bookings (calendar2)
- `metré.json` - Metré calendar bookings (calendar3)

## Field Mapping

The JSON files contain the following fields that are mapped to the database:

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

## Import Commands

### Import Individual Calendars

```bash
# Import Pose calendar (calendar1)
python manage.py import_pose_data

# Import SAV calendar (calendar2)
python manage.py import_sav_data

# Import Metré calendar (calendar3)
python manage.py import_metre_data
```

### Import All Calendars at Once

```bash
python manage.py import_all_calendars
```

### Clear Existing Data Before Import

To clear all existing bookings for a calendar before importing:

```bash
# Clear and import Pose calendar
python manage.py import_pose_data --clear

# Clear and import SAV calendar
python manage.py import_sav_data --clear

# Clear and import Metré calendar
python manage.py import_metre_data --clear

# Clear and import all calendars
python manage.py import_all_calendars --clear
```

### Custom File Path

To use a different file path:

```bash
python manage.py import_pose_data --file /path/to/custom/pose.json
python manage.py import_sav_data --file /path/to/custom/Sav.json
python manage.py import_metre_data --file /path/to/custom/metré.json
```

## How It Works

1. **Reads JSON file**: The script reads the JSON file from the `data/` directory (or custom path)
2. **Maps fields**: Converts JSON fields to database model fields
3. **Handles duplicates**: If a booking already exists (based on calendar_id, date, time, client_name, and client_phone), it updates it instead of creating a duplicate
4. **Converts timestamps**: Converts JavaScript timestamp (milliseconds) to Python datetime
5. **Sets designer_name**: All imported bookings will have `designer_name` set to "ancien_rdv" (regardless of the value in the JSON file)
6. **Sets calendar_id**: Automatically assigns the correct calendar_id based on which script is run:
   - `import_pose_data` → `calendar_id = "calendar1"`
   - `import_sav_data` → `calendar_id = "calendar2"`
   - `import_metre_data` → `calendar_id = "calendar3"`

## Notes

- The scripts will skip bookings with missing or invalid dates
- Existing bookings are updated if they match (same calendar_id, date, time, client_name, client_phone)
- The `--clear` flag will delete ALL existing bookings for that calendar before importing
- Progress is shown every 50 bookings processed
- A summary is displayed at the end showing created, updated, skipped, and error counts

## Example Output

```
Reading JSON file: /path/to/data/pose.json
Found 1323 bookings in JSON file
  Processed 50/1323 bookings...
  Processed 100/1323 bookings...
  ...

==================================================
Import Summary:
  Created: 1200
  Updated: 123
  Skipped: 0
  Errors: 0
==================================================
```
