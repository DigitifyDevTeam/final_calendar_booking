#!/bin/bash
# Script to set up Gmail OAuth2 token on production server
# This script helps you set the GMAIL_TOKEN_JSON environment variable

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOAD_ENV_FILE="$SCRIPT_DIR/load_env.sh"
ENV_EXAMPLE_FILE="$SCRIPT_DIR/.env.production.example"

echo "=========================================="
echo "Gmail OAuth2 Token Setup for Production"
echo "=========================================="
echo ""

# Check if token JSON is provided as argument
if [ -n "$1" ]; then
    TOKEN_JSON="$1"
    echo "Using token JSON from command line argument"
else
    # Check if token file exists locally
    TOKEN_FILE="$SCRIPT_DIR/backend/gmail_token.json"
    
    if [ -f "$TOKEN_FILE" ]; then
        echo "✅ Found token file: $TOKEN_FILE"
        echo ""
        echo "Reading token from file..."
        TOKEN_JSON=$(cat "$TOKEN_FILE" | python3 -c "import sys, json; print(json.dumps(json.load(sys.stdin)))" 2>/dev/null || cat "$TOKEN_FILE")
    else
        echo "❌ Token file not found: $TOKEN_FILE"
        echo ""
        echo "Please provide the token JSON in one of these ways:"
        echo ""
        echo "Option 1: Run this script with token JSON as argument:"
        echo "  ./setup_production_gmail_token.sh '\"token\":\"...\",\"refresh_token\":\"...\"}'"
        echo ""
        echo "Option 2: Paste the token JSON when prompted below:"
        echo ""
        read -p "Enter Gmail OAuth2 Token JSON: " TOKEN_JSON
    fi
fi

if [ -z "$TOKEN_JSON" ]; then
    echo "❌ Error: Token JSON is empty"
    exit 1
fi

echo ""
echo "Token JSON received (first 50 chars): ${TOKEN_JSON:0:50}..."
echo ""

# Validate JSON format
if ! echo "$TOKEN_JSON" | python3 -m json.tool > /dev/null 2>&1; then
    echo "❌ Error: Invalid JSON format"
    echo "Please ensure the token JSON is valid JSON"
    exit 1
fi

echo "✅ Token JSON format is valid"
echo ""

# Create or update load_env.sh
if [ -f "$LOAD_ENV_FILE" ]; then
    echo "Found existing load_env.sh file"
    # Check if GMAIL_TOKEN_JSON already exists
    if grep -q "GMAIL_TOKEN_JSON" "$LOAD_ENV_FILE"; then
        echo "⚠️  GMAIL_TOKEN_JSON already exists in load_env.sh"
        read -p "Do you want to update it? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            # Remove old GMAIL_TOKEN_JSON line
            sed -i.bak '/^export GMAIL_TOKEN_JSON=/d' "$LOAD_ENV_FILE"
            # Add new one at the end
            echo "export GMAIL_TOKEN_JSON='$TOKEN_JSON'" >> "$LOAD_ENV_FILE"
            echo "✅ Updated GMAIL_TOKEN_JSON in load_env.sh"
        else
            echo "Keeping existing value"
        fi
    else
        echo "export GMAIL_TOKEN_JSON='$TOKEN_JSON'" >> "$LOAD_ENV_FILE"
        echo "✅ Added GMAIL_TOKEN_JSON to load_env.sh"
    fi
else
    echo "Creating new load_env.sh file..."
    cat > "$LOAD_ENV_FILE" << EOF
#!/bin/bash
# Production environment variables
# Source this file before running Django commands or services

# Gmail OAuth2 Token
export GMAIL_TOKEN_JSON='$TOKEN_JSON'
EOF
    chmod +x "$LOAD_ENV_FILE"
    echo "✅ Created load_env.sh with GMAIL_TOKEN_JSON"
fi

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Set the environment variable in your current shell:"
echo "   export GMAIL_TOKEN_JSON='$TOKEN_JSON'"
echo ""
echo "2. Source the load_env.sh file (if using it):"
echo "   source $LOAD_ENV_FILE"
echo ""
echo "3. If using systemd service, add this line to your service file:"
echo "   Environment=\"GMAIL_TOKEN_JSON=$TOKEN_JSON\""
echo ""
echo "   Then reload and restart:"
echo "   sudo systemctl daemon-reload"
echo "   sudo systemctl restart django-backend"
echo ""
echo "4. Restart your Django backend:"
echo "   # If using systemd:"
echo "   sudo systemctl restart django-backend"
echo ""
echo "   # If using nohup, kill and restart gunicorn:"
echo "   pkill gunicorn"
echo "   # Then restart your gunicorn command"
echo ""
echo "5. Verify it's working:"
echo "   tail -f $SCRIPT_DIR/logs/server.log"
echo ""
echo "You should no longer see 'Gmail OAuth2 token not found' warnings."
echo ""

