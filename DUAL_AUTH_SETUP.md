# Dual Authentication Flow Configuration

This application now supports two distinct authentication flows:

## 1. Admin Flow (@somos.tech accounts)
- **Route**: `/admin/login`
- **Identity Provider**: Azure Active Directory (AAD)
- **Domain Restriction**: Only `@somos.tech` email addresses
- **Purpose**: Administrative access to the platform
- **Access Level**: Full admin dashboard access

### Required Configuration:
Set these environment variables in your Azure Static Web App:
- `AZURE_CLIENT_ID`: Your Azure AD app registration client ID
- `AZURE_CLIENT_SECRET`: Your Azure AD app registration client secret

## 2. Member Flow (Microsoft/Google External ID)
- **Route**: `/login` or `/register`
- **Identity Provider**: Microsoft External Identities (tenant: ea315caf-5fa1-4348-a3f8-e50867ae19d4)
- **Supported Accounts**: 
  - Microsoft accounts (personal & work)
  - Google accounts
- **Purpose**: Regular user access
- **Access Level**: Member features and profile management
- **Note**: Username/password signup is **not available** - security through trusted identity providers only

### Required Configuration:
Set these environment variables in your Azure Static Web App:
- `EXTERNAL_ID_CLIENT_ID`: Client ID for your External ID app registration in tenant ea315caf-5fa1-4348-a3f8-e50867ae19d4
- `EXTERNAL_ID_CLIENT_SECRET`: Client secret for your External ID app registration

## Key Features

### Authentication Routes
- `/login` - Regular member login (External ID)
- `/admin/login` - Admin login (@somos.tech only)
- `/register` - Member signup (External ID)
- `/profile` - User profile page (all authenticated users)

### Protected Routes
- `/profile` - Requires authentication (any user)
- `/admin/*` - Requires authentication + admin role (@somos.tech)

### Identity Provider Configuration

The `staticwebapp.config.json` file configures both providers:

1. **Azure Active Directory (AAD)** - for admin access
   - Uses common endpoint to support @somos.tech accounts
   - Domain hint applied in login page: `domain_hint=somos.tech`

2. **External ID (Custom OIDC)** - for member access
   - Configured with tenant-specific endpoint: ea315caf-5fa1-4348-a3f8-e50867ae19d4
   - Supports federated Microsoft and Google accounts
   - No username/password option (configured in External ID settings)

## Setup Instructions

### 1. Azure AD App Registration (Admin Flow)
1. Go to Azure Portal → Azure Active Directory → App registrations
2. Create a new app registration for admin access
3. Configure redirect URIs:
   - `https://<your-swa-domain>/.auth/login/aad/callback`
4. Create a client secret
5. Add environment variables to Static Web App

### 2. External ID App Registration (Member Flow)
1. Go to tenant ea315caf-5fa1-4348-a3f8-e50867ae19d4
2. Create app registration for External ID
3. Configure redirect URIs:
   - `https://<your-swa-domain>/.auth/login/externalId/callback`
4. Configure identity providers (Microsoft, Google)
5. Disable username/password signup in External ID settings
6. Create client secret
7. Add environment variables to Static Web App

### 3. Update Static Web App Settings
Add all four environment variables:
```bash
az staticwebapp appsettings set \\
  --name <your-swa-name> \\
  --setting-names \\
    AZURE_CLIENT_ID=<admin-client-id> \\
    AZURE_CLIENT_SECRET=<admin-secret> \\
    EXTERNAL_ID_CLIENT_ID=<external-id-client-id> \\
    EXTERNAL_ID_CLIENT_SECRET=<external-id-secret>
```

## User Experience

### For Admin Staff (@somos.tech)
1. Navigate to `/admin` or `/admin/login`
2. Click "Sign in with Microsoft (somos.tech)"
3. Authenticate with @somos.tech credentials
4. Access admin dashboard

### For Regular Members
1. Navigate to `/register` or `/login`
2. Click "Sign Up/Sign in with Microsoft or Google"
3. Choose Microsoft or Google account
4. Access member features and profile

## Security Notes

- Admin detection is based on email domain (@somos.tech)
- Regular users cannot access admin routes
- Both flows use industry-standard OAuth 2.0/OIDC
- No passwords stored in application
- Authentication handled by Microsoft identity platform
- Profile information accessible to all authenticated users

## File Changes Summary

### New Files
- `apps/web/src/pages/AdminLogin.tsx` - Admin-specific login page
- `apps/web/src/pages/Profile.tsx` - User profile page
- `DUAL_AUTH_SETUP.md` - This configuration guide

### Modified Files
- `apps/web/staticwebapp.config.json` - Added External ID provider configuration
- `apps/web/src/pages/Login.tsx` - Updated to use External ID provider
- `apps/web/src/pages/Register.tsx` - Simplified to redirect to External ID signup
- `apps/web/src/App.tsx` - Added new routes (Profile, AdminLogin)
- `apps/web/src/components/Navigation.tsx` - Added profile link for authenticated users
- `apps/web/src/components/ProtectedRoute.tsx` - Updated to redirect to appropriate login page

## Testing

### Test Admin Flow
1. Navigate to `/admin/login`
2. Should see admin-specific login page
3. Only @somos.tech accounts should work
4. Should redirect to admin dashboard after login

### Test Member Flow
1. Navigate to `/register`
2. Should redirect to External ID signup
3. Should offer Microsoft or Google login (no password option)
4. After signup, should redirect to `/profile`

### Test Profile Access
1. Login as any user (admin or member)
2. Click welcome message in navigation
3. Should navigate to `/profile`
4. Should display user information and account type
