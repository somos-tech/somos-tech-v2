# 🔐 Authentication Flow Architecture

## Complete MSAL + OBO Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           AUTHENTICATION FLOW                            │
└─────────────────────────────────────────────────────────────────────────┘

1️⃣  USER VISITS APP
    │
    ├─> React App loads with MsalProvider
    │   (main.tsx wraps App with MsalProvider)
    │
    └─> useAuth hook checks authentication status
        ├─> Not authenticated → Redirect to Microsoft login
        └─> Authenticated → Load user info & roles


2️⃣  USER LOGS IN
    │
    ├─> Microsoft login page
    │   └─> User enters credentials
    │       └─> Azure AD validates
    │
    └─> Redirect back to app with tokens
        ├─> Access Token (for calling APIs)
        ├─> ID Token (user identity)
        └─> Refresh Token (get new tokens)


3️⃣  FRONTEND CALLS BACKEND API
    │
    React Component
        │
        └─> eventService.getEvents()
            │
            └─> getAuthHeaders()
                ├─> getAccessToken(msalInstance)
                │   ├─> Try acquireTokenSilent() ✅ Fast, uses cache
                │   └─> If fails → acquireTokenPopup() ⚠️  User interaction
                │
                └─> Attach to request header
                    └─> Authorization: Bearer <access-token>


4️⃣  BACKEND VALIDATES TOKEN
    │
    Azure Function receives request
        │
        └─> validateToken(request)
            │
            ├─> Extract token from Authorization header
            │
            ├─> Get signing keys from Azure AD
            │   └─> https://login.microsoftonline.com/{tenant}/discovery/v2.0/keys
            │
            ├─> Verify JWT signature with jwks-rsa
            │   ├─> Check signature (RS256)
            │   ├─> Check audience (your client ID)
            │   ├─> Check issuer (Azure AD)
            │   └─> Check expiration
            │
            └─> Return user info
                ├─> userId (oid/sub)
                ├─> email (preferred_username)
                ├─> roles (from token claims)
                └─> name


5️⃣  BACKEND CALLS DOWNSTREAM SERVICE (OBO)
    │
    Azure Function needs to call Microsoft Graph
        │
        └─> getOboToken(userToken, scopes)
            │
            ├─> Use user's access token
            │
            ├─> Call Azure AD token endpoint
            │   POST https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token
            │   {
            │     grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            │     client_id: "your-backend-client-id",
            │     client_secret: "your-backend-secret",
            │     assertion: "user-access-token",
            │     requested_token_use: "on_behalf_of",
            │     scope: "https://graph.microsoft.com/.default"
            │   }
            │
            └─> Receive new token for Graph API
                └─> Authorization: Bearer <graph-token>
                    │
                    └─> Call Microsoft Graph
                        └─> GET https://graph.microsoft.com/v1.0/me


┌─────────────────────────────────────────────────────────────────────────┐
│                           TOKEN FLOW DIAGRAM                             │
└─────────────────────────────────────────────────────────────────────────┘

    USER              FRONTEND           AZURE AD         BACKEND          MS GRAPH
     │                   │                   │               │                │
     │  1. Visit App     │                   │               │                │
     ├──────────────────>│                   │               │                │
     │                   │                   │               │                │
     │                   │  2. Login Request │               │                │
     │                   ├──────────────────>│               │                │
     │                   │                   │               │                │
     │  3. Enter Creds   │                   │               │                │
     ├──────────────────>│──────────────────>│               │                │
     │                   │                   │               │                │
     │                   │  4. Tokens        │               │                │
     │                   │<──────────────────┤               │                │
     │                   │                   │               │                │
     │  5. Logged In     │                   │               │                │
     │<──────────────────┤                   │               │                │
     │                   │                   │               │                │
     │  6. Call API      │                   │               │                │
     ├──────────────────>│                   │               │                │
     │                   │                   │               │                │
     │                   │  7. API + Token   │               │                │
     │                   ├───────────────────┼──────────────>│                │
     │                   │                   │               │                │
     │                   │                   │  8. Validate  │                │
     │                   │                   │<──────────────┤                │
     │                   │                   │  9. Valid ✅   │                │
     │                   │                   ├──────────────>│                │
     │                   │                   │               │                │
     │                   │                   │ 10. OBO Token │                │
     │                   │                   │    Request    │                │
     │                   │                   │<──────────────┤                │
     │                   │                   │ 11. Graph Token                │
     │                   │                   ├──────────────>│                │
     │                   │                   │               │                │
     │                   │                   │               │ 12. Call Graph │
     │                   │                   │               ├───────────────>│
     │                   │                   │               │                │
     │                   │                   │               │ 13. User Data  │
     │                   │                   │               │<───────────────┤
     │                   │                   │               │                │
     │                   │  14. Response     │               │                │
     │                   │<──────────────────┼───────────────┤                │
     │  15. Display Data │                   │               │                │
     │<──────────────────┤                   │               │                │
     │                   │                   │               │                │


