# Check and enable passkey/FIDO2 support for Azure AD authentication
# This script verifies the Azure AD app registration supports passkey authentication

Write-Host "Azure AD Passkey Configuration Helper" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check if logged in
$loginCheck = az account show 2>$null
if (-not $loginCheck) {
    Write-Host "Not logged in to Azure. Running 'az login'..." -ForegroundColor Yellow
    az login
}

Write-Host "To enable passkey authentication, you need to:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Go to Azure Portal > Azure Active Directory > App registrations" -ForegroundColor White
Write-Host "2. Find your app registration (created by configure-auth.ps1)" -ForegroundColor White
Write-Host "3. Go to 'Authentication' blade" -ForegroundColor White
Write-Host "4. Ensure these settings:" -ForegroundColor White
Write-Host "   - Platform: Web" -ForegroundColor Gray
Write-Host "   - Redirect URIs should include: https://<your-swa>.azurestaticapps.net/.auth/login/aad/callback" -ForegroundColor Gray
Write-Host "   - Front-channel logout URL: (optional)" -ForegroundColor Gray
Write-Host "   - ID tokens: ✓ Checked" -ForegroundColor Gray
Write-Host "   - Access tokens: ✓ Checked" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Go to 'API permissions' blade" -ForegroundColor White
Write-Host "   - Ensure these Microsoft Graph permissions:" -ForegroundColor Gray
Write-Host "     • openid (Delegated)" -ForegroundColor Gray
Write-Host "     • profile (Delegated)" -ForegroundColor Gray
Write-Host "     • email (Delegated)" -ForegroundColor Gray
Write-Host "     • User.Read (Delegated)" -ForegroundColor Gray
Write-Host ""
Write-Host "6. Go to Azure AD > Users > Authentication methods" -ForegroundColor White
Write-Host "   - Enable 'FIDO2 security key' method" -ForegroundColor Gray
Write-Host "   - Enable 'Microsoft Authenticator' for passkeys" -ForegroundColor Gray
Write-Host ""

Write-Host "Alternative: Use Password + MFA instead of passkey" -ForegroundColor Yellow
Write-Host "If passkeys continue to have issues, you can:" -ForegroundColor Gray
Write-Host "  - Use password authentication" -ForegroundColor Gray
Write-Host "  - Use Microsoft Authenticator app (non-passkey mode)" -ForegroundColor Gray
Write-Host "  - Use SMS/Phone authentication" -ForegroundColor Gray
Write-Host ""

Write-Host "Would you like to open Azure Portal to configure? (Y/N): " -ForegroundColor Cyan -NoNewline
$response = Read-Host

if ($response -eq 'Y' -or $response -eq 'y') {
    $tenantId = (az account show --query tenantId -o tsv)
    Start-Process "https://portal.azure.com/#view/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/~/RegisteredApps"
    Write-Host "✓ Opened Azure Portal" -ForegroundColor Green
}

Write-Host ""
Write-Host "After making changes, redeploy your Static Web App for changes to take effect." -ForegroundColor Yellow
