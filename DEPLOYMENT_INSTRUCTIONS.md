# Deployment Instructions

## Changes Committed ✅

The following changes have been committed and pushed to GitHub:
- Fixed corrupted code in `adminUsers.js`
- Added debugging scripts
- Created troubleshooting documentation

**Commit:** `f75d106`
**Branch:** `main`

---

## Deploy to Azure

### Step 1: Login to Azure
```bash
az login
```

This will open a browser window for you to authenticate.

### Step 2: Deploy the API
```bash
cd /workspaces/somos-tech-v2/scripts
./deploy-api.sh
```

This will:
1. Create a deployment package (zip)
2. Upload to Azure Function App
3. Build remotely on Azure
4. Restart the function app

### Step 3: Add Your Admin User
After deployment, add yourself as an admin user:

```bash
cd /workspaces/somos-tech-v2/scripts
node add-jcruz-admin.js
```

### Step 4: Verify Deployment
Test the API endpoints:

```bash
# Test events endpoint
curl https://func-somos-tech-dev-64qb73pzvgekw.azurewebsites.net/api/events

# Test admin user endpoint
curl https://func-somos-tech-dev-64qb73pzvgekw.azurewebsites.net/api/admin-users/jcruz@somos.tech
```

### Step 5: Test in Browser
1. Navigate to your web app
2. Clear browser cache (Ctrl+Shift+Delete)
3. Logout if currently logged in
4. Login with `jcruz@somos.tech`
5. Navigate to `/admin/users`

---

## Quick Deploy (One Command)

After `az login`, run:
```bash
cd /workspaces/somos-tech-v2/scripts
./deploy-api.sh && node add-jcruz-admin.js
```

---

## Automatic Deployment via GitHub Actions

The web app will be automatically deployed via GitHub Actions when you push to main.
You can check the deployment status at:
https://github.com/somos-tech/somos-tech-v2/actions

---

## Troubleshooting

### If deployment fails:
```bash
# Check Azure Function App logs
az functionapp logs tail --name func-somos-tech-dev-64qb73pzvgekw --resource-group rg-somos-tech-dev
```

### If admin access still doesn't work:
```bash
cd /workspaces/somos-tech-v2/scripts
./debug-admin-access.sh
```

See `ADMIN_ACCESS_DEBUG.md` for detailed troubleshooting steps.
