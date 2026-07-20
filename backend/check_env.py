#!/usr/bin/env python
"""Print which Django env profile and env file are active."""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from env_loader import describe_env, load_env, resolve_profile

loaded = load_env()
profile = resolve_profile()

print('=' * 50)
print('Django environment switch check')
print('=' * 50)
print(f'DJANGO_ENV (resolved): {profile}')
print(f'describe:              {describe_env()}')
print(f'file loaded:           {loaded if loaded else "NONE"}')
print(f'DEFAULT_FROM_EMAIL:    {os.environ.get("DEFAULT_FROM_EMAIL", "(not set)")}')
print(f'DB_NAME:               {os.environ.get("DB_NAME", "(not set)")}')
print(f'GMAIL_CLIENT_ID set:   {bool(os.environ.get("GMAIL_CLIENT_ID") or os.environ.get("GMAIL_TOKEN_JSON"))}')
print('=' * 50)

if profile == 'production' and loaded is None:
    print('WARNING: production profile but no .env.production or .env found.')
    print('Create .env.production from .env.production.example, or on the')
    print('server use: source load_env.sh && ./start_production.sh')
    sys.exit(1)

if profile == 'local' and loaded is None:
    print('WARNING: local profile but .env.local is missing.')
    print('Run: cp .env.local.example .env.local')
    sys.exit(1)
