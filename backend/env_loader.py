"""
Load environment variables for local vs production.

Switch with DJANGO_ENV before starting Django:

  Local:      DJANGO_ENV=local       → loads .env.local (fallback: .env)
  Production: DJANGO_ENV=production  → loads .env.production (or .env)

Only one file is loaded per process. Managed keys are cleared first so
switching in the same shell does not leave stale values from the other env.
"""
from __future__ import annotations

import os
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parent

# Keys that differ between local and production — cleared before loading a profile
_MANAGED_KEYS = (
    'DJANGO_SECRET_KEY',
    'DJANGO_DEBUG',
    'DJANGO_ALLOWED_HOSTS',
    'DJANGO_LOG_LEVEL',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
    'DB_HOST',
    'DB_PORT',
    'CORS_ALLOW_ALL_ORIGINS',
    'CORS_ALLOWED_ORIGINS',
    'LANGUAGE_CODE',
    'TIME_ZONE',
    'DEFAULT_FROM_EMAIL',
    'CONTACT_EMAIL_RECIPIENTS',
    'EMAIL_HOST',
    'EMAIL_PORT',
    'EMAIL_USE_TLS',
    'EMAIL_HOST_USER',
    'EMAIL_HOST_PASSWORD',
    'GMAIL_CLIENT_ID',
    'GMAIL_CLIENT_SECRET',
    'GMAIL_TOKEN_JSON',
    'GMAIL_TOKEN_FILE',
    'GMAIL_CREDENTIALS_FILE',
    'SECURE_SSL_REDIRECT',
)

_LOCAL_ALIASES = frozenset({'local', 'dev', 'development'})
_PROD_ALIASES = frozenset({'production', 'prod'})


def resolve_profile() -> str:
    """Return 'local' or 'production' from DJANGO_ENV (default: local)."""
    raw = os.environ.get('DJANGO_ENV', 'local').strip().lower()
    if raw in _PROD_ALIASES:
        return 'production'
    if raw in _LOCAL_ALIASES or not raw:
        return 'local'
    # Unknown value → local (safe default)
    return 'local'


def _clear_managed_env() -> None:
    for key in _MANAGED_KEYS:
        os.environ.pop(key, None)


def load_env(base_dir: Path | None = None) -> Path | None:
    """
    Load the env file for the active profile.

    Returns the path that was loaded, or None if no file was found.
    """
    root = Path(base_dir) if base_dir is not None else BACKEND_DIR
    profile = resolve_profile()

    try:
        from dotenv import load_dotenv
    except ImportError:
        os.environ['DJANGO_ENV'] = profile
        return None

    _clear_managed_env()
    os.environ['DJANGO_ENV'] = profile

    if profile == 'production':
        candidates = (root / '.env.production', root / '.env')
        for path in candidates:
            if path.exists():
                load_dotenv(dotenv_path=path, override=True)
                return path
        return None

    # Prefer .env.local; fall back to .env for local SMTP / shared local secrets
    for path in (root / '.env.local', root / '.env'):
        if path.exists():
            load_dotenv(dotenv_path=path, override=True)
            # Keep profile local even if file mistakenly sets DJANGO_ENV=production
            os.environ['DJANGO_ENV'] = 'local'
            return path

    return None


def describe_env(base_dir: Path | None = None) -> str:
    """Human-readable summary of which profile/file will be used."""
    root = Path(base_dir) if base_dir is not None else BACKEND_DIR
    profile = resolve_profile()
    if profile == 'production':
        for path in (root / '.env.production', root / '.env'):
            if path.exists():
                return f'profile=production file={path.name}'
        return 'profile=production file=MISSING (.env.production or .env)'
    for path in (root / '.env.local', root / '.env'):
        if path.exists():
            return f'profile=local file={path.name}'
    return 'profile=local file=MISSING (.env.local or .env)'
