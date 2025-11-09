# GitHub Secrets Setup for Authentication

## Problem
GitHub Actions deployments are overwriting Azure Static Web App settings, removing the EXTERNAL_* authentication credentials and breaking login functionality.

## Solution
Add the authentication credentials as GitHub Secrets so they persist across deployments.

## Required GitHub Secrets

Go to: `https://github.com/somos-tech/somos-tech-v2/settings/secrets/actions`

Add the following secrets:

### 1. EXTERNAL_TENANT_ID
```
ea315caf-5fa1-4348-a3f8-e50867ae19d4
```

### 2. EXTERNAL_ADMIN_CLIENT_ID
```
6b4bc52b-d4e0-494e-9c15-2789161dd933
```

### 3. EXTERNAL_ADMIN_CLIENT_SECRET
```
<Get from Azure Portal - see instructions below>
```

### 4. EXTERNAL_MEMBER_CLIENT_ID
```
2be101c5-90d9-4764-b30c-0ba3fa3b4a27
```

### 5. EXTERNAL_MEMBER_CLIENT_SECRET
```
<Get from Azure Portal - see instructions below>
```

## How to Get the Secrets

### Admin Secret (EXTERNAL_ADMIN_CLIENT_SECRET)
1. Go to Azure Portal → Azure Active Directory
2. App Registrations → Find app ID: `6b4bc52b-d4e0-494e-9c15-2789161dd933`
3. Certificates & secrets → Copy the client secret value

### Member Secret (EXTERNAL_MEMBER_CLIENT_SECRET)  
1. Go to Azure Portal → External ID (somostechus tenant)
2. App Registrations → Find app ID: `2be101c5-90d9-4764-b30c-0ba3fa3b4a27`
3. Certificates & secrets → Copy the client secret value

## Steps to Add Secrets

1. Go to repository Settings → Secrets and variables → Actions
2. Click "New repository secret" for each secret above
3. Enter the name (e.g., `EXTERNAL_TENANT_ID`)
4. Paste the value
5. Click "Add secret"
6. Repeat for all 5 secrets

## Verification

After adding secrets and the next deployment:

```bash
# Test admin login
curl -I https://dev.somos.tech/.auth/login/aad
# Should return: HTTP/1.1 302 Found
# Location should redirect to Azure AD

# Test member login
curl -I https://dev.somos.tech/.auth/login/member
# Should return: HTTP/1.1 302 Found
# Location should redirect to External ID CIAM
```

## Why This Happened

The `deploy-static-web-app.yml` workflow was updated to include these environment variables, but the secrets weren't added to GitHub. During deployment, the Static Web Apps action uses the `env` variables, and missing secrets result in empty/null values, which removes the authentication configuration.

## Files Updated

- `.github/workflows/deploy-static-web-app.yml` - Added EXTERNAL_* env variables to dev deployment step
