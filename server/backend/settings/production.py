"""
Production settings.
"""
from .base import *
import os

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY')
if not SECRET_KEY:
    raise ValueError("DJANGO_SECRET_KEY must be set in production!")

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = False

ALLOWED_HOSTS = [
    host.strip() 
    for host in os.environ.get('DJANGO_ALLOWED_HOSTS', '').split(',')
    if host.strip()
]

# Always include localhost and 127.0.0.1 for local testing
if '127.0.0.1' not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append('127.0.0.1')
if 'localhost' not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append('localhost')

# Database - Production MySQL (Infomaniak)
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': os.environ.get('DB_NAME'),
        'USER': os.environ.get('DB_USER'),
        'PASSWORD': os.environ.get('DB_PASSWORD'),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '3306'),
        'OPTIONS': {
            'charset': 'utf8mb4',
            'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
        },
    }
}

# CORS - Specific origins in production
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [
    origin.strip() for origin in os.environ.get('CORS_ALLOWED_ORIGINS', '').split(',')
    if origin.strip()
]

# Always add woodagency.fr to allowed origins
if 'woodagency.fr' not in [origin.replace('https://', '').replace('http://', '') for origin in CORS_ALLOWED_ORIGINS]:
    CORS_ALLOWED_ORIGINS.extend([
        'https://woodagency.fr',
        'https://www.woodagency.fr',
        'http://woodagency.fr',
        'http://www.woodagency.fr',
    ])

# If no specific origins set, add common patterns from ALLOWED_HOSTS
if not CORS_ALLOWED_ORIGINS:
    for host in ALLOWED_HOSTS:
        if host not in ['localhost', '127.0.0.1']:
            if f'https://{host}' not in CORS_ALLOWED_ORIGINS:
                CORS_ALLOWED_ORIGINS.extend([
                    f'https://{host}',
                    f'http://{host}',
                ])

# Security settings for production
is_localhost = any(host in ['localhost', '127.0.0.1'] for host in ALLOWED_HOSTS)

if not is_localhost:
    SECURE_SSL_REDIRECT = os.environ.get('SECURE_SSL_REDIRECT', 'True').lower() == 'true'
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
else:
    # Allow HTTP on localhost for testing
    SECURE_SSL_REDIRECT = False
    SESSION_COOKIE_SECURE = False
    CSRF_COOKIE_SECURE = False

SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Email - Gmail OAuth2 backend (with automatic token refresh - tokens never expire)
EMAIL_BACKEND = 'core.gmail_oauth.GmailOAuth2Backend'

# OAuth2 Credentials (REQUIRED for production - Use environment variables)
# Set these environment variables on your production server:
#   GMAIL_CLIENT_ID - Your OAuth2 client ID
#   GMAIL_CLIENT_SECRET - Your OAuth2 client secret
GMAIL_CREDENTIALS_FILE = os.environ.get('GMAIL_CREDENTIALS_FILE')

# Token storage (REQUIRED for production - Use environment variable)
# Set this environment variable on your production server:
#   GMAIL_TOKEN_JSON - Complete JSON string from gmail_token.json file
# 
# To get the token JSON:
#   1. Run setup_gmail_oauth.py locally
#   2. Copy the entire JSON from backend/backend/gmail_token.json
#   3. Set as GMAIL_TOKEN_JSON environment variable
#
# The backend automatically refreshes tokens before expiration, ensuring they never expire.
GMAIL_TOKEN_FILE = os.environ.get('GMAIL_TOKEN_FILE')

# Email addresses
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'contact@woodagency.fr')
# Recipient email for booking notifications
# Can be overridden with CONTACT_EMAIL_RECIPIENTS environment variable
CONTACT_EMAIL_RECIPIENTS = os.environ.get('CONTACT_EMAIL_RECIPIENTS', 'contact@woodagency.fr')

