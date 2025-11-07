# MSAL Authentication Setup Guide

## What Changed?

You've switched from **Azure Static Web Apps built-in authentication** to **MSAL (Microsoft Authentication Library)** to enable:
- ✅ Access tokens for On-Behalf-Of (OBO) flows
- ✅ Token-based authentication with Azure Functions
- ✅ Calling downstream services (Microsoft Graph, custom APIs, etc.)
- ✅ Better control over authentication flow

## Prerequisites

You need an **Azure AD App Registration** with the following:

### 1. Create App Registration in Azure Portal

1. Go to [Azure Portal](https://portal.azure.com) → Azure Active Directory → App registrations
2. Click "New registration"
3. Fill in:
   - **Name**: `Somos Tech App`
   - **Supported account types**: Single tenant (or your preference)
   - **Redirect URI**:
     - Platform: Single-page application (SPA)
     - URI: `http://localhost:5173` (for dev)
     - Add production URI later: `https://your-domain.com`

### 2. Configure API Permissions

1. In your App Registration → **API Permissions**
2. Add these permissions:
   - `User.Read` (Microsoft Graph) - Delegated
   - `User.ReadBasic.All` (Microsoft Graph) - Delegated (if needed)
3. Click "Grant admin consent"

### 3. Expose an API (for Backend Authentication)

1. In your App Registration → **Expose an API**
2. Click "Set" next to Application ID URI (accept default: `api://{client-id}`)
3. Add a scope:
   - **Scope name**: `access_as_user`
   - **Who can consent**: Admins and users
   - **Admin consent display name**: "Access API as user"
   - **Admin consent description**: "Allows the app to access the API on behalf of the signed-in user"
   - **State**: Enabled

### 4. Create Client Secret (for Backend OBO Flow)

1. In your App Registration → **Certificates & secrets**
2. Click "New client secret"
3. **Description**: "Backend OBO Secret"
4. **Expires**: Choose duration (6 months, 12 months, etc.)
5. **Copy the secret value** - you won't see it again!

### 5. Configure App Roles (for Admin Access)

1. In your App Registration → **App roles**
2. Create role:
   - **Display name**: `Admin`
   - **Allowed member types**: Users/Groups
   - **Value**: `admin`
   - **Description**: "Administrator access"
3. After creating the role, assign users:
   - Go to **Enterprise applications** → Find your app → **Users and groups**
   - Assign users and select the "Admin" role

## Environment Configuration

### Frontend (.env.local)

Create `apps/web/.env.local`:

```env
# Azure AD Configuration
VITE_AZURE_CLIENT_ID=<your-client-id>
VITE_AZURE_TENANT_ID=<your-tenant-id>
VITE_REDIRECT_URI=http://localhost:5173

# API Configuration
VITE_API_URL=http://localhost:7071
VITE_ENVIRONMENT=development
```

**Get values from Azure Portal:**
- `VITE_AZURE_CLIENT_ID`: App Registration → Overview → Application (client) ID
- `VITE_AZURE_TENANT_ID`: App Registration → Overview → Directory (tenant) ID

### Backend (local.settings.json)

Update `apps/api/local.settings.json`:

```json
{
  "Values": {
    "AZURE_CLIENT_ID": "<your-client-id>",
    "AZURE_TENANT_ID": "<your-tenant-id>",
    "AZURE_CLIENT_SECRET": "<your-client-secret>",
    // ... other settings
  }
}
```

## How to Use

### Frontend: Making Authenticated API Calls

The API service automatically attaches tokens to requests:

```typescript
import eventService from '@/api/eventService';

// Token is automatically attached
const events = await eventService.getEvents();
```

### Frontend: Get Access Token Manually

```typescript
import { useMsal } from '@azure/msal-react';
import { getAccessToken } from '@/utils/tokenUtils';

function MyComponent() {
  const { instance } = useMsal();

  const handleApiCall = async () => {
    const token = await getAccessToken(instance);

    const response = await fetch('/api/something', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  };
}
```

### Backend: Validate Tokens

```javascript
import { validateToken, isAdmin } from '../shared/authMiddleware.js';

app.http('ProtectedEndpoint', {
    handler: async (request, context) => {
        // Validate token
        const { isValid, user, error } = await validateToken(request);

        if (!isValid) {
            return errorResponse('Unauthorized: ' + error, 401);
        }

        // Check if admin
        if (isAdmin(user)) {
            // Admin-only logic
        }

        // Use user info
        context.log('User:', user.email, user.roles);
    }
});
```

### Backend: On-Behalf-Of (OBO) Flow

Call Microsoft Graph or other APIs on behalf of the user:

```javascript
import { validateToken, getOboToken } from '../shared/authMiddleware.js';

app.http('CallGraph', {
    handler: async (request, context) => {
        const { isValid, user } = await validateToken(request);

        if (!isValid) {
            return errorResponse('Unauthorized', 401);
        }

        // Get user's token
        const userToken = request.headers.get('authorization').substring(7);

        // Exchange for Graph token
        const graphToken = await getOboToken(
            userToken,
            ['https://graph.microsoft.com/.default']
        );

        // Call Microsoft Graph
        const response = await fetch('https://graph.microsoft.com/v1.0/me', {
            headers: { 'Authorization': `Bearer ${graphToken}` }
        });

        const userData = await response.json();
        return successResponse(userData);
    }
});
```

## Testing

### Development Mode (No Azure AD)

If you don't set `VITE_AZURE_CLIENT_ID`, the app uses mock authentication:
- Always authenticated as `developer@somos.tech`
- Always has admin role
- No actual tokens

### With Azure AD

1. Start backend: `cd apps/api && npm start`
2. Start frontend: `cd apps/web && npm run dev`
3. Navigate to `http://localhost:5173`
4. You'll be redirected to Microsoft login
5. After login, you're redirected back with tokens

## Production Deployment

### Static Web App Configuration

Update `apps/web/staticwebapp.config.json`:

```json
{
  "navigationFallback": {
    "rewrite": "/index.html"
  },
  "mimeTypes": {
    ".json": "application/json"
  }
}
```

Note: Remove any `auth` configuration since we're not using built-in auth anymore.

### Azure Function App Settings

Add these application settings to your Function App:
- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_CLIENT_SECRET`

### Frontend Environment Variables

In Azure Static Web Apps, configure:
- `VITE_AZURE_CLIENT_ID`
- `VITE_AZURE_TENANT_ID`
- `VITE_REDIRECT_URI` (your production URL)
- `VITE_API_URL` (your Function App URL)

## Troubleshooting

### Token Validation Fails

1. Check `AZURE_TENANT_ID` matches your Azure AD tenant
2. Verify `AZURE_CLIENT_ID` in both frontend and backend
3. Ensure app registration has correct redirect URIs

### OBO Flow Fails

1. Verify client secret is correct and not expired
2. Check API permissions are granted
3. Ensure "Expose an API" scope is configured
4. User must consent to the scopes

### CORS Issues

Update Function App CORS settings:
```json
{
  "Host": {
    "CORS": "http://localhost:5173,https://your-production-domain.com"
  }
}
```

## Key Files Modified

### Frontend
- ✅ `src/config/msalConfig.ts` - MSAL configuration
- ✅ `src/utils/tokenUtils.ts` - Token utilities
- ✅ `src/hooks/useAuth.ts` - Auth hook with MSAL
- ✅ `src/components/ProtectedRoute.tsx` - MSAL login redirect
- ✅ `src/api/eventService.ts` - Automatic token attachment
- ✅ `src/main.tsx` - MSAL provider wrapper
- ✅ `src/App.tsx` - MSAL instance injection

### Backend
- ✅ `shared/authMiddleware.js` - Token validation & OBO flow
- ✅ `functions/exampleProtected.js` - Example protected endpoints
- ✅ `local.settings.json` - Azure AD configuration

## Resources

- [MSAL.js Documentation](https://github.com/AzureAD/microsoft-authentication-library-for-js)
- [On-Behalf-Of Flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-on-behalf-of-flow)
- [Azure AD App Registration](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app)
