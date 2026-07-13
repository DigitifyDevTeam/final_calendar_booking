#!/bin/bash
# Add user site-packages to Python path
export PYTHONPATH="$HOME/.local/lib/python3.9/site-packages:$PYTHONPATH"

# Django settings
export DJANGO_SECRET_KEY="WmWAe2uq_KY2AD_UBkkSVMvbLOb6pVuZAacZCVDSEstnSA8Yug-UbsH8n-_7ea99eVU"
export DJANGO_DEBUG="False"
export DJANGO_ALLOWED_HOSTS="dev.woodagency.fr,www.dev.woodagency.fr"

# Database settings
export DB_NAME="f17xpi_crmbd25"
export DB_USER="f17xpi_crmbd25ad"
export DB_PASSWORD="Op?s3e2Z@_?nY9"
export DB_HOST="localhost"
export DB_PORT="3306"

# CORS settings
export CORS_ALLOW_ALL_ORIGINS="False"
export CORS_ALLOWED_ORIGINS="https://dev.woodagency.fr,https://www.dev.woodagency.fr"

# Language settings
export LANGUAGE_CODE="fr-fr"
export TIME_ZONE="Europe/Paris"
export GMAIL_TOKEN_JSON='{"token": "ya29.a0ATkoCc5BsVV_zswaByOnJhu7Kg-WPYWsageQXrjVjqoYArrYAJFJ4tuLYET66VGoNmCCdaJTCSLN37nUCstcv1WcNuMFW2VCYAkxteweofmmqMAHQBt4kizPpavMsZm3WC0FaxeOEYC9r_LWJruWhGfSFFtHKCVTHT-WA2J2YIuwPFXAB-nkSiIAtFZuOBT3yKIOrUsaCgYKATgSARcSFQHGX2MiwmGzjS-lZ-ffYAxC9N8aaQ0206", "refresh_token": "1//03y0XZJsJ8QM0CgYIARAAGAMSNwF-L9IrU_er5tmcy-_cYpF4GhvW7VSPmdvrgWlWi0g77u3ZqyrEeNDBC-AuVFc6h1ieCB7XODA", "token_uri": "https://oauth2.googleapis.com/token", "client_id": "781189825204-0a4j0gqs76cm875le08ap147crilmkeg.apps.googleusercontent.com", "client_secret": "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", "scopes": ["https://www.googleapis.com/auth/gmail.send"]}'
