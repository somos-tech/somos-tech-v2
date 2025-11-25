# Azure Front Door Deployment Summary

**Date**: November 24, 2025  
**Environment**: Development (dev.somos.tech)  
**Status**: ✅ DEPLOYED & OPERATIONAL

## What Was Deployed

### Infrastructure
Configured Azure Front Door Standard to provide:
- **SSL/TLS Termination**: Azure-managed certificates (auto-renewed)
- **Geo-Blocking**: WAF policy blocks all non-US traffic
- **DDoS Protection**: Built into Front Door Standard
- **Global CDN**: Improved performance via edge caching
- **Origin Protection**: Static Web App only accessible through Front Door

### Resources Created
1. **Front Door Profile**: `fd-somos-tech`
   - SKU: Standard_AzureFrontDoor
   - Location: Global
   - Shared across dev/prod for cost optimization

2. **Front Door Endpoint**: `fd-somostech-ehgfhqcpa2bka7dt.z02.azurefd.net`
   - HTTPS enabled
   - HTTP → HTTPS redirect

3. **Custom Domain**: `dev.somos.tech`
   - SSL Certificate: Azure-managed (auto-renewed)
   - DNS: CNAME → Front Door endpoint
   - Status: Deployed & operational

4. **WAF Policy**: `devwafpolicy`
   - Mode: Prevention (actively blocks)
   - Custom Rule: `GeoBlockNonUS`
   - Action: Block non-US traffic with 403 Forbidden
   - Priority: 100

5. **Origin Configuration**:
   - Backend: Static Web App (`swa-somos-tech-dev-64qb73pzvgekw`)
   - Health Probe: HTTPS HEAD / (every 120 seconds)
   - Origin Protection: Custom domain removed from SWA

## Traffic Flow

```
User Request (dev.somos.tech)
    ↓
DNS Resolution (Cloudflare)
    ↓
Azure Front Door (fd-somostech...z02.azurefd.net)
    ├─ SSL/TLS Termination
    ├─ WAF Policy Check (Geo-blocking)
    └─ If allowed (US traffic):
        ↓
    Origin: Static Web App
        ↓
    Response to User
```

## Security Enhancements

### Before Front Door
- ❌ Direct access to Static Web App
- ❌ No geo-blocking
- ❌ Static Web App SSL only
- ❌ Limited DDoS protection

### After Front Door
- ✅ All traffic through Front Door
- ✅ Geo-blocking enforced (US-only)
- ✅ Azure-managed certificates
- ✅ Enterprise-grade DDoS protection
- ✅ Origin protected (custom domain removed)

## Verification

### Confirm Traffic Through Front Door
```powershell
curl -I https://dev.somos.tech | Select-String "x-azure-ref"
```
Expected: `x-azure-ref: 20251124T...` (unique to Front Door)

### Test Geo-Blocking
From a non-US IP (VPN/proxy):
```
HTTP/1.1 403 Forbidden
```

From US IP:
```
HTTP/1.1 200 OK
x-azure-ref: ...
```

### DNS Configuration
```
$ nslookup dev.somos.tech
Name:    fd-somostech-ehgfhqcpa2bka7dt.z02.azurefd.net
```

## Cost Impact

| Resource | Monthly Cost |
|----------|--------------|
| Front Door Standard Profile | $35.00 |
| Custom WAF Rule (1) | $1.00 |
| Managed SSL Certificate | Included |
| Data Transfer | Usage-based |
| **Total Fixed Cost** | **$36.00/mo** |

**Note**: Same Front Door profile will be shared with production (somos.tech) - no additional profile cost.

## Production Deployment

### Status: ⏳ PENDING

The production domain `somos.tech` needs to be added to the same Front Door profile.

**Next Steps**:
1. Add custom domain for somos.tech
2. Configure DNS CNAME in Cloudflare
3. Wait for domain validation
4. Update route to include production domain
5. Remove custom domain from production Static Web App

**Estimated Time**: 30-45 minutes  
**Downtime**: None (seamless cutover)  
**Additional Cost**: $0 (shares existing profile)

See: `.github/ISSUE_TEMPLATE/prod-frontdoor-setup.md` for detailed steps

## Configuration Files

### Updated Files
1. **infra/main.bicep** (lines 643-778)
   - Added Front Door profile resource
   - Added endpoint, origin group, origin
   - Added route configuration
   - Added WAF policy with geo-blocking
   - Added security policy
   - Added outputs for domain names

2. **DEPLOYMENT_GUIDE.md**
   - Added deployment status section
   - Added Front Door configuration steps
   - Added verification procedures
   - Added production deployment guide

3. **scripts/setup-frontdoor-domain.ps1**
   - Automation script for custom domain setup
   - Handles DNS validation
   - Updates routes
   - Error handling and validation

### DNS Configuration (Cloudflare)
```
Type: CNAME
Name: dev
Target: fd-somostech-ehgfhqcpa2bka7dt.z02.azurefd.net
Proxy: DNS only (disabled)

Type: TXT
Name: _dnsauth.dev
Value: [Azure validation token]
TTL: Auto
```

## Monitoring & Alerts

### Azure Portal Metrics
- Front Door → fd-somos-tech → Metrics
  - Request Count
  - Bandwidth
  - Response Status Codes
  - Latency
  - WAF Blocks

### Log Analytics
- WAF logs available in Log Analytics workspace
- Query blocked requests:
  ```kusto
  AzureDiagnostics
  | where Category == "FrontDoorWebApplicationFirewallLog"
  | where action_s == "Block"
  ```

## Troubleshooting

### Certificate Issues
- Check domain validation: `az afd custom-domain show ...`
- Verify DNS records in Cloudflare
- Wait 5-15 minutes for propagation

### 404 Errors
- Verify route deployment status
- Check origin configuration
- Confirm Static Web App is running

### 403 Forbidden (Geo-blocking)
- Expected for non-US traffic
- Verify client IP location
- Check WAF policy logs

## Rollback Plan

If issues occur:
1. Re-add custom domain to Static Web App
2. Update DNS to point directly to SWA
3. Traffic routes around Front Door
4. Investigate and resolve issues
5. Retry Front Door configuration

**Rollback Time**: 5-10 minutes

## Documentation References

- [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md) - Full deployment procedures
- [infra/main.bicep](../infra/main.bicep) - Infrastructure as Code
- [scripts/setup-frontdoor-domain.ps1](../scripts/setup-frontdoor-domain.ps1) - Automation script
- [Azure Front Door Documentation](https://learn.microsoft.com/en-us/azure/frontdoor/)
- [.github/ISSUE_TEMPLATE/prod-frontdoor-setup.md](../.github/ISSUE_TEMPLATE/prod-frontdoor-setup.md) - Production setup checklist

## Team Contacts

For questions or issues:
- **Infrastructure**: See Azure Portal for Front Door configuration
- **DNS**: Cloudflare dashboard
- **Security**: Review WAF policy in Azure Portal
- **Deployment**: Follow DEPLOYMENT_GUIDE.md procedures

---

**Deployment Completed**: November 24, 2025  
**Deployed By**: Infrastructure Team  
**Next Action**: Configure production domain (somos.tech)
