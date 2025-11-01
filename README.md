# Somos Tech v2

Modern event management platform built with React, Azure Functions, and Azure Static Web Apps.

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Authentication Setup](#authentication-setup)
- [Project Structure](#project-structure)
- [Development](#development)
- [Deployment](#deployment)
- [CI/CD Workflows](#cicd-workflows)
- [Multi-Environment Setup](#multi-environment-setup)
- [Monitoring & Troubleshooting](#monitoring--troubleshooting)
- [Cost Management](#cost-management)

---

## Overview

Somos Tech is a full-stack event management application featuring:
- Modern React frontend with TypeScript and Vite
- Serverless API backend with Azure Functions
- NoSQL data storage with Azure Table Storage
- Global CDN distribution via Azure Static Web Apps
- Automated CI/CD with GitHub Actions

**Live URLs** (after deployment):
- **Frontend**: `https://swa-somos-tech-{env}-{hash}.azurestaticapps.net`
- **API**: `https://func-somos-tech-{env}-{hash}.azurewebsites.net`

---

## Tech Stack

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **React Router** - Client-side routing
- **Lucide React** - Icons
- **Radix UI** - Accessible components
- **date-fns** - Date formatting

### Backend
- **Node.js 20** - Runtime
- **Azure Functions v4** - Serverless framework
- **Azure Table Storage** - NoSQL database
- **Application Insights** - Monitoring

### Infrastructure
- **Azure Static Web Apps** - Frontend hosting
- **Azure Functions** (Flex Consumption) - API hosting
- **Azure Storage Account** - Data & function storage
- **Application Insights** - Monitoring & analytics
- **Bicep** - Infrastructure as Code

---

## Architecture

```
                    ┌─────────────────────┐
                    │      GitHub         │
                    │   (Source Code)     │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  GitHub Actions     │
                    │  (CI/CD Pipeline)   │
                    └──────────┬──────────┘
                               │
              ┌────────────────┴────────────────┐
              │                                  │
    ┌─────────▼──────────┐          ┌──────────▼──────────┐
    │  Azure Static Web  │          │  Azure Function App │
    │     App (React)    │◄─────────┤    (Node.js API)    │
    │                    │  Backend │                     │
    │  - CDN Hosting     │   Link   │  - REST Endpoints   │
    │  - SSL/TLS         │          │  - Managed Identity │
    │  - Custom Domain   │          │  - CORS Enabled     │
    └────────────────────┘          └──────────┬──────────┘
                                                │
                                     ┌──────────▼──────────┐
                                     │  Azure Storage      │
                                     │    Account          │
                                     │                     │
                                     │  - Table Storage    │
                                     │  - Blob Storage     │
                                     └─────────┬───────────┘
                                               │
                                     ┌─────────▼───────────┐
                                     │ Application Insights│
                                     │  (Monitoring)       │
                                     └─────────────────────┘
```

### Data Flow

```
User Browser
    ↓ (HTTPS)
Azure Static Web App (React SPA)
    ↓ (API Calls via Backend Link)
Azure Function App (REST API)
    ↓ (Managed Identity Auth)
Azure Table Storage (Data)
    ↓ (Telemetry)
Application Insights (Monitoring)
```

### Security Architecture

1. **Transport Security**: HTTPS enforced (TLS 1.2+), automatic SSL certificates
2. **Access Control**: CORS configuration, Managed Identity authentication
3. **Data Security**: Storage encryption at rest, identity-based auth (no connection strings)
4. **Application Security**: Security headers (CSP, X-Frame-Options), input validation
5. **Secrets Management**: GitHub Secrets, Azure Key Vault ready

---

## Quick Start

### Prerequisites

- GitHub account with access to the repository
- Azure subscription
- Azure CLI (for local development)

```bash
# Install Azure CLI (for local development only)
brew install azure-cli  # macOS

# Install Azure Functions Core Tools (for local API development)
brew install azure/functions/azure-functions-core-tools@4

# Install Node.js 20
brew install node@20
```

### 1. Configure GitHub Secrets & Variables

#### Overview: Service Principals & App Registrations

This project uses two types of Azure credentials:

1. **Deployment Service Principal** (`AZURE_CREDENTIALS`)
   - Purpose: Deploy infrastructure and application code via GitHub Actions
   - Type: Service Principal with Contributor role
   - Used by: All deployment workflows

2. **Azure AD App Registration** (`AZURE_AD_CLIENT_SECRET`)
   - Purpose: Enable user authentication in the Static Web App
   - Type: Azure AD Application with delegated permissions
   - Used by: Infrastructure deployment to configure authentication

#### Required Secrets

Go to **Settings → Secrets and variables → Actions** in your GitHub repository.

##### AZURE_STATIC_WEB_APPS_API_TOKEN

Get deployment token:
```bash
# Get Static Web App name
SWA_NAME=$(az deployment group show \
  --resource-group rg-somos-tech-dev \
  --name main \
  --query properties.outputs.staticWebAppName.value \
  --output tsv)

# Get deployment token
az staticwebapp secrets list \
  --name $SWA_NAME \
  --resource-group rg-somos-tech-dev \
  --query properties.apiKey \
  --output tsv
```

Add as secret: `AZURE_STATIC_WEB_APPS_API_TOKEN`

##### AZURE_CREDENTIALS

Create service principal for Function App deployment:

```bash
# Get subscription ID
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

# Create service principal
az ad sp create-for-rbac \
  --name "github-actions-somos-tech" \
  --role contributor \
  --scopes /subscriptions/$SUBSCRIPTION_ID/resourceGroups/rg-somos-tech-dev \
  --sdk-auth
```

Copy the JSON output and add as secret: `AZURE_CREDENTIALS`

Expected format:
```json
{
  "clientId": "<your-client-id>",
  "clientSecret": "<generated-secret>",
  "subscriptionId": "<your-subscription-id>",
  "tenantId": "<your-tenant-id>"
}
```

##### AZURE_AD_CLIENT_SECRET (for authentication)

Required for Static Web App authentication with Azure AD.

**Note**: You'll create this when setting up Azure AD authentication. See the [Authentication Setup](#authentication-setup) section for detailed steps.

Quick reference:
1. Create an Azure AD App Registration for "SOMOS.tech Admin Portal"
2. Generate a client secret in **Certificates & secrets**
3. Add the secret value to GitHub as `AZURE_AD_CLIENT_SECRET`

This secret allows the infrastructure deployment to automatically configure your Static Web App with Azure AD authentication settings.

Add as secret: `AZURE_AD_CLIENT_SECRET`

#### Required Variables

Add these as **repository variables** (Settings → Secrets and variables → Actions → Variables):

- `VITE_API_URL` = Function App URL (from deployment output)
- `VITE_ENVIRONMENT` = `production` (or `development`)
- `AZURE_FUNCTIONAPP_NAME` = Function App name (from deployment output)
- `AZURE_SUBSCRIPTION_ID` = Your Azure subscription ID
- `RESOURCE_GROUP_NAME` = `rg-somos-tech-dev`

#### Secrets Checklist

- [ ] `AZURE_STATIC_WEB_APPS_API_TOKEN` - Static Web App deployment
- [ ] `AZURE_CREDENTIALS` - Service principal for Function App
- [ ] `AZURE_AD_CLIENT_SECRET` - Azure AD authentication

#### Variables Checklist

- [ ] `VITE_API_URL` - API endpoint URL
- [ ] `VITE_ENVIRONMENT` - Environment name
- [ ] `AZURE_FUNCTIONAPP_NAME` - Function App name
- [ ] `AZURE_SUBSCRIPTION_ID` - Subscription ID
- [ ] `RESOURCE_GROUP_NAME` - Resource group name

### 2. Deploy Infrastructure via GitHub Actions

Once secrets and variables are configured:

1. Go to **Actions** tab in your GitHub repository
2. Select **Deploy Infrastructure (Manual Only)** workflow
3. Click **Run workflow**
4. Select environment (dev or prod)
5. Click **Run workflow**

This creates:
- ✅ Azure Function App (API backend)
- ✅ Azure Static Web App (React frontend)
- ✅ Storage Account (data storage)
- ✅ Application Insights (monitoring)

The deployment typically completes in 3-5 minutes.

### 3. Deploy Frontend & Backend

After infrastructure is deployed, push your code to trigger automatic deployments:

```bash
git add .
git commit -m "Initial deployment"
git push origin main
```

This triggers:
- ✅ Function App deployment (API)
- ✅ Static Web App deployment (frontend)

Watch deployment progress in the **Actions** tab.

### 4. Access Your App

URLs from deployment output:
- **Web App**: Check GitHub Actions deployment output
- **API**: Check infrastructure deployment output

Test the API:
```bash
curl https://func-somos-tech-dev-xxxxx.azurewebsites.net/api/events
```

---

## Project Structure

```
somos-tech-v2/
├── apps/
│   ├── api/                    # Azure Functions backend
│   │   ├── functions/          # HTTP trigger functions
│   │   │   ├── events.js       # Events CRUD operations
│   │   │   ├── sponsors.js     # Sponsors endpoint
│   │   │   └── venues.js       # Venues endpoint
│   │   ├── shared/             # Shared modules
│   │   │   ├── httpResponse.js # Response helpers
│   │   │   └── services/       # Business logic
│   │   ├── host.json           # Function App configuration
│   │   ├── local.settings.json # Local development settings
│   │   └── package.json
│   │
│   └── web/                    # React frontend
│       ├── src/
│       │   ├── api/            # API service layer
│       │   ├── components/     # React components
│       │   │   ├── admin-events/ # Event management
│       │   │   └── ui/         # Reusable UI components
│       │   ├── lib/            # Utility functions
│       │   ├── pages/          # Page components
│       │   └── shared/         # Types & interfaces
│       ├── staticwebapp.config.json # Static Web App config
│       └── package.json
│
├── infra/                      # Infrastructure as Code
│   ├── main.bicep              # Main Bicep template
│   ├── main.dev.bicepparam     # Dev environment parameters
│   ├── main.prod.bicepparam    # Prod environment parameters
│   ├── deploy.sh               # Deployment script
│   └── deploy-environment.sh   # Multi-env deployment script
│
└── .github/
    └── workflows/
        ├── deploy-static-web-app.yml  # Frontend CI/CD
        └── deploy-function-app.yml    # API CI/CD
```

---

## Authentication Setup

The application uses Azure AD (Entra ID) for admin authentication with optional GitHub OAuth support.

### Configure Azure AD Authentication

#### 1. Register Application in Azure AD

1. Go to **Azure Portal** → **Azure Active Directory** → **App registrations**
2. Click **New registration**
3. Fill in:
   - **Name**: `SOMOS.tech Admin Portal`
   - **Supported account types**: `Accounts in this organizational directory only`
   - **Redirect URI**:
     - Platform: `Web`
     - URI: `https://your-swa-name.azurestaticapps.net/.auth/login/aad/callback`
4. Click **Register**

#### 2. Configure Authentication Settings

1. Go to **Authentication** in your app registration
2. Under **Implicit grant and hybrid flows**, enable:
   - ✅ ID tokens
3. Click **Save**

#### 3. Create Client Secret

1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Add description: `SWA Auth Secret`
4. Choose expiration (recommend 24 months)
5. Click **Add**
6. **⚠️ COPY THE SECRET VALUE** immediately (cannot view again)

#### 4. Configure API Permissions

1. Go to **API permissions**
2. Ensure these Microsoft Graph permissions exist:
   - `openid` (delegated)
   - `profile` (delegated)
   - `email` (delegated)
3. Click **Grant admin consent** if required

#### 5. Get Configuration Values

From your app registration **Overview** page, copy:
- **Application (client) ID**
- **Directory (tenant) ID**

#### 6. Add to GitHub Secrets

The Azure AD client secret is required for infrastructure deployment. Add it to GitHub:

**Go to**: Settings → Secrets and variables → Actions → New repository secret

- **Name**: `AZURE_AD_CLIENT_SECRET`
- **Value**: The client secret you copied in step 3

This secret is used by the infrastructure deployment workflow to configure your Static Web App with Azure AD authentication automatically.

#### 7. Update staticwebapp.config.json

In `apps/web/staticwebapp.config.json`, replace `<YOUR_TENANT_ID>` with your actual tenant ID:

```json
"openIdIssuer": "https://login.microsoftonline.com/YOUR-TENANT-ID/v2.0"
```

Commit and push this change:

```bash
git add apps/web/staticwebapp.config.json
git commit -m "Configure Azure AD tenant ID"
git push origin main
```

#### 8. Deploy Infrastructure

After adding the secret, deploy or redeploy your infrastructure:

1. Go to **Actions** → **Deploy Infrastructure (Manual Only)**
2. Click **Run workflow**
3. Select environment
4. Click **Run workflow**

The workflow will automatically configure your Static Web App with:
- `AZURE_CLIENT_ID` - From your app registration
- `AZURE_CLIENT_SECRET` - From the GitHub secret
- `AZURE_TENANT_ID` - From your Azure AD tenant

### Verify Authentication Configuration

After deployment, verify the settings in Azure Portal:

1. Go to your **Static Web App** → **Configuration**
2. Confirm these settings exist:
   - ✅ `AZURE_CLIENT_ID`
   - ✅ `AZURE_CLIENT_SECRET` (value hidden)
   - ✅ `AZURE_TENANT_ID`

### Optional: Configure GitHub OAuth

#### 1. Create GitHub OAuth App

1. Go to **GitHub** → **Settings** → **Developer settings** → **OAuth Apps**
2. Click **New OAuth App**
3. Fill in:
   - **Application name**: `SOMOS.tech`
   - **Homepage URL**: `https://your-swa-name.azurestaticapps.net`
   - **Authorization callback URL**: `https://your-swa-name.azurestaticapps.net/.auth/login/github/callback`
4. Click **Register application**
5. Copy the **Client ID** and generate a **Client Secret**

#### 2. Add GitHub Settings to Static Web App

```
GITHUB_CLIENT_ID=<your-github-client-id>
GITHUB_CLIENT_SECRET=<your-github-client-secret>
```

### Assign Admin Roles

#### Method 1: Azure Portal

1. Go to **Static Web App** → **Role management**
2. Click **Invitations** → **Invite**
3. Fill in:
   - **Domain**: Your Azure AD domain
   - **Email**: Admin user's email
   - **Role**: `admin`
   - **Hours until expiration**: 24
4. Send invitation to user

#### Method 2: Configuration File

Create `staticwebapp.database.config.json`:

```json
{
  "$schema": "https://github.com/Azure/static-web-apps/schemas/latest/invitations.schema.json",
  "roles": {
    "admin": [
      "admin@yourdomain.com"
    ],
    "member": []
  }
}
```

### Authentication Flow

```
Public Pages (/, /register)
    ↓
    Anyone can access

Admin Pages (/admin/*)
    ↓
    Check authentication (useAuth hook)
    ↓
    ├─→ Not authenticated → Redirect to /.auth/login/aad
    │                        ↓
    │                        Microsoft Sign-In
    │                        ↓
    │                        Success → Return to page
    │
    └─→ Authenticated → Check role
        ↓
        ├─→ Has 'admin' role → Allow access
        └─→ No 'admin' role → /unauthorized
```

### Test Authentication

1. Navigate to `/admin/events`
2. Should redirect to Microsoft login
3. Sign in with admin account
4. Should see admin dashboard after successful login

### Troubleshooting Authentication

**Issue: Redirect loop on admin pages**
- Verify redirect URI matches exactly: `https://your-site.azurestaticapps.net/.auth/login/aad/callback`

**Issue: "User is not authorized"**
- Verify user has 'admin' role in Role Management

**Issue: Cannot see user info**
- Ensure API permissions include openid, profile, and email

---

## Development

### Local Development Setup

#### Run API Locally

```bash
cd apps/api
npm install

# Copy local settings
cp local.settings.json.example local.settings.json

# Start Function App
func start
```

API will be available at `http://localhost:7071`

#### Run Frontend Locally

```bash
cd apps/web
npm install

# Create environment file
cp .env.example .env.local

# Edit .env.local
# VITE_API_URL=http://localhost:7071
# VITE_ENVIRONMENT=development

# Start dev server
npm run dev
```

App will be available at `http://localhost:5173`

### Available Scripts

#### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

#### API
- `func start` - Start Function App locally
- `npm test` - Run tests
- `func azure functionapp publish <name>` - Deploy to Azure

---

## Deployment

All deployments are automated via GitHub Actions workflows. No manual deployment scripts are needed.

### Azure Resources Deployed

| Resource | Type | Purpose |
|----------|------|---------|
| Azure Static Web App | `Microsoft.Web/staticSites` | Frontend hosting with CDN |
| Azure Function App | `Microsoft.Web/sites` | Serverless API backend |
| App Service Plan | `Microsoft.Web/serverfarms` | Flex Consumption (FC1 SKU) |
| Storage Account | `Microsoft.Storage/storageAccounts` | Table & blob storage |
| Application Insights | `Microsoft.Insights/components` | Monitoring & analytics |
| Log Analytics Workspace | `Microsoft.OperationalInsights/workspaces` | Log storage |
| Backend Link | `Microsoft.Web/staticSites/linkedBackends` | SWA-Function integration |

### Deployment Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `location` | resourceGroup().location | Azure region |
| `environmentName` | 'dev' | Environment (dev/staging/prod) |
| `appName` | 'somos-tech' | Application name |
| `nodeVersion` | '20' | Node.js runtime version |
| `maximumInstanceCount` | 100 | Max Function App instances |
| `instanceMemoryMB` | 2048 | Instance memory (2048/4096) |

### Deployment Workflows

#### 1. Infrastructure Deployment
- **Workflow**: `deploy-infrastructure.yml`
- **Trigger**: Manual only (workflow_dispatch)
- **Purpose**: Deploy or update Azure infrastructure
- **Environments**: dev, prod

#### 2. Function App Deployment
- **Workflow**: `deploy-function-app.yml`
- **Trigger**: Push to `main` with changes in `apps/api/**`
- **Purpose**: Deploy API backend code
- **Automatic**: Yes

#### 3. Static Web App Deployment
- **Workflow**: `deploy-static-web-app.yml`
- **Trigger**: Push to `main` with changes in `apps/web/**`
- **Purpose**: Deploy frontend code
- **Automatic**: Yes

---

## CI/CD Workflows

### Infrastructure Workflow (`deploy-infrastructure.yml`)

**Triggers:**
- Manual workflow dispatch only

**Configuration Required:**
- **Secret**: `AZURE_CREDENTIALS` (service principal)
- **Secret**: `AZURE_AD_CLIENT_SECRET` (Azure AD auth)
- **Variable**: `AZURE_SUBSCRIPTION_ID`
- **Variable**: `RESOURCE_GROUP_NAME`

**Steps:**
1. Checkout code
2. Login to Azure
3. Deploy Bicep template with parameters
4. Azure logout

**Duration:** ~3-5 minutes

### Frontend Workflow (`deploy-static-web-app.yml`)

**Triggers:**
- Push to `main` branch with changes in `apps/web/**`
- Pull request opened/updated (creates staging environment)
- Manual trigger

**Configuration Required:**
- **Secret**: `AZURE_STATIC_WEB_APPS_API_TOKEN`
- **Variable**: `VITE_API_URL`
- **Variable**: `VITE_ENVIRONMENT` (optional)

**Steps:**
1. Checkout code
2. Setup Node.js 20
3. Install dependencies (`npm ci`)
4. Build React app with environment variables
5. Deploy to Azure Static Web Apps
6. Create unique staging URL for PRs

**Duration:** ~2-3 minutes

### API Workflow (`deploy-function-app.yml`)

**Triggers:**
- Push to `main` branch with changes in `apps/api/**`
- Manual trigger

**Configuration Required:**
- **Secret**: `AZURE_CREDENTIALS` (service principal JSON)
- **Workflow file update**: Set `AZURE_FUNCTIONAPP_NAME`

**Setup:**
```bash
# Get Function App name
FUNC_NAME=$(az deployment group show \
  --resource-group rg-somos-tech-dev \
  --name main \
  --query properties.outputs.functionAppName.value \
  --output tsv)

# Create service principal
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
az ad sp create-for-rbac \
  --name "github-actions-somos-tech" \
  --role contributor \
  --scopes /subscriptions/$SUBSCRIPTION_ID/resourceGroups/rg-somos-tech-dev \
  --sdk-auth
```

Add the JSON output as `AZURE_CREDENTIALS` secret in GitHub.

**Steps:**
1. Checkout code
2. Setup Node.js 20
3. Install dependencies
4. Run tests
5. Login to Azure
6. Deploy to Azure Functions
7. Logout

**Duration:** ~1-2 minutes

### Pull Request Flow

```
Create PR → Build & Deploy to Staging → Test on unique URL → Merge → Deploy to Production + Delete Staging
```

---

## Multi-Environment Setup

### Environment Strategy

| Environment | Purpose | Infrastructure Deploy | Code Deploy | Approval | Max Instances | Instance Memory |
|-------------|---------|----------------------|-------------|----------|---------------|-----------------|
| **dev** | Development & testing | Manual | ✅ Auto | ❌ No | 100 | 2048 MB |
| **prod** | Live application | Manual | ✅ Auto | ✅ Required | 500 | 4096 MB |

### Deploy to Multiple Environments

#### 1. Create Azure Resource Groups

```bash
# Create dev resource group
az group create --name rg-somos-tech-dev --location westus2

# Create prod resource group
az group create --name rg-somos-tech-prod --location westus2
```

#### 2. Deploy Infrastructure via GitHub Actions

For each environment:
1. Go to **Actions** → **Deploy Infrastructure (Manual Only)**
2. Click **Run workflow**
3. Select environment (dev or prod)
4. Click **Run workflow**

#### 3. Configure GitHub Environments

1. **Create Environments**: Settings → Environments → Create (dev, prod)

2. **Configure Protection Rules**:
   - **dev**: No protection rules
   - **prod**: Required reviewers, prevent bypass

3. **Add Environment Secrets** (for each environment):
   - `AZURE_CREDENTIALS` - Service principal JSON
   - `AZURE_STATIC_WEB_APPS_API_TOKEN` - Deployment token
   - `AZURE_AD_CLIENT_SECRET` - Azure AD client secret

4. **Add Environment Variables** (for each environment):
   - `AZURE_SUBSCRIPTION_ID` - Azure subscription ID
   - `RESOURCE_GROUP_NAME` - Resource group name (e.g., `rg-somos-tech-dev`)
   - `AZURE_FUNCTIONAPP_NAME` - Function App name
   - `VITE_API_URL` - Function App URL
   - `VITE_ENVIRONMENT` - Environment name

### Resource Naming Convention

```
<resource-type>-<app-name>-<environment>-<unique-suffix>

Examples:
- func-somos-tech-dev-abc123xyz
- swa-somos-tech-prod-def456uvw
- st-somostech-dev-ghi789rst
```

---

## Monitoring & Troubleshooting

### Application Insights

All resources are connected to Application Insights for monitoring:
- **Frontend**: Page views, user sessions, browser errors
- **Backend**: API requests, response times, failures
- **Infrastructure**: Resource utilization, scaling events

**Access**: Azure Portal → Application Insights resource

### View Logs

**Function App Logs:**
```bash
func azure functionapp logstream <function-app-name>
```

**Deployment Logs:**
- GitHub: Actions tab → Select workflow run
- Azure Portal: Resource → Deployment History

### Common Issues

#### Build Fails
```bash
# Test locally
cd apps/web  # or apps/api
npm install
npm run build

# Clear cache if needed
rm -rf node_modules package-lock.json
npm install
```

#### API Returns 404
- Verify Function App is deployed and running
- Check CORS configuration in `main.bicep`
- Confirm `VITE_API_URL` is correct
- Test endpoint: `curl https://<function-app-url>/api/events`

#### GitHub Actions Fails
- Check secrets are set correctly
- Review Actions tab logs
- Ensure `package-lock.json` is committed
- Verify Node.js version matches (20.x)

#### 404 on Page Refresh
- Ensure `staticwebapp.config.json` has `navigationFallback` configured
- Check SPA routing configuration

### Performance Characteristics

**Frontend:**
- First Contentful Paint: < 1s (CDN)
- Time to Interactive: < 2s
- Largest Contentful Paint: < 2.5s

**Backend:**
- Cold Start: < 1s (Flex Consumption)
- Warm Request: < 100ms
- P99 Latency: < 500ms

**Data Layer:**
- Table Read: < 10ms
- Table Write: < 20ms
- Query: < 100ms (small datasets)

---

## Cost Management

### Estimated Monthly Costs

**Development Environment:**
| Service | Tier | Est. Cost |
|---------|------|-----------|
| Static Web App | Free | $0 |
| Function App | Flex Consumption | $2-5 |
| Storage Account | Standard LRS | $1 |
| Application Insights | Pay-as-you-go (5GB free) | $2 |
| **Total** | | **~$5-10** |

**Production Environment:**
| Service | Tier | Est. Cost |
|---------|------|-----------|
| Static Web App | Standard | $9 |
| Function App | Flex Consumption | $50-200 |
| Storage Account | Standard LRS | $5 |
| Application Insights | Pay-as-you-go | $10-30 |
| **Total** | | **~$74-244** |

### Cost Optimization Tips

1. **Scale appropriately**: Adjust `maximumInstanceCount` per environment
2. **Delete unused environments**: Remove dev/staging when not needed
3. **Monitor usage**: Set up budget alerts
4. **Use lifecycle policies**: Archive old data in storage
5. **Configure sampling**: Reduce Application Insights data volume for high-traffic apps

### Set Up Budget Alerts

```bash
az consumption budget create \
  --amount 50 \
  --category Cost \
  --name dev-budget \
  --time-grain Monthly \
  --start-date $(date +%Y-%m-01) \
  --end-date $(date -d "+1 year" +%Y-%m-01)
```

---

## Disaster Recovery

### Backup Strategy

1. **Code**: Stored in GitHub (version control)
2. **Infrastructure**: Infrastructure as Code (Bicep templates)
3. **Data**: Azure Storage redundancy (LRS by default)
4. **Configuration**: Environment variables in GitHub/Azure

### Recovery Time Objective (RTO)

- **Infrastructure**: ~5 minutes (redeploy Bicep template)
- **Frontend**: ~3 minutes (GitHub Actions)
- **Backend**: ~2 minutes (Function deployment)
- **Total RTO**: ~10 minutes

### Rollback Procedure

**Quick Rollback:**
```bash
# Revert last commit
git revert HEAD
git push origin main
```

**Manual Rollback:**
```bash
# Get previous commit
git log --oneline -n 5

# Checkout and deploy
git checkout <previous-commit>
cd apps/api
func azure functionapp publish <function-app-name>
```

**Slot Swap Rollback:**
```bash
az functionapp deployment slot swap \
  --resource-group rg-somos-tech-dev \
  --name $FUNC_NAME \
  --slot production \
  --target-slot staging
```

---

## Clean Up

To delete all resources:

```bash
az group delete --name rg-somos-tech-dev --yes --no-wait
```

⚠️ **Warning**: This will permanently delete everything and cannot be undone.

---

## Additional Resources

### Documentation
- [Azure Static Web Apps](https://docs.microsoft.com/azure/static-web-apps/)
- [Azure Functions](https://docs.microsoft.com/azure/azure-functions/)
- [Azure Bicep](https://docs.microsoft.com/azure/azure-resource-manager/bicep/)
- [GitHub Actions](https://docs.github.com/actions)

### Tools
- [Azure CLI](https://docs.microsoft.com/cli/azure/install-azure-cli)
- [Azure Functions Core Tools](https://docs.microsoft.com/azure/azure-functions/functions-run-local)
- [GitHub CLI](https://cli.github.com/)

### Support
- **Issues**: Create a GitHub issue
- **Questions**: Contact the development team
- **Azure Support**: [Azure Portal Help + Support](https://portal.azure.com/#blade/Microsoft_Azure_Support/HelpAndSupportBlade)

---

## License

MIT License - see LICENSE file for details

## Contributors

Built with ❤️ by the Somos Tech team

---

**Last Updated**: October 28, 2025
