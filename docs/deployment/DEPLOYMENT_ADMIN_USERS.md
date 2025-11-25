# Quick Deployment Guide - Admin Users Feature

## Prerequisites
- Azure CLI installed and authenticated
- Node.js installed
- Access to the somos-tech Azure subscription

## Step 1: Verify Your Admin User is in Database

Run this script to verify your admin user exists:

```powershell
cd scripts
node check-admin-user.js
```

You should see output showing `jcruz@somos.tech` exists with admin role.

## Step 2: Deploy the API Function

The new `adminUsers.js` function needs to be deployed to Azure Functions:

```powershell
cd apps/api
func azure functionapp publish func-somos-tech-dev-64qb73pzvgekw
```

**Note:** Replace the function app name with your actual function app name. You can find it with:

```powershell
az functionapp list --resource-group rg-somos-tech-dev --query "[0].name" -o tsv
```

## Step 3: Deploy the Web App

The web app is deployed automatically via GitHub Actions when you push to the main branch:

```powershell
git add .
git commit -m "Add admin user management feature"
git push origin main
```

Azure Static Web Apps will automatically build and deploy the changes.

## Step 4: Verify Deployment

1. Wait for GitHub Actions to complete (check the Actions tab on GitHub)
2. Navigate to your Azure Static Web App URL
3. Log in with `jcruz@somos.tech`
4. Navigate to `/admin/users`
5. You should see the Admin Users interface with your account listed

## Step 5: Add More Admin Users (Optional)

### Via UI (Recommended):
1. Log in to the admin portal
2. Navigate to Admin Users
3. Click "Add Admin User"
4. Enter email and name
5. Select roles and click "Add User"

### Via Script:
```powershell
cd scripts
.\add-admin-user.ps1 -Email "newadmin@somos.tech" -Name "New Admin" -Environment "dev"
```

## Troubleshooting

### Issue: Cannot access /admin/users
**Solution:** 
1. Verify you're logged in with a `@somos.tech` email
2. Check that your user exists in the database: `node scripts/check-admin-user.js`
3. Clear browser cookies and log in again

### Issue: API returns 404 or 500 errors
**Solution:**
1. Verify the function was deployed: Check Azure Portal → Function App → Functions → adminUsers
2. Check function logs in Application Insights
3. Verify Cosmos DB connection is working

### Issue: "Admin Users" link not showing in sidebar
**Solution:**
1. Clear browser cache
2. Hard refresh (Ctrl+Shift+R)
3. Verify the deployment completed successfully

## Production Deployment

To deploy to production:

```powershell
# 1. Add admin user to production
.\scripts\add-admin-user.ps1 -Email "jcruz@somos.tech" -Name "Jose Cruz" -Environment "prod"

# 2. Deploy API function to production
cd apps/api
$prodFunctionApp = az functionapp list --resource-group rg-somos-tech-prod --query "[0].name" -o tsv
func azure functionapp publish $prodFunctionApp

# 3. Deploy web app (push to main branch - auto-deployed)
```

## Security Notes

1. **Only users with admin role can access /admin/users**
2. **All admin-users API endpoints require authentication and admin role**
3. **Users cannot delete their own admin account**
4. **All changes are logged with createdBy/updatedBy fields**
5. **Development mode uses mock auth - never enable in production**

## Next Steps

1. Add more administrators using the UI
2. Consider adding role-based permissions for different admin levels
3. Implement audit logging for all admin actions
4. Set up monitoring alerts for admin user changes

---

For more details, see `ADMIN_USERS_IMPLEMENTATION.md`
