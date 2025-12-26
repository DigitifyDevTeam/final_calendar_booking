from datetime import date
import logging
from django.conf import settings
from django.core.mail import EmailMessage
from django.db.models import Count
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser, BasePermission
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import AnonRateThrottle, SimpleRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Booking, ContactMessage, Holiday, User
from .serializers import BookingSerializer, ContactMessageSerializer, HolidaySerializer, UserSerializer

logger = logging.getLogger(__name__)


class LoginRateThrottle(SimpleRateThrottle):
    """
    Custom rate throttle for login endpoint.
    Limits login attempts to prevent brute force attacks.
    """
    scope = 'login'
    
    def get_cache_key(self, request, view):
        # Use IP address as the key for rate limiting
        ident = self.get_ident(request)
        return self.cache_format % {
            'scope': self.scope,
            'ident': ident
        }


class IsAuthenticatedCustom(BasePermission):
    """
    Custom permission class that works with our custom User model.
    Checks if the user is authenticated (not AnonymousUser and user exists).
    """
    def has_permission(self, request, view):
        # Check if user exists and is not AnonymousUser
        if not request.user:
            return False
        
        # Check if it's our custom User model (not AnonymousUser)
        # AnonymousUser doesn't have 'role' attribute, our User model does
        if hasattr(request.user, 'role'):
            return True
        
        # If no role attribute, it's probably AnonymousUser
        return False


class IsAdminUserCustom(BasePermission):
    """
    Custom permission class that checks if the user has 'admin' role
    in the custom User model.
    """
    def has_permission(self, request, view):
        # First check if user is authenticated
        if not request.user or not hasattr(request.user, 'role'):
            return False
        
        # Check if user has admin role
        return request.user.role == 'admin'

CALENDAR_LABELS = {
    'calendar1': 'Pose',
    '1': 'Pose',
    'calendar2': 'Metré',
    '2': 'Metré',
    'calendar3': 'SAV',
    '3': 'SAV',
}


