# Multi-Environment Setup Guide

This guide explains how to set up and manage dev, staging, and production environments for the Somos Tech application.

## Overview

The infrastructure supports three environments:
- **dev**: Development environment with minimal resources for testing
- **staging**: Pre-production environment that mirrors production
- **prod**: Production environment with maximum resources and protection

## Environment Configurations

| Environment | Max Instances | Instance Memory | Auto-Deploy | Approval Required |
|------------|---------------|-----------------|-------------|-------------------|
| dev        | 100           | 2048 MB         | ✅ Yes      | ❌ No             |
| staging    | 200           | 2048 MB         | ✅ Yes      | ⚠️ Optional       |
| prod       | 500           | 4096 MB         | ❌ No       | ✅ Yes            |

## Prerequisites

- Azure CLI installed and configured
- Azure subscription with appropriate permissions
- GitHub repository admin access
- jq installed (for JSON parsing in scripts)

## Step 1: Deploy Infrastructure

### Option A: Deploy All Environments

```bash
cd infra

# Deploy dev environment
./deploy-environment.sh dev

# Deploy staging environment
./deploy-environment.sh staging

# Deploy production environment
./deploy-environment.sh prod
```

### Option B: Deploy Single Environment

```bash
cd infra
./deploy-environment.sh <environment>
```

The script will:
1. Create the resource group `rg-somos-tech-<environment>`
2. Deploy all Azure resources (Function App, Static Web App, Storage, etc.)
3. Output deployment information
4. Provide instructions for GitHub configuration

## Step 2: Create Service Principals

Create a separate service principal for each environment:

```bash
# Set your subscription ID
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

# Create service principal for dev
az ad sp create-for-rbac \
  --name "github-actions-somos-tech-dev" \
  --role contributor \
  --scopes /subscriptions/$SUBSCRIPTION_ID/resourceGroups/rg-somos-tech-dev \
  --json-auth > azure-credentials-dev.json

# Create service principal for staging
az ad sp create-for-rbac \
  --name "github-actions-somos-tech-staging" \
  --role contributor \
  --scopes /subscriptions/$SUBSCRIPTION_ID/resourceGroups/rg-somos-tech-staging \
  --json-auth > azure-credentials-staging.json

# Create service principal for prod
az ad sp create-for-rbac \
  --name "github-actions-somos-tech-prod" \
  --role contributor \
  --scopes /subscriptions/$SUBSCRIPTION_ID/resourceGroups/rg-somos-tech-prod \
  --json-auth > azure-credentials-prod.json
```

⚠️ **Security Note**: Store these files securely and delete them after adding to GitHub secrets.

## Step 3: Get Static Web App Deployment Tokens

For each environment, get the deployment token:

```bash
# Dev environment
SWA_TOKEN_DEV=$(az staticwebapp secrets list \
  --name swa-somos-tech-dev-<uniquestring> \
  --resource-group rg-somos-tech-dev \
  --query properties.apiKey -o tsv)

# Staging environment
SWA_TOKEN_STAGING=$(az staticwebapp secrets list \
  --name swa-somos-tech-staging-<uniquestring> \
  --resource-group rg-somos-tech-staging \
  --query properties.apiKey -o tsv)

# Production environment
SWA_TOKEN_PROD=$(az staticwebapp secrets list \
  --name swa-somos-tech-prod-<uniquestring> \
  --resource-group rg-somos-tech-prod \
  --query properties.apiKey -o tsv)
```

Replace `<uniquestring>` with the actual unique suffix from your deployment output.

## Step 4: Configure GitHub Environments

### 4.1 Create Environments

1. Go to your repository: `https://github.com/somos-tech/somos-tech-v2`
2. Navigate to **Settings** → **Environments**
3. Create three environments: `dev`, `staging`, `prod`

### 4.2 Configure Environment Protection Rules

#### Dev Environment
- No protection rules needed
- Deployments happen automatically on push to `main`

#### Staging Environment (Optional)
- Add required reviewers if you want manual approval
- Or leave unprotected for automatic deployment after dev

#### Production Environment (Required)
1. Enable **Required reviewers**
2. Add yourself or team leads as reviewers
3. Set **Wait timer** to 0 minutes (optional)
4. Enable **Prevent administrators from bypassing** (recommended)

### 4.3 Add Environment Secrets

For **each environment** (dev, staging, prod), add the following secrets:

**Go to**: Settings → Environments → [environment-name] → Add Secret

1. **AZURE_CREDENTIALS**
   - Value: Content of `azure-credentials-<environment>.json`
   - This allows GitHub Actions to authenticate with Azure

2. **AZURE_STATIC_WEB_APPS_API_TOKEN**
   - Value: The deployment token from Step 3
   - This deploys the Static Web App

### 4.4 Add Environment Variables

For **each environment** (dev, staging, prod), add the following variables:

**Go to**: Settings → Environments → [environment-name] → Add Variable

1. **AZURE_FUNCTIONAPP_NAME**
   - Example: `func-somos-tech-dev-abc123xyz`
   - Get from deployment output

