# Admin API Fixes - Part 4

## Issue Description
After fixing the 500 errors, the Admin Dashboard endpoints started returning 403 Forbidden errors.
This indicates that while the user is authenticated, they are not being assigned the `admin` role required to access these endpoints.

## Root Cause
The `staticwebapp.config.json` configuration was missing the `rolesSource` property in the `auth` section.
Without this property, Azure Static Web Apps does not call the `/api/GetUserRoles` function to assign custom roles (like `admin`) to the user session.

## Changes Implemented

### 1. Updated SWA Configuration
Added `"rolesSource": "/api/GetUserRoles"` to the `auth` section in:
- `staticwebapp.config.json` (Root)
- `apps/web/staticwebapp.config.json`
- `apps/web/public/staticwebapp.config.json`

This ensures that when a user logs in, SWA will invoke the `GetUserRoles` function, which checks if the user is from the allowed domain (`@somos.tech`) and assigns the `admin` role.

## Verification
After deployment, users logging in with an `@somos.tech` email should automatically receive the `admin` role and be able to access the dashboard endpoints.
**Note:** Users may need to log out and log back in for the role assignment to take effect.
