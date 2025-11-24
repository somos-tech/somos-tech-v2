# Simple PowerShell script to populate Cosmos DB groups using Azure CLI
# Run this from the repository root

param(
    [string]$CosmosAccount = "cosmos-somos-tech-dev-64qb73pzvgekw",
    [string]$ResourceGroup = "rg-somos-tech-dev",
    [string]$Database = "somostech",
    [string]$Container = "groups"
)

Write-Host "SOMOS.tech - Populate Groups" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

# Check Azure CLI login
Write-Host "Checking Azure login..." -ForegroundColor Yellow
try {
    $account = az account show 2>$null | ConvertFrom-Json
    Write-Host "Logged in as: $($account.user.name)" -ForegroundColor Green
} catch {
    Write-Host "Not logged in. Running 'az login'..." -ForegroundColor Yellow
    az login
}

# Create container
Write-Host "`nCreating container..." -ForegroundColor Yellow
az cosmosdb sql container create `
    --account-name $CosmosAccount `
    --resource-group $ResourceGroup `
    --database-name $Database `
    --name $Container `
    --partition-key-path "/id" `
    --throughput 400 `
    2>$null

if ($LASTEXITCODE -eq 0) {
    Write-Host "Container created successfully" -ForegroundColor Green
} else {
    Write-Host "Container already exists or creation skipped" -ForegroundColor Gray
}

# Sample groups to insert
$sampleGroups = @(
    '{"id":"group-seattle","name":"Seattle, WA","city":"Seattle","state":"WA","visibility":"Public","imageUrl":"https://images.unsplash.com/photo-1542223092-2f54de6d96e7?w=400","description":"Seattle tech community chapter","createdAt":"' + (Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ") + '","updatedAt":"' + (Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ") + '"}',
    '{"id":"group-newyork","name":"New York, NY","city":"New York","state":"NY","visibility":"Public","imageUrl":"https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400","description":"New York tech community chapter","createdAt":"' + (Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ") + '","updatedAt":"' + (Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ") + '"}',
    '{"id":"group-boston","name":"Boston, MA","city":"Boston","state":"MA","visibility":"Public","imageUrl":"https://images.unsplash.com/photo-1617440168937-e6b5e8a4b28f?w=400","description":"Boston tech community chapter","createdAt":"' + (Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ") + '","updatedAt":"' + (Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ") + '"}'
)

Write-Host "`nInserting sample groups..." -ForegroundColor Yellow

foreach ($json in $sampleGroups) {
    $tempFile = [System.IO.Path]::GetTempFileName()
    $json | Out-File -FilePath $tempFile -Encoding utf8 -NoNewline
    
    $groupData = $json | ConvertFrom-Json
    
    az cosmosdb sql container create-item `
        --account-name $CosmosAccount `
        --resource-group $ResourceGroup `
        --database-name $Database `
        --container-name $Container `
        --partition-key-value $groupData.id `
        --body "@$tempFile" `
        2>$null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Created: $($groupData.name)" -ForegroundColor Green
    } else {
        Write-Host "- Skipped: $($groupData.name) (may already exist)" -ForegroundColor Gray
    }
    
    Remove-Item $tempFile -Force
}

Write-Host "`n✓ Done!" -ForegroundColor Green
Write-Host "`nYou can view the groups at: https://dev.somos.tech/admin/groups" -ForegroundColor Cyan

