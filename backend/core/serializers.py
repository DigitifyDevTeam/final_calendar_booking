from datetime import date, timedelta
from rest_framework import serializers

from .models import Booking, ContactMessage, Holiday, User, PasswordResetToken, Magasin

CALENDAR_DAILY_LIMITS = {
    'calendar1': 4,  # Pose calendar: 4 bookings per day
}

TIME_SLOT_CALENDARS = {'calendar2', 'calendar3'}  # SAV and Metré use time slots
ALLOWED_TIME_SLOTS = {
    # Metré (calendar3): allowed slots only (18:30 removed)
    'calendar3': ['8:00', '9:30', '11:00', '12:30', '14:00', '15:30', '17:00'],
    '3': ['8:00', '9:30', '11:00', '12:30', '14:00', '15:30', '17:00'],
}


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=6)
    confirm_password = serializers.CharField(write_only=True, required=False)
    
    class Meta:
        model = User
        fields = [
            'id', 'name', 'email', 'phone', 'role', 'is_referent',
            'password', 'confirm_password', 'created_at', 'updated_at',
        ]
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

        # Référent only applies to concepteurs
        role = attrs.get('role', getattr(self.instance, 'role', None))
        if role != 'concepteur':
            attrs['is_referent'] = False
        else:
            will_be_referent = attrs.get(
                'is_referent',
                bool(getattr(self.instance, 'is_referent', False)) if self.instance else False,
            )
            if will_be_referent:
                self._ensure_unique_referent_per_magasin()

        return attrs

    def _ensure_unique_referent_per_magasin(self):
        """
        Each magasin may have at most one concepteur référent.
        Activating référent fails if another référent already exists in any shared magasin.
        """
        if not self.instance:
            # New user is not linked to a magasin yet — conflict checked on magasin assignment
            return

        for magasin in self.instance.magasins.all():
            other = (
                magasin.concepteurs
                .filter(role='concepteur', is_referent=True)
                .exclude(pk=self.instance.pk)
                .first()
            )
            if other:
                raise serializers.ValidationError({
                    'is_referent': (
                        f'Le magasin « {magasin.name} » a déjà un concepteur référent '
                        f'({other.name}). Désactivez d\'abord son statut référent, '
                        f'puis réessayez.'
                    )
                })
    
    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user
    
    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        
        # Check if email is being changed
        old_email = instance.email
        new_email = validated_data.get('email', old_email)
        email_changed = old_email != new_email
        
        # Update other fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Update password if provided
        if password:
            instance.set_password(password)
        
        instance.save()
        
        # If email was changed, invalidate all existing password reset tokens for this user
        if email_changed:
            from .models import PasswordResetToken
            PasswordResetToken.objects.filter(user=instance, used=False).update(used=True)
        
        return instance


