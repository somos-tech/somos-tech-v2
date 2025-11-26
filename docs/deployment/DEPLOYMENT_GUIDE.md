# Deployment Guide - Security Fixes

## Overview
This guide covers deploying the security fixes to production. Follow these steps carefully to ensure proper authentication and authorization controls are in place. The latest hardening requires all traffic to flow through an Azure Front Door Standard profile with a geo-filtering WAF policy so that only traffic from the United States, Canada, Mexico, and the United Kingdom reaches the Static Web App. The profile ($35/mo list price) plus one custom rule ($1/mo) keeps the monthly spend below the $40 cap while still enforcing regional compliance.

## Current Deployment Status

### ✅ Development Environment (dev.somos.tech)
- **Status**: Fully deployed and operational
- **Front Door**: `fd-somos-tech` (shared across dev/prod)
- **Custom Domain**: dev.somos.tech
- **SSL Certificate**: Azure-managed certificate (auto-provisioned)
- **WAF Policy**: `devwafpolicy` with geo-allowlist (US, CA, MX, UK)
- **Static Web App**: `swa-somos-tech-dev-64qb73pzvgekw`
- **Storage Account**: `stsomostechdev64qb73pzvg` (media uploads)
- **Origin Protection**: Custom domain removed from SWA (forces traffic through Front Door)

### ⏳ Production Environment (somos.tech)
- **Status**: PENDING - Not yet configured
- **Front Door**: Will use same `fd-somos-tech` profile (cost-effective)
- **Custom Domain**: somos.tech (to be configured)
- **SSL Certificate**: Azure-managed certificate (will be auto-provisioned)
- **WAF Policy**: Will share `devwafpolicy` or create `prodwafpolicy`
- **Static Web App**: Existing production SWA
- **Next Steps**: See "Production Deployment" section below

## Pre-Deployment Checklist

### 1. Verify Azure Configuration

#### Azure AD App Registration
- [ ] App registration exists: "SOMOS.tech Admin Portal"
- [ ] Redirect URI configured: `https://<your-swa>.azurestaticapps.net/.auth/login/aad/callback`
- [ ] ID tokens enabled under Authentication
- [ ] Client secret created and noted (expires in 24 months)
- [ ] API permissions granted: openid, profile, email

#### GitHub Secrets
- [ ] `AZURE_STATIC_WEB_APPS_API_TOKEN` - Static Web App deployment token
- [ ] `AZURE_CREDENTIALS` - Service principal for Function App deployment
- [ ] `AZURE_AD_CLIENT_SECRET` - Azure AD client secret

#### GitHub Variables
- [ ] `VITE_API_URL` - Function App URL
- [ ] `VITE_ENVIRONMENT` - production
- [ ] `AZURE_FUNCTIONAPP_NAME` - Function App name
- [ ] `AZURE_SUBSCRIPTION_ID` - Subscription ID
- [ ] `RESOURCE_GROUP_NAME` - Resource group name

### 2. Update Configuration Files

#### Static Web App Configuration
In `apps/web/staticwebapp.config.json`:
```json
{
  "auth": {
    "identityProviders": {
      "azureActiveDirectory": {
        "registration": {
          "openIdIssuer": "https://login.microsoftonline.com/<YOUR-TENANT-ID>/v2.0",
          "clientIdSettingName": "AZURE_CLIENT_ID",
          "clientSecretSettingName": "AZURE_CLIENT_SECRET"
        }
      }
    }
  }
}
```

Replace `<YOUR-TENANT-ID>` with your actual Azure AD tenant ID.

### 3. Azure Front Door Configuration

#### Front Door Setup (Development - COMPLETED ✅)
The development environment now uses Azure Front Door Standard with:

1. **Profile**: `fd-somos-tech` (Standard_AzureFrontDoor SKU)
2. **Endpoint**: `fd-somostech-ehgfhqcpa2bka7dt.z02.azurefd.net`
3. **Custom Domain**: `dev.somos.tech`
   - DNS: CNAME → `fd-somostech-ehgfhqcpa2bka7dt.z02.azurefd.net`
   - SSL: Azure-managed certificate (auto-renewed)
