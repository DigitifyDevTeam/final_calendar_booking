from django.contrib import admin

from .models import Booking, ContactMessage, Holiday, User

admin.site.register(Booking)
admin.site.register(ContactMessage)
admin.site.register(Holiday)
admin.site.register(User)
