# Authentication Setup Guide for SOMOS.tech

This guide will help you set up authentication for your Azure Static Web App with admin route protection and member registration.

## Overview

The authentication system includes:
1. **Azure AD (Entra ID)** for admin authentication
2. **GitHub OAuth** as an alternative login method
3. **Member registration** flow for community members
4. **Protected admin routes** requiring admin role
5. **Custom registration API** using Azure Functions + Cosmos DB

## Prerequisites

- Azure Static Web App deployed
- Azure AD (Entra ID) tenant
- Cosmos DB account (for member storage)
- GitHub OAuth app (optional)

## Step 1: Configure Azure AD (Entra ID)

### 1.1 Register Application in Azure AD

1. Go to **Azure Portal** → **Azure Active Directory** → **App registrations**
2. Click **New registration**
3. Fill in:
   - **Name**: `SOMOS.tech Admin Portal`
   - **Supported account types**: `Accounts in this organizational directory only`
   - **Redirect URI**: 
     - Platform: `Web`
     - URI: `https://happy-stone-070acff1e.3.azurestaticapps.net/.auth/login/aad/callback`
4. Click **Register**

### 1.2 Configure Authentication

1. Go to **Authentication** in your app registration
2. Under **Implicit grant and hybrid flows**, enable:
   - ✅ ID tokens
3. Click **Save**

### 1.3 Create Client Secret

