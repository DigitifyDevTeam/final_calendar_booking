# Django Backend - Production Deployment Guide

## Environment Setup

### 1. Create Environment File

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your production values:

```env
DJANGO_SECRET_KEY=your-generated-secret-key-here
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

DB_NAME=calendar
DB_USER=your_db_user
DB_PASSWORD=your_secure_password
DB_HOST=localhost
DB_PORT=3306

CORS_ALLOW_ALL_ORIGINS=False
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### 2. Generate Secret Key

Generate a new secret key for production:

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

Add the output to your `.env` file as `DJANGO_SECRET_KEY`.

### 3. Install Dependencies

```bash
pip install -r requirement.txt
```

### 4. Database Setup

Create the MySQL database:

```sql
CREATE DATABASE calendar CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'your_db_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON calendar.* TO 'your_db_user'@'localhost';
FLUSH PRIVILEGES;
```

Run migrations:

```bash
python manage.py migrate
python manage.py collectstatic
```

### 5. Create Superuser

```bash
python manage.py createsuperuser
```

## Running in Production

### Option 1: Using Gunicorn (Recommended)

```bash
gunicorn --bind 127.0.0.1:8000 --workers 3 backend.wsgi:application
```

### Option 2: Systemd Service

Create `/etc/systemd/system/django-calendar.service`:

```ini
[Unit]
Description=Django Calendar App
After=network.target

[Service]
User=your_user
Group=your_group
WorkingDirectory=/path/to/backend
Environment="PATH=/path/to/venv/bin"
EnvironmentFile=/path/to/backend/.env
ExecStart=/path/to/venv/bin/gunicorn \
    --bind 127.0.0.1:8000 \
    --workers 3 \
    --timeout 120 \
    --access-logfile /path/to/logs/access.log \
    --error-logfile /path/to/logs/error.log \
    backend.wsgi:application

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable django-calendar
sudo systemctl start django-calendar
sudo systemctl status django-calendar
```

## Security Checklist

- [ ] `DEBUG=False` in production
- [ ] `SECRET_KEY` is set via environment variable
- [ ] `ALLOWED_HOSTS` includes your domain
- [ ] Database credentials are in environment variables
- [ ] SSL/HTTPS is enabled (`SECURE_SSL_REDIRECT=True`)
- [ ] CORS is configured for specific origins only
- [ ] Static files are collected (`python manage.py collectstatic`)
- [ ] Logs directory exists and is writable
- [ ] `.env` file is not committed to git (in `.gitignore`)

## Apache Configuration

See the main deployment guide for Apache reverse proxy configuration.

## Troubleshooting

### Check logs:
```bash
tail -f logs/django.log
```

### Test database connection:
```bash
python manage.py dbshell
```

### Check environment variables:
```bash
python manage.py shell
>>> import os
>>> print(os.environ.get('DJANGO_SECRET_KEY'))
```

