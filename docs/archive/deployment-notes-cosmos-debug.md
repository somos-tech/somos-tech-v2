# Cosmos DB Debugging Enhancements

## Issue
Admin dashboard endpoints continue to return 500 errors:
- `/api/dashboard-users/list`
- `/api/dashboard/users?limit=100`
- `/api/dashboard/users?stats=true`

## Changes Implemented

### Enhanced Error Logging
Added comprehensive logging throughout the Cosmos DB connection and query flow to capture the exact errors occurring in production:

1. **`apps/api/shared/db.js`**:
   - Detailed logging during Cosmos client initialization showing:
     - Environment variables (`NODE_ENV`, `AZURE_FUNCTIONS_ENVIRONMENT`)
     - Connection details (endpoint, database name)
     - Credential type being used (DefaultAzureCredential vs ManagedIdentityCredential)
   - Try-catch wrapper around client initialization with full error details
   - Error logging in `getContainer()` function

2. **`apps/api/functions/adminUsers.js`**:
   - Added try-catch around admin user list query
   - Logs the number of users found
   - Captures and logs full Cosmos error details (message, code, statusCode, body)

3. **`apps/api/functions/adminUserManagement.js`**:
   - Enhanced error logging for user stats retrieval
   - Detailed logging for user listing operations
   - Comprehensive error details in catch blocks including stack traces

## Next Steps for Diagnosis

### In Azure Portal - Function App
1. Open the dev Function App
2. Go to **Monitor** or **Application Insights**
3. Find a failed invocation of `adminUsers` or `adminListUsers`
4. Look for log entries starting with `[CosmosDB]` and `[adminUsers]` or `[adminListUsers]`

The logs will now show:
- **If initialization fails**: The exact credential/endpoint issue
- **If queries fail**: The Cosmos error code (e.g., 403 Forbidden, 401 Unauthorized)
- **Environment detection**: Whether it's using the correct credential type

### Common Issues to Check
1. **Managed Identity**:
   - Function App → Identity → System assigned must be **On**
   - The Principal ID from that page must have a role assignment in Cosmos

2. **Cosmos RBAC**:
   - Cosmos DB account → Permissions → Role assignments (Data plane)
   - Must have an assignment for the Function App's managed identity
   - Role: `00000000-0000-0000-0000-000000000002` (Cosmos DB Built-in Data Contributor)

3. **App Settings**:
   - `COSMOS_ENDPOINT`: Must match the dev Cosmos account URI
   - `COSMOS_DATABASE_NAME`: Must be `somostech`
   - `NODE_ENV`: Must be `dev` or `prod` (NOT `development`)

## Security Considerations
- No security controls were relaxed
- Admin authentication via `requireAdmin` remains enforced
- Only `@somos.tech` domain users with admin role in `admin-users` container can access these endpoints
- Managed identity ensures Function App uses least-privilege access to Cosmos
