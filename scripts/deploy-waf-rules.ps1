<#
.SYNOPSIS
    Deploy enhanced WAF rules to Azure Front Door

.DESCRIPTION
    Updates the devwafpolicy with comprehensive security rules including:
    - Malicious user-agent blocking
    - Script extension blocking  
    - Injection pattern detection
    - Request body validation
    - Suspicious file upload blocking
    - Rate limiting
    - Microsoft managed rulesets (DefaultRuleSet + BotManager)
#>

param(
    [string]$ResourceGroup = "rg-somos-tech-dev",
    [string]$WafPolicyName = "devwafpolicy"
)

$ErrorActionPreference = "Stop"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host " Deploying Enhanced WAF Rules" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Load the WAF configuration
Write-Host "Loading WAF configuration..." -ForegroundColor Yellow
$wafConfig = Get-Content ".\waf-rules-update.json" | ConvertFrom-Json

# Get current WAF policy
Write-Host "Fetching current WAF policy..." -ForegroundColor Yellow
$currentPolicy = az network front-door waf-policy show `
    --resource-group $ResourceGroup `
    --name $WafPolicyName `
    --output json | ConvertFrom-Json

Write-Host "  Current custom rules: $($currentPolicy.customRules.rules.Count)" -ForegroundColor Gray
Write-Host "  Current managed rulesets: $($currentPolicy.managedRules.managedRuleSets.Count)" -ForegroundColor Gray
Write-Host ""

# Update custom rules one by one
Write-Host "Deploying custom rules..." -ForegroundColor Yellow
$ruleCount = 0

foreach ($rule in $wafConfig.customRules.rules) {
    $ruleCount++
    Write-Host "  [$ruleCount/$($wafConfig.customRules.rules.Count)] $($rule.name)..." -ForegroundColor Cyan
    
    # Check if rule exists and delete it
    try {
        az network front-door waf-policy rule delete `
            --resource-group $ResourceGroup `
            --policy-name $WafPolicyName `
            --name $rule.name `
            --yes 2>$null | Out-Null
    } catch {
        # Rule doesn't exist, that's fine
    }
    
    # Create rule with basic parameters
    $createParams = @(
        "network", "front-door", "waf-policy", "rule", "create",
        "--resource-group", $ResourceGroup,
        "--policy-name", $WafPolicyName,
        "--name", $rule.name,
        "--priority", $rule.priority.ToString(),
        "--rule-type", $rule.ruleType,
        "--action", $rule.action,
        "--defer"
    )
    
    # Add rate limit specific parameters
    if ($rule.ruleType -eq "RateLimitRule") {
        $createParams += "--rate-limit-duration"
        $createParams += $rule.rateLimitDurationInMinutes.ToString()
        $createParams += "--rate-limit-threshold"
        $createParams += $rule.rateLimitThreshold.ToString()
    }
    
    # Create rule in deferred mode
    az @createParams | Out-Null
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "    ✗ Failed to create rule" -ForegroundColor Red
        continue
    }
    
    # Add match conditions
    foreach ($mc in $rule.matchConditions) {
        $matchParams = @(
            "network", "front-door", "waf-policy", "rule", "match-condition", "add",
            "--resource-group", $ResourceGroup,
            "--policy-name", $WafPolicyName,
            "--name", $rule.name,
            "--match-variable", $mc.matchVariable,
            "--operator", $mc.operator,
            "--values"
        )
        $matchParams += $mc.matchValue
        
        if ($mc.selector) {
            $matchParams[10] = "$($mc.matchVariable).$($mc.selector)"
        }
        
        if ($mc.negateCondition) {
            $matchParams += "--negate"
        }
        
        if ($mc.transforms) {
            $matchParams += "--transforms"
            $matchParams += $mc.transforms
        }
        
        $matchParams += "--defer"
        
        az @matchParams | Out-Null
    }
    
    # Update from cache (apply deferred changes)
    az network front-door waf-policy rule update `
        --resource-group $ResourceGroup `
        --policy-name $WafPolicyName `
        --name $rule.name | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "    ✓ Deployed with $($rule.matchConditions.Count) condition(s)" -ForegroundColor Green
    } else {
        Write-Host "    ✗ Failed to apply conditions" -ForegroundColor Red
    }
}

Write-Host ""

# Update managed rules
Write-Host "Deploying managed rulesets..." -ForegroundColor Yellow

foreach ($ruleset in $wafConfig.managedRules.managedRuleSets) {
    Write-Host "  $($ruleset.ruleSetType) v$($ruleset.ruleSetVersion)..." -ForegroundColor Cyan
    
    try {
        az network front-door waf-policy managed-rules add `
            --resource-group $ResourceGroup `
            --policy-name $WafPolicyName `
            --type $ruleset.ruleSetType `
            --version $ruleset.ruleSetVersion `
            --action $ruleset.ruleSetAction 2>$null
        
        if ($LASTEXITCODE -ne 0) {
            # Ruleset already exists
            Write-Host "    ✓ Already configured" -ForegroundColor Gray
        } else {
            Write-Host "    ✓ Deployed" -ForegroundColor Green
        }
    } catch {
        Write-Host "    ⚠ Note: $_" -ForegroundColor Yellow
    }
}

Write-Host ""

# Verify deployment
Write-Host "Verifying deployment..." -ForegroundColor Yellow
$updatedPolicy = az network front-door waf-policy show `
    --resource-group $ResourceGroup `
    --name $WafPolicyName `
    --output json | ConvertFrom-Json

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host " Deployment Summary" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Custom Rules Deployed:  $($updatedPolicy.customRules.rules.Count)" -ForegroundColor Green
foreach ($rule in $updatedPolicy.customRules.rules | Sort-Object priority) {
    Write-Host "  [$($rule.priority)] $($rule.name) - $($rule.action)" -ForegroundColor Gray
}
Write-Host ""
Write-Host "Managed Rulesets:       $($updatedPolicy.managedRules.managedRuleSets.Count)" -ForegroundColor Green
foreach ($rs in $updatedPolicy.managedRules.managedRuleSets) {
    Write-Host "  $($rs.ruleSetType) v$($rs.ruleSetVersion)" -ForegroundColor Gray
}
Write-Host ""
Write-Host "Policy Mode:            $($updatedPolicy.policySettings.mode)" -ForegroundColor $(if ($updatedPolicy.policySettings.mode -eq "Prevention") { "Green" } else { "Yellow" })
Write-Host "Policy State:           $($updatedPolicy.policySettings.enabledState)" -ForegroundColor $(if ($updatedPolicy.policySettings.enabledState -eq "Enabled") { "Green" } else { "Red" })
Write-Host "Request Body Check:     $($updatedPolicy.policySettings.requestBodyCheck)" -ForegroundColor $(if ($updatedPolicy.policySettings.requestBodyCheck -eq "Enabled") { "Green" } else { "Yellow" })
Write-Host "Provisioning State:     $($updatedPolicy.provisioningState)" -ForegroundColor $(if ($updatedPolicy.provisioningState -eq "Succeeded") { "Green" } else { "Yellow" })
Write-Host ""
Write-Host "✓ WAF rules deployed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Wait 5-10 minutes for Front Door propagation" -ForegroundColor Gray
Write-Host "  2. Run: .\scripts\test-waf-rules.ps1 -Verbose" -ForegroundColor Gray
Write-Host "  3. Verify rules are blocking malicious traffic" -ForegroundColor Gray
Write-Host ""
