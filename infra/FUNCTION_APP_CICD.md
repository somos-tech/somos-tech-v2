# Function App CI/CD Setup Guide

This guide explains how to set up automated deployments for the Azure Function App using GitHub Actions.

## Overview

The GitHub Actions workflow (`.github/workflows/deploy-function-app.yml`) automatically deploys your API to Azure Functions whenever you push changes to the `apps/api/` directory.

## Prerequisites

- Azure subscription
- Function App deployed (run `./infra/deploy.sh`)
- Azure CLI installed locally
- GitHub repository admin access

## Setup Steps

### Step 1: Get Function App Name

After deploying the infrastructure, get your Function App name:

```bash
FUNC_NAME=$(az deployment group show \
  --resource-group rg-somos-tech-dev \
  --name main \
  --query properties.outputs.functionAppName.value \
  --output tsv)

echo "Function App Name: $FUNC_NAME"
```

### Step 2: Update Workflow File

Edit `.github/workflows/deploy-function-app.yml` and update the `AZURE_FUNCTIONAPP_NAME`:

```yaml
env:
  AZURE_FUNCTIONAPP_NAME: 'func-somos-tech-dev-xxxxx'  # Replace with your actual name
```

### Step 3: Create Azure Service Principal

Create a service principal for GitHub Actions to authenticate with Azure:

```bash
# Get your subscription ID
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

# Create service principal
az ad sp create-for-rbac \
  --name "github-actions-somos-tech" \
  --role contributor \
  --scopes /subscriptions/$SUBSCRIPTION_ID/resourceGroups/rg-somos-tech-dev \
  --sdk-auth
```

This command outputs JSON like:

```json
{
  "clientId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "clientSecret": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "subscriptionId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "tenantId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "activeDirectoryEndpointUrl": "https://login.microsoftonline.com",
  "resourceManagerEndpointUrl": "https://management.azure.com/",
  "activeDirectoryGraphResourceId": "https://graph.windows.net/",
  "sqlManagementEndpointUrl": "https://management.core.windows.net:8443/",
  "galleryEndpointUrl": "https://gallery.azure.com/",
  "managementEndpointUrl": "https://management.core.windows.net/"
}
```

**⚠️ Important**: Save this entire JSON output - you'll need it in the next step.

### Step 4: Add GitHub Secret

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `AZURE_CREDENTIALS`
5. Value: Paste the entire JSON output from Step 3
6. Click **Add secret**

### Step 5: Test the Workflow

Trigger a deployment:

```bash
# Make a small change to test
cd apps/api
echo "// Trigger deployment" >> index.js

# Commit and push
git add .
git commit -m "Test Function App deployment workflow"
git push origin main
```

### Step 6: Monitor Deployment

1. Go to your GitHub repository
2. Click on the **Actions** tab
3. You should see the "Deploy Function App" workflow running
4. Click on it to view detailed logs

## Workflow Behavior

### When It Runs

The workflow triggers on:
- Push to `main` branch with changes in `apps/api/**`
- Changes to the workflow file itself
- Manual trigger (via workflow_dispatch)

### What It Does

1. **Checkout code**: Gets the latest code from the repository
2. **Setup Node.js**: Installs Node.js 20
3. **Install dependencies**: Runs `npm ci` in the API directory
4. **Run tests**: Executes tests if available (optional)
5. **Login to Azure**: Authenticates using the service principal
6. **Deploy**: Deploys the function app code to Azure
7. **Logout**: Cleans up Azure session

### Deployment Time

- First deployment: ~2-3 minutes
- Subsequent deployments: ~1-2 minutes

## Environment Variables

### Update Function App Name

If you deploy to multiple environments, update the workflow:

```yaml
env:
  AZURE_FUNCTIONAPP_NAME: ${{ secrets.AZURE_FUNCTIONAPP_NAME }}
```

