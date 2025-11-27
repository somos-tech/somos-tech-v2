# Setup Email Permissions for Azure Communication Services
# This script configures the necessary permissions and retrieves the connection string

param(
    [string]$CommunicationServiceName,
    [string]$EmailServiceName,
    [string]$ResourceGroup = "somos-tech-rg",
    [string]$StaticWebAppName = "somos-tech",
    [switch]$ListResources,
    [switch]$Configure
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Azure Communication Services Email Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if logged into Azure
Write-Host "Checking Azure CLI login status..." -ForegroundColor Yellow
$account = az account show 2>$null | ConvertFrom-Json
if (-not $account) {
    Write-Host "Not logged into Azure. Running 'az login'..." -ForegroundColor Yellow
    az login
    $account = az account show | ConvertFrom-Json
}
Write-Host "Logged in as: $($account.user.name)" -ForegroundColor Green
Write-Host "Subscription: $($account.name)" -ForegroundColor Green
Write-Host ""

# List available Communication Services resources
if ($ListResources -or (-not $CommunicationServiceName)) {
    Write-Host "Finding Communication Services resources..." -ForegroundColor Yellow
    $commServices = az communication list 2>$null | ConvertFrom-Json
    
    if ($commServices -and $commServices.Count -gt 0) {
        Write-Host ""
        Write-Host "Available Communication Services:" -ForegroundColor Cyan
        $commServices | ForEach-Object {
            Write-Host "  - Name: $($_.name)" -ForegroundColor White
            Write-Host "    Resource Group: $($_.resourceGroup)" -ForegroundColor Gray
            Write-Host "    Location: $($_.location)" -ForegroundColor Gray
            Write-Host ""
        }
    } else {
        Write-Host "No Communication Services found. Creating one..." -ForegroundColor Yellow
    }
    
    Write-Host "Finding Email Communication Services resources..." -ForegroundColor Yellow
    $emailServices = az communication email list 2>$null | ConvertFrom-Json
    
    if ($emailServices -and $emailServices.Count -gt 0) {
        Write-Host ""
        Write-Host "Available Email Communication Services:" -ForegroundColor Cyan
        $emailServices | ForEach-Object {
            Write-Host "  - Name: $($_.name)" -ForegroundColor White
            Write-Host "    Resource Group: $($_.resourceGroup)" -ForegroundColor Gray
            Write-Host ""
        }
    }
    
    if (-not $Configure) {
        Write-Host ""
        Write-Host "To configure, run with -Configure flag and specify resource names:" -ForegroundColor Yellow
        Write-Host "  .\setup-email-permissions.ps1 -CommunicationServiceName <name> -ResourceGroup <rg> -Configure" -ForegroundColor White
        exit 0
    }
}

if ($Configure) {
    if (-not $CommunicationServiceName) {
        # Try to find automatically
        $commServices = az communication list 2>$null | ConvertFrom-Json
        if ($commServices -and $commServices.Count -eq 1) {
            $CommunicationServiceName = $commServices[0].name
            $ResourceGroup = $commServices[0].resourceGroup
            Write-Host "Auto-detected Communication Service: $CommunicationServiceName" -ForegroundColor Green
        } else {
            Write-Host "ERROR: Please specify -CommunicationServiceName" -ForegroundColor Red
            exit 1
        }
    }

    Write-Host ""
    Write-Host "Step 1: Checking Communication Service connection..." -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    
    # Get the connection string
    Write-Host "Retrieving connection string..." -ForegroundColor Yellow
    $keys = az communication list-key --name $CommunicationServiceName --resource-group $ResourceGroup 2>$null | ConvertFrom-Json
    
    if (-not $keys) {
        Write-Host "ERROR: Could not retrieve keys for $CommunicationServiceName" -ForegroundColor Red
        Write-Host "Make sure the resource exists and you have access." -ForegroundColor Yellow
        exit 1
    }
    
    $connectionString = $keys.primaryConnectionString
    Write-Host "Connection string retrieved successfully!" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "Step 2: Checking linked email domains..." -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    
    # Check linked domains
    $commResource = az communication show --name $CommunicationServiceName --resource-group $ResourceGroup 2>$null | ConvertFrom-Json
    
    if ($commResource.linkedDomains -and $commResource.linkedDomains.Count -gt 0) {
        Write-Host "Linked domains found:" -ForegroundColor Green
        $commResource.linkedDomains | ForEach-Object {
            Write-Host "  - $_" -ForegroundColor White
        }
    } else {
        Write-Host "WARNING: No email domains linked to this Communication Service" -ForegroundColor Yellow
        Write-Host "You need to link an email domain before sending emails." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "To link a domain:" -ForegroundColor Cyan
        Write-Host "  1. Go to Azure Portal > Communication Services > $CommunicationServiceName" -ForegroundColor White
        Write-Host "  2. Click 'Email' > 'Domains' in the left menu" -ForegroundColor White
        Write-Host "  3. Click 'Connect domain' and select your verified domain" -ForegroundColor White
    }
    
    Write-Host ""
    Write-Host "Step 3: Getting sender addresses..." -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    
    # List email services and domains
    $emailServices = az communication email list --resource-group $ResourceGroup 2>$null | ConvertFrom-Json
    
    if ($emailServices) {
        foreach ($emailSvc in $emailServices) {
            Write-Host "Email Service: $($emailSvc.name)" -ForegroundColor White
            
            # Get domains for this email service
            $domains = az communication email domain list --email-service-name $emailSvc.name --resource-group $ResourceGroup 2>$null | ConvertFrom-Json
            
            if ($domains) {
                foreach ($domain in $domains) {
                    Write-Host "  Domain: $($domain.name)" -ForegroundColor Cyan
                    Write-Host "    Status: $($domain.domainManagement)" -ForegroundColor Gray
                    Write-Host "    Mail From: $($domain.mailFromSenderDomain)" -ForegroundColor Gray
                    
                    if ($domain.validSenderUsernames) {
                        Write-Host "    Valid Sender Addresses:" -ForegroundColor Green
                        $domain.validSenderUsernames.PSObject.Properties | ForEach-Object {
                            $senderEmail = "$($_.Name)@$($domain.mailFromSenderDomain)"
                            Write-Host "      - $senderEmail ($($_.Value))" -ForegroundColor White
                        }
                    }
                }
            }
        }
    }
    
    Write-Host ""
    Write-Host "Step 4: Configuring Static Web App..." -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    
    # Set the environment variables
    $senderAddress = "DO-NOT-REPLY@somos.tech"
    $senderDisplayName = "Member Notification"
    
    Write-Host "Setting application settings..." -ForegroundColor Yellow
    Write-Host "  Sender Address: $senderAddress" -ForegroundColor White
    Write-Host "  Sender Display Name: $senderDisplayName" -ForegroundColor White
    
    $result = az staticwebapp appsettings set `
        --name $StaticWebAppName `
        --setting-names `
            "AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING=$connectionString" `
            "EMAIL_SENDER_ADDRESS=$senderAddress" `
            "EMAIL_SENDER_DISPLAY_NAME=$senderDisplayName" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "SUCCESS! Email permissions configured." -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Configuration complete:" -ForegroundColor Cyan
        Write-Host "  Communication Service: $CommunicationServiceName" -ForegroundColor White
        Write-Host "  Static Web App: $StaticWebAppName" -ForegroundColor White
        Write-Host "  Sender: $senderDisplayName <$senderAddress>" -ForegroundColor White
        Write-Host ""
        Write-Host "Environment variables set:" -ForegroundColor Cyan
        Write-Host "  ✓ AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING" -ForegroundColor Green
        Write-Host "  ✓ EMAIL_SENDER_ADDRESS" -ForegroundColor Green
        Write-Host "  ✓ EMAIL_SENDER_DISPLAY_NAME" -ForegroundColor Green
        Write-Host ""
        Write-Host "You can now send emails from the Admin Notifications page!" -ForegroundColor Yellow
    } else {
        Write-Host "ERROR: Failed to set application settings" -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
        
        Write-Host ""
        Write-Host "Manual configuration:" -ForegroundColor Yellow
        Write-Host "Add these settings in Azure Portal > Static Web App > Configuration:" -ForegroundColor White
        Write-Host ""
        Write-Host "AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING:" -ForegroundColor Cyan
        Write-Host $connectionString -ForegroundColor Gray
        Write-Host ""
        Write-Host "EMAIL_SENDER_ADDRESS:" -ForegroundColor Cyan
        Write-Host $senderAddress -ForegroundColor Gray
        Write-Host ""
        Write-Host "EMAIL_SENDER_DISPLAY_NAME:" -ForegroundColor Cyan
        Write-Host $senderDisplayName -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Usage Examples:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "List all resources:" -ForegroundColor Yellow
Write-Host "  .\setup-email-permissions.ps1 -ListResources" -ForegroundColor White
Write-Host ""
Write-Host "Auto-configure (if single resource):" -ForegroundColor Yellow
Write-Host "  .\setup-email-permissions.ps1 -Configure" -ForegroundColor White
Write-Host ""
Write-Host "Configure specific resource:" -ForegroundColor Yellow
Write-Host "  .\setup-email-permissions.ps1 -CommunicationServiceName myservice -ResourceGroup myrg -Configure" -ForegroundColor White
