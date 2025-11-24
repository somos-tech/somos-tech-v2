$functionUrl = "https://func-somos-tech-dev-64qb73pzvgekw.azurewebsites.net/api/GetUserRoles"
$payload = @{
    userId = "test-user-id"
    userDetails = "jcruz@somos.tech"
    identityProvider = "aad"
} | ConvertTo-Json

Write-Host "Testing GetUserRoles at $functionUrl..."
Write-Host "Payload: $payload"

try {
    $response = Invoke-RestMethod -Uri $functionUrl -Method Post -Body $payload -ContentType "application/json"
    Write-Host "Response:"
    $response | Format-List

    if ($response.roles -contains "admin") {
        Write-Host "SUCCESS: Admin role returned!" -ForegroundColor Green
    } else {
        Write-Host "FAILURE: Admin role NOT returned." -ForegroundColor Red
        Write-Host "Roles received: $($response.roles -join ', ')"
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody"
    }
}
