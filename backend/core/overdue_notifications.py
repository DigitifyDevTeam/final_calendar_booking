"""
Overdue SAV / Métré mission notifications for administrators.

A mission is overdue when:
- calendar is SAV (calendar2 / 2) or Métré (calendar3 / 3)
- status is still "en_attente"
- booking_date < today (Europe/Paris local date)

Each overdue mission is emailed only once (Booking.overdue_notified_at).
"""
import logging
from datetime import timedelta

from django.conf import settings
from django.core.mail import EmailMessage
from django.utils import timezone
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Booking, User

logger = logging.getLogger(__name__)

SAV_METRE_CALENDAR_IDS = ['calendar2', '2', 'calendar3', '3']

CALENDAR_LABELS = {
    'calendar1': 'Pose',
    '1': 'Pose',
    'calendar2': 'SAV',
    '2': 'SAV',
    'calendar3': 'Métré',
    '3': 'Métré',
}


class IsAdminRole(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and hasattr(request.user, 'role') and request.user.role == 'admin')


def get_admin_notification_recipients():
    """
    Recipients for admin operational alerts:
    - all users with role=admin
    - plus CONTACT_EMAIL_RECIPIENTS as fallback / shared inbox
    """
    admin_emails = list(
        User.objects.filter(role='admin')
        .exclude(email__isnull=True)
        .exclude(email='')
        .values_list('email', flat=True)
    )

    default_from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@example.com')
    contact_email_recipients = getattr(settings, 'CONTACT_EMAIL_RECIPIENTS', default_from_email)
    contact_emails = [
        email.strip()
        for email in (contact_email_recipients or '').split(',')
        if email.strip()
    ]

    recipients = []
    seen = set()
    for email in admin_emails + contact_emails:
        normalized = email.lower()
        if normalized not in seen:
            seen.add(normalized)
            recipients.append(email)

    if not recipients:
        recipients = [default_from_email]
    return recipients


def get_overdue_sav_metre_bookings(today=None, only_yesterday=False):
    """SAV/Métré missions still open after their planned day. Pose excluded."""
    if today is None:
        today = timezone.localdate()
    qs = Booking.objects.filter(
        status='en_attente',
        calendar_id__in=SAV_METRE_CALENDAR_IDS,
        booking_date__lt=today,
        overdue_notified_at__isnull=True,
    )
    if only_yesterday:
        yesterday = today - timedelta(days=1)
        qs = qs.filter(booking_date=yesterday)
    return qs.order_by('booking_date', 'id')


