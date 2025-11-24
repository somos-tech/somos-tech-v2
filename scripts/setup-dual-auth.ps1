#!/usr/bin/env pwsh
# ============================================================================
# Dual Authentication Setup Script for Azure Cloud Shell
# ============================================================================
# This script sets up both admin (AAD) and member (External ID) authentication
# Run this in Azure Cloud Shell with PowerShell
# ============================================================================

Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     SOMOS.tech Dual Authentication Setup                      ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Configuration
$STATIC_WEB_APP_NAME = "swa-somos-tech-dev-64qb73pzvgekw"
$RESOURCE_GROUP = "rg-somos-tech-dev"
$EXTERNAL_ID_TENANT = "ea315caf-5fa1-4348-a3f8-e50867ae19d4"
$REDIRECT_URI = "https://dev.somos.tech/.auth/login/externalId/callback"

Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  Static Web App: $STATIC_WEB_APP_NAME" -ForegroundColor White
Write-Host "  Resource Group: $RESOURCE_GROUP" -ForegroundColor White
Write-Host "  External ID Tenant: $EXTERNAL_ID_TENANT" -ForegroundColor White
Write-Host "  Redirect URI: $REDIRECT_URI" -ForegroundColor White
Write-Host ""

# ============================================================================
# STEP 1: Check for existing Azure AD app (for admin login)
# ============================================================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "STEP 1: Azure AD App for Admin Login (@somos.tech)" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

# Check if there's an existing app
$existingApps = az ad app list --display-name "SOMOS.tech Admin Portal" --query "[].{appId:appId, displayName:displayName}" -o json | ConvertFrom-Json

