<#
.SYNOPSIS
    Comprehensive WAF rule testing script for Azure Front Door

.DESCRIPTION
    Tests all custom WAF rules deployed to dev.somos.tech to verify they block malicious traffic
    and allow legitimate traffic. Each test validates expected HTTP response codes (403 for blocked, 200 for allowed).

.PARAMETER Domain
    The domain to test (default: https://dev.somos.tech)

.PARAMETER Verbose
    Show detailed output for each test
#>

param(
    [string]$Domain = "https://dev.somos.tech",
    [switch]$Verbose
)

$ErrorActionPreference = "Continue"

# ANSI color codes for better output
$Red = "`e[31m"
$Green = "`e[32m"
$Yellow = "`e[33m"
$Blue = "`e[34m"
$Reset = "`e[0m"

# Test results tracking
$script:TotalTests = 0
$script:PassedTests = 0
$script:FailedTests = 0
$script:FailedTestDetails = @()

function Write-TestHeader {
    param([string]$Message)
    Write-Host "`n$Blue=== $Message ===$Reset" -ForegroundColor Cyan
}

function Write-TestResult {
    param(
        [string]$TestName,
        [bool]$Passed,
        [string]$Details
    )
    
    $script:TotalTests++
    
    if ($Passed) {
        $script:PassedTests++
        Write-Host "  ${Green}✓${Reset} $TestName" -ForegroundColor Green
        if ($Verbose -and $Details) {
            Write-Host "    $Details" -ForegroundColor Gray
        }
    } else {
        $script:FailedTests++
        $script:FailedTestDetails += @{
            Test = $TestName
            Details = $Details
        }
        Write-Host "  ${Red}✗${Reset} $TestName" -ForegroundColor Red
        Write-Host "    ${Red}$Details${Reset}" -ForegroundColor Red
    }
}

function Test-Request {
    param(
        [string]$Url,
        [hashtable]$Headers = @{},
        [int]$ExpectedStatusCode,
        [string]$Method = "GET",
        [string]$Body = $null
    )
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            Headers = $Headers
            TimeoutSec = 15
            ErrorAction = "Stop"
            UseBasicParsing = $true
        }

        if ($Body) {
            $params.Body = $Body
        }

        $response = Invoke-WebRequest @params
        $statusCode = [int]$response.StatusCode
    } catch [System.Net.WebException] {
        $errorResponse = $_.Exception.Response
        if ($errorResponse -ne $null) {
            $statusCode = [int]$errorResponse.StatusCode
        } else {
            return @{
                Success = $false
                StatusCode = "Error"
                Expected = $ExpectedStatusCode
                Error = $_.Exception.Message
            }
        }
    } catch {
        return @{
            Success = $false
            StatusCode = "Error"
            Expected = $ExpectedStatusCode
            Error = $_.Exception.Message
        }
    }

    return @{
        Success = ($statusCode -eq $ExpectedStatusCode)
        StatusCode = $statusCode
        Expected = $ExpectedStatusCode
    }
}

# ============================================================================
# TEST SUITE 1: Malicious User-Agent Blocking
# ============================================================================
Write-TestHeader "Testing BlockMaliciousUserAgents Rule"

$maliciousUserAgents = @(
    "curl/7.68.0",
    "Wget/1.20.3",
    "python-requests/2.25.1",
    "sqlmap/1.4.7",
    "nikto/2.1.6",
    "Nessus",
    "masscan/1.0.5",
    "nmap scripting engine",
    "Shodan/1.0",
    "Acunetix",
    "Metasploit",
    "Burp Suite",
    "OWASP ZAP"
)

foreach ($ua in $maliciousUserAgents) {
    $result = Test-Request -Url $Domain -Headers @{ "User-Agent" = $ua } -ExpectedStatusCode 403
    Write-TestResult -TestName "Block User-Agent: $ua" -Passed $result.Success -Details "Got $($result.StatusCode), expected $($result.Expected)"
}