def _notify_booking(booking: Booking, is_update=False):
    """Send email notification for booking creation or update with beautiful HTML template"""
    try:
        action = "modifiée" if is_update else "enregistrée"
        action_icon = "✏️" if is_update else "✅"
        calendar_label = CALENDAR_LABELS.get(booking.calendar_id, booking.calendar_id)
        subject = f"{action_icon} Réservation {action} - {calendar_label} - {booking.booking_date}"
        
        # Format time display
        time_display = ""
        if booking.calendar_id in ['calendar2', 'calendar3', '2', '3']:
            if booking.booking_time and booking.booking_time.strip():
                time_display = booking.booking_time.strip()
            else:
                time_display = "Non spécifiée"
        elif booking.booking_time and booking.booking_time.strip() and booking.booking_time.strip() != '21h00':
            time_display = booking.booking_time.strip()
        
        # Format date and time
        from django.utils import timezone
        created_at = booking.created_at
        if timezone.is_aware(created_at):
            created_at = timezone.localtime(created_at)
        formatted_date = created_at.strftime("%d/%m/%Y à %H:%M")
        
        # Create beautiful HTML email template
        html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }}
        .container {{
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            overflow: hidden;
        }}
        .header {{
            background: linear-gradient(135deg, #FF6B35 0%, #F7931E 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
        }}
        .header h1 {{
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }}
        .content {{
            padding: 30px 20px;
        }}
        .info-box {{
            background-color: #f8f9fa;
            border-left: 4px solid #FF6B35;
            padding: 15px;
            margin: 15px 0;
            border-radius: 4px;
        }}
        .info-row {{
            display: flex;
            padding: 10px 0;
            border-bottom: 1px solid #e9ecef;
        }}
        .info-row:last-child {{
            border-bottom: none;
        }}
        .info-label {{
            font-weight: 600;
            color: #666;
            min-width: 140px;
        }}
        .info-value {{
            color: #333;
            flex: 1;
        }}
        .message-box {{
            background-color: #fff3cd;
            border: 1px solid #ffc107;
            border-radius: 4px;
            padding: 15px;
            margin: 15px 0;
        }}
        .footer {{
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            color: #666;
            font-size: 12px;
            border-top: 1px solid #e9ecef;
        }}
        .badge {{
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            margin-left: 10px;
        }}
        .badge-new {{
            background-color: #28a745;
            color: white;
        }}
        .badge-updated {{
            background-color: #ffc107;
            color: #333;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{action_icon} Réservation {action}</h1>
            <span class="badge {'badge-updated' if is_update else 'badge-new'}">
                {'Modifiée' if is_update else 'Nouvelle'}
            </span>
        </div>
        
        <div class="content">
            <div class="info-box">
                <div class="info-row">
                    <span class="info-label">📅 Calendrier:</span>
                    <span class="info-value"><strong>{calendar_label}</strong></span>
                </div>
                <div class="info-row">
                    <span class="info-label">📆 Date:</span>
                    <span class="info-value"><strong>{booking.booking_date}</strong></span>
                </div>
                {f'<div class="info-row"><span class="info-label">🕐 Heure:</span><span class="info-value"><strong>{time_display}</strong></span></div>' if time_display else ''}
            </div>
            
            <div class="info-box">
                <div class="info-row">
                    <span class="info-label">👤 Client:</span>
                    <span class="info-value"><strong>{booking.client_name}</strong></span>
                </div>
                <div class="info-row">
                    <span class="info-label">📞 Téléphone:</span>
                    <span class="info-value"><a href="tel:{booking.client_phone}">{booking.client_phone}</a></span>
                </div>
                <div class="info-row">
                    <span class="info-label">✏️ Concepteur:</span>
                    <span class="info-value">{booking.designer_name or 'Non spécifié'}</span>
                </div>
            </div>
            
            {f'<div class="message-box"><strong>💬 Message / Commentaire:</strong><br><br>{booking.message}</div>' if booking.message else ''}
            
            <div class="info-box" style="background-color: #e7f3ff; border-left-color: #0066cc;">
                <div class="info-row">
                    <span class="info-label">🆔 ID Réservation:</span>
                    <span class="info-value"><strong>#{booking.id}</strong></span>
                </div>
                <div class="info-row">
                    <span class="info-label">⏰ {'Modifiée' if is_update else 'Créée'} le:</span>
                    <span class="info-value">{formatted_date}</span>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <p>Notification automatique du système de réservation</p>
            <p>Vous recevez cet email car une réservation a été {action} dans le calendrier.</p>
        </div>
    </div>
</body>
</html>
        """
        
        # Plain text fallback
        text_body = f"""
Réservation {action} - {calendar_label}

Calendrier: {calendar_label}
Date: {booking.booking_date}
{f'Heure: {time_display}' if time_display else ''}

Client: {booking.client_name}
Téléphone: {booking.client_phone}
Concepteur: {booking.designer_name or 'Non spécifié'}

{f'Message/Commentaire:\n{booking.message}' if booking.message else ''}

ID Réservation: #{booking.id}
{'Modifiée' if is_update else 'Créée'} le: {formatted_date}
        """.strip()

        # Safely get email settings with defaults
        default_from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@example.com')
        contact_email_recipients = getattr(settings, 'CONTACT_EMAIL_RECIPIENTS', default_from_email)
        
        recipient_raw = contact_email_recipients or default_from_email
        recipients = [
            email.strip() for email in recipient_raw.split(',')
            if email.strip()
        ]

        logger.info(f"Preparing to send booking notification email for booking #{booking.id}")
        logger.info(f"From: {default_from_email}")
        logger.info(f"To: {recipients}")

        email_message = EmailMessage(
            subject=subject,
            body=text_body,  # Plain text fallback
            from_email=default_from_email,
            to=recipients or [default_from_email],
        )
        
        # Set HTML content
        email_message.content_subtype = "html"
        email_message.body = html_body

        try:
            result = email_message.send(fail_silently=True)  # Don't fail if email can't be sent
            logger.info(f"✅ Booking notification email sent successfully for booking #{booking.id} to {recipients}")
            if result:
                logger.info(f"Email backend returned success (sent {result} message(s))")
            else:
                logger.warning(f"Email backend returned {result} - email may not have been sent")
        except Exception as e:
            logger.error(f"❌ FAILED to send booking notification email for booking #{booking.id}: {e}", exc_info=True)
            # Don't break booking creation if email fails
    except Exception as e:
        # Log the error but don't break the booking creation
        logger.error(f"Error sending booking notification email: {e}", exc_info=True)


class ContactEmailView(generics.ListCreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = ContactMessageSerializer
    queryset = ContactMessage.objects.all().order_by('-created_at')

    def perform_create(self, serializer):
        contact_message = serializer.save()
        self._send_email(contact_message)

    def _send_email(self, contact_message: ContactMessage):
        try:
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

            # Safely get email settings with defaults
            default_from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@example.com')
            contact_email_recipients = getattr(settings, 'CONTACT_EMAIL_RECIPIENTS', default_from_email)
            
            recipient_raw = contact_email_recipients or default_from_email
            recipients = [
                email.strip() for email in recipient_raw.split(',')
                if email.strip()
            ]

            email_message = EmailMessage(
                subject=subject,
                body=body,
                from_email=default_from_email,
                to=recipients or [default_from_email],
                reply_to=[contact_message.email],
            )

            email_message.send(fail_silently=True)  # Don't fail if email can't be sent
        except Exception as e:
            # Log the error but don't break the contact message creation
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error sending contact message email: {e}", exc_info=True)


class BookingListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticatedCustom]
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
    permission_classes = [IsAuthenticatedCustom]
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
        try:
            calendar_label = CALENDAR_LABELS.get(booking_info['calendar_id'], booking_info['calendar_id'])
            subject = f"Réservation supprimée pour {calendar_label} le {booking_info['booking_date']}"
            body_lines = [
                "Une réservation a été supprimée :",
                "",
                f"Calendrier : {calendar_label}",
                f"Date : {booking_info['booking_date']}",
                f"Client : {booking_info['client_name']}",
                "",
                "Cette réservation a été supprimée par l'administrateur.",
            ]

            body = "\n".join(body_lines)

            # Safely get email settings with defaults
            default_from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@example.com')
            contact_email_recipients = getattr(settings, 'CONTACT_EMAIL_RECIPIENTS', default_from_email)
            
            recipient_raw = contact_email_recipients or default_from_email
            recipients = [
                email.strip() for email in recipient_raw.split(',')
                if email.strip()
            ]

            email_message = EmailMessage(
                subject=subject,
                body=body,
                from_email=default_from_email,
                to=recipients or [default_from_email],
            )

            email_message.send(fail_silently=True)  # Don't fail if email can't be sent
        except Exception as e:
            # Log the error but don't break the booking deletion
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error sending booking deletion notification email: {e}", exc_info=True)


class BookingResetView(APIView):
    permission_classes = [IsAdminUserCustom]

    def delete(self, request):
        calendar_id = request.query_params.get('calendar_id')

        queryset = Booking.objects.all()
        if calendar_id:
            queryset = queryset.filter(calendar_id=calendar_id)

        deleted_count, _ = queryset.delete()

        return Response({'deleted': deleted_count}, status=status.HTTP_200_OK)


class BookingDebugView(APIView):
    permission_classes = [IsAdminUserCustom]

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
    serializer_class = HolidaySerializer
    queryset = Holiday.objects.all()
    
    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticatedCustom()]
        return [IsAdminUserCustom()]
    
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
            from django.db import DatabaseError
            from rest_framework.response import Response
            from rest_framework import status
            import logging
            
            error_message = str(e)

            logger = logging.getLogger(__name__)
            # Only log unexpected errors; skip noisy traces for validation/db constraint errors
            if not (hasattr(e, "detail") or "validation" in error_message.lower()):
                logger.error(f"Error in HolidayListCreateView.create: {e}", exc_info=True)
            
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
    serializer_class = HolidaySerializer
    queryset = Holiday.objects.all()
    
    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticatedCustom()]
        return [IsAdminUserCustom()]


class UserListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAdminUserCustom]
    serializer_class = UserSerializer
    queryset = User.objects.all()
    
    def get_queryset(self):
        queryset = super().get_queryset()
        role = self.request.query_params.get('role')
        
        if role:
            queryset = queryset.filter(role=role)
        
        return queryset.order_by('-created_at')


class UserRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminUserCustom]
    serializer_class = UserSerializer
    queryset = User.objects.all()


class UserLoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [LoginRateThrottle]  # Rate limit login attempts to prevent brute force
    
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
                # Generate JWT tokens
                refresh = RefreshToken()
                refresh['user_id'] = user.id
                refresh['email'] = user.email
                refresh['role'] = user.role
                
                # Return user data with JWT tokens
                return Response({
                    'id': user.id,
                    'name': user.name,
                    'email': user.email,
                    'phone': user.phone,
                    'role': user.role,
                    'access': str(refresh.access_token),
                    'refresh': str(refresh),
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
