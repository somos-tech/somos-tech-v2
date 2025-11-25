# Admin Endpoint 404 Investigation

**Date:** November 9, 2025  
**Status:** ONGOING - Critical Issue  
**Impact:** Admin users management page non-functional

## Problem Statement

Admin user management endpoints return 404 errors despite being registered in Azure Functions. The health endpoint works correctly, proving the Function App and Static Web App proxy are functioning, but admin-specific endpoints fail.

### Affected Endpoints
- `/api/admin-users/list` - Returns 404
- `/api/admin-users/stats` - Returns 404
- `/api/adminusers/list` - Returns 404 (tested alternative route)
- `/api/adminusers/stats` - Returns 404 (tested alternative route)

### Working Endpoints
- `/api/health` - Returns 200 OK ✓
- `/api/health/check` - Returns 200 OK ✓
- Other endpoints (events, groups, users, etc.) - All functional ✓

## Current Configuration

### Function App Details
- **Name:** func-somos-tech-dev-64qb73pzvgekw
- **Type:** Azure Functions Flex Consumption Plan
- **Runtime:** Node.js (ES Modules - `"type": "module"` in package.json)
- **Region:** Central US
- **Programming Model:** v4

### Static Web App Details
- **Name:** swa-somos-tech-dev-64qb73pzvgekw
- **Custom Domain:** dev.somos.tech
- **Azure Default Hostname:** (legacy) see Azure portal if needed
- **SKU:** Standard

### Deployment Configuration
- **Method:** GitHub Actions (`deploy-azure.yml`)
- **Function Deployment:** `Azure/functions-action@v1` with `scm-do-build-during-deployment: false`
- **Static Web App:** `Azure/static-web-apps-deploy@v1`

## Investigation Timeline

### Phase 1: Route Configuration Issues (Resolved)
- ✅ Fixed duplicate `/api/*` routes in two `staticwebapp.config.json` files
- ✅ Consolidated to single config in `apps/web/public/staticwebapp.config.json`
- ✅ Configured forwardingGateway with correct Function App resource ID
- ✅ Set route permissions to `["authenticated", "anonymous"]`

### Phase 2: Authentication Middleware Blocking (Discovered)
- 🔍 **Discovery:** Security fix commit `7e07042` added `requireAdmin` authentication
- 🔍 `requireAdmin` function checks if user has 'admin' or 'administrator' role
- 🔍 Users logging in don't automatically receive admin role in `userRoles` array
- ⚠️ **Theory:** This could cause 403 errors, but we're seeing 404s instead

### Phase 3: Function Registration Issues (Current)
- 🔍 Created `adminUsersSimple.js` without authentication dependencies
- 🔍 Changed route from `admin-users/{action?}` to `adminusers/{action?}` (testing hyphen issue)
- ❌ Both routes return 404 even when function shows as registered
- ❌ Direct Function App calls return 404 (not just SWA proxy)
- ❌ No traces in Application Insights (function never executes)

### Phase 4: Deployment Propagation (Current)
- Multiple Function App restart cycles attempted
- GitHub Actions deployments triggered multiple times
- Azure CLI shows functions as registered with correct routes
- **Critical Finding:** Functions appear in Azure but don't actually serve requests

## Technical Findings

### Function Registration Status
```
Current deployed functions (admin-related):
- adminUsers: route = admin-users/{action?}
- testAdminRoute: route = admin-users/test (works intermittently)
```

### Test Results Matrix
| Endpoint | Direct Function App | SWA Proxy | Expected |
|----------|-------------------|-----------|----------|
| /api/health | 200 ✓ | 200 ✓ | 200 |
| /api/admin-users/list | 404 ✗ | 404 ✗ | 200/403 |
| /api/admin-users/stats | 404 ✗ | 404 ✗ | 200/403 |
| /api/adminusers/list | 404 ✗ | 404 ✗ | 200/403 |

### Code Files Tested

#### adminUsers.js (Original - Currently Active)
```javascript
Route: admin-users/{action?}
Methods: GET, POST, PUT, DELETE
Auth: Calls requireAdmin middleware
Status: Registered but returns 404
```

#### adminUsersSimple.js (Simplified - Commented Out)
```javascript
Route: adminusers/{action?}
Methods: GET only
Auth: None (anonymous)
Status: Registered but returns 404
```

#### testAdmin.js (Debug Function)
```javascript
Route: admin-users/test
Methods: GET
Auth: None
Status: Sometimes works, sometimes 404
```

