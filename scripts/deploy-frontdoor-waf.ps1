param(
    [Parameter(Mandatory = $true)]
    [string]$ResourceGroupName,

    [Parameter(Mandatory = $true)]
    [string]$FrontDoorProfileName,

    [Parameter(Mandatory = $true)]
    [string]$EndpointName,

    [Parameter()]
    [string]$SecurityPolicyName = 'afd-security',

    [Parameter()]
    [string[]]$AllowedCountries = @('US'),

    [Parameter()]
    [string]$SubscriptionId = '',

    [Parameter()]
    [string]$BlockResponsePath = '',

    [Parameter()]
    [string]$CustomBlockHtml = '<html><body><h1>Access restricted</h1><p>This application only accepts traffic from approved US regions.</p></body></html>'
)

Import-Module Az.Accounts -ErrorAction Stop
Import-Module Az.Resources -ErrorAction Stop

function Ensure-AzContext {
    $context = Get-AzContext -ErrorAction SilentlyContinue
    if (-not $context) {
        Write-Host 'No Azure session found. Prompting for authentication...' -ForegroundColor Yellow
        Connect-AzAccount -ErrorAction Stop | Out-Null
        $context = Get-AzContext -ErrorAction Stop
    }

    if ([string]::IsNullOrWhiteSpace($SubscriptionId)) {
        return $context
    }

    if ($context.Subscription -and $context.Subscription.Id -eq $SubscriptionId) {
        return $context
    }

    Write-Host "Switching Azure context to subscription $SubscriptionId" -ForegroundColor Cyan
    $null = Set-AzContext -SubscriptionId $SubscriptionId -ErrorAction Stop
    return Get-AzContext -ErrorAction Stop
}

function Get-BlockResponseBase64 {
    param(
        [string]$Path,
        [string]$FallbackHtml
    )

    $html = if (-not [string]::IsNullOrWhiteSpace($Path)) {
        Get-Content -Path $Path -Raw -ErrorAction Stop
    }
    elseif (-not [string]::IsNullOrWhiteSpace($FallbackHtml)) {
        $FallbackHtml
    }
    else {
        '<html><body><h1>Request blocked</h1></body></html>'
    }

    return [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($html))
}

function Confirm-FrontDoorResources {
    param(
        [string]$ResourceGroupName,
        [string]$ProfileName,
        [string]$EndpointName
    )

    $profile = Get-AzResource -ResourceGroupName $ResourceGroupName -ResourceType 'Microsoft.Cdn/profiles' -ResourceName $ProfileName -ApiVersion '2023-05-01' -ErrorAction SilentlyContinue
    if (-not $profile) {
        throw "Front Door profile '$ProfileName' was not found in resource group '$ResourceGroupName'."
    }

    $endpoint = Get-AzResource -ResourceGroupName $ResourceGroupName -ResourceType 'Microsoft.Cdn/profiles/afdEndpoints' -ResourceName "$ProfileName/$EndpointName" -ApiVersion '2023-05-01' -ErrorAction SilentlyContinue
    if (-not $endpoint) {
        throw "Endpoint '$EndpointName' was not found under profile '$ProfileName'."
    }

    return @{ Profile = $profile; Endpoint = $endpoint }
}

function Set-FrontDoorEmbeddedWaf {
    param(
        [string]$ResourceGroupName,
        [string]$ProfileName,
        [string]$EndpointName,
        [string]$SecurityPolicyName,
        [string[]]$AllowedCountries,
        [string]$BlockResponseBase64
    )

    if (-not $AllowedCountries -or $AllowedCountries.Count -eq 0) {
        throw 'AllowedCountries must contain at least one ISO country code.'
    }

    $subscriptionId = (Get-AzContext).Subscription.Id
    $endpointId = "/subscriptions/$subscriptionId/resourceGroups/$ResourceGroupName/providers/Microsoft.Cdn/profiles/$ProfileName/afdEndpoints/$EndpointName"

    $resourceName = "$ProfileName/$SecurityPolicyName"
    $existingPolicy = Get-AzResource -ResourceGroupName $ResourceGroupName -ResourceType 'Microsoft.Cdn/profiles/securityPolicies' -ResourceName $resourceName -ApiVersion '2023-05-01' -ErrorAction SilentlyContinue
    if ($existingPolicy) {
        Write-Host "Removing existing security policy '$SecurityPolicyName'..." -ForegroundColor Yellow
        Remove-AzResource -ResourceId $existingPolicy.ResourceId -ApiVersion '2023-05-01' -Force -ErrorAction Stop
    }

    $propertyObject = @{
        parameters = @{
            type = 'WebApplicationFirewallEmbedded'
            wafPolicy = @{
                sku = @{ name = 'Standard_AzureFrontDoor' }
                properties = @{
                    policySettings = @{
                        enabledState = 'Enabled'
                        mode = 'Prevention'
                        defaultCustomBlockResponseStatusCode = 403
                        defaultCustomBlockResponseBody = $BlockResponseBase64
                    }
                    customRules = @{
                        rules = @(
                            @{
                                name = 'BlockNonUS'
                                priority = 100
                                enabledState = 'Enabled'
                                action = 'Block'
                                matchConditions = @(
                                    @{
                                        matchVariable = 'RemoteAddr'
                                        operator = 'GeoMatch'
                                        matchValue = $AllowedCountries
                                        negateCondition = $true
                                    }
                                )
                            }
                        )
                    }
                    managedRules = @{
                        managedRuleSets = @(
                            @{
                                ruleSetType = 'Microsoft_DefaultRuleSet'
                                ruleSetVersion = '2.1'
                                ruleSetAction = 'Block'
                            }
                        )
                    }
                }
            }
            associations = @(
                @{
                    domains = @(@{ id = $endpointId })
                    patternsToMatch = @('/*')
                }
            )
        }
    }

    Write-Host "Creating embedded WAF security policy '$SecurityPolicyName'..." -ForegroundColor Cyan
    $resource = New-AzResource -ResourceGroupName $ResourceGroupName -ResourceType 'Microsoft.Cdn/profiles/securityPolicies' -ResourceName $resourceName -ApiVersion '2023-05-01' -PropertyObject $propertyObject -Force -ErrorAction Stop
    return $resource
}

$null = Ensure-AzContext
$null = Confirm-FrontDoorResources -ResourceGroupName $ResourceGroupName -ProfileName $FrontDoorProfileName -EndpointName $EndpointName
$blockResponseBase64 = Get-BlockResponseBase64 -Path $BlockResponsePath -FallbackHtml $CustomBlockHtml
$policy = Set-FrontDoorEmbeddedWaf -ResourceGroupName $ResourceGroupName -ProfileName $FrontDoorProfileName -EndpointName $EndpointName -SecurityPolicyName $SecurityPolicyName -AllowedCountries $AllowedCountries -BlockResponseBase64 $blockResponseBase64

Write-Host 'Embedded WAF security policy deployment complete.' -ForegroundColor Green
Write-Host "Security policy resource ID: $($policy.ResourceId)" -ForegroundColor Green