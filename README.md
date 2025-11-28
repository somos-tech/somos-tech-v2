# SOMOS.tech V2 🐦‍🔥

Modern event management and community platform built with React, Azure Functions, and Azure Static Web Apps.

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Edge Security & WAF Rules](#edge-security--waf-rules)
- [Quick Start](#quick-start)
- [Authentication Setup](#authentication-setup)
- [Project Structure](#project-structure)
- [Development](#development)
- [Deployment](#deployment)
- [CI/CD Workflows](#cicd-workflows)
- [Multi-Environment Setup](#multi-environment-setup)
- [Monitoring & Troubleshooting](#monitoring--troubleshooting)
- [Cost Management](#cost-management)

---

## Overview

SOMOS.tech is a full-stack event management and community platform featuring:
- Modern React frontend with TypeScript and Vite
- Serverless API backend with Azure Functions (30+ endpoints)
- NoSQL data storage with Azure Cosmos DB
- **Dual Authentication**: Azure AD for admins, Auth0 for members
- **AI-Powered Moderation**: 3-tier content moderation with Azure AI
- **Community Features**: Groups, events, messaging, notifications
- **Admin Dashboard**: User management, content moderation, system health monitoring
- **Donation Integration**: Givebutter integration
- Global CDN distribution via Azure Front Door + Static Web Apps
- Edge security enforced by Azure Front Door Web Application Firewall (WAF)
- Automated CI/CD with GitHub Actions

**Live URLs**:
- **Production**: `https://somos.tech` (custom domain)
- **Development**: `https://dev.somos.tech` (custom domain)
- **API (Dev)**: `https://func-somos-tech-dev-64qb73pzvgekw.azurewebsites.net`

---

## Tech Stack

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **React Router** - Client-side routing
- **Lucide React** - Icons
- **Radix UI** - Accessible components
- **date-fns** - Date formatting

### Backend
- **Node.js 20** - Runtime
- **Azure Functions v4** - Serverless framework (30+ HTTP triggers)
- **Azure Cosmos DB** - NoSQL database (serverless)
- **Azure OpenAI** - AI-powered content moderation and agents
- **Application Insights** - Monitoring and telemetry

### Infrastructure
- **Azure Static Web Apps** (Standard) - Frontend hosting with custom domains
- **Azure Functions** (Flex Consumption) - API hosting with managed scaling
- **Azure Front Door** (Standard) - Global CDN with WAF protection
- **Azure Cosmos DB** (Serverless) - NoSQL database with multiple containers
- **Azure Storage Account** - Function storage, site images, and media uploads
- **Azure Blob Storage** - Profile photos and admin media (container: `media`)
- **Application Insights** - Monitoring, analytics & system health
- **Bicep** - Infrastructure as Code

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                    USERS                                             │
│                     (Admins via Azure AD | Members via Auth0)                        │
└─────────────────────────────────────┬───────────────────────────────────────────────┘
                                      │ HTTPS
                              ┌───────▼───────┐
                              │  Cloudflare   │
                              │     DNS       │
                              │ (dev/prod)    │
                              └───────┬───────┘
                                      │ CNAME
              ┌───────────────────────▼────────────────────────┐
              │        Azure Front Door (Standard)              │
              │  ┌────────────────────────────────────────────┐ │
              │  │              WAF Policy                     │ │
              │  │  • Geo-blocking (US, CA, MX, GB only)      │ │
              │  │  • Bot/scanner detection                    │ │
              │  │  • SQL injection protection                 │ │
              │  │  • Rate limiting (100 req/min)              │ │
              │  └────────────────────────────────────────────┘ │
              │  • Global Anycast Edge                          │
              │  • Custom domains + SSL certificates            │
              └───────────────────────┬────────────────────────┘
                                      │ Backend Origin
              ┌───────────────────────▼────────────────────────┐
              │         Azure Static Web App (Standard)         │
              │  ┌─────────────────┐  ┌──────────────────────┐ │
              │  │   React SPA     │  │   Auth Providers     │ │
              │  │  • TypeScript   │  │  ┌────────────────┐  │ │
              │  │  • Tailwind CSS │  │  │ Azure AD (aad) │  │ │
              │  │  • Vite build   │  │  │ (Admin Portal) │  │ │
              │  └─────────────────┘  │  ├────────────────┤  │ │
              │                       │  │  Auth0 (auth0) │  │ │
              │                       │  │ (Member Portal)│  │ │
              │                       │  └────────────────┘  │ │
              │                       └──────────────────────┘ │
              └───────────────────────┬────────────────────────┘
                                      │ Linked Backend
              ┌───────────────────────▼────────────────────────┐
              │       Azure Function App (Flex Consumption)     │
              │  ┌────────────────────────────────────────────┐ │
              │  │              30+ HTTP Triggers              │ │
              │  │  • /api/events      • /api/users           │ │
              │  │  • /api/groups      • /api/moderation      │ │
              │  │  • /api/media       • /api/notifications   │ │
              │  │  • /api/agent       • /api/health          │ │
              │  │  • /api/GetUserRoles (role provider)       │ │
              │  └────────────────────────────────────────────┘ │
              │  • Node.js 20 Runtime                           │
              │  • Managed Identity                             │
              └──────┬───────────────────────────────┬─────────┘
                     │                               │
         ┌───────────▼───────────┐       ┌───────────▼───────────┐
         │   Azure Cosmos DB     │       │   Azure Storage       │
         │      (Serverless)     │       │      Account          │
         │  ┌─────────────────┐  │       │  ┌─────────────────┐  │
         │  │ Containers:     │  │       │  │ Containers:     │  │
         │  │ • events        │  │       │  │ • media         │  │
         │  │ • users         │  │       │  │ • images        │  │
         │  │ • groups        │  │       │  │ • $web          │  │
         │  │ • broadcasts    │  │       │  └─────────────────┘  │
         │  │ • notifications │  │       │  • Blob storage       │
         │  │ • messages      │  │       │  • Profile photos     │
         │  │ • moderation    │  │       └───────────────────────┘
         │  └─────────────────┘  │
         └───────────┬───────────┘
                     │
         ┌───────────▼───────────┐       ┌───────────────────────┐
         │   Application         │       │   Azure OpenAI        │
         │   Insights            │       │   (Content Moderation)│
         │  • Telemetry          │       │  • 3-tier moderation  │
         │  • Health monitoring  │       │  • Security detection │
         │  • Error tracking     │       │  • OWASP LLM attacks  │
         └───────────────────────┘       └───────────────────────┘
```

### Data Flow

```
User Browser
   ↓ (HTTPS via Cloudflare DNS)
Azure Front Door (WAF inspection + custom domain)
   ↓ (Origin forwarding)
Azure Static Web App (React SPA + Auth)
   ↓ (/.auth/* for login, /api/* proxied to backend)
   ├── /.auth/login/aad → Azure AD (admin authentication)
   └── /.auth/login/auth0 → Auth0 (member authentication)
   ↓
Azure Function App (REST API with 30+ endpoints)
   ↓ (Cosmos DB SDK / Storage SDK / Azure AI)
   ├── Azure Cosmos DB (user data, events, groups, messages)
   ├── Azure Storage (media uploads, profile photos)
   └── Azure OpenAI (content moderation, AI agents)
   ↓
Application Insights (telemetry, monitoring, alerts)
```

### Security Architecture

1. **Transport Security**: HTTPS enforced (TLS 1.2+), automatic SSL certificates
2. **Access Control**: CORS configuration, Managed Identity authentication
3. **Data Security**: Storage encryption at rest, identity-based auth (no connection strings)
4. **Application Security**: Security headers (CSP, X-Frame-Options), input validation
5. **Edge Protection**: Azure Front Door WAF blocking Tor/anonymous networks, malicious user agents, script extensions, injection payloads, suspicious uploads, and abusive request rates
6. **Secrets Management**: GitHub Secrets, Azure Key Vault ready
7. **Content Moderation**: 3-tier AI moderation with Azure OpenAI, OWASP LLM attack detection

### System Health Monitoring

The admin dashboard includes built-in health monitoring that proactively alerts administrators to issues:

```
┌─────────────────────────────────────────────────────────────────┐
│                    System Health Monitoring                      │
├─────────────────────────────────────────────────────────────────┤
│  Component          │  Check                                     │
├─────────────────────┼───────────────────────────────────────────┤
│  Auth Config        │  Azure AD & Auth0 provider configuration  │
│  API Health         │  /api/health endpoint availability        │
│  Database           │  Cosmos DB connectivity                   │
│  Storage            │  Blob storage access                      │
└─────────────────────┴───────────────────────────────────────────┘

Alert Levels:
  🔴 Critical - Auth/API down, immediate attention required
  🟡 Warning  - Slow responses, non-critical issues  
  🟢 Healthy  - All systems operational
```

- **Proactive Alerts**: Displayed at top of admin dashboard
- **Auto-Refresh**: Checks run every 5 minutes
- **Cached Results**: Stored in localStorage to reduce API calls
- **Dismissible**: Alerts can be dismissed but will return if issues persist

### Content Moderation System

AI-powered 3-tier moderation system for user-generated content:

```
Tier 1: Local Filters (instant)
   ├── Blocklist matching (profanity, slurs)
   ├── URL pattern detection
   └── Known attack patterns
   ↓
Tier 2: Azure AI Safety (fast)
   ├── Hate speech detection
   ├── Violence/self-harm
   ├── Sexual content
   └── Jailbreak attempts
   ↓
Tier 3: Azure OpenAI Analysis (detailed)
   ├── Context-aware review
   ├── OWASP Top 10 LLM attacks
   ├── Prompt injection detection
   └── Semantic analysis
```

Features:
- **Security Attack Detection**: OWASP Top 10 LLM attack patterns
- **Admin Test Panel**: Test moderation on sample content
- **Audit Logging**: All moderation decisions logged to Cosmos DB
- **Configurable Tiers**: Enable/disable tiers per workflow

### Edge Security & WAF Rules

Traffic now terminates at Azure Front Door before reaching the Static Web App. The attached WAF policy enforces:

- `BlockAnonymousNetworks` (priority 100): GeoMatch allow-list that only permits United States, Canada, Mexico, and United Kingdom traffic (all other countries blocked at the edge)
- `BlockMaliciousUserAgents` (priority 200): drops scanners and automation frameworks (curl, wget, python-requests, nikto, sqlmap, Nessus, Nmap, etc.) using a lowercase transform for consistent matching
- `BlockScriptExtensions` (priority 300): prevents direct requests for executable/script artifacts (.php, .aspx, .jsp, .sh, .pl, .cgi, .exe, .dll, .jar)
- `BlockCommonInjectionPatterns` + `BlockInjectionInRequestBody` (priorities 400/500): inspect query strings and bodies after URL-decoding to catch `<script>`, `javascript:`, `../`, `%27`, `union select`, `information_schema`, and SQLi staples like `' or '1'='1`
- `BlockSuspiciousFileUploads` (priority 600): rejects uploads advertising executable MIME types such as `application/x-msdownload`
- `RateLimitExcessiveRequests` (priority 700): global rate-limit rule (100 requests/min per client IP) to slow brute-force or enumeration attempts

Infrastructure as code: `infra/main.bicep` provisions the Front Door profile, endpoint, and `BlockAnonymousNetworks` geo-allowlist (US, Canada, Mexico, UK by default) alongside the rest of the custom rules. Update the `frontDoorAllowedCountries` parameter whenever compliance approves new regions so the edge stays in sync with production.

> **Propagation note**: Azure Front Door may report `deploymentStatus: NotStarted` immediately after WAF updates. Allow 15–30 minutes for global rollout and confirm via `az afd security-policy show`.

---

## Quick Start

### Prerequisites

- GitHub account with access to the repository
- Azure subscription
- Azure CLI (for local development)

```bash
# Install Azure CLI (for local development only)
brew install azure-cli  # macOS

# Install Azure Functions Core Tools (for local API development)
brew install azure/functions/azure-functions-core-tools@4

# Install Node.js 20
brew install node@20
```

### 1. Configure GitHub Secrets & Variables

#### Overview: Service Principals & App Registrations

This project uses two types of Azure credentials:

1. **Deployment Service Principal** (`AZURE_CREDENTIALS`)
   - Purpose: Deploy infrastructure and application code via GitHub Actions
   - Type: Service Principal with Contributor role
   - Used by: All deployment workflows

2. **Azure AD App Registration** (`AZURE_AD_CLIENT_SECRET`)
   - Purpose: Enable user authentication in the Static Web App
   - Type: Azure AD Application with delegated permissions
   - Used by: Infrastructure deployment to configure authentication

#### Required Secrets

Go to **Settings → Secrets and variables → Actions** in your GitHub repository.

##### AZURE_STATIC_WEB_APPS_API_TOKEN

Get deployment token:
```bash
# Get Static Web App name
SWA_NAME=$(az deployment group show \
  --resource-group rg-somos-tech-dev \
  --name main \
  --query properties.outputs.staticWebAppName.value \
  --output tsv)

# Get deployment token
az staticwebapp secrets list \
  --name $SWA_NAME \
  --resource-group rg-somos-tech-dev \
  --query properties.apiKey \
  --output tsv
```

Add as secret: `AZURE_STATIC_WEB_APPS_API_TOKEN`

##### AZURE_CREDENTIALS

Create service principal for Function App deployment:

```bash
# Get subscription ID
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

# Create service principal
az ad sp create-for-rbac \
  --name "github-actions-somos-tech" \
  --role contributor \
  --scopes /subscriptions/$SUBSCRIPTION_ID/resourceGroups/rg-somos-tech-dev \
  --sdk-auth
```

Copy the JSON output and add as secret: `AZURE_CREDENTIALS`

Expected format:
```json
{
  "clientId": "<your-client-id>",
  "clientSecret": "<generated-secret>",
  "subscriptionId": "<your-subscription-id>",
  "tenantId": "<your-tenant-id>"
}
```

##### AZURE_AD_CLIENT_SECRET (for authentication)

Required for Static Web App authentication with Azure AD.

**Note**: You'll create this when setting up Azure AD authentication. See the [Authentication Setup](#authentication-setup) section for detailed steps.

Quick reference:
1. Create an Azure AD App Registration for "SOMOS.tech Admin Portal"
2. Generate a client secret in **Certificates & secrets**
3. Add the secret value to GitHub as `AZURE_AD_CLIENT_SECRET`

This secret allows the infrastructure deployment to automatically configure your Static Web App with Azure AD authentication settings.

Add as secret: `AZURE_AD_CLIENT_SECRET`

#### Required Variables

Add these as **repository variables** (Settings → Secrets and variables → Actions → Variables):

- `VITE_API_URL` = Function App URL (from deployment output)
- `VITE_ENVIRONMENT` = `production` (or `development`)
- `AZURE_FUNCTIONAPP_NAME` = Function App name (from deployment output)
- `AZURE_SUBSCRIPTION_ID` = Your Azure subscription ID
- `RESOURCE_GROUP_NAME` = `rg-somos-tech-dev`

#### Secrets Checklist

- [ ] `AZURE_STATIC_WEB_APPS_API_TOKEN` - Static Web App deployment
- [ ] `AZURE_CREDENTIALS` - Service principal for Function App
- [ ] `AZURE_AD_CLIENT_SECRET` - Azure AD authentication

#### Variables Checklist

- [ ] `VITE_API_URL` - API endpoint URL
- [ ] `VITE_ENVIRONMENT` - Environment name
- [ ] `AZURE_FUNCTIONAPP_NAME` - Function App name
- [ ] `AZURE_SUBSCRIPTION_ID` - Subscription ID
- [ ] `RESOURCE_GROUP_NAME` - Resource group name

### 2. Deploy Infrastructure via GitHub Actions

Once secrets and variables are configured:

1. Go to **Actions** tab in your GitHub repository
2. Select **Deploy Infrastructure (Manual Only)** workflow
3. Click **Run workflow**
4. Select environment (dev or prod)
5. Click **Run workflow**

This creates:
- ✅ Azure Function App (API backend)
- ✅ Azure Static Web App (React frontend)
- ✅ Storage Account (data storage)
- ✅ Application Insights (monitoring)

The deployment typically completes in 3-5 minutes.

### 3. Deploy Frontend & Backend

After infrastructure is deployed, push your code to trigger automatic deployments:

```bash
git add .
git commit -m "Initial deployment"
git push origin main
```

This triggers:
- ✅ Function App deployment (API)
- ✅ Static Web App deployment (frontend)

Watch deployment progress in the **Actions** tab.

### 4. Access Your App

URLs from deployment output:
- **Web App**: Check GitHub Actions deployment output
- **API**: Check infrastructure deployment output

Test the API:
```bash
curl https://func-somos-tech-dev-xxxxx.azurewebsites.net/api/events
```

---

## Project Structure

```
somos-tech-v2/
├── apps/
│   ├── api/                    # Azure Functions backend (Node.js 20)
│   │   ├── functions/          # HTTP trigger functions (30+)
│   │   │   ├── events.js       # Events CRUD operations
│   │   │   ├── users.js        # User management + profile sync
│   │   │   ├── adminUsers.js   # Admin user management
│   │   │   ├── agent.js        # AI agent endpoints
│   │   │   ├── groups.js       # Community groups
│   │   │   ├── communityGroups.js # Community group features
│   │   │   ├── communityMessages.js # Community messaging
│   │   │   ├── media.js        # Media upload/management
│   │   │   ├── moderation.js   # AI-powered content moderation
│   │   │   ├── GetUserRoles.js # SWA role provider
│   │   │   ├── notifications.js # Notification system
│   │   │   ├── broadcastNotifications.js # Broadcast system
│   │   │   ├── health.js       # Health check endpoint
│   │   │   └── register.js     # User registration
│   │   ├── shared/             # Shared modules
│   │   │   ├── httpResponse.js # Response helpers
│   │   │   ├── authMiddleware.js # Authentication middleware
│   │   │   ├── rateLimiter.js  # Rate limiting
│   │   │   ├── validation.js   # Input validation
│   │   │   ├── prompts/        # AI moderation prompts
│   │   │   └── services/       # Business logic
│   │   │       ├── agentService.js # AI agent orchestration
│   │   │       ├── eventService.js # Event management
│   │   │       ├── mediaService.js # Media/blob storage
│   │   │       ├── moderationService.js # 3-tier AI moderation
│   │   │       ├── notificationService.js # Notifications
│   │   │       └── venueAgentService.js   # Venue agents
│   │   ├── host.json           # Function App configuration
│   │   ├── local.settings.json # Local development settings
│   │   └── package.json
│   │
│   └── web/                    # React frontend (TypeScript)
│       ├── src/
│       │   ├── api/            # API service layer
│       │   │   ├── adminUsersService.ts
│       │   │   ├── eventService.ts
│       │   │   ├── groupsService.ts
│       │   │   ├── mediaService.ts     # Media upload API
│       │   │   ├── moderationService.ts # Moderation API
│       │   │   ├── systemHealthService.ts # System health monitoring
│       │   │   └── notificationsService.ts
│       │   ├── components/     # React components
│       │   │   ├── admin-events/ # Event management
│       │   │   ├── SystemHealthAlert.tsx # Dashboard health alerts
│       │   │   ├── Navigation.tsx
│       │   │   ├── NotificationPanel.tsx
│       │   │   ├── ProfilePhotoUpload.tsx # Photo upload component
│       │   │   ├── ProtectedRoute.tsx
│       │   │   ├── SideBar.tsx
│       │   │   └── ui/         # Reusable UI components (shadcn/ui)
│       │   ├── hooks/          # React hooks
│       │   │   └── useAuth.ts  # Authentication hook
│       │   ├── lib/            # Utility functions
│       │   ├── pages/          # Page components
│       │   │   ├── AdminDashboardNew.tsx # Admin dashboard with health alerts
│       │   │   ├── AdminMedia.tsx  # Admin media portal
│       │   │   ├── AdminModeration.tsx # Content moderation UI
│       │   │   ├── MemberDashboard.tsx # Member portal
│       │   │   ├── Donate.tsx  # Givebutter redirect
│       │   │   └── ...
│       │   ├── shared/         # Types & interfaces
│       │   ├── types/          # TypeScript type definitions
│       │   └── givebutter.d.ts # Givebutter widget declarations
│       ├── staticwebapp.config.json # Static Web App config (dual auth)
│       ├── vite.config.ts      # Vite build configuration
│       └── package.json
│
├── infra/                      # Infrastructure as Code
│   ├── main.bicep              # Main Bicep template (800+ lines)
│   ├── main.bicepparam         # Base parameters
│   ├── main.dev.bicepparam     # Dev environment parameters
│   └── main.prod.bicepparam    # Prod environment parameters
│
├── scripts/                    # Deployment & utility scripts
│   ├── add-admin-user.ps1      # Add admin users
│   ├── configure-dual-auth.ps1 # Dual auth setup
│   ├── deploy-api.ps1          # API deployment
│   ├── populate-groups.ps1     # Populate community groups
│   ├── test-waf-rules.ps1      # WAF rules testing
│   └── ...
│
│   ├── test-waf-rules.ps1      # WAF rules testing
│   └── ...
│
├── .github/
│   └── workflows/
│       ├── deploy-static-web-app.yml  # Frontend CI/CD + auth secrets
│       ├── deploy-function-app.yml    # API CI/CD
│       └── deploy-infrastructure.yml  # Bicep infrastructure deployment
│
└── docs/                       # Documentation directory
    ├── README.md               # Documentation index
    ├── deployment/             # Deployment documentation
    │   ├── DEPLOYMENT_GUIDE.md
    │   ├── DEPLOYMENT_INSTRUCTIONS.md
    │   ├── GITHUB_SECRETS_SETUP.md
    │   └── DEPLOYMENT_ADMIN_USERS.md
    ├── guides/                 # Feature and setup guides
    │   ├── DUAL_AUTH_SETUP.md
    │   ├── USER_MANAGEMENT_GUIDE.md
    │   ├── NOTIFICATIONS_GUIDE.md
    │   └── ADMIN_USERS_IMPLEMENTATION.md
    ├── security/               # Security documentation
    │   ├── SECURITY_REVIEW.md
    │   └── SECURITY_SUMMARY.md
    └── archive/                # Historical/deprecated docs
```

---

## Authentication Setup

The application uses **dual authentication** with separate flows for administrators and members:

### Authentication Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Static Web App Authentication                     │
├─────────────────────────────────┬───────────────────────────────────┤
│         Admin Portal            │         Member Portal              │
│         (Azure AD)              │         (Auth0)                    │
├─────────────────────────────────┼───────────────────────────────────┤
│ Route: /.auth/login/aad         │ Route: /.auth/login/auth0          │
│ Provider: Azure Active Directory│ Provider: Auth0                    │
│ Tenant: cff2ae9c-...            │ Domain: dev-0tp5bbdn7af0lfpv.us    │
│ Access: @somos.tech domain only │ Access: Public (Google, email)     │
│ Purpose: Admin dashboard        │ Purpose: Member registration       │
└─────────────────────────────────┴───────────────────────────────────┘
```

1. **Admin Portal** - Azure AD (Microsoft Entra ID)
   - Purpose: Administrative access for @somos.tech staff
   - Login Route: `/.auth/login/aad`
   - Provider: Azure Active Directory
   - Tenant ID: `cff2ae9c-4810-4a92-a3e8-46e649cbdbe4`
   - App ID: `dcf7379e-4576-4544-893f-77d6649390d3`
   - Allowed Domain: @somos.tech only
   - Features: Role-based access, admin dashboard

2. **Member Portal** - Auth0
   - Purpose: Public member registration and access
   - Login Route: `/.auth/login/auth0`
   - Provider: Auth0 (Custom OpenID Connect)
   - Domain: `dev-0tp5bbdn7af0lfpv.us.auth0.com`
   - Client ID: `08aK1L6WykfRrlhl0gsd4K24Ywy4xcpX`
   - Supports: Google OAuth, email/password
   - Features: Profile photo sync, self-service signup

### Required GitHub Secrets

**Critical**: These secrets must be set to prevent authentication from breaking during deployments.

Go to: `https://github.com/somos-tech/somos-tech-v2/settings/secrets/actions`

| Secret | Purpose |
|--------|---------|
| `ADMIN_AAD_CLIENT_ID` | Azure AD Application ID for admin auth |
| `ADMIN_AAD_CLIENT_SECRET` | Azure AD client secret for admin auth |
| `AUTH0_CLIENT_ID` | Auth0 Application ID for member auth |
| `AUTH0_CLIENT_SECRET` | Auth0 client secret for member auth |
| `AUTH0_DOMAIN` | Auth0 tenant domain |
| `AZURE_CREDENTIALS` | Service principal for Azure deployments |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | SWA deployment token |

**Why this is critical**: The GitHub Actions workflow sets these as SWA app settings during deployment. Without them, deployments will clear the authentication configuration and break login functionality.

### Quick Setup (Development)

1. **Add GitHub Secrets** (see above)
2. **Deploy Infrastructure**:
   ```bash
   # Via GitHub Actions
   Actions → Deploy Infrastructure → Run workflow → Select 'dev'
   ```

3. **Verify Authentication**:
   ```bash
   # Test admin login
   curl -I https://dev.somos.tech/.auth/login/aad
   # Should return: HTTP/1.1 302 Found

   # Test member login
   curl -I https://dev.somos.tech/.auth/login/member
   # Should return: HTTP/1.1 302 Found
   ```

### Authentication Flow

```
Public Pages (/, /events, /groups)
    ↓
    Anyone can access

Member Pages (/profile)
    ↓
    Check authentication (useAuth hook)
    ↓
    ├─→ Not authenticated → Redirect to /login
    │                        ↓
    │                        External ID CIAM login
    │                        (Microsoft or Google)
    │                        ↓
    │                        Success → Return to /profile
    │
    └─→ Authenticated → Allow access

Admin Pages (/admin/*)
    ↓
    Check authentication (useAuth hook)
    ↓
    ├─→ Not authenticated → Redirect to /admin/login
    │                        ↓
    │                        Azure AD login (@somos.tech)
    │                        ↓
    │                        Success → Return to admin dashboard
    │
    └─→ Authenticated → Check domain
        ↓
        ├─→ @somos.tech domain → Allow access
        └─→ Other domain → /unauthorized
```

### Detailed Setup Instructions

For complete setup instructions including app registrations and configuration, see:
- [Dual Auth Setup](docs/guides/DUAL_AUTH_SETUP.md) - Detailed dual authentication configuration
- [GitHub Secrets Setup](docs/deployment/GITHUB_SECRETS_SETUP.md) - GitHub secrets setup guide
- [Documentation Index](docs/README.md) - Complete documentation reference

---

## Development

### Local Development Setup

#### Run API Locally

```bash
cd apps/api
npm install

# Copy local settings
cp local.settings.json.example local.settings.json

# Start Function App
func start
```

API will be available at `http://localhost:7071`

#### Run Frontend Locally

```bash
cd apps/web
npm install

# Create environment file
cp .env.example .env.local

# Edit .env.local
# VITE_API_URL=http://localhost:7071
# VITE_ENVIRONMENT=development

# Start dev server
npm run dev
```

App will be available at `http://localhost:5173`

### Available Scripts

#### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

#### API
- `func start` - Start Function App locally
- `npm test` - Run tests
- `func azure functionapp publish <name>` - Deploy to Azure

---

## Deployment

All deployments are automated via GitHub Actions workflows. No manual deployment scripts are needed.

### Azure Resources Deployed

| Resource | Type | Purpose |
|----------|------|---------|
| Azure Static Web App | `Microsoft.Web/staticSites` | Frontend hosting with CDN |
| Azure Function App | `Microsoft.Web/sites` | Serverless API backend |
| App Service Plan | `Microsoft.Web/serverfarms` | Flex Consumption (FC1 SKU) |
| Storage Account | `Microsoft.Storage/storageAccounts` | Table & blob storage |
| Application Insights | `Microsoft.Insights/components` | Monitoring & analytics |
| Log Analytics Workspace | `Microsoft.OperationalInsights/workspaces` | Log storage |
| Backend Link | `Microsoft.Web/staticSites/linkedBackends` | SWA-Function integration |

### Deployment Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `location` | resourceGroup().location | Azure region |
| `environmentName` | 'dev' | Environment (dev/staging/prod) |
| `appName` | 'somos-tech' | Application name |
| `nodeVersion` | '20' | Node.js runtime version |
| `maximumInstanceCount` | 100 | Max Function App instances |
| `instanceMemoryMB` | 2048 | Instance memory (2048/4096) |

### Deployment Workflows

#### 1. Infrastructure Deployment
- **Workflow**: `deploy-infrastructure.yml`
- **Trigger**: Manual only (workflow_dispatch)

### Azure Front Door Deployment (Custom Domain + WAF)

The Static Web App no longer exposes a public custom domain; all traffic flows through Azure Front Door (`fd-somos-tech`). Deploying or refreshing the edge requires three quick steps:

1. **Provision/refresh the custom domain**
   ```powershell
   pwsh scripts/setup-frontdoor-domain.ps1 -Domain dev.somos.tech -ProfileName fd-somos-tech
   ```
   This script validates the CNAME in Cloudflare, obtains/renews the Azure-managed certificate, and attaches the domain to the `default-route`.

2. **Push the WAF ruleset**
   ```powershell
   pwsh scripts/deploy-waf-rules.ps1
   ```
   The script wipes stale rules, recreates them from `waf-rules-update.json`, and verifies the policy is enabled in Prevention mode.

3. **Confirm propagation + run tests**
   ```powershell
   az afd security-policy show \ 
     --resource-group rg-somos-tech-dev \ 
     --profile-name fd-somos-tech \ 
     --security-policy-name devwafpolicy-60e1330f \ 
     --query "deploymentStatus"

   pwsh scripts/test-waf-rules.ps1 -Verbose
   ```
   Front Door may report `deploymentStatus: NotStarted` for ~15 minutes. Wait for success, then execute the regression script (legitimate traffic should pass; malicious probes should receive 403).

#### WAF Rule Overview

| Rule Name | Priority | What it blocks |
|-----------|----------|----------------|
| `BlockAnonymousNetworks` | 100 | Geo-allowlist enforced via Front Door WAF (only US, Canada, Mexico, UK traffic is permitted; all other countries blocked) |
| `BlockMaliciousUserAgents` | 200 | curl, wget, python-requests, nikto, sqlmap, Nessus, Masscan, Nmap, etc. (case-normalized) |
| `BlockScriptExtensions` | 300 | Direct requests for `.php`, `.aspx`, `.jsp`, `.sh`, `.pl`, `.cgi`, `.exe`, `.dll`, `.jar` |
| `BlockCommonInjectionPatterns` | 400 | Query string payloads containing `<script>`, `javascript:`, `../`, `%27`, `union select`, `information_schema` |
| `BlockInjectionInRequestBody` | 500 | Body payloads with script/injection markers (`<script>`, `union select`, `xp_cmdshell`, path traversal, SQLi) |
| `BlockSuspiciousFileUploads` | 600 | Uploads advertising executable MIME types (`application/x-msdownload`, `application/x-executable`, etc.) |
| `RateLimitExcessiveRequests` | 700 | Clients exceeding 100 requests/minute (per socket address) |

`scripts/test-waf-rules.ps1` exercises every rule with positive/negative cases and exits non-zero if any protection fails. Manual Tor/VPN testing is still recommended for the anonymous-network block.
- **Purpose**: Deploy or update Azure infrastructure
- **Environments**: dev, prod

#### 2. Function App Deployment
- **Workflow**: `deploy-function-app.yml`
- **Trigger**: Push to `main` with changes in `apps/api/**`
- **Purpose**: Deploy API backend code
- **Automatic**: Yes

#### 3. Static Web App Deployment
- **Workflow**: `deploy-static-web-app.yml`
- **Trigger**: Push to `main` with changes in `apps/web/**`
- **Purpose**: Deploy frontend code
- **Automatic**: Yes

---

## CI/CD Workflows

### Infrastructure Workflow (`deploy-infrastructure.yml`)

**Triggers:**
- Manual workflow dispatch only

**Configuration Required:**
- **Secret**: `AZURE_CREDENTIALS` (service principal)
- **Secret**: `AZURE_AD_CLIENT_SECRET` (Azure AD auth)
- **Variable**: `AZURE_SUBSCRIPTION_ID`
- **Variable**: `RESOURCE_GROUP_NAME`

**Steps:**
1. Checkout code
2. Login to Azure
3. Deploy Bicep template with parameters
4. Azure logout

**Duration:** ~3-5 minutes

### Frontend Workflow (`deploy-static-web-app.yml`)

**Triggers:**
- Push to `main` branch with changes in `apps/web/**`
- Pull request opened/updated (creates staging environment)
- Manual trigger

**Configuration Required:**
- **Secret**: `AZURE_STATIC_WEB_APPS_API_TOKEN`
- **Secret**: `EXTERNAL_TENANT_ID` - Azure AD tenant ID for dual auth
- **Secret**: `EXTERNAL_ADMIN_CLIENT_ID` - Admin portal app registration
- **Secret**: `EXTERNAL_ADMIN_CLIENT_SECRET` - Admin portal secret
- **Secret**: `EXTERNAL_MEMBER_CLIENT_ID` - Member portal app registration
- **Secret**: `EXTERNAL_MEMBER_CLIENT_SECRET` - Member portal secret
- **Variable**: `VITE_API_URL`
- **Variable**: `VITE_ENVIRONMENT` (optional)

**Critical**: The EXTERNAL_* secrets are required for authentication. Without them, deployments will clear the authentication configuration. See `GITHUB_SECRETS_SETUP.md` for setup instructions.

**Steps:**
1. Checkout code
2. Setup Node.js 20
3. Install dependencies (`npm ci`)
4. Build React app with environment variables
5. Deploy to Azure Static Web Apps with authentication environment variables
6. Create unique staging URL for PRs

**Duration:** ~2-3 minutes

### API Workflow (`deploy-function-app.yml`)

**Triggers:**
- Push to `main` branch with changes in `apps/api/**`
- Manual trigger

**Configuration Required:**
- **Secret**: `AZURE_CREDENTIALS` (service principal JSON)
- **Workflow file update**: Set `AZURE_FUNCTIONAPP_NAME`

**Setup:**
```bash
# Get Function App name
FUNC_NAME=$(az deployment group show \
  --resource-group rg-somos-tech-dev \
  --name main \
  --query properties.outputs.functionAppName.value \
  --output tsv)

# Create service principal
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
az ad sp create-for-rbac \
  --name "github-actions-somos-tech" \
  --role contributor \
  --scopes /subscriptions/$SUBSCRIPTION_ID/resourceGroups/rg-somos-tech-dev \
  --sdk-auth
```

Add the JSON output as `AZURE_CREDENTIALS` secret in GitHub.

**Steps:**
1. Checkout code
2. Setup Node.js 20
3. Install dependencies
4. Run tests
5. Login to Azure
6. Deploy to Azure Functions
7. Logout

**Duration:** ~1-2 minutes

### Pull Request Flow

```
Create PR → Build & Deploy to Staging → Test on unique URL → Merge → Deploy to Production + Delete Staging
```

---

## Multi-Environment Setup

### Environment Strategy

| Environment | Purpose | Infrastructure Deploy | Code Deploy | Approval | Max Instances | Instance Memory |
|-------------|---------|----------------------|-------------|----------|---------------|-----------------|
| **dev** | Development & testing | Manual | ✅ Auto | ❌ No | 100 | 2048 MB |
| **prod** | Live application | Manual | ✅ Auto | ✅ Required | 500 | 4096 MB |

### Deploy to Multiple Environments

#### 1. Create Azure Resource Groups

```bash
# Create dev resource group
az group create --name rg-somos-tech-dev --location westus2

# Create prod resource group
az group create --name rg-somos-tech-prod --location westus2
```

#### 2. Deploy Infrastructure via GitHub Actions

For each environment:
1. Go to **Actions** → **Deploy Infrastructure (Manual Only)**
2. Click **Run workflow**
3. Select environment (dev or prod)
4. Click **Run workflow**

#### 3. Configure GitHub Environments

1. **Create Environments**: Settings → Environments → Create (dev, prod)

2. **Configure Protection Rules**:
   - **dev**: No protection rules
   - **prod**: Required reviewers, prevent bypass

3. **Add Environment Secrets** (for each environment):
   - `AZURE_CREDENTIALS` - Service principal JSON
   - `AZURE_STATIC_WEB_APPS_API_TOKEN` - Deployment token
   - `AZURE_AD_CLIENT_SECRET` - Azure AD client secret

4. **Add Environment Variables** (for each environment):
   - `AZURE_SUBSCRIPTION_ID` - Azure subscription ID
   - `RESOURCE_GROUP_NAME` - Resource group name (e.g., `rg-somos-tech-dev`)
   - `AZURE_FUNCTIONAPP_NAME` - Function App name
   - `VITE_API_URL` - Function App URL
   - `VITE_ENVIRONMENT` - Environment name

### Resource Naming Convention

```
<resource-type>-<app-name>-<environment>-<unique-suffix>

Examples:
- func-somos-tech-dev-abc123xyz
- swa-somos-tech-prod-def456uvw
- st-somostech-dev-ghi789rst
```

---

## Monitoring & Troubleshooting

### Application Insights

All resources are connected to Application Insights for monitoring:
- **Frontend**: Page views, user sessions, browser errors
- **Backend**: API requests, response times, failures
- **Infrastructure**: Resource utilization, scaling events

**Access**: Azure Portal → Application Insights resource

### View Logs

**Function App Logs:**
```bash
func azure functionapp logstream <function-app-name>
```

**Deployment Logs:**
- GitHub: Actions tab → Select workflow run
- Azure Portal: Resource → Deployment History

### Common Issues

#### Build Fails
```bash
# Test locally
cd apps/web  # or apps/api
npm install
npm run build

# Clear cache if needed
rm -rf node_modules package-lock.json
npm install
```

#### API Returns 404
- Verify Function App is deployed and running
- Check CORS configuration in `main.bicep`
- Confirm `VITE_API_URL` is correct
- Test endpoint: `curl https://<function-app-url>/api/events`

#### GitHub Actions Fails
- Check secrets are set correctly
- Review Actions tab logs
- Ensure `package-lock.json` is committed
- Verify Node.js version matches (20.x)

#### 404 on Page Refresh
- Ensure `staticwebapp.config.json` has `navigationFallback` configured
- Check SPA routing configuration

### Performance Characteristics

**Frontend:**
- First Contentful Paint: < 1s (CDN)
- Time to Interactive: < 2s
- Largest Contentful Paint: < 2.5s

**Backend:**
- Cold Start: < 1s (Flex Consumption)
- Warm Request: < 100ms
- P99 Latency: < 500ms

**Data Layer:**
- Cosmos DB Point Read: < 10ms (single-digit milliseconds)
- Cosmos DB Write: < 15ms
- Cosmos DB Query: < 50ms (indexed queries)
- Serverless Mode: Auto-scales with usage

---

## Cost Management

### Estimated Monthly Costs

**Development Environment:**
| Service | Tier | Est. Cost |
|---------|------|-----------|
| Static Web App | Free | $0 |
| Function App | Flex Consumption | $2-5 |
| Storage Account | Standard LRS | $1 |
| Application Insights | Pay-as-you-go (5GB free) | $2 |
| **Total** | | **~$5-10** |

**Production Environment:**
| Service | Tier | Est. Cost |
|---------|------|-----------|
| Static Web App | Standard | $9 |
| Function App | Flex Consumption | $50-200 |
| Storage Account | Standard LRS | $5 |
| Application Insights | Pay-as-you-go | $10-30 |
| **Total** | | **~$74-244** |

### Cost Optimization Tips

1. **Scale appropriately**: Adjust `maximumInstanceCount` per environment
2. **Delete unused environments**: Remove dev/staging when not needed
3. **Monitor usage**: Set up budget alerts
4. **Use lifecycle policies**: Archive old data in storage
5. **Configure sampling**: Reduce Application Insights data volume for high-traffic apps

### Set Up Budget Alerts

```bash
az consumption budget create \
  --amount 50 \
  --category Cost \
  --name dev-budget \
  --time-grain Monthly \
  --start-date $(date +%Y-%m-01) \
  --end-date $(date -d "+1 year" +%Y-%m-01)
```

---

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

### Rollback Procedure

**Quick Rollback:**
```bash
# Revert last commit
git revert HEAD
git push origin main
```

**Manual Rollback:**
```bash
# Get previous commit
git log --oneline -n 5

# Checkout and deploy
git checkout <previous-commit>
cd apps/api
func azure functionapp publish <function-app-name>
```

**Slot Swap Rollback:**
```bash
az functionapp deployment slot swap \
  --resource-group rg-somos-tech-dev \
  --name $FUNC_NAME \
  --slot production \
  --target-slot staging
```

---

## Clean Up

To delete all resources:

```bash
az group delete --name rg-somos-tech-dev --yes --no-wait
```

⚠️ **Warning**: This will permanently delete everything and cannot be undone.

---

## Additional Resources

### Documentation
- **[Documentation Index](docs/README.md)** - Complete documentation guide
- **[Deployment Guide](docs/deployment/DEPLOYMENT_GUIDE.md)** - Production deployment procedures
- **[Dual Auth Setup](docs/guides/DUAL_AUTH_SETUP.md)** - Authentication configuration
- **[User Management](docs/guides/USER_MANAGEMENT_GUIDE.md)** - User profile and management
- **[Security Documentation](docs/security/)** - Security reviews and best practices
- **[Contributing Guide](CONTRIBUTING.md)** - Development guidelines

### External Documentation
- [Azure Static Web Apps](https://docs.microsoft.com/azure/static-web-apps/)
- [Azure Functions](https://docs.microsoft.com/azure/azure-functions/)
- [Azure Bicep](https://docs.microsoft.com/azure/azure-resource-manager/bicep/)
- [GitHub Actions](https://docs.github.com/actions)

### Tools
- [Azure CLI](https://docs.microsoft.com/cli/azure/install-azure-cli)
- [Azure Functions Core Tools](https://docs.microsoft.com/azure/azure-functions/functions-run-local)
- [GitHub CLI](https://cli.github.com/)

### Support
- **Issues**: Create a GitHub issue
- **Questions**: Contact the development team
- **Azure Support**: [Azure Portal Help + Support](https://portal.azure.com/#blade/Microsoft_Azure_Support/HelpAndSupportBlade)

---

## License

MIT License - see LICENSE file for details

## Contributors

Built with ❤️ by the SOMOS.tech team

---

**Last Updated**: November 25, 2025

## Recent Updates

### November 2025
- ✅ **Media Management System**: Profile photo uploads for members and admin media portal
- ✅ **Azure Blob Storage**: Media storage with `stsomostechdev64qb73pzvg` storage account
- ✅ **Dual Authentication**: Separate auth flows for admins (@somos.tech) and members (External ID CIAM)
- ✅ **Givebutter Integration**: Direct donation links to https://givebutter.com/somostech
- ✅ **Payment Capability Detection**: Apple Pay and Google Pay support indicators
- ✅ **Cosmos DB Migration**: Moved from Azure Table Storage to Cosmos DB for better performance
- ✅ **Automated Deployments**: Restored automatic deployments on push to main branch
- ✅ **Front Door + SWA Lockdown**: Direct access to default SWA hostname blocked (see below)

---

## Media Management System

### Overview

The platform includes a comprehensive media management system for user profile photos and admin-managed site assets. Admins can upload images to any storage container and organize them into folders.

### Features

- **Profile Photo Uploads**: Members can upload profile photos from `/member` dashboard
- **Admin Media Portal**: Admins can manage all media at `/admin/media`
  - **Container Browser**: View and manage all storage containers (profile-photos, site-assets, event-images, group-images, programs, uploads)
  - **Folder Creation**: Create custom folders within containers to organize uploads
  - **Quick Upload**: Upload images directly to any container/folder combination
  - **Gallery View**: Grid and list view modes for browsing uploaded images
  - **Bulk Operations**: Select and delete multiple files at once
  - **Storage Statistics**: Real-time file counts and storage usage per container
- **File Validation**: Max 20MB for site assets, restricted to JPG, JPEG, PNG only
- **Secure Storage**: Azure Blob Storage with managed identity authentication
- **Clickable Navigation**: Click on storage overview boxes or container cards to browse files

### Storage Containers

| Container | Purpose |
|-----------|---------|
| `profile-photos` | User profile photos uploaded by members |
| `site-assets` | Public site assets (logos, banners, etc.) |
| `event-images` | Event promotional images and photos |
| `group-images` | Community group logos and cover images |
| `programs` | Program-related images and assets |
| `uploads` | General file uploads |

### Azure Resources

| Resource | Name | Purpose |
|----------|------|---------|
| Storage Account | `stsomostechdev64qb73pzvg` | Media blob storage |
| Container | `media` | Profile photos and site assets |
| Blob Endpoint | `https://stsomostechdev64qb73pzvg.blob.core.windows.net/` | Public blob access |

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/media/profile-photo` | POST | Upload profile photo (authenticated users) |
| `/api/media/site-asset` | POST | Upload site asset (admin only, supports container & folder) |
| `/api/media-admin/list` | GET | List all containers |
| `/api/media-admin/list/{container}` | GET | List files in a container |
| `/api/media-admin/stats` | GET | Get storage statistics for all containers |
| `/api/media-admin/file/{container}/{filename}` | GET | Get file details |
| `/api/media-admin/file/{container}/{filename}` | DELETE | Delete a file |

### Upload Parameters

When uploading via `/api/media/site-asset`:
- `file` (required): The image file (JPG, JPEG, or PNG only)
- `category` (optional): Folder path within the container (default: 'general')
- `container` (optional): Target container name (default: 'site-assets')

### Configuration

Required environment variables (set in SWA app settings):
- `AZURE_STORAGE_CONNECTION_STRING` - Storage account connection string
- `AZURE_STORAGE_ACCOUNT_NAME` - Storage account name (`stsomostechdev64qb73pzvg`)

### CORS Configuration

The storage account has CORS configured for:
- `https://dev.somos.tech`
- `https://swa-somos-tech-dev-64qb73pzvgekw.azurestaticapps.net`
- `http://localhost:5173` (local development)

---

## Front Door & Static Web App Security Configuration

### Overview

Traffic to the Static Web App is locked down so that only requests coming through Azure Front Door are accepted. Direct access to the default SWA hostname (`happy-stone-*.azurestaticapps.net` for dev, or similar for prod) is blocked.

### Configuration Components

#### 1. Front Door Origin Host Header

The Front Door origin must be configured to forward the **custom domain** as the Host header, not the default SWA hostname:

```bash
# DEV environment
az afd origin update \
  --resource-group rg-somos-tech-dev \
  --profile-name fd-somos-tech \
  --origin-group-name default-origin-group \
  --origin-name default-origin \
  --origin-host-header dev.somos.tech

# PROD environment (when ready)
az afd origin update \
  --resource-group rg-somos-tech-prod \
  --profile-name fd-somos-tech-prod \
  --origin-group-name default-origin-group \
  --origin-name default-origin \
  --origin-host-header somos.tech
```

> **Note**: This change can take 5-15 minutes to propagate across all Front Door edge nodes.

#### 2. Static Web App Configuration (`staticwebapp.config.json`)

The `apps/web/staticwebapp.config.json` file includes these security settings:

```json
{
  "networking": {
    "allowedIpRanges": ["AzureFrontDoor.Backend"]
  },
  "forwardingGateway": {
    "requiredHeaders": {
      "X-Azure-FDID": "<YOUR-FRONT-DOOR-ID>"
    },
    "allowedForwardedHosts": [
      "dev.somos.tech",
      "<YOUR-FRONT-DOOR-ENDPOINT>.azurefd.net"
    ]
  }
}
```

**Key settings:**
- `allowedIpRanges`: Restricts traffic to Azure Front Door IP ranges only
- `requiredHeaders.X-Azure-FDID`: Validates the specific Front Door instance ID
- `allowedForwardedHosts`: Specifies which hostnames are accepted in the `X-Forwarded-Host` header

#### 3. Finding Your Front Door ID

```bash
# Get Front Door ID for DEV
az afd profile show \
  --resource-group rg-somos-tech-dev \
  --profile-name fd-somos-tech \
  --query "frontDoorId" -o tsv

# Get Front Door ID for PROD (when ready)
az afd profile show \
  --resource-group rg-somos-tech-prod \
  --profile-name fd-somos-tech-prod \
  --query "frontDoorId" -o tsv
```

### Production Deployment Checklist

When deploying to production, ensure you:

- [ ] Create/verify Front Door profile exists for prod (`fd-somos-tech-prod`)
- [ ] Configure origin host header to `somos.tech`
- [ ] Get production Front Door ID
- [ ] Update `staticwebapp.config.json` with prod Front Door ID
- [ ] Add production allowed forwarded hosts
- [ ] Deploy and verify direct SWA access is blocked
- [ ] Add production callback URIs to Entra app registrations

### Entra ID App Registration Redirect URIs

Both the admin (AAD) and member (CIAM) app registrations need callback URIs for the custom domains:

**Required redirect URIs:**
```
# DEV
https://dev.somos.tech/.auth/login/aad/callback
https://dev.somos.tech/.auth/login/member/callback

# PROD
https://somos.tech/.auth/login/aad/callback
https://somos.tech/.auth/login/member/callback
https://www.somos.tech/.auth/login/aad/callback
https://www.somos.tech/.auth/login/member/callback
```

### Verifying the Lockdown

```bash
# Should work (through Front Door)
curl -I https://dev.somos.tech/
# Expected: HTTP/2 200

# Should be blocked (direct to SWA)
curl -I https://happy-stone-070acff1e.3.azurestaticapps.net/
# Expected: HTTP/2 403
```

### Troubleshooting

| Issue | Solution |
|-------|----------|
| 403 when accessing via custom domain | Verify Front Door ID matches in `staticwebapp.config.json` |
| 502/503 after origin update | Wait 15 min for propagation; verify SWA has custom domain configured |
| Auth redirects to wrong hostname | Check `allowedForwardedHosts` includes your custom domain |
| Direct SWA access still works | Redeploy SWA to pick up config changes |

