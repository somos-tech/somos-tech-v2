#!/usr/bin/env pwsh
# ============================================================================
# SOMOS.tech - Auth0 Application Setup & Configuration Script
# ============================================================================
# This interactive script helps you set up Auth0 as the CIAM provider for
# SOMOS.tech members. It will:
#
# 1. Guide you through creating an Auth0 account and application
# 2. Collect the required credentials (Domain, Client ID, Client Secret)
# 3. Update the staticwebapp.config.json files with your Auth0 domain
# 4. Configure Azure Static Web App application settings
# 5. Add the required GitHub repository secrets
#
# Prerequisites:
# - Azure CLI installed and logged in
# - GitHub CLI installed and logged in (optional, for setting secrets)
# - An Auth0 account (will guide you to create one if needed)
#
# ============================================================================

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('dev', 'prod', 'both')]
    [string]$Environment = 'dev',
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipAzure,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipGitHub,
    
    [Parameter(Mandatory=$false)]
    [switch]$NonInteractive,
    
    [Parameter(Mandatory=$false)]
    [string]$Auth0Domain,
    
    [Parameter(Mandatory=$false)]
    [string]$Auth0ClientId,
    
    [Parameter(Mandatory=$false)]
    [string]$Auth0ClientSecret
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
        swaDefaultHost = "swa-somos-tech-dev-64qb73pzvgekw.westus2.azurestaticapps.net"
    }
    prod = @{
        resourceGroup = "rg-somos-tech-prod"
        staticWebAppName = "swa-somos-tech-prod-tpthmei7wzupi"
        customDomain = "somos.tech"
        frontDoorHost = "prod.somos.tech"
        swaDefaultHost = "swa-somos-tech-prod-tpthmei7wzupi.westus2.azurestaticapps.net"
    }
}

$repoPath = Split-Path -Parent $PSScriptRoot
$webConfigPath = Join-Path $repoPath "apps/web/staticwebapp.config.json"
$rootConfigPath = Join-Path $repoPath "staticwebapp.config.json"

# ============================================================================
# Helper Functions
# ============================================================================

function Write-Banner {
    param([string]$Text, [string]$Color = "Cyan")
    
    $width = 70
    $padding = [math]::Max(0, ($width - $Text.Length - 4) / 2)
    $paddingStr = " " * [math]::Floor($padding)
    
    Write-Host ""
    Write-Host ("╔" + "═" * ($width - 2) + "╗") -ForegroundColor $Color
    Write-Host ("║" + $paddingStr + $Text + $paddingStr + (" " * (($width - 2) - $Text.Length - (2 * [math]::Floor($padding)))) + "║") -ForegroundColor $Color
    Write-Host ("╚" + "═" * ($width - 2) + "╝") -ForegroundColor $Color
    Write-Host ""
}

function Write-Step {
    param([int]$Number, [string]$Text)
    Write-Host ""
    Write-Host "Step $Number`: $Text" -ForegroundColor Cyan
    Write-Host ("─" * 60) -ForegroundColor DarkGray
}

function Write-Success {
    param([string]$Text)
    Write-Host "  ✓ $Text" -ForegroundColor Green
}

function Write-Info {
    param([string]$Text)
    Write-Host "  ℹ $Text" -ForegroundColor Gray
}

function Write-Warning {
    param([string]$Text)
    Write-Host "  ⚠ $Text" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Text)
    Write-Host "  ✗ $Text" -ForegroundColor Red
}

function Read-SecureInput {
    param([string]$Prompt)
    
    if ($NonInteractive) {
        return $null
    }
    
    Write-Host "  $Prompt" -NoNewline -ForegroundColor White
    $input = Read-Host
    return $input.Trim()
}

function Confirm-Continue {
    param([string]$Message = "Press Enter to continue...")
    
    if (-not $NonInteractive) {
        Write-Host ""
        Write-Host "  $Message" -ForegroundColor DarkGray
        Read-Host | Out-Null
    }
}

# ============================================================================
# Main Script
# ============================================================================

Write-Banner "SOMOS.tech Auth0 CIAM Setup"

Write-Host "This script will help you configure Auth0 as the identity provider" -ForegroundColor White
Write-Host "for SOMOS.tech member authentication." -ForegroundColor White
Write-Host ""
Write-Host "  Environment: " -NoNewline; Write-Host $Environment -ForegroundColor Yellow
Write-Host "  Skip Azure: " -NoNewline; Write-Host $SkipAzure -ForegroundColor Yellow
Write-Host "  Skip GitHub: " -NoNewline; Write-Host $SkipGitHub -ForegroundColor Yellow

