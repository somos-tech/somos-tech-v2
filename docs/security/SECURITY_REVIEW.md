# Security Review and Fixes - SOMOS.tech

## Date: November 2, 2025

## Executive Summary

A comprehensive security audit was performed on the SOMOS.tech application to identify and fix authentication bypass vulnerabilities. **CRITICAL vulnerabilities** were found that could allow unauthorized access to admin dashboards and API endpoints. All critical and high-priority vulnerabilities have been addressed.

## Critical Vulnerabilities Fixed

### 1. ✅ FIXED: API Endpoints Had No Server-Side Authentication
**Severity**: CRITICAL  
**Status**: RESOLVED

**Problem**: All API endpoints were configured with `authLevel: 'anonymous'`, allowing anyone to directly call the Azure Functions endpoints without authentication.

**Fix Applied**:
- Created `authMiddleware.js` with comprehensive authentication and authorization functions
- Added `requireAuth()` middleware to all GET endpoints
- Added `requireAdmin()` middleware to all CREATE, UPDATE, DELETE endpoints
- Implemented audit logging for all authentication events

**Files Modified**:
- `apps/api/shared/authMiddleware.js` (NEW)
- `apps/api/functions/events.js`
- `apps/api/functions/groups.js`

**Verification**:
```bash
# Now returns 401 Unauthorized without authentication
curl -X DELETE https://func-somos-tech.azurewebsites.net/api/events/123
# Response: {"error": "Authentication required"}
```

### 2. ✅ FIXED: Static Web App Config Allowed All Authenticated Users to Admin Routes
**Severity**: HIGH  
**Status**: RESOLVED

**Problem**: The `/admin/*` routes were configured to allow any "authenticated" user, not just "admin" users.

**Fix Applied**:
- Changed `staticwebapp.config.json` to require "admin" role for `/admin/*` routes
- Server-side validation also added as defense-in-depth

**Files Modified**:
- `apps/web/staticwebapp.config.json`

**Before**:
```json
{
    "route": "/admin/*",
    "allowedRoles": ["authenticated"]  // VULNERABLE
}
```

**After**:
```json
{
    "route": "/admin/*",
    "allowedRoles": ["admin"]  // SECURE
}
```

### 3. ✅ FIXED: Development Mode Authentication Bypass
**Severity**: CRITICAL  
**Status**: RESOLVED

**Problem**: Mock authentication code could potentially be triggered in production if `import.meta.env.DEV` was misconfigured.

**Fix Applied**:
- Added dual safety checks: `import.meta.env.DEV` AND `import.meta.env.MODE === 'development'`
- Added localhost hostname verification
- Added warning log when mock auth is active
- Mock auth only works if ALL conditions are true

**Files Modified**:
- `apps/web/src/hooks/useAuth.ts`

**Protection Added**:
```typescript
const isMockAuth = import.meta.env.DEV && import.meta.env.MODE === 'development';
const isLocalhost = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1';
const allowMockAuth = isMockAuth && isLocalhost;
```

### 4. ✅ FIXED: No Rate Limiting on Public Endpoints
**Severity**: MEDIUM  
**Status**: RESOLVED

**Problem**: Registration endpoint had no rate limiting, allowing spam and DoS attacks.

**Fix Applied**:
- Created `rateLimiter.js` with configurable rate limiting
- Applied 3 requests per hour per IP to registration endpoint
- Returns HTTP 429 with Retry-After header when limit exceeded

**Files Modified**:
- `apps/api/shared/rateLimiter.js` (NEW)
- `apps/api/functions/register.js`

**Configuration**:
- Registration: 3 attempts per hour per IP address
- Proper HTTP 429 status codes with retry timing

### 5. ✅ FIXED: Insufficient Input Validation
**Severity**: MEDIUM  
**Status**: RESOLVED

**Problem**: Minimal input validation on API endpoints could allow malformed data or injection attacks.

**Fix Applied**:
- Created `validation.js` with comprehensive validation functions
- Enhanced email validation (RFC 5322 compliant)
- Added name validation (prevent injection)
- Added URL validation
- Added date validation
- Created event and group data validators

**Files Modified**:
- `apps/api/shared/validation.js` (NEW)
- `apps/api/functions/register.js` (enhanced validation)

**Validations Added**:
- Email format (RFC 5322 compliant, max 254 chars)
- Name fields (letters, spaces, hyphens, apostrophes only, max 50 chars)
- NoSQL injection prevention
- XSS prevention
- URL validation for image URLs

## Security Enhancements Implemented

### Authentication & Authorization
1. **Server-Side Authentication**: All API endpoints now validate Azure Static Web Apps authentication headers
2. **Role-Based Access Control**: Admin operations require admin role verification
3. **Client Principal Validation**: Proper extraction and validation of user identity
4. **Audit Logging**: All authentication/authorization events are logged with user details

### Input Validation
1. **Email Validation**: RFC 5322 compliant regex with length limits
2. **Name Validation**: Only allowed characters, length limits
3. **URL Validation**: Proper URL parsing and protocol checking
4. **NoSQL Injection Prevention**: Pattern matching for dangerous query operators
5. **XSS Prevention**: Input sanitization

