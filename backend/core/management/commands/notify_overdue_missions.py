"""
Notify administrators when a SAV or Métré mission exceeds its planned end date.

A mission is overdue when:
- calendar is SAV (calendar2 / 2) or Métré (calendar3 / 3)
- status is still "en_attente"
- booking_date < today (Europe/Paris)

Each overdue mission is notified only once (overdue_notified_at).

Usage:
  python manage.py notify_overdue_missions
  python manage.py notify_overdue_missions --dry-run
  python manage.py notify_overdue_missions --mark-existing
  python manage.py notify_overdue_missions --only-yesterday

Cron example (daily at 07:00):
  0 7 * * * cd /path/to/backend && ./load_env.sh && python manage.py notify_overdue_missions --only-yesterday
"""
from django.core.management.base import BaseCommand
from django.utils import timezone

from core.overdue_notifications import (
    get_overdue_sav_metre_bookings,
    process_overdue_sav_metre_notifications,
)


class Command(BaseCommand):
    help = (
        'Envoie une notification email aux administrateurs pour chaque mission '
        'SAV/Métré non terminée après sa date prévue de fin'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help="Liste les missions en retard sans envoyer d'emails",
        )
        parser.add_argument(
            '--mark-existing',
            action='store_true',
            help=(
                'Marque toutes les missions deja en retard comme notifiees '
                'sans envoyer d emails (a lancer une fois au deploiement)'
            ),
        )
        parser.add_argument(
            '--only-yesterday',
            action='store_true',
            help=(
                'Ne notifie que les missions dont la date prevue etait hier '
                '(evite de remonter tout l historique)'
            ),
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        mark_existing = options['mark_existing']
        only_yesterday = options['only_yesterday']

        if mark_existing:
            overdue = get_overdue_sav_metre_bookings()
            count = overdue.count()
            if dry_run:
                self.stdout.write(
                    self.style.WARNING(
                        f"[dry-run] {count} mission(s) seraient marquees comme deja notifiees."
                    )
                )
                return
            now = timezone.now()
            updated = overdue.update(overdue_notified_at=now)
            self.stdout.write(
                self.style.SUCCESS(
                    f"{updated} mission(s) historiques marquees comme deja notifiees (aucun email)."
                )
            )
            return

        result = process_overdue_sav_metre_notifications(
            dry_run=dry_run,
            only_yesterday=only_yesterday,
        )

        recipients = ', '.join(result['recipients']) or '(aucun)'
        self.stdout.write(f"Destinataires: {recipients}")
        self.stdout.write(f"Missions en retard trouvees: {result['found']}")

        if dry_run:
            if result['booking_ids']:
                self.stdout.write(
                    self.style.WARNING(
                        f"[dry-run] IDs qui seraient notifies: {result['booking_ids']}"
                    )
                )
            else:
                self.stdout.write(self.style.SUCCESS('[dry-run] Aucune mission en retard.'))
            return

        if result['sent']:
            self.stdout.write(
                self.style.SUCCESS(f"Notifications envoyees: {result['sent']}")
            )
        if result['failed']:
            self.stdout.write(
                self.style.ERROR(f"Echecs d envoi: {result['failed']}")
            )
        if result['found'] == 0:
            self.stdout.write(self.style.SUCCESS('Aucune mission SAV/Metre en retard a notifier.'))
