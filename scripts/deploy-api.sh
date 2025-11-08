#!/bin/bash

# API deployment script for Linux/WSL
FUNCTION_APP_NAME="func-somos-tech-dev-64qb73pzvgekw"
RESOURCE_GROUP="rg-somos-tech-dev"

echo "🚀 Deploying API to Azure Functions..."

# Check if logged in to Azure
if ! az account show &> /dev/null; then
    echo "❌ Not logged in to Azure"
    echo "Please run: az login"
    exit 1
fi

echo "✅ Azure login verified"

# Navigate to API directory
cd /workspaces/somos-tech-v2/apps/api || exit 1

# Create deployment package
ZIP_FILE="deploy.zip"
if [ -f "$ZIP_FILE" ]; then
    rm -f "$ZIP_FILE"
fi

echo "📦 Creating deployment package..."

# Create zip excluding node_modules and other unnecessary files
zip -r "$ZIP_FILE" . \
    -x "node_modules/*" \
    -x ".vscode/*" \
    -x "*.log" \
    -x ".git/*" \
    -x "deploy.zip" \
    -x ".env" \
    -x ".env.local"

echo "☁️  Deploying to Azure Function App: $FUNCTION_APP_NAME..."

# Deploy using Azure CLI
az functionapp deployment source config-zip \
    --resource-group "$RESOURCE_GROUP" \
    --name "$FUNCTION_APP_NAME" \
    --src "$ZIP_FILE" \
    --build-remote

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    rm -f "$ZIP_FILE"
    echo ""
    echo "🔗 Test API endpoints:"
    echo "   https://$FUNCTION_APP_NAME.azurewebsites.net/api/events"
    echo "   https://$FUNCTION_APP_NAME.azurewebsites.net/api/admin-users/list"
    echo ""
    echo "📊 View logs:"
    echo "   az functionapp logs tail --name $FUNCTION_APP_NAME --resource-group $RESOURCE_GROUP"
else
    echo ""
    echo "❌ Deployment failed"
    rm -f "$ZIP_FILE"
    exit 1
fi