Then add different secrets for each environment:
- `AZURE_FUNCTIONAPP_NAME_DEV`
- `AZURE_FUNCTIONAPP_NAME_STAGING`
- `AZURE_FUNCTIONAPP_NAME_PROD`

### Multiple Environments Example

```yaml
on:
  push:
    branches:
      - main
      - develop

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Set environment
        run: |
          if [[ "${{ github.ref }}" == "refs/heads/main" ]]; then
            echo "FUNC_NAME=${{ secrets.AZURE_FUNCTIONAPP_NAME_PROD }}" >> $GITHUB_ENV
          elif [[ "${{ github.ref }}" == "refs/heads/staging" ]]; then
            echo "FUNC_NAME=${{ secrets.AZURE_FUNCTIONAPP_NAME_STAGING }}" >> $GITHUB_ENV
          else
            echo "FUNC_NAME=${{ secrets.AZURE_FUNCTIONAPP_NAME_DEV }}" >> $GITHUB_ENV
          fi

      - name: Deploy to Azure Functions
        uses: Azure/functions-action@v1
        with:
          app-name: ${{ env.FUNC_NAME }}
          package: ${{ env.AZURE_FUNCTIONAPP_PACKAGE_PATH }}
```

## Troubleshooting

### Error: "Resource not found"

**Problem**: Function App name is incorrect or doesn't exist.

**Solution**:
```bash
# List all function apps in the resource group
az functionapp list \
  --resource-group rg-somos-tech-dev \
  --query "[].name" -o table

# Update the workflow with the correct name
```

### Error: "Authentication failed"

**Problem**: Service principal credentials are incorrect or expired.

**Solution**:
1. Recreate the service principal (Step 3)
2. Update the `AZURE_CREDENTIALS` secret in GitHub
3. Try again

### Error: "Insufficient permissions"

**Problem**: Service principal doesn't have the right permissions.

**Solution**:
```bash
# Grant contributor role to the service principal
az role assignment create \
  --assignee <service-principal-client-id> \
  --role "Contributor" \
  --scope /subscriptions/$SUBSCRIPTION_ID/resourceGroups/rg-somos-tech-dev
```

### Deployment Succeeds but Function Doesn't Work

**Problem**: Missing dependencies or configuration.

**Solution**:
1. Check the Function App logs in Azure Portal
2. Verify all required app settings are configured
3. Test locally first with `func start`

### Workflow Doesn't Trigger

**Problem**: Workflow file path or branch name is incorrect.

**Solution**:
1. Ensure workflow is in `.github/workflows/`
2. Check branch name matches (should be `main`)
3. Verify the `paths` filter includes your changes

## Manual Deployment

If you need to deploy manually (bypass GitHub Actions):

```bash
cd apps/api
func azure functionapp publish <function-app-name>
```

Or force a workflow run:

```bash
# Using GitHub CLI
gh workflow run deploy-function-app.yml

# Or via GitHub UI
# Go to Actions → Deploy Function App → Run workflow
```

## Security Best Practices

### Service Principal Permissions

Grant only the minimum required permissions:

```bash
# Create service principal with specific scope
az ad sp create-for-rbac \
  --name "github-actions-somos-tech-api" \
  --role contributor \
  --scopes /subscriptions/$SUBSCRIPTION_ID/resourceGroups/rg-somos-tech-dev/providers/Microsoft.Web/sites/$FUNC_NAME
```

### Rotate Credentials

Regularly rotate service principal credentials:

```bash
# Reset credentials
az ad sp credential reset \
  --name "github-actions-somos-tech" \
  --query password -o tsv

# Update GitHub secret with new credentials
```

### Use Federated Credentials (Recommended)

For enhanced security, use OIDC instead of service principal secrets:

```yaml
- name: Azure Login
  uses: azure/login@v2
  with:
    client-id: ${{ secrets.AZURE_CLIENT_ID }}
    tenant-id: ${{ secrets.AZURE_TENANT_ID }}
    subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
```

