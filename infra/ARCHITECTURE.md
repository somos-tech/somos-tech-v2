# Deployment Architecture Overview

This document provides a high-level overview of the deployment architecture and how all components work together.

## System Components

### 1. Frontend (Azure Static Web App)

**Technology**: React + Vite + TypeScript
**Hosting**: Azure Static Web Apps (Free tier)
**URL**: `https://swa-somos-tech-{env}-{hash}.azurestaticapps.net`

Features:
- Global CDN distribution for fast load times
- Automatic HTTPS/SSL certificates
- Custom domain support
- Staging environments for each pull request
- Client-side routing with React Router

### 2. Backend (Azure Function App)

**Technology**: Node.js 20 + Azure Functions v4
**Hosting**: Azure Functions (Flex Consumption Plan)
**URL**: `https://func-somos-tech-{env}-{hash}.azurewebsites.net`

Features:
- RESTful API endpoints
- Serverless architecture (pay per execution)
- Automatic scaling based on demand
- Managed identity for secure access to Azure resources

### 3. Data Storage (Azure Storage Account)

**Service**: Azure Storage (Table Storage)
**Authentication**: Managed Identity (passwordless)

Features:
- NoSQL data storage
- Low-cost storage solution
- High availability and durability
- Automatic backup and replication

### 4. Monitoring (Application Insights)

**Service**: Azure Application Insights
**Connected to**: Log Analytics Workspace

Features:
- Real-time application monitoring
- Performance metrics and alerts
- Error tracking and diagnostics
- Custom telemetry and events

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                          User Browser                            │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                │ HTTPS (Port 443)
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│                    Azure Static Web App                          │
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  React Application (SPA)                               │    │
│  │  - Routing (React Router)                              │    │
│  │  - UI Components                                        │    │
│  │  - State Management                                     │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                   │
│  Static Assets:                                                  │
│  - HTML, CSS, JavaScript                                        │
│  - Images, fonts                                                 │
│  - Cached on CDN                                                 │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                │ API Calls
                                │ (Backend Link + CORS)
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│                    Azure Function App                            │
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  API Endpoints                                          │    │
│  │  - GET    /api/events                                   │    │
│  │  - GET    /api/events/{id}                              │    │
│  │  - POST   /api/events                                   │    │
│  │  - PUT    /api/events/{id}                              │    │
│  │  - DELETE /api/events/{id}                              │    │
│  │  - GET    /api/venues                                   │    │
│  │  - GET    /api/sponsors                                 │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                   │
│  Authentication: Managed Identity                                │
│  Scaling: Automatic (0-100 instances)                           │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                │ Table API
                                │ (Managed Identity Auth)
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│                    Azure Storage Account                         │
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Table Storage                                          │    │
│  │  - Events table                                         │    │
│  │  - Venues table                                         │    │
│  │  - Sponsors table                                       │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Blob Storage                                           │    │
│  │  - Function deployment packages                         │    │
│  └────────────────────────────────────────────────────────┘    │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                │ Telemetry Data
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│                    Application Insights                          │
│                                                                   │
│  - Request tracking                                              │
│  - Performance metrics                                           │
│  - Error logging                                                 │
│  - Custom events                                                 │
│  - Dependency tracking                                           │
│                                                                   │
│  Connected to: Log Analytics Workspace                          │
└─────────────────────────────────────────────────────────────────┘
```

## Deployment Pipeline

### Frontend Deployment (GitHub Actions)

```
┌─────────────────────────────────────────────────────────────────┐
│                     Developer Workflow                           │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                  ┌─────────────┴─────────────┐
                  │                           │
        ┌─────────▼─────────┐     ┌──────────▼──────────┐
        │  Push to main     │     │  Create Pull        │
        │  branch           │     │  Request            │
        └─────────┬─────────┘     └──────────┬──────────┘
                  │                          │
┌─────────────────▼──────────────────────────▼─────────────────┐
│              GitHub Actions Workflow                          │
│                                                                │
│  1. Checkout code                                             │
│  2. Setup Node.js 20                                          │
│  3. Install dependencies (npm ci)                             │
│  4. Build React app (npm run build)                           │
│     - Environment variables injected                          │
│     - VITE_API_URL                                            │
│     - VITE_ENVIRONMENT                                        │
│  5. Deploy to Azure Static Web Apps                           │
│     - Production (main branch)                                │
│     - Staging (pull request)                                  │
└───────────────────────────────┬───────────────────────────────┘
                                │
                  ┌─────────────┴─────────────┐
                  │                           │
        ┌─────────▼─────────┐     ┌──────────▼──────────┐
        │  Production       │     │  Staging            │
        │  Environment      │     │  Environment        │
        │  (main branch)    │     │  (PR preview)       │
        └───────────────────┘     └─────────────────────┘
```

### Backend Deployment (Azure Functions Core Tools)

```
┌─────────────────────────────────────────────────────────────────┐
│                     Developer Workflow                           │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                  ┌─────────────▼─────────────┐
                  │  Infrastructure Deployed  │
                  │  (Bicep template)         │
                  └─────────────┬─────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│              Azure Functions Core Tools                          │
│                                                                   │
│  Command: func azure functionapp publish <name>                 │
│                                                                   │
│  1. Build project                                                │
│  2. Create deployment package                                    │
│  3. Upload to Azure Blob Storage                                │
│  4. Deploy to Function App                                       │
│  5. Sync triggers                                                │
│  6. Restart app                                                  │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                  ┌─────────────▼─────────────┐
                  │  Function App Running     │
                  │  API endpoints live       │
                  └───────────────────────────┘
