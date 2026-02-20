"""
Django settings with environment-based configuration.


Usage:
- Local: DJANGO_ENV=local python manage.py runserver (default)
- Production: DJANGO_ENV=production python manage.py runserver
- Default: Uses 'local' if not specified
"""
import os

# Determine environment (default to 'local')
ENV = os.environ.get('DJANGO_ENV', 'production').lower()

if ENV == 'production' or ENV == 'prod':
    from .production import *
elif ENV == 'local' or ENV == 'dev':
    from .local import *
else:
    # Default to local if unknown environment
    from .local import *

