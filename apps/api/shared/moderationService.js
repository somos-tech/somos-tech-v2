/**
 * Content Moderation Service using Azure AI Content Safety
 * 
 * Provides comprehensive content moderation for text and images.
 * Detects: Hate, Sexual, Violence, Self-Harm with severity levels.
 * Supports custom blocklists for organization-specific terms.
 * 
 * @module moderationService
 * @author SOMOS.tech
 */

import ContentSafetyClient, { isUnexpected } from '@azure-rest/ai-content-safety';
import { AzureKeyCredential } from '@azure/core-auth';
import { getContainer } from './db.js';

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

// Container for moderation settings and violations
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
            console.warn('[ModerationService] Content Safety not configured - moderation disabled');
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
        return {
            id: 'config',
            enabled: true,
            thresholds: DEFAULT_THRESHOLDS,
            autoBlock: true,
            notifyAdmins: true,
            blocklist: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    } catch (error) {
        console.error('[ModerationService] Error getting moderation config:', error);
        return {
            id: 'config',
            enabled: true,
            thresholds: DEFAULT_THRESHOLDS,
            autoBlock: true,
            notifyAdmins: true,
            blocklist: []
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
 * Analyze text content for harmful material
 * @param {string} text - The text to analyze
 * @param {Object} options - Analysis options
 * @returns {Promise<Object>} Analysis result
 */
export async function analyzeText(text, options = {}) {
    const client = getContentSafetyClient();
    
    if (!client) {
        // If Content Safety is not configured, return safe result
        console.warn('[ModerationService] Content Safety not configured, skipping text analysis');
        return {
            allowed: true,
            categories: [],
            blocklist: [],
            reason: 'moderation_disabled'
        };
    }

    try {
        const config = await getModerationConfig();
        
        if (!config.enabled) {
            return {
                allowed: true,
                categories: [],
                blocklist: [],
                reason: 'moderation_disabled'
            };
        }

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
        const violations = [];
        let allowed = true;

        for (const category of categories) {
            const categoryName = category.category?.toLowerCase() || '';
            const severity = category.severity || 0;
            
            // Map category names to our config keys
            const categoryMap = {
                'hate': 'hate',
                'sexual': 'sexual',
                'violence': 'violence',
                'selfharm': 'selfHarm',
                'self-harm': 'selfHarm'
            };

            const configKey = categoryMap[categoryName];
            const threshold = config.thresholds?.[configKey] ?? DEFAULT_THRESHOLDS[configKey] ?? 2;

            if (severity >= threshold) {
                violations.push({
                    category: category.category,
                    severity: severity,
                    threshold: threshold
                });
                allowed = false;
            }
        }

        // Check blocklist matches
        const blocklistMatches = result.body.blocklistsMatch || [];
        if (blocklistMatches.length > 0) {
            allowed = false;
        }

        return {
            allowed: allowed,
            categories: violations,
            blocklist: blocklistMatches.map(m => ({
                blocklistName: m.blocklistName,
                text: m.blocklistItemText,
                itemId: m.blocklistItemId
            })),
            reason: allowed ? 'passed' : 'content_violation',
            rawAnalysis: categories.map(c => ({
                category: c.category,
                severity: c.severity
            }))
        };

    } catch (error) {
        console.error('[ModerationService] Error analyzing text:', error);
        
        // On error, allow content but log for review
        return {
            allowed: true,
            categories: [],
            blocklist: [],
            reason: 'analysis_error',
            error: error.message
        };
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
            allowed: true,
            categories: [],
            reason: 'moderation_disabled'
        };
    }

    try {
        const config = await getModerationConfig();
        
        if (!config.enabled) {
            return {
                allowed: true,
                categories: [],
                reason: 'moderation_disabled'
            };
        }

        // Prepare image analysis request
        const analyzeImageOption = {
            image: { content: base64Image }
        };

        const result = await client.path('/image:analyze').post({ body: analyzeImageOption });

        if (isUnexpected(result)) {
            console.error('[ModerationService] Unexpected image API response:', result);
            throw new Error('Content Safety API error');
        }

        // Parse the categories analysis
        const categories = result.body.categoriesAnalysis || [];
        const violations = [];
        let allowed = true;

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
            allowed: allowed,
            categories: violations,
            reason: allowed ? 'passed' : 'content_violation',
            rawAnalysis: categories.map(c => ({
                category: c.category,
                severity: c.severity
            }))
        };

    } catch (error) {
        console.error('[ModerationService] Error analyzing image:', error);
        
        return {
            allowed: true,
            categories: [],
            reason: 'analysis_error',
            error: error.message
        };
    }
}