1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Add description: `SWA Auth Secret`
4. Choose expiration (recommend 24 months)
5. Click **Add**
6. **COPY THE SECRET VALUE** immediately (you can't see it again!)

### 1.4 Configure API Permissions

1. Go to **API permissions**
2. Ensure these Microsoft Graph permissions are present:
   - `openid` (delegated)
   - `profile` (delegated)
   - `email` (delegated)
3. Click **Grant admin consent** if required

### 1.5 Get Your Tenant ID

1. Go to **Overview** of your app registration
2. Copy the **Directory (tenant) ID**
3. Also copy the **Application (client) ID**

## Step 2: Configure Static Web App Settings

### 2.1 Add Configuration to Azure Portal

1. Go to **Azure Portal** → Your Static Web App
2. Go to **Configuration**
3. Add these Application settings:

```
AZURE_CLIENT_ID=<your-application-client-id>
AZURE_CLIENT_SECRET=<your-client-secret-value>
AZURE_TENANT_ID=<your-tenant-id>
COSMOS_ENDPOINT=<your-cosmos-db-endpoint>
COSMOS_KEY=<your-cosmos-db-key>
```

### 2.2 Update staticwebapp.config.json

Replace `<YOUR_TENANT_ID>` in the config file with your actual tenant ID:

```json
"openIdIssuer": "https://login.microsoftonline.com/YOUR-TENANT-ID/v2.0"
```

## Step 3: Configure GitHub OAuth (Optional)

### 3.1 Create GitHub OAuth App

1. Go to **GitHub** → **Settings** → **Developer settings** → **OAuth Apps**
2. Click **New OAuth App**
3. Fill in:
   - **Application name**: `SOMOS.tech`
   - **Homepage URL**: `https://happy-stone-070acff1e.3.azurestaticapps.net`
   - **Authorization callback URL**: `https://happy-stone-070acff1e.3.azurestaticapps.net/.auth/login/github/callback`
4. Click **Register application**
5. Copy the **Client ID**
6. Generate a **Client Secret** and copy it

### 3.2 Add GitHub Settings

Add to your Static Web App Configuration:

```
GITHUB_CLIENT_ID=<your-github-client-id>
GITHUB_CLIENT_SECRET=<your-github-client-secret>
```

## Step 4: Set Up Cosmos DB for Members

### 4.1 Create Database and Container

1. Go to **Azure Portal** → Your Cosmos DB account
2. Click **Data Explorer** → **New Database**
3. Database ID: `somostech`
4. Click **OK**
5. Click **New Container**:
   - **Database ID**: Use existing `somostech`
   - **Container ID**: `members`
   - **Partition key**: `/email`
   - **Throughput**: 400 RU/s (or Autoscale)
6. Click **OK**

### 4.2 Get Connection Details

1. Go to **Keys** in your Cosmos DB account
2. Copy:
   - **URI** → This is your `COSMOS_ENDPOINT`
   - **PRIMARY KEY** → This is your `COSMOS_KEY`

## Step 5: Assign Admin Roles

### 5.1 In Azure Portal (for Azure AD users)

1. Go to **Static Web App** → **Role management**
2. Click **Invitations**
3. Click **Invite**
4. Fill in:
   - **Domain**: Your Azure AD domain (e.g., `yourtenant.onmicrosoft.com`)
   - **Email**: Admin user's email
   - **Role**: `admin`
   - **Hours until expiration**: 24
5. Send invitation to user
6. User clicks link to accept

### 5.2 Alternative: Use staticwebapp.database.config.json

Create file `staticwebapp.database.config.json`:

```json
{
  "$schema": "https://github.com/Azure/static-web-apps/schemas/latest/invitations.schema.json",
  "roles": {
    "admin": [
      "admin@yourdomain.com",
      "another-admin@yourdomain.com"
    ],
    "member": []
  }
}
```

## Step 6: Testing the Authentication

### 6.1 Test Admin Login

1. Navigate to: `https://happy-stone-070acff1e.3.azurestaticapps.net/admin/events`
2. You should be redirected to Microsoft login
3. Sign in with an admin account
4. After successful login, you should see the admin events page

### 6.2 Test Member Registration

1. Navigate to: `https://happy-stone-070acff1e.3.azurestaticapps.net/register`
2. Fill in the form
3. Submit registration
4. Check Cosmos DB to verify the member was created

### 6.3 Test Unauthorized Access

1. Sign in with a non-admin account
2. Try to access `/admin/events`
3. You should be redirected to the unauthorized page

## Step 7: Deploy Changes

### 7.1 Commit and Push

```bash
git add .
git commit -m "Add authentication and member registration"
git push
```

### 7.2 Verify Deployment

1. GitHub Actions will automatically deploy
2. Check the deployment status in GitHub Actions
3. Once deployed, test all authentication flows

## Authentication Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     User Access Flow                         │
└─────────────────────────────────────────────────────────────┘

Public Pages (/, /register)
    │
    ├─→ Anyone can access
    │
    └─→ Register → API → Cosmos DB
                           │
                           └─→ Email verification (TODO)

Admin Pages (/admin/*)
    │
    ├─→ Check authentication (useAuth hook)
    │   │
    │   ├─→ Not authenticated → Redirect to /.auth/login/aad
    │   │                        │
    │   │                        └─→ Microsoft Sign-In
    │   │                            │
    │   │                            ├─→ Success → Return to page
    │   │                            └─→ Fail → Stay on login
    │   │
    │   └─→ Authenticated → Check role
    │       │
    │       ├─→ Has 'admin' role → Allow access
    │       └─→ No 'admin' role → /unauthorized
    │
    └─→ ProtectedRoute component enforces this
```

## Security Best Practices

1. **Never commit secrets** - Always use Azure App Settings
2. **Use HTTPS only** - Static Web Apps enforce this by default
3. **Implement email verification** - Add SendGrid or Azure Communication Services
4. **Add rate limiting** - Implement in Azure Functions
5. **Monitor failed logins** - Use Application Insights
6. **Regular secret rotation** - Rotate client secrets every 6-12 months
7. **Principle of least privilege** - Only assign admin role to necessary users

## Troubleshooting

### Issue: Redirect loop on admin pages
**Solution**: Check that your Azure AD redirect URI matches exactly: `https://your-site.azurestaticapps.net/.auth/login/aad/callback`

### Issue: "User is not authorized"
**Solution**: Verify user has been assigned the 'admin' role in Role Management

### Issue: Registration API returns 500
**Solution**: Check Cosmos DB connection strings in App Settings

### Issue: Cannot see user info
**Solution**: Ensure API permissions include openid, profile, and email

## Next Steps

1. **Email Verification**: Integrate Azure Communication Services or SendGrid
2. **Password Reset**: Implement self-service password reset
3. **Multi-factor Authentication**: Enable MFA in Azure AD
4. **Audit Logging**: Track admin actions in Cosmos DB
5. **Member Dashboard**: Create member-only pages for community features

## Support

For issues or questions:
- Check Azure Static Web Apps documentation
- Review Application Insights logs
- Contact SOMOS.tech admin team
