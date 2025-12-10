from datetime import date, timedelta
from rest_framework import serializers

from .models import Booking, ContactMessage, Holiday, User

CALENDAR_DAILY_LIMITS = {
    'calendar1': 2,  # Pose calendar: 2 bookings per day
}

TIME_SLOT_CALENDARS = {'calendar2', 'calendar3'}  # SAV and Metré use time slots
ALLOWED_TIME_SLOTS = {
    'calendar3': ['8:00-11:00', '11:00-14:00', '14:00-17:00'],
    '3': ['8:00-11:00', '11:00-14:00', '14:00-17:00'],
}


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=6)
    confirm_password = serializers.CharField(write_only=True, required=False)
    
    class Meta:
        model = User
        fields = ['id', 'name', 'email', 'phone', 'role', 'password', 'confirm_password', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
        extra_kwargs = {
            'email': {'required': True},
            'name': {'required': True},
            'phone': {'required': True},
        }
    
    def validate(self, attrs):
        # Check password confirmation when creating or updating password
        password = attrs.get('password')
        confirm_password = attrs.get('confirm_password')
        
        # For new users, password is required
        if not self.instance and not password:
            raise serializers.ValidationError({
                'password': 'Le mot de passe est requis pour créer un utilisateur.'
            })
        
        # If password is provided (new user or updating), confirm_password is required
        if password:
            if not confirm_password:
                raise serializers.ValidationError({
                    'confirm_password': 'Veuillez confirmer le mot de passe.'
                })
            if password != confirm_password:
                raise serializers.ValidationError({
                    'confirm_password': 'Les mots de passe ne correspondent pas.'
                })
            if len(password) < 6:
                raise serializers.ValidationError({
                    'password': 'Le mot de passe doit contenir au moins 6 caractères.'
                })
        
        # Remove confirm_password from attrs as it's not a model field
        attrs.pop('confirm_password', None)
        return attrs
    
    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user
    
    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        
        # Update other fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Update password if provided
        if password:
            instance.set_password(password)
        
        instance.save()
        return instance


class ContactMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = ['id', 'name', 'email', 'subject', 'message', 'phone', 'created_at']
        read_only_fields = ['id', 'created_at']


class BookingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = [
            'id',
            'calendar_id',
            'booking_date',
            'booking_time',
            'client_name',
            'client_phone',
            'designer_name',
            'message',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def validate(self, attrs):
        # For updates, use instance's calendar_id if not provided in attrs
        calendar_id = attrs.get('calendar_id')
        if not calendar_id and self.instance:
            calendar_id = self.instance.calendar_id
        
        booking_date = attrs.get('booking_date')
        if not booking_date and self.instance:
            booking_date = self.instance.booking_date
        
        booking_time = attrs.get('booking_time')
        if booking_time is None and self.instance:
            booking_time = self.instance.booking_time or ''
        booking_time = booking_time or ''
        
        # For Pose calendar, set default time if empty
        if calendar_id and calendar_id in ['calendar1', '1'] and not booking_time:
            booking_time = '21h00'
            attrs['booking_time'] = booking_time

        if not calendar_id or not booking_date:
            return attrs

        # Only check bookings for future dates (exclude past dates)
        today = date.today()
        tomorrow = today + timedelta(days=1)
        if booking_date < today:
            raise serializers.ValidationError({
                'booking_date': 'Vous ne pouvez pas réserver une date passée.'
            })
        
        # For Pose calendar (calendar1): Prevent bookings for today and tomorrow
        # Bookings can only be made from the 3rd day onwards
        if calendar_id in ['calendar1', '1']:
            if booking_date <= tomorrow:
                raise serializers.ValidationError({
                    'booking_date': 'Pour le calendrier Pose, vous ne pouvez pas réserver pour aujourd\'hui ou demain. Les réservations sont autorisées à partir du surlendemain.'
                })
        
        # For SAV (calendar2) and Metré (calendar3): Prevent bookings for today and tomorrow
        if calendar_id in ['calendar2', '2', 'calendar3', '3']:
            if booking_date <= tomorrow:
                raise serializers.ValidationError({
                    'booking_date': 'Pour les calendriers SAV et Metré, vous ne pouvez pas réserver pour aujourd\'hui ou demain. Les réservations sont autorisées à partir du surlendemain.'
                })
        
        # Check if the date is marked as a holiday/invalid day
        # Handle legacy calendar_id formats
        calendar_ids_to_check = [calendar_id]
        if calendar_id == 'calendar1':
            calendar_ids_to_check.append('1')
        elif calendar_id == 'calendar2':
            calendar_ids_to_check.append('2')
        elif calendar_id == 'calendar3':
            calendar_ids_to_check.append('3')
        elif calendar_id == '1':
            calendar_ids_to_check.append('calendar1')
        elif calendar_id == '2':
            calendar_ids_to_check.append('calendar2')
        elif calendar_id == '3':
            calendar_ids_to_check.append('calendar3')
        
        holiday_exists = Holiday.objects.filter(
            calendar_id__in=calendar_ids_to_check,
            holiday_date=booking_date
        ).exists()
        
        if holiday_exists:
            raise serializers.ValidationError({
                'booking_date': 'Cette date est un jour férié ou un jour non disponible. Les réservations ne sont pas autorisées pour cette date.'
            })

        # Handle legacy calendar_id formats: "1" instead of "calendar1", etc.
        calendar_ids_to_query = [calendar_id]
        if calendar_id == 'calendar1':
            calendar_ids_to_query.append('1')
        elif calendar_id == 'calendar2':
            calendar_ids_to_query.append('2')
        elif calendar_id == 'calendar3':
            calendar_ids_to_query.append('3')
        elif calendar_id == '1':
            calendar_ids_to_query.append('calendar1')
        elif calendar_id == '2':
            calendar_ids_to_query.append('calendar2')
        elif calendar_id == '3':
            calendar_ids_to_query.append('calendar3')
        
        # Filter bookings for this calendar and date, excluding past dates
        # Check all possible calendar_id formats
        queryset = Booking.objects.filter(
            calendar_id__in=calendar_ids_to_query,
            booking_date=booking_date
        ).filter(booking_date__gte=today)  # Only count future/present dates
        
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)

        # For Pose (calendar1): Check total bookings per date
        if calendar_id in ['calendar1', '1']:
            max_per_day = CALENDAR_DAILY_LIMITS.get('calendar1')
            if max_per_day is not None:
                if queryset.count() >= max_per_day:
                    raise serializers.ValidationError({
                        'booking_date': f'Cette date a déjà atteint la limite de {max_per_day} réservations. Veuillez choisir une autre date.'
                    })

        # For SAV (calendar2) and Metré (calendar3): Check specific time slot
        # Also handle legacy calendar_id formats: "2" instead of "calendar2", "3" instead of "calendar3"
        calendar_ids_to_check = [calendar_id]
        if calendar_id == 'calendar2':
            calendar_ids_to_check.append('2')
        elif calendar_id == 'calendar3':
            calendar_ids_to_check.append('3')
        elif calendar_id == '2':
            calendar_ids_to_check.append('calendar2')
        elif calendar_id == '3':
            calendar_ids_to_check.append('calendar3')
        
        if calendar_id in TIME_SLOT_CALENDARS or calendar_id in ['2', '3']:
            if not booking_time:
                raise serializers.ValidationError({
                    'booking_time': 'Un créneau horaire est requis pour ce calendrier.'
                })

            # Normalize time for comparison (strip whitespace, case-insensitive)
            normalized_booking_time = booking_time.strip()

            # Validate allowed slots for calendars with constrained slots (e.g., Metré)
            allowed_slots = ALLOWED_TIME_SLOTS.get(calendar_id)
            if allowed_slots and normalized_booking_time not in allowed_slots:
                raise serializers.ValidationError({
                    'booking_time': f'Créneau invalide pour ce calendrier. Créneaux autorisés: {", ".join(allowed_slots)}'
                })
            # Store normalized time
            attrs['booking_time'] = normalized_booking_time
            
            # Check if this exact time slot is already booked for this date
            # Check all possible calendar_id formats
            slot_qs = queryset.none()
            for cid in calendar_ids_to_check:
                slot_qs = slot_qs | Booking.objects.filter(
                    calendar_id=cid,
                    booking_date=booking_date,
                    booking_date__gte=today
                ).filter(booking_time__iexact=normalized_booking_time)
            
            if self.instance:
                slot_qs = slot_qs.exclude(pk=self.instance.pk)
            
            if slot_qs.exists():
                raise serializers.ValidationError({
                    'booking_time': f'Ce créneau ({normalized_booking_time}) est déjà réservé pour cette date. Veuillez choisir un autre créneau.'
                })

        return attrs


class HolidaySerializer(serializers.ModelSerializer):
    class Meta:
        model = Holiday
        fields = ['id', 'calendar_id', 'holiday_date', 'description', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def validate(self, attrs):
        try:
            calendar_id = attrs.get('calendar_id')
            holiday_date = attrs.get('holiday_date')
            
            if not calendar_id or not holiday_date:
                return attrs
            
            # Handle legacy calendar_id formats: "1" instead of "calendar1", etc.
            calendar_ids_to_check = [calendar_id]
            if calendar_id == 'calendar1':
                calendar_ids_to_check.append('1')
            elif calendar_id == 'calendar2':
                calendar_ids_to_check.append('2')
            elif calendar_id == 'calendar3':
                calendar_ids_to_check.append('3')
            elif calendar_id == '1':
                calendar_ids_to_check.append('calendar1')
            elif calendar_id == '2':
                calendar_ids_to_check.append('calendar2')
            elif calendar_id == '3':
                calendar_ids_to_check.append('calendar3')
            
            # Check if holiday already exists for this calendar and date (check all possible formats)
            queryset = Holiday.objects.filter(calendar_id__in=calendar_ids_to_check, holiday_date=holiday_date)
            if self.instance:
                queryset = queryset.exclude(pk=self.instance.pk)
            
            if queryset.exists():
                raise serializers.ValidationError({
                    'holiday_date': f'Cette date est déjà marquée comme jour férié pour ce calendrier.'
                })
            
            return attrs
        except serializers.ValidationError:
            raise
        except Exception as e:
            import traceback
            print(f"Error in HolidaySerializer.validate: {e}")
            print(traceback.format_exc())
            raise serializers.ValidationError({
                'non_field_errors': [f'Erreur de validation: {str(e)}']
            })

