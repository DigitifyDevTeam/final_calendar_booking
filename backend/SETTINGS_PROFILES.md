# Django Settings Profiles

This project uses environment-based settings profiles, similar to Spring Boot profiles. This allows you to easily switch between local development and production environments.

## Structure

```
backend/
├── backend/
│   └── settings/
│       ├── __init__.py    # Environment selector
│       ├── base.py        # Shared settings
│       ├── local.py       # Local development settings
│       └── production.py  # Production settings
```

## Usage

### Local Development

**Option 1: Using environment variable**
```bash
export DJANGO_ENV=local
python manage.py runserver
```

**Option 2: Using .env.local file**
```bash
# Copy .env.local.example to .env.local and configure
cp .env.local.example .env.local
# Edit .env.local with your local settings
python manage.py runserver
```

**Option 3: Default (automatically uses local)**
```bash
# If DJANGO_ENV is not set, defaults to 'local'
python manage.py runserver
```

### Production

**Option 1: Using environment variable**
```bash
export DJANGO_ENV=production
gunicorn backend.wsgi:application
```

**Option 2: Using load_env.sh (already configured)**
```bash
# The start_production.sh script already sets DJANGO_ENV=production
./start_production.sh
```

## Environment Files

### Local Development (.env.local)
- `DJANGO_ENV=local`
- `DEBUG=True`
- Relaxed security settings
- Console email backend
- Allows all CORS origins

### Production (.env or load_env.sh)
- `DJANGO_ENV=production`
- `DEBUG=False`
- Strict security settings
- SMTP email backend
- Specific CORS origins

## Key Differences

| Setting | Local | Production |
|---------|-------|------------|
| DEBUG | True | False |
| SECRET_KEY | Optional (has default) | Required |
| CORS | Allow all | Specific origins |
| SSL Redirect | Disabled | Enabled (except localhost) |
| Email | Console | SMTP |
| Database | Local defaults | Environment required |

## Switching Environments

To switch between environments, simply set the `DJANGO_ENV` environment variable:

```bash
# Switch to local
export DJANGO_ENV=local

# Switch to production
export DJANGO_ENV=production

# Check current environment
python manage.py shell -c "from django.conf import settings; print('DEBUG:', settings.DEBUG)"
```

## Production Deployment

On your server, the `start_production.sh` script automatically sets `DJANGO_ENV=production`. Make sure your `load_env.sh` file has all the required production environment variables.

## Benefits

✅ **Easy switching**: Just change `DJANGO_ENV`  
✅ **Type safety**: Production requires all necessary variables  
✅ **Maintainable**: Shared base settings, environment-specific overrides  
✅ **Secure**: Production settings enforce security best practices  
✅ **Developer-friendly**: Local settings are relaxed for easier development

