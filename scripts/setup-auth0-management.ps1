#!/usr/bin/env pwsh
# ============================================================================
# SOMOS.tech - Auth0 Management API Setup Script
# ============================================================================
# This script helps configure the Auth0 Management API for user management.
# 
# Features enabled:
# - Admin can disable/enable Auth0 user accounts
# - Admin can delete Auth0 user accounts  
# - Users can delete their own Auth0 accounts (self-deletion)
#
# Prerequisites:
# 1. Auth0 Account with admin access
# 2. Azure CLI installed and logged in
#
# Steps to get Auth0 Management API credentials:
# 1. Go to Auth0 Dashboard > Applications > APIs
# 2. Find "Auth0 Management API" and click on it
# 3. Go to "Machine to Machine Applications" tab
# 4. Authorize your application (or create a new M2M app)
# 5. Select the required scopes (see below)
# 6. Get the Client ID and Client Secret from the M2M app
#
# Required Auth0 Management API Scopes:
# - read:users
# - update:users
# - delete:users
# - read:users_app_metadata
# - update:users_app_metadata
#
# ============================================================================

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('dev', 'prod')]
    [string]$Environment = 'dev',
    
    [Parameter(Mandatory=$true)]
    [string]$Auth0ManagementClientId,
    
    [Parameter(Mandatory=$true)]
    [string]$Auth0ManagementClientSecret,
    
    [Parameter(Mandatory=$false)]
    [string]$Auth0Domain = 'auth.somos.tech',
    
    [Parameter(Mandatory=$false)]
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

# ============================================================================
# Configuration
# ============================================================================

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

$envConfig = $config[$Environment]

# ============================================================================
# Display Banner
# ============================================================================

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║       SOMOS.tech - Auth0 Management API Configuration          ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host "Resource Group: $($envConfig.resourceGroup)" -ForegroundColor Gray
Write-Host "Static Web App: $($envConfig.staticWebAppName)" -ForegroundColor Gray
Write-Host "Auth0 Domain: $Auth0Domain" -ForegroundColor Gray
Write-Host ""

if ($DryRun) {
    Write-Host "[DRY RUN] No changes will be made" -ForegroundColor Yellow
    Write-Host ""
}

# ============================================================================
# Verify Azure Login
# ============================================================================

Write-Host "Checking Azure login..." -ForegroundColor Yellow
$account = az account show 2>$null | ConvertFrom-Json
if (-not $account) {
    Write-Host "Not logged in to Azure. Running 'az login'..." -ForegroundColor Yellow
    az login
    $account = az account show | ConvertFrom-Json
}

Write-Host "✓ Logged in as: $($account.user.name)" -ForegroundColor Green
Write-Host "✓ Subscription: $($account.name)" -ForegroundColor Green
Write-Host ""

# ============================================================================
# Test Auth0 Management API Credentials
# ============================================================================

Write-Host "Testing Auth0 Management API credentials..." -ForegroundColor Yellow

$tokenBody = @{
    client_id = $Auth0ManagementClientId
    client_secret = $Auth0ManagementClientSecret
    audience = "https://$Auth0Domain/api/v2/"
    grant_type = "client_credentials"
} | ConvertTo-Json

try {
    $tokenResponse = Invoke-RestMethod -Uri "https://$Auth0Domain/oauth/token" -Method Post -Body $tokenBody -ContentType "application/json"
    Write-Host "✓ Auth0 Management API credentials are valid!" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "✗ Failed to authenticate with Auth0 Management API" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check:" -ForegroundColor Yellow
    Write-Host "  1. Client ID and Client Secret are correct" -ForegroundColor Gray
    Write-Host "  2. The M2M application is authorized for Auth0 Management API" -ForegroundColor Gray
    Write-Host "  3. The domain '$Auth0Domain' is correct" -ForegroundColor Gray
    exit 1
}

# ============================================================================
# Configure Static Web App Settings
# ============================================================================

Write-Host "Configuring Azure Static Web App settings..." -ForegroundColor Yellow

$settings = @{
    AUTH0_DOMAIN = $Auth0Domain
    AUTH0_MANAGEMENT_CLIENT_ID = $Auth0ManagementClientId
    AUTH0_MANAGEMENT_CLIENT_SECRET = $Auth0ManagementClientSecret
}

foreach ($key in $settings.Keys) {
    if ($DryRun) {
        Write-Host "  [DRY RUN] Would set $key" -ForegroundColor Gray
    } else {
        Write-Host "  Setting $key..." -ForegroundColor Gray
        az staticwebapp appsettings set `
            --name $envConfig.staticWebAppName `
            --resource-group $envConfig.resourceGroup `
            --setting-names "$key=$($settings[$key])" `
            --output none 2>$null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "    ✓ $key configured" -ForegroundColor Green
        } else {
            Write-Host "    ✗ Failed to set $key" -ForegroundColor Red
        }
    }
}

Write-Host ""

# ============================================================================
# Summary
# ============================================================================

Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                    Configuration Complete                       ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Host "Auth0 Management API is now configured!" -ForegroundColor Green
Write-Host ""
Write-Host "Available features:" -ForegroundColor Cyan
Write-Host "  • Admins can block/unblock Auth0 users from Admin Dashboard" -ForegroundColor White
Write-Host "  • Admins can delete Auth0 user accounts" -ForegroundColor White
Write-Host "  • Users can delete their own Auth0 accounts from Profile page" -ForegroundColor White
Write-Host ""
Write-Host "API Endpoints:" -ForegroundColor Cyan
Write-Host "  PUT  /api/auth0/users/{userId}/block   - Block user (admin)" -ForegroundColor Gray
Write-Host "  PUT  /api/auth0/users/{userId}/unblock - Unblock user (admin)" -ForegroundColor Gray
Write-Host "  DELETE /api/auth0/users/{userId}       - Delete user (admin)" -ForegroundColor Gray
Write-Host "  DELETE /api/auth0/account              - Self-delete account" -ForegroundColor Gray
Write-Host "  GET  /api/auth0/status                 - Check config status" -ForegroundColor Gray
Write-Host ""

if ($DryRun) {
    Write-Host "[DRY RUN] No changes were made. Run without -DryRun to apply." -ForegroundColor Yellow
} else {
    Write-Host "Note: Changes may take a few minutes to propagate." -ForegroundColor Yellow
}

Write-Host ""
