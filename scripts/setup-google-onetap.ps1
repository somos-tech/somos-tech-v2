#!/usr/bin/env pwsh
# ============================================================================
# SOMOS.tech - Google One Tap & OAuth Setup Script
# ============================================================================
# This script helps you configure Google One Tap sign-in for SOMOS.tech.
#
# Prerequisites:
# - Google Cloud Console access (console.cloud.google.com)
# - Auth0 Dashboard access (manage.auth0.com)
# - Azure CLI logged in (for SWA environment variables)
#
# What this script does:
# 1. Guides you through creating Google OAuth credentials
# 2. Helps configure Auth0 Google social connection
# 3. Sets the VITE_GOOGLE_CLIENT_ID environment variable
# 4. Updates GitHub secrets for CI/CD
#
# ============================================================================

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('dev', 'prod', 'both')]
    [string]$Environment = 'dev',
    
    [Parameter(Mandatory=$false)]
    [string]$GoogleClientId,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipAzure,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipGitHub
)

$ErrorActionPreference = "Stop"

# Configuration
$config = @{
    dev = @{
        resourceGroup = "rg-somos-tech-dev"
        staticWebAppName = "swa-somos-tech-dev-64qb73pzvgekw"
        customDomain = "dev.somos.tech"
    }
    prod = @{
        resourceGroup = "rg-somos-tech-prod"
        staticWebAppName = "swa-somos-tech-prod-tpthmei7wzupi"
        customDomain = "somos.tech"
    }
}

# ============================================================================
# Helper Functions
# ============================================================================

function Write-Banner {
    param([string]$Text, [string]$Color = "Cyan")
    Write-Host ""
    Write-Host ("=" * 70) -ForegroundColor $Color
    Write-Host "  $Text" -ForegroundColor $Color
    Write-Host ("=" * 70) -ForegroundColor $Color
    Write-Host ""
}

function Write-Step {
    param([int]$Number, [string]$Text)
    Write-Host ""
    Write-Host "Step $Number`: $Text" -ForegroundColor Cyan
    Write-Host ("-" * 60) -ForegroundColor DarkGray
}

function Write-Success {
    param([string]$Text)
    Write-Host "  ✓ $Text" -ForegroundColor Green
}

function Write-Info {
    param([string]$Text)
    Write-Host "  ℹ $Text" -ForegroundColor Gray
}

function Read-UserInput {
    param([string]$Prompt)
    Write-Host "  $Prompt" -NoNewline -ForegroundColor White
    return (Read-Host).Trim()
}

# ============================================================================
# Main Script
# ============================================================================

Write-Banner "SOMOS.tech Google One Tap Setup"

# ============================================================================
# Step 1: Google Cloud Console Setup
# ============================================================================

Write-Step 1 "Google Cloud Console Setup"

Write-Host @"
  To enable Google One Tap, you need to create OAuth credentials in Google Cloud Console.
  
  Follow these steps:
  
  1. Go to: https://console.cloud.google.com/apis/credentials
  
  2. Create a new project (or select existing):
     - Project name: SOMOS.tech
  
  3. Configure OAuth Consent Screen:
     - User Type: External
     - App name: SOMOS.tech
     - User support email: your email
     - Authorized domains: somos.tech, dev.somos.tech
     - Developer contact: your email
  
  4. Create OAuth 2.0 Client ID:
     - Application type: Web application
     - Name: SOMOS.tech Web App
     
  5. Add Authorized JavaScript origins:
"@ -ForegroundColor White

$environments = if ($Environment -eq 'both') { @('dev', 'prod') } else { @($Environment) }

foreach ($env in $environments) {
    $envConfig = $config[$env]
    Write-Host "     - https://$($envConfig.customDomain)" -ForegroundColor Green
}
Write-Host "     - http://localhost:5173  (for local development)" -ForegroundColor Green

Write-Host ""
Write-Host "  6. Add Authorized redirect URIs:" -ForegroundColor White

foreach ($env in $environments) {
    $envConfig = $config[$env]
    Write-Host "     - https://$($envConfig.customDomain)/.auth/login/google/callback" -ForegroundColor Green
}
Write-Host "     - http://localhost:5173/.auth/login/google/callback" -ForegroundColor Green

Write-Host ""
Write-Host "  7. Save and copy the Client ID" -ForegroundColor White

Write-Host ""
Read-Host "  Press Enter when you have created the OAuth credentials..."

# ============================================================================
# Step 2: Collect Google Client ID
# ============================================================================

Write-Step 2 "Google Client ID Configuration"

if (-not $GoogleClientId) {
    $GoogleClientId = Read-UserInput "Enter your Google Client ID (ends with .apps.googleusercontent.com): "
}

if (-not $GoogleClientId -or -not $GoogleClientId.EndsWith('.apps.googleusercontent.com')) {
    Write-Host "  ⚠ Invalid Client ID format. It should end with .apps.googleusercontent.com" -ForegroundColor Yellow
    exit 1
}

Write-Success "Google Client ID: $GoogleClientId"

# ============================================================================
# Step 3: Auth0 Google Connection
# ============================================================================

