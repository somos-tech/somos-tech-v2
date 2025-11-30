/**
 * API Health Check Function
 * 
 * Runs daily to verify all 3rd party API integrations are working.
 * Sends alerts to admins if any APIs are down or misconfigured.
 * 
 * Schedule: Daily at 8:00 AM UTC (via Azure Functions Timer Trigger)
 * 
 * Checks:
 * - VirusTotal API (link safety)
 * - Azure Content Safety (AI moderation)
 * - Auth0 Management API (user management)
 * - Azure Communication Services (email)
 * - Azure Cosmos DB (database)
 * - Azure Blob Storage (media)
 * 
 * @module apiHealthCheck
 * @author SOMOS.tech
 */

import { app } from '@azure/functions';
import { getContainer } from '../shared/db.js';
import { successResponse, errorResponse } from '../shared/httpResponse.js';
import { requireAdmin } from '../shared/authMiddleware.js';

// API configuration checks
const API_CHECKS = {
    virustotal: {
        name: 'VirusTotal',
        envVars: ['VIRUSTOTAL_API_KEY'],
        testEndpoint: 'https://www.virustotal.com/api/v3/urls',
        critical: true
    },
    contentSafety: {
        name: 'Azure Content Safety',
        envVars: ['CONTENT_SAFETY_ENDPOINT', 'CONTENT_SAFETY_KEY'],
        critical: true
    },
    auth0: {
        name: 'Auth0 Management API',
        envVars: ['AUTH0_DOMAIN', 'AUTH0_MANAGEMENT_CLIENT_ID', 'AUTH0_MANAGEMENT_CLIENT_SECRET'],
        critical: true
    },
    azureCommunication: {
        name: 'Azure Communication Services',
        envVars: ['AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING'],
        critical: false
    },
    cosmosDB: {
        name: 'Azure Cosmos DB',
        envVars: ['COSMOS_ENDPOINT'],
        critical: true
    },
    azureStorage: {
        name: 'Azure Blob Storage',
        envVars: ['AZURE_STORAGE_CONNECTION_STRING', 'AZURE_STORAGE_ACCOUNT_NAME'],
        requiresAny: true,
        critical: false
    }
};

/**
 * Check if environment variables are configured
 */
function checkEnvVars(config) {
    if (config.requiresAny) {
        return config.envVars.some(v => process.env[v] && process.env[v].length > 0);
    }
    return config.envVars.every(v => process.env[v] && process.env[v].length > 0);
}

/**
 * Test VirusTotal API connectivity
 */
