
$resourceGroup = "rg-somos-tech-dev"
$appName = "appi-somos-tech-dev-64qb73pzvgekw"

Write-Host "--- Checking Azure Logs for Auth Debug Messages ---" -ForegroundColor Cyan
Write-Host "Resource Group: $resourceGroup"
Write-Host "App Insights: $appName"

# Check if logged in
try {
    $account = az account show --query "user.name" -o tsv 2>$null
    if (-not $account) {
        Write-Warning "Not logged in. Please run 'az login' first."
        exit
    }
    Write-Host "Logged in as: $account"
} catch {
    Write-Warning "Error checking login status. Please run 'az login'."
    exit
}

# Query
$query = 'traces | where message startswith "[adminUsers] DEBUG AUTH HEADER:" | order by timestamp desc | limit 20 | project timestamp, message'

Write-Host "`nRunning Query..." -ForegroundColor Yellow
Write-Host $query -ForegroundColor DarkGray

try {
    # We need to get the App ID first for the query command
    $appId = az monitor app-insights component show --resource-group $resourceGroup --app $appName --query "appId" -o tsv

    if (-not $appId) {
        Write-Error "Could not retrieve App ID for $appName"
        exit
    }

    # Broader query to see if function is being hit at all
    $safeQuery = 'traces | where message contains ''[adminUsers]'' | order by timestamp desc | limit 20 | project timestamp, message'
    
    $jsonOutput = az monitor app-insights query --app $appId --analytics-query "$safeQuery" --output json
    Write-Host "Raw JSON: $jsonOutput" # Debugging
    
    $results = $jsonOutput | ConvertFrom-Json

    if ($null -eq $results -or $results.Count -eq 0) {
        Write-Host "`nNo logs found matching the debug pattern." -ForegroundColor Red
        Write-Host "This could mean:"
        Write-Host "1. The function hasn't been called since the deployment."
        Write-Host "2. The deployment hasn't finished yet."
        Write-Host "3. Logging is delayed (can take up to 5 minutes)."
    } else {
        Write-Host "`nFound log entries:" -ForegroundColor Green
        # Handle single object vs array
        if ($results -isnot [array]) { $results = @($results) }
        
        foreach ($log in $results) {
            Write-Host "[$($log.timestamp)] $($log.message)"
        }
    }

} catch {
    Write-Error "Failed to query logs: $_"
}
