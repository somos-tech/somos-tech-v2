# PowerShell deployment script for SOMOS.tech infrastructure
# This script deploys the Azure resources using Bicep

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('dev', 'prod')]
    [string]$Environment = 'dev',
    
    [Parameter(Mandatory=$false)]
    [string]$Location = 'westus2',
    
    [Parameter(Mandatory=$true)]
    [string]$TenantId,
    
    [Parameter(Mandatory=$false)]
    [string]$AllowedAdminDomain = 'somos.tech',
    
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroupName = "rg-somos-tech-$Environment"
)

# Set error action preference
$ErrorActionPreference = 'Stop'

Write-Host "🚀 Starting SOMOS.tech infrastructure deployment" -ForegroundColor Cyan
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host "Location: $Location" -ForegroundColor Yellow
Write-Host "Tenant ID: $TenantId" -ForegroundColor Yellow
Write-Host "Allowed Admin Domain: $AllowedAdminDomain" -ForegroundColor Yellow

# Check if Azure CLI is installed
try {
    $azVersion = az version --output json | ConvertFrom-Json
    Write-Host "✅ Azure CLI version: $($azVersion.'azure-cli')" -ForegroundColor Green
} catch {
    Write-Host "❌ Azure CLI is not installed. Please install it from https://aka.ms/InstallAzureCLI" -ForegroundColor Red
    exit 1
}

# Check if logged in
Write-Host "`n🔐 Checking Azure login status..." -ForegroundColor Cyan
$accountInfo = az account show 2>$null | ConvertFrom-Json
if (-not $accountInfo) {
    Write-Host "Not logged in. Please login..." -ForegroundColor Yellow
    az login --tenant $TenantId
    $accountInfo = az account show | ConvertFrom-Json
}

Write-Host "✅ Logged in as: $($accountInfo.user.name)" -ForegroundColor Green
Write-Host "   Subscription: $($accountInfo.name)" -ForegroundColor Gray

# Create resource group if it doesn't exist
Write-Host "`n📦 Creating resource group: $ResourceGroupName" -ForegroundColor Cyan
az group create --name $ResourceGroupName --location $Location --output none
Write-Host "✅ Resource group ready" -ForegroundColor Green

# Deploy Bicep template
Write-Host "`n🏗️  Deploying infrastructure..." -ForegroundColor Cyan
$deploymentName = "somos-tech-deploy-$(Get-Date -Format 'yyyyMMdd-HHmmss')"

# Get the script directory
$scriptPath = Split-Path -Parent $PSCommandPath
$bicepFile = Join-Path $scriptPath "main.bicep"

$deploymentOutput = az deployment group create `
    --name $deploymentName `
    --resource-group $ResourceGroupName `
    --template-file $bicepFile `
    --parameters environmentName=$Environment `
                 location=$Location `
                 azureAdTenantId=$TenantId `
                 allowedAdminDomain=$AllowedAdminDomain `
    --output json | ConvertFrom-Json

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green

# Extract outputs
$outputs = $deploymentOutput.properties.outputs

Write-Host "`n📋 Deployment Outputs:" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

$staticWebAppName = $outputs.staticWebAppName.value
$staticWebAppUrl = $outputs.staticWebAppUrl.value
$functionAppName = $outputs.functionAppName.value
$functionAppUrl = $outputs.functionAppUrl.value
$cosmosDbAccountName = $outputs.cosmosDbAccountName.value
$cosmosDbEndpoint = $outputs.cosmosDbEndpoint.value
$cosmosDbDatabaseName = $outputs.cosmosDbDatabaseName.value

Write-Host "Static Web App:" -ForegroundColor Yellow
Write-Host "  Name: $staticWebAppName" -ForegroundColor White
Write-Host "  URL:  $staticWebAppUrl" -ForegroundColor White

Write-Host "`nFunction App:" -ForegroundColor Yellow
Write-Host "  Name: $functionAppName" -ForegroundColor White
Write-Host "  URL:  $functionAppUrl" -ForegroundColor White