class PasswordResetRequestSerializer(serializers.Serializer):
    """Serializer for password reset request"""
    email = serializers.EmailField(required=True)
    
    def validate_email(self, value):
        """Validate that email exists in User model"""
        if not User.objects.filter(email=value).exists():
            # Don't reveal if email doesn't exist for security
            # Just pass validation - the view will handle it silently
            pass
        return value


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Serializer for password reset confirmation"""
    token = serializers.CharField(required=True, max_length=255)
    new_password = serializers.CharField(required=True, write_only=True, min_length=6)
    confirm_password = serializers.CharField(required=True, write_only=True)
    
    def validate(self, attrs):
        """Validate token and passwords"""
        token = attrs.get('token')
        new_password = attrs.get('new_password')
        confirm_password = attrs.get('confirm_password')
        
        # Check if token exists
        try:
            reset_token = PasswordResetToken.objects.get(token=token)
        except PasswordResetToken.DoesNotExist:
            raise serializers.ValidationError({
                'token': 'Token invalide ou expiré.'
            })
        
        # Check if token is valid (not expired, not used)
        if not reset_token.is_valid():
            raise serializers.ValidationError({
                'token': 'Token invalide ou expiré.'
            })
        
        # Validate passwords match
        if new_password != confirm_password:
            raise serializers.ValidationError({
                'confirm_password': 'Les mots de passe ne correspondent pas.'
            })
        
        # Validate password length
        if len(new_password) < 6:
            raise serializers.ValidationError({
                'new_password': 'Le mot de passe doit contenir au moins 6 caractères.'
            })
        
        # Store reset_token in validated_data for use in view
        attrs['reset_token'] = reset_token
        return attrs


class MagasinSerializer(serializers.ModelSerializer):
    concepteurs = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=User.objects.filter(role='concepteur'),
        required=False,
        allow_empty=True
    )
    concepteurs_details = serializers.SerializerMethodField()
    
    class Meta:
        model = Magasin
        fields = ['id', 'name', 'concepteurs', 'concepteurs_details', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at', 'concepteurs_details']
    
    def get_concepteurs_details(self, obj):
        """Return detailed information about concepteurs"""
        concepteurs = obj.concepteurs.all()
        return [
            {
                'id': c.id,
                'name': c.name,
                'email': c.email,
                'phone': c.phone,
                'is_referent': bool(c.is_referent),
            }
            for c in concepteurs
        ]
    
    def validate_name(self, value):
        """Validate that name is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError('Le nom du magasin est requis.')
        return value.strip()
    
    def validate_concepteurs(self, value):
        """Validate concepteurs role + at most one référent per magasin"""
        if value:
            # Check that all IDs are valid concepteurs
            concepteur_ids = [c.id for c in value]
            valid_concepteurs = User.objects.filter(id__in=concepteur_ids, role='concepteur')
            if valid_concepteurs.count() != len(concepteur_ids):
                raise serializers.ValidationError('Un ou plusieurs concepteurs sont invalides.')

            referents = [c for c in value if getattr(c, 'is_referent', False)]
            if len(referents) > 1:
                names = ', '.join(c.name for c in referents)
                raise serializers.ValidationError(
                    'Un magasin ne peut avoir qu\'un seul concepteur référent. '
                    f'Référents sélectionnés : {names}. '
                    'Désactivez le statut référent sur le compte en trop (menu Utilisateurs), '
                    'puis réessayez.'
                )
        return value
    
    def create(self, validated_data):
        """Create a new Magasin instance and set the ManyToMany relationship"""
        # Extract concepteurs from validated_data
        concepteurs = validated_data.pop('concepteurs', [])
        
        # Create the Magasin instance (without concepteurs)
        magasin = Magasin.objects.create(**validated_data)
        
        # Set the ManyToMany relationship after the instance is saved
        if concepteurs:
            magasin.concepteurs.set(concepteurs)
        else:
            # Allow empty list (0 concepteurs)
            magasin.concepteurs.clear()
        
        return magasin
    
    def update(self, instance, validated_data):
        """Update a Magasin instance and update the ManyToMany relationship"""
        # Extract concepteurs from validated_data
        concepteurs = validated_data.pop('concepteurs', None)
        
        # Update other fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update the ManyToMany relationship if provided
        if concepteurs is not None:
            if concepteurs:
                instance.concepteurs.set(concepteurs)
            else:
                # Allow empty list (0 concepteurs)
                instance.concepteurs.clear()
        
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
            'pose_effectue_par_wood_agency',
            'livraison',
            'raison',
            'statut_facturation',
            'status',
            'menage_fait',
            'cft_signe',
            'electromenager_fonctionnel',
            'ascenseur_escaliers',
            'completed_at',
            'cancellation_motif',
            'cancelled_at',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'cancellation_motif', 'cancelled_at']

    def validate(self, attrs):
        # Only admin can change statut_facturation (billing status)
        request = self.context.get('request')
        is_admin = bool(
            request and getattr(request, 'user', None)
            and getattr(request.user, 'role', None) == 'admin'
        )
        is_concepteur = bool(
            request and getattr(request, 'user', None)
            and getattr(request.user, 'role', None) == 'concepteur'
        )
        if not is_admin and 'statut_facturation' in attrs:
            attrs.pop('statut_facturation', None)

        # Concepteur: force own designer_name; cannot create/edit under another name
        if is_concepteur:
            attrs['designer_name'] = request.user.name

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

        # Validate livraison field for SAV calendar (calendar2)
        livraison = attrs.get('livraison')
        if calendar_id and calendar_id in ['calendar2', '2']:
            if not livraison or livraison.strip() == '':
                raise serializers.ValidationError({
                    'livraison': 'Le champ livraison est obligatoire pour les réservations SAV.'
                })
            # Strip whitespace and validate that the value is one of the allowed choices
            livraison = livraison.strip()
            # Log the value for debugging
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f'[BookingSerializer] livraison value: "{livraison}", length: {len(livraison)}, type: {type(livraison)}')
            
            allowed_choices = ['livre_chez_client', 'venir_chercher_magasin']
            if livraison not in allowed_choices:
                raise serializers.ValidationError({
                    'livraison': f'La valeur de livraison doit être l\'une des suivantes: {", ".join(allowed_choices)}'
                })
            # Store the cleaned value
            attrs['livraison'] = livraison
            
            # Validate raison field for SAV calendar (calendar2) - required
            raison = attrs.get('raison')
            if not raison or raison.strip() == '':
                raise serializers.ValidationError({
                    'raison': 'Le champ raison est obligatoire pour les réservations SAV.'
                })
            # Strip whitespace and validate that the value is one of the allowed choices
            raison = raison.strip()
            allowed_raison_choices = ['erreur_poseur', 'erreur_concepteur', 'erreur_livraison', 'manquant']
            if raison not in allowed_raison_choices:
                raise serializers.ValidationError({
                    'raison': f'La valeur de raison doit être l\'une des suivantes: {", ".join(allowed_raison_choices)}'
                })
            # Store the cleaned value
            attrs['raison'] = raison

        if not calendar_id or not booking_date:
            return attrs

        # Only check bookings for future dates (exclude past dates)
        today = date.today()
        tomorrow = today + timedelta(days=1)

        # Check if user is admin - admin can book for any date including past/today/tomorrow
        request = self.context.get('request')
        is_admin = False
        if request and hasattr(request, 'user') and request.user:
            # Check if user has admin role
            user = request.user
            if hasattr(user, 'role'):
                is_admin = user.role == 'admin'

        # For non-admin users: disallow creating or moving bookings to a past date.
        # Allow:
        #   - admin (can modifier/ajouter librement)
        #   - updates where the date stays the same (ex: changer seulement le statut de facturation)
        if booking_date < today and not is_admin:
            # If this is an update and the date is unchanged, allow it
            if not (self.instance and self.instance.booking_date == booking_date):
                raise serializers.ValidationError({
                    'booking_date': 'Vous ne pouvez pas réserver une date passée.'
                })
        
        # For non-admin users: Prevent bookings for today and tomorrow
        # Admin users can book for any date
        if not is_admin:
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
        
        # Filter bookings for this calendar and date
        # Check all possible calendar_id formats
        # Only check future/present dates (skip validation for past dates)
        queryset = Booking.objects.filter(
            calendar_id__in=calendar_ids_to_query,
            booking_date=booking_date
        )
        
        # Exclude the current booking instance when updating
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)

        # Only validate for future/present dates
        if booking_date >= today:
            # For Pose (calendar1): Check total bookings per date
            if calendar_id in ['calendar1', '1']:
                max_per_day = CALENDAR_DAILY_LIMITS.get('calendar1')
                if max_per_day is not None:
                    booking_count = queryset.count()
                    if booking_count >= max_per_day:
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
            # Always validate time slot conflicts, even for past dates (when postponing)
            # Check all possible calendar_id formats
            slot_qs = Booking.objects.none()
            for cid in calendar_ids_to_check:
                slot_qs = slot_qs | Booking.objects.filter(
                    calendar_id=cid,
                    booking_date=booking_date,
                    booking_time__iexact=normalized_booking_time
                )
            
            # Exclude the current booking instance when updating
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

