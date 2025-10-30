# Deploy groups with image upload support
# This script:
# 1. Uploads local images to Azure Storage (if images folder exists)
# 2. Updates groups data with Azure Storage URLs
# 3. Creates groups container in Cosmos DB
# 4. Inserts all groups

param(
    [string]$CosmosAccount = "cosmos-somos-tech-dev-64qb73pzvgekw",
    [string]$ResourceGroup = "rg-somos-tech-dev",
    [string]$Database = "somostech",
    [string]$Container = "groups",
    [string]$StorageAccount = "stsomostechdev64qb73pzvgekw",
    [string]$StorageContainer = "site-images",
    [string]$ImagesFolder = ".\images"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SOMOS.tech - Deploy Groups with Images" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Azure CLI
if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Azure CLI is not installed" -ForegroundColor Red
    exit 1
}

# Check login
$loginCheck = az account show 2>$null
if (-not $loginCheck) {
    az login
}

Write-Host "✓ Logged in to Azure" -ForegroundColor Green
Write-Host ""

# Step 1: Upload images if folder exists
$imageUrls = @{}
if (Test-Path $ImagesFolder) {
    Write-Host "Step 1: Uploading images from $ImagesFolder..." -ForegroundColor Cyan
    Write-Host ""
    
    $imageFiles = Get-ChildItem -Path $ImagesFolder -Include @("*.jpg", "*.jpeg", "*.png", "*.webp") -Recurse
    
    if ($imageFiles.Count -gt 0) {
        foreach ($file in $imageFiles) {
            $blobName = $file.Name
            Write-Host "  Uploading $blobName..." -ForegroundColor Yellow
            
            az storage blob upload `
                --account-name $StorageAccount `
                --container-name $StorageContainer `
                --name $blobName `
                --file $file.FullName `
                --auth-mode login `
                --overwrite `
                2>$null | Out-Null
            
            if ($LASTEXITCODE -eq 0) {
                $url = "https://$StorageAccount.blob.core.windows.net/$StorageContainer/$blobName"
                $imageUrls[$blobName] = $url
                Write-Host "    ✓ $url" -ForegroundColor Green
            }
        }
        Write-Host ""
        Write-Host "  ✓ Uploaded $($imageUrls.Count) images" -ForegroundColor Green
        Write-Host ""
    } else {
        Write-Host "  No images found in $ImagesFolder" -ForegroundColor Gray
        Write-Host ""
    }
} else {
    Write-Host "Step 1: No images folder found, using URLs from groups-data.json" -ForegroundColor Gray
    Write-Host ""
}

# Step 2: Create Cosmos DB container
Write-Host "Step 2: Creating groups container in Cosmos DB..." -ForegroundColor Cyan
az cosmosdb sql container create `
    --account-name $CosmosAccount `
    --resource-group $ResourceGroup `
    --database-name $Database `
    --name $Container `
    --partition-key-path "/id" `
    2>$null | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Container created" -ForegroundColor Green
} else {
    Write-Host "  ✓ Container already exists" -ForegroundColor Gray
}
Write-Host ""

# Step 3: Read and update groups data
Write-Host "Step 3: Reading groups data..." -ForegroundColor Cyan
$groups = Get-Content "groups-data.json" | ConvertFrom-Json
Write-Host "  ✓ Found $($groups.Count) groups" -ForegroundColor Green
Write-Host ""

# Update image URLs if we uploaded new images
if ($imageUrls.Count -gt 0) {
    Write-Host "Step 4: Updating image URLs..." -ForegroundColor Cyan
    foreach ($group in $groups) {
        $imageName = "group-$($group.id.Replace('group-', '')).jpg"
        if ($imageUrls.ContainsKey($imageName)) {
            $oldUrl = $group.imageUrl
            $group.imageUrl = $imageUrls[$imageName]
            Write-Host "  Updated $($group.name): $($imageUrls[$imageName])" -ForegroundColor Green
        }
    }
    Write-Host ""
}

# Step 5: Insert groups into Cosmos DB
Write-Host "Step 5: Inserting groups into Cosmos DB..." -ForegroundColor Cyan
Write-Host ""

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
    az cosmosdb sql container create-item `
        --account-name $CosmosAccount `
        --resource-group $ResourceGroup `
        --database-name $Database `
        --container-name $Container `
        --partition-key-value $group.id `
        --body "@$tempFile" `
        2>&1 | Out-Null
    
    Remove-Item $tempFile -Force
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ $($group.name)" -ForegroundColor Green
        $created++
    } else {
        Write-Host "  - $($group.name) (already exists)" -ForegroundColor Gray
        $skipped++
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Deployment Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Images uploaded: $($imageUrls.Count)" -ForegroundColor White
Write-Host "Groups created: $created" -ForegroundColor Green
Write-Host "Groups skipped: $skipped" -ForegroundColor Gray
Write-Host ""
Write-Host "✓ Done!" -ForegroundColor Green
Write-Host ""
Write-Host "View at: https://happy-stone-070acff1e.3.azurestaticapps.net/admin/groups" -ForegroundColor Cyan
