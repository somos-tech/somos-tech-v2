# GitHub Secrets & Variables Setup

## 🔴 CURRENT ISSUE
GitHub Actions authentication is failing because `AZURE_CREDENTIALS` has an invalid/expired client secret.

## ✅ SOLUTION

### 1. Update AZURE_CREDENTIALS Secret

**The new JSON is in your clipboard!**

Go to: https://github.com/somos-tech/somos-tech-v2/settings/secrets/actions

#### New Value:
```json
{
  "clientId": "<your-client-id>",
  "clientSecret": "<generated-client-secret>",
  "subscriptionId": "<your-subscription-id>",
  "tenantId": "<your-tenant-id>"
}
```

**Note: The actual credentials were provided to you separately and should NOT be committed to the repository.**

#### Steps:
1. Click on `AZURE_CREDENTIALS` in the secrets list
2. Click "Update secret" button
3. Press Ctrl+A to select all in the text box
4. Press Ctrl+V to paste the new JSON
5. Click the green "Update secret" button

### 2. Verify GitHub Variables

Go to: https://github.com/somos-tech/somos-tech-v2/settings/variables/actions

Should have:
- ✅ `VITE_API_URL` = `https://func-somos-tech-dev-64qb73pzvgekw.azurewebsites.net`
- ✅ `AZURE_FUNCTIONAPP_NAME` = `func-somos-tech-dev-64qb73pzvgekw`

### 3. Re-run Failed Workflow

Go to: https://github.com/somos-tech/somos-tech-v2/actions

1. Click on the failed "Deploy Function App" workflow
2. Click "Re-run failed jobs" or "Re-run all jobs"
3. Watch it succeed! ✅

## 📋 Complete Checklist

### Secrets (at /settings/secrets/actions):
- [x] `AZURE_STATIC_WEB_APPS_API_TOKEN` - Already set ✅
- [ ] `AZURE_CREDENTIALS` - **UPDATE THIS NOW** ⚠️

### Variables (at /settings/variables/actions):
- [ ] `VITE_API_URL` - Should already be set ✅
- [ ] `AZURE_FUNCTIONAPP_NAME` - Should already be set ✅

## 🔍 Expected Result

After updating the secret and re-running the workflow, you should see:
- ✅ Login to Azure (SUCCESS)
- ✅ Deploy to Azure Functions (SUCCESS)
- ✅ Azure logout (SUCCESS)

## 🆘 Troubleshooting

If you still get authentication errors:
1. Make sure you pasted the ENTIRE JSON including the curly braces `{ }`
2. Make sure there are no extra spaces or characters
3. Make sure you clicked "Update secret" (not "Cancel")
4. Try re-running the workflow again

## 📚 Reference

Service Principal Details:
- **Client ID**: `<your-client-id>`
- **Tenant ID**: `<your-tenant-id>`
- **Subscription ID**: `<your-subscription-id>`
- **Client Secret**: Generated fresh and provided separately (NOT in this file)

Resource Group: `rg-somos-tech-dev`
Location: `westus2`
