# Production Configuration Changes

## Summary

The Django backend has been converted from development to production-ready configuration.

## Key Changes Made

### 1. **Security Settings** (`settings.py`)
   - ✅ `SECRET_KEY` now loaded from environment variable
   - ✅ `DEBUG` defaults to `False` (can be overridden via `DJANGO_DEBUG`)
   - ✅ `ALLOWED_HOSTS` configured via environment variable
   - ✅ Added production security headers:
     - `SECURE_SSL_REDIRECT`
     - `SESSION_COOKIE_SECURE`
     - `CSRF_COOKIE_SECURE`
     - `SECURE_BROWSER_XSS_FILTER`
     - `SECURE_CONTENT_TYPE_NOSNIFF`
     - `X_FRAME_OPTIONS = 'DENY'`
     - HSTS headers

### 2. **Database Configuration**
   - ✅ All database credentials moved to environment variables
   - ✅ Added UTF8MB4 charset support
   - ✅ Added strict SQL mode

### 3. **Static Files**
   - ✅ `STATIC_ROOT` configured for production
   - ✅ `MEDIA_ROOT` and `MEDIA_URL` added
   - ✅ Ready for `collectstatic` command

### 4. **CORS Configuration**
   - ✅ `CORS_ALLOW_ALL_ORIGINS` defaults to `False` in production
   - ✅ `CORS_ALLOWED_ORIGINS` from environment variable
   - ✅ Added proper CORS headers and methods

### 5. **Logging**
   - ✅ Production logging configuration added
   - ✅ File and console handlers
   - ✅ Admin email notifications for errors
   - ✅ Automatic logs directory creation

### 6. **Internationalization**
   - ✅ Timezone set to `Europe/Paris` (configurable)
   - ✅ Language set to `fr-fr` (configurable)

### 7. **Environment Variables**
   - ✅ Created `.env.example` template
   - ✅ Updated `manage.py` to load `.env` file
   - ✅ Updated `wsgi.py` to load `.env` file
   - ✅ Added `python-dotenv` to requirements

### 8. **Dependencies**
   - ✅ Added `gunicorn` for production server
   - ✅ Added `python-dotenv` for environment management

### 9. **Deployment Files**
   - ✅ Created `start_production.sh` script
   - ✅ Created `.gitignore` to exclude sensitive files
   - ✅ Created `README_DEPLOYMENT.md` guide

## Next Steps for Deployment

1. **Create `.env` file:**
   ```bash
   cp .env.example .env
   ```

2. **Generate secret key:**
   ```bash
   python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
   ```

3. **Configure `.env` with:**
   - Your domain in `DJANGO_ALLOWED_HOSTS`
   - Database credentials
   - CORS allowed origins
   - Email settings

4. **Install dependencies:**
   ```bash
   pip install -r requirement.txt
   ```

5. **Run migrations:**
   ```bash
   python manage.py migrate
   python manage.py collectstatic
   ```

6. **Test locally with production settings:**
   ```bash
   export DJANGO_DEBUG=False
   export DJANGO_ALLOWED_HOSTS=localhost
   python manage.py runserver
   ```

7. **Deploy to server:**
   - Upload code to server
   - Configure `.env` file on server
   - Set up Gunicorn or systemd service
   - Configure Apache reverse proxy

## Environment Variables Required

See `.env.example` for complete list. Key variables:

- `DJANGO_SECRET_KEY` - **REQUIRED** (generate new one!)
- `DJANGO_DEBUG=False` - **REQUIRED** for production
- `DJANGO_ALLOWED_HOSTS` - Your domain(s)
- `DB_NAME`, `DB_USER`, `DB_PASSWORD` - Database credentials
- `CORS_ALLOWED_ORIGINS` - Your frontend domain(s)

## Security Checklist

Before going live, ensure:

- [ ] `DEBUG=False` in production
- [ ] New `SECRET_KEY` generated and set
- [ ] `ALLOWED_HOSTS` includes your domain
- [ ] Database credentials are secure
- [ ] `.env` file is NOT in git (already in `.gitignore`)
- [ ] SSL/HTTPS is configured
- [ ] CORS origins are restricted
- [ ] Static files are collected
- [ ] Logs directory is writable

