"""
Local development settings.
"""
from .base import *
import os

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'django-insecure-^ltkty(1hip5!3vp$dwe6*hz4d$_1&#!v4ikca*jw!au)t$ipg')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = ['localhost', '127.0.0.1', '*']

# Database - Local MySQL
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': os.environ.get('DB_NAME', 'Booking_calendar'),
        'USER': os.environ.get('DB_USER', 'root'),
        'PASSWORD': os.environ.get('DB_PASSWORD', 'root'),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '3306'),
        'OPTIONS': {
            'charset': 'utf8mb4',
            'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
        },
    }
}

# CORS - Allow all in local
CORS_ALLOW_ALL_ORIGINS = True

# Security settings - Relaxed for local
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
SECURE_BROWSER_XSS_FILTER = False
SECURE_CONTENT_TYPE_NOSNIFF = False
X_FRAME_OPTIONS = 'SAMEORIGIN'

# Email - Gmail OAuth2 backend
EMAIL_BACKEND = 'core.gmail_oauth.GmailOAuth2Backend'

# OAuth2 Credentials (for local development)
# Can use environment variables (GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET) or credentials file
GMAIL_CREDENTIALS_FILE = os.environ.get('GMAIL_CREDENTIALS_FILE')

# Token storage (for local development)
# Can use environment variable (GMAIL_TOKEN_JSON) or token file
GMAIL_TOKEN_FILE = os.environ.get('GMAIL_TOKEN_FILE')

# Email addresses
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'contact@woodagency.fr')
# Recipient email for booking notifications
# Can be overridden with CONTACT_EMAIL_RECIPIENTS environment variable
CONTACT_EMAIL_RECIPIENTS = os.environ.get('CONTACT_EMAIL_RECIPIENTS', 'contact@woodagency.fr')

