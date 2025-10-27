# Quick Start Guide

Get your app deployed to Azure in minutes.

## Prerequisites

```bash
# Install Azure CLI
brew install azure-cli  # macOS
# or visit: https://docs.microsoft.com/cli/azure/install-azure-cli

# Install Azure Functions Core Tools
brew install azure/functions/azure-functions-core-tools@4  # macOS

# Install Node.js 20
brew install node@20

# Login to Azure
az login
```

## 1. Deploy Infrastructure (5 minutes)

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

## 2. Configure GitHub (2 minutes)

Get your deployment token:

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

### Add to GitHub:

**Secrets** (Settings → Secrets and variables → Actions → Secrets):
- `AZURE_STATIC_WEB_APPS_API_TOKEN` = (paste token from above)

**Variables** (Settings → Secrets and variables → Actions → Variables):
- `VITE_API_URL` = (copy from deployment output)
- `VITE_ENVIRONMENT` = `production`

## 2b. Configure API CI/CD (Optional, 3 minutes)

For automated API deployments, set up the Function App workflow:

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

Add to GitHub:
1. Update `.github/workflows/deploy-function-app.yml` with `FUNC_NAME`
2. Add secret `AZURE_CREDENTIALS` with the JSON output from above

See [FUNCTION_APP_CICD.md](./FUNCTION_APP_CICD.md) for detailed instructions.

## 3. Deploy Frontend (1 minute)

```bash
git add .
git commit -m "Add Azure deployment config"
git push origin main
```

Watch deployment in GitHub Actions tab.

## 4. Access Your App

URLs from deployment output:
- **Web App**: `https://swa-somos-tech-dev-xxxxx.azurestaticapps.net`
- **API**: `https://func-somos-tech-dev-xxxxx.azurewebsites.net`

Test the API:
```bash
curl https://func-somos-tech-dev-xxxxx.azurewebsites.net/api/events
```

## Common Commands

### Redeploy Function App
```bash
cd apps/api
func azure functionapp publish <function-app-name>
```

### Redeploy Static Web App
```bash
cd apps/web
npm run build
az staticwebapp deploy \
  --name $SWA_NAME \
  --resource-group rg-somos-tech-dev \
  --output-location dist
```

### View Logs
```bash
# Function App logs
func azure functionapp logstream <function-app-name>

# Or in Azure Portal
az functionapp show --name <function-app-name> --resource-group rg-somos-tech-dev
```

### Get URLs
```bash
# Get all outputs
az deployment group show \
  --resource-group rg-somos-tech-dev \
  --name main \
  --query properties.outputs
```

## Local Development

### Run API locally:
```bash
cd apps/api
npm install
func start
```

### Run frontend locally:
```bash
cd apps/web
npm install
cp .env.example .env.local
npm run dev
```

Update `.env.local`:
```env
VITE_API_URL=http://localhost:7071
VITE_ENVIRONMENT=development
```

## Troubleshooting

### Build fails?
- Check Node.js version: `node --version` (should be 20.x)
- Clear cache: `npm cache clean --force`
- Reinstall: `rm -rf node_modules package-lock.json && npm install`

### API returns 404?
- Verify function app is deployed: Check Azure Portal
- Test endpoint: `curl https://<function-app-url>/api/events`
- Check CORS settings in `main.bicep`

### GitHub Actions fails?
- Verify secrets are set correctly
- Check Actions tab for detailed logs
- Ensure `package-lock.json` is committed

## Cost Estimate

**Free Tier Usage:**
- Static Web App: Free tier (100 GB bandwidth/month)
- Function App: First 1M requests free
- Storage: ~$0.10/month
- Application Insights: First 5GB/month free

**Estimated monthly cost**: ~$5-10 for development

## Cleanup

Delete all resources:
```bash
az group delete --name rg-somos-tech-dev --yes --no-wait
```

## Next Steps

- [ ] Set up custom domain
- [ ] Configure authentication
- [ ] Add monitoring alerts
- [ ] Set up staging environment
- [ ] Enable CI/CD for API

For detailed guides:
- [Infrastructure README](./README.md)
- [Static Web App Guide](./STATIC_WEB_APP.md)
