# Finish Email Setup for somos.tech Domain
# This script adds sender address and updates Static Web App configuration

param(
    [string]$ResourceGroup = "rg-somos-tech-prod",
    [string]$EmailServiceName = "somos-tech-email",
    [string]$CommunicationServiceName = "somos-tech-comm",
    [string]$StaticWebAppName = "swa-somos-tech-prod-tpthmei7wzupi",
    [string]$Domain = "somos.tech",
    [string]$SenderUsername = "DO-NOT-REPLY",
    [string]$SenderDisplayName = "Member Notification"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Finishing Email Setup for $Domain" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check domain verification
Write-Host "Step 1: Checking domain verification status..." -ForegroundColor Cyan
$domainInfo = az communication email domain show `
    --domain-name $Domain `
    --email-service-name $EmailServiceName `
    -g $ResourceGroup 2>$null | ConvertFrom-Json

if (-not $domainInfo) {
    Write-Host "ERROR: Domain $Domain not found" -ForegroundColor Red
    exit 1
}

Write-Host "  Domain: $($domainInfo.fromSenderDomain)" -ForegroundColor White
Write-Host "  SPF: $($domainInfo.verificationStates.SPF.status)" -ForegroundColor $(if ($domainInfo.verificationStates.SPF.status -eq "Verified") { "Green" } else { "Yellow" })
Write-Host "  DKIM: $($domainInfo.verificationStates.DKIM.status)" -ForegroundColor $(if ($domainInfo.verificationStates.DKIM.status -eq "Verified") { "Green" } else { "Yellow" })
Write-Host "  DKIM2: $($domainInfo.verificationStates.DKIM2.status)" -ForegroundColor $(if ($domainInfo.verificationStates.DKIM2.status -eq "Verified") { "Green" } else { "Yellow" })
Write-Host "  Domain: $($domainInfo.verificationStates.Domain.status)" -ForegroundColor $(if ($domainInfo.verificationStates.Domain.status -eq "Verified") { "Green" } else { "Yellow" })
Write-Host ""

# Step 2: Add sender username (MailFrom address)
Write-Host "Step 2: Adding sender address $SenderUsername@$Domain..." -ForegroundColor Cyan

$existingSenders = az communication email domain sender-username list `
    --domain-name $Domain `
    --email-service-name $EmailServiceName `
    -g $ResourceGroup 2>$null | ConvertFrom-Json

$senderExists = $existingSenders | Where-Object { $_.username -eq $SenderUsername }

if ($senderExists) {
    Write-Host "  Sender $SenderUsername already exists" -ForegroundColor Yellow
} else {
    az communication email domain sender-username create `
        --domain-name $Domain `
        --email-service-name $EmailServiceName `
        -g $ResourceGroup `
        --sender-username $SenderUsername `
        --display-name $SenderDisplayName
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Sender address created: $SenderUsername@$Domain" -ForegroundColor Green
    } else {
        Write-Host "  Failed to create sender address" -ForegroundColor Red
    }
}
Write-Host ""

# Step 3: Link domain to Communication Services
Write-Host "Step 3: Linking $Domain to Communication Services..." -ForegroundColor Cyan

$domainResourceId = "/subscriptions/8a61b9f5-71c9-420a-b42a-6daa8b1a3c94/resourceGroups/$ResourceGroup/providers/Microsoft.Communication/emailServices/$EmailServiceName/domains/$Domain"

$commService = az communication show --name $CommunicationServiceName -g $ResourceGroup 2>$null | ConvertFrom-Json

$linkedDomains = @($commService.linkedDomains)
if ($linkedDomains -contains $domainResourceId) {
    Write-Host "  Domain already linked" -ForegroundColor Yellow
} else {
    $linkedDomains += $domainResourceId
    $domainsString = $linkedDomains -join " "
    
    az communication update `
        --name $CommunicationServiceName `
        -g $ResourceGroup `
        --linked-domains $domainsString
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Domain linked successfully" -ForegroundColor Green
    } else {
        Write-Host "  Failed to link domain" -ForegroundColor Red
    }
}
Write-Host ""

# Step 4: Update Static Web App configuration
Write-Host "Step 4: Updating Static Web App configuration..." -ForegroundColor Cyan

$senderAddress = "$SenderUsername@$Domain"
Write-Host "  Sender Address: $senderAddress" -ForegroundColor White
Write-Host "  Display Name: $SenderDisplayName" -ForegroundColor White

az staticwebapp appsettings set `
    --name $StaticWebAppName `
    --setting-names `
        "EMAIL_SENDER_ADDRESS=$senderAddress" `
        "EMAIL_SENDER_DISPLAY_NAME=$SenderDisplayName"

if ($LASTEXITCODE -eq 0) {
    Write-Host "  Configuration updated!" -ForegroundColor Green
} else {
    Write-Host "  Failed to update configuration" -ForegroundColor Red
}
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Green
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Email Configuration:" -ForegroundColor Cyan
Write-Host "  From: $SenderDisplayName <$senderAddress>" -ForegroundColor White
Write-Host ""
Write-Host "You can now send emails from the Admin Notifications page!" -ForegroundColor Yellow
Write-Host ""

# Verify settings
Write-Host "Current sender addresses for $Domain`:" -ForegroundColor Cyan
az communication email domain sender-username list `
    --domain-name $Domain `
    --email-service-name $EmailServiceName `
    -g $ResourceGroup `
    -o table
