# Deploy Azure Functions API
# This script deploys the API functions to Azure

param(
    [string]$FunctionAppName = "func-somos-tech-dev-64qb73pzvgekw",
    [string]$ResourceGroup = "rg-somos-tech-dev"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Deploy API to Azure Functions         " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Azure Functions Core Tools is installed
$funcInstalled = Get-Command func -ErrorAction SilentlyContinue
if (-not $funcInstalled) {
    Write-Host "Azure Functions Core Tools not found." -ForegroundColor Yellow
    Write-Host "Attempting to deploy using Azure CLI instead..." -ForegroundColor Yellow
    Write-Host ""
    
    # Check if logged in
    $loginCheck = az account show 2>$null
    if (-not $loginCheck) {
        Write-Host "Not logged in. Running 'az login'..." -ForegroundColor Yellow
        az login
    }
    
    # Navigate to API directory
    $apiPath = Join-Path $PSScriptRoot "..\apps\api"
    Set-Location $apiPath
    
    Write-Host "Creating deployment package..." -ForegroundColor Yellow
    
    # Create a zip file
    $timestamp = Get-Date -Format "yyyyMMddHHmmss"
    $zipFile = "api-deployment-$timestamp.zip"
    
    # Get all files except node_modules
    $files = Get-ChildItem -Recurse -Exclude node_modules,*.zip
    Compress-Archive -Path * -DestinationPath $zipFile -Force
    
    Write-Host "✓ Package created: $zipFile" -ForegroundColor Green
    Write-Host ""
    Write-Host "Deploying to Azure..." -ForegroundColor Yellow
    
    # Deploy using Azure CLI
    az functionapp deployment source config-zip `
        --resource-group $ResourceGroup `
        --name $FunctionAppName `
        --src $zipFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Deployment successful!" -ForegroundColor Green
        Remove-Item $zipFile -Force
    } else {
        Write-Host "✗ Deployment failed" -ForegroundColor Red
        Write-Host "Zip file saved for manual deployment: $zipFile" -ForegroundColor Yellow
    }
    
} else {
    Write-Host "✓ Azure Functions Core Tools found" -ForegroundColor Green
    Write-Host ""
    
    # Navigate to API directory
    $apiPath = Join-Path $PSScriptRoot "..\apps\api"
    Set-Location $apiPath
    
    Write-Host "Deploying functions to $FunctionAppName..." -ForegroundColor Yellow
    Write-Host ""
    
    # Deploy using func tools
    func azure functionapp publish $FunctionAppName
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✓ Deployment successful!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "✗ Deployment failed" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Function App URL:" -ForegroundColor White
Write-Host "https://$FunctionAppName.azurewebsites.net" -ForegroundColor Cyan
Write-Host ""
Write-Host "Test Groups API:" -ForegroundColor White
Write-Host "https://$FunctionAppName.azurewebsites.net/api/groups" -ForegroundColor Cyan
Write-Host ""
