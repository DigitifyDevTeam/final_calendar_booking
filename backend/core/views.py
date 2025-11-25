from datetime import date
from django.conf import settings
from django.core.mail import EmailMessage
from django.db.models import Count
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Booking, ContactMessage, Holiday, User
from .serializers import BookingSerializer, ContactMessageSerializer, HolidaySerializer, UserSerializer


def _notify_booking(booking: Booking, is_update=False):
    """Send email notification for booking creation or update"""
    action = "modifiée" if is_update else "enregistrée"
    subject = f"Réservation {action} pour {booking.calendar_id} le {booking.booking_date}"
    body_lines = [
        f"Une réservation vient d'être {action} :",
        "",
        f"Calendrier : {booking.calendar_id}",
        f"Date : {booking.booking_date}",
    ]

    # Show time slot for calendars that use time slots (SAV and Metré)
    # For Pose calendar, time is optional and defaults to '21h00' which we don't need to show
    if booking.calendar_id in ['calendar2', 'calendar3', '2', '3']:
        # For time slot calendars, always show the time slot
        if booking.booking_time and booking.booking_time.strip():
            body_lines.append(f"Heure : {booking.booking_time}")
        else:
            body_lines.append(f"Heure : Non spécifiée")
    elif booking.booking_time and booking.booking_time.strip() and booking.booking_time.strip() != '21h00':
        # For other calendars, only show time if it's not the default
        body_lines.append(f"Heure : {booking.booking_time}")

    body_lines.extend([
        f"Nom du client : {booking.client_name}",
        f"Téléphone : {booking.client_phone}",
        f"Nom du concepteur : {booking.designer_name}",
        "",
        "Message / Commentaire :",
        booking.message or "(aucun)",
        "",
        f"ID de réservation : {booking.id}",
        f"{'Modifiée' if is_update else 'Créée'} le : {booking.created_at}",
    ])

    body = "\n".join(body_lines)

    recipient_raw = settings.CONTACT_EMAIL_RECIPIENTS or settings.DEFAULT_FROM_EMAIL
    recipients = [
        email.strip() for email in recipient_raw.split(',')
        if email.strip()
    ]

    email_message = EmailMessage(
        subject=subject,
        body=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=recipients or [settings.DEFAULT_FROM_EMAIL],
    )

    email_message.send(fail_silently=False)


