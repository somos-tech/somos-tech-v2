# Fix Container Access Levels
# This script updates the access level for Azure Blob Storage containers
# that need public blob access (for profile photos, group images, etc.)

param(
    [Parameter(Mandatory=$false)]
    [string]$StorageAccount = "stsomostechdev64qb73pzvg"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Fix Container Access Levels          " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Containers that need public blob access
$publicContainers = @(
    "site-assets",
    "profile-photos",
    "group-images",
    "event-images"
)

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

$successCount = 0
$errorCount = 0

foreach ($containerName in $publicContainers) {
    Write-Host "Processing container: $containerName" -ForegroundColor Yellow
    
    try {
        # Check if container exists
        $containerExists = az storage container exists `
            --account-name $StorageAccount `
            --name $containerName `
            --auth-mode login `
            --query exists `
            --output tsv 2>$null
        
        if ($containerExists -ne "true") {
            Write-Host "  Container does not exist, skipping..." -ForegroundColor Gray
            continue
        }
        
        # Get current access level
        $currentAccess = az storage container show `
            --account-name $StorageAccount `
            --name $containerName `
            --auth-mode login `
            --query properties.publicAccess `
            --output tsv 2>$null
        
        if ($currentAccess -eq "blob") {
            Write-Host "  ✓ Already has public blob access" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host "  Current access: $currentAccess" -ForegroundColor Gray
            Write-Host "  Setting public blob access..." -ForegroundColor Yellow
            
            az storage container set-permission `
                --account-name $StorageAccount `
                --name $containerName `
                --public-access blob `
                --auth-mode login 2>$null
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✓ Updated to public blob access" -ForegroundColor Green
                $successCount++
            } else {
                Write-Host "  ✗ Failed to update access" -ForegroundColor Red
                $errorCount++
            }
        }
    } catch {
        Write-Host "  ✗ Error: $_" -ForegroundColor Red
        $errorCount++
    }
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Summary                              " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Success: $successCount" -ForegroundColor Green
Write-Host "Errors: $errorCount" -ForegroundColor $(if ($errorCount -gt 0) { "Red" } else { "Green" })
Write-Host ""

if ($errorCount -eq 0) {
    Write-Host "✓ All containers updated successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Profile photos and other images should now be accessible via direct URLs." -ForegroundColor Cyan
} else {
    Write-Host "Some containers could not be updated." -ForegroundColor Yellow
    Write-Host "Please check the error messages above." -ForegroundColor Yellow
}