```

## Security Architecture

### Authentication & Authorization

```
┌─────────────────────────────────────────────────────────────────┐
│                         Security Layers                          │
└─────────────────────────────────────────────────────────────────┘

1. Transport Security
   ├─ HTTPS enforced (TLS 1.2+)
   ├─ Automatic SSL certificates
   └─ HSTS headers

2. Access Control
   ├─ CORS configuration (Static Web App domain allowed)
   ├─ Function auth level: anonymous (for development)
   └─ Future: Azure AD authentication

3. Data Security
   ├─ Managed Identity (passwordless authentication)
   ├─ No connection strings in code
   ├─ Storage encryption at rest
   └─ Network ACLs on storage

4. Application Security
   ├─ Security headers (CSP, X-Frame-Options, etc.)
   ├─ Input validation
   ├─ SQL injection protection (NoSQL)
   └─ XSS protection

5. Secrets Management
   ├─ GitHub Secrets for deployment tokens
   ├─ Azure Key Vault ready
   └─ Environment variables for config
```

## Scaling Strategy

### Frontend (Static Web App)

- **Global CDN**: Content distributed across Azure's global network
- **No scaling needed**: Static files served from edge locations
- **Automatic**: No configuration required

### Backend (Function App)

- **Flex Consumption Plan**:
  - Scales from 0 to 100 instances automatically
  - 2048 MB memory per instance
  - Sub-second cold start times
  - Pay only for execution time

- **Scaling triggers**:
  - HTTP request queue length
  - CPU/Memory utilization
  - Custom metrics

### Storage (Table Storage)

- **Automatic scaling**: Handles millions of entities
- **Partitioning**: Events grouped by partition key
- **Throughput**: Up to 20,000 transactions/second per partition

## Disaster Recovery

### Backup Strategy

1. **Code**: Stored in GitHub (version control)
2. **Infrastructure**: Infrastructure as Code (Bicep templates)
3. **Data**: Azure Storage redundancy (LRS by default)
4. **Configuration**: Environment variables in GitHub/Azure

### Recovery Time Objective (RTO)

- **Infrastructure**: ~5 minutes (redeploy Bicep template)
- **Frontend**: ~3 minutes (GitHub Actions)
- **Backend**: ~2 minutes (Function deployment)
- **Total RTO**: ~10 minutes

### Recovery Point Objective (RPO)

- **Code changes**: 0 (Git commits)
- **Data**: Depends on Azure Storage replication (typically < 1 hour)

## Monitoring & Alerting

### Metrics Tracked

**Frontend**:
- Page load time
- User sessions
- Browser errors
- Navigation patterns

**Backend**:
- Request count
- Response time
- Error rate
- Dependency failures

**Infrastructure**:
- Function execution count
- Storage operations
- Network throughput
- Cost metrics

### Recommended Alerts

1. **High Error Rate**: > 5% errors in 5 minutes
2. **Slow Response**: P95 > 2 seconds
3. **High Cost**: Daily spend > threshold
4. **Function Failures**: > 10 failures in 5 minutes

## Cost Optimization

### Current Setup (Dev Environment)

| Service | Tier | Estimated Cost |
|---------|------|----------------|
| Static Web App | Free | $0 |
| Function App | Flex Consumption | ~$2-5/month |
| Storage Account | Standard LRS | ~$1/month |
| Application Insights | Pay-as-you-go | ~$2/month (5GB free) |
| **Total** | | **~$5-10/month** |

### Production Recommendations

- **Static Web App**: Upgrade to Standard tier for custom auth ($9/month)
- **Function App**: Monitor scaling, adjust max instances
- **Storage**: Use lifecycle policies to archive old data
- **Application Insights**: Configure sampling for high-traffic apps

## Environment Strategy

### Development
- Resource Group: `rg-somos-tech-dev`
- URL: `swa-somos-tech-dev-*.azurestaticapps.net`
- Purpose: Active development and testing

### Staging (Future)
- Resource Group: `rg-somos-tech-staging`
- URL: `swa-somos-tech-staging-*.azurestaticapps.net`
- Purpose: Pre-production testing

### Production (Future)
- Resource Group: `rg-somos-tech-prod`
- URL: `www.somostech.com` (custom domain)
- Purpose: Live application

## Performance Characteristics

### Frontend
- **First Contentful Paint**: < 1s (CDN)
- **Time to Interactive**: < 2s
- **Largest Contentful Paint**: < 2.5s

### Backend
- **Cold Start**: < 1s (Flex Consumption)
- **Warm Request**: < 100ms
- **P99 Latency**: < 500ms

### Data Layer
- **Table Read**: < 10ms
- **Table Write**: < 20ms
- **Query**: < 100ms (small datasets)

## Future Enhancements

1. **Authentication**: Add Azure AD B2C for user management
2. **API Management**: Add Azure API Management for rate limiting
3. **CDN**: Configure custom CDN rules and caching
4. **Database**: Migrate to Azure Cosmos DB for better scalability
5. **CI/CD**: Add automated testing in pipeline
6. **Monitoring**: Set up custom dashboards and alerts
7. **Custom Domain**: Add custom domain and SSL
8. **Backup**: Implement automated backup strategy

---

This architecture provides a solid foundation for a production-ready application while maintaining cost-effectiveness and ease of maintenance.
