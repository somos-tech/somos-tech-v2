#!/bin/bash

# Multi-Environment Azure Deployment Script
# Usage: ./deploy-environment.sh <environment>
# Example: ./deploy-environment.sh dev

set -e

# Configuration
ENVIRONMENT=${1:-dev}
LOCATION="westus2"
TEMPLATE_FILE="main.bicep"
PARAMETERS_FILE="main.${ENVIRONMENT}.bicepparam"

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|prod)$ ]]; then
    echo "Error: Invalid environment '$ENVIRONMENT'. Must be: dev or prod"
    exit 1
fi

# Check if parameters file exists
if [ ! -f "$PARAMETERS_FILE" ]; then
    echo "Error: Parameters file '$PARAMETERS_FILE' not found"
    exit 1
fi

RESOURCE_GROUP="rg-somos-tech-${ENVIRONMENT}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
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

# Display deployment information
print_header "Deploying to $ENVIRONMENT Environment"
SUBSCRIPTION_NAME=$(az account show --query name -o tsv)
print_info "Subscription: $SUBSCRIPTION_NAME"
print_info "Resource Group: $RESOURCE_GROUP"
print_info "Location: $LOCATION"
print_info "Parameters File: $PARAMETERS_FILE"
echo

# Confirmation for production
if [ "$ENVIRONMENT" == "prod" ]; then
    print_warning "You are about to deploy to PRODUCTION!"
    read -p "Are you sure you want to continue? (yes/no) " -r
    echo
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        print_info "Deployment cancelled."
        exit 0
    fi
fi

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
STORAGE_ACCOUNT_NAME=$(echo "$DEPLOYMENT_OUTPUT" | jq -r '.storageAccountName.value')

echo
print_header "Deployment Summary"
echo -e "${GREEN}Environment:${NC} $ENVIRONMENT"
echo -e "${GREEN}Resource Group:${NC} $RESOURCE_GROUP"
echo
echo -e "${GREEN}Function App:${NC}"
echo -e "  Name: $FUNCTION_APP_NAME"
echo -e "  URL: $FUNCTION_APP_URL"
echo
echo -e "${GREEN}Static Web App:${NC}"
echo -e "  Name: $STATIC_WEB_APP_NAME"
echo -e "  URL: $STATIC_WEB_APP_URL"
echo
echo -e "${GREEN}Storage Account:${NC} $STORAGE_ACCOUNT_NAME"
echo

# GitHub Configuration Instructions
print_header "GitHub Configuration"
print_info "Next Steps for CI/CD Setup:"
echo
echo "1. Create GitHub Environment '$ENVIRONMENT':"
echo "   - Go to: https://github.com/somos-tech/somos-tech-v2/settings/environments"
echo "   - Click 'New environment' and name it '$ENVIRONMENT'"
if [ "$ENVIRONMENT" == "prod" ]; then
    echo "   - Enable 'Required reviewers' and add yourself"
fi
echo

echo "2. Create Service Principal (if not exists):"
echo "   SUBSCRIPTION_ID=\$(az account show --query id -o tsv)"
echo "   az ad sp create-for-rbac \\"
echo "     --name \"github-actions-somos-tech-$ENVIRONMENT\" \\"
echo "     --role contributor \\"
echo "     --scopes /subscriptions/\$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP \\"
echo "     --json-auth > azure-credentials-$ENVIRONMENT.json"
echo

echo "3. Get Static Web App Deployment Token:"
echo "   SWA_TOKEN=\$(az staticwebapp secrets list \\"
echo "     --name $STATIC_WEB_APP_NAME \\"
echo "     --resource-group $RESOURCE_GROUP \\"
echo "     --query properties.apiKey -o tsv)"
echo

echo "4. Add GitHub Environment Secrets:"
echo "   - Navigate to: https://github.com/somos-tech/somos-tech-v2/settings/environments/$ENVIRONMENT"
echo "   - Add secret: AZURE_CREDENTIALS (content from azure-credentials-$ENVIRONMENT.json)"
echo "   - Add secret: AZURE_STATIC_WEB_APPS_API_TOKEN (value: \$SWA_TOKEN)"
echo

echo "5. Add GitHub Environment Variables:"
echo "   - In the same environment settings page"
echo "   - Add variable: AZURE_FUNCTIONAPP_NAME = $FUNCTION_APP_NAME"
echo "   - Add variable: VITE_API_URL = $FUNCTION_APP_URL"
echo "   - Add variable: VITE_ENVIRONMENT = $ENVIRONMENT"
echo

# Optional: Deploy function app code
echo
read -p "Do you want to deploy the function app code now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Deploying function app code..."
    cd ../apps/api

    # Check if func CLI is installed
    if ! command -v func &> /dev/null; then
        print_error "Azure Functions Core Tools is not installed."
        print_info "Install it from: https://docs.microsoft.com/azure/azure-functions/functions-run-local"
        cd ../../infra
        exit 1
    fi

    # Deploy the function app
    func azure functionapp publish "$FUNCTION_APP_NAME"

    if [ $? -eq 0 ]; then
        print_info "Function app code deployed successfully!"
        print_info "Your API is now available at: $FUNCTION_APP_URL"
    else
        print_error "Function app code deployment failed!"
        cd ../../infra
        exit 1
    fi

    cd ../../infra
else
    print_info "Skipping function app code deployment."
    print_info "To deploy manually, run:"
    echo "  cd apps/api"
    echo "  func azure functionapp publish $FUNCTION_APP_NAME"
fi

echo
print_info "Deployment complete! 🚀"