# Test legitimate user agents (should pass)
Write-TestHeader "Testing Legitimate User-Agents (Should Allow)"

$legitimateUserAgents = @(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1"
)

foreach ($ua in $legitimateUserAgents) {
    $result = Test-Request -Url $Domain -Headers @{ "User-Agent" = $ua } -ExpectedStatusCode 200
    $shortUa = if ($ua.Length -gt 50) { $ua.Substring(0, 47) + "..." } else { $ua }
    Write-TestResult -TestName "Allow User-Agent: $shortUa" -Passed $result.Success -Details "Got $($result.StatusCode), expected $($result.Expected)"
}

# ============================================================================
# TEST SUITE 2: Script Extension Blocking
# ============================================================================
Write-TestHeader "Testing BlockScriptExtensions Rule"

$blockedExtensions = @(
    "/test.php",
    "/admin.aspx",
    "/shell.jsp",
    "/backdoor.sh",
    "/script.pl",
    "/malware.exe",
    "/exploit.dll",
    "/config.py",
    "/run.bat",
    "/evil.ps1",
    "/upload.PHP",  # Test case-insensitive
    "/TEST.EXE"     # Test case-insensitive
)

foreach ($ext in $blockedExtensions) {
    $result = Test-Request -Url "$Domain$ext" -ExpectedStatusCode 403
    Write-TestResult -TestName "Block extension: $ext" -Passed $result.Success -Details "Got $($result.StatusCode), expected $($result.Expected)"
}

# Test legitimate extensions (should pass)
Write-TestHeader "Testing Legitimate Extensions (Should Allow)"

$allowedExtensions = @(
    "/index.html",
    "/app.js",
    "/style.css",
    "/api/users.json",
    "/images/logo.png",
    "/docs/readme.txt"
)

foreach ($ext in $allowedExtensions) {
    $result = Test-Request -Url "$Domain$ext" -ExpectedStatusCode 200
    Write-TestResult -TestName "Allow extension: $ext" -Passed $result.Success -Details "Got $($result.StatusCode), expected $($result.Expected)"
}

# ============================================================================
# TEST SUITE 3: Injection Pattern Blocking (Query String)
# ============================================================================
Write-TestHeader "Testing BlockCommonInjectionPatterns Rule"

$injectionPatterns = @(
    "?search=<script>alert(1)</script>",
    "?path=../../etc/passwd",
    "?id=1' OR '1'='1",
    "?sql=UNION SELECT * FROM users",
    "?query=SELECT * FROM information_schema.tables",
    "?cmd=';DROP TABLE users;--",
    "?code=javascript:alert('XSS')",
    "?file=..%2f..%2fetc%2fpasswd",  # URL-encoded path traversal
    "?admin=1' AND 1=1--",
    "?exec=xp_cmdshell('dir')",
    "?data=%27%20or%20%271%27%3d%271"  # URL-encoded SQLi
)

foreach ($pattern in $injectionPatterns) {
    $result = Test-Request -Url "$Domain$pattern" -ExpectedStatusCode 403
    $shortPattern = if ($pattern.Length -gt 60) { $pattern.Substring(0, 57) + "..." } else { $pattern }
    Write-TestResult -TestName "Block injection: $shortPattern" -Passed $result.Success -Details "Got $($result.StatusCode), expected $($result.Expected)"
}

# Test legitimate query strings (should pass)
Write-TestHeader "Testing Legitimate Query Strings (Should Allow)"

$legitimateQueries = @(
    "?search=azure",
    "?page=1&limit=10",
    "?filter=active&sort=name",
    "?category=technology&year=2024"
)

foreach ($query in $legitimateQueries) {
    $result = Test-Request -Url "$Domain$query" -ExpectedStatusCode 200
    Write-TestResult -TestName "Allow query: $query" -Passed $result.Success -Details "Got $($result.StatusCode), expected $($result.Expected)"
}

# ============================================================================
# TEST SUITE 4: Request Body Injection Blocking
# ============================================================================
Write-TestHeader "Testing BlockInjectionInRequestBody Rule"