2. **VITE_API_URL**
   - Example: `https://func-somos-tech-dev-abc123xyz.azurewebsites.net`
   - Get from deployment output

3. **VITE_ENVIRONMENT**
   - Value: `dev`, `staging`, or `prod` respectively
   - Used to show environment badges in the app

## Step 5: Update Bicep Parameters (Optional)

If you renamed `main.bicepparam` to `main.dev.bicepparam`, update your deployment scripts:

```bash
# Rename the original file
mv main.bicepparam main.dev.bicepparam
```

The new parameter files are:
- `main.dev.bicepparam` - Development settings
- `main.staging.bicepparam` - Staging settings
- `main.prod.bicepparam` - Production settings

## Step 6: Test Deployments

### Test Dev Deployment
```bash
# Push to main branch
git add .
git commit -m "test: trigger dev deployment"
git push origin main
```

This will:
1. Deploy to dev automatically
2. Deploy to staging automatically (after dev)
3. Wait for approval before prod

### Test Staging Deployment
Staging deploys automatically after dev (on push to main).

### Test Production Deployment
Production requires manual trigger:

1. Go to **Actions** tab in GitHub
2. Select **Deploy Function App** or **Deploy Static Web App**
3. Click **Run workflow**
4. Select environment: `prod`
5. Click **Run workflow**
6. Approve the deployment when prompted

## Deployment Workflows

### Automatic Flow (Push to main)
```
main branch push
    ↓
  Dev Deploy (automatic)
    ↓
Staging Deploy (automatic, optional approval)
    ↓
  Prod Deploy (manual trigger + approval required)
```

### Manual Flow
Use workflow dispatch to deploy to specific environment:
1. Go to Actions tab
2. Select workflow
3. Click "Run workflow"
4. Choose environment
5. Confirm and run

## Resource Naming Convention

Resources follow this pattern:
```
<resource-type>-<app-name>-<environment>-<unique-suffix>

Examples:
- func-somos-tech-dev-abc123xyz
- swa-somos-tech-prod-def456uvw
- st-somostech-staging-ghi789rst
```

## Monitoring and Logs

### View Logs in Azure Portal
1. Go to [portal.azure.com](https://portal.azure.com)
2. Navigate to the resource group for your environment
3. Select the resource (Function App or Static Web App)
4. Go to **Logs** or **Application Insights**

### View Deployment Logs in GitHub
1. Go to **Actions** tab
2. Select the workflow run
3. Click on the environment job to see logs

## Cost Management

### Estimated Monthly Costs (West US 2)

| Environment | Estimated Cost | Notes |
|------------|----------------|-------|
| Dev        | $20-50        | Low instance count, minimal usage |
| Staging    | $50-100       | Medium instance count, testing |
| Prod       | $200-500      | High instance count, production traffic |

### Cost Optimization Tips
1. **Delete when not needed**: Remove dev/staging on weekends
2. **Use appropriate SKUs**: Dev uses Standard tier, consider Free tier for testing
3. **Monitor usage**: Set up cost alerts in Azure
4. **Scale down**: Reduce max instances in dev/staging

## Troubleshooting

### Deployment Fails
```bash
# Check deployment logs
az deployment group show \
  --resource-group rg-somos-tech-<environment> \
  --name <deployment-name> \
  --query properties.error
```

### Function App Not Working
```bash
# Check function app logs
az functionapp log tail \
  --name func-somos-tech-<environment>-<suffix> \
  --resource-group rg-somos-tech-<environment>
```

### Static Web App Not Deploying
1. Check GitHub Actions logs
2. Verify the deployment token is correct
3. Ensure `VITE_API_URL` is set correctly

### Environment Not Found in GitHub
The lint errors in workflows are expected until environments are created in GitHub. They will resolve once you:
1. Create the environments in GitHub Settings
2. Add the required secrets and variables

## Security Best Practices

1. ✅ **Use separate service principals** per environment
2. ✅ **Enable production approval** requirements
3. ✅ **Restrict production to admins** only
4. ✅ **Rotate credentials** regularly
5. ✅ **Enable Application Insights** for monitoring
6. ✅ **Use managed identities** for Azure resources
7. ✅ **Keep secrets in GitHub Environments**, not repository secrets

## Rollback Procedure

### Quick Rollback
If a production deployment fails:

1. Go to GitHub Actions
2. Find the last successful production deployment
3. Click "Re-run jobs"
4. Approve when prompted

### Manual Rollback
```bash
cd infra
./deploy-environment.sh prod

# Then redeploy previous code version
cd ../apps/api
git checkout <previous-commit>
func azure functionapp publish func-somos-tech-prod-<suffix>
```

## Next Steps

- [ ] Set up monitoring alerts in Azure
- [ ] Configure custom domains for each environment
- [ ] Set up automated testing before staging
- [ ] Configure database backups (when database is added)
- [ ] Document API versioning strategy
- [ ] Set up feature flags for gradual rollouts

## Support

For issues or questions:
- Check Azure Portal for resource status
- Review GitHub Actions logs
- Contact the DevOps team

---

**Last Updated**: October 27, 2025
