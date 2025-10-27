# GitHub Actions Workflows - Quick Reference

## Overview

Your project has two automated GitHub Actions workflows for continuous deployment:

| Workflow | File | Triggers | Deploys |
|----------|------|----------|---------|
| **Frontend** | `deploy-static-web-app.yml` | Push to `main`, changes in `apps/web/**` | React app to Azure Static Web Apps |
| **API** | `deploy-function-app.yml` | Push to `main`, changes in `apps/api/**` | Node.js API to Azure Functions |

## Frontend Workflow

### Configuration Required

```bash
# GitHub Secret
AZURE_STATIC_WEB_APPS_API_TOKEN

# GitHub Variables
VITE_API_URL
VITE_ENVIRONMENT (optional)
```

### How to Get the Secret

```bash
SWA_NAME=$(az deployment group show \
  --resource-group rg-somos-tech-dev \
  --name main \
  --query properties.outputs.staticWebAppName.value \
  --output tsv)

az staticwebapp secrets list \
  --name $SWA_NAME \
  --resource-group rg-somos-tech-dev \
  --query properties.apiKey \
  --output tsv
```

### Triggers
- ✅ Push to `main` branch with frontend changes
- ✅ Pull request opened/updated (creates staging environment)
- ✅ Pull request closed (deletes staging environment)
- ✅ Manual trigger via workflow_dispatch

### What It Does
1. Checks out code
2. Sets up Node.js 20
3. Installs dependencies (`npm ci`)
4. Builds React app with environment variables
5. Deploys to Azure Static Web Apps
6. Creates unique staging URL for PRs

### Typical Duration
- **First deployment**: ~3-4 minutes
- **Subsequent deployments**: ~2-3 minutes

## API Workflow

### Configuration Required

```bash
# GitHub Secret
AZURE_CREDENTIALS  # JSON from service principal

# Workflow File Update
AZURE_FUNCTIONAPP_NAME  # Your Function App name
```

### How to Set Up

**Step 1: Get Function App name**
```bash
az deployment group show \
  --resource-group rg-somos-tech-dev \
  --name main \
  --query properties.outputs.functionAppName.value \
  --output tsv
```

**Step 2: Create service principal**
```bash
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

az ad sp create-for-rbac \
  --name "github-actions-somos-tech" \
  --role contributor \
  --scopes /subscriptions/$SUBSCRIPTION_ID/resourceGroups/rg-somos-tech-dev \
  --sdk-auth
```

**Step 3: Update workflow file**
Edit `.github/workflows/deploy-function-app.yml`:
```yaml
env:
  AZURE_FUNCTIONAPP_NAME: 'func-somos-tech-dev-xxxxx'  # Your name here
```

**Step 4: Add GitHub secret**
Add the entire JSON output from Step 2 as `AZURE_CREDENTIALS`

### Triggers
- ✅ Push to `main` branch with API changes
- ✅ Changes to workflow file itself
- ✅ Manual trigger via workflow_dispatch

### What It Does
1. Checks out code
2. Sets up Node.js 20
3. Installs dependencies (`npm ci`)
4. Runs tests (if available)
5. Logs in to Azure
6. Deploys to Azure Functions
7. Logs out of Azure

### Typical Duration
- **First deployment**: ~2-3 minutes
- **Subsequent deployments**: ~1-2 minutes

## Common Commands

### View Workflow Runs
```bash
# Using GitHub CLI
gh run list

# View specific workflow
gh run list --workflow=deploy-static-web-app.yml
gh run list --workflow=deploy-function-app.yml

# Watch a running workflow
gh run watch
```

### Trigger Manual Deployment
```bash
# Frontend
gh workflow run deploy-static-web-app.yml

# API
gh workflow run deploy-function-app.yml
```

### View Logs
```bash
# Get latest run
gh run view

# View specific run
gh run view <run-id>

# Download logs
gh run download <run-id>
```

### Cancel Running Workflow
```bash
gh run cancel <run-id>
```

## Deployment Flow

### When You Push Changes

