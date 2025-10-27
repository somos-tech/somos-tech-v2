#!/bin/bash

# Azure Deployment Script
# This script deploys the infrastructure, function app code, and static web app

set -e

# Configuration
RESOURCE_GROUP="rg-somos-tech-dev2"
LOCATION="westus2"
ENVIRONMENT="dev"
TEMPLATE_FILE="main.bicep"
PARAMETERS_FILE="main.bicepparam"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    print_error "Azure CLI is not installed. Please install it from https://docs.microsoft.com/cli/azure/install-azure-cli"
    exit 1
fi

# Check if logged in to Azure
if ! az account show &> /dev/null; then
    print_warning "Not logged in to Azure. Running 'az login'..."
    az login
fi

# Display current subscription
SUBSCRIPTION_NAME=$(az account show --query name -o tsv)
print_info "Using subscription: $SUBSCRIPTION_NAME"

# Create resource group if it doesn't exist
print_info "Creating resource group '$RESOURCE_GROUP' in '$LOCATION'..."
az group create --name "$RESOURCE_GROUP" --location "$LOCATION" --output none

# Deploy infrastructure
print_info "Deploying infrastructure..."
DEPLOYMENT_OUTPUT=$(az deployment group create \
    --resource-group "$RESOURCE_GROUP" \
    --template-file "$TEMPLATE_FILE" \
    --parameters "$PARAMETERS_FILE" \
    --query properties.outputs \
    --output json)

if [ $? -eq 0 ]; then
    print_info "Infrastructure deployed successfully!"
else
    print_error "Infrastructure deployment failed!"
    exit 1
fi

# Extract outputs
FUNCTION_APP_NAME=$(echo "$DEPLOYMENT_OUTPUT" | jq -r '.functionAppName.value')
FUNCTION_APP_URL=$(echo "$DEPLOYMENT_OUTPUT" | jq -r '.functionAppUrl.value')
STATIC_WEB_APP_NAME=$(echo "$DEPLOYMENT_OUTPUT" | jq -r '.staticWebAppName.value')
STATIC_WEB_APP_URL=$(echo "$DEPLOYMENT_OUTPUT" | jq -r '.staticWebAppUrl.value')

print_info "Function App Name: $FUNCTION_APP_NAME"
print_info "Function App URL: $FUNCTION_APP_URL"
print_info "Static Web App Name: $STATIC_WEB_APP_NAME"
print_info "Static Web App URL: $STATIC_WEB_APP_URL"

# Ask if user wants to deploy the function code
read -p "Do you want to deploy the function app code now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Deploying function app code..."
    cd ../apps/api

    # Check if func CLI is installed
    if ! command -v func &> /dev/null; then
        print_error "Azure Functions Core Tools is not installed."
        print_info "Install it from: https://docs.microsoft.com/azure/azure-functions/functions-run-local"
        exit 1
    fi

    # Deploy the function app
    func azure functionapp publish "$FUNCTION_APP_NAME"

    if [ $? -eq 0 ]; then
        print_info "Function app code deployed successfully!"
        print_info "Your API is now available at: $FUNCTION_APP_URL"
    else
        print_error "Function app code deployment failed!"
        exit 1
    fi

    cd ../../infra
else
    print_info "Skipping function app code deployment."
    print_info "To deploy manually, run:"
    echo "  cd apps/api"
    echo "  func azure functionapp publish $FUNCTION_APP_NAME"
fi

# Configure Static Web App deployment
echo
print_info "Configuring Static Web App deployment..."
print_info "To complete the Static Web App setup:"
echo
print_info "1. Get the deployment token:"
echo "   SWA_TOKEN=\$(az staticwebapp secrets list --name $STATIC_WEB_APP_NAME --resource-group $RESOURCE_GROUP --query properties.apiKey -o tsv)"
echo
print_info "2. Add to GitHub repository secrets:"
echo "   - Go to: https://github.com/somos-tech/somos-tech-v2/settings/secrets/actions"
echo "   - Create secret: AZURE_STATIC_WEB_APPS_API_TOKEN"
echo "   - Paste the token value"
echo
print_info "3. Add Function App URL as GitHub variable:"
echo "   - Go to: https://github.com/somos-tech/somos-tech-v2/settings/variables/actions"
echo "   - Create variable: VITE_API_URL"
echo "   - Value: $FUNCTION_APP_URL"
echo
print_info "4. Push to main branch to trigger deployment"
echo

print_info "Deployment complete! 🚀"
echo
print_info "Summary:"
print_info "  API URL: $FUNCTION_APP_URL"
print_info "  Web URL: $STATIC_WEB_APP_URL"
