# Django Settings Profiles — local vs production

`DJANGO_ENV` chooses **both** the settings module and the env file.

| DJANGO_ENV | Settings file | Env file loaded |
|------------|---------------|-----------------|
| `local` (default) | `settings/local.py` | `.env.local` |
| `production` | `settings/production.py` | `.env.production` or `.env` |

On the Linux server, production usually uses `load_env.sh` + `start_production.sh`
instead of a dotenv file.

---

## Switch commands

### PowerShell (Windows)

**→ Local**
```powershell
cd backend
$env:DJANGO_ENV = "local"
python check_env.py
python manage.py runserver
```

**→ Production**
```powershell
cd backend
# First time only: copy and fill prod secrets
# cp .env.production.example .env.production

$env:DJANGO_ENV = "production"
python check_env.py
python manage.py runserver
```

**Clear the switch (back to default local)**
```powershell
Remove-Item Env:DJANGO_ENV -ErrorAction SilentlyContinue
python check_env.py
```

### Bash (Linux / macOS / Git Bash)

**→ Local**
```bash
cd backend
export DJANGO_ENV=local
python check_env.py
python manage.py runserver
```

**→ Production**
```bash
cd backend
export DJANGO_ENV=production
python check_env.py
python manage.py runserver
# Server deploy:
# ./start_production.sh   # sets DJANGO_ENV=production and sources load_env.sh
```

**Clear the switch**
```bash
unset DJANGO_ENV
python check_env.py
```

---

## One-line checks

```powershell
# Which profile is active?
$env:DJANGO_ENV = "local"; python check_env.py
$env:DJANGO_ENV = "production"; python check_env.py
```

```bash
DJANGO_ENV=local python check_env.py
DJANGO_ENV=production python check_env.py
```

---

## Files

```
backend/
├── .env.local                 # local secrets (gitignored)
├── .env.local.example
├── .env.production            # prod secrets for dotenv switch (gitignored)
├── .env.production.example
├── env_loader.py              # loads the matching file from DJANGO_ENV
├── check_env.py               # prints active profile + file
├── load_env.sh                # production on the server
└── backend/settings/
    ├── local.py
    └── production.py
```

Never copy production `GMAIL_*` values into `.env.local`.
Never copy local OAuth into `.env.production` / `load_env.sh`.
