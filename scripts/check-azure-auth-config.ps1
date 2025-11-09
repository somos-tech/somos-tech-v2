# Check Azure Static Web App Authentication Configuration
# This script verifies that authentication is properly configured

param(
    [string]$ResourceGroupName = "rg-somos-tech-dev",
    [string]$StaticWebAppName = "swa-somos-tech-dev-64qb73pzvgekw"
)

Write-Host "Checking Azure Static Web App Authentication Configuration..." -ForegroundColor Cyan
Write-Host ""

# Check if logged in
Write-Host "1. Checking Azure login status..." -ForegroundColor Yellow
$account = az account show 2>$null | ConvertFrom-Json
if (-not $account) {
    Write-Host "   ❌ Not logged in to Azure" -ForegroundColor Red
    Write-Host "   Run: az login" -ForegroundColor White
    exit 1
}
Write-Host "   ✅ Logged in as: $($account.user.name)" -ForegroundColor Green
Write-Host ""

# Check Static Web App exists
Write-Host "2. Checking Static Web App..." -ForegroundColor Yellow
$swa = az staticwebapp show `
    --name $StaticWebAppName `
    --resource-group $ResourceGroupName `
    2>$null | ConvertFrom-Json

if (-not $swa) {
    Write-Host "   ❌ Static Web App not found" -ForegroundColor Red
    exit 1
}
Write-Host "   ✅ Static Web App found: $($swa.defaultHostname)" -ForegroundColor Green
Write-Host ""

# Check application settings
Write-Host "3. Checking Application Settings..." -ForegroundColor Yellow
$settings = az staticwebapp appsettings list `
    --name $StaticWebAppName `
    --resource-group $ResourceGroupName `
    2>$null | ConvertFrom-Json

$requiredSettings = @("AZURE_CLIENT_ID", "AZURE_CLIENT_SECRET")
$missingSettings = @()

foreach ($setting in $requiredSettings) {
    if ($settings.properties.PSObject.Properties.Name -contains $setting) {
        Write-Host "   ✅ $setting is set" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $setting is MISSING" -ForegroundColor Red
        $missingSettings += $setting
    }
}

if ($missingSettings.Count -gt 0) {
    Write-Host ""
    Write-Host "Missing settings detected!" -ForegroundColor Red
    Write-Host "You need to configure these in Azure Portal:" -ForegroundColor Yellow
    Write-Host "  az staticwebapp appsettings set \" -ForegroundColor White
    Write-Host "    --name $StaticWebAppName \" -ForegroundColor White
    Write-Host "    --resource-group $ResourceGroupName \" -ForegroundColor White
    Write-Host "    --setting-names \" -ForegroundColor White
    foreach ($setting in $missingSettings) {
        Write-Host "      ${setting}=<value> \" -ForegroundColor White
    }
    Write-Host ""
}

Write-Host ""

# Check current authentication providers
Write-Host "4. Checking Authentication Providers..." -ForegroundColor Yellow
Write-Host "   Note: Azure CLI doesn't support listing auth providers directly" -ForegroundColor Gray
Write-Host "   Testing authentication endpoint..." -ForegroundColor Gray

$authUrl = "https://$($swa.defaultHostname)/.auth/login/aad"
try {
    $response = Invoke-WebRequest -Uri $authUrl -Method Get -MaximumRedirection 0 -ErrorAction SilentlyContinue
    
    if ($response.StatusCode -eq 302) {
        $location = $response.Headers.Location
        if ($location -match "login.microsoftonline.com") {
            Write-Host "   ✅ AAD provider configured - redirects to Microsoft login" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  Redirects to: $location" -ForegroundColor Yellow
        }
    } elseif ($response.StatusCode -eq 200) {
        Write-Host "   ❌ AAD provider NOT configured - returns HTML page" -ForegroundColor Red
        Write-Host "   The auth endpoint should redirect to Microsoft, not return a page" -ForegroundColor Yellow
    }
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 302) {
        $location = $_.Exception.Response.Headers.Location.AbsoluteUri
        if ($location -match "login.microsoftonline.com") {
            Write-Host "   ✅ AAD provider configured - redirects to Microsoft login" -ForegroundColor Green
            Write-Host "   Redirect URL: $location" -ForegroundColor Gray
        } else {
            Write-Host "   ⚠️  Redirects to: $location" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ❌ Error testing endpoint: $statusCode" -ForegroundColor Red
    }
}

Write-Host ""

# Check /.auth/me endpoint
Write-Host "5. Checking Auth Info Endpoint..." -ForegroundColor Yellow
$authMeUrl = "https://$($swa.defaultHostname)/.auth/me"
try {
    $authMe = Invoke-RestMethod -Uri $authMeUrl -Method Get
    if ($authMe.clientPrincipal) {
        Write-Host "   ✅ Currently authenticated as: $($authMe.clientPrincipal.userDetails)" -ForegroundColor Green
        Write-Host "   Provider: $($authMe.clientPrincipal.identityProvider)" -ForegroundColor Gray
        Write-Host "   Roles: $($authMe.clientPrincipal.userRoles -join ', ')" -ForegroundColor Gray
    } else {
        Write-Host "   ℹ️  Not currently authenticated" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ℹ️  Not currently authenticated (expected if not logged in)" -ForegroundColor Gray
}

Write-Host ""

# Check latest deployment
Write-Host "6. Checking Latest Deployment..." -ForegroundColor Yellow
try {
    $builds = az staticwebapp build list `
        --name $StaticWebAppName `
        --resource-group $ResourceGroupName `
        2>$null | ConvertFrom-Json
    
    if ($builds -and $builds.Count -gt 0) {
        $latest = $builds[0]
        Write-Host "   Latest build: $($latest.buildId)" -ForegroundColor Gray
        Write-Host "   Status: $($latest.status)" -ForegroundColor $(if ($latest.status -eq 'Ready') { 'Green' } else { 'Yellow' })
        Write-Host "   Created: $($latest.createdTimeUtc)" -ForegroundColor Gray
    } else {
        Write-Host "   ⚠️  No deployments found" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️  Could not fetch deployment info" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "========" -ForegroundColor Cyan
Write-Host ""

if ($missingSettings.Count -eq 0) {
    Write-Host "✅ Application settings configured" -ForegroundColor Green
} else {
    Write-Host "❌ Missing application settings: $($missingSettings -join ', ')" -ForegroundColor Red
}

Write-Host ""
Write-Host "IMPORTANT: Authentication provider configuration cannot be fully managed via CLI." -ForegroundColor Yellow
Write-Host "You must configure it through the Azure Portal:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Go to: https://portal.azure.com" -ForegroundColor White
Write-Host "2. Navigate to: Static Web Apps > $StaticWebAppName > Authentication" -ForegroundColor White
Write-Host "3. Click 'Add identity provider'" -ForegroundColor White
Write-Host "4. Select 'Microsoft' (Azure AD)" -ForegroundColor White
Write-Host "5. Configure:" -ForegroundColor White
Write-Host "   - App registration type: Provide details of an existing app registration" -ForegroundColor White
Write-Host "   - Client ID: (value from AZURE_CLIENT_ID setting)" -ForegroundColor White
Write-Host "   - Client secret: (value from AZURE_CLIENT_SECRET setting)" -ForegroundColor White
Write-Host "   - Issuer URL: https://login.microsoftonline.com/common/v2.0" -ForegroundColor White
Write-Host ""
Write-Host "Alternative: The staticwebapp.config.json changes will apply on next deployment." -ForegroundColor Cyan
Write-Host ""
