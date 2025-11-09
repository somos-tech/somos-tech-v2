# Authentication Debug Findings - November 9, 2025

## Problem
Authentication stopped working after dual-auth configuration changes. Login endpoints return HTML instead of redirecting to identity providers.

## Root Cause
**Missing Azure Static Web App environment variables**

The `staticwebapp.config.json` was updated to use dual authentication with:
- Admin Portal: Azure AD (somos.tech tenant)  
- Member Portal: External ID CIAM

However, the required environment variables were never set in Azure Static Web Apps.

## What's Configured

### staticwebapp.config.json expects:
```json
"azureActiveDirectory": {
  "registration": {
    "clientIdSettingName": "EXTERNAL_ADMIN_CLIENT_ID",
    "clientSecretSettingName": "EXTERNAL_ADMIN_CLIENT_SECRET"
  }
},
"customOpenIdConnectProviders": {
  "member": {
    "registration": {
      "clientIdSettingName": "EXTERNAL_MEMBER_CLIENT_ID",
      "clientSecretSettingName": "EXTERNAL_MEMBER_CLIENT_SECRET"
    }
  }
}
```

### What was actually set:
- `AZURE_CLIENT_ID` (old variable name)
- `AZURE_CLIENT_SECRET` (old variable name)
- `AZURE_TENANT_ID` (old variable name)

### What's needed:
1. **EXTERNAL_ADMIN_CLIENT_ID** - Azure AD app for admin portal
2. **EXTERNAL_ADMIN_CLIENT_SECRET** - Secret for admin app  
3. **EXTERNAL_MEMBER_CLIENT_ID** - External ID CIAM app for members (found in config: `2be101c5-90d9-4764-b30c-0ba3fa3b4a27`)
4. **EXTERNAL_MEMBER_CLIENT_SECRET** - Secret for member app **[NEEDS TO BE PROVIDED]**

## Action Items

### Immediate Fix
Set the correct environment variables in Azure Static Web App:

```bash
# Admin portal (uses existing somos.tech Azure AD)
az staticwebapp appsettings set \
  --name swa-somos-tech-dev-64qb73pzvgekw \
  -g rg-somos-tech-dev \
  --setting-names \
    EXTERNAL_ADMIN_CLIENT_ID="dcf7379e-4576-4544-893f-77d6649390d3" \
    EXTERNAL_ADMIN_CLIENT_SECRET="<ACTUAL_SECRET_FROM_AZURE_AD>"

# Member portal (uses External ID CIAM)  
az staticwebapp appsettings set \
  --name swa-somos-tech-dev-64qb73pzvgekw \
  -g rg-somos-tech-dev \
  --setting-names \
    EXTERNAL_MEMBER_CLIENT_ID="2be101c5-90d9-4764-b30c-0ba3fa3b4a27" \
    EXTERNAL_MEMBER_CLIENT_SECRET="<GET_FROM_EXTERNAL_ID_CIAM>"
```

### Long-term Fix
Update infrastructure code to manage these settings:

1. Update `infra/main.bicep` to accept new parameters
2. Update `infra/main.dev.bicepparam` with values
3. Configure GitHub Secrets:
   - `EXTERNAL_ADMIN_CLIENT_SECRET`
   - `EXTERNAL_MEMBER_CLIENT_SECRET`
4. Update `.github/workflows/deploy-static-web-app.yml` to pass secrets

## How to Get the Secrets

### Admin Secret (EXTERNAL_ADMIN_CLIENT_SECRET)
1. Go to Azure Portal → Azure Active Directory
2. App Registrations → Find app ID: `dcf7379e-4576-4544-893f-77d6649390d3`
3. Certificates & secrets → Create new client secret or retrieve existing

### Member Secret (EXTERNAL_MEMBER_CLIENT_SECRET)  
1. Go to Azure Portal → External ID (somostechus tenant)
2. App Registrations → Find app ID: `2be101c5-90d9-4764-b30c-0ba3fa3b4a27`
3. Certificates & secrets → Create new client secret

## Testing
After setting variables, test:
```bash
curl -I https://dev.somos.tech/.auth/login/aad
# Should redirect to login.microsoftonline.com

curl -I https://dev.somos.tech/.auth/login/member  
# Should redirect to somostechus.ciamlogin.com
```

## Timeline
- **Working**: Before commit f19a208 (Configure member provider to use External ID CIAM)
- **Broken**: After commits f19a208 + e374d56 (dual auth changes)
- **Cause**: Config updated but environment variables not set
