# Admin API Fixes - Part 2

## Issue Description
The previous deployment resulted in 500 Internal Server Errors on the Admin Dashboard endpoints:
- `/api/dashboard-users/list`
- `/api/dashboard/users`

This was likely caused by inconsistent Cosmos DB client initialization and potential issues with Managed Identity authentication in the production environment.

## Changes Implemented

### 1. Centralized Database Connection Logic
Created a new shared module `apps/api/shared/db.js` to handle Cosmos DB client initialization. This ensures:
- Consistent use of `DefaultAzureCredential` (local) vs `ManagedIdentityCredential` (production).
- Singleton pattern for the Cosmos Client to prevent connection exhaustion.
- Centralized error handling and logging for database connections.

### 2. Refactored Services
Updated the following services to use the new shared `db.js` module:
- `apps/api/functions/adminUsers.js`: Now uses `getContainer('admin-users')` from shared module.
- `apps/api/shared/services/userService.js`: Now uses `getContainer('users')` from shared module.
- `apps/api/shared/services/notificationService.js`: Now uses `getContainer('notifications')` from shared module.

### 3. Improved Logging
Added logging to the database initialization process to help diagnose environment detection issues (`isLocal` vs production).

## Verification
- Verified code compilation and structure.
- The centralized logic reduces the risk of configuration mismatch between different functions.
