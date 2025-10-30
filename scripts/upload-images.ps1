# Upload images to Azure Storage and update groups with new URLs
param(
    [Parameter(Mandatory=$false)]
    [string]$StorageAccount = "stsomostechdev64qb73pzvgekw",
    
    [Parameter(Mandatory=$false)]
    [string]$Container = "site-images",
    
    [Parameter(Mandatory=$false)]
    [string]$ImagesFolder = ".\images"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Upload Group Images to Azure Storage " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Azure CLI is installed
if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Azure CLI is not installed" -ForegroundColor Red
    exit 1
}

# Check login
Write-Host "Checking Azure login..." -ForegroundColor Yellow
$loginCheck = az account show 2>$null
if (-not $loginCheck) {
    Write-Host "Not logged in. Running 'az login'..." -ForegroundColor Yellow
    az login
}

Write-Host "✓ Logged in to Azure" -ForegroundColor Green
Write-Host ""

# Check if images folder exists
if (-not (Test-Path $ImagesFolder)) {
    Write-Host "Images folder not found: $ImagesFolder" -ForegroundColor Yellow
    Write-Host "Creating folder..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $ImagesFolder | Out-Null
    Write-Host "✓ Created $ImagesFolder" -ForegroundColor Green
    Write-Host ""
    Write-Host "Please add your group images to the $ImagesFolder folder" -ForegroundColor Yellow
    Write-Host "Image naming format: group-<id>.jpg (e.g., group-seattle.jpg)" -ForegroundColor Yellow
    exit 0
}

# Get all image files
$imageFiles = Get-ChildItem -Path $ImagesFolder -Include @("*.jpg", "*.jpeg", "*.png", "*.webp", "*.gif") -Recurse

if ($imageFiles.Count -eq 0) {
    Write-Host "No images found in $ImagesFolder" -ForegroundColor Yellow
    Write-Host "Supported formats: jpg, jpeg, png, webp, gif" -ForegroundColor Gray
    exit 0
}

Write-Host "Found $($imageFiles.Count) images to upload" -ForegroundColor Cyan
Write-Host ""

$uploadedUrls = @{}
$uploadCount = 0
$errorCount = 0

foreach ($file in $imageFiles) {
    $blobName = $file.Name
    Write-Host "Uploading $blobName..." -ForegroundColor Yellow
    
    try {
        az storage blob upload `
            --account-name $StorageAccount `
            --container-name $Container `
            --name $blobName `
            --file $file.FullName `
            --auth-mode login `
            --overwrite `
            2>$null
        
        if ($LASTEXITCODE -eq 0) {
            $url = "https://$StorageAccount.blob.core.windows.net/$Container/$blobName"
            $uploadedUrls[$blobName] = $url
            Write-Host "  ✓ Uploaded: $url" -ForegroundColor Green
            $uploadCount++
        } else {
            Write-Host "  ✗ Failed to upload $blobName" -ForegroundColor Red
            $errorCount++
        }
    } catch {
        Write-Host "  ✗ Error uploading $blobName : $_" -ForegroundColor Red
        $errorCount++
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Upload Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Uploaded: $uploadCount" -ForegroundColor Green
Write-Host "Errors: $errorCount" -ForegroundColor $(if ($errorCount -gt 0) { "Red" } else { "Green" })
Write-Host ""

# Save URLs to a file for reference
if ($uploadedUrls.Count -gt 0) {
    $urlsFile = "uploaded-image-urls.json"
    $uploadedUrls | ConvertTo-Json | Out-File $urlsFile -Encoding utf8
    Write-Host "✓ Image URLs saved to $urlsFile" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "Uploaded Image URLs:" -ForegroundColor Cyan
    $uploadedUrls.GetEnumerator() | ForEach-Object {
        Write-Host "  $($_.Key): $($_.Value)" -ForegroundColor White
    }
}

Write-Host ""
Write-Host "✓ Done!" -ForegroundColor Green
