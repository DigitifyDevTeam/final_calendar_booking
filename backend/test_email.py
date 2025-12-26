#!/usr/bin/env python
"""
Quick test script to verify Gmail OAuth2 email sending is working.
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.core.mail import send_mail
from django.conf import settings

print("=" * 60)
print("Testing Gmail OAuth2 Email Sending")
print("=" * 60)
print(f"EMAIL_BACKEND: {settings.EMAIL_BACKEND}")
print(f"DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}")
print(f"CONTACT_EMAIL_RECIPIENTS: {getattr(settings, 'CONTACT_EMAIL_RECIPIENTS', 'NOT SET')}")
print("=" * 60)
print()

# Get recipient email
recipient = getattr(settings, 'CONTACT_EMAIL_RECIPIENTS', settings.DEFAULT_FROM_EMAIL)
print(f"Sending test email to: {recipient}")
print()

try:
    send_mail(
        subject='Test Email from Booking System',
        message='This is a test email to verify Gmail OAuth2 is working correctly.',
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[recipient],
        fail_silently=False,
    )
    print("✅ Test email sent successfully!")
    print(f"Check your inbox at: {recipient}")
    print("(Also check spam/junk folder)")
except Exception as e:
    print(f"❌ Error sending test email: {e}")
    import traceback
    traceback.print_exc()