┌─────────────────────────────────────────────────────────────────────────┐
│                        TOKEN CONTENTS EXAMPLE                            │
└─────────────────────────────────────────────────────────────────────────┘

ACCESS TOKEN (sent to your backend):
{
  "aud": "api://your-client-id",           // Your app
  "iss": "https://login.microsoftonline.com/{tenant}/v2.0",
  "iat": 1635724800,                        // Issued at
  "exp": 1635728400,                        // Expires at
  "oid": "00000000-0000-0000-0000-000000000000",  // User ID
  "preferred_username": "user@domain.com",
  "roles": ["admin"],                       // User roles
  "scp": "access_as_user",                  // Scopes
  "tid": "tenant-id"                        // Tenant ID
}

ID TOKEN (user identity):
{
  "aud": "your-client-id",
  "iss": "https://login.microsoftonline.com/{tenant}/v2.0",
  "name": "John Doe",
  "preferred_username": "john@domain.com",
  "oid": "user-object-id",
  "roles": ["admin"]
}


┌─────────────────────────────────────────────────────────────────────────┐
│                           FILE STRUCTURE                                 │
└─────────────────────────────────────────────────────────────────────────┘

FRONTEND (React)
├── main.tsx
│   └── <MsalProvider instance={msalInstance}>
│       └── <App />
│
├── App.tsx
│   ├── useMsal() → instance
│   └── eventService.setMsalInstance(instance)
│
├── hooks/useAuth.ts
│   ├── useMsal()
│   ├── useIsAuthenticated()
│   └── Returns: { user, isAuthenticated, isAdmin, isLoading }
│
├── components/ProtectedRoute.tsx
│   ├── useAuth()
│   └── instance.loginRedirect() if not authenticated
│
├── config/msalConfig.ts
│   ├── Configuration (clientId, authority, redirectUri)
│   └── Scopes (loginRequest, apiRequest, graphRequest)
│
├── utils/tokenUtils.ts
│   ├── getAccessToken(instance) → token
│   ├── getUserRoles(instance) → roles[]
│   └── isUserAdmin(instance) → boolean
│
└── api/eventService.ts
    ├── setMsalInstance(instance)
    ├── getAuthHeaders() → adds Bearer token
    └── All methods automatically include auth

BACKEND (Azure Functions)
├── shared/authMiddleware.js
│   ├── validateToken(request) → { isValid, user, error }
│   ├── isAdmin(user) → boolean
│   ├── getAccessToken(request) → token string
│   └── getOboToken(userToken, scopes) → downstream token
│
├── functions/events.js
│   └── Your existing functions (can be updated)
│
├── functions/exampleProtected.js
│   ├── GetUserProfile (validates token)
│   ├── AdminOnlyEndpoint (checks admin role)
│   └── GetUserGroups (uses OBO for Graph)
│
└── functions/oboExamples.js
    ├── GetUserCalendar (Graph API)
    ├── CallCustomAPI (custom downstream service)
    └── UpdateUserProfile (Graph API write)


┌─────────────────────────────────────────────────────────────────────────┐
│                        SECURITY CHECKLIST                                │
└─────────────────────────────────────────────────────────────────────────┘

✅ Token Validation
   ├─ Verify signature with Azure AD public keys
   ├─ Check audience matches your client ID
   ├─ Check issuer is Azure AD
   ├─ Check expiration (exp claim)
   └─ Use jwks-rsa for key caching

✅ HTTPS Only in Production
   └─ Never send tokens over HTTP

✅ Secure Token Storage
   ├─ Frontend: localStorage (or sessionStorage for more security)
   └─ Backend: Never store tokens, validate per request

✅ Client Secret Protection
   ├─ Never commit to source control
   ├─ Use Azure Key Vault in production
   └─ Rotate regularly

✅ CORS Configuration
   └─ Restrict to your domain only

✅ Minimal Scopes
   └─ Request only permissions you need

✅ Role-Based Access Control
   └─ Check roles from validated token, not client input
