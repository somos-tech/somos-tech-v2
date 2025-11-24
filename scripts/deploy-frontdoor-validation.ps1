<#!
.SYNOPSIS
Automates the secure Static Web App deployment workflow by provisioning the Bicep stack, pointing the custom domain to Azure Front Door, and guiding validation.

.DESCRIPTION
1. Runs the Bicep group deployment using the provided parameters.
2. Updates the specified DNS zone so the chosen record (e.g., dev.somos.tech) points at the emitted Front Door endpoint.
3. Performs a basic US-based probe, then prompts for a non-US check and surfaces recent WAF metrics so you can confirm the BlockNonUS rule is firing.

.NOTES
- Requires Azure CLI (az) logged into the correct subscription.
- Assumes the DNS zone is hosted in Azure DNS.
- Designed to keep monthly spend under $40 by relying on Front Door Standard and a single custom rule.
#>
param (
    [Parameter(Mandatory = $true)]
    [string]$ResourceGroupName,

    [Parameter(Mandatory = $true)]
    [string]$ParameterFile,

    [string]$BicepFile = "infra/main.bicep",

    [string]$DeploymentName = "frontdoor-secure-" + (Get-Date -Format 'yyyyMMddHHmmss'),

    [Parameter(Mandatory = $true)]
    [string]$DnsZoneResourceGroup,

    [Parameter(Mandatory = $true)]
    [string]$DnsZoneName,

    [string]$DnsRecordName = 'dev',

    [int]$DnsTtl = 300,

    [switch]$SkipDnsUpdate,

    [switch]$SkipValidation
)

$ErrorActionPreference = 'Stop'

function Invoke-AzCli {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Arguments,

        [switch]$AsJson
    )

    Write-Host "> az $Arguments" -ForegroundColor Cyan
    $command = "az $Arguments"
    $result = Invoke-Expression $command 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Azure CLI command failed:`nCommand: az $Arguments`n$result"
    }

    if ($AsJson) {
        return $result | ConvertFrom-Json
    }

    return $result
}

Write-Host "Running group deployment via $BicepFile ..." -ForegroundColor Green
$isBicepParam = $ParameterFile.ToLower().EndsWith('.bicepparam')
$templateSegment = $isBicepParam ? '' : " --template-file `"$BicepFile`""
$parametersSegment = " --parameters @$ParameterFile"
$deploymentArgs = "deployment group create --name $DeploymentName --resource-group $ResourceGroupName$templateSegment$parametersSegment"
$deploymentResult = Invoke-AzCli -Arguments $deploymentArgs -AsJson
$outputs = $deploymentResult.properties.outputs

$frontDoorHost = $outputs.frontDoorEndpointHostName.value
$frontDoorProfileName = $outputs.frontDoorProfileName.value
$wafPolicyId = $outputs.frontDoorWafPolicyId.value

if (-not $frontDoorHost) {
    throw 'Deployment output frontDoorEndpointHostName was not returned. Check the Bicep deployment results.'
}
if (-not $frontDoorProfileName) {
    throw 'Deployment output frontDoorProfileName was not returned. Check the Bicep deployment results.'
}

Write-Host "Front Door endpoint: $frontDoorHost" -ForegroundColor Yellow
Write-Host "Front Door profile: $frontDoorProfileName" -ForegroundColor Yellow
Write-Host "WAF policy id: $wafPolicyId" -ForegroundColor Yellow

$recordSetName = if ([string]::IsNullOrWhiteSpace($DnsRecordName)) { '@' } else { $DnsRecordName }
$customDomain = if ($recordSetName -eq '@') { $DnsZoneName } else { "$recordSetName.$DnsZoneName" }

if (-not $SkipDnsUpdate) {
    Write-Host "Updating Azure DNS ($customDomain -> $frontDoorHost)..." -ForegroundColor Green
    try {
        Invoke-AzCli -Arguments "network dns record-set cname create --resource-group $DnsZoneResourceGroup --zone-name $DnsZoneName --name $recordSetName --ttl $DnsTtl" | Out-Null
    } catch {
        if ($_.Exception.Message -match 'already exists') {
            Write-Host "Record set already exists, reusing it." -ForegroundColor Yellow
        } else {
            throw
        }
    }

    Invoke-AzCli -Arguments "network dns record-set cname set-record --resource-group $DnsZoneResourceGroup --zone-name $DnsZoneName --record-set-name $recordSetName --cname $frontDoorHost" | Out-Null
    Write-Host "DNS record updated. Allow a few minutes for propagation." -ForegroundColor Green
} else {
    Write-Host "SkipDnsUpdate flag set. Remember to point $customDomain to $frontDoorHost manually." -ForegroundColor Yellow
}

if (-not $SkipValidation) {
    Write-Host "Waiting 60 seconds for DNS to propagate before validation..." -ForegroundColor Green
    Start-Sleep -Seconds 60

    $targetUrl = "https://$customDomain"
    Write-Host "Probing $targetUrl from current (assumed US) location..." -ForegroundColor Green
    try {
        $usResponse = Invoke-WebRequest -Uri $targetUrl -UseBasicParsing -TimeoutSec 30
        Write-Host "US probe succeeded with HTTP status $($usResponse.StatusCode)." -ForegroundColor Green
    } catch {
        Write-Warning "US probe failed: $($_.Exception.Message). Investigate connectivity or wait longer for DNS to propagate."
    }

    Write-Host "ACTION REQUIRED: Use a non-US network (VPN or remote host) to browse $targetUrl. You should see the custom 'Access restricted' message (HTTP 403)." -ForegroundColor Yellow
    Write-Host "Press ENTER after completing the non-US test to continue with WAF telemetry." -ForegroundColor Yellow
    [void][System.Console]::ReadLine()

    Write-Host "Querying WAF metrics for BlockNonUS activity (last hour)..." -ForegroundColor Green
    Start-Sleep -Seconds 30 # allow telemetry to land

    try {
        $metricsArgs = "afd log-analytics metrics list --resource-group $ResourceGroupName --profile-name $frontDoorProfileName --metrics WebApplicationFirewallTotalRequestCount --dimensions WafAction --granularity PT5M --date-range PT1H"
        $metrics = Invoke-AzCli -Arguments $metricsArgs -AsJson
        if ($metrics.value -and $metrics.value.Count -gt 0) {
            foreach ($series in $metrics.value) {
                Write-Host "Metric: $($series.metric)" -ForegroundColor Cyan
                foreach ($data in $series.data) {
                    $dimText = if ($data.dimensions) { ($data.dimensions | ForEach-Object { "${($_.name)}=${($_.value)}" }) -join '; ' } else { 'n/a' }
                    Write-Host "  $($data.timeStamp): $($data.sum) ($dimText)"
                }
            }
        } else {
            Write-Host "No WAF telemetry returned yet. Re-run the metrics command later if needed." -ForegroundColor Yellow
        }
    } catch {
        Write-Warning "Unable to query WAF metrics automatically: $($_.Exception.Message). Use the Azure Portal (Front Door > Reports) to confirm BlockNonUS hits."
    }
} else {
    Write-Host "SkipValidation flag set. Remember to test from US and non-US locations manually." -ForegroundColor Yellow
}

Write-Host "All done. Front Door now fronts $customDomain with US-only access." -ForegroundColor Green
