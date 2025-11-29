import { app } from '@azure/functions';
import { getContainer, getDatabaseId } from '../shared/db.js';
import { requireAdmin } from '../shared/authMiddleware.js';
import { successResponse, errorResponse } from '../shared/httpResponse.js';

const ADMIN_USERS_CONTAINER = 'admin-users';
const SECURITY_AUDIT_CONTAINER = 'security-audit';

/**
 * Admin Security Audit API
 * 
 * Provides security monitoring, audit logs, and anomaly detection for admin access.
 * Critical for preventing and detecting unauthorized admin access.
 */

/**
 * Log a security event
 */
async function logSecurityEvent(context, eventType, details) {
    try {
        const container = getContainer(SECURITY_AUDIT_CONTAINER);
        const event = {
            id: `security-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: eventType,
            timestamp: new Date().toISOString(),
            ...details
        };
        await container.items.create(event);
        context.log(`[Security Audit] Event logged: ${eventType}`, JSON.stringify(details));
    } catch (error) {
        // If security-audit container doesn't exist, log to console only
        context.log.warn(`[Security Audit] Could not log to database: ${error.message}`);
        context.log(`[Security Audit] Event: ${eventType}`, JSON.stringify(details));
    }
}

/**
 * Get recent admin access events
 */
async function getRecentAdminAccess(context, hours = 24) {
    try {
        const container = getContainer(SECURITY_AUDIT_CONTAINER);
        const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
        
        const query = {
            query: 'SELECT * FROM c WHERE c.timestamp >= @cutoff ORDER BY c.timestamp DESC',
            parameters: [{ name: '@cutoff', value: cutoffTime }]
        };
        
        const { resources: events } = await container.items.query(query).fetchAll();
        return events;
    } catch (error) {
        context.log.warn(`[Security Audit] Could not fetch events: ${error.message}`);
        return [];
    }
}

/**
 * Check for security anomalies in admin access patterns
 */
async function checkSecurityAnomalies(context) {
    const anomalies = [];
    
    try {
        const adminContainer = getContainer(ADMIN_USERS_CONTAINER);
        
        // Get all admin users
        const { resources: adminUsers } = await adminContainer.items
            .query('SELECT * FROM c')
            .fetchAll();
        
        // Check 1: Admin users without @somos.tech domain (should be rare/none)
        const nonSomosAdmins = adminUsers.filter(u => !u.email?.endsWith('@somos.tech'));
        if (nonSomosAdmins.length > 0) {
            anomalies.push({
                type: 'non_somos_admin',
                severity: 'high',
                title: 'Non-SOMOS.tech Admin Users Detected',
                message: `${nonSomosAdmins.length} admin user(s) don't have @somos.tech email addresses`,
                details: nonSomosAdmins.map(u => ({ email: u.email, createdAt: u.createdAt })),
                recommendation: 'Review and verify these admin accounts are authorized'
            });
        }
        
        // Check 2: Admin users created in the last 24 hours
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const recentAdmins = adminUsers.filter(u => u.createdAt > oneDayAgo);
        if (recentAdmins.length > 0) {
            anomalies.push({
                type: 'recent_admin_created',
                severity: 'medium',
                title: 'New Admin Users Added Recently',
                message: `${recentAdmins.length} admin user(s) created in the last 24 hours`,
                details: recentAdmins.map(u => ({ 
                    email: u.email, 
                    createdAt: u.createdAt,
                    createdBy: u.createdBy || 'unknown'
                })),
                recommendation: 'Verify these admin additions were authorized'
            });
        }
        
        // Check 3: Admin users without a createdBy field (may indicate auto-registration bypass)
        const noCreatedBy = adminUsers.filter(u => !u.createdBy);
        if (noCreatedBy.length > 0) {
            anomalies.push({
                type: 'missing_audit_trail',
                severity: 'high',
                title: 'Admin Users Without Audit Trail',
                message: `${noCreatedBy.length} admin user(s) missing "createdBy" field`,
                details: noCreatedBy.map(u => ({ email: u.email, createdAt: u.createdAt })),
                recommendation: 'These accounts may have been created through a security bypass - investigate immediately'
            });
        }
        
        // Check 4: Admin users with unusual roles
        const unusualRoles = adminUsers.filter(u => {
            const roles = u.roles || [];
            return roles.length > 3 || roles.some(r => !['admin', 'authenticated', 'superadmin', 'moderator'].includes(r));
        });
        if (unusualRoles.length > 0) {
            anomalies.push({
                type: 'unusual_roles',
                severity: 'medium',
                title: 'Admin Users with Unusual Roles',
                message: `${unusualRoles.length} admin user(s) have non-standard role configurations`,
                details: unusualRoles.map(u => ({ email: u.email, roles: u.roles })),
                recommendation: 'Review role assignments for these accounts'
            });
        }
        
        // Check 5: Admin users with status other than 'active'
        const inactiveAdmins = adminUsers.filter(u => u.status && u.status !== 'active');
        if (inactiveAdmins.length > 0) {
            anomalies.push({
                type: 'inactive_admins',
                severity: 'low',
                title: 'Inactive Admin Accounts',
                message: `${inactiveAdmins.length} admin account(s) have non-active status`,
                details: inactiveAdmins.map(u => ({ email: u.email, status: u.status })),
                recommendation: 'Consider removing or re-activating these accounts'
            });
        }
        
        // Check 6: Verify known authorized admins are present
        const authorizedAdmins = ['jcruz@somos.tech', 'fserna@somos.tech'];
        const missingAuthorized = authorizedAdmins.filter(
            email => !adminUsers.some(u => u.email?.toLowerCase() === email.toLowerCase())
        );
        if (missingAuthorized.length > 0) {
            anomalies.push({
                type: 'missing_authorized_admin',
                severity: 'critical',
                title: 'Authorized Admin Missing',
                message: `${missingAuthorized.length} expected admin account(s) not found in database`,
                details: missingAuthorized.map(email => ({ email })),
                recommendation: 'Verify database integrity and restore missing admin accounts'
            });
        }
        
        // Check 7: Look for potential bypassed accounts (created around incident time)
        // The vulnerability was fixed on 2025-01-28, check for suspicious accounts created around then
        const incidentTimeStart = '2025-01-27T00:00:00Z';
        const incidentTimeEnd = '2025-01-29T00:00:00Z';
        const suspiciousAccounts = adminUsers.filter(u => {
            const createdAt = u.createdAt;
            return createdAt >= incidentTimeStart && createdAt <= incidentTimeEnd && !u.createdBy;
        });
        if (suspiciousAccounts.length > 0) {
            anomalies.push({
                type: 'potential_bypass_accounts',
                severity: 'critical',
                title: 'Potential Bypass Accounts Detected',
                message: `${suspiciousAccounts.length} account(s) created during vulnerability window without audit trail`,
                details: suspiciousAccounts.map(u => ({ 
                    email: u.email, 
                    createdAt: u.createdAt,
                    id: u.id
                })),
                recommendation: 'IMMEDIATE ACTION: Remove these accounts if not authorized'
            });
        }
        
    } catch (error) {
        context.log.error('[Security Audit] Error checking anomalies:', error);
        anomalies.push({
            type: 'audit_error',
            severity: 'high',
            title: 'Security Audit Error',
            message: `Could not complete security audit: ${error.message}`,
            recommendation: 'Check database connectivity and permissions'
        });
    }
    
    return anomalies;
}

