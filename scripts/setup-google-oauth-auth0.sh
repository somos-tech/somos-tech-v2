#!/bin/bash
#
# Setup Google OAuth Credentials for Auth0
# Run this in Google Cloud Shell: https://shell.cloud.google.com
#
# This script creates OAuth 2.0 credentials for SOMOS.tech Auth0 integration
#

set -e

# Configuration
PROJECT_NAME="somos-tech-auth"
APP_NAME="SOMOS.tech"
AUTH0_DOMAIN="dev-0tp5bbdn7af0lfpv.us.auth0.com"
REDIRECT_URI="https://${AUTH0_DOMAIN}/login/callback"
JS_ORIGIN="https://${AUTH0_DOMAIN}"

echo "=============================================="
echo " Google OAuth Setup for Auth0 - SOMOS.tech"
echo "=============================================="
echo ""

# Check if gcloud is available
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: gcloud CLI not found. Please run this in Google Cloud Shell."
    exit 1
fi

# Get current project or create new one
echo "📋 Checking Google Cloud project..."
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null || echo "")

if [ -z "$CURRENT_PROJECT" ]; then
    echo "No project selected. Creating new project..."
    
    # Generate unique project ID
    PROJECT_ID="${PROJECT_NAME}-$(date +%s | tail -c 6)"
    
    echo "Creating project: $PROJECT_ID"
    gcloud projects create "$PROJECT_ID" --name="$APP_NAME OAuth" 2>/dev/null || true
    gcloud config set project "$PROJECT_ID"
    CURRENT_PROJECT="$PROJECT_ID"
fi

echo "✓ Using project: $CURRENT_PROJECT"
echo ""

# Enable required APIs
echo "📦 Enabling required APIs..."
gcloud services enable iamcredentials.googleapis.com --quiet 2>/dev/null || true
gcloud services enable people.googleapis.com --quiet 2>/dev/null || true
echo "✓ APIs enabled"
echo ""

# Check if OAuth consent screen is configured
echo "🔧 Configuring OAuth consent screen..."

# Create OAuth brand (consent screen) if it doesn't exist
BRAND_EXISTS=$(gcloud alpha iap oauth-brands list --format="value(name)" 2>/dev/null | head -1 || echo "")

if [ -z "$BRAND_EXISTS" ]; then
    echo "Creating OAuth consent screen..."
    
    # Get user email for support email
    USER_EMAIL=$(gcloud config get-value account 2>/dev/null)
    
    gcloud alpha iap oauth-brands create \
        --application_title="$APP_NAME" \
        --support_email="$USER_EMAIL" 2>/dev/null || echo "Note: OAuth brand may need manual configuration"
fi

echo ""
echo "=============================================="
echo " MANUAL STEPS REQUIRED"
echo "=============================================="
echo ""
echo "The OAuth consent screen and credentials must be configured manually."
echo "Please follow these steps:"
echo ""
echo "1. Go to: https://console.cloud.google.com/apis/credentials/consent"
echo ""
echo "2. Configure OAuth Consent Screen:"
echo "   - User Type: External"
echo "   - App name: $APP_NAME"
echo "   - User support email: (your email)"
echo "   - App logo: Upload SOMOS.tech logo"
echo "   - App domain: somos.tech"
echo "   - Authorized domains: somos.tech, auth0.com"
echo "   - Developer email: (your email)"
echo "   - Click 'Save and Continue'"
echo ""
echo "3. Add Scopes:"
echo "   - Click 'Add or Remove Scopes'"
echo "   - Select: email, profile, openid"
echo "   - Click 'Save and Continue'"
echo ""
echo "4. Go to: https://console.cloud.google.com/apis/credentials"
echo ""
echo "5. Click '+ CREATE CREDENTIALS' → 'OAuth client ID'"
echo ""
echo "6. Configure:"
echo "   - Application type: Web application"
echo "   - Name: Auth0 $APP_NAME"
echo "   - Authorized JavaScript origins:"
echo "     $JS_ORIGIN"
echo "   - Authorized redirect URIs:"
echo "     $REDIRECT_URI"
echo ""
echo "7. Click 'Create' and copy the credentials"
echo ""
echo "=============================================="
echo " COPY THESE VALUES TO AUTH0"
echo "=============================================="
echo ""
echo "After creating the OAuth client, you'll get:"
echo "  - Client ID: (copy this)"
echo "  - Client Secret: (copy this)"
echo ""
echo "Then go to Auth0 Dashboard:"
echo "  https://manage.auth0.com/dashboard"
echo ""
echo "Navigate to: Authentication → Social → Google"
echo "Paste your Client ID and Client Secret"
echo "Click Save"
echo ""
echo "=============================================="

# Try to create OAuth client programmatically (may fail due to consent screen requirements)
echo ""
echo "Attempting to create OAuth client programmatically..."
echo ""

# Check if we can create via API
cat << 'EOF' > /tmp/create-oauth-client.py
#!/usr/bin/env python3
"""
Create OAuth 2.0 Client for Auth0
Run after configuring OAuth consent screen
"""

import subprocess
import json
import sys

def main():
    auth0_domain = "dev-0tp5bbdn7af0lfpv.us.auth0.com"
    redirect_uri = f"https://{auth0_domain}/login/callback"
    js_origin = f"https://{auth0_domain}"
    
    # Get current project
    result = subprocess.run(
        ["gcloud", "config", "get-value", "project"],
        capture_output=True, text=True
    )
    project_id = result.stdout.strip()
    
    if not project_id:
        print("❌ No project configured")
        sys.exit(1)
    
    print(f"Project: {project_id}")
    
    # Try to create OAuth client using gcloud
    # This requires the OAuth consent screen to be configured first
    try:
        result = subprocess.run([
            "gcloud", "alpha", "iap", "oauth-clients", "create",
            f"projects/{project_id}/brands/-",
            f"--display_name=Auth0 SOMOS.tech"
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✓ OAuth client created!")
            print(result.stdout)
        else:
            print("Note: Could not create OAuth client automatically.")
            print("Please create it manually in the Google Cloud Console.")
            print(f"Error: {result.stderr}")
    except Exception as e:
        print(f"Error: {e}")
        print("Please create OAuth client manually.")

if __name__ == "__main__":
    main()
EOF

python3 /tmp/create-oauth-client.py 2>/dev/null || echo "Please create OAuth client manually using the steps above."

echo ""
echo "=============================================="
echo " Quick Links"
echo "=============================================="
echo ""
echo "Google Cloud Console Credentials:"
echo "  https://console.cloud.google.com/apis/credentials"
echo ""
echo "Auth0 Dashboard - Social Connections:"
echo "  https://manage.auth0.com/dashboard/us/${AUTH0_DOMAIN%%.*}/connections/social"
echo ""
echo "Test Login URL:"
echo "  https://dev.somos.tech/.auth/login/auth0"
echo ""