async function testVirusTotal() {
    const apiKey = process.env.VIRUSTOTAL_API_KEY;
    if (!apiKey) return { success: false, error: 'API key not configured' };

    try {
        // Test with a simple quota check endpoint
        const response = await fetch('https://www.virustotal.com/api/v3/users/current', {
            headers: { 'x-apikey': apiKey }
        });
        
        if (response.status === 401) {
            return { success: false, error: 'Invalid API key' };
        }
        if (response.status === 429) {
            return { success: true, warning: 'Rate limited - but API is responding' };
        }
        
        return { success: response.ok, status: response.status };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Test Azure Content Safety API connectivity
 */
async function testContentSafety() {
    const endpoint = process.env.CONTENT_SAFETY_ENDPOINT;
    const key = process.env.CONTENT_SAFETY_KEY;
    
    if (!endpoint || !key) return { success: false, error: 'Endpoint or key not configured' };

    try {
        // Test with a simple health check
        const response = await fetch(`${endpoint}contentsafety/text:analyze?api-version=2023-10-01`, {
            method: 'POST',
            headers: {
                'Ocp-Apim-Subscription-Key': key,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: 'test' })
        });
        
        // 200 or 400 means API is responding (400 = invalid request but API works)
        return { success: response.ok || response.status === 400, status: response.status };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Test Auth0 Management API connectivity
 */
async function testAuth0() {
    const domain = process.env.AUTH0_DOMAIN;
    const clientId = process.env.AUTH0_MANAGEMENT_CLIENT_ID;
    const clientSecret = process.env.AUTH0_MANAGEMENT_CLIENT_SECRET;
    
    if (!domain || !clientId || !clientSecret) {
        return { success: false, error: 'Missing credentials' };
    }

    try {
        const response = await fetch(`https://${domain}/oauth/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                audience: `https://${domain}/api/v2/`,
                grant_type: 'client_credentials'
            })
        });
        
        return { success: response.ok, status: response.status };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Test Cosmos DB connectivity
 */
async function testCosmosDB() {
    try {
        const container = getContainer('users');
        const { resources } = await container.items.query({
            query: 'SELECT TOP 1 c.id FROM c'
        }).fetchAll();
        
        return { success: true, status: 'Connected' };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Run all health checks
 */
async function runHealthChecks() {
    const results = {};
    const timestamp = new Date().toISOString();
    
    for (const [key, config] of Object.entries(API_CHECKS)) {
        const envConfigured = checkEnvVars(config);
        
        if (!envConfigured) {
            results[key] = {
                name: config.name,
                status: 'not_configured',
                configured: false,
                critical: config.critical,
                message: `Missing environment variables: ${config.envVars.join(', ')}`
            };
            continue;
        }

        // Run connectivity tests for specific APIs
        let testResult = { success: true };
        
        switch (key) {
            case 'virustotal':
                testResult = await testVirusTotal();
                break;
            case 'contentSafety':
                testResult = await testContentSafety();
                break;
            case 'auth0':
                testResult = await testAuth0();
                break;
            case 'cosmosDB':
                testResult = await testCosmosDB();
                break;
            default:
                // For other APIs, just check env vars
                testResult = { success: true };
        }

        results[key] = {
            name: config.name,
            status: testResult.success ? 'healthy' : 'unhealthy',
            configured: true,
            critical: config.critical,
            ...testResult
        };
    }

    // Calculate overall health
    const healthyCount = Object.values(results).filter(r => r.status === 'healthy').length;
    const criticalDown = Object.values(results).filter(r => r.critical && r.status === 'unhealthy').length;
    
    return {
        timestamp,
        overallHealth: criticalDown > 0 ? 'critical' : healthyCount === Object.keys(results).length ? 'healthy' : 'degraded',
        healthScore: Math.round((healthyCount / Object.keys(results).length) * 100),
        criticalIssues: criticalDown,
        results
    };
}

/**
 * Store health check result in Cosmos DB
 */
async function storeHealthCheckResult(result) {
    try {
        const container = getContainer('api-health');
        const doc = {
            id: `health-${result.timestamp.split('T')[0]}`,
            partitionKey: 'daily-health',
            ...result,
            createdAt: result.timestamp
        };
        
        await container.items.upsert(doc);
        return true;
    } catch (error) {
        console.error('[HealthCheck] Failed to store result:', error.message);
        return false;
    }
}

/**
 * Store admin alert in Cosmos DB for dashboard display
 */
async function storeAdminAlert(result) {
    try {
        const container = getContainer('admin-alerts');
        
        const failedApis = Object.entries(result.results)
            .filter(([_, r]) => r.status !== 'healthy')
            .map(([key, r]) => ({
                api: r.name,
                status: r.status,
                error: r.error || null,
                critical: r.critical
            }));

        const alert = {
            id: `api-health-alert-${Date.now()}`,
            partitionKey: 'api-health',
            type: 'api_health_failure',
            severity: result.overallHealth === 'critical' ? 'critical' : 'warning',
            title: `API Health Check Failed: ${failedApis.length} API(s) Not Working`,
            message: failedApis.map(a => `${a.api}: ${a.error || a.status}`).join(', '),
            failedApis,
            healthScore: result.healthScore,
            timestamp: result.timestamp,
            acknowledged: false,
            createdAt: new Date().toISOString()
        };

        await container.items.create(alert);
        console.log('[HealthCheck] Admin alert created for dashboard');
        return true;
    } catch (error) {
        console.error('[HealthCheck] Failed to store admin alert:', error.message);
        return false;
    }
}

/**
 * Send alert for critical issues - stores in admin dashboard
 */
async function sendHealthAlert(result) {
    // Only alert if there are issues
    if (result.overallHealth === 'healthy') return;

    const criticalApis = Object.entries(result.results)
        .filter(([_, r]) => r.status !== 'healthy')
        .map(([_, r]) => `${r.name}: ${r.error || r.status}`)
        .join('\n');

    console.error(`[HealthCheck] ALERT:\n${criticalApis}`);
    
    // Store alert for admin dashboard
    await storeAdminAlert(result);
}

/**
 * Weekly health check - runs Monday at 8:00 AM UTC
 * Triggers admin dashboard alerts if any APIs fail
 */
app.timer('apiHealthCheckWeekly', {
    schedule: '0 0 8 * * 1', // Every Monday at 8:00 AM UTC
    handler: async (myTimer, context) => {
        context.log('[HealthCheck] Running weekly Monday health check');
        
        try {
            const result = await runHealthChecks();
            
            context.log(`[HealthCheck] Overall health: ${result.overallHealth} (${result.healthScore}%)`);
            
            // Store result for historical tracking
            await storeHealthCheckResult(result);
            
            // Send alerts if any API is not healthy
            await sendHealthAlert(result);
            
            // Log any issues
            const issues = Object.entries(result.results)
                .filter(([_, r]) => r.status !== 'healthy')
                .map(([key, r]) => `${r.name}: ${r.status}`);
            
            if (issues.length > 0) {
                context.log(`[HealthCheck] Issues found: ${issues.join(', ')}`);
            } else {
                context.log('[HealthCheck] All APIs healthy!');
            }
            
        } catch (error) {
            context.error('[HealthCheck] Error running weekly health check:', error);
        }
    }
});

/**
 * Daily health check - runs at 8:00 AM UTC (silent unless critical)
 */
app.timer('apiHealthCheckDaily', {
    schedule: '0 0 8 * * *', // Every day at 8:00 AM UTC
    handler: async (myTimer, context) => {
        context.log('[HealthCheck] Running daily health check');
        
        try {
            const result = await runHealthChecks();
            
            context.log(`[HealthCheck] Overall health: ${result.overallHealth} (${result.healthScore}%)`);
            
            // Store result for historical tracking
            await storeHealthCheckResult(result);
            
            // Only send alerts if CRITICAL (not for warnings on daily)
            if (result.overallHealth === 'critical') {
                await sendHealthAlert(result);
            }
            
            // Log any issues
            const issues = Object.entries(result.results)
                .filter(([_, r]) => r.status !== 'healthy')
                .map(([key, r]) => `${r.name}: ${r.status}`);
            
            if (issues.length > 0) {
                context.log(`[HealthCheck] Issues found: ${issues.join(', ')}`);
            }
            
        } catch (error) {
            context.error('[HealthCheck] Error running health check:', error);
        }
    }
});

/**
 * HTTP endpoint to manually trigger health check (admin only)
 */
app.http('apiHealthCheck', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    route: 'api-health-check',
    handler: async (request, context) => {
        context.log('[HealthCheck] Manual health check requested');

        try {
            // Require admin access
            const authResult = await requireAdmin(request);
            if (!authResult.authenticated || !authResult.isAdmin) {
                return errorResponse(403, 'Admin access required');
            }

            const result = await runHealthChecks();
            
            // Store result
            await storeHealthCheckResult(result);
            
            return successResponse(result);

        } catch (error) {
            context.error('[HealthCheck] Error:', error);
            return errorResponse(500, 'Failed to run health check', error.message);
        }
    }
});

/**
 * Get health check history
 */
app.http('apiHealthHistory', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'api-health-history',
    handler: async (request, context) => {
        context.log('[HealthCheck] Getting health history');

        try {
            // Require admin access
            const authResult = await requireAdmin(request);
            if (!authResult.authenticated || !authResult.isAdmin) {
                return errorResponse(403, 'Admin access required');
            }

            const container = getContainer('api-health');
            const { resources } = await container.items.query({
                query: 'SELECT * FROM c WHERE c.partitionKey = @pk ORDER BY c.timestamp DESC OFFSET 0 LIMIT 30',
                parameters: [{ name: '@pk', value: 'daily-health' }]
            }).fetchAll();

            return successResponse({
                count: resources.length,
                history: resources
            });

        } catch (error) {
            context.error('[HealthCheck] Error getting history:', error);
            return errorResponse(500, 'Failed to get health history', error.message);
        }
    }
});

/**
 * Get admin alerts for dashboard
 */
app.http('getAdminAlerts', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'admin-alerts',
    handler: async (request, context) => {
        context.log('[AdminAlerts] Getting alerts');

        try {
            // Require admin access
            const authResult = await requireAdmin(request);
            if (!authResult.authenticated || !authResult.isAdmin) {
                return errorResponse(403, 'Admin access required');
            }

            const url = new URL(request.url);
            const unacknowledgedOnly = url.searchParams.get('unacknowledged') === 'true';

            const container = getContainer('admin-alerts');
            const query = unacknowledgedOnly
                ? 'SELECT * FROM c WHERE c.acknowledged = false ORDER BY c.createdAt DESC OFFSET 0 LIMIT 50'
                : 'SELECT * FROM c ORDER BY c.createdAt DESC OFFSET 0 LIMIT 50';
            
            const { resources } = await container.items.query(query).fetchAll();

            return successResponse({
                count: resources.length,
                alerts: resources
            });

        } catch (error) {
            context.error('[AdminAlerts] Error getting alerts:', error);
            return errorResponse(500, 'Failed to get alerts', error.message);
        }
    }
});

/**
 * Acknowledge an admin alert
 */
app.http('acknowledgeAdminAlert', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'admin-alerts/{alertId}/acknowledge',
    handler: async (request, context) => {
        const alertId = request.params.alertId;
        context.log(`[AdminAlerts] Acknowledging alert: ${alertId}`);

        try {
            // Require admin access
            const authResult = await requireAdmin(request);
            if (!authResult.authenticated || !authResult.isAdmin) {
                return errorResponse(403, 'Admin access required');
            }

            const container = getContainer('admin-alerts');
            
            // Find and update the alert
            const { resources } = await container.items.query({
                query: 'SELECT * FROM c WHERE c.id = @id',
                parameters: [{ name: '@id', value: alertId }]
            }).fetchAll();

            if (resources.length === 0) {
                return errorResponse(404, 'Alert not found');
            }

            const alert = resources[0];
            alert.acknowledged = true;
            alert.acknowledgedAt = new Date().toISOString();
            alert.acknowledgedBy = authResult.user?.email || 'admin';

            await container.item(alertId, alert.partitionKey).replace(alert);

            return successResponse({ message: 'Alert acknowledged', alert });

        } catch (error) {
            context.error('[AdminAlerts] Error acknowledging alert:', error);
            return errorResponse(500, 'Failed to acknowledge alert', error.message);
        }
    }
});

export { runHealthChecks };