### Backend Linking Status
```bash
az staticwebapp backends show
Result: backendResourceId: null

# However, forwardingGateway config exists in staticwebapp.config.json:
"forwardingGateway": {
    "backend": {
        "backendResourceId": "/subscriptions/.../func-somos-tech-dev-64qb73pzvgekw"
    }
}
```
**Finding:** Backend linking shows as `null` via CLI but config file has it. Manual linking via `az staticwebapp backends link` fails with generic error.

## Theories & Hypotheses

### Theory 1: Flex Consumption Plan Caching Issue
**Likelihood:** HIGH  
**Evidence:**
- Functions show as registered but don't serve requests
- Restart cycles don't resolve the issue
- Other endpoints work fine (health, events, groups)
- Specific to admin endpoints only

**Supporting Facts:**
- Flex Consumption plans have known deployment propagation delays
- GitHub Actions deployments show success but changes don't take effect
- Function list shows correct routes immediately after deployment

**Counter-Evidence:**
- Health endpoint works consistently (deployed same way)
- Other new endpoints deployed successfully in past
- Multiple restart cycles should clear any cache

### Theory 2: Route Pattern Matching Issue
**Likelihood:** MEDIUM  
**Evidence:**
- Route pattern `admin-users/{action?}` with hyphen might not match
- Tested alternative `adminusers/{action?}` - also failed
- Health endpoint uses simple route `health` - works

**Supporting Facts:**
- Azure Functions v4 route patterns can be finicky
- Optional parameter `{action?}` might not work as expected in Flex Consumption

**Counter-Evidence:**
- Other endpoints use similar patterns and work (e.g., `groups/{id?}`)
- Route shows correctly in Azure function list
- Both with and without hyphen fail the same way

### Theory 3: Import/Module Loading Failure
**Likelihood:** MEDIUM  
**Evidence:**
- `adminUserManagement.js` NEVER loaded successfully (import errors)
- `adminUsers.js` loads intermittently
- Both import `authMiddleware.js` which has complex dependencies

**Supporting Facts:**
- ES module imports can fail silently in some cases
- authMiddleware imports multiple services (Cosmos, notifications)
- Simplified version without imports also fails

**Counter-Evidence:**
- `adminUsersSimple.js` has minimal imports - still fails
- Other functions import authMiddleware successfully
- No errors in Application Insights logs

### Theory 4: Authentication Middleware Silent Failure
**Likelihood:** LOW  
**Evidence:**
- `requireAdmin` could fail before function handler executes
- Would explain no traces in Application Insights
- Security fix changed authentication flow

**Supporting Facts:**
- 404 is unusual for auth failures (typically 401/403)
- No execution traces means function never runs
- adminUsersSimple without auth also fails

**Counter-Evidence:**
- adminUsersSimple has NO authentication - still 404
- Health endpoint would fail similarly if middleware broken
- 404 suggests routing issue, not auth issue

### Theory 5: Static Web App Configuration Not Applied
**Likelihood:** MEDIUM-HIGH  
**Evidence:**
- `az staticwebapp backends show` returns `null` for backend
- forwardingGateway config in file but not showing in Azure
- Manual backend linking fails

**Supporting Facts:**
- Health endpoint works (so some forwarding works)
- Latest deployments may not have picked up config changes
- Config file changes don't always propagate immediately

**Counter-Evidence:**
- forwardingGateway section exists in deployed staticwebapp.config.json
- Health endpoint proves forwarding works for some endpoints
- Multiple deployments should have applied changes

## Attempted Solutions

### ✅ Completed Actions
1. Fixed duplicate route configurations
2. Removed VITE_API_URL from environment to force relative paths
3. Configured forwardingGateway in staticwebapp.config.json
4. Created simplified endpoint without auth dependencies
5. Changed route names (with/without hyphen)
6. Multiple Function App restarts
7. Multiple GitHub Actions deployments
8. Updated frontend to match route changes
9. Verified ES module syntax
10. Checked Application Insights for errors

### ❌ Failed Attempts
1. Manual backend linking via Azure CLI (generic error)
2. Direct Function App deployment via `func` CLI (missing tool)
3. Testing alternative route patterns
4. Function App cold start warmup periods
5. Removing authentication requirements

## Next Steps for Tomorrow

### High Priority - Must Try
1. **Check GitHub Actions logs** for actual deployment success/failure
   - Verify Function App deployment step completed
   - Check for silent failures in build/deploy process
   - Confirm which files were actually deployed

2. **Manual Function App deployment via Azure Portal**
   - Use Portal's "Deploy from ZIP" feature
   - Bypass GitHub Actions entirely
   - Verify if issue is with deployment pipeline

