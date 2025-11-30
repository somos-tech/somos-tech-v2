/**
 * API Call Tracking Service
 * 
 * Tracks usage statistics for 3rd party APIs (non-Microsoft):
 * - VirusTotal: URL/link safety scanning
 * - Auth0: User authentication management
 * 
 * Stores call counts in Cosmos DB for admin monitoring.
 * Helps admins understand API usage against rate limits.
 * 
 * @module apiTrackingService
 * @author SOMOS.tech
 */

import { getContainer } from '../db.js';

// Container for API tracking data
const TRACKING_CONTAINER = 'api-tracking';

/**
 * Get or create the API tracking container
 */
function getTrackingContainer() {
    try {
        return getContainer(TRACKING_CONTAINER);
    } catch (e) {
        console.log('[APITracking] Tracking container not available:', e.message);
        return null;
    }
}

/**
 * Get current date key in format YYYY-MM-DD
 */
function getDateKey() {
    return new Date().toISOString().split('T')[0];
}

/**
 * Get current month key in format YYYY-MM
 */
function getMonthKey() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Track an API call
 * @param {string} apiName - Name of the API (e.g., 'virustotal', 'auth0')
 * @param {string} operation - Type of operation (e.g., 'url_check', 'get_user', 'block_user')
 * @param {boolean} success - Whether the call succeeded
 * @param {Object} metadata - Additional metadata to track
 */
async function trackApiCall(apiName, operation, success = true, metadata = {}) {
    const container = getTrackingContainer();
    if (!container) {
        console.log('[APITracking] Cannot track - container not available');
        return null;
    }

    const dateKey = getDateKey();
    const monthKey = getMonthKey();
    const docId = `${apiName}-${dateKey}`;

    try {
        // Try to get existing document for today
        let doc;
        try {
            const { resource } = await container.item(docId, apiName).read();
            doc = resource;
        } catch (e) {
            // Document doesn't exist, create new one
            doc = null;
        }

        if (doc) {
            // Update existing document
            doc.totalCalls = (doc.totalCalls || 0) + 1;
            doc.successCalls = success ? (doc.successCalls || 0) + 1 : doc.successCalls;
            doc.failedCalls = !success ? (doc.failedCalls || 0) + 1 : doc.failedCalls;
            doc.lastCall = new Date().toISOString();
            
            // Track operation breakdown
            if (!doc.operations) doc.operations = {};
            if (!doc.operations[operation]) doc.operations[operation] = 0;
            doc.operations[operation]++;

            await container.item(docId, apiName).replace(doc);
        } else {
            // Create new document
            const newDoc = {
                id: docId,
                apiName,
                partitionKey: apiName,
                date: dateKey,
                month: monthKey,
                totalCalls: 1,
                successCalls: success ? 1 : 0,
                failedCalls: success ? 0 : 1,
                operations: { [operation]: 1 },
                firstCall: new Date().toISOString(),
                lastCall: new Date().toISOString()
            };

            await container.items.create(newDoc);
        }

        console.log(`[APITracking] Tracked ${apiName}.${operation} - success: ${success}`);
        return true;
    } catch (error) {
        console.error('[APITracking] Error tracking call:', error.message);
        return false;
    }
}

/**
 * Get API usage statistics for a specific API
 * @param {string} apiName - Name of the API
 * @param {number} days - Number of days to look back (default: 30)
 */
async function getApiStats(apiName, days = 30) {
    const container = getTrackingContainer();
    if (!container) {
        return {
            apiName,
            error: 'Tracking container not available',
            today: { totalCalls: 0, successCalls: 0, failedCalls: 0 },
            last30Days: { totalCalls: 0, successCalls: 0, failedCalls: 0 }
        };
    }

    try {
        const today = getDateKey();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const startDateStr = startDate.toISOString().split('T')[0];

        // Query all documents for this API within date range
        const query = {
            query: 'SELECT * FROM c WHERE c.apiName = @apiName AND c.date >= @startDate ORDER BY c.date DESC',
            parameters: [
                { name: '@apiName', value: apiName },
                { name: '@startDate', value: startDateStr }
            ]
        };

        const { resources } = await container.items.query(query).fetchAll();

        // Calculate totals
        let todayStats = { totalCalls: 0, successCalls: 0, failedCalls: 0, operations: {} };
        let periodStats = { totalCalls: 0, successCalls: 0, failedCalls: 0, operations: {} };
        let lastCall = null;
        let dailyBreakdown = [];

        for (const doc of resources) {
            periodStats.totalCalls += doc.totalCalls || 0;
            periodStats.successCalls += doc.successCalls || 0;
            periodStats.failedCalls += doc.failedCalls || 0;

            // Merge operations
            if (doc.operations) {
                for (const [op, count] of Object.entries(doc.operations)) {
                    periodStats.operations[op] = (periodStats.operations[op] || 0) + count;
                }
            }

            // Track last call
            if (doc.lastCall && (!lastCall || doc.lastCall > lastCall)) {
                lastCall = doc.lastCall;
            }

            // Add to daily breakdown
            dailyBreakdown.push({
                date: doc.date,
                totalCalls: doc.totalCalls,
                successCalls: doc.successCalls,
                failedCalls: doc.failedCalls
            });

            // Extract today's stats
            if (doc.date === today) {
                todayStats = {
                    totalCalls: doc.totalCalls || 0,
                    successCalls: doc.successCalls || 0,
                    failedCalls: doc.failedCalls || 0,
                    operations: doc.operations || {}
                };
            }
        }

        return {
            apiName,
            today: todayStats,
            [`last${days}Days`]: periodStats,
            lastCall,
            dailyBreakdown: dailyBreakdown.slice(0, 7) // Last 7 days for chart
        };
    } catch (error) {
        console.error(`[APITracking] Error getting stats for ${apiName}:`, error.message);
        return {
            apiName,
            error: error.message,
            today: { totalCalls: 0, successCalls: 0, failedCalls: 0 },
            last30Days: { totalCalls: 0, successCalls: 0, failedCalls: 0 }
        };
    }
}

/**
 * Get all tracked API stats
 */
async function getAllApiStats() {
    const apis = ['virustotal', 'auth0', 'content-safety'];
    const results = {};

    for (const api of apis) {
        results[api] = await getApiStats(api);
    }

    return results;
}

/**
 * Track VirusTotal API call
 * @param {string} operation - e.g., 'url_check', 'url_submit'
 * @param {boolean} success - Whether the call succeeded
 */
async function trackVirusTotalCall(operation, success = true) {
    return trackApiCall('virustotal', operation, success);
}

/**
 * Track Auth0 API call
 * @param {string} operation - e.g., 'get_user', 'block_user', 'delete_user', 'get_token'
 * @param {boolean} success - Whether the call succeeded
 */
async function trackAuth0Call(operation, success = true) {
    return trackApiCall('auth0', operation, success);
}

/**
 * Track Azure Content Safety API call
 * @param {string} operation - e.g., 'text_analyze', 'image_analyze'
 * @param {boolean} success - Whether the call succeeded
 */
async function trackContentSafetyCall(operation, success = true) {
    return trackApiCall('content-safety', operation, success);
}

export {
    trackApiCall,
    trackVirusTotalCall,
    trackAuth0Call,
    trackContentSafetyCall,
    getApiStats,
    getAllApiStats
};
