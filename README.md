# Somos Tech v2

Modern event management platform built with React, Azure Functions, and Azure Static Web Apps.

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
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

```bash
# Install Azure CLI
brew install azure-cli  # macOS

# Install Azure Functions Core Tools
brew install azure/functions/azure-functions-core-tools@4

# Install Node.js 20
brew install node@20

# Login to Azure
az login
```

### 1. Deploy Infrastructure (5 minutes)

```bash
cd infra
./deploy.sh
```

This creates:
- ✅ Azure Function App (API backend)
- ✅ Azure Static Web App (React frontend)
- ✅ Storage Account (data storage)
- ✅ Application Insights (monitoring)

When prompted, type `y` to deploy the Function App code.

### 2. Configure GitHub Secrets (2 minutes)

**Get deployment token:**
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

**Add to GitHub** (Settings → Secrets and variables → Actions):
- **Secret**: `AZURE_STATIC_WEB_APPS_API_TOKEN` = (token from above)
- **Variable**: `VITE_API_URL` = (Function App URL from deployment output)
- **Variable**: `VITE_ENVIRONMENT` = `production`

### 3. Deploy Frontend (1 minute)

```bash
git add .
git commit -m "Add Azure deployment config"
git push origin main
```

Watch deployment in GitHub Actions tab.

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

### Manual Deployment

#### Deploy Infrastructure
```bash
cd infra

# Using parameters file
az deployment group create \
  --resource-group rg-somos-tech-dev \
  --template-file main.bicep \
  --parameters main.dev.bicepparam

# Or inline parameters
az deployment group create \
  --resource-group rg-somos-tech-dev \
  --template-file main.bicep \
  --parameters environmentName=dev location=eastus
```

#### Deploy Function App Code
```bash
cd apps/api
FUNC_NAME=$(az deployment group show \
  --resource-group rg-somos-tech-dev \
  --name main \
  --query properties.outputs.functionAppName.value \
  --output tsv)

func azure functionapp publish $FUNC_NAME
```

#### Deploy Static Web App
```bash
cd apps/web
npm run build

az staticwebapp deploy \
  --name $SWA_NAME \
  --resource-group rg-somos-tech-dev \
  --output-location dist
```

---

## CI/CD Workflows

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

| Environment | Purpose | Auto-Deploy | Approval | Max Instances | Instance Memory |
|-------------|---------|-------------|----------|---------------|-----------------|
| **dev** | Development & testing | ✅ Yes | ❌ No | 100 | 2048 MB |
| **staging** | Pre-production testing | ✅ Yes | ⚠️ Optional | 200 | 2048 MB |
| **prod** | Live application | ❌ No | ✅ Required | 500 | 4096 MB |

### Deploy Multiple Environments

```bash
cd infra

# Deploy dev
./deploy-environment.sh dev

# Deploy staging
./deploy-environment.sh staging

# Deploy production
./deploy-environment.sh prod
```

### GitHub Environment Configuration

1. **Create Environments**: Settings → Environments → Create (dev, staging, prod)

2. **Configure Protection Rules**:
   - **dev**: No protection rules
   - **staging**: Optional reviewers
   - **prod**: Required reviewers, prevent bypass

3. **Add Environment Secrets** (for each environment):
   - `AZURE_CREDENTIALS` - Service principal JSON
   - `AZURE_STATIC_WEB_APPS_API_TOKEN` - Deployment token

4. **Add Environment Variables** (for each environment):
   - `AZURE_FUNCTIONAPP_NAME` - Function App name
   - `VITE_API_URL` - Function App URL
   - `VITE_ENVIRONMENT` - Environment name

### Resource Naming Convention

```
<resource-type>-<app-name>-<environment>-<unique-suffix>

Examples:
- func-somos-tech-dev-abc123xyz
- swa-somos-tech-prod-def456uvw
- st-somostech-staging-ghi789rst
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
