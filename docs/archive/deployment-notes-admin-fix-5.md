# Admin API Fixes - Part 5

## Issue Description
Users were receiving 403 Forbidden errors even after adding `rolesSource` to the configuration.
This suggests that the `GetUserRoles` function might be failing to execute correctly, possibly due to database connection initialization issues in the production environment.

## Changes Implemented

### 1. Refactored GetUserRoles.js
Updated `apps/api/functions/GetUserRoles.js` to use the shared `apps/api/shared/db.js` module for database connections.
- **Before:** It had its own `CosmosClient` initialization logic which threw an error if `COSMOS_ENDPOINT` was missing at the top level (cold start crash).
- **After:** It uses `getContainer` from the shared module, which handles initialization lazily and robustly using `DefaultAzureCredential`.

### 2. Improved Robustness
The function now safely handles database connection failures. If the database cannot be reached, it will still assign the `admin` role to users with `@somos.tech` email addresses as a fallback, ensuring admins are not locked out during database outages or configuration issues.

## Verification
1. Deploy the changes.
2. Log out and log back in.
3. The `GetUserRoles` function should now execute successfully.
4. Even if the database connection fails, `@somos.tech` users should receive the `admin` role.
