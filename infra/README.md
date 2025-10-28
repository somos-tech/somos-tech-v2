# SOMOS.tech Infrastructure Deployment

This directory contains the Infrastructure as Code (IaC) for deploying SOMOS.tech to Azure.

## 🏗️ Architecture Overview

The infrastructure includes:
- **Azure Static Web Apps** - Frontend hosting
- **Azure Functions** (Flex Consumption) - Backend API
- **Cosmos DB** (Serverless) - Database for members, events, and admin users
- **Application Insights** - Monitoring and logging
- **Azure Storage** - Function app storage
- **Azure AD Authentication** - Admin authentication with domain restriction

## 📋 Prerequisites

1. **Azure CLI** - [Install](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli)
2. **PowerShell** 7.0+ - [Install](https://docs.microsoft.com/en-us/powershell/scripting/install/installing-powershell)
3. **Azure Subscription** - With Owner or Contributor role
4. **Azure AD Tenant** - For authentication
5. **somos.tech domain email** - For admin access

## 🚀 Quick Start Deployment

### Step 1: Get Your Azure AD Tenant ID

```powershell
az login
$tenantId = (az account show --query tenantId -o tsv)
Write-Host "Your Tenant ID: $tenantId"
```

### Step 2: Update Parameters (Optional)

Edit `main.bicepparam` if needed:
```bicep
param azureAdTenantId = '<your-tenant-id>'
param allowedAdminDomain = 'somos.tech'
param environmentName = 'dev'  # or 'prod'
param location = 'eastus'
```

### Step 3: Deploy Infrastructure

```powershell
cd infra
./deploy.ps1 -TenantId "<your-tenant-id>" -Environment dev
```

This will:
- ✅ Create resource group
- ✅ Deploy all Azure resources
- ✅ Configure Cosmos DB with containers
- ✅ Set up managed identity and RBAC
- ✅ Output deployment details

### Step 4: Configure Authentication

```powershell
# Use the outputs from previous step
./configure-auth.ps1 `
    -StaticWebAppUrl "https://your-swa-url.azurestaticapps.net" `
    -StaticWebAppName "your-swa-name" `
    -ResourceGroupName "rg-somos-tech-dev"
```

This will:
- ✅ Create Azure AD app registration
- ✅ Generate client secret
- ✅ Configure Static Web App settings
- ✅ Update staticwebapp.config.json

### Step 5: Set Up GitHub Actions

1. Copy the deployment token from `deployment-output.json`
2. Go to GitHub repository → Settings → Secrets and variables → Actions
3. Add secret:
   - Name: `AZURE_STATIC_WEB_APPS_API_TOKEN`
   - Value: `<token from deployment-output.json>`

### Step 6: Deploy Application

```bash
git add .
git commit -m "Configure authentication and infrastructure"
git push
```

GitHub Actions will automatically deploy the application.

## 🔐 Authentication Flow

### Admin Access (@somos.tech users)

1. User navigates to `/admin/events`
2. Static Web App redirects to Azure AD login
3. User authenticates with Microsoft account
4. `GetUserRoles` function checks email domain
5. If email ends with `@somos.tech`:
   - User gets `admin` and `authenticated` roles
   - User record created in `admin-users` container
   - Access granted to admin pages
6. If email is not `@somos.tech`:
   - No roles assigned
   - Redirected to `/unauthorized`

### Member Registration (Public)

1. User visits `/register`
2. Fills out registration form
3. API creates record in `members` container
4. Email verification sent (TODO)

## 📁 Resource Structure

```
somos-tech-dev-<unique-id>
├── Resource Group: rg-somos-tech-dev
│   ├── Static Web App: swa-somos-tech-dev-<id>
│   ├── Function App: func-somos-tech-dev-<id>
│   ├── App Service Plan: asp-somos-tech-dev-<id>
│   ├── Cosmos DB: cosmos-somos-tech-dev-<id>
│   │   └── Database: somostech
│   │       ├── Container: members (partition: /email)
│   │       ├── Container: events (partition: /id)
│   │       └── Container: admin-users (partition: /email)
│   ├── Storage Account: st<name><env><id>
│   ├── Application Insights: appi-somos-tech-dev-<id>
│   └── Log Analytics: log-somos-tech-dev-<id>
```

## 🗄️ Cosmos DB Containers

### members
Stores community members who register through `/register`
```json
{
  "id": "member-<timestamp>-<random>",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "registeredAt": "2025-10-28T...",
  "status": "pending_verification",
  "role": "member",
  "emailVerified": false
}
```

### events
Stores events created by admins
```json
{
  "id": "evt-<uuid>",
  "name": "Community Coding Night",
  "date": "2025-11-15T18:00:00Z",
  "location": "Seattle, WA",
  "status": "published",
  "capacity": 100,
  "attendees": 45
}
```

### admin-users
Auto-populated for @somos.tech users
```json
{
  "id": "admin-<timestamp>-<random>",
  "email": "admin@somos.tech",
  "name": "Admin User",
  "roles": ["admin", "authenticated"],
  "identityProvider": "aad",
  "createdAt": "2025-10-28T...",
  "lastLogin": "2025-10-28T...",
  "status": "active"
}
```

## 🔧 Manual Configuration

### Add/Remove Admin Users Manually

```powershell
# Connect to Azure
az login

# Query Cosmos DB
az cosmosdb sql container query `
    --account-name cosmos-somos-tech-dev-<id> `
    --database-name somostech `
    --name admin-users `
    --query-text "SELECT * FROM c WHERE c.email = 'user@somos.tech'"

# To manually add an admin (if needed)
# Use Azure Portal → Cosmos DB → Data Explorer
```

### Update Allowed Domain

```powershell
az staticwebapp appsettings set `
    --name <swa-name> `
    --resource-group <rg-name> `
    --setting-names ALLOWED_ADMIN_DOMAIN='newdomain.com'
```

## 📊 Monitoring

### Application Insights

```powershell
# View recent logs
az monitor app-insights query `
    --app <app-insights-name> `
    --resource-group <rg-name> `
    --analytics-query "traces | where timestamp > ago(1h) | order by timestamp desc"
```

### Function App Logs

```powershell
# Stream logs
az webapp log tail `
    --name <function-app-name> `
    --resource-group <rg-name>
```

## 🔄 Updating Infrastructure

```powershell
# Make changes to main.bicep, then redeploy
./deploy.ps1 -TenantId "<tenant-id>" -Environment dev
```

Bicep deployments are idempotent - existing resources will be updated, not recreated.

## 🧹 Cleanup

```powershell
# Delete all resources
az group delete --name rg-somos-tech-dev --yes --no-wait
```

## 🆘 Troubleshooting

### Issue: "Unauthorized" when accessing /admin/events

**Solutions:**
1. Verify email domain is @somos.tech
2. Check Azure AD app registration redirect URI
3. Verify AZURE_CLIENT_ID and AZURE_CLIENT_SECRET are set
4. Check GetUserRoles function logs in Application Insights

### Issue: Cosmos DB connection errors

**Solutions:**
1. Verify managed identity is enabled on Function App
2. Check RBAC role assignment (Cosmos DB Data Contributor)
3. Verify COSMOS_ENDPOINT environment variable

### Issue: GitHub Actions deployment fails

**Solutions:**
1. Verify AZURE_STATIC_WEB_APPS_API_TOKEN secret is set
2. Check GitHub Actions logs for errors
3. Ensure repository is connected to Static Web App

## 📚 Additional Resources

- [Azure Static Web Apps Documentation](https://docs.microsoft.com/en-us/azure/static-web-apps/)
- [Azure Functions Documentation](https://docs.microsoft.com/en-us/azure/azure-functions/)
- [Cosmos DB Documentation](https://docs.microsoft.com/en-us/azure/cosmos-db/)
- [Azure AD Authentication](https://docs.microsoft.com/en-us/azure/static-web-apps/authentication-authorization)

## 💡 Tips

1. **Cost Optimization**: Using serverless resources (Cosmos DB Serverless, Functions Flex Consumption) minimizes costs for development
2. **Security**: Managed identities eliminate the need for connection strings
3. **Monitoring**: Application Insights provides comprehensive telemetry
4. **Domain Restriction**: Only @somos.tech users can access admin pages
5. **Auto-Registration**: @somos.tech users are automatically added to admin-users container on first login