# ============================================================================
# Step 1: Auth0 Account Setup Guide
# ============================================================================

Write-Step 1 "Auth0 Account & Application Setup"

if (-not $Auth0Domain -or -not $Auth0ClientId -or -not $Auth0ClientSecret) {
    Write-Host ""
    Write-Host "  If you don't have an Auth0 account yet, follow these steps:" -ForegroundColor White
    Write-Host ""
    Write-Host "  1. Go to " -NoNewline; Write-Host "https://auth0.com" -ForegroundColor Cyan
    Write-Host "  2. Click 'Sign Up' and create a free account"
    Write-Host "  3. Once logged in, go to Applications > Create Application"
    Write-Host "  4. Name it 'SOMOS.tech Member Portal'"
    Write-Host "  5. Select 'Regular Web Application' and click Create"
    Write-Host ""
    Write-Host "  From the Application Settings page, you'll need:" -ForegroundColor Yellow
    Write-Host "  - Domain (e.g., your-tenant.us.auth0.com)"
    Write-Host "  - Client ID"
    Write-Host "  - Client Secret"
    Write-Host ""
    
    Confirm-Continue "Press Enter when you have the Auth0 credentials ready..."
}

# Collect Auth0 credentials
if (-not $Auth0Domain) {
    $Auth0Domain = Read-SecureInput "Enter Auth0 Domain (e.g., your-tenant.us.auth0.com): "
}

if (-not $Auth0Domain) {
    Write-Error "Auth0 Domain is required"
    exit 1
}

# Normalize domain (remove https:// if present)
$Auth0Domain = $Auth0Domain -replace "^https?://", "" -replace "/$", ""

if (-not $Auth0ClientId) {
    $Auth0ClientId = Read-SecureInput "Enter Auth0 Client ID: "
}

if (-not $Auth0ClientId) {
    Write-Error "Auth0 Client ID is required"
    exit 1
}

if (-not $Auth0ClientSecret) {
    $Auth0ClientSecret = Read-SecureInput "Enter Auth0 Client Secret: "
}

if (-not $Auth0ClientSecret) {
    Write-Error "Auth0 Client Secret is required"
    exit 1
}

Write-Success "Auth0 credentials collected"
Write-Info "Domain: $Auth0Domain"
Write-Info "Client ID: $Auth0ClientId"
Write-Info "Client Secret: [REDACTED]"

# ============================================================================
# Step 2: Verify Auth0 OpenID Configuration
# ============================================================================

Write-Step 2 "Verifying Auth0 OpenID Connect Configuration"

$wellKnownUrl = "https://$Auth0Domain/.well-known/openid-configuration"

try {
    $oidcConfig = Invoke-RestMethod -Uri $wellKnownUrl -Method Get -TimeoutSec 10
    Write-Success "Auth0 OIDC metadata retrieved successfully"
    Write-Info "Issuer: $($oidcConfig.issuer)"
    Write-Info "Authorization: $($oidcConfig.authorization_endpoint)"
} catch {
    Write-Error "Failed to retrieve Auth0 OIDC metadata from: $wellKnownUrl"
    Write-Error "Error: $_"
    Write-Host ""
    Write-Host "  Please verify your Auth0 domain is correct." -ForegroundColor Yellow
    exit 1
}

# ============================================================================
# Step 3: Update staticwebapp.config.json files
# ============================================================================

Write-Step 3 "Updating staticwebapp.config.json files"

$configFiles = @($webConfigPath, $rootConfigPath)

foreach ($configFile in $configFiles) {
    if (Test-Path $configFile) {
        $content = Get-Content $configFile -Raw
        
        # Replace the placeholder with actual domain
        $updatedContent = $content -replace "AUTH0_DOMAIN_PLACEHOLDER", $Auth0Domain
        
        # Also update if there's an old CIAM configuration
        $updatedContent = $updatedContent -replace "somostechus\.ciamlogin\.com/somostechus\.onmicrosoft\.com/v2\.0/\.well-known/openid-configuration\?appid=2be101c5-90d9-4764-b30c-0ba3fa3b4a27", "$Auth0Domain/.well-known/openid-configuration"
        
        Set-Content $configFile -Value $updatedContent -NoNewline
        Write-Success "Updated: $configFile"
    } else {
        Write-Warning "File not found: $configFile"
    }
}