/**
 * Add a content violation to the moderation queue
 * @param {Object} violation - Violation details
 * @returns {Promise<Object>} Created queue item
 */
export async function addToModerationQueue(violation) {
    try {
        const container = getContainer(CONTAINERS.MODERATION_QUEUE);
        
        const queueItem = {
            id: `violation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: violation.type || 'content',
            contentType: violation.contentType || 'text',
            content: violation.content,
            contentId: violation.contentId,
            userId: violation.userId,
            userEmail: violation.userEmail,
            channelId: violation.channelId,
            categories: violation.categories || [],
            blocklist: violation.blocklist || [],
            status: 'pending',
            createdAt: new Date().toISOString(),
            reviewedAt: null,
            reviewedBy: null,
            action: null,
            notes: null
        };

        const { resource } = await container.items.create(queueItem);
        console.log('[ModerationService] Added violation to queue:', resource.id);
        return resource;
    } catch (error) {
        console.error('[ModerationService] Error adding to moderation queue:', error);
        throw error;
    }
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
        
        // Get existing item
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

        return {
            pending: pendingItems[0] || 0,
            approved: approvedItems[0] || 0,
            rejected: rejectedItems[0] || 0,
            todayTotal: todayItems[0] || 0
        };
    } catch (error) {
        console.error('[ModerationService] Error getting stats:', error);
        return {
            pending: 0,
            approved: 0,
            rejected: 0,
            todayTotal: 0
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
        
        // Get existing user
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
            categories: violation.categories,
            contentId: violation.contentId,
            action: violation.action,
            timestamp: new Date().toISOString()
        });

        // Update user with new violation
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

        // Create or update blocklist
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

        // Add items to blocklist
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

        // Save blocklist to config
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
 * Moderate content before it's posted
 * This is the main entry point for content moderation
 * @param {Object} content - Content to moderate
 * @returns {Promise<Object>} Moderation result
 */
export async function moderateContent(content) {
    const { type, text, image, userId, userEmail, contentId, channelId } = content;

    try {
        let textResult = null;
        let imageResult = null;

        // Analyze text if present
        if (text) {
            textResult = await analyzeText(text);
        }

        // Analyze image if present
        if (image) {
            imageResult = await analyzeImage(image);
        }

        // Determine overall result
        const allowed = 
            (textResult === null || textResult.allowed) && 
            (imageResult === null || imageResult.allowed);

        // If content is not allowed, add to moderation queue
        if (!allowed) {
            const violation = {
                type: type || 'message',
                contentType: text && image ? 'mixed' : (text ? 'text' : 'image'),
                content: text ? text.substring(0, 500) : '[image]',
                contentId: contentId,
                userId: userId,
                userEmail: userEmail,
                channelId: channelId,
                categories: [
                    ...(textResult?.categories || []),
                    ...(imageResult?.categories || [])
                ],
                blocklist: textResult?.blocklist || []
            };

            await addToModerationQueue(violation);

            // Record user violation
            if (userId) {
                await recordUserViolation(userId, {
                    type: type || 'message',
                    categories: violation.categories,
                    contentId: contentId,
                    action: 'blocked'
                });
            }
        }

        return {
            allowed: allowed,
            textResult: textResult,
            imageResult: imageResult,
            reason: allowed ? 'passed' : 'content_violation'
        };

    } catch (error) {
        console.error('[ModerationService] Error moderating content:', error);
        
        // On error, allow content but log
        return {
            allowed: true,
            reason: 'moderation_error',
            error: error.message
        };
    }
}

export default {
    getModerationConfig,
    saveModerationConfig,
    analyzeText,
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