Write-Host "`nCosmos DB:" -ForegroundColor Yellow
Write-Host "  Account: $cosmosDbAccountName" -ForegroundColor White
Write-Host "  Endpoint: $cosmosDbEndpoint" -ForegroundColor White
Write-Host "  Database: $cosmosDbDatabaseName" -ForegroundColor White

# Get Static Web App deployment token
Write-Host "`n🔑 Getting Static Web App deployment token..." -ForegroundColor Cyan
$swaToken = az staticwebapp secrets list `
    --name $staticWebAppName `
    --resource-group $ResourceGroupName `
    --query "properties.apiKey" `
    --output tsv

Write-Host "✅ Deployment token retrieved" -ForegroundColor Green

# Create GitHub secrets setup instructions
Write-Host "`n📝 GitHub Secrets Setup:" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "Add these secrets to your GitHub repository:" -ForegroundColor Yellow
Write-Host "`nRepository: somos-tech/somos-tech-v2" -ForegroundColor White
Write-Host "Settings → Secrets and variables → Actions → New repository secret" -ForegroundColor Gray

Write-Host "`nAZURE_STATIC_WEB_APPS_API_TOKEN:" -ForegroundColor Cyan
Write-Host $swaToken -ForegroundColor White

# Get Azure AD App Registration instructions
Write-Host "`n🔐 Azure AD App Registration:" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "Follow these steps to complete authentication setup:" -ForegroundColor Yellow

Write-Host "`n1. Go to Azure Portal → Azure Active Directory → App registrations" -ForegroundColor White
Write-Host "2. Click 'New registration'" -ForegroundColor White
Write-Host "3. Name: 'SOMOS.tech Admin Portal'" -ForegroundColor White
Write-Host "4. Redirect URI: $staticWebAppUrl/.auth/login/aad/callback" -ForegroundColor Cyan
Write-Host "5. After creation, go to 'Certificates & secrets' and create a new client secret" -ForegroundColor White
Write-Host "6. Copy the Client ID and Client Secret" -ForegroundColor White

Write-Host "`n7. Add these to Static Web App configuration:" -ForegroundColor White
Write-Host "   az staticwebapp appsettings set \`" -ForegroundColor Gray
Write-Host "     --name $staticWebAppName \`" -ForegroundColor Gray
Write-Host "     --resource-group $ResourceGroupName \`" -ForegroundColor Gray
Write-Host "     --setting-names AZURE_CLIENT_ID='<your-client-id>' \`" -ForegroundColor Gray
Write-Host "                     AZURE_CLIENT_SECRET='<your-client-secret>'" -ForegroundColor Gray

# Save deployment info to file
$deploymentInfo = @{
    deploymentName = $deploymentName
    timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    environment = $Environment
    resourceGroup = $ResourceGroupName
    staticWebApp = @{
        name = $staticWebAppName
        url = $staticWebAppUrl
    }
    functionApp = @{
        name = $functionAppName
        url = $functionAppUrl
    }
    cosmosDb = @{
        account = $cosmosDbAccountName
        endpoint = $cosmosDbEndpoint
        database = $cosmosDbDatabaseName
    }
    tenantId = $TenantId
    allowedDomain = $AllowedAdminDomain
}

$deploymentInfoJson = $deploymentInfo | ConvertTo-Json -Depth 10
$deploymentInfoJson | Out-File -FilePath "./deployment-output.json" -Encoding UTF8

Write-Host "`n💾 Deployment info saved to: deployment-output.json" -ForegroundColor Green

Write-Host "`n✨ Deployment complete!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. ✅ Complete Azure AD App Registration (see instructions above)" -ForegroundColor White
Write-Host "2. ✅ Add GitHub secret for deployment token" -ForegroundColor White
Write-Host "3. ✅ Configure Static Web App settings with client ID and secret" -ForegroundColor White
Write-Host "4. ✅ Push code to trigger deployment" -ForegroundColor White
Write-Host "5. ✅ Test authentication at: $staticWebAppUrl/admin/events" -ForegroundColor White
