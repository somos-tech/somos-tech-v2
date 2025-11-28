#!/usr/bin/env pwsh
# ============================================================================
# SOMOS.tech - Auth0 CIAM Setup Script
# ============================================================================
# This script sets up Auth0 as the identity provider for SOMOS.tech Members
# replacing the previous Microsoft CIAM (External ID) solution.
#
# IMPORTANT: Admin authentication remains on Entra ID (unchanged)
#
# Identity Providers:
# - Admin Portal (/admin/*): Entra ID (aad) - tenant cff2ae9c-4810-4a92-a3e8-46e649cbdbe4
# - Member App (/member/*): Auth0 (auth0) - custom OIDC provider
#
# Prerequisites:
# 1. Auth0 Account (https://auth0.com)
# 2. Azure CLI installed and logged in
# 3. Static Web Apps CLI (optional, for local testing)
#
# ============================================================================

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('dev', 'prod')]
    [string]$Environment = 'dev',
    
    [Parameter(Mandatory=$true)]
    [string]$Auth0Domain,
    
    [Parameter(Mandatory=$true)]
    [string]$Auth0ClientId,
    
    [Parameter(Mandatory=$true)]
    [string]$Auth0ClientSecret,
    
    [Parameter(Mandatory=$false)]
    [switch]$DryRun,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipAzureConfig
)

$ErrorActionPreference = "Stop"

# ============================================================================
# Configuration
# ============================================================================

$config = @{
    dev = @{
        resourceGroup = "rg-somos-tech-dev"
        staticWebAppName = "swa-somos-tech-dev-64qb73pzvgekw"
        customDomain = "dev.somos.tech"
        frontDoorHost = "fd-somostech-ehgfhqcpa2bka7dt.z02.azurefd.net"
    }
    prod = @{
        resourceGroup = "rg-somos-tech-prod"
        staticWebAppName = "swa-somos-tech-prod-tpthmei7wzupi"
        customDomain = "somos.tech"
        frontDoorHost = "prod.somos.tech"
    }
}

$envConfig = $config[$Environment]

# Auth0 Configuration
$auth0Config = @{
    domain = $Auth0Domain
    clientId = $Auth0ClientId
    clientSecret = $Auth0ClientSecret
    # Auth0 well-known configuration endpoint
    wellKnownUrl = "https://$Auth0Domain/.well-known/openid-configuration"
}

# ============================================================================
# Display Banner
# ============================================================================

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║       SOMOS.tech - Auth0 CIAM Member Authentication Setup      ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host "Static Web App: $($envConfig.staticWebAppName)" -ForegroundColor Yellow
Write-Host "Resource Group: $($envConfig.resourceGroup)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Auth0 Configuration:" -ForegroundColor Green
Write-Host "  Domain: $($auth0Config.domain)"
Write-Host "  Client ID: $($auth0Config.clientId)"
Write-Host "  Well-Known URL: $($auth0Config.wellKnownUrl)"
Write-Host ""

if ($DryRun) {
    Write-Host "[DRY RUN MODE] No changes will be made to Azure resources" -ForegroundColor Magenta
    Write-Host ""
}

# ============================================================================
# Step 1: Verify Auth0 OpenID Configuration
# ============================================================================

Write-Host "Step 1: Verifying Auth0 OpenID Connect configuration..." -ForegroundColor Cyan

try {
    $oidcConfig = Invoke-RestMethod -Uri $auth0Config.wellKnownUrl -Method Get
    Write-Host "  ✓ Auth0 OIDC metadata retrieved successfully" -ForegroundColor Green
    Write-Host "    Issuer: $($oidcConfig.issuer)"
    Write-Host "    Authorization Endpoint: $($oidcConfig.authorization_endpoint)"
    Write-Host "    Token Endpoint: $($oidcConfig.token_endpoint)"
} catch {
    Write-Host "  ✗ Failed to retrieve Auth0 OIDC metadata" -ForegroundColor Red
    Write-Host "    Error: $_"
    Write-Host ""
    Write-Host "  Please verify your Auth0 domain is correct: $($auth0Config.domain)" -ForegroundColor Yellow
    exit 1
}

