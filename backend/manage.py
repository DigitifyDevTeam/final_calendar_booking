#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys

from env_loader import load_env, describe_env

# Load .env.local (local) or .env.production/.env (production) before Django starts
_loaded = load_env()
if os.environ.get('DJANGO_ENV_VERBOSE', '').lower() in ('1', 'true', 'yes'):
    print(f'[env] {describe_env()} loaded={_loaded}')


def main():
    """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
