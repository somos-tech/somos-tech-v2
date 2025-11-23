# scripts/debug-cosmos-connection.ps1
# Script to debug Cosmos DB connection and RBAC settings

$ErrorActionPreference = "Stop"

# Configuration
$ResourceGroup = "rg-somos-tech-dev"
$CosmosAccountName = "cosmos-somos-tech-dev-64qb73pzvgekw"
$FunctionAppName = "func-somos-tech-dev-64qb73pzvgekw"
$ApiBaseUrl = "https://dev.somos.tech/api"

Write-Host "=== Cosmos DB Connection Debugger ===" -ForegroundColor Cyan
Write-Host "Resource Group: $ResourceGroup"
Write-Host "Cosmos Account: $CosmosAccountName"
Write-Host "Function App: $FunctionAppName"
Write-Host "API Base URL: $ApiBaseUrl"
Write-Host ""

# 1. Check Azure Login
Write-Host "1. Checking Azure Login..." -ForegroundColor Yellow
try {
    $account = az account show --output json | ConvertFrom-Json
    Write-Host "   Logged in as: $($account.user.name)" -ForegroundColor Green
    Write-Host "   Subscription: $($account.name) ($($account.id))" -ForegroundColor Green
} catch {
    Write-Error "   Not logged in to Azure CLI. Please run 'az login'."
    exit 1
}

# 2. Check Cosmos DB Account & Database
Write-Host "`n2. Check Cosmos DB Account & Database..." -ForegroundColor Yellow
try {
    $cosmos = az cosmosdb show --name $CosmosAccountName --resource-group $ResourceGroup --output json | ConvertFrom-Json
    Write-Host "   Cosmos DB Account found." -ForegroundColor Green
    Write-Host "   Document Endpoint: $($cosmos.documentEndpoint)" -ForegroundColor Gray

    # Check Database
    $DatabaseName = "somostech"
    Write-Host "   Checking for database '$DatabaseName'..."
    $dbs = az cosmosdb sql database list --account-name $CosmosAccountName --resource-group $ResourceGroup --output json | ConvertFrom-Json
    $dbExists = $false
    foreach ($db in $dbs) {
        if ($db.name -eq $DatabaseName) {
            $dbExists = $true
            Write-Host "   [OK] Database '$DatabaseName' found." -ForegroundColor Green
        }
    }
    if (-not $dbExists) {
        Write-Host "   [ERROR] Database '$DatabaseName' NOT found!" -ForegroundColor Red
    }

} catch {
    Write-Error "   Failed to find Cosmos DB account. Check the name and resource group."
    exit 1
}

# 3. Check Function App Identity & RBAC
Write-Host "`n3. Checking Function App Identity & RBAC..." -ForegroundColor Yellow
try {
    $funcIdentity = az webapp identity show --name $FunctionAppName --resource-group $ResourceGroup --output json | ConvertFrom-Json
    $principalId = $funcIdentity.principalId
    Write-Host "   Function App Principal ID: $principalId" -ForegroundColor Gray

    # Check Role Assignments (SQL Data Plane)
    Write-Host "   Checking SQL Role Assignments for Function App..."
    $sqlRoles = az cosmosdb sql role assignment list --account-name $CosmosAccountName --resource-group $ResourceGroup --output json | ConvertFrom-Json
    
    $hasDataContributor = $false
    foreach ($role in $sqlRoles) {
        if ($role.principalId -eq $principalId) {
            $hasDataContributor = $true
            Write-Host "   [OK] Found SQL Role Assignment: $($role.roleDefinitionId)" -ForegroundColor Green
        }
    }

    if (-not $hasDataContributor) {
        Write-Host "   [WARNING] SQL Role Assignment NOT found for Function App!" -ForegroundColor Red
        Write-Host "   You can assign it with:"
        Write-Host "   az cosmosdb sql role assignment create --account-name $CosmosAccountName --resource-group $ResourceGroup --scope '/' --principal-id $principalId --role-definition-id '00000000-0000-0000-0000-000000000002'"
    }
} catch {
    Write-Host "   Failed to check Function App identity. Ensure you have permissions." -ForegroundColor Red
}

# 4. Check Current User RBAC (for local debug)
Write-Host "`n4. Checking Current User RBAC (for local debug)..." -ForegroundColor Yellow
try {
    $user = az ad signed-in-user show --output json | ConvertFrom-Json
    $userPrincipalId = $user.id
    Write-Host "   Current User Principal ID: $userPrincipalId" -ForegroundColor Gray

    $userRoles = az cosmosdb sql role assignment list --account-name $CosmosAccountName --resource-group $ResourceGroup --output json | ConvertFrom-Json
    
    $userHasRole = $false
    foreach ($role in $userRoles) {
        if ($role.principalId -eq $userPrincipalId) {
            $userHasRole = $true
            Write-Host "   [OK] Found SQL Role Assignment for current user." -ForegroundColor Green
        }
    }

    if (-not $userHasRole) {
        Write-Host "   [WARNING] No SQL Role Assignment found for current user on this Cosmos DB account." -ForegroundColor Yellow
        Write-Host "   Local debugging might fail if using Azure Identity."
    }
} catch {
    Write-Host "   Failed to check current user RBAC." -ForegroundColor Red
}

# 5. Test API Endpoints
Write-Host "`n5. Testing API Endpoints..." -ForegroundColor Yellow

function Test-Endpoint {
    param($Path)
    $Url = "$ApiBaseUrl$Path"
    Write-Host "   Testing $Url ..." -NoNewline
    try {
        $response = Invoke-RestMethod -Uri $Url -Method GET -SkipHttpErrorCheck:$true -ErrorAction SilentlyContinue
        # Check if response has 'success' property or is an array/object
        if ($response.success -eq $true -or $response.success -eq "True") {
             Write-Host " [OK] (Success: $($response.success))" -ForegroundColor Green
        } elseif ($response.status -ge 400) {
             Write-Host " [FAILED] Status: $($response.status)" -ForegroundColor Red
        } else {
             # If it returns raw data or other format
             Write-Host " [OK] (Response received)" -ForegroundColor Green
        }
    } catch {
        Write-Host " [ERROR] $($_.Exception.Message)" -ForegroundColor Red
    }
}

Test-Endpoint "/dashboard-users/list"
Test-Endpoint "/dashboard/users?stats=true"
Test-Endpoint "/dashboard/users?limit=10"

Write-Host "`n=== Debug Complete ===" -ForegroundColor Cyan
