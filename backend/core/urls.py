from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView

from .views import BookingListCreateView, BookingRetrieveUpdateDestroyView, BookingResetView, BookingDebugView, ContactEmailView, HolidayListCreateView, HolidayRetrieveUpdateDestroyView, UserListCreateView, UserRetrieveUpdateDestroyView, UserLoginView

urlpatterns = [
    path('contact-email/', ContactEmailView.as_view(), name='contact-email'),
    path('bookings/', BookingListCreateView.as_view(), name='booking-list-create'),
    path('bookings/<int:pk>/', BookingRetrieveUpdateDestroyView.as_view(), name='booking-detail'),
    path('bookings/reset/', BookingResetView.as_view(), name='booking-reset'),
    path('bookings/debug/', BookingDebugView.as_view(), name='booking-debug'),
    path('holidays/', HolidayListCreateView.as_view(), name='holiday-list-create'),
    path('holidays/<int:pk>/', HolidayRetrieveUpdateDestroyView.as_view(), name='holiday-detail'),
    path('users/', UserListCreateView.as_view(), name='user-list-create'),
    path('users/<int:pk>/', UserRetrieveUpdateDestroyView.as_view(), name='user-detail'),
    path('users/login/', UserLoginView.as_view(), name='user-login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('token/verify/', TokenVerifyView.as_view(), name='token_verify'),
]
