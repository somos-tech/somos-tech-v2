# Configure Azure Communication Services Email for Somos Tech
# This script sets up the email environment variables for the Static Web App

param(
    [Parameter(Mandatory=$true)]
    [string]$ConnectionString,
    
    [string]$StaticWebAppName = "somos-tech",
    [string]$ResourceGroup = "somos-tech-rg",
    [string]$SenderAddress = "DO-NOT-REPLY@somos.tech",
    [string]$SenderDisplayName = "Member Notification"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Configuring Email Service for Somos Tech" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Validate connection string format
if (-not $ConnectionString.StartsWith("endpoint=")) {
    Write-Host "ERROR: Connection string should start with 'endpoint='" -ForegroundColor Red
    Write-Host "Format: endpoint=https://<resource>.communication.azure.com/;accesskey=<key>" -ForegroundColor Yellow
    exit 1
}

Write-Host "Configuration:" -ForegroundColor Green
Write-Host "  Static Web App: $StaticWebAppName" -ForegroundColor White
Write-Host "  Resource Group: $ResourceGroup" -ForegroundColor White
Write-Host "  Sender Address: $SenderAddress" -ForegroundColor White
Write-Host "  Sender Display Name: $SenderDisplayName" -ForegroundColor White
Write-Host ""

# Check if logged into Azure
Write-Host "Checking Azure CLI login status..." -ForegroundColor Yellow
$account = az account show 2>$null | ConvertFrom-Json
if (-not $account) {
    Write-Host "Not logged into Azure. Please run 'az login' first." -ForegroundColor Red
    exit 1
}
Write-Host "Logged in as: $($account.user.name)" -ForegroundColor Green
Write-Host "Subscription: $($account.name)" -ForegroundColor Green
Write-Host ""

# Set the application settings
Write-Host "Setting application settings on Static Web App..." -ForegroundColor Yellow

try {
    az staticwebapp appsettings set `
        --name $StaticWebAppName `
        --resource-group $ResourceGroup `
        --setting-names `
            "AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING=$ConnectionString" `
            "EMAIL_SENDER_ADDRESS=$SenderAddress" `
            "EMAIL_SENDER_DISPLAY_NAME=$SenderDisplayName"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "SUCCESS! Email service configured." -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Environment variables set:" -ForegroundColor Cyan
        Write-Host "  - AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING" -ForegroundColor White
        Write-Host "  - EMAIL_SENDER_ADDRESS = $SenderAddress" -ForegroundColor White
        Write-Host "  - EMAIL_SENDER_DISPLAY_NAME = $SenderDisplayName" -ForegroundColor White
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Yellow
        Write-Host "  1. Ensure your domain 'somos.tech' is verified in Email Communication Services" -ForegroundColor White
        Write-Host "  2. Add SPF, DKIM, and DMARC DNS records for email authentication" -ForegroundColor White
        Write-Host "  3. Connect the domain to your Communication Services resource" -ForegroundColor White
        Write-Host "  4. Test by sending a notification from the Admin dashboard" -ForegroundColor White
    } else {
        Write-Host "ERROR: Failed to set application settings" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "To verify the settings, run:" -ForegroundColor Cyan
Write-Host "  az staticwebapp appsettings list --name $StaticWebAppName --resource-group $ResourceGroup" -ForegroundColor White
