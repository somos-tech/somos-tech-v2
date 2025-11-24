# Admin API Fixes - Part 6

## Issue Description
The user is still receiving 403 Forbidden errors, even though the `GetUserRoles` function is correctly returning the `admin` role when tested directly.
This implies that Azure Static Web Apps is either:
1. Not calling `GetUserRoles` during login.
2. Not applying the returned roles to the user session.
3. Passing a `clientPrincipal` header that doesn't contain the expected roles.

## Changes Implemented

### 1. Enhanced Debug Logging
Added explicit logging to `apps/api/functions/adminUsers.js` to print the decoded `x-ms-client-principal` header.
This will allow us to see exactly what roles SWA thinks the user has when they make a request to the admin API.

## Verification Steps
1. Deploy the changes.
2. Reproduce the 403 error by accessing the admin dashboard.
3. Check the Application Insights logs (or streaming logs) for the `[adminUsers] DEBUG AUTH HEADER:` entry.
4. If the header shows `roles: ["authenticated", "admin"]`, then the issue is in the `requireAdmin` middleware logic.
5. If the header shows `roles: ["authenticated"]` (missing admin), then SWA is not assigning the role, which points to `staticwebapp.config.json` or the `GetUserRoles` integration.