$maliciousBodies = @(
    @{ Content = '{"username":"admin","password":"<script>alert(1)</script>"}'; Type = "application/json" },
    @{ Content = '{"query":"SELECT * FROM users WHERE id=1 UNION SELECT * FROM passwords"}'; Type = "application/json" },
    @{ Content = 'username=admin&password=%27%20or%20%271%27%3d%271'; Type = "application/x-www-form-urlencoded" },
    @{ Content = '{"path":"../../etc/passwd"}'; Type = "application/json" }
)

foreach ($body in $maliciousBodies) {
    $result = Test-Request -Url "$Domain/api/test" -Method "POST" -Body $body.Content -Headers @{ "Content-Type" = $body.Type } -ExpectedStatusCode 403
    $shortBody = if ($body.Content.Length -gt 50) { $body.Content.Substring(0, 47) + "..." } else { $body.Content }
    Write-TestResult -TestName "Block body injection: $shortBody" -Passed $result.Success -Details "Got $($result.StatusCode), expected $($result.Expected)"
}

# ============================================================================
# TEST SUITE 5: Suspicious File Upload Blocking
# ============================================================================
Write-TestHeader "Testing BlockSuspiciousFileUploads Rule"

$maliciousContentTypes = @(
    "application/x-msdownload",
    "application/x-executable",
    "application/x-sh",
    "application/x-shellscript"
)

foreach ($ct in $maliciousContentTypes) {
    $result = Test-Request -Url "$Domain/api/upload" -Method "POST" -Headers @{ "Content-Type" = $ct } -Body "malicious binary" -ExpectedStatusCode 403
    Write-TestResult -TestName "Block Content-Type: $ct" -Passed $result.Success -Details "Got $($result.StatusCode), expected $($result.Expected)"
}

# ============================================================================
# TEST SUITE 6: Anonymous Network Blocking (manual)
# ============================================================================
Write-TestHeader "Testing BlockAnonymousNetworks Rule"

Write-Host "  ${Yellow}⚠${Reset} This rule blocks all traffic outside US, Canada, Mexico, and UK (GeoMatch allow-list)." -ForegroundColor Yellow
Write-Host "    Automated local validation is not possible; connect from a non-allowed country (VPN/Tor) and confirm HTTP 403." -ForegroundColor Gray
Write-Host "    Example: curl -I https://dev.somos.tech --socks5-hostname <vpn-exit>" -ForegroundColor Gray

# ============================================================================
# FINAL RESULTS SUMMARY
# ============================================================================
Write-Host "`n"
Write-Host "$Blue============================================$Reset" -ForegroundColor Cyan
Write-Host "$Blue           WAF RULES TEST SUMMARY$Reset" -ForegroundColor Cyan
Write-Host "$Blue============================================$Reset" -ForegroundColor Cyan
Write-Host ""
Write-Host "Total Tests:  $script:TotalTests"
Write-Host "${Green}Passed:       $script:PassedTests$Reset" -ForegroundColor Green
Write-Host "${Red}Failed:       $script:FailedTests$Reset" -ForegroundColor Red

if ($script:FailedTests -gt 0) {
    Write-Host "`n${Red}Failed Test Details:$Reset" -ForegroundColor Red
    foreach ($failure in $script:FailedTestDetails) {
        Write-Host "  • $($failure.Test)" -ForegroundColor Red
        Write-Host "    $($failure.Details)" -ForegroundColor Gray
    }
}

Write-Host ""

# Exit code based on results
if ($script:FailedTests -eq 0) {
    Write-Host "${Green}✓ All WAF rules are functioning correctly!$Reset" -ForegroundColor Green
    exit 0
} else {
    Write-Host "${Red}✗ Some WAF rules may not be working as expected.$Reset" -ForegroundColor Red
    Write-Host "${Yellow}  Check Azure Front Door WAF policy deployment status.$Reset" -ForegroundColor Yellow
    exit 1
}