4. **Origin**: Static Web App default hostname
5. **Route**: `default-route` with HTTPS redirect enabled
6. **WAF Policy**: `devwafpolicy` in Prevention mode
  - Custom Rule: `BlockAnonymousNetworks` (GeoMatch allow-list permitting only US, CA, MX, UK)
  - Priority: 100
  - Action: Block with 403 Forbidden

**Verifying Front Door Traffic:**
```powershell
curl -I https://dev.somos.tech | Select-String "x-azure-ref"
```
The `x-azure-ref` header is only added by Azure Front Door.

#### Production Front Door Setup (PENDING ⏳)
To add production endpoint to the same Front Door profile (cost-effective):

1. **Add Custom Domain**:
   ```powershell
   az afd custom-domain create `
     --resource-group rg-somos-tech-dev `
     --profile-name fd-somos-tech `
     --custom-domain-name somos-tech `
     --host-name somos.tech `
     --certificate-type ManagedCertificate
   ```

2. **Configure DNS** in Cloudflare:
   ```
   Type: CNAME
   Name: @
   Target: fd-somostech-ehgfhqcpa2bka7dt.z02.azurefd.net
   ```

3. **Wait for domain validation** (5-10 minutes)

4. **Update route** to include production domain

5. **Remove custom domain** from production Static Web App

See `scripts/setup-frontdoor-domain.ps1` for automation.

#### Function App Environment Variables
Set these in Azure Portal → Function App → Configuration:
- `COSMOS_ENDPOINT` - Cosmos DB endpoint URL
- `COSMOS_DATABASE_NAME` - somostech
- `ALLOWED_ADMIN_DOMAIN` - somos.tech
- `AZURE_STORAGE_CONNECTION_STRING` - Storage account connection string
- `AZURE_STORAGE_ACCOUNT_NAME` - stsomostechdev64qb73pzvg

#### Static Web App Environment Variables
Set these via Azure CLI or Portal → Static Web App → Configuration:
- `AZURE_STORAGE_CONNECTION_STRING` - Storage account connection string
- `AZURE_STORAGE_ACCOUNT_NAME` - stsomostechdev64qb73pzvg
- `EXTERNAL_TENANT_ID` - Azure AD tenant ID
- `EXTERNAL_ADMIN_CLIENT_ID` - Admin portal app registration
- `EXTERNAL_ADMIN_CLIENT_SECRET` - Admin portal secret
- `EXTERNAL_MEMBER_CLIENT_ID` - Member portal app registration
- `EXTERNAL_MEMBER_CLIENT_SECRET` - Member portal secret

### 3. Build Verification

```bash
# Test web build
cd apps/web
npm install
npm run build

# Verify no errors
# Should output: ✓ built in X.XXs

# Test TypeScript compilation
npm run lint
```

## Deployment Steps

### Option 1: GitHub Actions (Recommended)

1. **Merge Security Fixes**
   ```bash
   git checkout main
   git merge copilot/security-review-authentication-issues
   git push origin main
   ```

2. **Trigger Deployments**
   - Frontend deployment will trigger automatically (push to main with web changes)
   - API deployment will trigger automatically (push to main with api changes)
   - Monitor in GitHub Actions tab

3. **Verify Deployments**
   - Check GitHub Actions for successful completion
   - Verify no errors in deployment logs

### Option 2: Manual Deployment

#### Deploy Azure Front Door + Geo WAF (Bicep)
```bash
# Ensure you are using the dev/prod parameter file you intend to deploy
az deployment group create \
  --resource-group <rg-name> \
  --template-file infra/main.bicep \
  --parameters @infra/main.dev.bicepparam \
  --parameters frontDoorAllowedCountries:='["US"]'

