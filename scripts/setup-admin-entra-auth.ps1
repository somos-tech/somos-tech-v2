# Setup Admin Portal Entra ID Authentication
# This script configures the Azure Static Web App with the new admin Entra ID authentication
#
# Admin Portal Authentication Details:
# - Tenant ID: cff2ae9c-4810-4a92-a3e8-46e649cbdbe4
# - App Name: SOMOS.tech Admin Portal
# - App ID (Client ID): dcf7379e-4576-4544-893f-77d6649390d3
# - Object ID: 44d376b6-446d-4a53-8a9f-64e4a5ef789b
#
# Member App: Uses separate CIAM provider (unchanged)

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('dev', 'prod')]
    [string]$Environment = 'dev',
    
    [Parameter(Mandatory=$true)]
    [string]$AdminClientSecret,
    
    [Parameter(Mandatory=$false)]
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

# Configuration
$config = @{
    dev = @{
        resourceGroup = "rg-somos-tech-dev"
        staticWebAppName = "swa-somos-tech-dev-64qb73pzvgekw"
    }
    prod = @{
        resourceGroup = "rg-somos-tech-prod"
        staticWebAppName = "swa-somos-tech-prod-tpthmei7wzupi"
    }
}

# Admin Entra ID Configuration
$adminEntraConfig = @{
    tenantId = "cff2ae9c-4810-4a92-a3e8-46e649cbdbe4"
    clientId = "dcf7379e-4576-4544-893f-77d6649390d3"
    objectId = "44d376b6-446d-4a53-8a9f-64e4a5ef789b"
    appName = "SOMOS.tech Admin Portal"
}

$envConfig = $config[$Environment]

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Admin Portal Entra ID Authentication Setup" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host "Static Web App: $($envConfig.staticWebAppName)" -ForegroundColor Yellow
Write-Host "Resource Group: $($envConfig.resourceGroup)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Admin Entra ID Configuration:" -ForegroundColor Green
Write-Host "  Tenant ID: $($adminEntraConfig.tenantId)"
Write-Host "  Client ID: $($adminEntraConfig.clientId)"
Write-Host "  App Name: $($adminEntraConfig.appName)"
Write-Host ""

if ($DryRun) {
    Write-Host "[DRY RUN] No changes will be made" -ForegroundColor Magenta
    Write-Host ""
}

# Step 1: Verify Azure CLI is logged in
Write-Host "Step 1: Verifying Azure CLI login..." -ForegroundColor Cyan
try {
    $account = az account show 2>&1 | ConvertFrom-Json
    Write-Host "  Logged in as: $($account.user.name)" -ForegroundColor Green
    Write-Host "  Subscription: $($account.name)" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: Not logged in to Azure CLI. Please run 'az login' first." -ForegroundColor Red
    exit 1
}

# Step 2: Verify Static Web App exists
Write-Host ""
Write-Host "Step 2: Verifying Static Web App exists..." -ForegroundColor Cyan
$swaCheck = az staticwebapp show --name $envConfig.staticWebAppName --resource-group $envConfig.resourceGroup 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERROR: Static Web App not found: $($envConfig.staticWebAppName)" -ForegroundColor Red
    exit 1
}
Write-Host "  Static Web App found!" -ForegroundColor Green

# Step 3: Set Application Settings
Write-Host ""
Write-Host "Step 3: Setting application settings for admin authentication..." -ForegroundColor Cyan

$settingsToSet = @(
    "ADMIN_AAD_CLIENT_ID=$($adminEntraConfig.clientId)",
    "ADMIN_AAD_CLIENT_SECRET=$AdminClientSecret"
)

Write-Host "  Settings to configure:"
Write-Host "    - ADMIN_AAD_CLIENT_ID: $($adminEntraConfig.clientId)"
Write-Host "    - ADMIN_AAD_CLIENT_SECRET: [REDACTED]"

if (-not $DryRun) {
    $result = az staticwebapp appsettings set `
        --name $envConfig.staticWebAppName `
        --resource-group $envConfig.resourceGroup `
        --setting-names $settingsToSet `
        2>&1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ERROR: Failed to set application settings" -ForegroundColor Red
        Write-Host $result
        exit 1
    }
    Write-Host "  Application settings configured successfully!" -ForegroundColor Green
} else {
    Write-Host "  [DRY RUN] Would set application settings" -ForegroundColor Magenta
}

# Step 4: Display callback URLs that need to be configured in Entra ID
Write-Host ""
Write-Host "Step 4: Required Entra ID App Registration Configuration" -ForegroundColor Cyan
Write-Host ""
Write-Host "You need to configure the following in the Azure Portal for app '$($adminEntraConfig.appName)':" -ForegroundColor Yellow
Write-Host ""

if ($Environment -eq "dev") {
    $swaHost = "dev.somos.tech"
    $fdHost = "fd-somostech-ehgfhqcpa2bka7dt.z02.azurefd.net"
} else {
    $swaHost = "somos.tech"
    $fdHost = "prod.somos.tech"
}

Write-Host "  Redirect URIs (Authentication > Add a platform > Web):" -ForegroundColor Green
Write-Host "    https://$swaHost/.auth/login/aad/callback"
Write-Host "    https://$fdHost/.auth/login/aad/callback"
Write-Host ""
Write-Host "  Front-channel logout URL:" -ForegroundColor Green
Write-Host "    https://$swaHost/.auth/logout/aad/callback"
Write-Host ""
Write-Host "  Supported account types:" -ForegroundColor Green
Write-Host "    Accounts in this organizational directory only (Single tenant)"
Write-Host ""
Write-Host "  API Permissions (should already be configured):" -ForegroundColor Green
Write-Host "    - Microsoft Graph: User.Read (Delegated)"
Write-Host "    - Microsoft Graph: openid, profile, email (Delegated)"
Write-Host ""

# Step 5: Summary
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Setup Summary" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Admin Login URL: https://$swaHost/.auth/login/aad" -ForegroundColor Green
Write-Host "Member Login URL: https://$swaHost/.auth/login/member" -ForegroundColor Green
Write-Host ""
Write-Host "The staticwebapp.config.json needs to be updated with the new tenant ID." -ForegroundColor Yellow
Write-Host "The frontend login components need to route users to the correct IDP based on the app type." -ForegroundColor Yellow
Write-Host ""

if (-not $DryRun) {
    Write-Host "Done! Application settings have been configured." -ForegroundColor Green
} else {
    Write-Host "[DRY RUN] Complete. No changes were made." -ForegroundColor Magenta
}
