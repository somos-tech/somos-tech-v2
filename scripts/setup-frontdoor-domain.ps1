[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$SubscriptionId,

    [Parameter(Mandatory = $true)]
    [string]$ResourceGroupName,

    [Parameter(Mandatory = $true)]
    [string]$FrontDoorProfileName,

    [Parameter()]
    [string]$EndpointName,

    [Parameter()]
    [string]$RouteName,

    [Parameter()]
    [string]$DomainResourceName = 'dev-somos-tech',

    [Parameter()]
    [string]$CustomHostname = 'dev.somos.tech',

    [Parameter()]
    [int]$ValidationTimeoutMinutes = 30,

    [Parameter()]
    [switch]$WaitForValidation
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Ensure-AzCli {
    if (-not (Get-Command -Name 'az' -ErrorAction SilentlyContinue)) {
        throw 'Azure CLI (az) was not found in PATH. Install Azure CLI and try again.'
    }
}

function Invoke-AzCli {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments,

        [switch]$AsJson,
        [switch]$AllowEmpty
    )

    $fullArgs = @()
    $fullArgs += $Arguments
    if ($AsJson) {
        $fullArgs += @('--output', 'json')
    }
    else {
        $fullArgs += @('--output', 'none')
    }

    $result = & az @fullArgs 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Azure CLI command failed: az $($Arguments -join ' ')`n$result"
    }

    if ($AsJson) {
        if ([string]::IsNullOrWhiteSpace($result)) {
            if ($AllowEmpty) {
                return $null
            }

            return $null
        }

        return $result | ConvertFrom-Json
    }

    return $result
}

function Ensure-AzLogin {
    param(
        [string]$SubscriptionId
    )

    try {
        $account = Invoke-AzCli -Arguments @('account', 'show') -AsJson
    }
    catch {
        Write-Host 'Authenticating with Azure CLI...' -ForegroundColor Cyan
        $null = Invoke-AzCli -Arguments @('login') -AsJson
        $account = Invoke-AzCli -Arguments @('account', 'show') -AsJson
    }

    if ($account.id -ne $SubscriptionId) {
        Write-Host "Switching to subscription $SubscriptionId" -ForegroundColor Cyan
        $null = Invoke-AzCli -Arguments @('account', 'set', '--subscription', $SubscriptionId)
        $account = Invoke-AzCli -Arguments @('account', 'show') -AsJson
    }

    return $account
}

function Resolve-EndpointName {
    $endpoints = Invoke-AzCli -Arguments @(
            'afd', 'endpoint', 'list',
            '--resource-group', $ResourceGroupName,
            '--profile-name', $FrontDoorProfileName
        ) -AsJson

    if (-not $endpoints -or $endpoints.Count -eq 0) {
        throw "No endpoints found under profile '$FrontDoorProfileName'. Create one or pass -EndpointName manually."
    }

    if ($endpoints.Count -eq 1) {
        $name = $endpoints[0].name
        Write-Host "Using endpoint '$name' (auto-discovered)." -ForegroundColor Cyan
        return $name
    }

    $enabled = $endpoints | Where-Object { $_.properties.enabledState -eq 'Enabled' }
    if ($enabled.Count -eq 1) {
        $name = $enabled[0].name
        Write-Host "Using enabled endpoint '$name' (auto-discovered)." -ForegroundColor Cyan
        return $name
    }

    $allNames = $endpoints | ForEach-Object { $_.name }
    throw "Multiple endpoints detected: $($allNames -join ', '). Specify one with -EndpointName."
}

function Resolve-RouteName {
    param(
        [string]$EndpointName
    )

    $routes = Invoke-AzCli -Arguments @(
            'afd', 'route', 'list',
            '--resource-group', $ResourceGroupName,
            '--profile-name', $FrontDoorProfileName,
            '--endpoint-name', $EndpointName
        ) -AsJson

    if (-not $routes -or $routes.Count -eq 0) {
        throw "No routes found for endpoint '$EndpointName'. Create one or pass -RouteName manually."
    }

    if ($routes.Count -eq 1) {
        $name = $routes[0].name
        Write-Host "Using route '$name' (auto-discovered)." -ForegroundColor Cyan
        return $name
    }

    $enabled = $routes | Where-Object { $_.properties.enabledState -eq 'Enabled' }
    if ($enabled.Count -eq 1) {
        $name = $enabled[0].name
        Write-Host "Using enabled route '$name' (auto-discovered)." -ForegroundColor Cyan
        return $name
    }

    $defaultRoute = $routes | Where-Object { $_.name -eq 'default-route' }
    if ($defaultRoute.Count -eq 1) {
        Write-Host "Using 'default-route'." -ForegroundColor Cyan
        return 'default-route'
    }

    $allNames = $routes | ForEach-Object { $_.name }
    throw "Multiple routes detected: $($allNames -join ', '). Specify one with -RouteName."
}

function Get-DomainResourceId {
    return "/subscriptions/$SubscriptionId/resourceGroups/$ResourceGroupName/providers/Microsoft.Cdn/profiles/$FrontDoorProfileName/customDomains/$DomainResourceName"
}

function Get-OrCreateDomain {
    param(
        [string]$DomainName,
        [string]$Hostname
    )

    try {
        $domain = Invoke-AzCli -Arguments @('afd', 'custom-domain', 'show', '--resource-group', $ResourceGroupName, '--profile-name', $FrontDoorProfileName, '--custom-domain-name', $DomainName) -AsJson
        Write-Host "Found existing domain '$DomainName'." -ForegroundColor Green
        return $domain
    }
    catch {
        Write-Host "Creating Front Door domain '$DomainName' for host '$Hostname'..." -ForegroundColor Cyan
        $domain = Invoke-AzCli -Arguments @(
                'afd', 'custom-domain', 'create',
                '--resource-group', $ResourceGroupName,
                '--profile-name', $FrontDoorProfileName,
                '--custom-domain-name', $DomainName,
                '--host-name', $Hostname,
                '--certificate-type', 'ManagedCertificate',
                '--minimum-tls-version', 'TLS12'
            ) -AsJson
        return $domain
    }
}

function Show-ValidationInstructions {
    param(
        $Domain
    )

    $validation = $Domain.validationProperties
    if (-not $validation) {
        Write-Host 'Azure did not return validation instructions.' -ForegroundColor Yellow
        return
    }

    Write-Host 'DNS validation details:' -ForegroundColor Yellow
    Write-Host (ConvertTo-Json -Depth 5 -InputObject $validation)
}

function Wait-ForDomainValidation {
    param(
        [string]$DomainName,
        [int]$TimeoutMinutes
    )

    $deadline = (Get-Date).AddMinutes($TimeoutMinutes)
    do {
        $domain = Invoke-AzCli -Arguments @('afd', 'custom-domain', 'show', '--resource-group', $ResourceGroupName, '--profile-name', $FrontDoorProfileName, '--custom-domain-name', $DomainName) -AsJson
        $state = $domain.domainValidationState
        Write-Host "Current validation state: $state" -ForegroundColor Gray
        if ($state -eq 'Approved') {
            return $domain
        }

        if ((Get-Date) -gt $deadline) {
            throw "Validation did not complete within $TimeoutMinutes minute(s)."
        }

        Start-Sleep -Seconds 20
    } while ($true)
}

function Ensure-DomainHttps {
    param(
        [string]$DomainName
    )

    Write-Host 'Ensuring domain is configured for Azure-managed TLS...' -ForegroundColor Cyan
    $domain = Invoke-AzCli -Arguments @(
            'afd', 'custom-domain', 'update',
            '--resource-group', $ResourceGroupName,
            '--profile-name', $FrontDoorProfileName,
            '--custom-domain-name', $DomainName,
            '--certificate-type', 'ManagedCertificate',
            '--minimum-tls-version', 'TLS12'
        ) -AsJson
    return $domain
}

function Update-RouteCustomDomains {
    param(
        [string]$RouteName,
        [string]$DomainName
    )

    $route = Invoke-AzCli -Arguments @('afd', 'route', 'show', '--resource-group', $ResourceGroupName, '--profile-name', $FrontDoorProfileName, '--endpoint-name', $EndpointName, '--name', $RouteName) -AsJson
    $existing = @()
    if ($route.customDomains) {
        $existing = $route.customDomains | ForEach-Object { 
            # Extract just the name from the ID
            $_.id -replace '.*/customDomains/', ''
        }
    }

    if ($existing -contains $DomainName) {
        Write-Host 'Route already references the custom domain.' -ForegroundColor Green
        return $route
    }

    $updatedDomains = @()
    $updatedDomains += $existing
    $updatedDomains += $DomainName

    Write-Host 'Updating route to include the custom domain...' -ForegroundColor Cyan
    $cliArgs = @(
        'afd', 'route', 'update',
        '--resource-group', $ResourceGroupName,
        '--profile-name', $FrontDoorProfileName,
        '--endpoint-name', $EndpointName,
        '--name', $RouteName,
        '--link-to-default-domain', 'Enabled',
        '--custom-domains'
    )
    $cliArgs += $updatedDomains
    $route = Invoke-AzCli -Arguments $cliArgs -AsJson

    return $route
}

Ensure-AzCli
$null = Ensure-AzLogin -SubscriptionId $SubscriptionId

if ([string]::IsNullOrWhiteSpace($EndpointName)) {
    $EndpointName = Resolve-EndpointName
}

if ([string]::IsNullOrWhiteSpace($RouteName)) {
    $RouteName = Resolve-RouteName -EndpointName $EndpointName
}

$domain = Get-OrCreateDomain -DomainName $DomainResourceName -Hostname $CustomHostname
Show-ValidationInstructions -Domain $domain

if ($WaitForValidation) {
    Write-Host 'Waiting for domain validation to complete...' -ForegroundColor Cyan
    $domain = Wait-ForDomainValidation -DomainName $DomainResourceName -TimeoutMinutes $ValidationTimeoutMinutes
    Write-Host 'Validation approved.' -ForegroundColor Green
    $domain = Ensure-DomainHttps -DomainName $DomainResourceName
}
else {
    Write-Host 'Skipping validation wait. Re-run with -WaitForValidation after DNS is updated.' -ForegroundColor Yellow
}

$route = Update-RouteCustomDomains -RouteName $RouteName -DomainName $DomainResourceName

Write-Host 'Front Door domain configuration complete.' -ForegroundColor Green
Write-Host "Domain resource ID: $((Get-DomainResourceId))" -ForegroundColor Green
Write-Host "Route now maps to $(($route.customDomains | ForEach-Object { $_.properties.hostName }) -join ', ')." -ForegroundColor Green