# Outputs now include frontDoorEndpointHostName so you can update DNS (e.g., dev.somos.tech)
```
- SKU is locked to `Standard_AzureFrontDoor` (currently $35/mo list) to meet the cost target.
- The WAF policy includes one custom rule (`BlockNonUS`), adding ~$1/mo.
- Update your DNS CNAME (e.g., `dev.somos.tech`) to the new Front Door host shown in the deployment output.

#### Deploy Function App
```bash
cd apps/api
npm install

# Get Function App name from Azure
FUNC_NAME=$(az deployment group show \
  --resource-group rg-somos-tech-prod \
  --name main \
  --query properties.outputs.functionAppName.value \
  --output tsv)

# Deploy
func azure functionapp publish $FUNC_NAME
```

#### Deploy Static Web App
```bash
cd apps/web
npm install
npm run build

# Deploy using SWA CLI or GitHub Actions
```

## Post-Deployment Verification

### 1. Test Authentication Flow

#### Test Unauthenticated Access
```bash
# Should return 401
curl -X GET https://<func-app>.azurewebsites.net/api/events
# Expected: {"error": "Authentication required"}

# Should redirect to login
curl -I https://<swa>.azurestaticapps.net/admin
# Expected: 302 redirect to /.auth/login/aad
```

#### Test Admin Access
1. Navigate to `https://<swa>.azurestaticapps.net/admin/events`
2. Should redirect to Microsoft login
3. Sign in with admin account (@somos.tech email)
4. Should successfully load admin dashboard
5. Verify events are displayed

#### Test Non-Admin Access
1. Sign in with non-admin account (if available)
2. Try to access `/admin/events`
3. Should redirect to `/unauthorized`
4. Verify proper error message

### 2. Test API Authorization

#### Test With Valid Admin
```bash
# Get auth token by signing in through browser
# Then test API calls (they should work via SWA proxy)

# Via browser console:
fetch('/api/events', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Test Event',
    date: '2025-12-01'
  })
})
```

#### Test Direct API Access (Should Fail)
```bash
# Direct access should return 401
curl -X POST https://<func-app>.azurewebsites.net/api/events \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","date":"2025-12-01"}'

# Expected: {"error": "Authentication required"}
```

### 3. Test Rate Limiting

```bash
# Try registration 4 times in quick succession
for i in {1..4}; do
  curl -X POST https://<swa>.azurestaticapps.net/api/register \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"test$i@example.com\",\"firstName\":\"Test\",\"lastName\":\"User\"}"
  echo ""
done

# 4th attempt should return 429
# Expected: {"error": "Too many requests", "retryAfter": 3600}
```

### 4. Verify Audit Logging

```bash
# Check Application Insights for logs
az monitor app-insights query \
  --app <app-insights-name> \
  --analytics-query "traces | where message contains 'auth_event' | take 10"
```

Or in Azure Portal:
1. Go to Application Insights
2. Click "Logs"
3. Run query:
   ```kusto
   traces
   | where message contains "auth_event"
   | order by timestamp desc
   | take 20
   ```

### 5. Verify Security Headers
### 6. Validate Azure Front Door Enforcement
1. Browse to `https://<frontdoor-endpoint>.azurefd.net` from a US IP (or VPN) and confirm the site renders normally.
2. Test from a non-US IP (or use an external service such as vpn/GeoPeeker). Requests should return the custom WAF block page (HTTP 403) with the "Access restricted" message.
3. Confirm that direct SWA access is no longer exposed publicly by pointing client DNS to Front Door only.
4. Review the WAF metrics blade to ensure requests are flowing through the `BlockNonUS` rule and that only US traffic is allowed.


```bash
# Check response headers
curl -I https://<swa>.azurestaticapps.net/

# Should include:
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# X-XSS-Protection: 1; mode=block
# Referrer-Policy: strict-origin-when-cross-origin
```

## Rollback Procedure

If issues are found:

### Quick Rollback
```bash
# Revert the merge
git revert HEAD
git push origin main

# Or reset to previous commit
git reset --hard <previous-commit-sha>
git push origin main --force
```

