#!/usr/bin/env python
"""
Helper script to get GMAIL_TOKEN_JSON for production deployment.

This script reads the token file and outputs the JSON string
that you can use as GMAIL_TOKEN_JSON environment variable.
"""
import json
import sys
from pathlib import Path

# Default token file location
BACKEND_DIR = Path(__file__).parent / 'backend'
TOKEN_FILE = BACKEND_DIR / 'gmail_token.json'

# Allow custom path
if len(sys.argv) > 1:
    TOKEN_FILE = Path(sys.argv[1])

if not TOKEN_FILE.exists():
    print(f"ERROR: Token file not found: {TOKEN_FILE}")
    print(f"\nRun setup_gmail_oauth.py first to generate the token file.")
    sys.exit(1)

try:
    with open(TOKEN_FILE, 'r') as f:
        token_data = json.load(f)
    
    # Output as single-line JSON string (ready for environment variable)
    token_json = json.dumps(token_data)
    
    print("=" * 60)
    print("Gmail OAuth2 Token for Production")
    print("=" * 60)
    print("\nCopy this entire line and set it as GMAIL_TOKEN_JSON:")
    print("-" * 60)
    print(token_json)
    print("-" * 60)
    print("\nExample (Linux/Mac):")
    print(f"export GMAIL_TOKEN_JSON='{token_json}'")
    print("\nExample (Windows PowerShell):")
    print(f"$env:GMAIL_TOKEN_JSON='{token_json}'")
    print("\nExample (Windows CMD):")
    print(f"set GMAIL_TOKEN_JSON={token_json}")
    print("=" * 60)
    
except Exception as e:
    print(f"ERROR: Failed to read token file: {e}")
    sys.exit(1)

