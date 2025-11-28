/**
 * Group Messages API - Discord-like chat functionality for community groups
 * 
 * Endpoints:
 * - GET /api/group-messages/:groupId - Get messages for a group
 * - POST /api/group-messages/:groupId - Send a message
 * - PUT /api/group-messages/:groupId/:messageId - Edit a message
 * - DELETE /api/group-messages/:groupId/:messageId - Delete a message
 * - POST /api/group-messages/:groupId/:messageId/like - Like/unlike a message
 * 
 * @module groupMessages
 * @author SOMOS.tech
 */

import { app } from '@azure/functions';
import { requireAuth, getClientPrincipal } from '../shared/authMiddleware.js';
import { getContainer } from '../shared/db.js';
import { successResponse, errorResponse } from '../shared/httpResponse.js';
import { moderateContent } from '../shared/services/moderationService.js';

const CONTAINERS = {
    MESSAGES: 'group-messages',
    MEMBERSHIPS: 'group-memberships'
};

/**
 * Check if user is a member of the group
 */
async function isMemberOfGroup(userId, groupId, membershipsContainer) {
    const { resources } = await membershipsContainer.items
        .query({
            query: 'SELECT c.id FROM c WHERE c.groupId = @groupId AND c.userId = @userId',
            parameters: [
                { name: '@groupId', value: groupId },
                { name: '@userId', value: userId }
            ]
        })
        .fetchAll();
    return resources.length > 0;
}

/**
 * Group Messages Handler
 */