### Manual Rollback
1. Go to Azure Portal → Static Web App → Deployments
2. Find previous successful deployment
3. Click "Redeploy"

## Monitoring Setup

### Set Up Alerts

1. **Failed Authentication Alert**
   ```
   Name: High Failed Auth Rate
   Query: traces | where message contains "auth_event" and customDimensions.allowed == false
   Threshold: Count > 10 in 1 hour
   ```

2. **Rate Limit Alert**
   ```
   Name: Rate Limit Violations
   Query: traces | where message contains "Rate limit exceeded"
   Threshold: Count > 50 in 1 hour
   ```

3. **Admin Operations Alert**
   ```
   Name: Admin Operations Outside Hours
   Query: traces | where message contains "DELETE_EVENT" or message contains "DELETE_GROUP"
   Time: Outside business hours (7pm - 7am)
   ```

### Dashboard Setup

Create Application Insights dashboard with:
- Authentication success/failure rate
- API request distribution by endpoint
- Rate limit violations over time
- Admin operations timeline
- Error rate by status code

## Troubleshooting

### Issue: Users Can't Sign In
**Check**:
1. Azure AD app registration redirect URI matches exactly
2. Client ID and secret are set in Static Web App configuration
3. Tenant ID is correct in staticwebapp.config.json

**Fix**:
```bash
# Verify settings
az staticwebapp appsettings list \
  --name <swa-name> \
  --resource-group <rg-name>

# Should show AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_TENANT_ID
```

### Issue: Admin Dashboard Returns 403
**Check**:
1. User has admin role assigned
2. GetUserRoles function is working
3. User email domain is somos.tech

**Fix**:
1. Go to Azure Portal → Static Web App → Role Management
2. Add user with admin role
3. Or check GetUserRoles function logs

### Issue: API Returns 401
**Check**:
1. Request is going through Static Web App (not direct to Function App)
2. User is authenticated
3. x-ms-client-principal header is present

**Verify**:
```javascript
// In browser console
fetch('/.auth/me')
  .then(r => r.json())
  .then(d => console.log(d))
// Should show clientPrincipal with userRoles
```

### Issue: Rate Limiting Not Working
**Check**:
1. Function App has sufficient memory
2. In-memory rate limiter is instantiated
3. IP address extraction is working

**Note**: For production with multiple instances, upgrade to Redis-based rate limiting.

## Security Hardening (Optional)

### Enable Network Isolation
```bash
# Create Virtual Network
az network vnet create \
  --name vnet-somos-tech \
  --resource-group <rg-name> \
  --address-prefix 10.0.0.0/16

# Enable Private Link for Function App
az functionapp vnet-integration add \
  --name <func-app-name> \
  --resource-group <rg-name> \
  --vnet vnet-somos-tech \
  --subnet default
```

### Add IP Restrictions
```bash
# Restrict Function App to Static Web App only
az functionapp config access-restriction add \
  --name <func-app-name> \
  --resource-group <rg-name> \
  --rule-name "Allow-SWA-Only" \
  --action Allow \
  --ip-address <swa-outbound-ip>/32 \
  --priority 100
```

## Success Criteria

Deployment is successful if:
- [x] Users can sign in with Azure AD
- [x] Admin users can access `/admin/*` routes
- [x] Non-admin users get 403 on admin routes
- [x] Direct API access returns 401
- [x] API calls through SWA work correctly
- [x] Rate limiting blocks excessive requests
- [x] Audit logs appear in Application Insights
- [x] Security headers are present
- [x] No CodeQL vulnerabilities
- [x] Build completes without errors
- [x] Media uploads work from member dashboard
- [x] Admin media portal accessible at `/admin/media`
- [x] Storage account CORS configured correctly

## Support

If you encounter issues:
1. Check Application Insights logs
2. Review GitHub Actions deployment logs
3. Verify all environment variables are set
4. Test authentication flow step by step
5. Contact security team if breach suspected

---

**Deployment Date**: _______________  
**Deployed By**: _______________  
**Verified By**: _______________  
**Sign-off**: _______________