3. **Check Function App environment variables**
   - Verify COSMOS_ENDPOINT, COSMOS_DATABASE_NAME set correctly
   - Check if missing env vars could cause function registration failure
   - Compare with working functions' requirements

4. **Review Static Web App deployment logs**
   - Check if staticwebapp.config.json is being picked up
   - Verify forwardingGateway configuration applied
   - Look for routing configuration errors

5. **Test with completely new function name**
   - Create `adminManagement.js` with different route `admin-management`
   - Avoid any cached route names
   - Use minimal implementation from health.js as template

### Medium Priority - Investigate
6. **Check Cosmos DB permissions**
   - Verify managed identity has access to admin-users container
   - Test if Cosmos DB connection failure causes silent 404
   - Check if container exists and is accessible

7. **Review all recent commits**
   - Look for unintended changes to index.js
   - Verify no circular dependencies introduced
   - Check if other files changed that affect admin functions

8. **Application Insights deep dive**
   - Check for exceptions during app startup
   - Look for function registration failures
   - Search for any admin-users related errors

### Low Priority - Long Term
9. **Consider migration away from Flex Consumption**
   - Evaluate if Consumption Plan (non-Flex) would work better
   - Research known issues with Flex Consumption
   - Plan migration if pattern continues

10. **Implement comprehensive health checks**
    - Add endpoint that lists all registered functions
    - Add endpoint that tests Cosmos DB connection
    - Add endpoint that verifies admin-users container access

## File Reference

### Key Files
- `/apps/api/index.js` - Function registration (imports all functions)
- `/apps/api/functions/adminUsers.js` - Main admin endpoint (currently active)
- `/apps/api/functions/adminUsersSimple.js` - Simplified version (commented out)
- `/apps/api/shared/authMiddleware.js` - Authentication logic with requireAdmin
- `/apps/web/public/staticwebapp.config.json` - SWA routing config (THE ONE THAT DEPLOYS)
- `/apps/web/src/api/adminUsersService.ts` - Frontend service (updated to admin-users)
- `/.github/workflows/deploy-azure.yml` - Deployment pipeline

### Recent Commits
```
643f485 - fix: Switch back to adminUsers.js with admin-users route
ea79ef4 - chore: Trigger deployment to refresh forwardingGateway configuration
c284092 - fix: Update frontend to use /api/adminusers route
5839e68 - fix: Change route to adminusers without hyphen
02d3ef2 - fix: Add simplified adminUsers endpoint without auth middleware dependencies
```

### Azure Resources
```bash
# Function App
az functionapp show -n func-somos-tech-dev-64qb73pzvgekw -g rg-somos-tech-dev

# Static Web App
az staticwebapp show -n swa-somos-tech-dev-64qb73pzvgekw -g rg-somos-tech-dev

# Cosmos DB
cosmos-somos-tech-dev-64qb73pzvgekw (database: somostech, container: admin-users)
```

## Critical Questions to Answer

1. **Why does health endpoint work but admin endpoints don't?**
   - Same deployment process
   - Same forwardingGateway configuration
   - Different route patterns?

2. **Why do functions show as registered but return 404?**
   - Azure CLI shows function exists
   - Direct calls to Function App fail
   - No traces of execution attempts

3. **Is the GitHub Actions deployment actually succeeding?**
   - Workflow shows green checkmark
   - But changes don't seem to take effect
   - Need to verify actual deployment logs

4. **Is there a Cosmos DB connection issue?**
   - Could failed Cosmos connection cause silent 404?
   - Do other endpoints use Cosmos successfully?
   - Is admin-users container accessible?

5. **Why does manual backend linking fail?**
   - Generic "An error occurred" message
   - No detailed error information
   - Is there a permission issue?

## Success Criteria

The issue will be considered resolved when:
- ✅ `/api/admin-users/list` returns 200 (or 403 if auth required)
- ✅ `/api/admin-users/stats` returns 200 (or 403 if auth required)
- ✅ Both direct Function App and SWA proxy calls work
- ✅ Application Insights shows traces of function execution
- ✅ Admin users page in UI loads successfully

## Additional Notes

- User has admin access via Azure AD (joey@somos.tech)
- Testing done in private browser window after sign-in
- All other parts of application working correctly
- Only admin user management affected
- Issue persists across multiple deployment attempts and restart cycles

---

**Last Updated:** November 9, 2025  
**Next Review:** November 10, 2025  
**Owner:** Development Team
