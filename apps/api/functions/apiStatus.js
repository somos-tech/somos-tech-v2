/**
 * API Status & Dependencies Tracker
 * 
 * Monitors the health and status of all 3rd party API integrations:
 * - VirusTotal (link safety scanning)
 * - Azure Content Safety (AI moderation)
 * - Azure OpenAI (AI agents)
 * - Auth0 Management API (user management)
 * - Azure Communication Services (email)
 * - Azure Blob Storage (media storage)
 * - Azure Cosmos DB (database)
 * - Microsoft Graph API (Azure AD)
 * 
 * Provides admins with:
 * - API configuration status
 * - Rate limit information
 * - Key expiration dates (if applicable)
 * - Last successful call timestamps
 * 
 * @module apiStatus
 * @author SOMOS.tech
 */

import { app } from '@azure/functions';
import { requireAdmin } from '../shared/authMiddleware.js';
import { getContainer } from '../shared/db.js';
import { successResponse, errorResponse } from '../shared/httpResponse.js';
import { getAllApiStats } from '../shared/services/apiTrackingService.js';

/**
 * API Limit Information
 * Contains known limits for various APIs
 */
const API_LIMITS = {
    virustotal: {
        name: 'VirusTotal',
        description: 'URL/Link safety scanning for malicious content detection',
        freeLimit: '500 requests/day, 4 requests/minute',
        premiumLimit: '30,000+ requests/day',
        documentation: 'https://developers.virustotal.com/reference/overview',
        keyExpiry: null, // API keys don't expire but can be revoked
        criticalFor: ['Link Safety', 'Tier 2 Moderation']
    },
    contentSafety: {
        name: 'Azure Content Safety',
        description: 'AI-powered content moderation for hate, violence, sexual, self-harm',
        freeLimit: '5,000 requests/month (F0 tier)',
        standardLimit: '1,000 requests/minute (S0 tier)',
        documentation: 'https://learn.microsoft.com/azure/ai-services/content-safety/',
        keyExpiry: null, // Azure keys are managed via Azure Portal
        criticalFor: ['Content Moderation', 'Tier 3 AI Analysis', 'Image Safety']
    },
    azureOpenAI: {
        name: 'Azure OpenAI',
        description: 'AI agents for event planning, social media, and venue recommendations',
        freeLimit: 'Based on token quota (varies by model)',
        standardLimit: 'Pay-as-you-go with TPM limits',
        documentation: 'https://learn.microsoft.com/azure/ai-services/openai/',
        keyExpiry: null,
        criticalFor: ['Event Agent', 'Social Media Agent', 'Venue Agent']
    },
    auth0: {
        name: 'Auth0 Management API',
        description: 'User authentication and management for member accounts',
        freeLimit: '1,000 Machine-to-Machine tokens/month',
        paidLimit: 'Based on plan tier',
        documentation: 'https://auth0.com/docs/api/management/v2',
        keyExpiry: null, // M2M credentials don't expire
        criticalFor: ['User Authentication', 'Member Management', 'User Lookup']
    },
    azureCommunication: {
        name: 'Azure Communication Services',
        description: 'Email delivery for notifications, announcements, and newsletters',
        freeLimit: '100 emails/day (first 100 free)',
        standardLimit: 'Pay-as-you-go (~$0.00025/email)',
        documentation: 'https://learn.microsoft.com/azure/communication-services/',
        keyExpiry: null,
        criticalFor: ['Email Notifications', 'Announcements', 'Password Resets']
    },
    azureStorage: {
        name: 'Azure Blob Storage',
        description: 'Media storage for images, avatars, and documents',
        freeLimit: 'None - pay for what you use',
        standardLimit: 'Virtually unlimited',
        documentation: 'https://learn.microsoft.com/azure/storage/blobs/',
        keyExpiry: null,
        criticalFor: ['Profile Images', 'Event Images', 'Media Uploads']
    },
    cosmosDB: {
        name: 'Azure Cosmos DB',
        description: 'Primary database for all application data',
        freeLimit: '1000 RU/s, 25GB storage (free tier)',
        standardLimit: 'Based on provisioned RU/s',
        documentation: 'https://learn.microsoft.com/azure/cosmos-db/',
        keyExpiry: null,
        criticalFor: ['All Data Storage', 'Users', 'Events', 'Messages']
    },
    microsoftGraph: {
        name: 'Microsoft Graph API',
        description: 'Azure AD integration for admin authentication',
        freeLimit: 'Based on Azure AD tier',
        standardLimit: 'Varies by endpoint',
        documentation: 'https://learn.microsoft.com/graph/',
        keyExpiry: null, // Client secrets expire based on configuration
        criticalFor: ['Admin Authentication', 'Azure AD Integration']
    }
};

/**
 * Check if an environment variable is configured
 */
