/**
 * Tiered Content Moderation Service
 * 
 * Provides comprehensive content moderation with three tiers:
 * 
 * TIER 1: Text Content Safety (Azure AI Content Safety)
 * - Detects hate speech, sexual content, violence, self-harm
 * - Uses configurable severity thresholds
 * - Supports custom blocklists
 * 
 * TIER 2: Link Safety Analysis
 * - Checks URLs for malicious patterns
 * - Validates against known threat indicators
 * - Flags suspicious links for review
 * 
 * TIER 3: Manual Review Queue
 * - Content flagged but not auto-blocked goes to admin queue
 * - Links are defanged for safe viewing
 * - Admins can approve, reject, or escalate
 * 
 * @module moderationService
 * @author SOMOS.tech
 */

import ContentSafetyClient, { isUnexpected } from '@azure-rest/ai-content-safety';
import { AzureKeyCredential } from '@azure/core-auth';
import { getContainer } from '../db.js';
import {
    extractUrls,
    defangUrl,
    analyzeTextForLinks,
    defangTextUrls
} from './linkSafetyService.js';

// Content Safety configuration
const CONTENT_SAFETY_ENDPOINT = process.env.CONTENT_SAFETY_ENDPOINT;
const CONTENT_SAFETY_KEY = process.env.CONTENT_SAFETY_KEY;

// Default moderation thresholds (0=Safe, 2=Low, 4=Medium, 6=High)
const DEFAULT_THRESHOLDS = {
    hate: 2,
    sexual: 2,
    violence: 2,
    selfHarm: 2
};

// Container names for moderation data
const CONTAINERS = {
    MODERATION_CONFIG: 'moderation-config',
    MODERATION_QUEUE: 'moderation-queue',
    MODERATION_BLOCKLIST: 'moderation-blocklist',
    USERS: 'users'
};

let contentSafetyClient = null;

/**
 * Initialize the Content Safety client
 * @returns {Object} Content Safety client instance
 */
function getContentSafetyClient() {
    if (!contentSafetyClient) {
        if (!CONTENT_SAFETY_ENDPOINT || !CONTENT_SAFETY_KEY) {
            console.warn('[ModerationService] Content Safety not configured - Tier 1 moderation disabled');
            return null;
        }

        try {
            const credential = new AzureKeyCredential(CONTENT_SAFETY_KEY);
            contentSafetyClient = ContentSafetyClient(CONTENT_SAFETY_ENDPOINT, credential);
            console.log('[ModerationService] Content Safety client initialized');
        } catch (error) {
            console.error('[ModerationService] Failed to initialize Content Safety client:', error);
            return null;
        }
    }
    return contentSafetyClient;
}

/**
 * Get moderation configuration from Cosmos DB
 * @returns {Promise<Object>} Moderation configuration
 */
