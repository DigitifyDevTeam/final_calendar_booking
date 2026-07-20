"""
Django settings with environment-based configuration.

DJANGO_ENV selects the settings module (env file is loaded earlier by env_loader):

- local / dev       → settings.local  + .env.local
- production / prod → settings.production + .env.production (or .env)

Default: local
"""
import os

_raw = os.environ.get('DJANGO_ENV', 'local').strip().lower()

if _raw in ('production', 'prod'):
    ENV = 'production'
    from .production import *
elif _raw in ('local', 'dev', 'development'):
    ENV = 'local'
    from .local import *
else:
    ENV = 'local'
    from .local import *