if ($existingApps.Count -gt 0) {
    Write-Host "✓ Found existing Azure AD app:" -ForegroundColor Green
    $AZURE_CLIENT_ID = $existingApps[0].appId
    Write-Host "  App ID: $AZURE_CLIENT_ID" -ForegroundColor White
    Write-Host ""
    Write-Host "Do you want to create a NEW client secret for this app? (Y/N): " -ForegroundColor Yellow -NoNewline
    $createSecret = Read-Host
    
    if ($createSecret -eq 'Y' -or $createSecret -eq 'y') {
        Write-Host "Creating new client secret..." -ForegroundColor Cyan
        $AZURE_CLIENT_SECRET = az ad app credential reset --id $AZURE_CLIENT_ID --append --query password -o tsv
        Write-Host "✓ Client secret created!" -ForegroundColor Green
        Write-Host "  Secret: $AZURE_CLIENT_SECRET" -ForegroundColor White
        Write-Host "  ⚠️  SAVE THIS SECRET - you cannot retrieve it later!" -ForegroundColor Red
    } else {
        Write-Host "⚠️  You'll need to use an existing secret or create one manually." -ForegroundColor Yellow
        Write-Host "Please enter your existing AZURE_CLIENT_SECRET: " -ForegroundColor Yellow -NoNewline
        $AZURE_CLIENT_SECRET = Read-Host -AsSecureString
        $AZURE_CLIENT_SECRET = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($AZURE_CLIENT_SECRET))
    }
} else {
    Write-Host "Creating new Azure AD app for admin login..." -ForegroundColor Cyan
    
    $adminApp = az ad app create `
        --display-name "SOMOS.tech Admin Portal" `
        --web-redirect-uris "https://dev.somos.tech/.auth/login/aad/callback" `
        --query "{appId:appId}" -o json | ConvertFrom-Json
    
    $AZURE_CLIENT_ID = $adminApp.appId
    
    Write-Host "✓ Azure AD app created!" -ForegroundColor Green
    Write-Host "  App ID: $AZURE_CLIENT_ID" -ForegroundColor White
    
    Write-Host "Creating client secret..." -ForegroundColor Cyan
    $AZURE_CLIENT_SECRET = az ad app credential reset --id $AZURE_CLIENT_ID --append --query password -o tsv
    
    Write-Host "✓ Client secret created!" -ForegroundColor Green
    Write-Host "  Secret: $AZURE_CLIENT_SECRET" -ForegroundColor White
    Write-Host "  ⚠️  SAVE THIS SECRET - you cannot retrieve it later!" -ForegroundColor Red
}

Write-Host ""
Write-Host "Press Enter to continue to Step 2..." -ForegroundColor Yellow
Read-Host

# ============================================================================
# STEP 2: Create External ID app (for member login)
# ============================================================================
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "STEP 2: External ID App for Member Login (Microsoft/Google)" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

Write-Host "Switching to External ID tenant..." -ForegroundColor Cyan
az login --tenant $EXTERNAL_ID_TENANT --allow-no-subscriptions --only-show-errors

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Successfully logged into External ID tenant" -ForegroundColor Green
    Write-Host ""
    
    # Check for existing app
    $existingExternalApps = az ad app list --display-name "SOMOS.tech Member Portal" --query "[].{appId:appId, displayName:displayName}" -o json | ConvertFrom-Json
    
    if ($existingExternalApps.Count -gt 0) {
        Write-Host "✓ Found existing External ID app:" -ForegroundColor Green
        $EXTERNAL_ID_CLIENT_ID = $existingExternalApps[0].appId
        Write-Host "  App ID: $EXTERNAL_ID_CLIENT_ID" -ForegroundColor White
        Write-Host ""
        Write-Host "Do you want to create a NEW client secret for this app? (Y/N): " -ForegroundColor Yellow -NoNewline
        $createSecret = Read-Host
        
        if ($createSecret -eq 'Y' -or $createSecret -eq 'y') {
            Write-Host "Creating new client secret..." -ForegroundColor Cyan
            $EXTERNAL_ID_CLIENT_SECRET = az ad app credential reset --id $EXTERNAL_ID_CLIENT_ID --append --query password -o tsv
            Write-Host "✓ Client secret created!" -ForegroundColor Green
            Write-Host "  Secret: $EXTERNAL_ID_CLIENT_SECRET" -ForegroundColor White
            Write-Host "  ⚠️  SAVE THIS SECRET - you cannot retrieve it later!" -ForegroundColor Red
        } else {
            Write-Host "⚠️  You'll need to use an existing secret or create one manually." -ForegroundColor Yellow
            Write-Host "Please enter your existing EXTERNAL_ID_CLIENT_SECRET: " -ForegroundColor Yellow -NoNewline
            $EXTERNAL_ID_CLIENT_SECRET = Read-Host -AsSecureString
            $EXTERNAL_ID_CLIENT_SECRET = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($EXTERNAL_ID_CLIENT_SECRET))
        }
    } else {
        Write-Host "Creating External ID app registration..." -ForegroundColor Cyan
        
        $externalApp = az ad app create `
            --display-name "SOMOS.tech Member Portal" `
            --web-redirect-uris $REDIRECT_URI `
            --query "{appId:appId}" -o json | ConvertFrom-Json
        
        $EXTERNAL_ID_CLIENT_ID = $externalApp.appId
        
        Write-Host "✓ External ID app created!" -ForegroundColor Green
        Write-Host "  App ID: $EXTERNAL_ID_CLIENT_ID" -ForegroundColor White
        
        Write-Host "Creating client secret..." -ForegroundColor Cyan
        $EXTERNAL_ID_CLIENT_SECRET = az ad app credential reset --id $EXTERNAL_ID_CLIENT_ID --append --query password -o tsv
        
        Write-Host "✓ Client secret created!" -ForegroundColor Green
        Write-Host "  Secret: $EXTERNAL_ID_CLIENT_SECRET" -ForegroundColor White
        Write-Host "  ⚠️  SAVE THIS SECRET - you cannot retrieve it later!" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "📝 IMPORTANT: Configure identity providers in the Azure Portal:" -ForegroundColor Yellow
    Write-Host "   1. Go to https://portal.azure.com" -ForegroundColor White
    Write-Host "   2. Navigate to External ID tenant: $EXTERNAL_ID_TENANT" -ForegroundColor White
    Write-Host "   3. Go to Applications > App registrations > SOMOS.tech Member Portal" -ForegroundColor White
    Write-Host "   4. Under 'Authentication', configure Microsoft and Google identity providers" -ForegroundColor White
    Write-Host "   5. Disable password-based signup" -ForegroundColor White
    
} else {
    Write-Host "✗ Failed to login to External ID tenant" -ForegroundColor Red
    Write-Host "Please run this command manually:" -ForegroundColor Yellow
    Write-Host "  az login --tenant $EXTERNAL_ID_TENANT --allow-no-subscriptions" -ForegroundColor Gray
    exit 1
}

