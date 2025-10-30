# PowerShell script to populate Cosmos DB with groups using Azure CLI
# This script creates the groups container and populates it with initial data

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SOMOS.tech - Populate Groups Script  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$cosmosAccountName = "cosmos-somos-tech-dev-64qb73pzvgekw"
$resourceGroup = "rg-somos-tech-dev"
$databaseName = "somostech"
$containerName = "groups"

# Check if Azure CLI is installed
if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Azure CLI is not installed" -ForegroundColor Red
    Write-Host "Install from: https://aka.ms/azure-cli" -ForegroundColor Yellow
    exit 1
}

Write-Host "Checking Azure login status..." -ForegroundColor Yellow
$loginCheck = az account show 2>$null
if (-not $loginCheck) {
    Write-Host "Not logged in to Azure. Running 'az login'..." -ForegroundColor Yellow
    az login
}

$account = az account show | ConvertFrom-Json
Write-Host "✓ Logged in as: $($account.user.name)" -ForegroundColor Green
Write-Host "✓ Subscription: $($account.name)" -ForegroundColor Green
Write-Host ""

# Create container if it doesn't exist
Write-Host "Creating container '$containerName' if it doesn't exist..." -ForegroundColor Yellow
$containerExists = az cosmosdb sql container show `
    --account-name $cosmosAccountName `
    --resource-group $resourceGroup `
    --database-name $databaseName `
    --name $containerName `
    2>$null

if (-not $containerExists) {
    Write-Host "Creating new container..." -ForegroundColor Yellow
    az cosmosdb sql container create `
        --account-name $cosmosAccountName `
        --resource-group $resourceGroup `
        --database-name $databaseName `
        --name $containerName `
        --partition-key-path "/id" `
        --throughput 400
    Write-Host "✓ Container created" -ForegroundColor Green
} else {
    Write-Host "✓ Container already exists" -ForegroundColor Green
}
Write-Host ""

# Define groups data
$groups = @(
    @{ id = "group-seattle"; name = "Seattle, WA"; city = "Seattle"; state = "WA"; visibility = "Public"; imageUrl = "https://images.unsplash.com/photo-1542223092-2f54de6d96e7?w=400"; description = "Seattle tech community chapter" },
    @{ id = "group-newyork"; name = "New York, NY"; city = "New York"; state = "NY"; visibility = "Public"; imageUrl = "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400"; description = "New York tech community chapter" },
    @{ id = "group-boston"; name = "Boston, MA"; city = "Boston"; state = "MA"; visibility = "Public"; imageUrl = "https://images.unsplash.com/photo-1617440168937-e6b5e8a4b28f?w=400"; description = "Boston tech community chapter" },
    @{ id = "group-denver"; name = "Denver, CO"; city = "Denver"; state = "CO"; visibility = "Public"; imageUrl = "https://images.unsplash.com/photo-1619856699906-09e1f58c98b1?w=400"; description = "Denver tech community chapter" },
    @{ id = "group-washingtondc"; name = "Washington DC"; city = "Washington"; state = "DC"; visibility = "Public"; imageUrl = "https://images.unsplash.com/photo-1617581629397-a72507c3de9e?w=400"; description = "Washington DC tech community chapter" },
    @{ id = "group-atlanta"; name = "Atlanta, GA"; city = "Atlanta"; state = "GA"; visibility = "Public"; imageUrl = "https://images.unsplash.com/photo-1526883669592-2b11f8c60a3b?w=400"; description = "Atlanta tech community chapter" },
    @{ id = "group-sanfrancisco"; name = "San Francisco, CA"; city = "San Francisco"; state = "CA"; visibility = "Public"; imageUrl = "https://images.unsplash.com/photo-1506146332389-18140dc7b2fb?w=400"; description = "San Francisco tech community chapter" },
    @{ id = "group-chicago"; name = "Chicago, IL"; city = "Chicago"; state = "IL"; visibility = "Public"; imageUrl = "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400"; description = "Chicago tech community chapter" },
    @{ id = "group-austin"; name = "Austin, TX"; city = "Austin"; state = "TX"; visibility = "Public"; imageUrl = "https://images.unsplash.com/photo-1531218150217-54595bc2b934?w=400"; description = "Austin tech community chapter" },
    @{ id = "group-houston"; name = "Houston, TX"; city = "Houston"; state = "TX"; visibility = "Public"; imageUrl = "https://images.unsplash.com/photo-1558525107-b9b347fe9da5?w=400"; description = "Houston tech community chapter" },
    @{ id = "group-losangeles"; name = "Los Angeles, CA"; city = "Los Angeles"; state = "CA"; visibility = "Public"; imageUrl = "https://images.unsplash.com/photo-1534190239940-9ba8944ea261?w=400"; description = "Los Angeles tech community chapter" },
    @{ id = "group-virtualevents"; name = "Virtual Events"; city = "Virtual"; state = "Events"; visibility = "Hidden"; imageUrl = "https://images.unsplash.com/photo-1588196749597-9ff075ee6b5b?w=400"; description = "Online virtual events and webinars" },
    @{ id = "group-miami"; name = "Miami, FL"; city = "Miami"; state = "FL"; visibility = "Public"; imageUrl = "https://images.unsplash.com/photo-1506966953602-c20cc11f75e3?w=400"; description = "Miami tech community chapter" },
    @{ id = "group-labbuilder"; name = "Lab builder"; city = "Lab"; state = "builder"; visibility = "Hidden"; imageUrl = "https://images.unsplash.com/photo-1581093458791-9d42e2d2c3f9?w=400"; description = "Innovation lab and workspace" },
    @{ id = "group-testlanding"; name = "test-landing"; city = "test"; state = "landing"; visibility = "Hidden"; imageUrl = "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400"; description = "Test landing page" },
    @{ id = "group-mentees"; name = "Mentees"; city = "Mentees"; state = ""; visibility = "Hidden"; imageUrl = "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400"; description = "Mentorship program participants" },
    @{ id = "group-startingintech"; name = "Starting in tech"; city = "Starting"; state = "in tech"; visibility = "Hidden"; imageUrl = "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400"; description = "Resources for tech career beginners" },
    @{ id = "group-dallas"; name = "Dallas, TX"; city = "Dallas"; state = "TX"; visibility = "Public"; imageUrl = "https://images.unsplash.com/photo-1580925773052-cf6225e60825?w=400"; description = "Dallas tech community chapter" },
    @{ id = "group-phoenix"; name = "Phoenix, AZ"; city = "Phoenix"; state = "AZ"; visibility = "Public"; imageUrl = "https://images.unsplash.com/photo-1518904091050-6c27a0b73d90?w=400"; description = "Phoenix tech community chapter" },
    @{ id = "group-sandiego"; name = "San Diego, CA"; city = "San Diego"; state = "CA"; visibility = "Public"; imageUrl = "https://images.unsplash.com/photo-1583582720842-5e5e79d4f0e4?w=400"; description = "San Diego tech community chapter" },
    @{ id = "group-philadelphia"; name = "Philadelphia, PA"; city = "Philadelphia"; state = "PA"; visibility = "Public"; imageUrl = "https://images.unsplash.com/photo-1565843708714-52ecf69ab81f?w=400"; description = "Philadelphia tech community chapter" },
    @{ id = "group-sacramento"; name = "Sacramento, CA"; city = "Sacramento"; state = "CA"; visibility = "Public"; imageUrl = "https://images.unsplash.com/photo-1590859808308-3d2d9c515b1a?w=400"; description = "Sacramento tech community chapter" },
    @{ id = "group-dallasftworth"; name = "Dallas/Ft. Worth, TX"; city = "Dallas/Ft. Worth"; state = "TX"; visibility = "Public"; imageUrl = "https://images.unsplash.com/photo-1552057426-c4d3f5f6d1f6?w=400"; description = "Dallas/Fort Worth tech community chapter" }
)

Write-Host "Inserting groups into Cosmos DB..." -ForegroundColor Yellow
Write-Host ""

$successCount = 0
$skipCount = 0
$errorCount = 0
$timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")

foreach ($group in $groups) {
    # Add timestamps
    $group.createdAt = $timestamp
    $group.updatedAt = $timestamp
    
    # Convert to JSON
    $json = $group | ConvertTo-Json -Compress -Depth 10
    
    # Create temporary file for the document
    $tempFile = [System.IO.Path]::GetTempFileName()
    $json | Out-File -FilePath $tempFile -Encoding utf8 -NoNewline
    
    try {
        # Try to create the document
        $result = az cosmosdb sql container create-item `
            --account-name $cosmosAccountName `
            --resource-group $resourceGroup `
            --database-name $databaseName `
            --container-name $containerName `
            --partition-key-value $group.id `
            --body "@$tempFile" `
            2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Created: $($group.name) ($($group.city), $($group.state))" -ForegroundColor Green
            $successCount++
        } else {
            if ($result -match "Conflict") {
                Write-Host "- Already exists: $($group.name)" -ForegroundColor Gray
                $skipCount++
            } else {
                Write-Host "✗ Error creating: $($group.name)" -ForegroundColor Red
                $errorCount++
            }
        }
    } catch {
        Write-Host "✗ Error creating: $($group.name) - $_" -ForegroundColor Red
        $errorCount++
    } finally {
        # Clean up temp file
        if (Test-Path $tempFile) {
            Remove-Item $tempFile -Force
        }
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Total groups: $($groups.Count)" -ForegroundColor White
Write-Host "Successfully created: $successCount" -ForegroundColor Green
Write-Host "Already existed: $skipCount" -ForegroundColor Gray
Write-Host "Errors: $errorCount" -ForegroundColor $(if ($errorCount -gt 0) { "Red" } else { "Green" })
Write-Host ""
Write-Host "✓ Groups container is ready!" -ForegroundColor Green
Write-Host ""
