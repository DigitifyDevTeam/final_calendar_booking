from datetime import date, timedelta

from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from .models import Booking, Holiday, User, ContactMessage


# Use SQLite in tests to avoid external DB dependency
TEST_DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}


@override_settings(DATABASES=TEST_DATABASES)
class BookingApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse("booking-list-create")
        self.future_date = (date.today() + timedelta(days=3)).isoformat()

    def _booking_payload(self, **overrides):
        payload = {
            "calendar_id": "calendar1",
            "booking_date": self.future_date,
            "booking_time": "",
            "client_name": "John Doe",
            "client_phone": "0123456789",
            "designer_name": "Jane Designer",
            "message": "Test booking",
        }
        payload.update(overrides)
        return payload

    def test_create_booking_sets_default_time_for_pose_calendar(self):
        response = self.client.post(self.url, self._booking_payload(), format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["booking_time"], "21h00")
        self.assertEqual(Booking.objects.count(), 1)

    def test_create_booking_rejects_past_date(self):
        payload = self._booking_payload(booking_date=(date.today() - timedelta(days=1)).isoformat())
        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("booking_date", response.data)
        self.assertEqual(Booking.objects.count(), 0)

    def test_create_booking_rejects_holiday(self):
        Holiday.objects.create(calendar_id="calendar1", holiday_date=self.future_date)
        response = self.client.post(self.url, self._booking_payload(), format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("booking_date", response.data)
        self.assertEqual(Booking.objects.count(), 0)

    def test_time_slot_calendar_requires_time(self):
        payload = self._booking_payload(calendar_id="calendar2", booking_time="")
        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("booking_time", response.data)
        self.assertEqual(Booking.objects.count(), 0)

    def test_time_slot_calendar_rejects_duplicate_slot(self):
        payload = self._booking_payload(calendar_id="calendar2", booking_time="10h00")
        first = self.client.post(self.url, payload, format="json")
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)

        duplicate = self.client.post(self.url, payload, format="json")
        self.assertEqual(duplicate.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("booking_time", duplicate.data)
        self.assertEqual(Booking.objects.count(), 1)

    def test_list_bookings_filters_by_calendar_and_dates(self):
        other_date = (date.today() + timedelta(days=5)).isoformat()
        Booking.objects.create(
            **{
                **self._booking_payload(),
                "booking_date": date.fromisoformat(self.future_date),
            }
        )
        Booking.objects.create(
            **{
                **self._booking_payload(calendar_id="calendar2", booking_time="09h00"),
                "booking_date": date.fromisoformat(self.future_date),
            }
        )
        Booking.objects.create(
            **{
                **self._booking_payload(booking_date=other_date),
                "booking_date": date.fromisoformat(other_date),
            }
        )

        response = self.client.get(
            self.url,
            {
                "calendar_id": "calendar1",
                "start_date": self.future_date,
                "end_date": self.future_date,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["calendar_id"], "calendar1")
        self.assertEqual(response.data[0]["booking_date"], self.future_date)

    def test_reset_bookings_deletes_by_calendar(self):
        Booking.objects.create(
            **{
                **self._booking_payload(),
                "booking_date": date.fromisoformat(self.future_date),
            }
        )
        Booking.objects.create(
            **{
                **self._booking_payload(calendar_id="calendar2", booking_time="08h00"),
                "booking_date": date.fromisoformat(self.future_date),
            }
        )
        reset_url = reverse("booking-reset")

        response = self.client.delete(f"{reset_url}?calendar_id=calendar1")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["deleted"], 1)
        self.assertEqual(Booking.objects.count(), 1)

    def test_booking_debug_returns_summary(self):
        same_day = (date.today() + timedelta(days=4)).isoformat()
        Booking.objects.create(
            **{
                **self._booking_payload(booking_date=same_day),
                "booking_date": date.fromisoformat(same_day),
            }
        )
        Booking.objects.create(
            **{
                **self._booking_payload(calendar_id="calendar1", booking_date=same_day, client_name="Alice"),
                "booking_date": date.fromisoformat(same_day),
            }
        )
        debug_url = reverse("booking-debug")

        response = self.client.get(debug_url, {"calendar_id": "calendar1"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["calendar_id"], "calendar1")
        self.assertGreaterEqual(response.data["total_bookings"], 2)
        self.assertIn("dates_with_2_or_more_bookings", response.data)

    def test_update_booking_changes_fields(self):
        booking = Booking.objects.create(
            **{
                **self._booking_payload(),
                "booking_date": date.fromisoformat(self.future_date),
            }
        )
        detail_url = reverse("booking-detail", args=[booking.id])
        payload = {"client_name": "Updated Name", "booking_time": "10h30"}

        response = self.client.patch(detail_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        booking.refresh_from_db()
        self.assertEqual(booking.client_name, "Updated Name")
        self.assertEqual(booking.booking_time, "10h30")

    def test_delete_booking(self):
        booking = Booking.objects.create(
            **{
                **self._booking_payload(),
                "booking_date": date.fromisoformat(self.future_date),
            }
        )
        detail_url = reverse("booking-detail", args=[booking.id])

        response = self.client.delete(detail_url, format="json")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Booking.objects.count(), 0)


@override_settings(DATABASES=TEST_DATABASES)
class HolidayApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse("holiday-list-create")
        self.future_date = (date.today() + timedelta(days=6)).isoformat()

    def test_create_holiday(self):
        response = self.client.post(
            self.url,
            {"calendar_id": "calendar1", "holiday_date": self.future_date, "description": "Férié"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Holiday.objects.count(), 1)

    def test_duplicate_holiday_rejected(self):
        Holiday.objects.create(calendar_id="calendar1", holiday_date=date.fromisoformat(self.future_date))
        response = self.client.post(
            self.url,
            {"calendar_id": "calendar1", "holiday_date": self.future_date, "description": "Dupliqué"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # DRF unique_together yields non_field_errors payload from the view
        self.assertIn("detail", response.data)
        self.assertIn("unique", str(response.data["detail"]).lower())
        self.assertEqual(Holiday.objects.count(), 1)

    def test_update_holiday(self):
        holiday = Holiday.objects.create(calendar_id="calendar1", holiday_date=date.fromisoformat(self.future_date), description="Old")
        detail_url = reverse("holiday-detail", args=[holiday.id])

        new_date = (date.today() + timedelta(days=10)).isoformat()
        response = self.client.patch(detail_url, {"holiday_date": new_date, "description": "New"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        holiday.refresh_from_db()
        self.assertEqual(str(holiday.holiday_date), new_date)
        self.assertEqual(holiday.description, "New")

    def test_delete_holiday(self):
        holiday = Holiday.objects.create(calendar_id="calendar1", holiday_date=date.fromisoformat(self.future_date))
        detail_url = reverse("holiday-detail", args=[holiday.id])

        response = self.client.delete(detail_url, format="json")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Holiday.objects.count(), 0)


@override_settings(DATABASES=TEST_DATABASES)
class UserApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.list_url = reverse("user-list-create")
        self.login_url = reverse("user-login")

    def _user_payload(self, **overrides):
        payload = {
            "name": "Admin",
            "email": "admin@example.com",
            "phone": "0123456789",
            "role": "admin",
            "password": "strongpass",
            "confirm_password": "strongpass",
        }
        payload.update(overrides)
        return payload

    def test_create_user_and_login(self):
        create_resp = self.client.post(self.list_url, self._user_payload(), format="json")
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.count(), 1)

        login_resp = self.client.post(
            self.login_url,
            {"email": "admin@example.com", "password": "strongpass"},
            format="json",
        )
        self.assertEqual(login_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(login_resp.data["email"], "admin@example.com")

    def test_login_wrong_password(self):
        User.objects.create(
            name="Admin",
            email="admin@example.com",
            phone="0123456789",
            role="admin",
            password="strongpass",
        )
        login_resp = self.client.post(
            self.login_url,
            {"email": "admin@example.com", "password": "badpass"},
            format="json",
        )
        self.assertEqual(login_resp.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn("detail", login_resp.data)

    def test_update_user_without_password_change(self):
        user = User.objects.create(
            name="Admin",
            email="admin@example.com",
            phone="0123456789",
            role="admin",
            password="strongpass",
        )
        detail_url = reverse("user-detail", args=[user.id])

        resp = self.client.patch(detail_url, {"phone": "0987654321"}, format="json")

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertEqual(user.phone, "0987654321")

    def test_delete_user(self):
        user = User.objects.create(
            name="Admin",
            email="admin@example.com",
            phone="0123456789",
            role="admin",
            password="strongpass",
        )
        detail_url = reverse("user-detail", args=[user.id])

        resp = self.client.delete(detail_url, format="json")

        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(User.objects.count(), 0)


@override_settings(DATABASES=TEST_DATABASES)
class ContactApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse("contact-email")

    def test_create_contact_message(self):
        response = self.client.post(
            self.url,
            {
                "name": "Client",
                "email": "client@example.com",
                "subject": "Support",
                "message": "Need help",
                "phone": "0123456789",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ContactMessage.objects.count(), 1)

    def test_list_contact_messages(self):
        ContactMessage.objects.create(
            name="A",
            email="a@example.com",
            subject="Hello",
            message="Msg",
            phone="1",
        )
        ContactMessage.objects.create(
            name="B",
            email="b@example.com",
            subject="Hi",
            message="Msg2",
            phone="2",
        )

        response = self.client.get(self.url, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