def notify_overdue_mission(booking: Booking, recipients=None) -> bool:
    """
    Notify administrators that a SAV/Métré mission exceeded its planned end date.
    Returns True if the email was sent successfully.
    """
    try:
        if recipients is None:
            recipients = get_admin_notification_recipients()

        calendar_label = CALENDAR_LABELS.get(booking.calendar_id, booking.calendar_id)
        today = timezone.localdate()
        days_overdue = (today - booking.booking_date).days
        time_display = (booking.booking_time or '').strip() or 'Non spécifiée'
        formatted_planned_date = booking.booking_date.strftime('%d/%m/%Y')
        day_label = 'jours' if days_overdue > 1 else 'jour'

        subject = (
            f"⚠️ Mission non terminée - {calendar_label} - "
            f"{booking.client_name} - {formatted_planned_date}"
        )

        message_html = (
            f"<div class='detail-row'><strong>Message :</strong> {booking.message}</div>"
            if booking.message
            else ''
        )
        message_text = f"Message: {booking.message}" if booking.message else ''

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
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }}
        .header {{
            background: linear-gradient(135deg, #dc2626 0%, #f97316 100%);
            color: white;
            padding: 24px;
            text-align: center;
        }}
        .content {{
            padding: 24px;
        }}
        .info-box {{
            background-color: #fef2f2;
            border-left: 4px solid #dc2626;
            padding: 16px;
            margin: 16px 0;
            border-radius: 4px;
        }}
        .detail-row {{
            margin: 8px 0;
        }}
        .footer {{
            padding: 16px 24px;
            background-color: #f9fafb;
            color: #6b7280;
            font-size: 13px;
            text-align: center;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2 style="margin: 0;">Mission non terminée</h2>
            <p style="margin: 10px 0 0 0; opacity: 0.95;">
                Un technicien a dépassé la date prévue de fin
            </p>
        </div>
        <div class="content">
            <div class="info-box">
                <strong>Calendrier :</strong> {calendar_label}<br>
                <strong>Date prévue de fin :</strong> {formatted_planned_date}<br>
                <strong>Retard :</strong> {days_overdue} {day_label}
            </div>
            <div class="detail-row"><strong>Client :</strong> {booking.client_name}</div>
            <div class="detail-row"><strong>Téléphone :</strong> {booking.client_phone}</div>
            <div class="detail-row"><strong>Concepteur :</strong> {booking.designer_name or 'Non spécifié'}</div>
            <div class="detail-row"><strong>Créneau :</strong> {time_display}</div>
            <div class="detail-row"><strong>ID réservation :</strong> #{booking.id}</div>
            <div class="detail-row"><strong>Statut :</strong> En attente (non terminée)</div>
            {message_html}
        </div>
        <div class="footer">
            <p>Notification automatique du système de réservation</p>
            <p>Cette alerte est envoyée une seule fois par mission en retard (SAV / Métré).</p>
        </div>
    </div>
</body>
</html>
        """.strip()

        text_body = f"""
Mission non terminée - {calendar_label}

Un technicien a dépassé la date prévue de fin d'une mission.

Calendrier: {calendar_label}
Date prévue de fin: {formatted_planned_date}
Retard: {days_overdue} {day_label}
Créneau: {time_display}

Client: {booking.client_name}
Téléphone: {booking.client_phone}
Concepteur: {booking.designer_name or 'Non spécifié'}
ID réservation: #{booking.id}
Statut: En attente (non terminée)
{message_text}
        """.strip()

        default_from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@example.com')
        email_message = EmailMessage(
            subject=subject,
            body=text_body,
            from_email=default_from_email,
            to=recipients,
        )
        email_message.content_subtype = 'html'
        email_message.body = html_body
        email_message.send(fail_silently=False)

        booking.overdue_notified_at = timezone.now()
        booking.save(update_fields=['overdue_notified_at'])

        logger.info(
            f"Overdue mission notification sent for booking #{booking.id} "
            f"({calendar_label}) to {recipients}"
        )
        return True
    except Exception as e:
        logger.error(
            f"Failed to send overdue mission notification for booking #{booking.id}: {e}",
            exc_info=True,
        )
        return False


def process_overdue_sav_metre_notifications(dry_run: bool = False, only_yesterday: bool = False):
    """Find overdue SAV/Métré missions and notify admins once per booking."""
    overdue_bookings = list(get_overdue_sav_metre_bookings(only_yesterday=only_yesterday))
    recipients = get_admin_notification_recipients()
    sent = 0
    failed = 0

    if dry_run:
        return {
            'dry_run': True,
            'found': len(overdue_bookings),
            'sent': 0,
            'failed': 0,
            'recipients': recipients,
            'booking_ids': [b.id for b in overdue_bookings],
        }

    for booking in overdue_bookings:
        if notify_overdue_mission(booking, recipients=recipients):
            sent += 1
        else:
            failed += 1

    return {
        'dry_run': False,
        'found': len(overdue_bookings),
        'sent': sent,
        'failed': failed,
        'recipients': recipients,
        'booking_ids': [b.id for b in overdue_bookings],
    }


class OverdueMissionsNotifyView(APIView):
    """Admin-only endpoint to process overdue SAV/Métré mission notifications."""
    permission_classes = [IsAdminRole]

    def post(self, request):
        dry_run = str(request.data.get('dry_run', '')).lower() in ('1', 'true', 'yes')
        result = process_overdue_sav_metre_notifications(dry_run=dry_run)
        return Response(result, status=200)