# ============================================================================
# Step 4: Configure Azure Static Web App Settings
# ============================================================================

if (-not $SkipAzure) {
    Write-Step 4 "Configuring Azure Static Web App Settings"
    
    # Verify Azure CLI login
    try {
        $account = az account show 2>&1 | ConvertFrom-Json
        Write-Success "Azure CLI logged in as: $($account.user.name)"
    } catch {
        Write-Error "Not logged in to Azure CLI. Please run 'az login' first."
        Write-Host ""
        Write-Host "  Skipping Azure configuration. Run this script again after logging in." -ForegroundColor Yellow
        $SkipAzure = $true
    }
    
    if (-not $SkipAzure) {
        $environments = if ($Environment -eq 'both') { @('dev', 'prod') } else { @($Environment) }
        
        foreach ($env in $environments) {
            $envConfig = $config[$env]
            
            Write-Host ""
            Write-Host "  Configuring $env environment..." -ForegroundColor White
            
            $settingsToSet = @(
                "AUTH0_CLIENT_ID=$Auth0ClientId",
                "AUTH0_CLIENT_SECRET=$Auth0ClientSecret",
                "AUTH0_DOMAIN=$Auth0Domain"
            )
            
            $result = az staticwebapp appsettings set `
                --name $envConfig.staticWebAppName `
                --resource-group $envConfig.resourceGroup `
                --setting-names $settingsToSet `
                2>&1
            
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Azure Static Web App settings configured for $env"
            } else {
                Write-Warning "Failed to set Azure settings for $env`: $result"
            }
        }
    }
} else {
    Write-Step 4 "Skipping Azure Configuration (--SkipAzure flag set)"
}

# ============================================================================
# Step 5: Configure GitHub Secrets
# ============================================================================

if (-not $SkipGitHub) {
    Write-Step 5 "Configuring GitHub Repository Secrets"
    
    # Check if GitHub CLI is installed
    $ghInstalled = Get-Command gh -ErrorAction SilentlyContinue
    
    if ($ghInstalled) {
        # Check if logged in
        $ghAuth = gh auth status 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "GitHub CLI authenticated"
            
            Write-Host ""
            Write-Host "  Setting repository secrets..." -ForegroundColor White
            
            # Set secrets
            $secrets = @{
                "AUTH0_DOMAIN" = $Auth0Domain
                "AUTH0_CLIENT_ID" = $Auth0ClientId
                "AUTH0_CLIENT_SECRET" = $Auth0ClientSecret
            }
            
            foreach ($secret in $secrets.GetEnumerator()) {
                $result = $secret.Value | gh secret set $secret.Key 2>&1
                if ($LASTEXITCODE -eq 0) {
                    Write-Success "Set secret: $($secret.Key)"
                } else {
                    Write-Warning "Failed to set secret $($secret.Key)`: $result"
                }
            }
        } else {
            Write-Warning "GitHub CLI not authenticated. Run 'gh auth login' first."
            Write-Host ""
            Write-Host "  You'll need to manually add these secrets to your repository:" -ForegroundColor Yellow
            Write-Host "    - AUTH0_DOMAIN: $Auth0Domain"
            Write-Host "    - AUTH0_CLIENT_ID: $Auth0ClientId"
            Write-Host "    - AUTH0_CLIENT_SECRET: [your secret]"
        }
    } else {
        Write-Warning "GitHub CLI not installed. Please install it from https://cli.github.com"
        Write-Host ""
        Write-Host "  You'll need to manually add these secrets to your repository:" -ForegroundColor Yellow
        Write-Host "  Go to: https://github.com/somos-tech/somos-tech-v2/settings/secrets/actions" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "    - AUTH0_DOMAIN: $Auth0Domain"
        Write-Host "    - AUTH0_CLIENT_ID: $Auth0ClientId"
        Write-Host "    - AUTH0_CLIENT_SECRET: [your secret]"
    }
} else {
    Write-Step 5 "Skipping GitHub Configuration (--SkipGitHub flag set)"
}

# ============================================================================
# Step 6: Display Auth0 Application Configuration Required
# ============================================================================

Write-Step 6 "Auth0 Application Configuration Required"

Write-Host ""
Write-Host "  Configure the following in your Auth0 Dashboard:" -ForegroundColor Yellow
Write-Host "  Go to: https://manage.auth0.com/dashboard" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Application Settings > Application URIs:" -ForegroundColor White
Write-Host ""

