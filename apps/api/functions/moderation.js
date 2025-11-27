/**
 * Content Moderation API - Endpoints for content moderation management
 * 
 * Endpoints:
 * - POST /api/moderation/analyze - Analyze content for violations
 * - GET /api/moderation/config - Get moderation configuration
 * - PUT /api/moderation/config - Update moderation configuration
 * - GET /api/moderation/queue - Get moderation queue
 * - PUT /api/moderation/queue/:itemId/approve - Approve a queue item
 * - PUT /api/moderation/queue/:itemId/reject - Reject a queue item
 * - GET /api/moderation/stats - Get moderation statistics
 * - POST /api/moderation/blocklist - Update custom blocklist
 * - PUT /api/moderation/user/:userId/block - Block a user
 * - PUT /api/moderation/user/:userId/unblock - Unblock a user
 * 
 * @module moderation
 * @author SOMOS.tech
 */

import { app } from '@azure/functions';
import { isAdmin, getClientPrincipal } from '../shared/authMiddleware.js';
import { successResponse, errorResponse } from '../shared/httpResponse.js';
import {
    getModerationConfig,
    saveModerationConfig,
    analyzeText,
    analyzeImage,
    analyzeLinks,
    getModerationQueue,
    updateQueueItem,
    getModerationStats,
    setUserBlockStatus,
    updateBlocklist,
    moderateContent
} from '../shared/services/moderationService.js';

/**
 * Moderation API Handler
 */
app.http('moderation', {
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    authLevel: 'anonymous',
    route: 'moderation/{action?}/{itemId?}',
    handler: async (request, context) => {
        try {
            const method = request.method;
            const action = request.params.action;
            const itemId = request.params.itemId;

            context.log(`[Moderation] ${method} /moderation/${action || ''}/${itemId || ''}`);

            // Get client principal for auth
            const clientPrincipal = getClientPrincipal(request);
            if (!clientPrincipal) {
                return errorResponse(401, 'Authentication required');
            }

            const userEmail = clientPrincipal.userDetails;
            const userId = clientPrincipal.userId;

            // Route based on action
            switch (action) {
                // POST /api/moderation/analyze - Analyze content (authenticated users)
                case 'analyze':
                    if (method !== 'POST') {
                        return errorResponse(405, 'Method not allowed');
                    }
                    return await handleAnalyzeContent(request, context, userId, userEmail);

                // GET/PUT /api/moderation/config - Get or update config (admin only)
                case 'config':
                    if (!isAdmin(clientPrincipal)) {
                        return errorResponse(403, 'Admin access required');
                    }
                    if (method === 'GET') {
                        return await handleGetConfig(context);
                    } else if (method === 'PUT') {
                        return await handleUpdateConfig(request, context);
                    }
                    return errorResponse(405, 'Method not allowed');

                // GET /api/moderation/queue - Get moderation queue (admin only)
                case 'queue':
                    if (!isAdmin(clientPrincipal)) {
                        return errorResponse(403, 'Admin access required');
                    }
                    if (method === 'GET') {
                        return await handleGetQueue(request, context);
                    } else if (method === 'PUT' && itemId) {
                        return await handleUpdateQueueItem(request, context, itemId, userEmail);
                    }
                    return errorResponse(405, 'Method not allowed');

                // GET /api/moderation/stats - Get moderation stats (admin only)
                case 'stats':
                    if (!isAdmin(clientPrincipal)) {
                        return errorResponse(403, 'Admin access required');
                    }
                    if (method === 'GET') {
                        return await handleGetStats(context);
                    }
                    return errorResponse(405, 'Method not allowed');

                // POST /api/moderation/blocklist - Update blocklist (admin only)
                case 'blocklist':
                    if (!isAdmin(clientPrincipal)) {
                        return errorResponse(403, 'Admin access required');
                    }
                    if (method === 'POST') {
                        return await handleUpdateBlocklist(request, context);
                    }
                    return errorResponse(405, 'Method not allowed');

                // PUT /api/moderation/user/:userId/block or /unblock
                case 'user':
                    if (!isAdmin(clientPrincipal)) {
                        return errorResponse(403, 'Admin access required');
                    }
                    if (method === 'PUT' && itemId) {
                        return await handleUserBlockAction(request, context, itemId, userEmail);
                    }
                    return errorResponse(405, 'Method not allowed');

                default:
                    return errorResponse(404, 'Endpoint not found');
            }

        } catch (error) {
            context.error('[Moderation] Handler error:', error);
            return errorResponse(500, 'Internal server error', { message: error.message });
        }
    }
});

/**
 * Handle content analysis request
 */
async function handleAnalyzeContent(request, context, userId, userEmail) {
    try {
        const body = await request.json();
        const { text, image, type, contentId, channelId } = body;

        if (!text && !image) {
            return errorResponse(400, 'Content (text or image) is required');
        }

        context.log('[Moderation] Analyzing content for user:', userEmail);

        const result = await moderateContent({
            type: type || 'message',
            text,
            image,
            userId,
            userEmail,
            contentId,
            channelId
        });

        return successResponse(result);
    } catch (error) {
        context.error('[Moderation] Analyze error:', error);
        return errorResponse(500, 'Failed to analyze content', { message: error.message });
    }
}