Write-Host ""
Write-Host "Press Enter to continue to Step 3..." -ForegroundColor Yellow
Read-Host

# ============================================================================
# STEP 3: Switch back and update Static Web App settings
# ============================================================================
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "STEP 3: Update Static Web App Configuration" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

Write-Host "Switching back to your subscription..." -ForegroundColor Cyan
az account set --subscription (az account list --query "[?isDefault].id" -o tsv)

Write-Host "✓ Switched back to default subscription" -ForegroundColor Green
Write-Host ""

Write-Host "Updating Static Web App settings..." -ForegroundColor Cyan

# Update all four settings at once
az staticwebapp appsettings set `
    --name $STATIC_WEB_APP_NAME `
    --resource-group $RESOURCE_GROUP `
    --setting-names `
        "AZURE_CLIENT_ID=$AZURE_CLIENT_ID" `
        "AZURE_CLIENT_SECRET=$AZURE_CLIENT_SECRET" `
        "EXTERNAL_ID_CLIENT_ID=$EXTERNAL_ID_CLIENT_ID" `
        "EXTERNAL_ID_CLIENT_SECRET=$EXTERNAL_ID_CLIENT_SECRET" `
    --output none

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Static Web App settings updated successfully!" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to update Static Web App settings" -ForegroundColor Red
    Write-Host "Please update manually in Azure Portal or run:" -ForegroundColor Yellow
    Write-Host "  az staticwebapp appsettings set --name $STATIC_WEB_APP_NAME --resource-group $RESOURCE_GROUP --setting-names ..." -ForegroundColor Gray
}

# ============================================================================
# STEP 4: Summary and Next Steps
# ============================================================================
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "✓ Setup Complete!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

Write-Host "Summary of Configuration:" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""
Write-Host "Admin Login (Azure AD):" -ForegroundColor Yellow
Write-Host "  Client ID: $AZURE_CLIENT_ID" -ForegroundColor White
Write-Host "  Redirect URI: https://dev.somos.tech/.auth/login/aad/callback" -ForegroundColor White
Write-Host ""
Write-Host "Member Login (External ID):" -ForegroundColor Yellow
Write-Host "  Client ID: $EXTERNAL_ID_CLIENT_ID" -ForegroundColor White
Write-Host "  Tenant: $EXTERNAL_ID_TENANT" -ForegroundColor White
Write-Host "  Redirect URI: $REDIRECT_URI" -ForegroundColor White
Write-Host ""

Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""
Write-Host "1. Configure External ID identity providers:" -ForegroundColor Yellow
Write-Host "   • Go to Azure Portal > External ID tenant" -ForegroundColor White
Write-Host "   • Add Microsoft and Google as identity providers" -ForegroundColor White
Write-Host "   • Disable password authentication" -ForegroundColor White
Write-Host ""
Write-Host "2. Test the flows:" -ForegroundColor Yellow
Write-Host "   • Admin: https://dev.somos.tech/admin/login" -ForegroundColor White
Write-Host "   • Member: https://dev.somos.tech/register" -ForegroundColor White
Write-Host ""
Write-Host "3. Wait for Static Web App deployment to complete (automatic from GitHub)" -ForegroundColor Yellow
Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "All done! 🎉" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