function isConfigured(envVar) {
    const value = process.env[envVar];
    return !!value && value.length > 0 && value !== 'undefined';
}

/**
 * Get status container for tracking API usage
 */
function getStatusContainer() {
    try {
        return getContainer('api-status');
    } catch (e) {
        console.log('[APIStatus] api-status container not available');
        return null;
    }
}

/**
 * Get all API statuses
 */
async function getAPIStatuses() {
    const statuses = {};
    
    // VirusTotal
    statuses.virustotal = {
        ...API_LIMITS.virustotal,
        configured: isConfigured('VIRUSTOTAL_API_KEY'),
        status: isConfigured('VIRUSTOTAL_API_KEY') ? 'active' : 'not_configured',
        envVar: 'VIRUSTOTAL_API_KEY',
        keyPreview: isConfigured('VIRUSTOTAL_API_KEY') 
            ? `${process.env.VIRUSTOTAL_API_KEY.substring(0, 4)}...${process.env.VIRUSTOTAL_API_KEY.slice(-4)}`
            : null
    };

    // Azure Content Safety
    statuses.contentSafety = {
        ...API_LIMITS.contentSafety,
        configured: isConfigured('CONTENT_SAFETY_ENDPOINT') && isConfigured('CONTENT_SAFETY_KEY'),
        status: (isConfigured('CONTENT_SAFETY_ENDPOINT') && isConfigured('CONTENT_SAFETY_KEY')) ? 'active' : 'not_configured',
        envVars: ['CONTENT_SAFETY_ENDPOINT', 'CONTENT_SAFETY_KEY'],
        endpointPreview: isConfigured('CONTENT_SAFETY_ENDPOINT')
            ? process.env.CONTENT_SAFETY_ENDPOINT.split('.')[0] + '...'
            : null
    };

    // Azure OpenAI
    statuses.azureOpenAI = {
        ...API_LIMITS.azureOpenAI,
        configured: isConfigured('AZURE_OPENAI_ENDPOINT'),
        status: isConfigured('AZURE_OPENAI_ENDPOINT') ? 'active' : 'not_configured',
        envVars: ['AZURE_OPENAI_ENDPOINT', 'AZURE_OPENAI_API_KEY'],
        endpointPreview: isConfigured('AZURE_OPENAI_ENDPOINT')
            ? process.env.AZURE_OPENAI_ENDPOINT.split('/')[2]
            : null,
        agents: {
            eventAgent: isConfigured('AZURE_OPENAI_AGENT_ID') ? 'configured' : 'not_configured',
            socialMediaAgent: isConfigured('SOCIAL_MEDIA_AGENT_ID') ? 'configured' : 'not_configured',
            venueAgent: isConfigured('VENUE_AGENT_ID') ? 'configured' : 'not_configured'
        }
    };

    // Auth0 Management API
    statuses.auth0 = {
        ...API_LIMITS.auth0,
        configured: isConfigured('AUTH0_DOMAIN') && isConfigured('AUTH0_MANAGEMENT_CLIENT_ID') && isConfigured('AUTH0_MANAGEMENT_CLIENT_SECRET'),
        status: (isConfigured('AUTH0_DOMAIN') && isConfigured('AUTH0_MANAGEMENT_CLIENT_ID') && isConfigured('AUTH0_MANAGEMENT_CLIENT_SECRET')) ? 'active' : 'partial',
        envVars: ['AUTH0_DOMAIN', 'AUTH0_MANAGEMENT_CLIENT_ID', 'AUTH0_MANAGEMENT_CLIENT_SECRET'],
        domain: process.env.AUTH0_DOMAIN || null,
        clientIdConfigured: isConfigured('AUTH0_MANAGEMENT_CLIENT_ID'),
        clientSecretConfigured: isConfigured('AUTH0_MANAGEMENT_CLIENT_SECRET')
    };

    // Azure Communication Services
    statuses.azureCommunication = {
        ...API_LIMITS.azureCommunication,
        configured: isConfigured('AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING'),
        status: isConfigured('AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING') ? 'active' : 'not_configured',
        envVars: ['AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING', 'EMAIL_SENDER_ADDRESS'],
        senderAddress: process.env.EMAIL_SENDER_ADDRESS || 'Not configured'
    };

    // Azure Blob Storage
    statuses.azureStorage = {
        ...API_LIMITS.azureStorage,
        configured: isConfigured('AZURE_STORAGE_CONNECTION_STRING') || isConfigured('AZURE_STORAGE_ACCOUNT_NAME'),
        status: (isConfigured('AZURE_STORAGE_CONNECTION_STRING') || isConfigured('AZURE_STORAGE_ACCOUNT_NAME')) ? 'active' : 'not_configured',
        envVars: ['AZURE_STORAGE_CONNECTION_STRING', 'AZURE_STORAGE_ACCOUNT_NAME'],
        accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME || null
    };

    // Cosmos DB
    statuses.cosmosDB = {
        ...API_LIMITS.cosmosDB,
        configured: isConfigured('COSMOS_ENDPOINT'),
        status: isConfigured('COSMOS_ENDPOINT') ? 'active' : 'not_configured',
        envVars: ['COSMOS_ENDPOINT', 'COSMOS_DATABASE_NAME'],
        database: process.env.COSMOS_DATABASE_NAME || 'somostech',
        endpointPreview: isConfigured('COSMOS_ENDPOINT')
            ? process.env.COSMOS_ENDPOINT.split('.')[0].replace('https://', '') + '...'
            : null
    };

    // Microsoft Graph API
    statuses.microsoftGraph = {
        ...API_LIMITS.microsoftGraph,
        configured: isConfigured('AZURE_CLIENT_ID') && isConfigured('AZURE_CLIENT_SECRET') && isConfigured('AZURE_TENANT_ID'),
        status: (isConfigured('AZURE_CLIENT_ID') && isConfigured('AZURE_CLIENT_SECRET') && isConfigured('AZURE_TENANT_ID')) ? 'active' : 'not_configured',
        envVars: ['AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET', 'AZURE_TENANT_ID'],
        tenantConfigured: isConfigured('AZURE_TENANT_ID')
    };

    return statuses;
}