Write-Step 3 "Auth0 Google Social Connection"

Write-Host @"
  Now configure Google as a social connection in Auth0:
  
  1. Go to: https://manage.auth0.com/dashboard
  
  2. Navigate to: Authentication > Social
  
  3. Click "Create Connection" and select "Google / Gmail"
  
  4. Enter your credentials:
     - Client ID: $GoogleClientId
     - Client Secret: (from Google Cloud Console)
  
  5. Enable the following attributes:
     ☑ email
     ☑ email_verified  
     ☑ name
     ☑ picture
     ☑ given_name
     ☑ family_name
  
  6. Under "Applications", enable this connection for your SOMOS.tech app
  
  7. Save the connection
"@ -ForegroundColor White

Read-Host "  Press Enter when you have configured Auth0..."

# ============================================================================
# Step 4: Set Environment Variables
# ============================================================================

if (-not $SkipAzure) {
    Write-Step 4 "Setting Azure Static Web App Environment Variables"
    
    try {
        $account = az account show 2>&1 | ConvertFrom-Json
        Write-Success "Azure CLI logged in as: $($account.user.name)"
        
        foreach ($env in $environments) {
            $envConfig = $config[$env]
            
            Write-Host "  Configuring $env environment..." -ForegroundColor White
            
            # Set VITE_GOOGLE_CLIENT_ID as an app setting
            az staticwebapp appsettings set `
                --name $envConfig.staticWebAppName `
                --resource-group $envConfig.resourceGroup `
                --setting-names "VITE_GOOGLE_CLIENT_ID=$GoogleClientId" `
                2>&1 | Out-Null
            
            if ($LASTEXITCODE -eq 0) {
                Write-Success "VITE_GOOGLE_CLIENT_ID set for $env"
            } else {
                Write-Host "  ⚠ Failed to set Azure settings for $env" -ForegroundColor Yellow
            }
        }
    } catch {
        Write-Host "  ⚠ Azure CLI not available or not logged in" -ForegroundColor Yellow
    }
} else {
    Write-Step 4 "Skipping Azure Configuration (--SkipAzure flag set)"
}

# ============================================================================
# Step 5: GitHub Secrets
# ============================================================================

if (-not $SkipGitHub) {
    Write-Step 5 "Setting GitHub Repository Secrets"
    
    $ghInstalled = Get-Command gh -ErrorAction SilentlyContinue
    
    if ($ghInstalled) {
        $ghAuth = gh auth status 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "GitHub CLI authenticated"
            
            $GoogleClientId | gh secret set VITE_GOOGLE_CLIENT_ID 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Set secret: VITE_GOOGLE_CLIENT_ID"
            }
        } else {
            Write-Host "  ⚠ GitHub CLI not authenticated. Run 'gh auth login' first." -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ⚠ GitHub CLI not installed" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "  If you need to set secrets manually:" -ForegroundColor White
    Write-Host "  Go to: https://github.com/somos-tech/somos-tech-v2/settings/secrets/actions" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Add: VITE_GOOGLE_CLIENT_ID = $GoogleClientId" -ForegroundColor Green
} else {
    Write-Step 5 "Skipping GitHub Configuration (--SkipGitHub flag set)"
}

# ============================================================================
# Step 6: Local Development
# ============================================================================

Write-Step 6 "Local Development Configuration"

$envExamplePath = Join-Path (Split-Path -Parent $PSScriptRoot) "apps/web/.env.local"
$envContent = "VITE_GOOGLE_CLIENT_ID=$GoogleClientId"

Write-Host "  To enable Google One Tap in local development:" -ForegroundColor White
Write-Host ""
Write-Host "  Create file: apps/web/.env.local" -ForegroundColor Cyan
Write-Host "  With content: $envContent" -ForegroundColor Green
Write-Host ""

$createLocal = Read-UserInput "Create .env.local file now? (y/N): "
if ($createLocal -eq 'y' -or $createLocal -eq 'Y') {
    Set-Content -Path $envExamplePath -Value $envContent
    Write-Success "Created: $envExamplePath"
}

# ============================================================================
# Summary
# ============================================================================

Write-Banner "Setup Complete" "Green"

Write-Host @"
  Summary:
  
    ☑ Google OAuth credentials created
    ☑ Auth0 Google connection configured
    ☑ Environment variables set
  
  How it works:
  
    1. User visits login/register page
    2. Google One Tap popup appears (if user has Google session)
    3. User taps to sign in with their Google account
    4. Google returns ID token
    5. App redirects to Auth0 with Google connection
    6. Auth0 completes authentication
    7. User is signed in with their Google profile (including picture)
  
  Files updated:
  
    - apps/web/src/pages/Login.tsx (Google One Tap integration)
    - apps/web/src/pages/Register.tsx (Google One Tap integration)
    - apps/web/src/components/GoogleOneTap.tsx (component)
  
  Next steps:
  
    1. Commit and push changes:
       git add -A && git commit -m "feat: Add Google One Tap sign-in" && git push
    
    2. Wait for deployment
    
    3. Test at https://$($config[$environments[0]].customDomain)/login
"@ -ForegroundColor White

Write-Host ""