See [Azure OIDC documentation](https://docs.microsoft.com/azure/developer/github/connect-from-azure) for setup.

## Advanced Configuration

### Add Tests to Workflow

Create tests in your API:

```bash
cd apps/api
npm install --save-dev jest @types/jest
```

Add test script to `package.json`:

```json
{
  "scripts": {
    "test": "jest"
  }
}
```

The workflow will automatically run tests before deploying.

### Add Build Validation

Prevent deployment if build fails:

```yaml
- name: Validate code
  run: |
    npm run lint
    npm run test
  working-directory: ${{ env.AZURE_FUNCTIONAPP_PACKAGE_PATH }}
```

### Deploy to Staging Slot

Use deployment slots for zero-downtime deployments:

```yaml
- name: Deploy to staging slot
  uses: Azure/functions-action@v1
  with:
    app-name: ${{ env.AZURE_FUNCTIONAPP_NAME }}
    package: ${{ env.AZURE_FUNCTIONAPP_PACKAGE_PATH }}
    slot-name: staging

- name: Swap slots
  run: |
    az functionapp deployment slot swap \
      --resource-group rg-somos-tech-dev \
      --name ${{ env.AZURE_FUNCTIONAPP_NAME }} \
      --slot staging \
      --target-slot production
```

## Monitoring Deployments

### View Deployment History

In Azure Portal:
1. Go to your Function App
2. Click **Deployment Center**
3. View deployment logs and history

### Set Up Notifications

Get notified of deployment status:

```yaml
- name: Notify on success
  if: success()
  run: |
    curl -X POST ${{ secrets.SLACK_WEBHOOK_URL }} \
      -H 'Content-Type: application/json' \
      -d '{"text":"✅ API deployed successfully to Azure Functions!"}'

- name: Notify on failure
  if: failure()
  run: |
    curl -X POST ${{ secrets.SLACK_WEBHOOK_URL }} \
      -H 'Content-Type: application/json' \
      -d '{"text":"❌ API deployment failed. Check GitHub Actions logs."}'
```

## Rollback

If a deployment causes issues:

### Option 1: Revert Git Commit

```bash
git revert HEAD
git push origin main
```

This triggers a new deployment with the previous code.

### Option 2: Redeploy Previous Version

```bash
# Get previous commit hash
git log --oneline -n 5

# Checkout previous version
git checkout <previous-commit-hash>

# Deploy manually
cd apps/api
func azure functionapp publish <function-app-name>

# Return to main
git checkout main
```

### Option 3: Use Deployment Slots

If using slots, swap back:

```bash
az functionapp deployment slot swap \
  --resource-group rg-somos-tech-dev \
  --name $FUNC_NAME \
  --slot production \
  --target-slot staging
```

## Complete Setup Checklist

- [ ] Infrastructure deployed (`./infra/deploy.sh`)
- [ ] Function App name obtained
- [ ] Workflow file updated with Function App name
- [ ] Service principal created
- [ ] `AZURE_CREDENTIALS` secret added to GitHub
- [ ] Test commit pushed to trigger workflow
- [ ] Deployment succeeded in GitHub Actions
- [ ] Function App endpoints tested
- [ ] Monitoring configured (optional)

## Next Steps

1. ✅ Complete the setup steps above
2. ⬜ Test the automated deployment
3. ⬜ Add unit tests for your API
4. ⬜ Set up deployment slots for staging
5. ⬜ Configure monitoring and alerts
6. ⬜ Document API endpoints

## Additional Resources

- [Azure Functions GitHub Actions](https://github.com/Azure/functions-action)
- [Azure Login Action](https://github.com/Azure/login)
- [GitHub Actions Documentation](https://docs.github.com/actions)
- [Azure Functions Deployment](https://docs.microsoft.com/azure/azure-functions/functions-deployment-technologies)
