
# Script to validate Admin API logic and connectivity

Write-Host "--- Validating Admin API Logic ---" -ForegroundColor Cyan

# 1. Run the local logic debugger (Node.js)
Write-Host "`n[1] Running local logic validation (connecting to remote DB)..." -ForegroundColor Yellow
try {
    node scripts/debug-admin-logic.js
} catch {
    Write-Error "Failed to run node script. Ensure Node.js is installed."
}

# 2. Test Remote API (Optional - might fail if SWA blocks direct access)
Write-Host "`n[2] Testing Remote API (Direct Function Call)..." -ForegroundColor Yellow

$funcAppName = "func-somos-tech-dev-64qb73pzvgekw" # Derived from config
$baseUrl = "https://$funcAppName.azurewebsites.net"
$endpoint = "$baseUrl/api/GetUserRoles"

# Construct Mock Client Principal
$principal = @{
    identityProvider = "aad"
    userId = "test-user-id"
    userDetails = "jcruz@somos.tech"
    userRoles = @("anonymous", "authenticated")
}
$jsonPrincipal = $principal | ConvertTo-Json -Compress
$base64Principal = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($jsonPrincipal))

Write-Host "Target: $endpoint"
Write-Host "User: jcruz@somos.tech"

try {
    $response = Invoke-RestMethod -Uri $endpoint -Method Get -Headers @{
        "x-ms-client-principal" = $base64Principal
        "x-ms-client-principal-id" = "test-user-id"
        "x-ms-client-principal-name" = "jcruz@somos.tech"
    } -ErrorAction Stop

    Write-Host "Response Received:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 5

    if ($response.roles -contains "admin") {
        Write-Host "`nSUCCESS: Remote API correctly assigns ADMIN role." -ForegroundColor Green
    } else {
        Write-Host "`nFAILURE: Remote API did NOT assign ADMIN role." -ForegroundColor Red
    }
} catch {
    Write-Warning "Remote API call failed. This is expected if the Function App is locked down to SWA only."
    Write-Warning "Error: $_"
}

Write-Host "`n--- Validation Complete ---" -ForegroundColor Cyan
