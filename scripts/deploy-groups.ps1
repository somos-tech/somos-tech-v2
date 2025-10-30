# Quick Deploy Groups to Cosmos DB
# This script creates the container and inserts all groups

$cosmosAccount = "cosmos-somos-tech-dev-64qb73pzvgekw"
$resourceGroup = "rg-somos-tech-dev"
$database = "somostech"
$container = "groups"

Write-Host "Creating groups container..." -ForegroundColor Cyan

# Create the container (ignore if exists) - serverless mode, no throughput
az cosmosdb sql container create `
    --account-name $cosmosAccount `
    --resource-group $resourceGroup `
    --database-name $database `
    --name $container `
    --partition-key-path "/id" `
    2>$null

Write-Host "`nReading groups data..." -ForegroundColor Cyan
$groups = Get-Content "groups-data.json" | ConvertFrom-Json

Write-Host "Inserting $($groups.Count) groups...`n" -ForegroundColor Cyan

$created = 0
$skipped = 0

foreach ($group in $groups) {
    # Add timestamps
    $now = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    $group | Add-Member -NotePropertyName "createdAt" -NotePropertyValue $now -Force
    $group | Add-Member -NotePropertyName "updatedAt" -NotePropertyValue $now -Force
    
    # Save to temp file
    $tempFile = [System.IO.Path]::GetTempFileName()
    $group | ConvertTo-Json -Depth 10 | Out-File -FilePath $tempFile -Encoding utf8 -NoNewline
    
    # Insert to Cosmos DB
    $result = az cosmosdb sql container create-item `
        --account-name $cosmosAccount `
        --resource-group $resourceGroup `
        --database-name $database `
        --container-name $container `
        --partition-key-value $group.id `
        --body "@$tempFile" `
        2>&1
    
    Remove-Item $tempFile -Force
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ $($group.name)" -ForegroundColor Green
        $created++
    } else {
        Write-Host "  - $($group.name) (already exists)" -ForegroundColor Gray
        $skipped++
    }
}

Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "Created: $created | Skipped: $skipped" -ForegroundColor White
Write-Host "✓ Done!" -ForegroundColor Green
Write-Host "`nView at: https://happy-stone-070acff1e.3.azurestaticapps.net/admin/groups" -ForegroundColor Cyan
