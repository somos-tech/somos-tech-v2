# Test script for admin endpoints
# Run this after deployment to verify all endpoints are working

$baseUrl = "https://dev.somos.tech/api"

Write-Host "Testing Admin Endpoints..." -ForegroundColor Cyan
Write-Host ""

# Test 1: Health check (should work without auth)
Write-Host "1. Testing health endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/health" -Method GET -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✓ Health endpoint OK" -ForegroundColor Green
    }
} catch {
    Write-Host "   ✗ Health endpoint FAILED: $_" -ForegroundColor Red
}

# Test 2: Admin users list (requires auth, should get 401/403)
Write-Host "2. Testing /api/admin-users/list..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/admin-users/list" -Method GET -UseBasicParsing -ErrorAction Stop
    Write-Host "   ? Got $($response.StatusCode) - Expected 401/403" -ForegroundColor Yellow
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 401 -or $statusCode -eq 403) {
        Write-Host "   ✓ Endpoint exists (returns $statusCode as expected)" -ForegroundColor Green
    } elseif ($statusCode -eq 404) {
        Write-Host "   ✗ Endpoint NOT FOUND (404)" -ForegroundColor Red
    } else {
        Write-Host "   ? Got $statusCode" -ForegroundColor Yellow
    }
}

# Test 3: User list (requires auth, should get 401/403)
Write-Host "3. Testing /api/admin/users..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/admin/users" -Method GET -UseBasicParsing -ErrorAction Stop
    Write-Host "   ? Got $($response.StatusCode) - Expected 401/403" -ForegroundColor Yellow
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 401 -or $statusCode -eq 403) {
        Write-Host "   ✓ Endpoint exists (returns $statusCode as expected)" -ForegroundColor Green
    } elseif ($statusCode -eq 404) {
        Write-Host "   ✗ Endpoint NOT FOUND (404)" -ForegroundColor Red
    } else {
        Write-Host "   ? Got $statusCode" -ForegroundColor Yellow
    }
}

# Test 4: User stats (requires auth, should get 401/403)
Write-Host "4. Testing /api/admin/users?stats=true..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/admin/users?stats=true" -Method GET -UseBasicParsing -ErrorAction Stop
    Write-Host "   ? Got $($response.StatusCode) - Expected 401/403" -ForegroundColor Yellow
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 401 -or $statusCode -eq 403) {
        Write-Host "   ✓ Endpoint exists (returns $statusCode as expected)" -ForegroundColor Green
    } elseif ($statusCode -eq 404) {
        Write-Host "   ✗ Endpoint NOT FOUND (404)" -ForegroundColor Red
    } else {
        Write-Host "   ? Got $statusCode" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Test complete!" -ForegroundColor Cyan
Write-Host "Note: 401/403 errors are expected for auth-protected endpoints" -ForegroundColor Gray