/**
 * Get admin security summary
 */
async function getSecuritySummary(context) {
    try {
        const adminContainer = getContainer(ADMIN_USERS_CONTAINER);
        
        const { resources: adminUsers } = await adminContainer.items
            .query('SELECT * FROM c')
            .fetchAll();
        
        const now = new Date();
        const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
        const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
        const oneMonthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
        
        return {
            totalAdmins: adminUsers.length,
            activeAdmins: adminUsers.filter(u => !u.status || u.status === 'active').length,
            addedLast24Hours: adminUsers.filter(u => new Date(u.createdAt) >= oneDayAgo).length,
            addedLastWeek: adminUsers.filter(u => new Date(u.createdAt) >= oneWeekAgo).length,
            addedLastMonth: adminUsers.filter(u => new Date(u.createdAt) >= oneMonthAgo).length,
            withAuditTrail: adminUsers.filter(u => u.createdBy).length,
            withoutAuditTrail: adminUsers.filter(u => !u.createdBy).length,
            somostechDomain: adminUsers.filter(u => u.email?.endsWith('@somos.tech')).length,
            otherDomains: adminUsers.filter(u => !u.email?.endsWith('@somos.tech')).length,
            admins: adminUsers.map(u => ({
                email: u.email,
                status: u.status || 'active',
                createdAt: u.createdAt,
                createdBy: u.createdBy || 'unknown (possible bypass)',
                lastLogin: u.lastLogin,
                roles: u.roles
            }))
        };
    } catch (error) {
        context.log.error('[Security Audit] Error getting summary:', error);
        throw error;
    }
}

