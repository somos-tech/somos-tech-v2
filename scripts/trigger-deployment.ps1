# Trigger Static Web App Deployment via GitHub Actions
# This manually triggers the workflow to deploy authentication config changes

param(
    [string]$Environment = "dev",
    [string]$Owner = "somos-tech",
    [string]$Repo = "somos-tech-v2"
)

Write-Host "Triggering Static Web App deployment..." -ForegroundColor Cyan
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host ""

# Using GitHub CLI would be ideal, but since it's not installed, we'll use the API
$workflowFile = "deploy-static-web-app.yml"
$branch = "main"

Write-Host "To trigger the deployment manually, you have two options:" -ForegroundColor Yellow
Write-Host ""

Write-Host "Option 1: Via GitHub Web Interface" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "1. Go to: https://github.com/$Owner/$Repo/actions/workflows/$workflowFile" -ForegroundColor White
Write-Host "2. Click the 'Run workflow' button (top right)" -ForegroundColor White
Write-Host "3. Select environment: $Environment" -ForegroundColor White
Write-Host "4. Click 'Run workflow'" -ForegroundColor White
Write-Host ""

Write-Host "Option 2: Via API (requires GitHub token)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "If you have a GitHub Personal Access Token, run:" -ForegroundColor White
Write-Host ""
$apiCommand = @"
`$token = "YOUR_GITHUB_TOKEN"
`$headers = @{
    "Accept" = "application/vnd.github+json"
    "Authorization" = "Bearer `$token"
    "X-GitHub-Api-Version" = "2022-11-28"
}
`$body = @{
    ref = "$branch"
    inputs = @{
        environment = "$Environment"
    }
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://api.github.com/repos/$Owner/$Repo/actions/workflows/$workflowFile/dispatches" ``
    -Method Post ``
    -Headers `$headers ``
    -Body `$body ``
    -ContentType "application/json"
"@
Write-Host $apiCommand -ForegroundColor Gray
Write-Host ""

Write-Host "Option 3: Use Azure Static Web App CLI (fastest)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Deploy directly from your local machine:" -ForegroundColor White
Write-Host ""
Write-Host "cd apps/web" -ForegroundColor Gray
Write-Host "npm install" -ForegroundColor Gray
Write-Host "npm run build" -ForegroundColor Gray
Write-Host "az staticwebapp deploy \" -ForegroundColor Gray
Write-Host "  --name swa-somos-tech-dev-64qb73pzvgekw \" -ForegroundColor Gray
Write-Host "  --resource-group rg-somos-tech-dev \" -ForegroundColor Gray
Write-Host "  --source ./dist" -ForegroundColor Gray
Write-Host ""

# Ask user which option they want
Write-Host "Which option would you like to use?" -ForegroundColor Yellow
Write-Host "[1] Open GitHub Actions in browser" -ForegroundColor White
Write-Host "[2] Deploy via Azure CLI (recommended - fastest)" -ForegroundColor White
Write-Host "[3] Show me the manual steps" -ForegroundColor White
Write-Host ""
$choice = Read-Host "Enter choice (1-3)"

switch ($choice) {
    "1" {
        Write-Host "Opening GitHub Actions..." -ForegroundColor Green
        Start-Process "https://github.com/$Owner/$Repo/actions/workflows/$workflowFile"
    }
    "2" {
        Write-Host "Starting local build and deploy..." -ForegroundColor Green
        Write-Host ""
        
        # Build the web app
        Write-Host "Building web app..." -ForegroundColor Cyan
        Push-Location apps/web
        
        # Install dependencies if needed
        if (-not (Test-Path "node_modules")) {
            Write-Host "Installing dependencies..." -ForegroundColor Yellow
            npm install
        }
        
        # Build
        Write-Host "Running build..." -ForegroundColor Yellow
        npm run build
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Build successful!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Deploying to Azure Static Web App..." -ForegroundColor Cyan
            
            az staticwebapp deploy `
                --name swa-somos-tech-dev-64qb73pzvgekw `
                --resource-group rg-somos-tech-dev `
                --source ./dist `
                --no-wait
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Deployment initiated!" -ForegroundColor Green
                Write-Host ""
                Write-Host "The deployment will complete in a few minutes." -ForegroundColor Yellow
                Write-Host "You can check status at: https://portal.azure.com" -ForegroundColor Gray
            } else {
                Write-Host "❌ Deployment failed" -ForegroundColor Red
            }
        } else {
            Write-Host "❌ Build failed" -ForegroundColor Red
        }
        
        Pop-Location
    }
    "3" {
        Write-Host ""
        Write-Host "Manual Steps:" -ForegroundColor Cyan
        Write-Host "=============" -ForegroundColor Cyan
        Write-Host "1. Navigate to GitHub Actions" -ForegroundColor White
        Write-Host "2. Find 'Deploy Static Web App (Manual Only)' workflow" -ForegroundColor White
        Write-Host "3. Click 'Run workflow' button" -ForegroundColor White
        Write-Host "4. Select environment: $Environment" -ForegroundColor White
        Write-Host "5. Click the green 'Run workflow' button" -ForegroundColor White
        Write-Host "6. Wait for deployment to complete (~2-3 minutes)" -ForegroundColor White
        Write-Host ""
    }
    default {
        Write-Host "Invalid choice. Exiting." -ForegroundColor Red
    }
}