app.http('groupMessages', {
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    authLevel: 'anonymous',
    route: 'group-messages/{groupId}/{messageId?}/{action?}',
    handler: async (request, context) => {
        try {
            const method = request.method;
            const groupId = request.params.groupId;
            const messageId = request.params.messageId;
            const action = request.params.action;

            context.log(`[GroupMessages] ${method} /group-messages/${groupId}/${messageId || ''}/${action || ''}`);

            if (!groupId) {
                return errorResponse(400, 'Group ID is required');
            }

            // All operations require authentication
            const authResult = await requireAuth(request);
            if (!authResult.authenticated) {
                return errorResponse(401, 'Authentication required');
            }

            const principal = getClientPrincipal(request);
            if (!principal?.userId) {
                return errorResponse(400, 'User ID not found');
            }

            const messagesContainer = getContainer(CONTAINERS.MESSAGES);
            const membershipsContainer = getContainer(CONTAINERS.MEMBERSHIPS);

            // Check membership for all operations
            const isMember = await isMemberOfGroup(principal.userId, groupId, membershipsContainer);
            if (!isMember) {
                return errorResponse(403, 'You must be a member of this group to access messages');
            }

            // GET - Fetch messages
            if (method === 'GET') {
                const url = new URL(request.url);
                const limit = parseInt(url.searchParams.get('limit') || '50');
                const before = url.searchParams.get('before'); // For pagination

                let query = 'SELECT * FROM c WHERE c.groupId = @groupId AND c.isDeleted = false';
                const parameters = [{ name: '@groupId', value: groupId }];

                if (before) {
                    query += ' AND c.createdAt < @before';
                    parameters.push({ name: '@before', value: before });
                }

                query += ' ORDER BY c.createdAt DESC';

                const { resources: messages } = await messagesContainer.items
                    .query({ query, parameters })
                    .fetchAll();

                // Limit results
                const limitedMessages = messages.slice(0, limit);

                // Update last active time for user
                try {
                    const { resources: memberships } = await membershipsContainer.items
                        .query({
                            query: 'SELECT * FROM c WHERE c.groupId = @groupId AND c.userId = @userId',
                            parameters: [
                                { name: '@groupId', value: groupId },
                                { name: '@userId', value: principal.userId }
                            ]
                        })
                        .fetchAll();

                    if (memberships.length > 0) {
                        const membership = memberships[0];
                        membership.lastActiveAt = new Date().toISOString();
                        await membershipsContainer.item(membership.id, membership.id).replace(membership);
                    }
                } catch (e) {
                    // Non-critical, continue
                }

                return successResponse({
                    messages: limitedMessages.reverse(), // Return in chronological order
                    hasMore: messages.length > limit,
                    total: messages.length
                });
            }

            // POST - Send message or like
            if (method === 'POST') {
                // Like/unlike a message
                if (messageId && action === 'like') {
                    try {
                        const { resource: message } = await messagesContainer.item(messageId, messageId).read();
                        if (!message || message.groupId !== groupId) {
                            return errorResponse(404, 'Message not found');
                        }

                        const likes = message.likes || [];
                        const hasLiked = likes.includes(principal.userId);

                        if (hasLiked) {
                            // Unlike
                            message.likes = likes.filter(id => id !== principal.userId);
                        } else {
                            // Like
                            message.likes = [...likes, principal.userId];
                        }
                        message.likeCount = message.likes.length;

                        const { resource: updated } = await messagesContainer.item(messageId, messageId).replace(message);

                        context.log(`[GroupMessages] User ${principal.userId} ${hasLiked ? 'unliked' : 'liked'} message ${messageId}`);

                        return successResponse({
                            liked: !hasLiked,
                            likeCount: message.likeCount
                        });
                    } catch (error) {
                        return errorResponse(404, 'Message not found');
                    }
                }

                // Send new message
                const body = await request.json();

                if (!body.content || !body.content.trim()) {
                    return errorResponse(400, 'Message content is required');
                }

                // Content moderation check (Tier 1, 2, 3 based on config)
                try {
                    const moderationResult = await moderateContent({
                        type: 'message',
                        text: body.content.trim(),
                        userId: principal.userId,
                        userEmail: principal.userDetails,
                        groupId: groupId,
                        workflow: 'groups' // Use 'groups' workflow for moderation tiers
                    });

                    if (!moderationResult.allowed) {
                        context.log(`[GroupMessages] Content blocked for user ${principal.userDetails}:`, moderationResult.reason);
                        
                        // Provide more specific error message based on tier
                        let errorMessage = 'Your message contains content that violates our community guidelines.';
                        if (moderationResult.reason === 'tier1_keyword_match') {
                            errorMessage = 'Your message contains prohibited words or phrases.';
                        } else if (moderationResult.reason === 'tier2_malicious_link') {
                            errorMessage = 'Your message contains a potentially harmful link.';
                        } else if (moderationResult.reason === 'tier3_ai_violation') {
                            errorMessage = 'Your message was flagged for potentially harmful content.';
                        }
                        
                        return errorResponse(400, errorMessage, {
                            reason: moderationResult.reason,
                            action: moderationResult.action
                        });
                    }
                    
                    // If pending review, notify user
                    if (moderationResult.action === 'pending' && moderationResult.showPendingMessage) {
                        context.log(`[GroupMessages] Content pending review for user ${principal.userDetails}`);
                        // We'll still allow the message but could add a flag
                    }
                } catch (moderationError) {
                    // Log but don't block on moderation errors
                    context.warn('[GroupMessages] Moderation check failed, allowing message:', moderationError.message);
                }

                // Sanitize content (basic XSS prevention)
                const sanitizedContent = body.content
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .trim()
                    .slice(0, 2000); // Max 2000 characters

                // Get user info from membership
                let userName = principal.userDetails?.split('@')[0] || 'Member';
                let userPhoto = null;

                try {
                    const { resources: memberships } = await membershipsContainer.items
                        .query({
                            query: 'SELECT c.userName, c.userPhoto FROM c WHERE c.groupId = @groupId AND c.userId = @userId',
                            parameters: [
                                { name: '@groupId', value: groupId },
                                { name: '@userId', value: principal.userId }
                            ]
                        })
                        .fetchAll();

                    if (memberships.length > 0) {
                        userName = memberships[0].userName || userName;
                        userPhoto = memberships[0].userPhoto || null;
                    }
                } catch (e) {
                    // Use defaults
                }

                // Handle reply
                let replyToContent = null;
                if (body.replyToId) {
                    try {
                        const { resource: replyMsg } = await messagesContainer.item(body.replyToId, body.replyToId).read();
                        if (replyMsg) {
                            replyToContent = replyMsg.content.slice(0, 100);
                        }
                    } catch (e) {
                        // Ignore
                    }
                }

                const newMessage = {
                    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    groupId,
                    userId: principal.userId,
                    userName,
                    userPhoto,
                    content: sanitizedContent,
                    type: body.type || 'text',
                    imageUrl: body.imageUrl || null,
                    replyToId: body.replyToId || null,
                    replyToContent,
                    likes: [],
                    likeCount: 0,
                    createdAt: new Date().toISOString(),
                    isEdited: false,
                    isDeleted: false
                };

                const { resource: created } = await messagesContainer.items.create(newMessage);

                context.log(`[GroupMessages] New message in group ${groupId} by ${principal.userId}`);

                return successResponse(created, 201);
            }

            // PUT - Edit message
            if (method === 'PUT') {
                if (!messageId) {
                    return errorResponse(400, 'Message ID is required');
                }

                const body = await request.json();

                try {
                    const { resource: message } = await messagesContainer.item(messageId, messageId).read();
                    if (!message || message.groupId !== groupId) {
                        return errorResponse(404, 'Message not found');
                    }

                    // Only the author can edit
                    if (message.userId !== principal.userId) {
                        return errorResponse(403, 'You can only edit your own messages');
                    }

                    // Can't edit after 15 minutes
                    const messageAge = Date.now() - new Date(message.createdAt).getTime();
                    if (messageAge > 15 * 60 * 1000) {
                        return errorResponse(400, 'Messages can only be edited within 15 minutes');
                    }

                    // Moderate the edited content too
                    try {
                        const moderationResult = await moderateContent({
                            type: 'message',
                            text: body.content.trim(),
                            userId: principal.userId,
                            userEmail: principal.userDetails,
                            groupId: groupId,
                            workflow: 'groups'
                        });

                        if (!moderationResult.allowed) {
                            context.log(`[GroupMessages] Edit blocked for user ${principal.userDetails}:`, moderationResult.reason);
                            return errorResponse(400, 'Your edited message contains content that violates our community guidelines.', {
                                reason: moderationResult.reason
                            });
                        }
                    } catch (moderationError) {
                        context.warn('[GroupMessages] Edit moderation check failed:', moderationError.message);
                    }

                    const sanitizedContent = body.content
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .trim()
                        .slice(0, 2000);

                    message.content = sanitizedContent;
                    message.isEdited = true;
                    message.updatedAt = new Date().toISOString();

                    const { resource: updated } = await messagesContainer.item(messageId, messageId).replace(message);

                    context.log(`[GroupMessages] Message ${messageId} edited by ${principal.userId}`);

                    return successResponse(updated);
                } catch (error) {
                    return errorResponse(404, 'Message not found');
                }
            }

            // DELETE - Delete message
            if (method === 'DELETE') {
                if (!messageId) {
                    return errorResponse(400, 'Message ID is required');
                }

                try {
                    const { resource: message } = await messagesContainer.item(messageId, messageId).read();
                    if (!message || message.groupId !== groupId) {
                        return errorResponse(404, 'Message not found');
                    }

                    // Only the author can delete (or admin/moderator)
                    if (message.userId !== principal.userId) {
                        // Check if user is admin/moderator of the group
                        const { resources: memberships } = await membershipsContainer.items
                            .query({
                                query: 'SELECT c.role FROM c WHERE c.groupId = @groupId AND c.userId = @userId',
                                parameters: [
                                    { name: '@groupId', value: groupId },
                                    { name: '@userId', value: principal.userId }
                                ]
                            })
                            .fetchAll();

                        const role = memberships[0]?.role;
                        if (role !== 'admin' && role !== 'moderator' && role !== 'owner') {
                            return errorResponse(403, 'You can only delete your own messages');
                        }
                    }

                    // Soft delete
                    message.isDeleted = true;
                    message.content = '[Message deleted]';
                    message.updatedAt = new Date().toISOString();

                    await messagesContainer.item(messageId, messageId).replace(message);

                    context.log(`[GroupMessages] Message ${messageId} deleted by ${principal.userId}`);

                    return successResponse({ message: 'Message deleted' });
                } catch (error) {
                    return errorResponse(404, 'Message not found');
                }
            }

            return errorResponse(405, 'Method not allowed');

        } catch (error) {
            context.log.error('[GroupMessages] Error:', error);
            return errorResponse(500, 'Internal server error', error.message);
        }
    }
});
