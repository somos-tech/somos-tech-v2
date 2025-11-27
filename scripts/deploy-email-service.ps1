# Deploy Azure Communication Services for Email
# This script creates all required resources for email sending

param(
    [string]$ResourceGroup = "somos-tech-rg",
    [string]$Location = "unitedstates",
    [string]$CommunicationServiceName = "somos-tech-comm",
    [string]$EmailServiceName = "somos-tech-email",
    [string]$StaticWebAppName = "somos-tech",
    [string]$CustomDomain = "somos.tech",
    [switch]$SkipResourceCreation
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deploy Azure Communication Services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Azure CLI login
$account = az account show 2>$null | ConvertFrom-Json
if (-not $account) {
    Write-Host "Logging into Azure..." -ForegroundColor Yellow
    az login
    $account = az account show | ConvertFrom-Json
}
Write-Host "Subscription: $($account.name)" -ForegroundColor Green
Write-Host ""

if (-not $SkipResourceCreation) {
    # Step 1: Create Communication Services resource
    Write-Host "Step 1: Creating Communication Services resource..." -ForegroundColor Cyan
    Write-Host "  Name: $CommunicationServiceName" -ForegroundColor White
    
    az communication create `
        --name $CommunicationServiceName `
        --resource-group $ResourceGroup `
        --location global `
        --data-location $Location
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to create Communication Services. It may already exist." -ForegroundColor Yellow
    } else {
        Write-Host "Communication Services created!" -ForegroundColor Green
    }
    Write-Host ""

    # Step 2: Create Email Communication Services resource
    Write-Host "Step 2: Creating Email Communication Services resource..." -ForegroundColor Cyan
    Write-Host "  Name: $EmailServiceName" -ForegroundColor White
    
    az communication email create `
        --name $EmailServiceName `
        --resource-group $ResourceGroup `
        --location global `
        --data-location $Location
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to create Email Service. It may already exist." -ForegroundColor Yellow
    } else {
        Write-Host "Email Service created!" -ForegroundColor Green
    }
    Write-Host ""

    # Step 3: Create Azure-managed domain (for quick setup)
    Write-Host "Step 3: Creating Azure-managed email domain..." -ForegroundColor Cyan
    
    az communication email domain create `
        --name "AzureManagedDomain" `
        --email-service-name $EmailServiceName `
        --resource-group $ResourceGroup `
        --location global `
        --domain-management "AzureManagedDomain"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to create domain. It may already exist." -ForegroundColor Yellow
    } else {
        Write-Host "Azure-managed domain created!" -ForegroundColor Green
    }
    Write-Host ""
}

# Step 4: Get connection string
Write-Host "Step 4: Retrieving connection string..." -ForegroundColor Cyan

$keys = az communication list-key `
    --name $CommunicationServiceName `
    --resource-group $ResourceGroup 2>$null | ConvertFrom-Json

if (-not $keys) {
    Write-Host "ERROR: Could not get connection string." -ForegroundColor Red
    Write-Host "Please verify the Communication Services resource exists." -ForegroundColor Yellow
    exit 1
}

$connectionString = $keys.primaryConnectionString
Write-Host "Connection string retrieved!" -ForegroundColor Green
Write-Host ""

# Step 5: Get the sender address from the domain
Write-Host "Step 5: Getting sender address..." -ForegroundColor Cyan

$domains = az communication email domain list `
    --email-service-name $EmailServiceName `
    --resource-group $ResourceGroup 2>$null | ConvertFrom-Json

if ($domains -and $domains.Count -gt 0) {
    $domain = $domains[0]
    $senderDomain = $domain.mailFromSenderDomain
    $senderAddress = "DoNotReply@$senderDomain"
    Write-Host "Sender domain: $senderDomain" -ForegroundColor Green
    Write-Host "Sender address: $senderAddress" -ForegroundColor Green
} else {
    Write-Host "No domains found. Using default." -ForegroundColor Yellow
    $senderAddress = "DO-NOT-REPLY@somos.tech"
}
Write-Host ""

# Step 6: Configure Static Web App
Write-Host "Step 6: Configuring Static Web App environment..." -ForegroundColor Cyan
Write-Host "  Static Web App: $StaticWebAppName" -ForegroundColor White

az staticwebapp appsettings set `
    --name $StaticWebAppName `
    --setting-names `
        "AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING=$connectionString" `
        "EMAIL_SENDER_ADDRESS=$senderAddress" `
        "EMAIL_SENDER_DISPLAY_NAME=Member Notification"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "SUCCESS! Email service deployed." -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Resources created:" -ForegroundColor Cyan
    Write-Host "  - Communication Services: $CommunicationServiceName" -ForegroundColor White
    Write-Host "  - Email Service: $EmailServiceName" -ForegroundColor White
    Write-Host "  - Sender: Member Notification <$senderAddress>" -ForegroundColor White
    Write-Host ""
    Write-Host "NOTE: For custom domain (somos.tech):" -ForegroundColor Yellow
    Write-Host "  1. Go to Azure Portal > Email Communication Services" -ForegroundColor White
    Write-Host "  2. Click 'Provision domains' > 'Add domain' > 'Custom domain'" -ForegroundColor White
    Write-Host "  3. Add DNS records (SPF, DKIM, DMARC)" -ForegroundColor White
    Write-Host "  4. Update EMAIL_SENDER_ADDRESS to DO-NOT-REPLY@somos.tech" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "ERROR: Failed to configure Static Web App" -ForegroundColor Red
    Write-Host ""
    Write-Host "Manual setup - add these to Static Web App Configuration:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING:" -ForegroundColor Cyan
    Write-Host "$connectionString" -ForegroundColor White
    Write-Host ""
    Write-Host "EMAIL_SENDER_ADDRESS:" -ForegroundColor Cyan
    Write-Host "$senderAddress" -ForegroundColor White
    Write-Host ""
    Write-Host "EMAIL_SENDER_DISPLAY_NAME:" -ForegroundColor Cyan
    Write-Host "Member Notification" -ForegroundColor White
}
