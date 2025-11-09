# Configure Azure AD Authentication for Static Web App via Azure Portal
# This script opens the Azure Portal authentication configuration page

param(
    [string]$ResourceGroupName = "rg-somos-tech-dev",
    [string]$StaticWebAppName = "swa-somos-tech-dev-64qb73pzvgekw",
    [string]$TenantId = "cff2ae9c-4810-4a92-a3e8-46e649cbdbe4"
)

Write-Host "Configuring Azure AD Authentication for Static Web App" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""

# Get app settings
Write-Host "Retrieving application settings..." -ForegroundColor Yellow
$settings = az staticwebapp appsettings list `
    --name $StaticWebAppName `
    --resource-group $ResourceGroupName | ConvertFrom-Json

$clientId = $settings.properties.AZURE_CLIENT_ID
$clientSecret = $settings.properties.AZURE_CLIENT_SECRET

Write-Host "✅ Client ID: $clientId" -ForegroundColor Green
Write-Host "✅ Client Secret: $($clientSecret.Substring(0,8))..." -ForegroundColor Green
Write-Host ""

Write-Host "CRITICAL ISSUE IDENTIFIED:" -ForegroundColor Red
Write-Host "=========================" -ForegroundColor Red
Write-Host ""
Write-Host "Azure Static Web Apps does NOT fully support authentication configuration" -ForegroundColor Yellow
Write-Host "through staticwebapp.config.json alone. The file-based config only works" -ForegroundColor Yellow
Write-Host "AFTER the provider has been configured through the Azure Portal UI." -ForegroundColor Yellow
Write-Host ""

Write-Host "YOU MUST CONFIGURE IT MANUALLY:" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan
Write-Host ""

Write-Host "I will open the Azure Portal authentication page now..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Follow these steps in the Portal:" -ForegroundColor White
Write-Host "1. Click 'Add' button in the Authentication blade" -ForegroundColor White
Write-Host "2. Select 'Microsoft' (Azure Active Directory)" -ForegroundColor White
Write-Host "3. Configure with these values:" -ForegroundColor White
Write-Host ""
Write-Host "   App registration type: " -NoNewline -ForegroundColor Gray
Write-Host "Create new app registration in Azure AD tenant" -ForegroundColor White
Write-Host "   OR" -ForegroundColor Yellow
Write-Host "   App registration type: " -NoNewline -ForegroundColor Gray
Write-Host "Provide the details of an existing app registration" -ForegroundColor White
Write-Host ""
Write-Host "   If using existing app registration:" -ForegroundColor Cyan
Write-Host "   - Client ID: " -NoNewline -ForegroundColor Gray
Write-Host "$clientId" -ForegroundColor Green
Write-Host "   - Client secret: " -NoNewline -ForegroundColor Gray
Write-Host "$clientSecret" -ForegroundColor Green
Write-Host "   - Issuer URL: " -NoNewline -ForegroundColor Gray
Write-Host "https://login.microsoftonline.com/common/v2.0" -ForegroundColor Green
Write-Host ""
Write-Host "4. Click 'Add' to save" -ForegroundColor White
Write-Host ""

Read-Host "Press Enter to open Azure Portal"

# Open Azure Portal
$portalUrl = "https://portal.azure.com/#@${TenantId}/resource/subscriptions/8a61b9f5-71c9-420a-b42a-6daa8b1a3c94/resourceGroups/${ResourceGroupName}/providers/Microsoft.Web/staticSites/${StaticWebAppName}/authentication"

Write-Host "Opening Azure Portal..." -ForegroundColor Green
Start-Process $portalUrl

Write-Host ""
Write-Host "After configuring in the Portal, test by visiting:" -ForegroundColor Yellow
Write-Host "https://happy-stone-070acff1e.3.azurestaticapps.net/.auth/login/aad" -ForegroundColor Cyan
Write-Host ""
Write-Host "It should redirect to Microsoft login, not show an HTML page." -ForegroundColor Yellow
Write-Host ""
