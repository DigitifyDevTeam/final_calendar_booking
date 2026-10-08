from datetime import date, datetime, time as dt_time, timedelta
import logging
import re
import secrets
import os
from django.conf import settings
from django.core.mail import EmailMessage
from django.db.models import Count, Q
from django.utils import timezone
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser, BasePermission
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import AnonRateThrottle, SimpleRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Booking, ContactMessage, Holiday, User, PasswordResetToken, Magasin
from .serializers import BookingSerializer, ContactMessageSerializer, HolidaySerializer, UserSerializer, PasswordResetRequestSerializer, PasswordResetConfirmSerializer, MagasinSerializer

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
    'calendar2': 'SAV',
    '2': 'SAV',
    'calendar3': 'Metré',
    '3': 'Metré',
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
            background: linear-gradient(135deg, #284B73 0%, #F7931E 100%);
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
            border-left: 4px solid #284B73;
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
        message_section = f'Message/Commentaire:\n{booking.message}' if booking.message else ''
        
        text_body = f"""
Réservation {action} - {calendar_label}

Calendrier: {calendar_label}
Date: {booking.booking_date}
{f'Heure: {time_display}' if time_display else ''}

Client: {booking.client_name}
Téléphone: {booking.client_phone}
Concepteur: {booking.designer_name or 'Non spécifié'}

{message_section}

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
            
            queryset = queryset.filter(calendar_id__in=calendar_ids_to_query)

        if start_date:
            queryset = queryset.filter(booking_date__gte=start_date)

        if end_date:
            queryset = queryset.filter(booking_date__lte=end_date)

        return queryset.order_by('booking_date', 'booking_time', 'id')

    def perform_create(self, serializer):
        serializer.save()
        booking = serializer.instance
        booking.refresh_from_db()
        _notify_booking(booking)


class BookingRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticatedCustom]
    serializer_class = BookingSerializer
    queryset = Booking.objects.all()

    def get_queryset(self):
        return super().get_queryset()

    def perform_update(self, serializer):
        serializer.save()
        booking = serializer.instance
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
        self._notify_booking_deletion(booking_info, request=self.request)
    
    def _notify_booking_deletion(self, booking_info, request=None):
        """Send email notification when a booking is deleted"""
        try:
            # Who deleted: concepteur or admin + name
            deleter_role = "concepteur"
            deleter_name = ""
            if request and getattr(request, 'user', None) and hasattr(request.user, 'role'):
                deleter_role = "concepteur" if request.user.role == "concepteur" else "admin"
                deleter_name = getattr(request.user, 'name', '') or ""
            deleter_line = f"{deleter_role} {deleter_name}".strip() or "—"

            calendar_label = CALENDAR_LABELS.get(booking_info['calendar_id'], booking_info['calendar_id'])
            subject = f"Réservation supprimée pour {calendar_label} le {booking_info['booking_date']}"
            body_lines = [
                "Une réservation a été supprimée :",
                "",
                f"Calendrier : {calendar_label}",
                f"Date : {booking_info['booking_date']}",
                f"Client : {booking_info['client_name']}",
                "",
                f"Supprimée par : {deleter_line}",
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


class PasswordResetRequestView(APIView):
    """View to handle password reset requests"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        
        if not serializer.is_valid():
            # Always return success for security (don't reveal if email exists)
            return Response(
                {'message': 'Si cette adresse e-mail existe dans notre système, vous recevrez un e-mail avec les instructions de réinitialisation.'},
                status=status.HTTP_200_OK
            )
        
        email = serializer.validated_data['email']
        
        try:
            # Get user by email (case-insensitive lookup)
            # This will only work if the email exists in the database
            # If email was changed, old email won't be found here
            user = User.objects.get(email__iexact=email)
            
            # Refresh from database to ensure we have the latest email value
            user.refresh_from_db()
            
            # Double-check that the email in the database matches exactly (case-sensitive)
            # This ensures we're using the current email from database, not a stale value
            if user.email != email:
                # Email doesn't match exactly - return error
                logger.warning(f"Password reset requested for email '{email}' but user has email '{user.email}'")
            return Response(
                    {'error': 'Cette adresse e-mail n\'est associée à aucun compte. Veuillez vérifier l\'adresse e-mail.'},
                status=status.HTTP_404_NOT_FOUND
            )
        except User.DoesNotExist:
            # Email doesn't exist in database - return error
            logger.info(f"Password reset requested for non-existent email: {email}")
            return Response(
                {'error': 'Cette adresse e-mail n\'est associée à aucun compte. Veuillez vérifier l\'adresse e-mail.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Generate secure random token
        token = secrets.token_urlsafe(32)
        
        # Create password reset token with 1-hour expiry
        expires_at = timezone.now() + timedelta(hours=1)
        reset_token = PasswordResetToken.objects.create(
            user=user,
            token=token,
            expires_at=expires_at
        )
        
        # Send email with token
        try:
            default_from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@example.com')
            
            subject = "🔐 Réinitialisation de votre mot de passe"
            
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
            background: linear-gradient(135deg, #284B73 0%, #F7931E 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
        }}
        .header h1 {{
            margin: 0;
            font-size: 24px;
        }}
        .content {{
            padding: 30px 20px;
        }}
        .token-box {{
            background-color: #f8f9fa;
            border: 2px dashed #284B73;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 20px 0;
        }}
        .token-code {{
            font-size: 24px;
            font-weight: bold;
            color: #284B73;
            letter-spacing: 2px;
            font-family: 'Courier New', monospace;
            word-break: break-all;
        }}
        .info-box {{
            background-color: #e7f3ff;
            border-left: 4px solid #0066cc;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }}
        .warning-box {{
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }}
        .footer {{
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            color: #666;
            font-size: 12px;
        }}
        .button {{
            display: inline-block;
            padding: 12px 24px;
            background: linear-gradient(135deg, #284B73 0%, #F7931E 100%);
            color: white;
            text-decoration: none;
            border-radius: 6px;
            margin-top: 20px;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Réinitialisation de mot de passe</h1>
        </div>
        
        <div class="content">
            <p>Bonjour <strong>{user.name}</strong>,</p>
            
            <p>Vous avez demandé à réinitialiser votre mot de passe. Utilisez le code ci-dessous pour compléter la réinitialisation :</p>
            
            <div class="token-box">
                <div style="margin-bottom: 10px; color: #666;">Votre code de réinitialisation :</div>
                <div class="token-code">{token}</div>
            </div>
            
            <div class="info-box">
                <strong>⏰ Important :</strong> Ce code est valide pendant <strong>1 heure</strong> uniquement.
            </div>
            
            <div class="warning-box">
                <strong>🔒 Sécurité :</strong> Si vous n'avez pas demandé cette réinitialisation, ignorez cet e-mail. Votre mot de passe ne sera pas modifié.
            </div>
            
            <p>Pour réinitialiser votre mot de passe :</p>
            <ol>
                <li>Retournez sur la page de connexion</li>
                <li>Cliquez sur "Mot de passe oublié ?"</li>
                <li>Entrez votre adresse e-mail et le code ci-dessus</li>
                <li>Créez votre nouveau mot de passe</li>
            </ol>
        </div>
        
        <div class="footer">
            <p>Cet e-mail a été envoyé automatiquement. Ne répondez pas à cet e-mail.</p>
            <p>© {timezone.now().year} - Système de réservation</p>
        </div>
    </div>
</body>
</html>
            """
            
            # Plain text fallback
            text_body = f"""
Réinitialisation de mot de passe

Bonjour {user.name},

Vous avez demandé à réinitialiser votre mot de passe. Utilisez le code ci-dessous pour compléter la réinitialisation :

Code de réinitialisation : {token}

Important : Ce code est valide pendant 1 heure uniquement.

Sécurité : Si vous n'avez pas demandé cette réinitialisation, ignorez cet e-mail. Votre mot de passe ne sera pas modifié.

Pour réinitialiser votre mot de passe :
1. Retournez sur la page de connexion
2. Cliquez sur "Mot de passe oublié ?"
3. Entrez votre adresse e-mail et le code ci-dessus
4. Créez votre nouveau mot de passe

Cet e-mail a été envoyé automatiquement. Ne répondez pas à cet e-mail.
            """.strip()
            
            email_message = EmailMessage(
                subject=subject,
                body=text_body,
                from_email=default_from_email,
                to=[user.email],
            )
            
            # Set HTML content
            email_message.content_subtype = "html"
            email_message.body = html_body
            
            # Send email
            email_message.send(fail_silently=False)
            
            logger.info(f"Password reset email sent to {user.email}")
            
        except Exception as e:
            logger.error(f"Failed to send password reset email to {user.email}: {e}", exc_info=True)
            # Still return success to not reveal if email sending failed
        
        # Always return success message (for security)
            return Response(
            {'message': 'Si cette adresse e-mail existe dans notre système, vous recevrez un e-mail avec les instructions de réinitialisation.'},
            status=status.HTTP_200_OK
            )
        

class PasswordResetConfirmView(APIView):
    """View to handle password reset confirmation"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        reset_token = serializer.validated_data['reset_token']
        new_password = serializer.validated_data['new_password']
            
        try:
            # Update user password
            user = reset_token.user
            user.set_password(new_password)
            user.save()
            
            # Mark token as used
            reset_token.used = True
            reset_token.save()
            
            logger.info(f"Password reset completed for user {user.email}")
            
            return Response(
                {'message': 'Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.'},
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            logger.error(f"Failed to reset password: {e}", exc_info=True)
            return Response(
                {'detail': 'Une erreur s\'est produite lors de la réinitialisation du mot de passe.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class MagasinListCreateView(generics.ListCreateAPIView):
    """View to list and create magasins"""
    permission_classes = [IsAdminUserCustom]
    serializer_class = MagasinSerializer
    queryset = Magasin.objects.all()
    
    def get_queryset(self):
        queryset = super().get_queryset()
        # Prefetch concepteurs for better performance
        return queryset.prefetch_related('concepteurs').all()


class MagasinRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    """View to retrieve, update, and delete magasins"""
    permission_classes = [IsAdminUserCustom]
    serializer_class = MagasinSerializer
    queryset = Magasin.objects.all()
    
    def get_queryset(self):
        queryset = super().get_queryset()
        # Prefetch concepteurs for better performance
        return queryset.prefetch_related('concepteurs').all()


class ConcepteurMagasinView(APIView):
    """View for concepteurs to get their own magasin"""
    permission_classes = [IsAuthenticatedCustom]
    
    def get(self, request):
        """Return the magasin that the current concepteur belongs to"""
        user = request.user
        
        # Only allow concepteurs
        if user.role != 'concepteur':
            return Response(
                {'error': 'Cette ressource est uniquement disponible pour les concepteurs.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get the magasin(s) that this concepteur belongs to
        magasins = user.magasins.all()
        
        if not magasins.exists():
            return Response(
                {'error': 'Aucun magasin associé à ce concepteur.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Return the first magasin (a concepteur should typically belong to one magasin)
        magasin = magasins.prefetch_related('concepteurs').first()
        concepteurs = list(magasin.concepteurs.all())
        return Response({
            'id': magasin.id,
            'name': magasin.name,
            'concepteurs': [c.id for c in concepteurs],
            'concepteurs_details': [{
                'id': c.id,
                'name': c.name,
                'email': c.email,
                'phone': getattr(c, 'phone', '') or '',
            } for c in concepteurs],
            'created_at': magasin.created_at.isoformat() if magasin.created_at else None,
            'updated_at': magasin.updated_at.isoformat() if magasin.updated_at else None,
        })


def _collect_completion_recipients(booking: Booking):
    """Build recipient list for completion emails (concepteur / designer only)."""
    recipients = []
    seen = set()

    def add_email(email):
        if not email:
            return
        normalized = email.strip().lower()
        if normalized and normalized not in seen:
            seen.add(normalized)
            recipients.append(email.strip())

    designer = User.objects.filter(name__iexact=booking.designer_name, role='concepteur').first()
    if not designer and booking.designer_name:
        first = booking.designer_name.split()[0]
        designer = User.objects.filter(name__icontains=first, role='concepteur').first()
    if designer and designer.email:
        add_email(designer.email)

    return recipients


def _notify_booking_completion(booking: Booking, technicien_name: str, uploaded_files: list):
    """Send email notification when a booking is finished (concepteur recipients only)."""
    try:
        recipients = _collect_completion_recipients(booking)
        if not recipients:
            logger.warning(f"No completion email recipients for booking #{booking.id} (designer={booking.designer_name})")
            return

        calendar_label = CALENDAR_LABELS.get(booking.calendar_id, booking.calendar_id)
        subject = f"✅ Intervention terminée - {booking.client_name} - {calendar_label}"
        actor_label = "Technicien"
        actor_emoji = "👷"
        header_subtitle = "Le technicien a finalisé l'intervention"
        
        # Format date
        from django.utils import timezone as dj_timezone
        completed_at = booking.completed_at
        if completed_at and dj_timezone.is_aware(completed_at):
            completed_at = dj_timezone.localtime(completed_at)
        formatted_completed = completed_at.strftime('%d/%m/%Y à %H:%M') if completed_at else 'Non spécifiée'
        
        # Format time display
        time_display = ""
        if booking.calendar_id in ['calendar2', 'calendar3', '2', '3']:
            if booking.booking_time and booking.booking_time.strip():
                time_display = booking.booking_time.strip()
        elif booking.booking_time and booking.booking_time.strip() and booking.booking_time.strip() != '21h00':
            time_display = booking.booking_time.strip()
        
        # Build checkmarks: selected = green check; except "Un SAV à prévoir ?" where selected = red X
        # Electromenager and SAV à prévoir show Oui/Non (from radio choices)
        check_icon = "✅"
        cross_icon = "❌"
        
        electromenager_html = ""
        if booking.electromenager_fonctionnel is not None:
            icon = check_icon if booking.electromenager_fonctionnel else cross_icon
            rep = "Oui" if booking.electromenager_fonctionnel else "Non"
            electromenager_html = f"<div style='margin: 8px 0;'><span style='font-size: 18px;'>{icon}</span><span style='margin-left: 8px;'>L'électroménager est fonctionnel: <strong>{rep}</strong></span></div>"
        sav_prevoir_html = ""
        if booking.sav_a_prevoir is not None:
            icon = cross_icon if booking.sav_a_prevoir else check_icon
            rep = "Oui" if booking.sav_a_prevoir else "Non"
            sav_prevoir_html = f"<div style='margin: 8px 0;'><span style='font-size: 18px;'>{icon}</span><span style='margin-left: 8px;'>Un SAV à prévoir ?: <strong>{rep}</strong></span></div>"
        # Metré only: J'ai pris l'ascenseur et les escaliers
        ascenseur_escaliers_html = ""
        if booking.ascenseur_escaliers is not None and booking.calendar_id in ['calendar3', '3']:
            icon = check_icon if booking.ascenseur_escaliers else cross_icon
            ascenseur_escaliers_html = f"<div style='margin: 8px 0;'><span style='font-size: 18px;'>{icon}</span><span style='margin-left: 8px;'>J'ai pris l'ascenseur et les escaliers</span></div>"
        
        checks_html = f"""
        <div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid #28a745;">
            <h3 style="margin: 0 0 15px 0; color: #28a745;">État de l'intervention</h3>
            <div style="margin: 8px 0;">
                <span style="font-size: 18px;">{check_icon if booking.menage_fait else cross_icon}</span>
                <span style="margin-left: 8px;">Le ménage est fait</span>
            </div>
            <div style="margin: 8px 0;">
                <span style="font-size: 18px;">{check_icon if booking.cft_signe else cross_icon}</span>
                <span style="margin-left: 8px;">Le CFT est signé</span>
            </div>
            {electromenager_html}
            {sav_prevoir_html}
            {ascenseur_escaliers_html}
        </div>
        """
        
        # Build files section
        files_html = ""
        if uploaded_files:
            files_list = "".join([
                f"<li style='margin: 5px 0;'>📎 {f['original_name']}</li>"
                for f in uploaded_files
            ])
            files_html = f"""
            <div style="margin: 20px 0; padding: 15px; background-color: #fff3cd; border-radius: 8px; border-left: 4px solid #ffc107;">
                <h3 style="margin: 0 0 15px 0; color: #856404;">📁 Fichiers joints ({len(uploaded_files)})</h3>
                <ul style="margin: 0; padding-left: 20px;">
                    {files_list}
                </ul>
                <p style="margin: 10px 0 0 0; font-size: 12px; color: #666;">
                    Les fichiers sont disponibles dans le dossier de la réservation.
                </p>
            </div>
            """
        
        html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">✅ Intervention Terminée</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">{header_subtitle}</p>
        </div>
        
        <div style="padding: 30px;">
            <div style="background-color: #e8f5e9; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #28a745;">
                <p style="margin: 0; font-size: 16px;">
                    <strong>{actor_emoji} {actor_label} :</strong> {technicien_name}
                </p>
                <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">
                    Terminé le {formatted_completed}
                </p>
            </div>
            
            <div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #2196f3;">
                <h3 style="margin: 0 0 15px 0; color: #1976d2;">📋 Détails de la réservation</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; color: #666;">📅 Calendrier:</td>
                        <td style="padding: 8px 0; font-weight: bold;">{calendar_label}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #666;">📆 Date:</td>
                        <td style="padding: 8px 0; font-weight: bold;">{booking.booking_date}</td>
                    </tr>
                    {"<tr><td style='padding: 8px 0; color: #666;'>🕐 Heure:</td><td style='padding: 8px 0; font-weight: bold;'>" + time_display + "</td></tr>" if time_display else ""}
                    <tr>
                        <td style="padding: 8px 0; color: #666;">👤 Client:</td>
                        <td style="padding: 8px 0; font-weight: bold;">{booking.client_name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #666;">📞 Téléphone:</td>
                        <td style="padding: 8px 0;"><a href="tel:{booking.client_phone}" style="color: #2196f3;">{booking.client_phone}</a></td>
                    </tr>
                </table>
            </div>
            
            {checks_html}
            
            {files_html}
            
            {"<div style='background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin-top: 20px;'><strong>💬 Message / Commentaire:</strong><br><br>" + booking.message + "</div>" if booking.message else ""}
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
            <p style="margin: 0; color: #6c757d; font-size: 12px;">
                Notification automatique du système de réservation
            </p>
            <p style="margin: 5px 0 0 0; color: #6c757d; font-size: 12px;">
                Réservation #{booking.id}
            </p>
        </div>
    </div>
</body>
</html>
        """
        
        # Plain text fallback (same inverted meaning: Oui = technicien selected = shown as attention in HTML)
        ascenseur_text = ""
        if booking.ascenseur_escaliers is not None and booking.calendar_id in ['calendar3', '3']:
            ascenseur_text = "\n- J'ai pris l'ascenseur et les escaliers: " + ('Oui' if booking.ascenseur_escaliers else 'Non')
        checks_text = f"""
État de l'intervention:
- Le ménage est fait: {'Oui' if booking.menage_fait else 'Non'}
- Le CFT est signé: {'Oui' if booking.cft_signe else 'Non'}
{"- L'électroménager est fonctionnel: " + ('Oui' if booking.electromenager_fonctionnel else 'Non') if booking.electromenager_fonctionnel is not None else ""}
{"- Un SAV à prévoir ?: " + ('Oui' if booking.sav_a_prevoir else 'Non') if booking.sav_a_prevoir is not None else ""}{ascenseur_text}
        """.strip()
        
        files_text = ""
        if uploaded_files:
            files_text = "\nFichiers joints:\n" + "\n".join([f"- {f['original_name']}" for f in uploaded_files])
        
        text_body = f"""
Intervention Terminée - {calendar_label}

{actor_label}: {technicien_name}
Terminé le: {formatted_completed}

--- Détails de la réservation ---
Calendrier: {calendar_label}
Date: {booking.booking_date}
{f'Heure: {time_display}' if time_display else ''}
Client: {booking.client_name}
Téléphone: {booking.client_phone}

{checks_text}
{files_text}

{f'Message/Commentaire: {booking.message}' if booking.message else ''}

---
Réservation #{booking.id}
Notification automatique du système de réservation
        """.strip()
        
        # Get email settings
        default_from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@example.com')
        
        logger.info(f"Sending completion notification to {recipients} for booking #{booking.id}")
        
        email_message = EmailMessage(
            subject=subject,
            body=text_body,
            from_email=default_from_email,
            to=recipients,
        )
        
        # Set HTML content
        email_message.content_subtype = "html"
        email_message.body = html_body
        
        # Attach uploaded files to the email
        if uploaded_files:
            import mimetypes
            media_root = getattr(settings, 'MEDIA_ROOT', os.path.join(settings.BASE_DIR, 'media'))
            for file_info in uploaded_files:
                try:
                    # Construct full file path
                    file_path = os.path.join(media_root, file_info['path'])
                    
                    # Check if file exists
                    if os.path.exists(file_path):
                        # Detect MIME type based on file extension
                        original_name = file_info['original_name']
                        mime_type, _ = mimetypes.guess_type(original_name)
                        
                        # Default MIME types for common formats
                        if not mime_type:
                            ext = os.path.splitext(original_name)[1].lower()
                            mime_map = {
                                '.jpg': 'image/jpeg',
                                '.jpeg': 'image/jpeg',
                                '.png': 'image/png',
                                '.gif': 'image/gif',
                                '.pdf': 'application/pdf',
                                '.doc': 'application/msword',
                                '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                            }
                            mime_type = mime_map.get(ext, 'application/octet-stream')
                        
                        # Read file in binary mode to preserve quality
                        with open(file_path, 'rb') as f:
                            file_content = f.read()
                            
                            # Attach file with proper MIME type
                            email_message.attach(
                                filename=original_name,
                                content=file_content,
                                mimetype=mime_type
                            )
                        logger.info(f"Attached file {original_name} (MIME: {mime_type}, Size: {len(file_content)} bytes) to email for booking #{booking.id}")
                    else:
                        logger.warning(f"File not found: {file_path} for booking #{booking.id}")
                except Exception as e:
                    logger.error(f"Failed to attach file {file_info.get('original_name', 'unknown')} to email: {e}", exc_info=True)
        
        email_message.send(fail_silently=False)
        
        logger.info(f"Completion notification sent to {recipients} for booking #{booking.id} with {len(uploaded_files)} attached files")
        
    except Exception as e:
        logger.error(f"Failed to send completion notification for booking #{booking.id}: {e}", exc_info=True)


def _parse_booking_appointment_start(booking: Booking):
    """
    Build the appointment datetime used for the 48h finalization window.
    Pose placeholder time '21h00' is treated as start of day.
    """
    hour, minute = 0, 0
    raw = (booking.booking_time or '').strip().lower()
    if raw and raw != '21h00':
        # Ranges like "8:00-11:00" → use start; also support "8h00" / "08:00"
        start_part = raw.split('-', 1)[0].strip()
        match = re.match(r'^(\d{1,2})[h:](\d{2})?$', start_part)
        if match:
            hour = int(match.group(1))
            minute = int(match.group(2) or 0)
            if hour > 23:
                hour, minute = 0, 0

    naive = datetime.combine(booking.booking_date, dt_time(hour=hour, minute=minute))
    if timezone.is_naive(naive):
        return timezone.make_aware(naive, timezone.get_current_timezone())
    return naive


def _technician_can_finish_booking(booking: Booking):
    """
    Technicien may finalize Pose / SAV / Métré from the appointment day
    until 48 hours after the scheduled appointment start.
    """
    now = timezone.now()
    day_start = timezone.make_aware(
        datetime.combine(booking.booking_date, dt_time.min),
        timezone.get_current_timezone(),
    )
    deadline = _parse_booking_appointment_start(booking) + timedelta(hours=48)
    if now < day_start:
        return False, (
            'La finalisation n\'est possible qu\'à partir de la date du rendez-vous.'
        )
    if now > deadline:
        return False, (
            'Le délai de finalisation de 48 heures après le rendez-vous est dépassé.'
        )
    return True, None


class BookingFinishView(APIView):
    """View to handle technician finishing a booking with completion data and file uploads"""
    permission_classes = [IsAuthenticatedCustom]
    
    def post(self, request, pk):
        """
        Finish a booking - update completion fields and save uploaded files
        Expected data:
        - menage_fait: boolean
        - cft_signe: boolean
        - electromenager_fonctionnel: boolean (optional, for SAV/Metré)
        - files: list of files (multipart/form-data)
        """
        try:
            # Get the booking
            try:
                booking = Booking.objects.get(pk=pk)
            except Booking.DoesNotExist:
                return Response(
                    {'detail': 'Réservation introuvable.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Check if booking is already finished - prevent finishing twice
            if booking.status == 'termine':
                return Response(
                    {'detail': 'Cette réservation a déjà été terminée.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if booking.status == 'annule':
                return Response(
                    {'detail': 'Cette réservation a été annulée et ne peut plus être terminée.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            user_role = getattr(request.user, 'role', None)
            if user_role != 'technicien':
                return Response(
                    {'detail': 'Seuls les techniciens peuvent finaliser une intervention.'},
                    status=status.HTTP_403_FORBIDDEN
                )

            technicien_name = request.user.name if hasattr(request.user, 'name') else 'Technicien'

            # Pose / SAV / Métré: finalize until 48h after the scheduled appointment
            can_finish, finish_error = _technician_can_finish_booking(booking)
            if not can_finish:
                return Response(
                    {'detail': finish_error},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Helper function to convert string boolean to actual boolean
            def str_to_bool(value):
                if isinstance(value, bool):
                    return value
                if isinstance(value, str):
                    return value.lower() in ('true', '1', 'yes', 'on')
                return bool(value)
            
            # Update completion fields - convert string booleans from FormData
            # menage_fait: only for Pose/SAV (not sent for Metré)
            if 'menage_fait' in request.data:
                booking.menage_fait = str_to_bool(request.data.get('menage_fait', False))
            booking.cft_signe = str_to_bool(request.data.get('cft_signe', False))
            # electromenager_fonctionnel: only for Pose/SAV (not sent for Metré)
            if 'electromenager_fonctionnel' in request.data:
                booking.electromenager_fonctionnel = str_to_bool(request.data.get('electromenager_fonctionnel'))
            
            # Un SAV à prévoir ? (SAV and Pose only)
            is_sav = booking.calendar_id in ['calendar2', '2']
            is_pose = booking.calendar_id in ['calendar1', '1']
            if is_sav or is_pose:
                if 'sav_a_prevoir' in request.data:
                    booking.sav_a_prevoir = str_to_bool(request.data.get('sav_a_prevoir'))
            
            # J'ai pris l'ascenseur et les escaliers (Metré only)
            if booking.calendar_id in ['calendar3', '3'] and 'ascenseur_escaliers' in request.data:
                booking.ascenseur_escaliers = str_to_bool(request.data.get('ascenseur_escaliers'))

            # Message / Commentaire de clôture (technicien ou admin)
            if 'message' in request.data:
                finish_message = str(request.data.get('message') or '').strip()
                if finish_message:
                    existing = (booking.message or '').strip()
                    if existing:
                        booking.message = f"{existing}\n\n--- Clôture ---\n{finish_message}"
                    else:
                        booking.message = finish_message
            
            # Set status to 'termine' when technician finishes the booking
            booking.status = 'termine'
            booking.completed_at = timezone.now()
            booking.save()
            
            # Handle file uploads (images and PDFs can be mixed in the same request)
            uploaded_files = []
            files_list = request.FILES.getlist('files')
            if not files_list:
                # Fallback for clients that send files under slightly different keys
                for key in request.FILES:
                    files_list.extend(request.FILES.getlist(key))

            if files_list:
                allowed_extensions = {
                    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif', '.bmp', '.pdf'
                }
                allowed_content_types = {
                    'application/pdf',
                    'image/jpeg',
                    'image/png',
                    'image/gif',
                    'image/webp',
                    'image/heic',
                    'image/heif',
                    'image/bmp',
                    'image/jpg',
                }

                # Create folder name from client name and booking date
                # Sanitize client name for folder name (remove special characters)
                client_name_safe = "".join(c for c in booking.client_name if c.isalnum() or c in (' ', '-', '_')).strip()
                client_name_safe = client_name_safe.replace(' ', '_')
                folder_name = f"{client_name_safe}_{booking.booking_date}_{booking.id}"
                
                # Create folder path
                media_root = getattr(settings, 'MEDIA_ROOT', os.path.join(settings.BASE_DIR, 'media'))
                booking_folder = os.path.join(media_root, 'bookings', folder_name)
                os.makedirs(booking_folder, exist_ok=True)
                
                # Save each file (PDF + images allowed together)
                from datetime import datetime
                for index, file in enumerate(files_list):
                    original_filename = file.name or f'attachment_{index}'
                    file_extension = os.path.splitext(original_filename)[1].lower()
                    content_type = (getattr(file, 'content_type', None) or '').lower()

                    is_allowed = (
                        file_extension in allowed_extensions
                        or content_type in allowed_content_types
                        or content_type.startswith('image/')
                    )
                    if not is_allowed:
                        logger.warning(
                            f"Skipping unsupported attachment '{original_filename}' "
                            f"(type={content_type}) for booking {booking.id}"
                        )
                        continue

                    # Unique filename to avoid collisions when mixing several attachments
                    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f')
                    safe_original = "".join(
                        c for c in original_filename if c.isalnum() or c in (' ', '-', '_', '.')
                    ).strip() or f'file{file_extension}'
                    safe_filename = f"{timestamp}_{index}_{safe_original}"
                    
                    # Save file
                    file_path = os.path.join(booking_folder, safe_filename)
                    with open(file_path, 'wb+') as destination:
                        for chunk in file.chunks():
                            destination.write(chunk)
                    
                    # Store relative path for response
                    relative_path = f"bookings/{folder_name}/{safe_filename}"
                    uploaded_files.append({
                        'original_name': original_filename,
                        'saved_name': safe_filename,
                        'path': relative_path
                    })
            
            logger.info(f"Booking {booking.id} completed by technician {technicien_name}. Files uploaded: {len(uploaded_files)}")
            
            _notify_booking_completion(booking, technicien_name, uploaded_files)
            
            return Response({
                'message': 'Réservation finalisée avec succès.',
                'booking_id': booking.id,
                'uploaded_files': uploaded_files,
                'completion_data': {
                    'menage_fait': booking.menage_fait,
                    'cft_signe': booking.cft_signe,
                    'electromenager_fonctionnel': booking.electromenager_fonctionnel,
                    'ascenseur_escaliers': booking.ascenseur_escaliers,
                    'completed_at': booking.completed_at.isoformat() if booking.completed_at else None,
                    'status': booking.status
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error finishing booking {pk}: {e}", exc_info=True)
            return Response(
                {'detail': f'Une erreur s\'est produite lors de la finalisation de la réservation: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

