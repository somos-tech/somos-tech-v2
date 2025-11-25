# Archived Documentation

This directory contains historical documentation, debugging notes, and deprecated files that are kept for reference but are no longer actively maintained.

## 📦 What's in the Archive

### Debugging & Investigation Notes

Historical debugging sessions and issue investigations:

- **ADMIN_ACCESS_DEBUG.md** - Admin access debugging (superseded by current auth system)
- **ADMIN_ENDPOINT_404_INVESTIGATION.md** - Route conflict investigation and resolution
- **AUTH_DEBUG_FINDINGS.md** - Authentication debugging findings (November 2025)
- **deployment-notes-cosmos-debug.md** - Cosmos DB connection debugging

### Deployment Notes

Historical deployment debugging sessions:

- **deployment-notes-admin-fix.md** - Admin API route fixes (Part 1)
- **deployment-notes-admin-fix-2.md** - Centralized database connection (Part 2)
- **deployment-notes-admin-fix-3.md** - Error response handler polymorphism (Part 3)
- **deployment-notes-admin-fix-4.md** - Final admin API fixes summary
- **deployment-notes-admin-fix-5.md** - Additional admin fixes
- **deployment-notes-admin-fix-6.md** - Final deployment fixes
- **deployment-notes-admin-fix-6-update.md** - Deployment automation updates
- **deployment-summary-final.md** - Final deployment summary
- **deployment-summary-frontdoor.md** - Azure Front Door deployment summary

### Documentation Audit

- **DOCUMENTATION_AUDIT.md** - Comprehensive documentation review (November 9, 2025)
  - Identified outdated docs
  - Recommended consolidation
  - Led to the current docs/ structure

## 🔍 Why These Files Are Archived

These files were created during active development, debugging, and deployment sessions. They document:

- **Problem-solving processes** - How issues were identified and resolved
- **Historical decisions** - Why certain approaches were taken
- **Deployment iterations** - Multiple attempts to fix specific issues
- **Documentation evolution** - How the documentation structure improved

While these files are no longer current, they provide valuable historical context and may be useful for:

- Understanding past architectural decisions
- Debugging similar issues in the future
- Learning from previous problem-solving approaches
- Maintaining institutional knowledge

## 📌 Current Documentation

For current, actively maintained documentation, see:

- **[Documentation Index](../README.md)** - Complete documentation guide
- **[Deployment Guide](../deployment/DEPLOYMENT_GUIDE.md)** - Current deployment procedures
- **[Dual Auth Setup](../guides/DUAL_AUTH_SETUP.md)** - Current authentication system
- **[Security Documentation](../security/)** - Active security docs

## ⚠️ Important Notes

### Do Not Use for Current Implementation

The archived files may contain:
- Outdated configuration examples
- Deprecated authentication setups
- Superseded deployment procedures
- Resolved debugging approaches

**Always refer to the current documentation in the main docs/ directory.**

### Useful for Historical Context

These files ARE useful for:
- Understanding why the current system works the way it does
- Learning how specific bugs were fixed
- Seeing the evolution of the authentication system
- Reference when encountering similar issues

## 📅 Archive Date

Most files archived: November 2025

## 🗑️ Cleanup Policy

Archived files may be permanently deleted after:
- 1 year of no reference or use
- Major version releases that make them completely obsolete
- Confirmation that no institutional knowledge would be lost

---

**Note**: If you find yourself frequently referencing an archived file for current development, it may indicate that:
1. The current documentation is incomplete
2. The archived information should be integrated into current docs
3. The issue documented is recurring and needs a permanent solution

In such cases, please update the current documentation or create an issue to address the gap.
