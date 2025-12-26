"""
Gmail OAuth2 Email Backend for Django.

This backend uses Gmail API with OAuth2 authentication instead of SMTP.
It supports token storage in files or environment variables.
"""
import os
import json
import base64
import logging
import time
from pathlib import Path
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase

from django.conf import settings
from django.core.mail.backends.base import BaseEmailBackend
from django.core.mail.message import EmailMessage

try:
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request
    from googleapiclient.discovery import build
    from googleapiclient.errors import HttpError
    from google_auth_oauthlib.flow import Flow
except ImportError as e:
    raise ImportError(
        "Google API libraries not installed. "
        "Install with: pip install google-auth google-auth-oauthlib "
        "google-auth-httplib2 google-api-python-client"
    ) from e

logger = logging.getLogger(__name__)

# Gmail API scope for sending emails
SCOPES = ['https://www.googleapis.com/auth/gmail.send']


class GmailOAuth2Backend(BaseEmailBackend):
    """
    Django email backend using Gmail API with OAuth2 authentication.
    
    Token storage priority:
    1. GMAIL_TOKEN_JSON environment variable (JSON string)
    2. gmail_token.json file (path configurable via GMAIL_TOKEN_FILE)
    
    Credentials file:
    - Path configurable via GMAIL_CREDENTIALS_FILE setting
    - Default: looks for client_secret_*.json in backend directory
    """
    
    def __init__(self, fail_silently=False, **kwargs):
        super().__init__(fail_silently=fail_silently, **kwargs)
        self.service = None
        self.credentials = None
        self._initialize_service()
    
    def _get_credentials_file_path(self):
        """Get the path to the OAuth2 credentials file."""
        # Check for explicit setting
        creds_file = getattr(settings, 'GMAIL_CREDENTIALS_FILE', None)
        if creds_file and os.path.exists(creds_file):
            return creds_file
        
        # Default: look for client_secret JSON in backend directory
        backend_dir = Path(__file__).parent.parent.parent / 'backend'
        client_secret_files = list(backend_dir.glob('client_secret_*.json'))
        
        if client_secret_files:
            return str(client_secret_files[0])
        
        return None
    
    def _get_token_file_path(self):
        """Get the path to the token file."""
        try:
            token_file = getattr(settings, 'GMAIL_TOKEN_FILE', None)
            if token_file:
                return token_file
        except Exception:
            # Settings not loaded yet, continue with default
            pass
        
        # Default: gmail_token.json in backend/backend directory (where setup script saves it)
        # The setup script saves to: backend/backend/gmail_token.json
        # Path calculation:
        #   __file__ = backend/core/gmail_oauth.py
        #   .parent = backend/core/
        #   .parent.parent = backend/
        #   / 'backend' = backend/backend/
        #   / 'gmail_token.json' = backend/backend/gmail_token.json
        backend_dir = Path(__file__).parent.parent / 'backend'
        token_file = backend_dir / 'gmail_token.json'
        
        # If that doesn't exist, try the old location
        if not token_file.exists():
            old_location = Path(__file__).parent.parent.parent / 'gmail_token.json'
            if old_location.exists():
                return str(old_location)
        
        return str(token_file)
    
    def _load_credentials(self):
        """
        Load OAuth2 credentials from environment variables or credentials file.
        
        Priority:
        1. Environment variables (GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET) - SECURE for production
        2. Credentials file (client_secret_*.json) - For local development only
        """
        # Priority 1: Environment variables (most secure)
        client_id = os.environ.get('GMAIL_CLIENT_ID')
        client_secret = os.environ.get('GMAIL_CLIENT_SECRET')
        
        if client_id and client_secret:
            logger.info("Loading Gmail credentials from environment variables")
            return {
                'client_id': client_id,
                'client_secret': client_secret,
                'auth_uri': 'https://accounts.google.com/o/oauth2/auth',
                'token_uri': 'https://oauth2.googleapis.com/token',
            }
        
        # Priority 2: Credentials file (for local development)
        logger.warning(
            "Gmail credentials not found in environment variables. "
            "Falling back to credentials file. "
            "For production, use GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET environment variables."
        )
        
        creds_file = self._get_credentials_file_path()
        if not creds_file or not os.path.exists(creds_file):
            if not self.fail_silently:
                raise ValueError(
                    f"Gmail credentials not found. "
                    f"Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET environment variables, "
                    f"or set GMAIL_CREDENTIALS_FILE, or place client_secret_*.json "
                    f"in backend directory."
                )
            return None
        
        try:
            with open(creds_file, 'r') as f:
                creds_data = json.load(f)
            
            # Handle both 'web' and 'installed' OAuth client types
            if 'web' in creds_data:
                client_config = creds_data['web']
            elif 'installed' in creds_data:
                client_config = creds_data['installed']
            else:
                raise ValueError("Invalid credentials file format")
            
            return {
                'client_id': client_config['client_id'],
                'client_secret': client_config['client_secret'],
                'auth_uri': client_config.get('auth_uri', 'https://accounts.google.com/o/oauth2/auth'),
                'token_uri': client_config.get('token_uri', 'https://oauth2.googleapis.com/token'),
            }
        except Exception as e:
            if not self.fail_silently:
                raise
            logger.error(f"Failed to load credentials file: {e}")
            return None
    
    def _get_token(self):
        """Get OAuth2 token from environment variable or file."""
        # Priority 1: Environment variable
        token_json = os.environ.get('GMAIL_TOKEN_JSON')
        if token_json:
            try:
                token_data = json.loads(token_json)
                return Credentials.from_authorized_user_info(token_data, SCOPES)
            except Exception as e:
                logger.warning(f"Failed to load token from GMAIL_TOKEN_JSON: {e}")
        
        # Priority 2: Token file
        token_file = self._get_token_file_path()
        if token_file and os.path.exists(token_file):
            try:
                return Credentials.from_authorized_user_file(token_file, SCOPES)
            except Exception as e:
                logger.warning(f"Failed to load token from file {token_file}: {e}")
        
        return None
    
    def _refresh_token(self, credentials):
        """
        Refresh expired access token using refresh token.
        This ensures tokens never expire by automatically refreshing before expiration.
        """
        try:
            if credentials and credentials.refresh_token:
                # Refresh if expired OR if about to expire (within 5 minutes)
                # This proactive refresh ensures tokens never expire
                if credentials.expired or (credentials.expiry and 
                    (credentials.expiry.timestamp() - time.time()) < 300):
                    logger.info("Refreshing access token (expired or expiring soon)")
                    credentials.refresh(Request())
                    # Save refreshed token immediately
                    self._save_token(credentials)
                    logger.info("Access token refreshed successfully")
                return credentials
        except Exception as e:
            error_msg = str(e).lower()
            # Check if refresh token itself is expired or revoked
            if 'invalid_grant' in error_msg or 'token has been expired or revoked' in error_msg:
                logger.error(
                    "Refresh token has expired or been revoked. "
                    "You need to run setup_gmail_oauth.py again to get a new refresh token."
                )
                if not self.fail_silently:
                    raise ValueError(
                        "Refresh token expired. Run setup_gmail_oauth.py to get a new token."
                    )
            else:
                logger.error(f"Failed to refresh token: {e}")
                if not self.fail_silently:
                    raise
        return None
    
    def _save_token(self, credentials):
        """Save token to file (if not using environment variable)."""
        # Only save to file if not using environment variable
        if not os.environ.get('GMAIL_TOKEN_JSON'):
            token_file = self._get_token_file_path()
            try:
                token_dir = os.path.dirname(token_file)
                if token_dir and not os.path.exists(token_dir):
                    os.makedirs(token_dir, exist_ok=True)
                
                token_data = {
                    'token': credentials.token,
                    'refresh_token': credentials.refresh_token,
                    'token_uri': credentials.token_uri,
                    'client_id': credentials.client_id,
                    'client_secret': credentials.client_secret,
                    'scopes': credentials.scopes,
                }
                
                with open(token_file, 'w') as f:
                    json.dump(token_data, f, indent=2)
            except Exception as e:
                logger.warning(f"Failed to save token to file: {e}")
    
    def _initialize_service(self):
        """
        Initialize Gmail API service with OAuth2 credentials.
        Automatically refreshes tokens to ensure they never expire.
        """
        try:
            # Load token
            self.credentials = self._get_token()
            
            if not self.credentials:
                if not self.fail_silently:
                    raise ValueError(
                        "Gmail OAuth2 token not found. "
                        "Run setup_gmail_oauth.py to authorize and get a token, "
                        "or set GMAIL_TOKEN_JSON environment variable."
                    )
                logger.warning("Gmail OAuth2 token not found. Email sending will fail.")
                return
            
            # Always refresh token proactively to prevent expiration
            # This ensures tokens are refreshed before they expire
            if self.credentials.refresh_token:
                self.credentials = self._refresh_token(self.credentials)
            
            if not self.credentials or not self.credentials.valid:
                if not self.fail_silently:
                    raise ValueError("Invalid or expired Gmail OAuth2 credentials")
                logger.error("Invalid Gmail OAuth2 credentials")
                return
            
            # Build Gmail service
            self.service = build('gmail', 'v1', credentials=self.credentials)
            logger.info("Gmail OAuth2 service initialized successfully")
            
        except Exception as e:
            if not self.fail_silently:
                raise
            logger.error(f"Failed to initialize Gmail service: {e}", exc_info=True)
    
    def _create_message(self, email_message: EmailMessage):
        """Create a MIME message from Django EmailMessage for Gmail API."""
        # Create multipart message
        if email_message.content_subtype == 'html' or email_message.attachments:
            message = MIMEMultipart('alternative')
        else:
            message = MIMEMultipart()
        
        # Set headers
        message['to'] = ', '.join(email_message.to)
        message['from'] = email_message.from_email
        message['subject'] = email_message.subject
        
        if email_message.cc:
            message['cc'] = ', '.join(email_message.cc)
        if email_message.bcc:
            message['bcc'] = ', '.join(email_message.bcc)
        if email_message.reply_to:
            message['reply-to'] = ', '.join(email_message.reply_to)
        
        # Add body
        if email_message.body:
            content_subtype = email_message.content_subtype if email_message.content_subtype in ['html', 'plain'] else 'plain'
            part = MIMEText(email_message.body, content_subtype)
            message.attach(part)
        
        # Add attachments
        if email_message.attachments:
            for attachment in email_message.attachments:
                if isinstance(attachment, tuple):
                    if len(attachment) == 2:
                        filename, content = attachment
                        mimetype = 'application/octet-stream'
                    elif len(attachment) == 3:
                        filename, content, mimetype = attachment
                    else:
                        continue
                    
                    part = MIMEBase(*mimetype.split('/'))
                    part.set_payload(content)
                    part.add_header('Content-Disposition', f'attachment; filename="{filename}"')
                    message.attach(part)
        
        # Encode message for Gmail API
        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')
        return {'raw': raw_message}
    
    def send_messages(self, email_messages):
        """
        Send email messages using Gmail API.
        
        Returns the number of successfully sent messages.
        """
        if not self.service:
            if not self.fail_silently:
                raise ValueError("Gmail service not initialized")
            logger.warning("Gmail service not initialized. Cannot send emails.")
            return 0
        
        sent_count = 0
        for email_message in email_messages:
            try:
                # Always refresh token proactively before sending to prevent expiration
                # This ensures tokens never expire during email sending
                if self.credentials and self.credentials.refresh_token:
                    self.credentials = self._refresh_token(self.credentials)
                    if self.credentials and self.credentials.valid:
                        # Rebuild service with refreshed credentials
                        self.service = build('gmail', 'v1', credentials=self.credentials)
                    else:
                        logger.error("Failed to refresh credentials. Cannot send email.")
                        if not self.fail_silently:
                            raise ValueError("Invalid credentials after refresh")
                        continue
                
                # Create message
                message = self._create_message(email_message)
                
                # Send via Gmail API
                result = self.service.users().messages().send(
                    userId='me',
                    body=message
                ).execute()
                
                sent_count += 1
                logger.info(f"Email sent successfully via Gmail API to {email_message.to}. Message ID: {result.get('id', 'N/A')}")
                
            except HttpError as error:
                error_msg = f"Gmail API error: {error}"
                if not self.fail_silently:
                    raise
                logger.error(error_msg, exc_info=True)
            except Exception as e:
                error_msg = f"Failed to send email: {e}"
                if not self.fail_silently:
                    raise
                logger.error(error_msg, exc_info=True)
        
        return sent_count

