---
name: Production Front Door Setup
about: Track configuration of somos.tech production domain with Azure Front Door
title: 'Configure Azure Front Door for Production (somos.tech)'
labels: ['infrastructure', 'production', 'security', 'high-priority']
assignees: ''
---

## Overview
Configure the production domain `somos.tech` to route through the existing Azure Front Door profile for SSL/TLS termination and geo-blocking WAF protection.

## Current Status
- ✅ **Development**: `dev.somos.tech` fully configured with Front Door + geo-blocking
- ⏳ **Production**: `somos.tech` pending configuration (uses same Front Door profile for cost efficiency)

## Resources
- **Front Door Profile**: `fd-somos-tech` (Standard_AzureFrontDoor)
- **Endpoint**: `fd-somostech-ehgfhqcpa2bka7dt.z02.azurefd.net`
- **WAF Policy**: `devwafpolicy` (blocks non-US traffic)
- **Resource Group**: `rg-somos-tech-dev` (shared)

## Configuration Steps

### 1. Add Custom Domain to Front Door
```powershell
az afd custom-domain create `
  --resource-group rg-somos-tech-dev `
  --profile-name fd-somos-tech `
  --custom-domain-name somos-tech `
  --host-name somos.tech `
  --certificate-type ManagedCertificate
```

### 2. Configure DNS in Cloudflare
Add CNAME record:
- **Type**: CNAME
- **Name**: @ (or somos.tech)
- **Target**: `fd-somostech-ehgfhqcpa2bka7dt.z02.azurefd.net`
- **Proxy status**: DNS only (disable Cloudflare proxy)
- **TTL**: Auto or 1 hour

Add TXT record for domain validation:
```powershell
# Get validation token from Azure
az afd custom-domain show `
  --resource-group rg-somos-tech-dev `
  --profile-name fd-somos-tech `
  --custom-domain-name somos-tech `
  --query "validationProperties"
```

- **Type**: TXT
- **Name**: `_dnsauth.somos.tech`
- **Value**: (token from above command)

### 3. Wait for Domain Validation
Monitor validation status:
```powershell
az afd custom-domain show `
  --resource-group rg-somos-tech-dev `
  --profile-name fd-somos-tech `
  --custom-domain-name somos-tech `
  --query "{validationState: domainValidationState, deploymentStatus: deploymentStatus}"
```

Wait for:
- `domainValidationState`: "Approved"
- `deploymentStatus`: "Succeeded"

### 4. Update Front Door Route
Add production domain to the route:
```powershell
# Get existing route configuration
az afd route show `
  --resource-group rg-somos-tech-dev `
  --profile-name fd-somos-tech `
  --endpoint-name fd-somostech `
  --route-name default-route

# Update route to include both dev and prod domains
az afd route update `
  --resource-group rg-somos-tech-dev `
  --profile-name fd-somos-tech `
  --endpoint-name fd-somostech `
  --route-name default-route `
  --custom-domains dev-somos-tech somos-tech `
  --link-to-default-domain Enabled
```

### 5. Remove Custom Domain from Production Static Web App
Force all production traffic through Front Door:
```powershell
# Find production Static Web App name
az staticwebapp list --resource-group rg-somos-tech-prod --query "[].name"

# Remove custom domain
az staticwebapp hostname delete `
  --name <prod-swa-name> `
  --resource-group rg-somos-tech-prod `
  --hostname somos.tech `
  --yes
```

### 6. Verify Configuration
Test production domain:
```powershell
# Check for Front Door headers
curl -I https://somos.tech | Select-String "x-azure-ref"

# Test geo-blocking (should return 403 from non-US IP)
# Use VPN or international proxy to test

# Verify SSL certificate
curl https://somos.tech
```

## Security Checklist
- [ ] Custom domain added to Front Door
- [ ] DNS CNAME configured in Cloudflare
- [ ] Domain validation completed
- [ ] Managed SSL certificate provisioned
- [ ] Route updated with production domain
- [ ] Custom domain removed from Static Web App
- [ ] Traffic verified through Front Door (`x-azure-ref` header present)
- [ ] Geo-blocking tested (403 for non-US traffic)
- [ ] HTTPS redirect working
- [ ] Certificate auto-renewal enabled

## Cost Impact
- **No additional cost**: Production domain shares existing Front Door profile ($35/mo)
- **Managed certificate**: Included (no charge)
- **WAF custom rule**: Already counted ($1/mo for first rule)
- **Total**: Same $36/mo for dev + prod

## Documentation Updates
- [ ] Update `DEPLOYMENT_GUIDE.md` status section
- [ ] Update `README.md` with production URL
- [ ] Document DNS configuration in Cloudflare
- [ ] Add to infrastructure diagram

## Rollback Plan
If issues occur:
1. Re-add custom domain to production Static Web App
2. Update DNS to point directly to Static Web App
3. Investigate and resolve Front Door issues
4. Retry configuration

## Related Files
- `infra/main.bicep` - Infrastructure definition (Front Door resources lines 643-778)
- `scripts/setup-frontdoor-domain.ps1` - Automation script for domain setup
- `DEPLOYMENT_GUIDE.md` - Deployment documentation
- `staticwebapp.config.json` - SWA configuration

## Success Criteria
- ✅ Production domain (somos.tech) accessible via HTTPS
- ✅ Valid SSL certificate from Microsoft
- ✅ All traffic routes through Front Door
- ✅ Geo-blocking enforced (US-only access)
- ✅ No direct access to Static Web App origin
- ✅ Same security posture as development environment

## Notes
- Front Door deployment propagation takes 5-15 minutes globally
- DNS propagation may take up to 24 hours (typically 5-10 minutes with 1-hour TTL)
- Monitor Azure Front Door metrics in Azure Portal after deployment
- Reference development setup for troubleshooting
