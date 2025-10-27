# Static Web App Deployment Guide

This guide covers deploying the React frontend as an Azure Static Web App.

## What is Azure Static Web App?

Azure Static Web Apps is a service that automatically builds and deploys full-stack web apps from a code repository. It provides:
- Global CDN distribution
- Free SSL certificates
- Custom domains
- Staging environments for pull requests
- Integrated authentication
- Built-in API support (serverless functions)

## Prerequisites

- Azure subscription
- GitHub repository with the code
- Azure CLI installed
- Infrastructure deployed (see main README.md)

## Deployment Methods

### Method 1: GitHub Actions (Recommended)

This method automatically deploys your app whenever you push to the main branch.

#### Step 1: Deploy Infrastructure

```bash
cd infra
./deploy.sh
```

This creates the Static Web App resource in Azure.

#### Step 2: Get the Deployment Token

```bash
# Set variables
RESOURCE_GROUP="rg-somos-tech-dev"
SWA_NAME=$(az deployment group show \
  --resource-group $RESOURCE_GROUP \
  --name main \
  --query properties.outputs.staticWebAppName.value \
  --output tsv)

# Get the deployment token
SWA_TOKEN=$(az staticwebapp secrets list \
  --name $SWA_NAME \
  --resource-group $RESOURCE_GROUP \
  --query properties.apiKey \
  --output tsv)

echo "Deployment Token: $SWA_TOKEN"
```

#### Step 3: Configure GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Create a secret named: `AZURE_STATIC_WEB_APPS_API_TOKEN`
5. Paste the token from Step 2

#### Step 4: Configure GitHub Variables

1. In the same GitHub Actions settings, go to the **Variables** tab
2. Click **New repository variable**
3. Create a variable named: `VITE_API_URL`
4. Set value to your Function App URL (e.g., `https://func-somos-tech-dev-xxxxx.azurewebsites.net`)

Optional: Create `VITE_ENVIRONMENT` variable with value `production`

#### Step 5: Deploy

The GitHub Actions workflow (`.github/workflows/deploy-static-web-app.yml`) will automatically:
- Trigger on pushes to the `main` branch
- Build the React app
- Deploy to Azure Static Web Apps

To trigger a deployment:

```bash
git add .
git commit -m "Configure static web app deployment"
git push origin main
```

#### Step 6: Monitor Deployment

1. Go to the **Actions** tab in your GitHub repository
2. Click on the running workflow to see progress
3. Once complete, visit your Static Web App URL

### Method 2: Azure CLI Manual Deployment

For quick testing or one-off deployments:

```bash
# Navigate to web app directory
cd apps/web

# Build the application
npm run build

# Deploy to Static Web App
az staticwebapp deploy \
  --name $SWA_NAME \
  --resource-group $RESOURCE_GROUP \
  --app-location . \
  --output-location dist \
  --no-wait
```

## Configuration Files

### staticwebapp.config.json

Located at `apps/web/staticwebapp.config.json`, this file configures:
- Routing rules (SPA fallback to index.html)
- Security headers
- MIME types
- API routing

Key features:
- All routes fallback to `/index.html` for React Router
- Security headers (X-Frame-Options, CSR, etc.)
- API routes are proxied to the linked backend

### Environment Variables

The app uses Vite environment variables:

**Development** (`.env.local`):
```env
VITE_API_URL=http://localhost:7071
VITE_ENVIRONMENT=development
```

**Production** (set via GitHub Variables or Azure CLI):
```env
VITE_API_URL=https://func-somos-tech-dev-xxxxx.azurewebsites.net
VITE_ENVIRONMENT=production
```

## Staging Environments

Static Web Apps automatically creates staging environments for pull requests:

1. Create a pull request
2. GitHub Actions builds and deploys to a staging environment
3. Get a unique URL for testing (e.g., `https://happy-tree-123.azurestaticapps.net`)
4. Merge the PR to deploy to production
5. Staging environment is automatically deleted

## Custom Domains

To add a custom domain:

```bash
az staticwebapp hostname set \
  --name $SWA_NAME \
  --resource-group $RESOURCE_GROUP \
  --hostname www.yourdomain.com
```

Then add a CNAME record in your DNS:
- Name: `www`
- Value: `<static-web-app-default-hostname>`

## Monitoring

### View Deployment Logs

In Azure Portal:
1. Navigate to your Static Web App resource
2. Click **Deployment history** to see all deployments
3. Click on a deployment to view logs

### Application Insights

The Static Web App is configured to use Application Insights for monitoring:
- Page views
- User sessions
- Performance metrics
- Custom events

Access via Azure Portal → Application Insights resource

## Troubleshooting

### Build Fails in GitHub Actions

Check the GitHub Actions logs:
1. Go to **Actions** tab
2. Click on the failed workflow
3. Review the build step logs

Common issues:
- Missing dependencies: Ensure `package-lock.json` is committed
- Build errors: Test locally with `npm run build`
- Environment variables: Check GitHub variables are set correctly

### API Calls Fail

Check:
1. Function App is deployed and running
2. CORS is configured correctly (should allow Static Web App domain)
3. `VITE_API_URL` is set correctly in GitHub variables
4. Backend link is established (check Bicep deployment)

### 404 on Refresh

Ensure `staticwebapp.config.json` has the navigationFallback configured:
```json
{
  "navigationFallback": {
    "rewrite": "/index.html"
  }
}
```

## Cost

Azure Static Web Apps pricing:
- **Free tier**:
  - 100 GB bandwidth/month
  - 0.5 GB storage
  - Good for development and small projects
- **Standard tier**:
  - Custom authentication
  - SLA
  - More bandwidth and storage

The infrastructure deployed uses the **Free tier** by default.

## URLs

After deployment, you'll have:

- **Production URL**: `https://swa-somos-tech-dev-xxxxx.azurestaticapps.net`
- **API Backend**: `https://func-somos-tech-dev-xxxxx.azurewebsites.net`
- **Staging URLs**: Created automatically for each PR

Get your URLs:

```bash
echo "Static Web App: $(az staticwebapp show --name $SWA_NAME --resource-group $RESOURCE_GROUP --query defaultHostname -o tsv)"
```

## Next Steps

1. ✅ Deploy infrastructure with `./deploy.sh`
2. ✅ Configure GitHub secrets and variables
3. ✅ Push to main branch
4. ✅ Monitor GitHub Actions deployment
5. ✅ Visit your Static Web App URL
6. ⬜ Add custom domain (optional)
7. ⬜ Configure authentication (optional)
8. ⬜ Set up monitoring alerts (optional)

## Additional Resources

- [Azure Static Web Apps Documentation](https://docs.microsoft.com/azure/static-web-apps/)
- [Configuration Reference](https://docs.microsoft.com/azure/static-web-apps/configuration)
- [GitHub Actions for Static Web Apps](https://docs.microsoft.com/azure/static-web-apps/github-actions-workflow)
