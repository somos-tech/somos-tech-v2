# Admin Dashboard Access Troubleshooting

## Issue
User `jcruz@somos.tech` cannot access the "User Management" admin dashboard.

## Root Causes Identified

### 1. ✅ FIXED: Corrupted API Code
**Problem:** The `adminUsers.js` API function had duplicated and misplaced code that would cause UPDATE and DELETE operations to fail.

**Status:** Fixed in commit

**What was fixed:**
- Removed duplicate code blocks in PUT handler
- Fixed missing `if (method === 'DELETE')` condition
- Properly structured the update logic to set fields before replacing document

---

### 2. ⚠️ REQUIRES ACTION: Missing Database Entry
**Problem:** User might not exist in the `admin-users` Cosmos DB container.

**How to fix:**
```bash
# 1. Login to Azure
az login

# 2. Run the debug script
cd /workspaces/somos-tech-v2/scripts
./debug-admin-access.sh
```

Or manually:
```bash
cd /workspaces/somos-tech-v2/scripts
node add-jcruz-admin.js
```

---

### 3. ✅ FIXED: Missing Environment Configuration
**Problem:** `.env.local` file was missing with `VITE_API_URL` configuration.

**Status:** Created `.env.local` with correct API URL

**File:** `/workspaces/somos-tech-v2/apps/web/.env.local`
```env
VITE_API_URL=https://func-somos-tech-dev-64qb73pzvgekw.azurewebsites.net
```

---

## Complete Debugging Steps

### Step 1: Login to Azure
```bash
az login
```

### Step 2: Run Automated Debug Script
```bash
cd /workspaces/somos-tech-v2/scripts
./debug-admin-access.sh
```

This script will:
- ✅ Check Azure login status
- ✅ Check if jcruz@somos.tech exists in database
- ✅ Add/update jcruz@somos.tech as admin
- ✅ Verify environment configuration
- ✅ Test API endpoints

### Step 3: Deploy Fixed API Code
The API code has been fixed, but needs to be deployed:

```bash
cd /workspaces/somos-tech-v2
# Deploy the API changes
./scripts/deploy-api.ps1  # or deploy-api-simple.ps1
```

### Step 4: Restart Development Server
If testing locally:
```bash
cd /workspaces/somos-tech-v2/apps/web
npm run dev
```

### Step 5: Clear Browser Cache & Re-authenticate
1. Open browser DevTools (F12)
2. Go to Application > Storage > Clear site data
3. Navigate to your app URL
4. You may need to logout and login again via Azure AD
5. Try accessing `/admin/users`

---

## How the Authentication Flow Works

### 1. User Login (Azure AD)
- User clicks login
- Redirected to `/.auth/login/aad`
- Azure AD authenticates user
- Returns to app with session

### 2. Role Assignment (GetUserRoles Function)
- Azure Static Web Apps calls `GetUserRoles` API function
- Function checks if user email ends with `@somos.tech`
- If yes, queries `admin-users` container in Cosmos DB
- Auto-registers user if not found
- Returns roles: `["authenticated", "admin"]`

### 3. Frontend Admin Check (check-admin.js)
- Frontend calls `/api/check-admin` (Static Web App API)
- This endpoint receives auth headers from SWA
- Calls main API to check `admin-users` container
- Returns `{ isAdmin: true/false }`

### 4. Route Protection (ProtectedRoute.tsx)
- Checks `isAdmin` from `useAuth()` hook
- If `requireAdmin={true}` and user is not admin
- Redirects to `/unauthorized` page

---

## Verification Checklist

After running the steps above:

- [ ] Azure login successful
- [ ] jcruz@somos.tech exists in `admin-users` container with:
  - `status: "active"`
  - `roles: ["admin", "authenticated"]`
- [ ] `.env.local` file exists with correct `VITE_API_URL`
- [ ] API endpoints return HTTP 200:
  - `GET /api/GetUserRoles`
  - `GET /api/admin-users/jcruz@somos.tech`
- [ ] Fixed API code deployed to Azure
- [ ] Browser cache cleared
- [ ] User logged out and back in
- [ ] Can access `/admin/users` page

---

## Testing Admin Access

### Browser Console Tests

Open DevTools Console and run:

```javascript
// Test 1: Check authentication
fetch('/.auth/me')
  .then(r => r.json())
  .then(d => console.log('Auth:', d));

// Test 2: Check admin status
fetch('/api/check-admin')
  .then(r => r.json())
  .then(d => console.log('Admin Check:', d));

// Test 3: Check admin user in database
fetch('/api/admin-users/jcruz@somos.tech')
  .then(r => r.json())
  .then(d => console.log('Admin User:', d));
```

Expected results:
1. **Auth:** Should show `clientPrincipal` with email `jcruz@somos.tech`
2. **Admin Check:** Should show `{ isAdmin: true, authenticated: true }`
3. **Admin User:** Should show user object with `status: "active"` and `roles: ["admin", "authenticated"]`

---

## Common Issues & Solutions

### Issue: "403 Forbidden" or "Unauthorized"
**Solution:** User not in `admin-users` container or status is not "active"
```bash
node /workspaces/somos-tech-v2/scripts/add-jcruz-admin.js
```

### Issue: "Admin user not found"
**Solution:** Run the add-admin script and redeploy API

### Issue: API returns 500 errors
**Solution:** Check Azure Function App logs for errors:
```bash
az functionapp logs tail --name func-somos-tech-dev-64qb73pzvgekw --resource-group rg-somos-tech-dev
```

### Issue: `VITE_API_URL` undefined
**Solution:** Create/update `.env.local` and restart dev server

### Issue: Changes not taking effect
**Solution:**
1. Clear browser cache completely
2. Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
3. Logout and login again
4. Verify correct environment is running (dev vs prod)

---

## Production Deployment

Once everything works locally, deploy to production:

```bash
# Deploy API
cd /workspaces/somos-tech-v2
./scripts/deploy-api.ps1

# Deploy Web App (will be automatic via GitHub Actions)
git add .
git commit -m "Fix admin users API and add jcruz@somos.tech"
git push origin main
```

---

## Summary of Changes Made

1. ✅ Fixed corrupted code in `/apps/api/functions/adminUsers.js`
   - Fixed PUT handler to properly update user fields
   - Fixed DELETE handler to have proper `if (method === 'DELETE')` block
   - Removed duplicate code

2. ✅ Created `.env.local` with correct `VITE_API_URL`

3. ✅ Created helper scripts:
   - `add-jcruz-admin.js` - Adds/updates jcruz@somos.tech as admin
   - `debug-admin-access.sh` - Complete debugging workflow

---

## Next Actions Required

Run this command to complete the setup:

```bash
cd /workspaces/somos-tech-v2/scripts
./debug-admin-access.sh
```

Then verify access by:
1. Restarting the dev server
2. Clearing browser cache
3. Logging in as jcruz@somos.tech
4. Navigating to `/admin/users`
