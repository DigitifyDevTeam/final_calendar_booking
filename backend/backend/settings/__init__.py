"""
Django settings with environment-based configuration.


Usage:
- Local: DJANGO_ENV=local python manage.py runserver (default)
- Production: DJANGO_ENV=production python manage.py runserver
- Default: Uses 'local' if not specified
"""
import os

# Determine environment (default to 'production')
ENV = os.environ.get('DJANGO_ENV', 'production').lower()

if ENV == 'production':
    from .production import *
elif ENV == 'local':
    from .local import *
else:
    # Default to production if unknown environment
    from .production import *

