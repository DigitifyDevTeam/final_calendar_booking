import logging

from rest_framework.permissions import SAFE_METHODS, BasePermission

logger = logging.getLogger(__name__)


def normalize_person_name(value):
    return ' '.join((value or '').split()).casefold()


def is_booking_owner(user, booking):
    """Bookings are linked to their concepteur by designer_name (no FK on the model)."""
    user_name = normalize_person_name(getattr(user, 'name', ''))
    return bool(user_name) and user_name == normalize_person_name(booking.designer_name)


class CanModifyBooking(BasePermission):
    """
    Read access for any authenticated user (calendar availability needs every booking).
    Write access: admin on any booking, concepteur on their own bookings only.
    Techniciens use the dedicated finish/cancel endpoints and cannot edit or delete.
    """
    message = 'Vous ne pouvez modifier ou supprimer que vos propres réservations.'

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True

        role = getattr(request.user, 'role', None)
        if role == 'admin':
            return True
        if role == 'concepteur' and is_booking_owner(request.user, obj):
            return True

        logger.warning(
            'Booking write denied: user_id=%s role=%s method=%s booking_id=%s',
            getattr(request.user, 'id', None), role, request.method, obj.pk,
        )
        return False