class ContactEmailView(generics.ListCreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = ContactMessageSerializer
    queryset = ContactMessage.objects.all().order_by('-created_at')

    def perform_create(self, serializer):
        contact_message = serializer.save()
        self._send_email(contact_message)

    def _send_email(self, contact_message: ContactMessage):
        subject = contact_message.subject
        body_lines = [
            "Nouvelle demande reçue via le calendrier :",
            "",
            f"Nom : {contact_message.name}",
            f"Email : {contact_message.email}",
        ]

        if contact_message.phone:
            body_lines.append(f"Téléphone : {contact_message.phone}")

        body_lines.extend([
            "",
            "Message :",
            contact_message.message,
            "",
            f"ID message : {contact_message.id}",
            f"Reçu le : {contact_message.created_at}",
        ])

        body = "\n".join(body_lines)

        recipient_raw = settings.CONTACT_EMAIL_RECIPIENTS or settings.DEFAULT_FROM_EMAIL
        recipients = [
            email.strip() for email in recipient_raw.split(',')
            if email.strip()
        ]

        email_message = EmailMessage(
            subject=subject,
            body=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=recipients or [settings.DEFAULT_FROM_EMAIL],
            reply_to=[contact_message.email],
        )

        email_message.send(fail_silently=False)


class BookingListCreateView(generics.ListCreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = BookingSerializer
    queryset = Booking.objects.all()
    
    def get_queryset(self):
        queryset = super().get_queryset()
        calendar_id = self.request.query_params.get('calendar_id')
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')

        if calendar_id:
            queryset = queryset.filter(calendar_id=calendar_id)

        if start_date:
            queryset = queryset.filter(booking_date__gte=start_date)

        if end_date:
            queryset = queryset.filter(booking_date__lte=end_date)

        return queryset.order_by('booking_date', 'booking_time', 'id')

    def perform_create(self, serializer):
        booking = serializer.save()
        # Refresh from database to ensure we have the latest saved values
        booking.refresh_from_db()
        _notify_booking(booking)


class BookingRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [AllowAny]
    serializer_class = BookingSerializer
    queryset = Booking.objects.all()
    
    def perform_update(self, serializer):
        booking = serializer.save()
        # Refresh from database to ensure we have the latest saved values
        booking.refresh_from_db()
        _notify_booking(booking, is_update=True)
    
    def perform_destroy(self, instance):
        # Store booking info before deletion for notification
        booking_info = {
            'calendar_id': instance.calendar_id,
            'booking_date': instance.booking_date,
            'client_name': instance.client_name
        }
        instance.delete()
        self._notify_booking_deletion(booking_info)
    
    def _notify_booking_deletion(self, booking_info):
        """Send email notification when a booking is deleted"""
        subject = f"Réservation supprimée pour {booking_info['calendar_id']} le {booking_info['booking_date']}"
        body_lines = [
            "Une réservation a été supprimée :",
            "",
            f"Calendrier : {booking_info['calendar_id']}",
            f"Date : {booking_info['booking_date']}",
            f"Client : {booking_info['client_name']}",
            "",
            "Cette réservation a été supprimée par l'administrateur.",
        ]

        body = "\n".join(body_lines)

        recipient_raw = settings.CONTACT_EMAIL_RECIPIENTS or settings.DEFAULT_FROM_EMAIL
        recipients = [
            email.strip() for email in recipient_raw.split(',')
            if email.strip()
        ]

        email_message = EmailMessage(
            subject=subject,
            body=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=recipients or [settings.DEFAULT_FROM_EMAIL],
        )

        email_message.send(fail_silently=False)


class BookingResetView(APIView):
    permission_classes = [AllowAny]

    def delete(self, request):
        calendar_id = request.query_params.get('calendar_id')

        queryset = Booking.objects.all()
        if calendar_id:
            queryset = queryset.filter(calendar_id=calendar_id)

        deleted_count, _ = queryset.delete()

        return Response({'deleted': deleted_count}, status=status.HTTP_200_OK)


class BookingDebugView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        """Debug endpoint to find dates with 2+ bookings for a calendar_id"""
        calendar_id = request.query_params.get('calendar_id', '1')
        
        # Get all bookings for this calendar_id
        bookings = Booking.objects.filter(calendar_id=calendar_id).order_by('booking_date')
        
        # Group by date and count
        from collections import defaultdict
        date_counts = defaultdict(list)
        
        for booking in bookings:
            date_counts[str(booking.booking_date)].append({
                'id': booking.id,
                'date': str(booking.booking_date),
                'time': booking.booking_time,
                'client': booking.client_name,
                'calendar_id': booking.calendar_id
            })
        
        # Find dates with 2+ bookings
        dates_with_multiple = {}
        for booking_date, booking_list in date_counts.items():
            if len(booking_list) >= 2:
                dates_with_multiple[booking_date] = {
                    'count': len(booking_list),
                    'bookings': booking_list
                }
        
        # Also check using Django aggregation
        today = date.today()
        aggregated = Booking.objects.filter(
            calendar_id=calendar_id,
            booking_date__gte=today  # Only future dates
        ).values('booking_date').annotate(
            booking_count=Count('id')
        ).filter(booking_count__gte=2).order_by('booking_date')
        
        return Response({
            'calendar_id': calendar_id,
            'total_bookings': bookings.count(),
            'dates_with_2_or_more_bookings': dates_with_multiple,
            'future_dates_with_2_or_more_bookings': list(aggregated),
            'all_bookings_by_date': {k: {'count': len(v), 'bookings': v} for k, v in date_counts.items()}
        }, status=status.HTTP_200_OK)


class HolidayListCreateView(generics.ListCreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = HolidaySerializer
    queryset = Holiday.objects.all()
    
    def get_queryset(self):
        try:
            queryset = super().get_queryset()
            calendar_id = self.request.query_params.get('calendar_id')
            start_date = self.request.query_params.get('start_date')
            end_date = self.request.query_params.get('end_date')

            if calendar_id:
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
                queryset = queryset.filter(calendar_id__in=calendar_ids_to_check)

            if start_date:
                queryset = queryset.filter(holiday_date__gte=start_date)

            if end_date:
                queryset = queryset.filter(holiday_date__lte=end_date)

            return queryset.order_by('holiday_date')
        except Exception as e:
            import traceback
            print(f"Error in HolidayListCreateView.get_queryset: {e}")
            print(traceback.format_exc())
            raise
    
    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except Exception as e:
            import traceback
            from django.db import DatabaseError
            from rest_framework.response import Response
            from rest_framework import status
            
            error_message = str(e)
            print(f"Error in HolidayListCreateView.create: {e}")
            print(traceback.format_exc())
            
            # Check if it's a database error (table might not exist)
            if isinstance(e, DatabaseError) or 'no such table' in error_message.lower() or 'does not exist' in error_message.lower():
                return Response(
                    {
                        'detail': 'La table des jours fériés n\'existe pas. Veuillez exécuter les migrations: python manage.py migrate',
                        'error': 'Database table not found'
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # For validation errors, return 400
            if hasattr(e, 'detail') or 'validation' in error_message.lower():
                return Response(
                    {'detail': error_message, 'error': 'Validation error'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # For other errors, return 500 with generic message
            return Response(
                {
                    'detail': 'Une erreur s\'est produite lors de la création du jour férié.',
                    'error': error_message
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class HolidayRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [AllowAny]
    serializer_class = HolidaySerializer
    queryset = Holiday.objects.all()


class UserListCreateView(generics.ListCreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = UserSerializer
    queryset = User.objects.all()
    
    def get_queryset(self):
        queryset = super().get_queryset()
        role = self.request.query_params.get('role')
        
        if role:
            queryset = queryset.filter(role=role)
        
        return queryset.order_by('-created_at')


class UserRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [AllowAny]
    serializer_class = UserSerializer
    queryset = User.objects.all()


class UserLoginView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        
        if not email or not password:
            return Response(
                {'detail': 'Email et mot de passe sont requis.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(email=email)
            if user.check_password(password):
                # Return user data (excluding password)
                return Response({
                    'id': user.id,
                    'name': user.name,
                    'email': user.email,
                    'phone': user.phone,
                    'role': user.role,
                    'message': 'Connexion réussie'
                }, status=status.HTTP_200_OK)
            else:
                return Response(
                    {'detail': 'Email ou mot de passe incorrect.'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
        except User.DoesNotExist:
            return Response(
                {'detail': 'Email ou mot de passe incorrect.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        except Exception as e:
            return Response(
                {'detail': f'Une erreur s\'est produite: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
