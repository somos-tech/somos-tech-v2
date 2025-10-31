# Azure AD Client Secret Setup for Static Web App

## Overview

Your Bicep infrastructure has been updated to include Azure AD authentication variables. You now need to:
1. Create a new client secret for your Azure AD app
2. Add the secret as a GitHub Secret
3. Update your deployment to use the secret

## Step 1: Create Client Secret in Azure AD

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Find and click on **SOMOS.tech Admin Portal**
   - App ID: `dcf7379e-4576-4544-893f-77d6649390d3`
4. Go to **Certificates & secrets** in the left menu
5. Under **Client secrets**, click **+ New client secret**
6. Fill in:
   - **Description**: `Static Web App Auth Secret`
   - **Expires**: Choose 24 months (recommended)
7. Click **Add**
8. **⚠️ IMMEDIATELY COPY THE SECRET VALUE** - You can't see it again!

## Step 2: Add Secret to GitHub

The `azureAdClientSecret` is a secure parameter that needs to be added to GitHub Secrets for CI/CD.

### Add to GitHub Secrets (Required for CI/CD)

1. Go to: https://github.com/somos-tech/somos-tech-v2/settings/secrets/actions
2. Click **New repository secret**
3. Name: `AZURE_AD_CLIENT_SECRET`
4. Value: Paste the client secret you copied from Step 1
5. Click **Add secret**

**Note:** The deployment workflows are already configured to use this secret. Once you add it, the next deployment will automatically include the authentication configuration.

## Step 3: Update Deployment Scripts

### For GitHub Actions

Update your `.github/workflows` deployment to pass the secret:

```yaml
- name: Deploy Infrastructure
  run: |
    az deployment group create \
      --resource-group ${{ vars.RESOURCE_GROUP_NAME }} \
      --template-file ./infra/main.bicep \
      --parameters ./infra/main.dev.bicepparam \
      --parameters azureAdClientSecret=${{ secrets.AZURE_AD_CLIENT_SECRET }}
```

### For Manual Deployment (PowerShell)

```powershell
# Deploy with secure parameter
$clientSecret = Read-Host -Prompt "Enter Azure AD Client Secret" -AsSecureString

az deployment group create `
  --resource-group rg-somos-tech-dev `
  --template-file ./infra/main.bicep `
  --parameters ./infra/main.dev.bicepparam `
  --parameters azureAdClientSecret=$clientSecret
```

### For Manual Deployment (Bash)

```bash
# Deploy with secure parameter
read -sp "Enter Azure AD Client Secret: " CLIENT_SECRET
echo

az deployment group create \
  --resource-group rg-somos-tech-dev \
  --template-file ./infra/main.bicep \
  --parameters ./infra/main.dev.bicepparam \
  --parameters azureAdClientSecret=$CLIENT_SECRET
```

## Step 4: Verify Static Web App Configuration

After deployment, verify the settings were applied:

1. Go to Azure Portal
2. Navigate to your Static Web App: `swa-somos-tech-dev-xxxxx`
3. Go to **Configuration**
4. Verify these settings exist:
   - ✅ `VITE_API_URL`
   - ✅ `VITE_ENVIRONMENT`
   - ✅ `AZURE_CLIENT_ID` = `dcf7379e-4576-4544-893f-77d6649390d3`
   - ✅ `AZURE_CLIENT_SECRET` = `***` (hidden)
   - ✅ `AZURE_TENANT_ID` = `cff2ae9c-4810-4a92-a3e8-46e649cbdbe4`
   - ✅ `COSMOS_ENDPOINT`
   - ✅ `COSMOS_DATABASE_NAME`

## Optional: GitHub OAuth

If you want to add GitHub as an alternative login method:

1. Create a GitHub OAuth App (see AUTHENTICATION_SETUP.md)
2. Add the secrets to GitHub:
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`
3. Update deployment to include these parameters:

```bash
--parameters githubClientId=${{ secrets.GITHUB_CLIENT_ID }} \
--parameters githubClientSecret=${{ secrets.GITHUB_CLIENT_SECRET }}
```

## Security Notes

⚠️ **NEVER commit secrets to git**
- Client secrets should only be in GitHub Secrets or Azure Key Vault
- Parameter files with secrets should be in `.gitignore`
- Rotate secrets every 12-24 months

✅ **Best Practices**
- Use separate secrets for dev and prod environments
- Document when secrets expire
- Have a process for rotating secrets before expiration
- Use Azure Key Vault for production secrets (advanced)

## Next Steps

After setting up authentication:
1. Update `staticwebapp.config.json` with your tenant ID (if not already done)
2. Test admin login flow
3. Assign admin roles to users
4. Test member registration flow

See `AUTHENTICATION_SETUP.md` for full authentication setup guide.
