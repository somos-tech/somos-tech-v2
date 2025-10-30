# Simple API deployment script
$FunctionAppName = "func-somos-tech-dev-64qb73pzvgekw"
$ResourceGroup = "rg-somos-tech-dev"

Write-Host "Deploying API to Azure Functions..." -ForegroundColor Cyan

# Navigate to API directory
Set-Location "C:\Users\Admin\Documents\wixsite\somos-tech-prodv2\somos-tech-v2\apps\api"

# Create deployment package
$zipFile = "deploy.zip"
if (Test-Path $zipFile) { Remove-Item $zipFile -Force }

Write-Host "Creating deployment package..." -ForegroundColor Yellow
Compress-Archive -Path * -DestinationPath $zipFile -Force

Write-Host "Deploying to Azure..." -ForegroundColor Yellow
az functionapp deployment source config-zip `
    --resource-group $ResourceGroup `
    --name $FunctionAppName `
    --src $zipFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "Deployment successful!" -ForegroundColor Green
    Remove-Item $zipFile -Force
    Write-Host ""
    Write-Host "Test API: https://$FunctionAppName.azurewebsites.net/api/groups" -ForegroundColor Cyan
} else {
    Write-Host "Deployment failed" -ForegroundColor Red
}
