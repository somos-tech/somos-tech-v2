# Documentation Index

Welcome to the Somos Tech v2 documentation. This directory contains all technical documentation organized by category.

## 📚 Quick Links

- **[Main README](../README.md)** - Start here for project overview and quick start
- **[Deployment Guide](deployment/DEPLOYMENT_GUIDE.md)** - Production deployment procedures
- **[Dual Authentication Setup](guides/DUAL_AUTH_SETUP.md)** - Configure authentication
- **[Security Documentation](security/)** - Security reviews and best practices

---

## 📖 Documentation Structure

### Deployment Documentation
Production deployment, infrastructure, and secrets management.

- **[Deployment Guide](deployment/DEPLOYMENT_GUIDE.md)** - Complete deployment procedures with Front Door and WAF
- **[Deployment Instructions](deployment/DEPLOYMENT_INSTRUCTIONS.md)** - Quick reference for deployments
- **[GitHub Secrets Setup](deployment/GITHUB_SECRETS_SETUP.md)** - Required secrets configuration
- **[Admin Users Deployment](deployment/DEPLOYMENT_ADMIN_USERS.md)** - Deploying admin user management

### User Guides
Feature implementation guides and setup instructions.

- **[Dual Authentication Setup](guides/DUAL_AUTH_SETUP.md)** - ⭐ Current auth system (Admin + Member)
- **[User Management Guide](guides/USER_MANAGEMENT_GUIDE.md)** - User profile and management system
- **[Notifications Guide](guides/NOTIFICATIONS_GUIDE.md)** - Notification system implementation
- **[Admin Users Implementation](guides/ADMIN_USERS_IMPLEMENTATION.md)** - Admin user features
- **[Authentication Setup](guides/AUTHENTICATION_SETUP.md)** - ⚠️ Legacy single auth (use DUAL_AUTH_SETUP.md instead)

### Security Documentation
Security reviews, audits, and best practices.

- **[Security Review](security/SECURITY_REVIEW.md)** - Security audit findings and fixes
- **[Security Summary](security/SECURITY_SUMMARY.md)** - Security overview and status

### Archive
Historical documentation, debugging notes, and deprecated files.

- **[Admin Access Debug](archive/ADMIN_ACCESS_DEBUG.md)** - Historical admin access debugging
- **[Admin Endpoint 404 Investigation](archive/ADMIN_ENDPOINT_404_INVESTIGATION.md)** - Route conflict investigation
- **[Auth Debug Findings](archive/AUTH_DEBUG_FINDINGS.md)** - Authentication debugging notes
- **[Documentation Audit](archive/DOCUMENTATION_AUDIT.md)** - Documentation review (Nov 2025)
- **Deployment Notes** - Various deployment debugging sessions (admin-fix, cosmos-debug, etc.)

---

## 🚀 Getting Started

### For New Developers

1. Read the **[Main README](../README.md)** for project overview
2. Set up **[GitHub Secrets](deployment/GITHUB_SECRETS_SETUP.md)**
3. Configure **[Dual Authentication](guides/DUAL_AUTH_SETUP.md)**
4. Review **[Security Guidelines](security/SECURITY_REVIEW.md)**

### For Deployers

1. Review **[Deployment Guide](deployment/DEPLOYMENT_GUIDE.md)**
2. Ensure **[GitHub Secrets](deployment/GITHUB_SECRETS_SETUP.md)** are configured
3. Follow deployment checklist
4. Verify Front Door and WAF configuration

### For Administrators

1. **[Admin Users Implementation](guides/ADMIN_USERS_IMPLEMENTATION.md)** - Understanding admin features
2. **[User Management Guide](guides/USER_MANAGEMENT_GUIDE.md)** - Managing users
3. **[Deployment Admin Users](deployment/DEPLOYMENT_ADMIN_USERS.md)** - Admin deployment steps

---

## 📝 Documentation Guidelines

### When to Update Documentation

- After adding new features
- When changing deployment procedures
- After security reviews
- When configuration changes

### Documentation Best Practices

1. **Keep it current** - Update docs with code changes
2. **Be specific** - Include exact commands and paths
3. **Add examples** - Show real-world usage
4. **Cross-reference** - Link to related documentation
5. **Archive old docs** - Move outdated files to archive/

### File Organization

```
docs/
├── README.md                    # This file - documentation index
├── deployment/                  # Deployment and infrastructure docs
│   ├── DEPLOYMENT_GUIDE.md
│   ├── DEPLOYMENT_INSTRUCTIONS.md
│   ├── GITHUB_SECRETS_SETUP.md
│   └── DEPLOYMENT_ADMIN_USERS.md
├── guides/                      # Feature and setup guides
│   ├── DUAL_AUTH_SETUP.md      # ⭐ Current auth system
│   ├── USER_MANAGEMENT_GUIDE.md
│   ├── NOTIFICATIONS_GUIDE.md
│   ├── ADMIN_USERS_IMPLEMENTATION.md
│   └── AUTHENTICATION_SETUP.md # ⚠️ Legacy (deprecated)
├── security/                    # Security documentation
│   ├── SECURITY_REVIEW.md
│   └── SECURITY_SUMMARY.md
└── archive/                     # Historical/deprecated docs
    ├── ADMIN_ACCESS_DEBUG.md
    ├── AUTH_DEBUG_FINDINGS.md
    ├── deployment-notes-*.md
    └── ...
```

---

## 🔍 Finding Documentation

### By Topic

- **Authentication**: See [guides/DUAL_AUTH_SETUP.md](guides/DUAL_AUTH_SETUP.md)
- **Deployment**: See [deployment/DEPLOYMENT_GUIDE.md](deployment/DEPLOYMENT_GUIDE.md)
- **Security**: See [security/](security/)
- **User Management**: See [guides/USER_MANAGEMENT_GUIDE.md](guides/USER_MANAGEMENT_GUIDE.md)
- **Notifications**: See [guides/NOTIFICATIONS_GUIDE.md](guides/NOTIFICATIONS_GUIDE.md)

### By Role

- **Developers**: [Main README](../README.md), [guides/](guides/)
- **DevOps**: [deployment/](deployment/)
- **Security**: [security/](security/)
- **Administrators**: [guides/ADMIN_USERS_IMPLEMENTATION.md](guides/ADMIN_USERS_IMPLEMENTATION.md)

---

## 📞 Support

For questions or issues:
- Check Application Insights logs
- Review relevant documentation section
- Contact the development team

---

**Last Updated**: November 2025  
**Documentation Version**: 2.0
