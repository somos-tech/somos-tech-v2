# PowerShell script to configure Azure AD authentication for SOMOS.tech
# This script creates the Azure AD app registration and configures the Static Web App

param(
    [Parameter(Mandatory=$true)]
    [string]$StaticWebAppUrl,
    
    [Parameter(Mandatory=$true)]
    [string]$StaticWebAppName,
    
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroupName,
    
    [Parameter(Mandatory=$false)]
    [string]$AppDisplayName = "SOMOS.tech Admin Portal"
)

$ErrorActionPreference = 'Stop'

Write-Host "🔐 Configuring Azure AD Authentication for SOMOS.tech" -ForegroundColor Cyan
Write-Host "Static Web App: $StaticWebAppName" -ForegroundColor Yellow
Write-Host "URL: $StaticWebAppUrl" -ForegroundColor Yellow

# Construct the redirect URI
$redirectUri = "$StaticWebAppUrl/.auth/login/aad/callback"

Write-Host "`n📝 Creating Azure AD App Registration..." -ForegroundColor Cyan

# Create the app registration
$appManifest = @"
{
    "displayName": "$AppDisplayName",
    "signInAudience": "AzureADMyOrg",
    "web": {
        "redirectUris": ["$redirectUri"],
        "implicitGrantSettings": {
            "enableIdTokenIssuance": true
        }
    },
    "requiredResourceAccess": [
        {
            "resourceAppId": "00000003-0000-0000-c000-000000000000",
            "resourceAccess": [
                {
                    "id": "e1fe6dd8-ba31-4d61-89e7-88639da4683d",
                    "type": "Scope"
                },
                {
                    "id": "37f7f235-527c-4136-accd-4a02d197296e",
                    "type": "Scope"
                },
                {
                    "id": "14dad69e-099b-42c9-810b-d002981feec1",
                    "type": "Scope"
                }
            ]
        }
    ]
}
"@

# Save manifest to temp file
$manifestFile = [System.IO.Path]::GetTempFileName()
$appManifest | Out-File -FilePath $manifestFile -Encoding UTF8

try {
    # Create app registration
    $app = az ad app create --display-name $AppDisplayName --manifest $manifestFile | ConvertFrom-Json
    
    if (-not $app) {
        throw "Failed to create app registration"
    }
    
    $appId = $app.appId
    $objectId = $app.id
    
    Write-Host "✅ App registration created" -ForegroundColor Green
    Write-Host "   App ID: $appId" -ForegroundColor White
    Write-Host "   Object ID: $objectId" -ForegroundColor White
    
    # Create a client secret
    Write-Host "`n🔑 Creating client secret..." -ForegroundColor Cyan
    $secretResult = az ad app credential reset --id $appId --append --display-name "SWA Auth Secret" | ConvertFrom-Json
    $clientSecret = $secretResult.password
    
    Write-Host "✅ Client secret created" -ForegroundColor Green
    Write-Host "   Secret: $clientSecret" -ForegroundColor Yellow
    Write-Host "   ⚠️  SAVE THIS SECRET - You won't be able to see it again!" -ForegroundColor Red
    
    # Get tenant ID
    $tenantId = (az account show | ConvertFrom-Json).tenantId
    
    # Configure Static Web App settings
    Write-Host "`n⚙️  Configuring Static Web App..." -ForegroundColor Cyan
    
    az staticwebapp appsettings set `
        --name $StaticWebAppName `
        --resource-group $ResourceGroupName `
        --setting-names `
            "AZURE_CLIENT_ID=$appId" `
            "AZURE_CLIENT_SECRET=$clientSecret" `
        --output none
    
    Write-Host "✅ Static Web App configured" -ForegroundColor Green
    
    # Update staticwebapp.config.json tenant ID placeholder
    $configPath = "../apps/web/staticwebapp.config.json"
    if (Test-Path $configPath) {
        Write-Host "`n📝 Updating staticwebapp.config.json..." -ForegroundColor Cyan
        $config = Get-Content $configPath -Raw | ConvertFrom-Json
        
        if ($config.auth.identityProviders.azureActiveDirectory.registration.openIdIssuer) {
            $config.auth.identityProviders.azureActiveDirectory.registration.openIdIssuer = `
                "https://login.microsoftonline.com/$tenantId/v2.0"
            
            $config | ConvertTo-Json -Depth 10 | Set-Content $configPath
            Write-Host "✅ Configuration file updated" -ForegroundColor Green
        }
    }
    
    # Save configuration to file
    $authConfig = @{
        timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
        appRegistration = @{
            displayName = $AppDisplayName
            appId = $appId
            objectId = $objectId
            tenantId = $tenantId
        }
        staticWebApp = @{
            name = $StaticWebAppName
            url = $StaticWebAppUrl
            redirectUri = $redirectUri
        }
        clientSecret = $clientSecret
    }
    
    $authConfigJson = $authConfig | ConvertTo-Json -Depth 10
    $authConfigJson | Out-File -FilePath "./auth-config.json" -Encoding UTF8
    
    Write-Host "`n💾 Authentication config saved to: auth-config.json" -ForegroundColor Green
    Write-Host "   ⚠️  This file contains sensitive information - DO NOT commit to git!" -ForegroundColor Red
    
    # Display summary
    Write-Host "`n✨ Authentication Configuration Complete!" -ForegroundColor Green
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    
    Write-Host "`nAzure AD App Registration:" -ForegroundColor Cyan
    Write-Host "  App Name: $AppDisplayName" -ForegroundColor White
    Write-Host "  App ID: $appId" -ForegroundColor White
    Write-Host "  Tenant ID: $tenantId" -ForegroundColor White
    Write-Host "  Redirect URI: $redirectUri" -ForegroundColor White
    
    Write-Host "`nStatic Web App Settings:" -ForegroundColor Cyan
    Write-Host "  ✅ AZURE_CLIENT_ID configured" -ForegroundColor Green
    Write-Host "  ✅ AZURE_CLIENT_SECRET configured" -ForegroundColor Green
    
    Write-Host "`n🧪 Testing:" -ForegroundColor Cyan
    Write-Host "  Navigate to: $StaticWebAppUrl/admin/events" -ForegroundColor White
    Write-Host "  You should be redirected to Microsoft login" -ForegroundColor White
    Write-Host "  Only users with @somos.tech email will have admin access" -ForegroundColor White
    
    Write-Host "`n⚠️  Important:" -ForegroundColor Yellow
    Write-Host "  - Client secret has been saved to auth-config.json" -ForegroundColor White
    Write-Host "  - Add auth-config.json to .gitignore" -ForegroundColor White
    Write-Host "  - Secret expires in 24 months - set a reminder to rotate it" -ForegroundColor White
    
} catch {
    Write-Host "`n❌ Error: $_" -ForegroundColor Red
    exit 1
} finally {
    # Clean up temp file
    if (Test-Path $manifestFile) {
        Remove-Item $manifestFile
    }
}
