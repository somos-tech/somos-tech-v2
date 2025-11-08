#!/bin/bash

# Script to debug admin access for jcruz@somos.tech

echo "🔍 Debugging Admin Dashboard Access"
echo "===================================="
echo ""

# Step 1: Check Azure login
echo "Step 1: Checking Azure login status..."
if az account show &> /dev/null; then
    echo "✅ Logged into Azure"
    az account show --query "{Subscription:name, User:user.name}" -o table
else
    echo "❌ Not logged into Azure"
    echo "   Please run: az login"
    exit 1
fi

echo ""

# Step 2: Check if jcruz@somos.tech exists in database
echo "Step 2: Checking database for jcruz@somos.tech..."
cd /workspaces/somos-tech-v2/scripts
node check-admin-user.js

echo ""

# Step 3: Add/Update jcruz@somos.tech as admin
echo "Step 3: Ensuring jcruz@somos.tech has admin access..."
node add-jcruz-admin.js

echo ""

# Step 4: Verify environment variables
echo "Step 4: Checking environment configuration..."
if [ -f /workspaces/somos-tech-v2/apps/web/.env.local ]; then
    echo "✅ .env.local exists"
    echo "   VITE_API_URL=$(grep VITE_API_URL /workspaces/somos-tech-v2/apps/web/.env.local | cut -d '=' -f 2)"
else
    echo "⚠️  .env.local not found - created with default values"
fi

echo ""

# Step 5: Test API endpoints
echo "Step 5: Testing API endpoints..."
API_URL="https://func-somos-tech-dev-64qb73pzvgekw.azurewebsites.net"

echo "Testing GetUserRoles endpoint..."
curl -s "${API_URL}/api/GetUserRoles" -o /dev/null -w "HTTP Status: %{http_code}\n"

echo "Testing admin-users endpoint..."
curl -s "${API_URL}/api/admin-users/jcruz@somos.tech" -o /dev/null -w "HTTP Status: %{http_code}\n"

echo ""
echo "===================================="
echo "✅ Debugging complete!"
echo ""
echo "Next steps:"
echo "1. Restart the development server if running"
echo "2. Clear browser cache and cookies for the site"
echo "3. Log out and log back in via Azure AD"
echo "4. Navigate to /admin/users"
echo ""
echo "If still not working, check browser console for errors"
