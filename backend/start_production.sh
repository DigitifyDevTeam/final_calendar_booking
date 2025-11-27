#!/bin/bash
# Production startup script for Django backend

# Set environment to production
export DJANGO_ENV=production

# Set Python path for user-installed packages
export PYTHONPATH="$HOME/.local/lib/python3.9/site-packages:$PYTHONPATH"

# Load environment variables from load_env.sh
if [ -f load_env.sh ]; then
    source load_env.sh
fi

# Create logs directory if it doesn't exist
mkdir -p logs

# Collect static files
/usr/bin/python3 manage.py collectstatic --noinput

# Run migrations
/usr/bin/python3 manage.py migrate --noinput

# Find gunicorn (try user install first, then system)
GUNICORN_CMD=$(which gunicorn 2>/dev/null || echo "$HOME/.local/bin/gunicorn")

# Start Gunicorn
exec $GUNICORN_CMD \
    --bind 127.0.0.1:8000 \
    --workers 2 \
    --timeout 120 \
    --access-logfile logs/access.log \
    --error-logfile logs/error.log \
    --log-level info \
    backend.wsgi:application

