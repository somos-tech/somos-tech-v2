# Script to check Azure deployment status and Cosmos DB configuration
# Run this to diagnose the admin API issues

Write-Host "=== Azure Deployment Diagnostics ===" -ForegroundColor Cyan
Write-Host ""

# Check if logged in to Azure
Write-Host "Checking Azure CLI login status..." -ForegroundColor Yellow
$account = az account show 2>$null | ConvertFrom-Json
if (-not $account) {
    Write-Host "Not logged in to Azure. Running 'az login'..." -ForegroundColor Red
    az login
    $account = az account show | ConvertFrom-Json
}

Write-Host "Logged in as: $($account.user.name)" -ForegroundColor Green
Write-Host "Subscription: $($account.name) ($($account.id))" -ForegroundColor Green
Write-Host ""

# Get resource group (assuming dev environment)
$resourceGroup = Read-Host "Enter resource group name (or press Enter for 'rg-somos-tech-dev')"
if ([string]::IsNullOrWhiteSpace($resourceGroup)) {
    $resourceGroup = "rg-somos-tech-dev"
}

Write-Host "Using resource group: $resourceGroup" -ForegroundColor Cyan
Write-Host ""

# Get Function App name
Write-Host "Finding Function App..." -ForegroundColor Yellow
$functionApps = az functionapp list --resource-group $resourceGroup 2>$null | ConvertFrom-Json
if ($functionApps) {
    $functionApp = $functionApps[0]
    Write-Host "Found Function App: $($functionApp.name)" -ForegroundColor Green
    
    # Get Function App settings
    Write-Host "`nChecking Function App configuration..." -ForegroundColor Yellow
    $settings = az functionapp config appsettings list --name $functionApp.name --resource-group $resourceGroup | ConvertFrom-Json
    
    $cosmosEndpoint = ($settings | Where-Object { $_.name -eq "COSMOS_ENDPOINT" }).value
    $cosmosDbName = ($settings | Where-Object { $_.name -eq "COSMOS_DATABASE_NAME" }).value
    $nodeEnv = ($settings | Where-Object { $_.name -eq "NODE_ENV" }).value
    
    Write-Host "  COSMOS_ENDPOINT: $cosmosEndpoint" -ForegroundColor $(if ($cosmosEndpoint) { "Green" } else { "Red" })
    Write-Host "  COSMOS_DATABASE_NAME: $cosmosDbName" -ForegroundColor $(if ($cosmosDbName) { "Green" } else { "Red" })
    Write-Host "  NODE_ENV: $nodeEnv" -ForegroundColor $(if ($nodeEnv -and $nodeEnv -ne "development") { "Green" } else { "Red" })
    
    # Get managed identity
    Write-Host "`nChecking Managed Identity..." -ForegroundColor Yellow
    $identity = az functionapp identity show --name $functionApp.name --resource-group $resourceGroup 2>$null | ConvertFrom-Json
    if ($identity -and $identity.principalId) {
        Write-Host "  System-assigned identity: Enabled" -ForegroundColor Green
        Write-Host "  Principal ID: $($identity.principalId)" -ForegroundColor Green
    } else {
        Write-Host "  System-assigned identity: NOT ENABLED" -ForegroundColor Red
        Write-Host "  This is likely the problem!" -ForegroundColor Red
    }
} else {
    Write-Host "No Function App found in resource group $resourceGroup" -ForegroundColor Red
}

# Get Cosmos DB account
Write-Host "`nFinding Cosmos DB account..." -ForegroundColor Yellow
$cosmosAccounts = az cosmosdb list --resource-group $resourceGroup 2>$null | ConvertFrom-Json
if ($cosmosAccounts) {
    $cosmosAccount = $cosmosAccounts[0]
    Write-Host "Found Cosmos DB: $($cosmosAccount.name)" -ForegroundColor Green
    Write-Host "  Endpoint: $($cosmosAccount.documentEndpoint)" -ForegroundColor Green
    
    # Check if endpoints match
    if ($cosmosEndpoint -eq $cosmosAccount.documentEndpoint) {
        Write-Host "  ✓ Function App endpoint matches Cosmos DB" -ForegroundColor Green
    } else {
        Write-Host "  ✗ MISMATCH: Function App has different endpoint!" -ForegroundColor Red
        Write-Host "    Function App: $cosmosEndpoint" -ForegroundColor Red
        Write-Host "    Cosmos DB: $($cosmosAccount.documentEndpoint)" -ForegroundColor Red
    }
    
    # Check SQL role assignments
    if ($identity -and $identity.principalId) {
        Write-Host "`nChecking Cosmos DB role assignments..." -ForegroundColor Yellow
        $roleAssignments = az cosmosdb sql role assignment list --account-name $cosmosAccount.name --resource-group $resourceGroup 2>$null | ConvertFrom-Json
        
        $hasAssignment = $roleAssignments | Where-Object { $_.principalId -eq $identity.principalId }
        if ($hasAssignment) {
            Write-Host "  ✓ Function App has role assignment in Cosmos DB" -ForegroundColor Green
            Write-Host "    Role Definition ID: $($hasAssignment.roleDefinitionId)" -ForegroundColor Green
        } else {
            Write-Host "  ✗ NO ROLE ASSIGNMENT FOUND" -ForegroundColor Red
            Write-Host "  This is the problem! Function App cannot access Cosmos DB." -ForegroundColor Red
            Write-Host "`nTo fix, run:" -ForegroundColor Yellow
            Write-Host "  az cosmosdb sql role assignment create \" -ForegroundColor White
            Write-Host "    --account-name $($cosmosAccount.name) \" -ForegroundColor White
            Write-Host "    --resource-group $resourceGroup \" -ForegroundColor White
            Write-Host "    --scope '/' \" -ForegroundColor White
            Write-Host "    --principal-id $($identity.principalId) \" -ForegroundColor White
            Write-Host "    --role-definition-id '00000000-0000-0000-0000-000000000002'" -ForegroundColor White
        }
    }
} else {
    Write-Host "No Cosmos DB account found in resource group $resourceGroup" -ForegroundColor Red
}

# Get recent Function App logs
if ($functionApp) {
    Write-Host "`n=== Recent Function App Logs ===" -ForegroundColor Cyan
    Write-Host "Fetching last 50 log entries..." -ForegroundColor Yellow
    az monitor app-insights query `
        --app $functionApp.name `
        --analytics-query "traces | where timestamp > ago(1h) | where message contains 'CosmosDB' or message contains 'adminUsers' or message contains 'adminListUsers' | order by timestamp desc | take 50 | project timestamp, message, severityLevel" `
        --resource-group $resourceGroup 2>$null
}

Write-Host "`n=== Diagnostics Complete ===" -ForegroundColor Cyan