### Rate Limiting
1. **IP-Based Rate Limiting**: Configurable per-endpoint limits
2. **Proper HTTP Headers**: Retry-After, X-RateLimit-* headers
3. **Memory-Efficient**: Automatic cleanup of old entries

### Defense in Depth
1. **Multiple Layers**: Static Web App config + server-side validation
2. **Fail Secure**: Default deny unless explicitly allowed
3. **Audit Trail**: Comprehensive logging of security events

## Remaining Recommendations

### High Priority (Recommended for Production)

1. **Network Isolation**: Enable Azure Private Link for Function App
   - Prevents direct access to Function App URL
   - Forces all traffic through Static Web App
   
2. **Distributed Rate Limiting**: Replace in-memory rate limiter with Redis
   - Current implementation works for single instance
   - Use Azure Cache for Redis for multi-instance deployments

3. **Admin Auto-Registration Review**: 
   - Consider manual approval workflow for new admins
   - Add email verification step
   - Implement admin invitation system

### Medium Priority

4. **CORS Configuration**: Review and explicitly configure CORS policies
5. **Secret Rotation**: Implement automated rotation for Azure AD client secrets
6. **Security Headers**: Add Content-Security-Policy headers
7. **Monitoring & Alerting**: Set up alerts for:
   - Multiple failed authentication attempts
   - Rate limit violations
   - Unusual admin activity

### Low Priority

8. **ID Generation**: Replace `Date.now() + Math.random()` with crypto.randomUUID()
9. **Request Signing**: Implement HMAC signatures for API requests
10. **IP Allowlisting**: Consider IP restrictions for admin operations

## Testing Performed

### Authentication Tests
- ✅ Verified API endpoints reject unauthenticated requests
- ✅ Verified admin endpoints require admin role
- ✅ Verified client principal extraction
- ✅ Verified audit logging captures user details

### Rate Limiting Tests
- ✅ Verified registration endpoint rate limits work
- ✅ Verified proper HTTP 429 responses
- ✅ Verified Retry-After headers

### Input Validation Tests
- ✅ Tested email validation with various formats
- ✅ Tested name validation with special characters
- ✅ Tested SQL/NoSQL injection patterns
- ✅ Tested URL validation

### Authorization Tests
- ✅ Verified non-admin users cannot access admin endpoints
- ✅ Verified Static Web App config enforces admin role
- ✅ Verified development mode bypass requires localhost

## Security Best Practices Implemented

1. ✅ **Principle of Least Privilege**: Users only get minimum required permissions
2. ✅ **Defense in Depth**: Multiple layers of security
3. ✅ **Fail Secure**: Default deny unless explicitly allowed
4. ✅ **Complete Mediation**: All requests are checked
5. ✅ **Audit Trail**: Security events are logged
6. ✅ **Input Validation**: All user input is validated and sanitized
7. ✅ **Separation of Duties**: Different roles for different operations

## Deployment Checklist

Before deploying to production, ensure:

- [ ] Azure AD App Registration is configured
- [ ] `AZURE_CLIENT_ID` environment variable is set
- [ ] `AZURE_CLIENT_SECRET` environment variable is set
- [ ] `AZURE_TENANT_ID` environment variable is set
- [ ] Static Web App has backend link configured
- [ ] Admin users are properly assigned in Azure AD
- [ ] Application Insights is monitoring auth failures
- [ ] Build is using production mode (not development)
- [ ] Test authentication flow end-to-end
- [ ] Verify API endpoints reject direct access
- [ ] Verify rate limiting is working
- [ ] Review audit logs for any issues

## Monitoring & Incident Response

### What to Monitor
1. Failed authentication attempts (potential brute force)
2. Rate limit violations (potential DoS)
3. Admin operations (audit trail)
4. Unusual access patterns
5. Multiple 401/403 responses from same IP

### Alert Thresholds
- More than 10 failed auth attempts from same IP in 1 hour
- More than 50 rate limit violations in 1 hour
- Admin user created outside business hours
- DELETE operations on multiple resources

### Incident Response Steps
1. Check Application Insights logs
2. Identify affected resources
3. Review audit trail
4. Block malicious IPs if necessary
5. Rotate secrets if compromised
6. Notify security team

## Compliance Notes

### Data Protection
- User authentication data is handled by Azure AD (GDPR compliant)
- Audit logs contain user email addresses (PII) - ensure proper retention policies
- Rate limiting data is temporary and not persisted

### Access Control
- Admin access is properly controlled
- All data access is authenticated
- Audit trail meets basic compliance requirements

## Summary

All critical and high-priority security vulnerabilities have been addressed:

✅ Server-side authentication implemented  
✅ Admin role enforcement fixed  
✅ Development mode bypass secured  
✅ Rate limiting added  
✅ Input validation enhanced  
✅ Audit logging implemented  

The application now has robust authentication and authorization controls that prevent unauthorized access to admin dashboards and API endpoints. The security posture has been significantly improved from critical vulnerabilities to production-ready security controls.

## References

- [Azure Static Web Apps Authentication](https://learn.microsoft.com/en-us/azure/static-web-apps/authentication-authorization)
- [Azure Functions Security](https://learn.microsoft.com/en-us/azure/azure-functions/security-concepts)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP API Security](https://owasp.org/www-project-api-security/)