```
┌─────────────────────────────────────────────────────────────┐
│  Developer pushes to main branch                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  GitHub detects changed files                               │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│ apps/web/**      │    │ apps/api/**      │
│ changed?         │    │ changed?         │
└────────┬─────────┘    └────────┬─────────┘
         │                       │
         │ Yes                   │ Yes
         ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│ Deploy Static    │    │ Deploy Function  │
│ Web App workflow │    │ App workflow     │
└────────┬─────────┘    └────────┬─────────┘
         │                       │
         ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│ Azure Static     │    │ Azure Functions  │
│ Web Apps         │    │                  │
└──────────────────┘    └──────────────────┘
```

### Pull Request Flow (Frontend Only)

```
┌─────────────────────────────────────────────────────────────┐
│  Developer creates pull request                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  GitHub Actions builds and deploys to staging               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Unique staging URL created                                 │
│  Example: https://happy-tree-123abc.azurestaticapps.net    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Team reviews and tests on staging URL                      │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│ PR Merged        │    │ PR Closed        │
└────────┬─────────┘    └────────┬─────────┘
         │                       │
         ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│ Deploy to prod   │    │ Delete staging   │
│ Delete staging   │    │ environment      │
└──────────────────┘    └──────────────────┘
```

## Troubleshooting Quick Guide

### Frontend Workflow Fails

**Build Error**
```bash
# Test locally
cd apps/web
npm install
npm run build
```

**Missing Secret**
- Check: Settings → Secrets and variables → Actions
- Verify: `AZURE_STATIC_WEB_APPS_API_TOKEN` exists

**Missing Variable**
- Check: Settings → Secrets and variables → Actions → Variables
- Verify: `VITE_API_URL` is set

### API Workflow Fails

**Authentication Error**
```bash
# Recreate service principal
az ad sp create-for-rbac \
  --name "github-actions-somos-tech" \
  --role contributor \
  --scopes /subscriptions/$SUBSCRIPTION_ID/resourceGroups/rg-somos-tech-dev \
  --sdk-auth

# Update AZURE_CREDENTIALS secret in GitHub
```

**Wrong Function App Name**
```bash
# List function apps
az functionapp list \
  --resource-group rg-somos-tech-dev \
  --query "[].name" -o table

# Update workflow file with correct name
```

**Build Error**
```bash
# Test locally
cd apps/api
npm install
npm test
func start
```

### Workflow Doesn't Trigger

**Check:**
1. Is the file in `.github/workflows/`?
2. Is the branch name correct (`main`)?
3. Did you push the workflow file?
4. Are the path filters correct?

**Force trigger:**
```bash
# Make a small change
echo "# Trigger" >> README.md
git add .
git commit -m "Trigger workflow"
git push
```

## Monitoring

### GitHub Actions UI

1. Go to repository → **Actions** tab
2. See all workflow runs
3. Click any run for detailed logs
4. View each step's output

### Azure Portal

**Static Web App:**
- Portal → Static Web Apps → Your app → Deployment History

**Function App:**
- Portal → Function Apps → Your app → Deployment Center

### Notifications

Set up Slack/email notifications by adding to workflow:

```yaml
- name: Notify on failure
  if: failure()
  run: |
    curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
      -H 'Content-Type: application/json' \
      -d '{"text":"Deployment failed!"}'
```

## Best Practices

### ✅ Do's
- Test builds locally before pushing
- Use semantic commit messages
- Review PR staging environments
- Monitor deployment logs
- Keep secrets secure and rotated
- Update dependencies regularly

### ❌ Don'ts
- Don't commit secrets to code
- Don't skip local testing
- Don't ignore failed workflows
- Don't deploy directly to production (use PRs)
- Don't share deployment credentials

## Quick Links

- **GitHub Actions**: `https://github.com/your-org/your-repo/actions`
- **Azure Portal**: `https://portal.azure.com`
- **Static Web App**: Check deployment outputs
- **Function App**: Check deployment outputs

## Need Help?

- **Frontend CI/CD**: See [STATIC_WEB_APP.md](./STATIC_WEB_APP.md)
- **API CI/CD**: See [FUNCTION_APP_CICD.md](./FUNCTION_APP_CICD.md)
- **Infrastructure**: See [README.md](./README.md)
- **Quick Start**: See [QUICKSTART.md](./QUICKSTART.md)

---

**Pro Tip**: Use `gh` CLI for faster workflow management from your terminal!

```bash
# Install GitHub CLI
brew install gh

# Authenticate
gh auth login

# Now use all the commands above!
```