# ============================================================================
# Step 2: Verify Azure CLI Login
# ============================================================================

if (-not $SkipAzureConfig) {
    Write-Host ""
    Write-Host "Step 2: Verifying Azure CLI login..." -ForegroundColor Cyan
    
    try {
        $account = az account show 2>&1 | ConvertFrom-Json
        Write-Host "  ✓ Logged in as: $($account.user.name)" -ForegroundColor Green
        Write-Host "    Subscription: $($account.name)"
    } catch {
        Write-Host "  ✗ Not logged in to Azure CLI" -ForegroundColor Red
        Write-Host "    Please run 'az login' first." -ForegroundColor Yellow
        exit 1
    }
    
    # Verify Static Web App exists
    Write-Host ""
    Write-Host "Step 3: Verifying Static Web App exists..." -ForegroundColor Cyan
    
    $swaCheck = az staticwebapp show --name $envConfig.staticWebAppName --resource-group $envConfig.resourceGroup 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ✗ Static Web App not found: $($envConfig.staticWebAppName)" -ForegroundColor Red
        exit 1
    }
    Write-Host "  ✓ Static Web App found!" -ForegroundColor Green

    # ============================================================================
    # Step 4: Set Application Settings
    # ============================================================================

    Write-Host ""
    Write-Host "Step 4: Setting application settings for Auth0..." -ForegroundColor Cyan
    
    $settingsToSet = @(
        "AUTH0_CLIENT_ID=$($auth0Config.clientId)",
        "AUTH0_CLIENT_SECRET=$($auth0Config.clientSecret)",
        "AUTH0_DOMAIN=$($auth0Config.domain)"
    )
    
    Write-Host "  Settings to configure:"
    Write-Host "    - AUTH0_CLIENT_ID: $($auth0Config.clientId)"
    Write-Host "    - AUTH0_CLIENT_SECRET: [REDACTED]"
    Write-Host "    - AUTH0_DOMAIN: $($auth0Config.domain)"
    
    if (-not $DryRun) {
        $result = az staticwebapp appsettings set `
            --name $envConfig.staticWebAppName `
            --resource-group $envConfig.resourceGroup `
            --setting-names $settingsToSet `
            2>&1
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  ✗ Failed to set application settings" -ForegroundColor Red
            Write-Host $result
            exit 1
        }
        Write-Host "  ✓ Application settings configured successfully!" -ForegroundColor Green
    } else {
        Write-Host "  [DRY RUN] Would set application settings" -ForegroundColor Magenta
    }
}

# ============================================================================
# Step 5: Generate staticwebapp.config.json Configuration
# ============================================================================

Write-Host ""
Write-Host "Step 5: Generating staticwebapp.config.json auth configuration..." -ForegroundColor Cyan

$auth0ProviderConfig = @"

    // ========================================
    // Auth0 OIDC Provider Configuration
    // ========================================
    // Replace the existing 'member' provider in customOpenIdConnectProviders with:
    
    "auth0": {
        "registration": {
            "clientIdSettingName": "AUTH0_CLIENT_ID",
            "clientCredential": {
                "clientSecretSettingName": "AUTH0_CLIENT_SECRET"
            },
            "openIdConnectConfiguration": {
                "wellKnownOpenIdConfiguration": "https://$($auth0Config.domain)/.well-known/openid-configuration"
            }
        },
        "login": {
            "nameClaimType": "name",
            "scopes": ["openid", "profile", "email"],
            "loginParameterNames": []
        }
    }

"@

Write-Host $auth0ProviderConfig -ForegroundColor Gray