/**
 * Handle get configuration request
 */
async function handleGetConfig(context) {
    try {
        const config = await getModerationConfig();
        return successResponse(config);
    } catch (error) {
        context.error('[Moderation] Get config error:', error);
        return errorResponse(500, 'Failed to get configuration', { message: error.message });
    }
}

/**
 * Handle update configuration request
 */
async function handleUpdateConfig(request, context) {
    try {
        const body = await request.json();
        
        // Validate configuration
        if (body.thresholds) {
            const validCategories = ['hate', 'sexual', 'violence', 'selfHarm'];
            for (const category of validCategories) {
                if (body.thresholds[category] !== undefined) {
                    const value = body.thresholds[category];
                    if (typeof value !== 'number' || value < 0 || value > 6) {
                        return errorResponse(400, `Invalid threshold for ${category}: must be 0-6`);
                    }
                }
            }
        }

        const config = await getModerationConfig();
        const updatedConfig = {
            ...config,
            ...body,
            thresholds: {
                ...config.thresholds,
                ...body.thresholds
            }
        };

        const saved = await saveModerationConfig(updatedConfig);
        context.log('[Moderation] Configuration updated');
        return successResponse(saved);
    } catch (error) {
        context.error('[Moderation] Update config error:', error);
        return errorResponse(500, 'Failed to update configuration', { message: error.message });
    }
}

/**
 * Handle get queue request
 */
async function handleGetQueue(request, context) {
    try {
        const url = new URL(request.url);
        const status = url.searchParams.get('status') || 'pending';
        const limit = parseInt(url.searchParams.get('limit') || '50');

        const queue = await getModerationQueue({ status, limit });
        return successResponse({
            items: queue,
            count: queue.length
        });
    } catch (error) {
        context.error('[Moderation] Get queue error:', error);
        return errorResponse(500, 'Failed to get queue', { message: error.message });
    }
}

/**
 * Handle update queue item request (approve/reject)
 */
async function handleUpdateQueueItem(request, context, itemId, adminEmail) {
    try {
        const body = await request.json();
        const { action, notes } = body;

        if (!action || !['approved', 'rejected'].includes(action)) {
            return errorResponse(400, 'Action must be "approved" or "rejected"');
        }

        const updated = await updateQueueItem(itemId, {
            status: action,
            reviewedBy: adminEmail,
            notes: notes
        });

        context.log(`[Moderation] Queue item ${itemId} ${action} by ${adminEmail}`);
        return successResponse(updated);
    } catch (error) {
        context.error('[Moderation] Update queue item error:', error);
        return errorResponse(500, 'Failed to update queue item', { message: error.message });
    }
}

/**
 * Handle get stats request
 */
async function handleGetStats(context) {
    try {
        const stats = await getModerationStats();
        return successResponse(stats);
    } catch (error) {
        context.error('[Moderation] Get stats error:', error);
        return errorResponse(500, 'Failed to get statistics', { message: error.message });
    }
}

/**
 * Handle blocklist update request
 */
async function handleUpdateBlocklist(request, context) {
    try {
        const body = await request.json();
        const { terms } = body;

        if (!Array.isArray(terms)) {
            return errorResponse(400, 'Terms must be an array');
        }

        // Clean and validate terms
        const cleanedTerms = terms
            .filter(t => typeof t === 'string' && t.trim().length > 0)
            .map(t => t.trim().toLowerCase());

        const result = await updateBlocklist(cleanedTerms);
        
        if (result.success) {
            context.log(`[Moderation] Blocklist updated with ${cleanedTerms.length} terms`);
            return successResponse(result);
        } else {
            return errorResponse(500, 'Failed to update blocklist', { message: result.error });
        }
    } catch (error) {
        context.error('[Moderation] Update blocklist error:', error);
        return errorResponse(500, 'Failed to update blocklist', { message: error.message });
    }
}

/**
 * Handle user block/unblock action
 */
async function handleUserBlockAction(request, context, targetUserId, adminEmail) {
    try {
        const url = new URL(request.url);
        const pathParts = url.pathname.split('/');
        const actionIndex = pathParts.indexOf(targetUserId) + 1;
        const blockAction = pathParts[actionIndex]; // 'block' or 'unblock'

        const body = await request.json();
        const { reason } = body;

        if (!['block', 'unblock'].includes(blockAction)) {
            return errorResponse(400, 'Action must be "block" or "unblock"');
        }

        const blocked = blockAction === 'block';
        
        if (blocked && !reason) {
            return errorResponse(400, 'Reason is required for blocking a user');
        }

        const updated = await setUserBlockStatus(targetUserId, blocked, reason || 'Unblocked', adminEmail);
        
        context.log(`[Moderation] User ${targetUserId} ${blocked ? 'blocked' : 'unblocked'} by ${adminEmail}`);
        return successResponse({
            userId: targetUserId,
            blocked: blocked,
            updatedBy: adminEmail
        });
    } catch (error) {
        context.error('[Moderation] User block action error:', error);
        return errorResponse(500, 'Failed to update user status', { message: error.message });
    }
}

export default app;
