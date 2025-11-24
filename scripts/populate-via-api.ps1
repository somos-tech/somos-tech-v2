# PowerShell script to populate groups using the API endpoint
param(
    [string]$ApiUrl = "https://dev.somos.tech/api/groups"
)

Write-Host "SOMOS.tech - Populate Groups via API" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Read groups data
$dataFile = Join-Path $PSScriptRoot "groups-data.json"
$groups = Get-Content $dataFile | ConvertFrom-Json

Write-Host "Found $($groups.Count) groups to insert" -ForegroundColor Yellow
Write-Host ""

$successCount = 0
$errorCount = 0

foreach ($group in $groups) {
    try {
        $response = Invoke-RestMethod -Uri $ApiUrl -Method Post -Body ($group | ConvertTo-Json) -ContentType "application/json" -ErrorAction Stop
        Write-Host "✓ Created: $($group.name)" -ForegroundColor Green
        $successCount++
    } catch {
        if ($_.Exception.Response.StatusCode -eq 409) {
            Write-Host "- Already exists: $($group.name)" -ForegroundColor Gray
        } else {
            Write-Host "✗ Error creating $($group.name): $($_.Exception.Message)" -ForegroundColor Red
            $errorCount++
        }
    }
    
    Start-Sleep -Milliseconds 200  # Rate limiting
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Successfully created: $successCount" -ForegroundColor Green
Write-Host "Errors: $errorCount" -ForegroundColor $(if ($errorCount -gt 0) { "Red" } else { "Green" })
Write-Host ""
Write-Host "✓ Done! View groups at: https://dev.somos.tech/admin/groups" -ForegroundColor Cyan

