#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Configure dual authentication for SOMOS.tech Static Web App

.DESCRIPTION
    This script configures both Azure AD (for admin @somos.tech accounts) and
    External ID (for member Microsoft/Google accounts) authentication providers
    in the Static Web App.

.NOTES
    Prerequisites:
    1. You must have completed the External ID tenant setup
    2. You need the following values:
       - AZURE_CLIENT_ID (for admin login)
       - AZURE_CLIENT_SECRET (for admin login)
       - EXTERNAL_ID_CLIENT_ID (from External ID tenant)
       - EXTERNAL_ID_CLIENT_SECRET (from External ID tenant)
#>

param(
    [Parameter(Mandatory=$false)]
    [string]$Environment = "dev"
)

Write-Host "╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     SOMOS.tech Dual Authentication Configuration                ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Configuration
$ResourceGroup = "rg-somos-tech-$Environment"
$StaticWebAppName = "swa-somos-tech-$Environment-64qb73pzvgekw"

Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host "Resource Group: $ResourceGroup" -ForegroundColor Yellow
Write-Host "Static Web App: $StaticWebAppName`n" -ForegroundColor Yellow

# Check if already logged in to Azure
Write-Host "Checking Azure login status..." -ForegroundColor Cyan
$account = az account show 2>$null | ConvertFrom-Json
if (-not $account) {
    Write-Host "Not logged in. Please log in to Azure..." -ForegroundColor Yellow
    az login
}

Write-Host "✓ Logged in as: $($account.user.name)`n" -ForegroundColor Green

# Collect credentials
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "STEP 1: Azure AD Credentials (Admin Login - @somos.tech)" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════════`n" -ForegroundColor Cyan

Write-Host "Do you have an existing Azure AD app registration for admin login? (Y/N): " -ForegroundColor Yellow -NoNewline
$hasAdminApp = Read-Host

if ($hasAdminApp -eq 'Y' -or $hasAdminApp -eq 'y') {
    $AZURE_CLIENT_ID = Read-Host "Enter AZURE_CLIENT_ID (Application ID)"
    $AZURE_CLIENT_SECRET = Read-Host "Enter AZURE_CLIENT_SECRET" -AsSecureString
    $AZURE_CLIENT_SECRET_PLAIN = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($AZURE_CLIENT_SECRET)
    )
} else {
    Write-Host "`nCreating new Azure AD app registration..." -ForegroundColor Cyan
    
    $redirectUri = "https://dev.somos.tech/.auth/login/aad/callback"
    
    # Get current tenant info
    $currentTenant = az account show --query tenantId -o tsv
    
    Write-Host "Creating app registration in tenant: $currentTenant" -ForegroundColor Yellow
    
    $adminApp = az ad app create `
        --display-name "SOMOS.tech Admin Portal" `
        --web-redirect-uris $redirectUri `
        --query "{appId:appId, id:id}" `
        -o json | ConvertFrom-Json
    
    if ($adminApp) {
        Write-Host "✓ App registration created!" -ForegroundColor Green
        $AZURE_CLIENT_ID = $adminApp.appId
        Write-Host "  App ID: $AZURE_CLIENT_ID" -ForegroundColor White
        
        # Create client secret
        Write-Host "`nCreating client secret..." -ForegroundColor Cyan
        $AZURE_CLIENT_SECRET_PLAIN = az ad app credential reset `
            --id $adminApp.appId `
            --append `
            --query password `
            -o tsv
        
        Write-Host "✓ Client secret created!" -ForegroundColor Green
        Write-Host "  Secret: $AZURE_CLIENT_SECRET_PLAIN" -ForegroundColor White
        Write-Host "`n⚠️  Save this secret - you cannot retrieve it later!`n" -ForegroundColor Red
    } else {
        Write-Host "✗ Failed to create app registration" -ForegroundColor Red
        exit 1
    }
}

Write-Host "`n═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "STEP 2: External ID Credentials (Member Login - Microsoft/Google)" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════════`n" -ForegroundColor Cyan

Write-Host "Enter credentials from External ID tenant setup:`n" -ForegroundColor Yellow

$EXTERNAL_ID_CLIENT_ID = Read-Host "Enter EXTERNAL_ID_CLIENT_ID (Application ID)"
$EXTERNAL_ID_CLIENT_SECRET = Read-Host "Enter EXTERNAL_ID_CLIENT_SECRET" -AsSecureString
$EXTERNAL_ID_CLIENT_SECRET_PLAIN = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($EXTERNAL_ID_CLIENT_SECRET)
)

Write-Host "`n═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "STEP 3: Configuring Static Web App" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════════`n" -ForegroundColor Cyan

Write-Host "Setting authentication configuration..." -ForegroundColor Cyan

# Configure app settings
$settings = @(
    "AZURE_CLIENT_ID=$AZURE_CLIENT_ID"
    "AZURE_CLIENT_SECRET=$AZURE_CLIENT_SECRET_PLAIN"
    "EXTERNAL_ID_CLIENT_ID=$EXTERNAL_ID_CLIENT_ID"
    "EXTERNAL_ID_CLIENT_SECRET=$EXTERNAL_ID_CLIENT_SECRET_PLAIN"
)

Write-Host "Updating Static Web App settings..." -ForegroundColor Yellow

try {
    az staticwebapp appsettings set `
        --name $StaticWebAppName `
        --resource-group $ResourceGroup `
        --setting-names $settings `
        --output none
    
    Write-Host "✓ Configuration complete!`n" -ForegroundColor Green
    
    Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "Summary" -ForegroundColor Green
    Write-Host "═══════════════════════════════════════════════════════════════════`n" -ForegroundColor Cyan
    
    Write-Host "✓ Azure AD (Admin) configured" -ForegroundColor Green
    Write-Host "  Client ID: $AZURE_CLIENT_ID" -ForegroundColor White
    Write-Host "  Login URL: /admin/login`n" -ForegroundColor White
    
    Write-Host "✓ External ID (Members) configured" -ForegroundColor Green
    Write-Host "  Client ID: $EXTERNAL_ID_CLIENT_ID" -ForegroundColor White
    Write-Host "  Login URL: /login or /register`n" -ForegroundColor White
    
    Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "Next Steps" -ForegroundColor Green
    Write-Host "═══════════════════════════════════════════════════════════════════`n" -ForegroundColor Cyan
    
    Write-Host "1. Wait 2-3 minutes for Static Web App to restart" -ForegroundColor Yellow
    Write-Host "2. Test admin login at: https://dev.somos.tech/admin/login" -ForegroundColor Yellow
    Write-Host "3. Test member login at: https://dev.somos.tech/login" -ForegroundColor Yellow
    Write-Host "4. Test member signup at: https://dev.somos.tech/register`n" -ForegroundColor Yellow
    
    Write-Host "═══════════════════════════════════════════════════════════════════`n" -ForegroundColor Cyan
    
} catch {
    Write-Host "✗ Error configuring Static Web App: $_" -ForegroundColor Red
    exit 1
}

Write-Host "Configuration complete! 🎉`n" -ForegroundColor Green

