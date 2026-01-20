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
export GMAIL_TOKEN_JSON='{"token": "ya29.a0Aa7pCA88wOgTzxK9zni2LJYc2_Fg4VtxVES59-Fo_cxDy80kuFuBhx4nJgFKbjGaW35eOc9uqbAl8EfC_MD8Sg8EVmbT145Sg1cBmhwyYaapfITvi10QP5hHvEvTxfY-HeRnOiQ_2m_RAceQcZ2kHL7LOcBkhlS-d7IQg4aL3nKy3ACjB54R0FkWwR_jidWPicM36h4aCgYKATgSARcSFQHGX2Miv8j8URm6sT-Ie0B2LApKiw0206", "refresh_token": "1//03LNEOZtVW21hCgYIARAAGAMSNwF-L9Irg3AG58y-HE14yqjfAjNob4jn-BRoLaaf1I2lknSWxFQvJMyFsQtagDx26LjCraz1kKE", "token_uri": "https://oauth2.googleapis.com/token", "client_id": "781189825204-0a4j0gqs76cm875le08ap147crilmkeg.apps.googleusercontent.com", "client_secret": "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", "scopes": ["https://www.googleapis.com/auth/gmail.send"]}'
