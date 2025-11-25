from django.contrib import admin

from .models import Booking, ContactMessage, Holiday

admin.site.register(Booking)
admin.site.register(ContactMessage)
admin.site.register(Holiday)