export async function getModerationConfig() {
    try {
        const container = getContainer(CONTAINERS.MODERATION_CONFIG);
        const { resources } = await container.items
            .query({
                query: 'SELECT * FROM c WHERE c.id = @id',
                parameters: [{ name: '@id', value: 'config' }]
            })
            .fetchAll();

        if (resources.length > 0) {
            return resources[0];
        }

        // Return default config if none exists
        const defaultConfig = {
            id: 'config',
            enabled: true,
            thresholds: DEFAULT_THRESHOLDS,
            autoBlock: true,
            notifyAdmins: true,
            blocklist: [],
            // Tier configuration
            tier1Enabled: true,   // Text content safety
            tier2Enabled: true,   // Link safety
            tier3Enabled: true,   // Manual review
            // Link safety settings
            blockMaliciousLinks: true,
            flagSuspiciousLinks: true,
            // User notification
            showPendingMessage: true,
            pendingMessageText: 'Your message is being reviewed before posting.',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        return defaultConfig;
    } catch (error) {
        console.error('[ModerationService] Error getting moderation config:', error);
        return {
            id: 'config',
            enabled: true,
            thresholds: DEFAULT_THRESHOLDS,
            autoBlock: true,
            notifyAdmins: true,
            blocklist: [],
            tier1Enabled: true,
            tier2Enabled: true,
            tier3Enabled: true,
            blockMaliciousLinks: true,
            flagSuspiciousLinks: true,
            showPendingMessage: true,
            pendingMessageText: 'Your message is being reviewed before posting.'
        };
    }
}

/**
 * Save moderation configuration to Cosmos DB
 * @param {Object} config - The configuration to save
 * @returns {Promise<Object>} Saved configuration
 */
export async function saveModerationConfig(config) {
    try {
        const container = getContainer(CONTAINERS.MODERATION_CONFIG);
        const configToSave = {
            ...config,
            id: 'config',
            updatedAt: new Date().toISOString()
        };
        const { resource } = await container.items.upsert(configToSave);
        console.log('[ModerationService] Config saved successfully');
        return resource;
    } catch (error) {
        console.error('[ModerationService] Error saving moderation config:', error);
        throw error;
    }
}

/**
 * TIER 1: Analyze text content for harmful material using Azure AI Content Safety
 * @param {string} text - The text to analyze
 * @param {Object} options - Analysis options
 * @returns {Promise<Object>} Tier 1 analysis result
 */
export async function analyzeText(text, options = {}) {
    const tier1Result = {
        tier: 1,
        tierName: 'Text Content Safety',
        passed: true,
        action: 'allow',
        categories: [],
        blocklist: [],
        reason: null,
        checks: [],
        rawAnalysis: null
    };

    const client = getContentSafetyClient();
    
    if (!client) {
        tier1Result.checks.push({
            name: 'content_safety_api',
            passed: true,
            message: 'Content Safety not configured - skipped'
        });
        tier1Result.reason = 'moderation_disabled';
        return tier1Result;
    }

    try {
        const config = await getModerationConfig();
        
        if (!config.enabled || !config.tier1Enabled) {
            tier1Result.checks.push({
                name: 'tier1_enabled',
                passed: true,
                message: 'Tier 1 moderation disabled'
            });
            tier1Result.reason = 'tier_disabled';
            return tier1Result;
        }

        tier1Result.checks.push({
            name: 'tier1_enabled',
            passed: true,
            message: 'Tier 1 moderation active'
        });

        // Prepare analysis request
        const analyzeTextOption = {
            text: text,
            blocklistNames: config.blocklist?.length > 0 ? ['somos-blocklist'] : [],
            haltOnBlocklistHit: false
        };

        const result = await client.path('/text:analyze').post({ body: analyzeTextOption });

        if (isUnexpected(result)) {
            console.error('[ModerationService] Unexpected API response:', result);
            throw new Error('Content Safety API error');
        }

        // Parse the categories analysis
        const categories = result.body.categoriesAnalysis || [];
        tier1Result.rawAnalysis = categories.map(c => ({
            category: c.category,
            severity: c.severity
        }));

        for (const category of categories) {
            const categoryName = category.category?.toLowerCase() || '';
            const severity = category.severity || 0;
            
            // Map category names to config keys
            const categoryMap = {
                'hate': 'hate',
                'sexual': 'sexual',
                'violence': 'violence',
                'selfharm': 'selfHarm',
                'self-harm': 'selfHarm'
            };

            const configKey = categoryMap[categoryName];
            const threshold = config.thresholds?.[configKey] ?? DEFAULT_THRESHOLDS[configKey] ?? 2;

            const checkResult = {
                name: `category_${categoryName}`,
                category: category.category,
                severity: severity,
                threshold: threshold,
                passed: severity < threshold,
                message: severity < threshold 
                    ? `${category.category}: Safe (${severity} < ${threshold})`
                    : `${category.category}: Violation (${severity} >= ${threshold})`
            };
            tier1Result.checks.push(checkResult);

            if (severity >= threshold) {
                tier1Result.categories.push({
                    category: category.category,
                    severity: severity,
                    threshold: threshold
                });
                tier1Result.passed = false;
                tier1Result.action = 'block';
            }
        }

        // Check blocklist matches
        const blocklistMatches = result.body.blocklistsMatch || [];
        if (blocklistMatches.length > 0) {
            tier1Result.passed = false;
            tier1Result.action = 'block';
            tier1Result.blocklist = blocklistMatches.map(m => ({
                blocklistName: m.blocklistName,
                text: m.blocklistItemText,
                itemId: m.blocklistItemId
            }));
            tier1Result.checks.push({
                name: 'blocklist',
                passed: false,
                message: `Blocked terms found: ${blocklistMatches.length} match(es)`
            });
        } else {
            tier1Result.checks.push({
                name: 'blocklist',
                passed: true,
                message: 'No blocked terms found'
            });
        }

        tier1Result.reason = tier1Result.passed ? 'passed' : 'content_violation';
        return tier1Result;

    } catch (error) {
        console.error('[ModerationService] Tier 1 error:', error);
        tier1Result.checks.push({
            name: 'api_error',
            passed: true,
            message: `Analysis error: ${error.message} - allowing content`
        });
        tier1Result.reason = 'analysis_error';
        tier1Result.error = error.message;
        return tier1Result;
    }
}

/**
 * TIER 2: Analyze text for malicious links
 * @param {string} text - Text content to analyze
 * @param {Object} options - Analysis options
 * @returns {Promise<Object>} Tier 2 analysis result
 */
export async function analyzeLinks(text, options = {}) {
    const tier2Result = {
        tier: 2,
        tierName: 'Link Safety Analysis',
        passed: true,
        action: 'allow',
        hasLinks: false,
        urls: [],
        checks: [],
        reason: null
    };

    try {
        const config = await getModerationConfig();
        
        if (!config.tier2Enabled) {
            tier2Result.checks.push({
                name: 'tier2_enabled',
                passed: true,
                message: 'Tier 2 link checking disabled'
            });
            tier2Result.reason = 'tier_disabled';
            return tier2Result;
        }

        tier2Result.checks.push({
            name: 'tier2_enabled',
            passed: true,
            message: 'Tier 2 link checking active'
        });

        // Analyze links in text
        const linkAnalysis = analyzeTextForLinks(text);
        
        tier2Result.hasLinks = linkAnalysis.hasLinks;
        tier2Result.urls = linkAnalysis.urls;

        if (!linkAnalysis.hasLinks) {
            tier2Result.checks.push({
                name: 'link_detection',
                passed: true,
                message: 'No links detected in content'
            });
            tier2Result.reason = 'no_links';
            return tier2Result;
        }

        tier2Result.checks.push({
            name: 'link_detection',
            passed: true,
            message: `Found ${linkAnalysis.urls.length} link(s)`
        });

        // Process each URL's checks
        for (const urlInfo of linkAnalysis.urls) {
            for (const check of urlInfo.checks) {
                tier2Result.checks.push({
                    name: `url_${check.name}`,
                    url: urlInfo.defangedUrl, // Always use defanged in results
                    passed: check.passed,
                    message: check.message
                });
            }
        }

        // Determine action based on config and analysis
        if (linkAnalysis.tierResult === 'blocked') {
            if (config.blockMaliciousLinks) {
                tier2Result.passed = false;
                tier2Result.action = 'block';
                tier2Result.reason = 'malicious_link_detected';
            } else {
                tier2Result.action = 'review';
                tier2Result.reason = 'malicious_link_flagged';
            }
        } else if (linkAnalysis.tierResult === 'review') {
            if (config.flagSuspiciousLinks) {
                tier2Result.action = 'review';
                tier2Result.reason = 'suspicious_link_flagged';
            }
        } else {
            tier2Result.reason = 'passed';
        }

        return tier2Result;

    } catch (error) {
        console.error('[ModerationService] Tier 2 error:', error);
        tier2Result.checks.push({
            name: 'link_analysis_error',
            passed: true,
            message: `Link analysis error: ${error.message}`
        });
        tier2Result.reason = 'analysis_error';
        tier2Result.error = error.message;
        return tier2Result;
    }
}

/**
 * Analyze image content for harmful material
 * @param {string} base64Image - Base64 encoded image data
 * @param {Object} options - Analysis options
 * @returns {Promise<Object>} Analysis result
 */
export async function analyzeImage(base64Image, options = {}) {
    const client = getContentSafetyClient();
    
    if (!client) {
        console.warn('[ModerationService] Content Safety not configured, skipping image analysis');
        return {
            tier: 1,
            tierName: 'Image Content Safety',
            passed: true,
            action: 'allow',
            categories: [],
            checks: [],
            reason: 'moderation_disabled'
        };
    }

    try {
        const config = await getModerationConfig();
        
        if (!config.enabled) {
            return {
                tier: 1,
                tierName: 'Image Content Safety',
                passed: true,
                action: 'allow',
                categories: [],
                checks: [{ name: 'moderation', passed: true, message: 'Moderation disabled' }],
                reason: 'moderation_disabled'
            };
        }

        const analyzeImageOption = {
            image: { content: base64Image }
        };

        const result = await client.path('/image:analyze').post({ body: analyzeImageOption });

        if (isUnexpected(result)) {
            console.error('[ModerationService] Unexpected image API response:', result);
            throw new Error('Content Safety API error');
        }

        const categories = result.body.categoriesAnalysis || [];
        const violations = [];
        let allowed = true;
        const checks = [];

        for (const category of categories) {
            const categoryName = category.category?.toLowerCase() || '';
            const severity = category.severity || 0;
            
            const categoryMap = {
                'hate': 'hate',
                'sexual': 'sexual',
                'violence': 'violence',
                'selfharm': 'selfHarm',
                'self-harm': 'selfHarm'
            };

            const configKey = categoryMap[categoryName];
            const threshold = config.thresholds?.[configKey] ?? DEFAULT_THRESHOLDS[configKey] ?? 2;

            checks.push({
                name: `image_${categoryName}`,
                severity: severity,
                threshold: threshold,
                passed: severity < threshold,
                message: severity < threshold
                    ? `${category.category}: Safe (${severity} < ${threshold})`
                    : `${category.category}: Violation (${severity} >= ${threshold})`
            });

            if (severity >= threshold) {
                violations.push({
                    category: category.category,
                    severity: severity,
                    threshold: threshold
                });
                allowed = false;
            }
        }

        return {
            tier: 1,
            tierName: 'Image Content Safety',
            passed: allowed,
            action: allowed ? 'allow' : 'block',
            categories: violations,
            checks: checks,
            reason: allowed ? 'passed' : 'content_violation',
            rawAnalysis: categories.map(c => ({
                category: c.category,
                severity: c.severity
            }))
        };

    } catch (error) {
        console.error('[ModerationService] Error analyzing image:', error);
        
        return {
            tier: 1,
            tierName: 'Image Content Safety',
            passed: true,
            action: 'allow',
            categories: [],
            checks: [{ name: 'error', passed: true, message: error.message }],
            reason: 'analysis_error',
            error: error.message
        };
    }
}

/**
 * Add a content item to the moderation queue (Tier 3)
 * @param {Object} violation - Violation details
 * @returns {Promise<Object>} Created queue item
 */
export async function addToModerationQueue(violation) {
    try {
        const container = getContainer(CONTAINERS.MODERATION_QUEUE);
        
        // Defang any URLs in the content for safe admin viewing
        let safeContent = violation.content;
        if (violation.tier2Result?.urls) {
            safeContent = defangTextUrls(violation.content, violation.tier2Result.urls);
        }
        
        const queueItem = {
            id: `violation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: violation.type || 'content',
            contentType: violation.contentType || 'text',
            content: violation.content,
            safeContent: safeContent, // Defanged version for admin viewing
            contentId: violation.contentId,
            userId: violation.userId,
            userEmail: violation.userEmail,
            channelId: violation.channelId,
            groupId: violation.groupId,
            // Tier analysis results
            tier1Result: violation.tier1Result || null,
            tier2Result: violation.tier2Result || null,
            tierFlow: violation.tierFlow || [],
            overallAction: violation.overallAction || 'review',
            // Queue status
            status: 'pending',
            priority: calculatePriority(violation),
            createdAt: new Date().toISOString(),
            reviewedAt: null,
            reviewedBy: null,
            action: null,
            notes: null
        };

        const { resource } = await container.items.create(queueItem);
        console.log('[ModerationService] Added item to review queue:', resource.id);
        return resource;
    } catch (error) {
        console.error('[ModerationService] Error adding to moderation queue:', error);
        throw error;
    }
}

/**
 * Calculate priority for queue item based on violations
 * @param {Object} violation - Violation details
 * @returns {string} Priority level: 'critical', 'high', 'medium', 'low'
 */
function calculatePriority(violation) {
    // High risk links = critical
    if (violation.tier2Result?.urls?.some(u => u.riskLevel === 'critical')) {
        return 'critical';
    }
    
    // Content safety violations with high severity
    if (violation.tier1Result?.categories?.some(c => c.severity >= 4)) {
        return 'high';
    }
    
    // Malicious links
    if (violation.tier2Result?.urls?.some(u => !u.safe)) {
        return 'high';
    }
    
    // Medium risk links or blocklist matches
    if (violation.tier2Result?.urls?.some(u => u.riskLevel === 'high') || 
        violation.tier1Result?.blocklist?.length > 0) {
        return 'medium';
    }
    
    return 'low';
}

/**
 * Get pending items from the moderation queue
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Queue items
 */
export async function getModerationQueue(options = {}) {
    try {
        const container = getContainer(CONTAINERS.MODERATION_QUEUE);
        const { status = 'pending', limit = 50 } = options;

        const query = status === 'all'
            ? 'SELECT * FROM c ORDER BY c.createdAt DESC OFFSET 0 LIMIT @limit'
            : 'SELECT * FROM c WHERE c.status = @status ORDER BY c.createdAt DESC OFFSET 0 LIMIT @limit';

        const parameters = status === 'all'
            ? [{ name: '@limit', value: limit }]
            : [{ name: '@status', value: status }, { name: '@limit', value: limit }];

        const { resources } = await container.items
            .query({ query, parameters })
            .fetchAll();

        return resources;
    } catch (error) {
        console.error('[ModerationService] Error getting moderation queue:', error);
        return [];
    }
}

/**
 * Update a moderation queue item (approve/reject)
 * @param {string} itemId - Queue item ID
 * @param {Object} update - Update data
 * @returns {Promise<Object>} Updated item
 */
export async function updateQueueItem(itemId, update) {
    try {
        const container = getContainer(CONTAINERS.MODERATION_QUEUE);
        
        const { resources } = await container.items
            .query({
                query: 'SELECT * FROM c WHERE c.id = @id',
                parameters: [{ name: '@id', value: itemId }]
            })
            .fetchAll();

        if (resources.length === 0) {
            throw new Error('Queue item not found');
        }

        const existingItem = resources[0];
        const updatedItem = {
            ...existingItem,
            ...update,
            reviewedAt: new Date().toISOString()
        };

        const { resource } = await container.items.upsert(updatedItem);
        console.log('[ModerationService] Updated queue item:', resource.id);
        return resource;
    } catch (error) {
        console.error('[ModerationService] Error updating queue item:', error);
        throw error;
    }
}

/**
 * Get moderation statistics
 * @returns {Promise<Object>} Moderation stats
 */
export async function getModerationStats() {
    try {
        const container = getContainer(CONTAINERS.MODERATION_QUEUE);

        // Get counts by status
        const { resources: pendingItems } = await container.items
            .query({
                query: 'SELECT VALUE COUNT(1) FROM c WHERE c.status = @status',
                parameters: [{ name: '@status', value: 'pending' }]
            })
            .fetchAll();

        const { resources: approvedItems } = await container.items
            .query({
                query: 'SELECT VALUE COUNT(1) FROM c WHERE c.status = @status',
                parameters: [{ name: '@status', value: 'approved' }]
            })
            .fetchAll();

        const { resources: rejectedItems } = await container.items
            .query({
                query: 'SELECT VALUE COUNT(1) FROM c WHERE c.status = @status',
                parameters: [{ name: '@status', value: 'rejected' }]
            })
            .fetchAll();

        // Get today's counts
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayIso = today.toISOString();

        const { resources: todayItems } = await container.items
            .query({
                query: 'SELECT VALUE COUNT(1) FROM c WHERE c.createdAt >= @today',
                parameters: [{ name: '@today', value: todayIso }]
            })
            .fetchAll();

        // Get tier breakdown
        const { resources: tier1Blocks } = await container.items
            .query({
                query: 'SELECT VALUE COUNT(1) FROM c WHERE c.tier1Result.action = @action',
                parameters: [{ name: '@action', value: 'block' }]
            })
            .fetchAll();

        const { resources: tier2Blocks } = await container.items
            .query({
                query: 'SELECT VALUE COUNT(1) FROM c WHERE c.tier2Result.action = @action',
                parameters: [{ name: '@action', value: 'block' }]
            })
            .fetchAll();

        return {
            pending: pendingItems[0] || 0,
            approved: approvedItems[0] || 0,
            rejected: rejectedItems[0] || 0,
            todayTotal: todayItems[0] || 0,
            byTier: {
                tier1Blocks: tier1Blocks[0] || 0,
                tier2Blocks: tier2Blocks[0] || 0,
                tier3Reviews: pendingItems[0] || 0
            }
        };
    } catch (error) {
        console.error('[ModerationService] Error getting stats:', error);
        return {
            pending: 0,
            approved: 0,
            rejected: 0,
            todayTotal: 0,
            byTier: { tier1Blocks: 0, tier2Blocks: 0, tier3Reviews: 0 }
        };
    }
}

/**
 * Record a user violation
 * @param {string} userId - User ID
 * @param {Object} violation - Violation details
 * @returns {Promise<Object>} Updated user record
 */
export async function recordUserViolation(userId, violation) {
    try {
        const usersContainer = getContainer(CONTAINERS.USERS);
        
        const { resources } = await usersContainer.items
            .query({
                query: 'SELECT * FROM c WHERE c.id = @id',
                parameters: [{ name: '@id', value: userId }]
            })
            .fetchAll();

        if (resources.length === 0) {
            console.warn('[ModerationService] User not found for violation:', userId);
            return null;
        }

        const user = resources[0];
        const violations = user.violations || [];
        
        violations.push({
            id: `v-${Date.now()}`,
            type: violation.type,
            tier: violation.tier,
            categories: violation.categories,
            contentId: violation.contentId,
            action: violation.action,
            timestamp: new Date().toISOString()
        });

        const updatedUser = {
            ...user,
            violations: violations,
            violationCount: violations.length,
            lastViolationAt: new Date().toISOString()
        };

        const { resource } = await usersContainer.items.upsert(updatedUser);
        console.log('[ModerationService] Recorded violation for user:', userId);
        return resource;
    } catch (error) {
        console.error('[ModerationService] Error recording user violation:', error);
        throw error;
    }
}

/**
 * Block/unblock a user
 * @param {string} userId - User ID
 * @param {boolean} blocked - Block status
 * @param {string} reason - Reason for block/unblock
 * @param {string} adminEmail - Admin who performed action
 * @returns {Promise<Object>} Updated user record
 */
export async function setUserBlockStatus(userId, blocked, reason, adminEmail) {
    try {
        const usersContainer = getContainer(CONTAINERS.USERS);
        
        const { resources } = await usersContainer.items
            .query({
                query: 'SELECT * FROM c WHERE c.id = @id',
                parameters: [{ name: '@id', value: userId }]
            })
            .fetchAll();

        if (resources.length === 0) {
            throw new Error('User not found');
        }

        const user = resources[0];
        const blockHistory = user.blockHistory || [];
        
        blockHistory.push({
            action: blocked ? 'blocked' : 'unblocked',
            reason: reason,
            by: adminEmail,
            timestamp: new Date().toISOString()
        });

        const updatedUser = {
            ...user,
            blocked: blocked,
            blockedAt: blocked ? new Date().toISOString() : null,
            blockedBy: blocked ? adminEmail : null,
            blockReason: blocked ? reason : null,
            blockHistory: blockHistory
        };

        const { resource } = await usersContainer.items.upsert(updatedUser);
        console.log(`[ModerationService] User ${blocked ? 'blocked' : 'unblocked'}:`, userId);
        return resource;
    } catch (error) {
        console.error('[ModerationService] Error setting user block status:', error);
        throw error;
    }
}

/**
 * Create or update custom blocklist
 * @param {Array} terms - Array of terms to block
 * @returns {Promise<Object>} Result of blocklist operation
 */
export async function updateBlocklist(terms) {
    const client = getContentSafetyClient();
    
    if (!client) {
        console.warn('[ModerationService] Content Safety not configured');
        return { success: false, error: 'Content Safety not configured' };
    }

    try {
        const blocklistName = 'somos-blocklist';

        const createResult = await client
            .path('/text/blocklists/{blocklistName}', blocklistName)
            .patch({
                contentType: 'application/merge-patch+json',
                body: {
                    description: 'SOMOS.tech community blocklist'
                }
            });

        if (isUnexpected(createResult)) {
            throw createResult;
        }

        if (terms && terms.length > 0) {
            const blocklistItems = terms.map(text => ({ text: text.toLowerCase().trim() }));
            
            const addResult = await client
                .path('/text/blocklists/{blocklistName}:addOrUpdateBlocklistItems', blocklistName)
                .post({
                    body: { blocklistItems }
                });

            if (isUnexpected(addResult)) {
                throw addResult;
            }

            console.log('[ModerationService] Blocklist updated with', terms.length, 'terms');
        }

        const config = await getModerationConfig();
        config.blocklist = terms;
        await saveModerationConfig(config);

        return { 
            success: true, 
            blocklistName, 
            itemCount: terms.length 
        };
    } catch (error) {
        console.error('[ModerationService] Error updating blocklist:', error);
        return { success: false, error: error.message };
    }
}

/**
 * MAIN ENTRY POINT: Tiered Content Moderation
 * 
 * Processes content through all three tiers:
 * - Tier 1: Text/Image Content Safety (Azure AI)
 * - Tier 2: Link Safety Analysis
 * - Tier 3: Manual Review Queue (if needed)
 * 
 * @param {Object} content - Content to moderate
 * @returns {Promise<Object>} Complete moderation result with tier flow
 */
export async function moderateContent(content) {
    const { type, text, image, userId, userEmail, contentId, channelId, groupId } = content;

    const result = {
        allowed: true,
        action: 'allow',
        needsReview: false,
        showPendingMessage: false,
        pendingMessageText: null,
        tierFlow: [],
        tier1Result: null,
        tier2Result: null,
        queueItem: null,
        reason: null
    };

    try {
        const config = await getModerationConfig();
        
        if (!config.enabled) {
            result.reason = 'moderation_disabled';
            result.tierFlow.push({
                tier: 0,
                name: 'Moderation Check',
                action: 'skip',
                message: 'Moderation is disabled'
            });
            return result;
        }

        // ========== TIER 1: Text/Image Content Safety ==========
        if (text) {
            const tier1 = await analyzeText(text);
            result.tier1Result = tier1;
            result.tierFlow.push({
                tier: 1,
                name: 'Text Content Safety',
                action: tier1.action,
                passed: tier1.passed,
                checks: tier1.checks,
                categories: tier1.categories,
                blocklist: tier1.blocklist
            });

            if (!tier1.passed) {
                result.allowed = false;
                result.action = 'block';
                result.reason = 'tier1_content_violation';
                
                // Record violation and add to queue
                if (userId) {
                    await recordUserViolation(userId, {
                        type: type || 'message',
                        tier: 1,
                        categories: tier1.categories,
                        contentId: contentId,
                        action: 'blocked'
                    });
                }

                await addToModerationQueue({
                    type: type || 'message',
                    contentType: 'text',
                    content: text.substring(0, 1000),
                    contentId,
                    userId,
                    userEmail,
                    channelId,
                    groupId,
                    tier1Result: tier1,
                    tierFlow: result.tierFlow,
                    overallAction: 'blocked'
                });

                return result;
            }
        }

        // Analyze image if present
        if (image) {
            const imageResult = await analyzeImage(image);
            result.tierFlow.push({
                tier: 1,
                name: 'Image Content Safety',
                action: imageResult.action,
                passed: imageResult.passed,
                checks: imageResult.checks,
                categories: imageResult.categories
            });

            if (!imageResult.passed) {
                result.allowed = false;
                result.action = 'block';
                result.reason = 'tier1_image_violation';
                return result;
            }
        }

        // ========== TIER 2: Link Safety Analysis ==========
        if (text && config.tier2Enabled) {
            const tier2 = await analyzeLinks(text);
            result.tier2Result = tier2;
            result.tierFlow.push({
                tier: 2,
                name: 'Link Safety Analysis',
                action: tier2.action,
                passed: tier2.passed,
                hasLinks: tier2.hasLinks,
                checks: tier2.checks,
                urls: tier2.urls?.map(u => ({
                    defangedUrl: u.defangedUrl,
                    safe: u.safe,
                    riskLevel: u.riskLevel,
                    threats: u.threats
                }))
            });

            if (tier2.action === 'block') {
                result.allowed = false;
                result.action = 'block';
                result.reason = 'tier2_malicious_link';

                await addToModerationQueue({
                    type: type || 'message',
                    contentType: 'text',
                    content: text.substring(0, 1000),
                    contentId,
                    userId,
                    userEmail,
                    channelId,
                    groupId,
                    tier1Result: result.tier1Result,
                    tier2Result: tier2,
                    tierFlow: result.tierFlow,
                    overallAction: 'blocked'
                });

                return result;
            }

            // Tier 2 flagged for review
            if (tier2.action === 'review') {
                result.needsReview = true;
            }
        }

        // ========== TIER 3: Manual Review Queue ==========
        if (result.needsReview && config.tier3Enabled) {
            result.tierFlow.push({
                tier: 3,
                name: 'Manual Review Required',
                action: 'review',
                passed: null,
                message: 'Content queued for admin review'
            });

            const queueItem = await addToModerationQueue({
                type: type || 'message',
                contentType: text && image ? 'mixed' : (text ? 'text' : 'image'),
                content: text ? text.substring(0, 1000) : '[image]',
                contentId,
                userId,
                userEmail,
                channelId,
                groupId,
                tier1Result: result.tier1Result,
                tier2Result: result.tier2Result,
                tierFlow: result.tierFlow,
                overallAction: 'pending_review'
            });

            result.queueItem = queueItem;
            result.action = 'pending';
            result.reason = 'pending_review';

            // Show pending message to user
            if (config.showPendingMessage) {
                result.showPendingMessage = true;
                result.pendingMessageText = config.pendingMessageText || 
                    'Your message is being reviewed before posting.';
            }
        } else {
            result.tierFlow.push({
                tier: 3,
                name: 'Manual Review',
                action: 'skip',
                passed: true,
                message: 'No review needed - content passed all checks'
            });
            result.reason = 'passed';
        }

        return result;

    } catch (error) {
        console.error('[ModerationService] Error moderating content:', error);
        
        result.tierFlow.push({
            tier: 0,
            name: 'Error',
            action: 'allow',
            message: `Moderation error: ${error.message}`
        });
        result.reason = 'moderation_error';
        result.error = error.message;
        return result;
    }
}

export default {
    getModerationConfig,
    saveModerationConfig,
    analyzeText,
    analyzeLinks,
    analyzeImage,
    addToModerationQueue,
    getModerationQueue,
    updateQueueItem,
    getModerationStats,
    recordUserViolation,
    setUserBlockStatus,
    updateBlocklist,
    moderateContent
};