$environments = if ($Environment -eq 'both') { @('dev', 'prod') } else { @($Environment) }

Write-Host "  ┌─────────────────────────────────────────────────────────────────────┐" -ForegroundColor DarkGray
Write-Host "  │ Allowed Callback URLs (comma-separated, add all):                   │" -ForegroundColor DarkGray
Write-Host "  └─────────────────────────────────────────────────────────────────────┘" -ForegroundColor DarkGray

foreach ($env in $environments) {
    $envConfig = $config[$env]
    Write-Host "    https://$($envConfig.customDomain)/.auth/login/auth0/callback" -ForegroundColor Green
    Write-Host "    https://$($envConfig.frontDoorHost)/.auth/login/auth0/callback" -ForegroundColor Green
    Write-Host "    https://$($envConfig.swaDefaultHost)/.auth/login/auth0/callback" -ForegroundColor Green
}

Write-Host ""
Write-Host "  ┌─────────────────────────────────────────────────────────────────────┐" -ForegroundColor DarkGray
Write-Host "  │ Allowed Logout URLs (comma-separated, add all):                     │" -ForegroundColor DarkGray
Write-Host "  └─────────────────────────────────────────────────────────────────────┘" -ForegroundColor DarkGray

foreach ($env in $environments) {
    $envConfig = $config[$env]
    Write-Host "    https://$($envConfig.customDomain)/.auth/logout/auth0/callback" -ForegroundColor Green
    Write-Host "    https://$($envConfig.frontDoorHost)/.auth/logout/auth0/callback" -ForegroundColor Green
    Write-Host "    https://$($envConfig.swaDefaultHost)/.auth/logout/auth0/callback" -ForegroundColor Green
}

Write-Host ""
Write-Host "  ┌─────────────────────────────────────────────────────────────────────┐" -ForegroundColor DarkGray
Write-Host "  │ Allowed Web Origins:                                                │" -ForegroundColor DarkGray
Write-Host "  └─────────────────────────────────────────────────────────────────────┘" -ForegroundColor DarkGray

foreach ($env in $environments) {
    $envConfig = $config[$env]
    Write-Host "    https://$($envConfig.customDomain)" -ForegroundColor Green
    Write-Host "    https://$($envConfig.frontDoorHost)" -ForegroundColor Green
}

Write-Host ""
Write-Host "  ┌─────────────────────────────────────────────────────────────────────┐" -ForegroundColor DarkGray
Write-Host "  │ Connections (enable these in Authentication > Database/Social):    │" -ForegroundColor DarkGray
Write-Host "  └─────────────────────────────────────────────────────────────────────┘" -ForegroundColor DarkGray
Write-Host "    ☑ Username-Password-Authentication (Database)" -ForegroundColor Green
Write-Host "    ☐ Google (optional)" -ForegroundColor Gray
Write-Host "    ☐ Apple (optional)" -ForegroundColor Gray

# ============================================================================
# Summary
# ============================================================================

Write-Banner "Setup Complete" "Green"

Write-Host "  Summary of changes:" -ForegroundColor White
Write-Host ""
Write-Host "    ☑ Auth0 credentials verified" -ForegroundColor Green
Write-Host "    ☑ staticwebapp.config.json files updated" -ForegroundColor Green

if (-not $SkipAzure) {
    Write-Host "    ☑ Azure Static Web App settings configured" -ForegroundColor Green
} else {
    Write-Host "    ○ Azure configuration skipped" -ForegroundColor Yellow
}

if (-not $SkipGitHub) {
    Write-Host "    ☑ GitHub secrets configured (or instructions provided)" -ForegroundColor Green
} else {
    Write-Host "    ○ GitHub configuration skipped" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "  Next Steps:" -ForegroundColor Cyan
Write-Host "    1. Configure Auth0 application with the callback URLs above"
Write-Host "    2. Commit and push the config changes: git add -A && git commit -m 'Configure Auth0' && git push"
Write-Host "    3. Wait for deployment to complete"
Write-Host "    4. Test member login at https://$($config[$environments[0]].customDomain)/login"
Write-Host ""

Write-Host "  Identity Providers:" -ForegroundColor White
Write-Host "    ┌────────────────┬────────────────────────────────────────────┐"
Write-Host "    │ Admin Portal   │ Entra ID (/.auth/login/aad)                │"
Write-Host "    │ Member App     │ Auth0 (/.auth/login/auth0)                 │"
Write-Host "    └────────────────┴────────────────────────────────────────────┘"
Write-Host ""
