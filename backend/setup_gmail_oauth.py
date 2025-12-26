#!/usr/bin/env python
"""
Gmail OAuth2 Setup Script

This script performs one-time OAuth2 authorization to obtain a refresh token
for Gmail API access. Run this script once to set up email sending.

Usage:
    # With environment variables (recommended for production):
    export GMAIL_CLIENT_ID='your-client-id'
    export GMAIL_CLIENT_SECRET='your-client-secret'
    python setup_gmail_oauth.py
    
    # With credentials file (for local development):
    python setup_gmail_oauth.py <path_to_credentials.json>

The script will:
1. Open a browser for Google OAuth2 authorization
2. Save the refresh token to gmail_token.json (or output for environment variable)
"""
import os
import sys
import json
from pathlib import Path

try:
    from google_auth_oauthlib.flow import InstalledAppFlow
    from google.oauth2.credentials import Credentials
except ImportError:
    print("ERROR: Google API libraries not installed.")
    print("Install with: pip install google-auth google-auth-oauthlib google-auth-httplib2 google-api-python-client")
    sys.exit(1)

# Gmail API scope for sending emails
SCOPES = ['https://www.googleapis.com/auth/gmail.send']

# Path to credentials file
BACKEND_DIR = Path(__file__).parent / 'backend'
CREDENTIALS_FILE = None

# Check for environment variables first (most secure)
GMAIL_CLIENT_ID = os.environ.get('GMAIL_CLIENT_ID')
GMAIL_CLIENT_SECRET = os.environ.get('GMAIL_CLIENT_SECRET')

# Find credentials file (fallback for local development)
if len(sys.argv) > 1:
    CREDENTIALS_FILE = sys.argv[1]
elif not (GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET):
    # Look for client_secret JSON files only if env vars not set
    client_secret_files = list(BACKEND_DIR.glob('client_secret_*.json'))
    if client_secret_files:
        CREDENTIALS_FILE = str(client_secret_files[0])
    else:
        print("ERROR: Gmail credentials not found.")
        print("\nOption 1 (Recommended for production): Set environment variables:")
        print("  export GMAIL_CLIENT_ID='your-client-id'")
        print("  export GMAIL_CLIENT_SECRET='your-client-secret'")
        print("\nOption 2 (For local development): Provide path to credentials file:")
        print(f"  python setup_gmail_oauth.py <path_to_credentials.json>")
        print(f"\nOr place client_secret_*.json in: {BACKEND_DIR}")
        sys.exit(1)

if CREDENTIALS_FILE and not os.path.exists(CREDENTIALS_FILE):
    print(f"ERROR: Credentials file not found: {CREDENTIALS_FILE}")
    sys.exit(1)

# Token output file
TOKEN_FILE = BACKEND_DIR / 'gmail_token.json'

