# Security Audit Report - SOMOS.tech Platform

**Date:** November 27, 2025  
**Audit Type:** Security Assessment  
**Scope:** Full Stack Review (Frontend, API, Infrastructure)  
**Status:** AUDIT ONLY - No Changes Made  

---

## Executive Summary

This security audit examines the SOMOS.tech platform, a React/TypeScript frontend with Azure Functions API backend, Azure Cosmos DB, and Azure Static Web Apps infrastructure. The audit identified several security vulnerabilities ranging from Critical to Low severity. Below is a prioritized list of the top 10 security issues with their severity, impact assessment, and implementation considerations.

---

## Top 10 Security Issues

| Rank | Issue | Severity | Impact for Implementation |
|------|-------|----------|---------------------------|
| 1 | [Missing Content-Security-Policy (CSP) Header](#1-missing-content-security-policy-csp-header) | **CRITICAL** | **Medium** - Requires testing all frontend scripts/styles |
| 2 | [Admin Route Publicly Accessible to Anonymous](#2-admin-route-publicly-accessible-to-anonymous) | **CRITICAL** | **Low** - Simple config change in staticwebapp.config.json |
| 3 | [Development Mode Auth Bypass Risk](#3-development-mode-auth-bypass-risk) | **HIGH** | **Medium** - Requires environment variable audit |
| 4 | [Agent API Endpoints Missing Authentication](#4-agent-api-endpoints-missing-authentication) | **HIGH** | **Low** - Add requireAuth middleware call |
| 5 | [In-Memory Rate Limiting Not Persistent](#5-in-memory-rate-limiting-not-persistent) | **HIGH** | **Medium** - Requires Redis or Azure Cache integration |
| 6 | [COSMOS_KEY Stored in Function App Settings](#6-cosmos_key-stored-in-function-app-settings) | **MEDIUM** | **Low** - Already using MI in code; remove key from Bicep |
| 7 | [Storage Account Allows Public Blob Access](#7-storage-account-allows-public-blob-access) | **MEDIUM** | **Medium** - Requires review of public image requirements |
| 8 | [CORS Wildcard in Local Settings](#8-cors-wildcard-in-local-settings) | **MEDIUM** | **Low** - Ensure production CORS is restricted |
| 9 | [Weak ID Generation Using Math.random()](#9-weak-id-generation-using-mathrandom) | **LOW** | **Medium** - Replace with crypto.randomUUID() |
| 10 | [Missing HSTS Header Configuration](#10-missing-hsts-header-configuration) | **LOW** | **Low** - Add header to staticwebapp.config.json |

---

## Detailed Findings

### 1. Missing Content-Security-Policy (CSP) Header

**Severity:** CRITICAL  
**Location:** `staticwebapp.config.json` (lines 98-104)  
**Category:** Cross-Site Scripting (XSS) Prevention

**Description:**  
The application's global headers include `X-XSS-Protection`, `X-Frame-Options`, and `X-Content-Type-Options`, but is missing a Content-Security-Policy (CSP) header. CSP is the primary defense against XSS attacks and code injection in modern browsers.

**Current Configuration:**
```json
"globalHeaders": {
    "X-SWA-Debug": "config-active",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin"
}
```

**Risk:**  
- XSS attacks can execute arbitrary JavaScript
- Data exfiltration via malicious scripts
- Session hijacking and credential theft

**Recommendation:**  
Add a strict CSP header. Example:
```json
"Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https://*.blob.core.windows.net https://ui-avatars.com data:; connect-src 'self' https://*.azurewebsites.net; frame-ancestors 'none'"
```

**Impact for Implementation:** MEDIUM  
- Requires thorough testing of all frontend functionality
- May need adjustments for third-party scripts/styles
- Inline styles may need refactoring or nonce-based exceptions

---

### 2. Admin Route Publicly Accessible to Anonymous

**Severity:** CRITICAL  
**Location:** `staticwebapp.config.json` (lines 21-26)  
**Category:** Broken Access Control

**Description:**  
The `/admin*` route allows `anonymous` access, meaning unauthenticated users can access admin pages:

```json
{
    "route": "/admin*",
    "allowedRoles": [
        "anonymous"
    ]
}
```

While the API endpoints may enforce authentication, exposing admin UI pages to anonymous users is a security misconfiguration that:
- Leaks admin interface structure and functionality
- Enables reconnaissance attacks
- May allow access if API auth is bypassed

**Risk:**  
- Information disclosure of admin features
- Potential exploitation if combined with other vulnerabilities
- Increases attack surface

**Recommendation:**  
Restrict `/admin*` routes to authenticated admin users only:
```json
{
    "route": "/admin*",
    "allowedRoles": ["admin", "administrator"]
}
```
Keep `/admin/login` accessible to `anonymous` for authentication flow.

**Impact for Implementation:** LOW  
- Simple configuration change
- May require authentication flow adjustment

---

### 3. Development Mode Auth Bypass Risk

**Severity:** HIGH  
**Location:** `apps/api/shared/authMiddleware.js` (lines 6-30)  
**Category:** Broken Authentication

**Description:**  
The authentication middleware checks multiple environment variables to determine "development mode":

```javascript
const isDevelopment = process.env.NODE_ENV === 'development' || 
                      process.env.AZURE_FUNCTIONS_ENVIRONMENT === 'Development' ||
                      process.env.NODE_ENV === 'dev';
```

**Note:** Both `NODE_ENV=development` and `NODE_ENV=dev` trigger development mode, which creates inconsistency and increases the risk of accidental activation.

In development mode, a mock admin user is automatically returned, bypassing all authentication:
```javascript
function getMockClientPrincipal() {
    if (!isDevelopment) { return null; }
    return {
        identityProvider: 'mock',
        userId: 'mock-user-123',
        userDetails: 'developer@somos.tech',
        userRoles: ['authenticated', 'admin', 'administrator']
    };
}
```

**Risk:**  
- If `NODE_ENV=dev` or similar is accidentally set in production (or inherited from deployment), full admin access is granted to anyone
- The Bicep infrastructure sets `NODE_ENV: environmentName` (line 463), meaning dev environment uses `NODE_ENV=dev` which triggers this bypass

**Recommendation:**  
1. Use a single, explicit environment variable like `ENABLE_MOCK_AUTH=true`
2. Add additional safeguards (e.g., check for localhost)
3. Log warnings in production if development mode is detected
4. Consider removing mock auth entirely and using Azure CLI authentication locally

**Impact for Implementation:** MEDIUM  
- Requires audit of all environments
- May need local development workflow changes

---

### 4. Agent API Endpoints Missing Authentication

**Severity:** HIGH  
**Location:** `apps/api/functions/agent.js` (lines 26-145)  
**Category:** Broken Access Control

**Description:**  
The AI Agent API endpoints implement rate limiting but do NOT require authentication:

- `POST /api/agent/invoke` - Invoke AI agent (no auth)
- `POST /api/agent/thread` - Create agent thread (no auth)
- `GET /api/agent/thread/{threadId}/messages` - Get messages (no auth)
- `DELETE /api/agent/thread/{threadId}` - Delete thread (no auth)

```javascript
app.http('InvokeAgent', {
    methods: ['POST'],
    authLevel: 'anonymous',  // NOTE: No authentication check here
    route: 'agent/invoke',
    handler: async (request, context) => {
        // Rate limiting only, no requireAuth() call
        const rateLimitError = rateLimitMiddleware(request, 10, 300000);
```

**Risk:**  
- Anonymous users can consume AI resources (cost exposure)
- Rate limiting alone is insufficient (can be bypassed with rotating IPs)
- Potential for AI abuse (prompt injection, data extraction)
- Thread IDs may be guessable, exposing conversation history

**Recommendation:**  
Add `requireAuth()` to all agent endpoints:
```javascript
const authResult = await requireAuth(request);
if (!authResult.authenticated) {
    return authResult.error;
}
```

**Impact for Implementation:** LOW  
- Simple code addition
- No breaking changes for authenticated users

---

### 5. In-Memory Rate Limiting Not Persistent

**Severity:** HIGH  
**Location:** `apps/api/shared/rateLimiter.js`  
**Category:** Denial of Service / Rate Limiting Bypass

**Description:**  
The rate limiter uses an in-memory `Map()` to store rate limit data:

```javascript
const rateLimitStore = new Map();
```

In Azure Functions with Flex Consumption plan:
- Instances are ephemeral and can scale to 100 instances
- Each instance has its own memory space
- Rate limits reset on instance restart or scale-out

**Risk:**  
- Attackers can bypass rate limits by causing requests to hit different instances
- DDoS attacks not effectively mitigated
- Registration endpoint abuse (3 requests/hour easily bypassed)
- AI agent abuse despite 10 requests/5 minutes limit

**Recommendation:**  
Implement distributed rate limiting using:
1. **Azure Cache for Redis** - Shared rate limit store across instances
2. **Azure Table Storage** - Lower cost, slightly higher latency
3. **Azure API Management** - Built-in rate limiting policies

**Impact for Implementation:** MEDIUM  
- Requires additional Azure resource provisioning
- Code refactoring for async rate limit checks

---

### 6. COSMOS_KEY Stored in Function App Settings

**Severity:** MEDIUM  
**Location:** `infra/main.bicep` (lines 474-476)  
**Category:** Secrets Management

**Description:**  
The Cosmos DB master key is stored in Function App settings:

```bicep
{
    name: 'COSMOS_KEY'
    value: cosmosDbAccount.listKeys().primaryMasterKey
}
```

While the code (`apps/api/shared/db.js`) uses `DefaultAzureCredential` (Managed Identity) for authentication, having the master key in app settings creates risk:

**Risk:**  
- Key exposure in Azure Portal visible to all users with read access
- Key may be logged in diagnostics
- If MI auth fails, fallback to key auth may be implemented

**Recommendation:**  
1. Remove `COSMOS_KEY` from Bicep app settings (the code doesn't use it)
2. Verify MI-only authentication is enforced
3. Add Key Vault reference if key is needed for backup scenarios

**Impact for Implementation:** LOW  
- Remove unused configuration line
- No code changes required

---

### 7. Storage Account Allows Public Blob Access

**Severity:** MEDIUM  
**Location:** `infra/main.bicep` (lines 387-388)  
**Category:** Data Exposure

**Description:**  
The storage account is configured to allow public blob access:

```bicep
properties: {
    allowBlobPublicAccess: true
    ...
}
```

Additionally, some containers are set to public access:
```bicep
resource siteImagesContainer ... = {
    // No publicAccess property = inherits from account setting
}
```

**Risk:**  
- Uploaded files may be publicly accessible without authentication
- Profile photos potentially discoverable by enumeration
- Sensitive uploaded content exposure

**Recommendation:**  
1. Evaluate which containers truly need public access
2. Set `allowBlobPublicAccess: false` at account level
3. Use SAS tokens or Azure CDN with authentication for public content
4. Configure container-level access explicitly

**Impact for Implementation:** MEDIUM  
- Requires review of image display functionality
- May need SAS token generation for private images
- CDN configuration changes

---

### 8. CORS Wildcard in Local Settings

**Severity:** MEDIUM  
**Location:** `apps/api/local.settings.json` (lines 20-22)  
**Category:** Cross-Origin Security

**Description:**  
Local development settings use a wildcard CORS policy:

```json
"Host": {
    "CORS": "*"
}
```

While this is local-only, the risk is:
- This file may be accidentally deployed
- Developers may copy this pattern to production

Production CORS in Bicep (lines 443-450) is properly configured with specific origins.

**Risk:**  
- If accidentally deployed, allows any origin to make API requests
- Cross-site request forgery (CSRF) attacks
- Data theft from authenticated sessions

**Recommendation:**  
1. Add `local.settings.json` to `.gitignore` (already done based on API `.funcignore`)
2. Document that this file should never be deployed
3. Consider using specific localhost origins even in development

**Impact for Implementation:** LOW  
- Documentation and awareness
- No code changes for production

---

### 9. Weak ID Generation Using Math.random()

**Severity:** LOW  
**Location:** Multiple files (e.g., `register.js` line 106, `adminUsers.js` line 172)  
**Category:** Weak Cryptography

**Description:**  
Record IDs are generated using a pattern that includes `Math.random()`:

```javascript
id: `member-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
```

`Math.random()` is not cryptographically secure and can be predictable.

**Risk:**  
- ID prediction attacks (low probability but possible)
- Not suitable for security-critical identifiers
- Collision risk under high load

**Recommendation:**  
Use `crypto.randomUUID()` for ID generation:
```javascript
import crypto from 'crypto';
// ...
id: `member-${crypto.randomUUID()}`
```

**Impact for Implementation:** MEDIUM  
- Multiple files need updating
- No database migration required (new records only)
- Testing needed for ID format compatibility

---

### 10. Missing HSTS Header Configuration

**Severity:** LOW  
**Location:** `staticwebapp.config.json` (lines 98-104)  
**Category:** Transport Security

**Description:**  
While HTTPS is enforced by Azure Static Web Apps and Front Door, the Strict-Transport-Security (HSTS) header is not explicitly configured.

**Risk:**  
- Browser may not cache HTTPS-only policy
- First request may be over HTTP before redirect
- MITM attacks during initial connection possible

**Recommendation:**  
Add HSTS header to global headers:
```json
"Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload"
```

Also consider:
- HSTS preload list submission
- Enabling in Azure Front Door WAF policy

**Impact for Implementation:** LOW  
- Simple configuration addition
- No code changes required
- Test thoroughly before enabling preload

---

## Additional Security Observations

### Positive Security Controls Already Implemented

1. **WAF with Geo-Blocking** - Azure Front Door WAF configured with country restrictions (US, CA, MX, GB)
2. **Bot Protection** - Microsoft BotManagerRuleSet enabled
3. **Input Validation** - Comprehensive validation in `validation.js` with NoSQL injection prevention
4. **Magic Bytes Validation** - File upload security in `mediaService.js`
5. **Parameterized Queries** - Cosmos DB queries use parameterized inputs
6. **Security Headers** - X-Frame-Options, X-Content-Type-Options, Referrer-Policy present
7. **HTTPS Only** - Enforced at infrastructure level
8. **Managed Identity** - Used for Azure service authentication
9. **Rate Limiting** - Implemented (though needs distributed solution)
10. **Domain Restriction for Admin** - Only `@somos.tech` emails can be admins

### Lower Priority Recommendations

- Enable Azure Defender for Cosmos DB and Storage
- Implement audit logging for sensitive operations
- Add automated secret rotation
- Enable diagnostic logging retention policies
- Consider Web Application Firewall Premium for enhanced protection
- Implement request size limits in WAF policy

---

## Conclusion

This audit identified 10 security issues requiring attention, with 2 Critical, 3 High, 3 Medium, and 2 Low severity findings. The platform has a solid security foundation with several best practices already implemented. The most urgent items to address are:

1. **Add CSP header** to prevent XSS attacks
2. **Restrict admin routes** to authenticated users only  
3. **Add authentication to agent endpoints** to prevent abuse

Addressing these issues will significantly improve the security posture of the SOMOS.tech platform.

---

**Report Prepared By:** Security Audit Agent  
**Review Status:** Pending team review  
**Next Steps:** Prioritize remediation based on severity and implementation impact