# ============================================================================
# Step 6: Display Required Auth0 Application Configuration
# ============================================================================

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "  Auth0 Application Configuration Required" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host ""
Write-Host "Configure the following in your Auth0 Dashboard:" -ForegroundColor White
Write-Host ""
Write-Host "1. Application Settings:" -ForegroundColor Green
Write-Host "   - Application Type: Regular Web Application"
Write-Host "   - Token Endpoint Authentication Method: Post"
Write-Host ""
Write-Host "2. Allowed Callback URLs:" -ForegroundColor Green
Write-Host "   https://$($envConfig.customDomain)/.auth/login/auth0/callback"
Write-Host "   https://$($envConfig.frontDoorHost)/.auth/login/auth0/callback"
Write-Host "   https://$($envConfig.staticWebAppName).westus2.azurestaticapps.net/.auth/login/auth0/callback"
Write-Host ""
Write-Host "3. Allowed Logout URLs:" -ForegroundColor Green
Write-Host "   https://$($envConfig.customDomain)/.auth/logout/auth0/callback"
Write-Host "   https://$($envConfig.frontDoorHost)/.auth/logout/auth0/callback"
Write-Host "   https://$($envConfig.staticWebAppName).westus2.azurestaticapps.net/.auth/logout/auth0/callback"
Write-Host ""
Write-Host "4. Allowed Web Origins:" -ForegroundColor Green
Write-Host "   https://$($envConfig.customDomain)"
Write-Host "   https://$($envConfig.frontDoorHost)"
Write-Host ""
Write-Host "5. Connections (Enable the following):" -ForegroundColor Green
Write-Host "   - Username-Password-Authentication (Database)"
Write-Host "   - Google Social (optional)"
Write-Host "   - Apple Social (optional)"
Write-Host ""

# ============================================================================
# Step 7: Login URL Changes
# ============================================================================

Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "  Frontend Changes Required" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host ""
Write-Host "Update the frontend login components:" -ForegroundColor White
Write-Host ""
Write-Host "OLD (CIAM):" -ForegroundColor Red
Write-Host "  window.location.href = '/.auth/login/member?post_login_redirect_uri=...';"
Write-Host ""
Write-Host "NEW (Auth0):" -ForegroundColor Green
Write-Host "  window.location.href = '/.auth/login/auth0?post_login_redirect_uri=...';"
Write-Host ""
Write-Host "Files to update:" -ForegroundColor Cyan
Write-Host "  - apps/web/src/pages/Login.tsx"
Write-Host "  - apps/web/src/pages/Register.tsx"
Write-Host ""

# ============================================================================
# Step 8: Summary
# ============================================================================

Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Setup Summary" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Identity Providers After Migration:" -ForegroundColor White
Write-Host ""
Write-Host "  ┌─────────────────┬──────────────────────────────────────────┐"
Write-Host "  │ App             │ Identity Provider                        │"
Write-Host "  ├─────────────────┼──────────────────────────────────────────┤"
Write-Host "  │ Admin Portal    │ Entra ID (aad)                           │"
Write-Host "  │ /admin/*        │ Tenant: cff2ae9c-4810-4a92-a3e8-...     │"
Write-Host "  │                 │ Login: /.auth/login/aad                  │"
Write-Host "  ├─────────────────┼──────────────────────────────────────────┤"
Write-Host "  │ Member App      │ Auth0 (auth0)                            │"
Write-Host "  │ /member/*       │ Domain: $($auth0Config.domain)"
Write-Host "  │                 │ Login: /.auth/login/auth0                │"
Write-Host "  └─────────────────┴──────────────────────────────────────────┘"
Write-Host ""

if (-not $DryRun -and -not $SkipAzureConfig) {
    Write-Host "✓ Azure application settings have been configured." -ForegroundColor Green
} else {
    Write-Host "○ Azure configuration was skipped (DryRun or SkipAzureConfig)." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Configure Auth0 application with the callback URLs above"
Write-Host "  2. Update staticwebapp.config.json with the auth0 provider config"
Write-Host "  3. Update Login.tsx and Register.tsx to use /.auth/login/auth0"
Write-Host "  4. Deploy changes to Azure"
Write-Host "  5. Test member login flow"
Write-Host ""