/**
 * Get summary statistics
 */
function getSummary(statuses) {
    const apis = Object.values(statuses);
    const configured = apis.filter(api => api.configured).length;
    const notConfigured = apis.filter(api => !api.configured).length;
    const partial = apis.filter(api => api.status === 'partial').length;
    
    // Identify critical missing APIs
    const criticalMissing = [];
    if (!statuses.cosmosDB.configured) criticalMissing.push('Cosmos DB (Database)');
    if (!statuses.auth0.configured) criticalMissing.push('Auth0 (User Authentication)');
    if (!statuses.virustotal.configured) criticalMissing.push('VirusTotal (Link Safety)');
    if (!statuses.contentSafety.configured) criticalMissing.push('Content Safety (AI Moderation)');

    return {
        total: apis.length,
        configured,
        notConfigured,
        partial,
        criticalMissing,
        healthScore: Math.round((configured / apis.length) * 100)
    };
}

/**
 * API Status Handler
 */
app.http('apiStatus', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'api-status',
    handler: async (request, context) => {
        context.log('[APIStatus] Checking API status');

        try {
            // Require admin access
            const authResult = await requireAdmin(request);
            if (!authResult.authenticated || !authResult.isAdmin) {
                return errorResponse(403, 'Admin access required');
            }

            const statuses = await getAPIStatuses();
            const summary = getSummary(statuses);

            return successResponse({
                timestamp: new Date().toISOString(),
                environment: process.env.NODE_ENV || 'production',
                summary,
                apis: statuses,
                recommendations: getRecommendations(statuses)
            });

        } catch (error) {
            context.error('[APIStatus] Error:', error);
            return errorResponse(500, 'Failed to get API status', error.message);
        }
    }
});

/**
 * Get recommendations based on current status
 */
function getRecommendations(statuses) {
    const recommendations = [];

    if (!statuses.virustotal.configured) {
        recommendations.push({
            priority: 'high',
            api: 'VirusTotal',
            message: 'Configure VirusTotal API key to enable link safety scanning. Free tier allows 500 requests/day.',
            action: 'Add VIRUSTOTAL_API_KEY environment variable'
        });
    }

    if (!statuses.contentSafety.configured) {
        recommendations.push({
            priority: 'high',
            api: 'Azure Content Safety',
            message: 'Configure Azure Content Safety for AI-powered content moderation.',
            action: 'Add CONTENT_SAFETY_ENDPOINT and CONTENT_SAFETY_KEY environment variables'
        });
    }

    if (!statuses.auth0.configured || statuses.auth0.status === 'partial') {
        recommendations.push({
            priority: 'critical',
            api: 'Auth0',
            message: 'Auth0 Management API is not fully configured. User management features may not work.',
            action: 'Verify AUTH0_DOMAIN, AUTH0_MANAGEMENT_CLIENT_ID, and AUTH0_MANAGEMENT_CLIENT_SECRET are set'
        });
    }

    if (!statuses.azureCommunication.configured) {
        recommendations.push({
            priority: 'medium',
            api: 'Azure Communication Services',
            message: 'Email notifications are not configured. Announcements and alerts will not be sent.',
            action: 'Add AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING environment variable'
        });
    }

    if (!statuses.microsoftGraph.configured) {
        recommendations.push({
            priority: 'low',
            api: 'Microsoft Graph',
            message: 'Microsoft Graph API is not configured. Admin Azure AD integration is disabled.',
            action: 'Add AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, and AZURE_TENANT_ID environment variables'
        });
    }

    return recommendations;
}

