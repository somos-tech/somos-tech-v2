# Setup Google OAuth for Azure Static Web Apps
# This script configures Google Sign-In for SOMOS.tech

param(
    [Parameter(Mandatory=$true)]
    [string]$GoogleClientId,
    
    [Parameter(Mandatory=$true)]
    [string]$GoogleClientSecret,
    
    [string]$StaticWebAppName = "swa-somos-tech-prod-tpthmei7wzupi",
    [string]$ResourceGroup = "rg-somos-tech-prod"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setting up Google OAuth for SOMOS.tech" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Validate inputs
if ($GoogleClientId -notmatch '^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$') {
    Write-Host "WARNING: Google Client ID format may be incorrect" -ForegroundColor Yellow
    Write-Host "Expected format: 123456789-abcdef.apps.googleusercontent.com" -ForegroundColor Yellow
}

Write-Host "Configuration:" -ForegroundColor Green
Write-Host "  Static Web App: $StaticWebAppName" -ForegroundColor White
Write-Host "  Google Client ID: $($GoogleClientId.Substring(0, 20))..." -ForegroundColor White
Write-Host ""

# Set the application settings
Write-Host "Setting Google OAuth credentials..." -ForegroundColor Yellow

az staticwebapp appsettings set `
    --name $StaticWebAppName `
    --resource-group $ResourceGroup `
    --setting-names `
        "GOOGLE_CLIENT_ID=$GoogleClientId" `
        "GOOGLE_CLIENT_SECRET=$GoogleClientSecret" `
        "VITE_GOOGLE_CLIENT_ID=$GoogleClientId"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "SUCCESS! Google OAuth configured." -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Environment variables set:" -ForegroundColor Cyan
    Write-Host "  ✓ GOOGLE_CLIENT_ID (for SWA auth)" -ForegroundColor Green
    Write-Host "  ✓ GOOGLE_CLIENT_SECRET (for SWA auth)" -ForegroundColor Green
    Write-Host "  ✓ VITE_GOOGLE_CLIENT_ID (for One Tap)" -ForegroundColor Green
    Write-Host ""
    Write-Host "Users can now sign in with Google!" -ForegroundColor Yellow
} else {
    Write-Host "ERROR: Failed to set application settings" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Google Cloud Console Setup Instructions" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "If you haven't already, configure these in Google Cloud Console:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Go to: https://console.cloud.google.com/apis/credentials" -ForegroundColor White
Write-Host ""
Write-Host "2. Edit your OAuth 2.0 Client ID and add these:" -ForegroundColor White
Write-Host ""
Write-Host "   Authorized JavaScript origins:" -ForegroundColor Cyan
Write-Host "     - https://somos.tech" -ForegroundColor White
Write-Host "     - https://dev.somos.tech" -ForegroundColor White
Write-Host "     - https://swa-somos-tech-prod-tpthmei7wzupi.azurestaticapps.net" -ForegroundColor White
Write-Host ""
Write-Host "   Authorized redirect URIs:" -ForegroundColor Cyan
Write-Host "     - https://somos.tech/.auth/login/google/callback" -ForegroundColor White
Write-Host "     - https://dev.somos.tech/.auth/login/google/callback" -ForegroundColor White
Write-Host "     - https://swa-somos-tech-prod-tpthmei7wzupi.azurestaticapps.net/.auth/login/google/callback" -ForegroundColor White
Write-Host ""
Write-Host "3. Save the changes" -ForegroundColor White
Write-Host ""
Write-Host "4. Deploy your app to apply the staticwebapp.config.json changes" -ForegroundColor Yellow
