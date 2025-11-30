# Configure VirusTotal API Key
# 
# VirusTotal provides free API access for URL/link safety scanning.
# Free tier: 500 requests/day, 4 requests/minute
#
# Steps to get your API key:
# 1. Go to https://www.virustotal.com/gui/join-us
# 2. Create a free account
# 3. After login, go to your profile: https://www.virustotal.com/gui/user/{username}/apikey
# 4. Copy your API key
# 5. Run this script with your key

param(
    [Parameter(Mandatory=$true)]
    [string]$ApiKey
)

$ErrorActionPreference = "Stop"

# Validate API key format (64 character hex string)
if ($ApiKey.Length -ne 64 -or $ApiKey -notmatch '^[a-f0-9]+$') {
    Write-Host "❌ Invalid API key format. VirusTotal API keys are 64 character hex strings." -ForegroundColor Red
    exit 1
}

Write-Host "📡 Testing VirusTotal API key..." -ForegroundColor Cyan

# Test the API key
try {
    $headers = @{ "x-apikey" = $ApiKey }
    $response = Invoke-RestMethod -Uri "https://www.virustotal.com/api/v3/users/current" -Headers $headers -Method Get
    Write-Host "✅ API key is valid! Account: $($response.data.attributes.email)" -ForegroundColor Green
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "❌ Invalid API key. Please check your key and try again." -ForegroundColor Red
        exit 1
    }
    Write-Host "⚠️ Could not verify API key (network issue?), but continuing..." -ForegroundColor Yellow
}

Write-Host "`n🔧 Setting VirusTotal API key in Azure Static Web App..." -ForegroundColor Cyan

# Set the API key in Azure SWA
az staticwebapp appsettings set `
    --name swa-somos-tech-dev-64qb73pzvgekw `
    --resource-group rg-somos-tech-dev `
    --setting-names "VIRUSTOTAL_API_KEY=$ApiKey" `
    --output none

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ VirusTotal API key configured successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "The API is now ready to use. Features enabled:" -ForegroundColor White
    Write-Host "  • Link safety scanning in community messages" -ForegroundColor Gray
    Write-Host "  • URL malware/phishing detection" -ForegroundColor Gray
    Write-Host "  • Tier 2 content moderation" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Rate limits (Free tier):" -ForegroundColor Yellow
    Write-Host "  • 500 requests per day" -ForegroundColor Gray
    Write-Host "  • 4 requests per minute" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Note: Changes may take a few minutes to propagate." -ForegroundColor Cyan
} else {
    Write-Host "❌ Failed to set API key. Check Azure CLI login status." -ForegroundColor Red
    exit 1
}
