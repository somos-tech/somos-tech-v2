# Admin API Fixes and Route Updates

## Issue Description
The Admin Dashboard was experiencing 404 errors when trying to fetch user lists and details. This was caused by two main issues:
1. **Route Conflicts**: The `admin/` and `admin-users/` route prefixes were conflicting with Azure Functions built-in routes or reserved keywords, preventing the functions from registering correctly.
2. **Initialization Failures**: Database clients were being initialized at the module level. If any configuration was missing or connection failed during startup, the entire module would fail to load, causing the functions to be missing.

## Changes Implemented

### 1. API Route Renaming (Backend)
To resolve conflicts with reserved routes, the following endpoints were renamed:
- `admin-users/{action?}` → `dashboard-users/{action?}`
- `admin/users` → `dashboard/users`
- `admin/users/{id}` → `dashboard/users/{id}`
- `admin/users/{id}/status` → `dashboard/users/{id}/status`

### 2. Function Consolidation
- Merged `adminGetUser` and `adminDeleteUser` into a single function `adminUserById` handling both GET and DELETE methods to reduce route complexity.

### 3. Lazy Initialization (Stability)
Implemented lazy initialization for Cosmos DB clients in the following services. This ensures the application starts up successfully even if the database connection is not immediately available:
- `apps/api/functions/adminUsers.js`
- `apps/api/shared/services/userService.js`
- `apps/api/shared/services/notificationService.js`

### 4. Frontend Updates
Updated the frontend API service files to match the new route structure:
- `apps/web/src/api/adminUsersService.ts`: Updated to use `/api/dashboard-users`
- `apps/web/src/api/userService.ts`: Updated to use `/api/dashboard/users`

## Verification
- Verified locally that all functions register successfully with the new routes.
- Confirmed that the `dashboard/users` endpoints are reachable and do not return 404 errors.