/**
 * API Usage Statistics Handler
 * Returns call counts for 3rd party APIs (VirusTotal, Auth0)
 */
app.http('apiUsageStats', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'api-usage-stats',
    handler: async (request, context) => {
        context.log('[APIUsageStats] Getting API usage statistics');

        try {
            // Require admin access
            const authResult = await requireAdmin(request);
            if (!authResult.authenticated || !authResult.isAdmin) {
                return errorResponse(403, 'Admin access required');
            }

            const usageStats = await getAllApiStats();

            // Add rate limit context
            const limits = {
                virustotal: {
                    dailyLimit: 500,
                    minuteLimit: 4,
                    tier: 'free',
                    resetTime: 'Daily at midnight UTC'
                },
                auth0: {
                    monthlyLimit: 1000,
                    tier: 'free',
                    limitType: 'Machine-to-Machine tokens',
                    resetTime: 'Monthly billing cycle'
                },
                'content-safety': {
                    monthlyLimit: 5000,
                    tier: 'F0 (Free)',
                    limitType: 'Transactions per month',
                    resetTime: 'Monthly billing cycle',
                    region: 'eastus2'
                }
            };

            return successResponse({
                timestamp: new Date().toISOString(),
                usage: usageStats,
                limits,
                warnings: generateUsageWarnings(usageStats, limits)
            });

        } catch (error) {
            context.error('[APIUsageStats] Error:', error);
            return errorResponse(500, 'Failed to get API usage statistics', error.message);
        }
    }
});

/**
 * Generate warnings if usage is approaching limits
 */
function generateUsageWarnings(usage, limits) {
    const warnings = [];

    // Check VirusTotal daily limit
    if (usage.virustotal?.today?.totalCalls > 0) {
        const vtUsage = usage.virustotal.today.totalCalls;
        const vtLimit = limits.virustotal.dailyLimit;
        const vtPercent = (vtUsage / vtLimit) * 100;

        if (vtPercent >= 90) {
            warnings.push({
                api: 'VirusTotal',
                severity: 'critical',
                message: `Daily limit almost reached: ${vtUsage}/${vtLimit} (${vtPercent.toFixed(1)}%)`,
                recommendation: 'Consider upgrading to premium tier or reducing link scanning'
            });
        } else if (vtPercent >= 70) {
            warnings.push({
                api: 'VirusTotal',
                severity: 'warning',
                message: `High daily usage: ${vtUsage}/${vtLimit} (${vtPercent.toFixed(1)}%)`,
                recommendation: 'Monitor usage to avoid hitting rate limits'
            });
        }
    }

    // Check Auth0 monthly usage (approximate based on 30-day data)
    if (usage.auth0?.last30Days?.totalCalls > 0) {
        const auth0Usage = usage.auth0.last30Days.totalCalls;
        const auth0Limit = limits.auth0.monthlyLimit;
        const auth0Percent = (auth0Usage / auth0Limit) * 100;

        if (auth0Percent >= 90) {
            warnings.push({
                api: 'Auth0',
                severity: 'critical',
                message: `Monthly M2M token limit almost reached: ${auth0Usage}/${auth0Limit} (${auth0Percent.toFixed(1)}%)`,
                recommendation: 'Consider caching tokens longer or upgrading Auth0 plan'
            });
        } else if (auth0Percent >= 70) {
            warnings.push({
                api: 'Auth0',
                severity: 'warning',
                message: `High monthly M2M token usage: ${auth0Usage}/${auth0Limit} (${auth0Percent.toFixed(1)}%)`,
                recommendation: 'Review token usage patterns'
            });
        }
    }

    // Check Content Safety monthly usage
    if (usage['content-safety']?.last30Days?.totalCalls > 0) {
        const csUsage = usage['content-safety'].last30Days.totalCalls;
        const csLimit = limits['content-safety']?.monthlyLimit || 5000;
        const csPercent = (csUsage / csLimit) * 100;

        if (csPercent >= 90) {
            warnings.push({
                api: 'Azure Content Safety',
                severity: 'critical',
                message: `Monthly limit almost reached: ${csUsage}/${csLimit} (${csPercent.toFixed(1)}%)`,
                recommendation: 'Consider upgrading from F0 free tier to S0 standard tier'
            });
        } else if (csPercent >= 70) {
            warnings.push({
                api: 'Azure Content Safety',
                severity: 'warning',
                message: `High monthly usage: ${csUsage}/${csLimit} (${csPercent.toFixed(1)}%)`,
                recommendation: 'Monitor usage to avoid hitting free tier limits'
            });
        }
    }

    return warnings;
}

export default { getAPIStatuses, getSummary };