def main():
    """Run OAuth2 flow and save refresh token."""
    print("=" * 60)
    print("Gmail OAuth2 Setup")
    print("=" * 60)
    print(f"\nCredentials file: {CREDENTIALS_FILE}")
    print(f"Token will be saved to: {TOKEN_FILE}")
    print("\nThis will open a browser for Google authorization...")
    print("Make sure you're logged into the Google account that will send emails.")
    print("\nPress Enter to continue, or Ctrl+C to cancel...")
    try:
        input()
    except KeyboardInterrupt:
        print("\nCancelled.")
        sys.exit(0)
    
    try:
        # Use fixed port 8080 for web clients so we can configure redirect URI in Google Cloud Console
        REDIRECT_PORT = 8080
        REDIRECT_URI = f'http://localhost:{REDIRECT_PORT}/'
        
        # Track if we're using a web client (needs redirect URI configuration)
        is_web_client = False
        
        # Load credentials from environment variables or file
        if GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET:
            # Use environment variables (most secure)
            print("Using credentials from environment variables (GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET)")
            # Assume web client when using env vars (most common case)
            is_web_client = True
            creds_data = {
                'installed': {
                    'client_id': GMAIL_CLIENT_ID,
                    'client_secret': GMAIL_CLIENT_SECRET,
                    'auth_uri': 'https://accounts.google.com/o/oauth2/auth',
                    'token_uri': 'https://oauth2.googleapis.com/token',
                    'redirect_uris': [REDIRECT_URI]
                }
            }
        else:
            # Load from file (for local development)
            print(f"Using credentials from file: {CREDENTIALS_FILE}")
            with open(CREDENTIALS_FILE, 'r') as f:
                creds_data = json.load(f)
            
            # Check if it's a web client
            if 'web' in creds_data:
                is_web_client = True
        
        # Handle both 'web' and 'installed' OAuth client types
        if 'web' in creds_data:
            # For web client, convert to installed app format for local server flow
            # Use fixed port so redirect URI can be configured in Google Cloud Console
            client_config = {
                'installed': {
                    'client_id': creds_data['web']['client_id'],
                    'client_secret': creds_data['web']['client_secret'],
                    'auth_uri': creds_data['web'].get('auth_uri', 'https://accounts.google.com/o/oauth2/auth'),
                    'token_uri': creds_data['web'].get('token_uri', 'https://oauth2.googleapis.com/token'),
                    'redirect_uris': [REDIRECT_URI]
                }
            }
            creds_data = client_config
        
        if 'installed' not in creds_data:
            print("ERROR: Invalid credentials file format. Expected 'web' or 'installed' key.")
            sys.exit(1)
        
        # Create OAuth2 flow using InstalledAppFlow (required for run_local_server)
        flow = InstalledAppFlow.from_client_config(
            creds_data,
            scopes=SCOPES
        )
        
        # Run OAuth2 flow
        print("\nOpening browser for authorization...")
        print("After authorizing, you may see a 'Connection refused' error.")
        print("This is normal - the authorization was successful.\n")
        
        if is_web_client:
            print("=" * 60)
            print("IMPORTANT: Redirect URI Configuration Required")
            print("=" * 60)
            print("\nYou're using a 'web' OAuth client. You MUST configure the redirect URI:")
            print("  1. Go to: https://console.cloud.google.com/apis/credentials")
            print("  2. Click on your OAuth 2.0 Client ID")
            print(f"  3. Under 'Authorized redirect URIs', click 'ADD URI'")
            print(f"  4. Add exactly: {REDIRECT_URI}")
            print("  5. Click 'SAVE'")
            print("  6. Wait 1-2 minutes for changes to propagate")
            print("\nPress Enter to continue (or Ctrl+C to configure redirect URI first)...")
            print("=" * 60)
            try:
                input()
            except KeyboardInterrupt:
                print("\n\nPlease configure the redirect URI first, then run this script again.")
                sys.exit(0)
            port = REDIRECT_PORT  # Use fixed port for web clients
        else:
            port = 0  # Random port for installed app clients (works automatically)
        
        # Use local server (InstalledAppFlow has run_local_server method)
        creds = flow.run_local_server(port=port, open_browser=True)
        
        # Save token
        token_data = {
            'token': creds.token,
            'refresh_token': creds.refresh_token,
            'token_uri': creds.token_uri,
            'client_id': creds.client_id,
            'client_secret': creds.client_secret,
            'scopes': creds.scopes,
        }
        
        # Ensure directory exists
        TOKEN_FILE.parent.mkdir(parents=True, exist_ok=True)
        
        with open(TOKEN_FILE, 'w') as f:
            json.dump(token_data, f, indent=2)
        
        print("\n" + "=" * 60)
        print("SUCCESS! OAuth2 setup complete.")
        print("=" * 60)
        print(f"\nToken saved to: {TOKEN_FILE}")
        print("\nYou can now use Gmail OAuth2 email backend.")
        print("\nAlternative: Set GMAIL_TOKEN_JSON environment variable with:")
        print(json.dumps(token_data))
        print("\n" + "=" * 60)
        
    except KeyboardInterrupt:
        print("\n\nCancelled by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()