app.http('adminSecurityAudit', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    route: 'admin/security/{action?}',
    handler: async (request, context) => {
        context.log('[Security Audit] Function invoked');
        
        try {
            const action = request.params.action || 'summary';
            const method = request.method;
            
            // All security endpoints require admin access
            const authResult = await requireAdmin(request);
            if (!authResult.authenticated || !authResult.isAdmin) {
                return errorResponse(authResult.status || 403, authResult.error || 'Admin access required');
            }
            
            // GET: Security summary
            if (method === 'GET' && action === 'summary') {
                const summary = await getSecuritySummary(context);
                return successResponse(summary);
            }
            
            // GET: Check for anomalies
            if (method === 'GET' && action === 'anomalies') {
                const anomalies = await checkSecurityAnomalies(context);
                return successResponse({
                    checked: new Date().toISOString(),
                    anomalyCount: anomalies.length,
                    hasHighSeverity: anomalies.some(a => a.severity === 'high' || a.severity === 'critical'),
                    anomalies
                });
            }
            
            // GET: Recent audit events
            if (method === 'GET' && action === 'events') {
                const url = new URL(request.url);
                const hours = parseInt(url.searchParams.get('hours') || '24', 10);
                const events = await getRecentAdminAccess(context, hours);
                return successResponse(events);
            }
            
            // GET: Full security report
            if (method === 'GET' && action === 'report') {
                const [summary, anomalies, events] = await Promise.all([
                    getSecuritySummary(context),
                    checkSecurityAnomalies(context),
                    getRecentAdminAccess(context, 168) // Last 7 days
                ]);
                
                return successResponse({
                    generatedAt: new Date().toISOString(),
                    summary,
                    anomalies: {
                        count: anomalies.length,
                        hasHighSeverity: anomalies.some(a => a.severity === 'high' || a.severity === 'critical'),
                        items: anomalies
                    },
                    recentEvents: events.slice(0, 100)
                });
            }
            
            // POST: Log security event manually
            if (method === 'POST' && action === 'log') {
                const body = await request.json();
                const { eventType, details } = body;
                
                if (!eventType) {
                    return errorResponse(400, 'eventType is required');
                }
                
                await logSecurityEvent(context, eventType, {
                    ...details,
                    loggedBy: authResult.user?.email || 'unknown'
                });
                
                return successResponse({ message: 'Event logged successfully' });
            }
            
            // POST: Verify admin (checks if an email should have admin access)
            if (method === 'POST' && action === 'verify-admin') {
                const body = await request.json();
                const { email } = body;
                
                if (!email) {
                    return errorResponse(400, 'email is required');
                }
                
                const adminContainer = getContainer(ADMIN_USERS_CONTAINER);
                const query = {
                    query: 'SELECT * FROM c WHERE c.email = @email',
                    parameters: [{ name: '@email', value: email.toLowerCase() }]
                };
                
                const { resources: users } = await adminContainer.items.query(query).fetchAll();
                
                const isAuthorized = users.length > 0 && 
                    (!users[0].status || users[0].status === 'active') &&
                    users[0].roles?.includes('admin');
                
                // Log this verification
                await logSecurityEvent(context, 'admin_verification', {
                    targetEmail: email,
                    isAuthorized,
                    verifiedBy: authResult.user?.email || 'unknown'
                });
                
                return successResponse({
                    email: email.toLowerCase(),
                    isAuthorized,
                    reason: isAuthorized 
                        ? 'User found in admin-users container with active status and admin role'
                        : users.length === 0 
                            ? 'User not found in admin-users container'
                            : users[0].status !== 'active' 
                                ? 'User account is not active'
                                : 'User does not have admin role',
                    userRecord: isAuthorized ? users[0] : null
                });
            }
            
            return errorResponse(400, 'Invalid action');
            
        } catch (error) {
            context.log.error('[Security Audit] ERROR:', error);
            return errorResponse(500, 'Internal server error', error.message);
        }
    }
});

// Export functions for use in other modules
export { logSecurityEvent, checkSecurityAnomalies, getSecuritySummary };
