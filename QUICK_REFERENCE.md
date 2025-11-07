# 🚀 Quick Reference - MSAL Implementation

## 📦 Packages Installed

### Frontend
```bash
npm install @azure/msal-react @azure/msal-browser
```

### Backend
```bash
npm install jsonwebtoken jwks-rsa @azure/msal-node
```

## 🔑 Environment Variables

### Frontend `.env.local`
```env
VITE_AZURE_CLIENT_ID=your-client-id
VITE_AZURE_TENANT_ID=your-tenant-id
VITE_REDIRECT_URI=http://localhost:5173
VITE_API_URL=http://localhost:7071
```

### Backend `local.settings.json`
```json
{
  "Values": {
    "AZURE_CLIENT_ID": "your-client-id",
    "AZURE_TENANT_ID": "your-tenant-id",
    "AZURE_CLIENT_SECRET": "your-client-secret"
  }
}
```

## 💻 Code Snippets

### Frontend - Get Current User
```typescript
import { useAuth } from '@/hooks/useAuth';

function MyComponent() {
  const { user, isAuthenticated, isAdmin, isLoading } = useAuth();

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Please login</div>;

  return <div>Hello {user.userDetails}</div>;
}
```

### Frontend - Get Access Token
```typescript
import { useMsal } from '@azure/msal-react';
import { getAccessToken } from '@/utils/tokenUtils';

function MyComponent() {
  const { instance } = useMsal();

  const handleApiCall = async () => {
    const token = await getAccessToken(instance);

    fetch('/api/endpoint', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
  };
}
```

### Frontend - Protected API Call (Automatic)
```typescript
import eventService from '@/api/eventService';

// Token is automatically attached!
const events = await eventService.getEvents();
```

### Backend - Validate Token
```javascript
import { validateToken, isAdmin } from '../shared/authMiddleware.js';

app.http('MyEndpoint', {
  handler: async (request, context) => {
    const { isValid, user, error } = await validateToken(request);

    if (!isValid) {
      return { status: 401, body: 'Unauthorized' };
    }

    // User is authenticated
    console.log(user.email, user.roles);

    if (isAdmin(user)) {
      // Admin-only logic
    }
  }
});
```

### Backend - OBO Flow (Call Microsoft Graph)
```javascript
import { validateToken, getOboToken } from '../shared/authMiddleware.js';

app.http('CallGraph', {
  handler: async (request, context) => {
    const { isValid, user } = await validateToken(request);

    if (!isValid) {
      return { status: 401, body: 'Unauthorized' };
    }

    // Get user's token
    const userToken = request.headers.get('authorization').substring(7);

    // Exchange for Graph token
    const graphToken = await getOboToken(
      userToken,
      ['https://graph.microsoft.com/.default']
    );

    // Call Graph API
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { 'Authorization': `Bearer ${graphToken}` }
    });

    const data = await response.json();
    return { status: 200, body: JSON.stringify(data) };
  }
});
```

## 🎯 Common Patterns

### Check if User is Admin
```typescript
// Frontend
const { isAdmin } = useAuth();
if (isAdmin) {
  // Show admin UI
}

// Backend
import { isAdmin } from '../shared/authMiddleware.js';
if (isAdmin(user)) {
  // Admin logic
}
```

### Require Admin Role
```typescript
// Frontend - Route protection
<Route
  path="/admin"
  element={
    <ProtectedRoute requireAdmin={true}>
      <AdminPage />
    </ProtectedRoute>
  }
/>

// Backend - Endpoint protection
const { isValid, user } = await validateToken(request);
if (!isValid) return { status: 401 };
if (!isAdmin(user)) return { status: 403, body: 'Forbidden' };
```

### Call Custom Downstream API
```javascript
// Backend
const customApiToken = await getOboToken(
  userToken,
  ['api://custom-api-client-id/.default']
);

const response = await fetch('https://custom-api.com/endpoint', {
  headers: { 'Authorization': `Bearer ${customApiToken}` }
});
```

## 🔍 Debugging

### Check if MSAL is Active
```typescript
// Frontend console
const { instance, accounts } = useMsal();
console.log('Accounts:', accounts);
console.log('Active account:', instance.getActiveAccount());
```

### View Token Contents
```typescript
// Frontend - decode ID token (don't use for security!)
const { accounts } = useMsal();
console.log('ID Token Claims:', accounts[0]?.idTokenClaims);
```

### Backend Token Validation Logs
```javascript
// Set detailed logging in authMiddleware.js
console.log('Validating token:', token.substring(0, 50) + '...');
console.log('Decoded user:', user);
```

## 🚨 Common Issues

### Issue: "No accounts found"
**Solution:** User not logged in. Call `instance.loginRedirect()`

### Issue: "Token expired"
**Solution:** MSAL handles refresh automatically. Force refresh:
```typescript
const response = await instance.acquireTokenSilent({
  ...apiRequest,
  account: accounts[0],
  forceRefresh: true
});
```

### Issue: "OBO flow fails"
**Solutions:**
- Check client secret is correct
- Verify API permissions are granted
- Ensure "Expose an API" is configured
- User may need to re-consent

### Issue: "CORS error"
**Solution:** Update Function App CORS:
```json
{
  "Host": {
    "CORS": "http://localhost:5173"
  }
}
```

## 📚 Documentation Links

- [MSAL.js](https://github.com/AzureAD/microsoft-authentication-library-for-js)
- [OBO Flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-on-behalf-of-flow)
- [Azure AD Tokens](https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens)
- [Microsoft Graph](https://learn.microsoft.com/en-us/graph/overview)

## 🎉 What You Accomplished

✅ Switched from built-in auth to MSAL
✅ Can acquire access tokens in frontend
✅ Backend validates JWT tokens
✅ Can call Microsoft Graph on behalf of user
✅ Can chain multiple API calls with OBO
✅ Role-based access control working
✅ Development mode with mock auth

**You're ready to build secure, token-based applications!** 🚀
