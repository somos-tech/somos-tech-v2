/**
 * Community Messages API - Chat functionality for the online community
 * 
 * Endpoints:
 * - GET /api/community-messages/:channelId - Get messages for a channel
 * - POST /api/community-messages/:channelId - Send a message
 * - DELETE /api/community-messages/:channelId/:messageId - Delete a message
 * - POST /api/community-messages/:channelId/:messageId/react - Add reaction to a message
 * 
 * @module communityMessages
 * @author SOMOS.tech
 */

import { app } from '@azure/functions';
import { requireAuth, getClientPrincipal } from '../shared/authMiddleware.js';
import { getContainer } from '../shared/db.js';
import { successResponse, errorResponse } from '../shared/httpResponse.js';
import { moderateContent, getModerationConfig } from '../shared/services/moderationService.js';

const CONTAINERS = {
    MESSAGES: 'community-messages',
    USERS: 'users'
};

/**
 * Get user profile data - looks up by userId first, then by email as fallback
 */
async function getUserProfile(userId, userEmail, usersContainer) {
    try {
        // First try by userId
        let { resources } = await usersContainer.items
            .query({
                query: 'SELECT c.id, c.email, c.displayName, c.profilePicture, c.isAdmin FROM c WHERE c.id = @userId',
                parameters: [{ name: '@userId', value: userId }]
            })
            .fetchAll();
        
        // If not found by userId, try by email (handles Auth0 ID mismatch)
        if (resources.length === 0 && userEmail) {
            const emailResult = await usersContainer.items
                .query({
                    query: 'SELECT c.id, c.email, c.displayName, c.profilePicture, c.isAdmin FROM c WHERE c.email = @email',
                    parameters: [{ name: '@email', value: userEmail.toLowerCase() }]
                })
                .fetchAll();
            resources = emailResult.resources;
        }
        
        return resources[0] || null;
    } catch (error) {
        console.error('[CommunityMessages] Error getting user profile:', error);
        return null;
    }
}

/**
 * Community Messages Handler
 */
app.http('communityMessages', {
    methods: ['GET', 'POST', 'DELETE'],
    authLevel: 'anonymous',
    route: 'community-messages/{channelId}/{messageId?}/{action?}',
    handler: async (request, context) => {
        try {
            const method = request.method;
            const channelId = request.params.channelId;
            const messageId = request.params.messageId;
            const action = request.params.action;

            context.log(`[CommunityMessages] ${method} /community-messages/${channelId}/${messageId || ''}/${action || ''}`);

            if (!channelId) {
                return errorResponse(400, 'Channel ID is required');
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
            const usersContainer = getContainer(CONTAINERS.USERS);

            // GET - Fetch messages for a channel
            if (method === 'GET') {
                const url = new URL(request.url);
                const limit = parseInt(url.searchParams.get('limit') || '50');
                const before = url.searchParams.get('before'); // For pagination

                let query = 'SELECT * FROM c WHERE c.channelId = @channelId AND (c.isDeleted = false OR NOT IS_DEFINED(c.isDeleted))';
                const parameters = [{ name: '@channelId', value: channelId }];

                if (before) {
                    query += ' AND c.createdAt < @before';
                    parameters.push({ name: '@before', value: before });
                }

                query += ' ORDER BY c.createdAt DESC';

                const { resources: messages } = await messagesContainer.items
                    .query({ query, parameters })
                    .fetchAll();

                // Reverse to get chronological order, then limit
                const sortedMessages = messages.reverse().slice(-limit);

                return successResponse({
                    messages: sortedMessages,
                    channelId,
                    count: sortedMessages.length
                });
            }

            // POST - Send a new message or add reaction
            if (method === 'POST') {
                // Handle reactions
                if (action === 'react' && messageId) {
                    const body = await request.json();
                    const { emoji } = body;

                    if (!emoji) {
                        return errorResponse(400, 'Emoji is required');
                    }

                    // Get the message
                    const { resources: [message] } = await messagesContainer.items
                        .query({
                            query: 'SELECT * FROM c WHERE c.id = @id AND c.channelId = @channelId',
                            parameters: [
                                { name: '@id', value: messageId },
                                { name: '@channelId', value: channelId }
                            ]
                        })
                        .fetchAll();

                    if (!message) {
                        return errorResponse(404, 'Message not found');
                    }

                    // Update reactions
                    const reactions = message.reactions || [];
                    const existingReaction = reactions.find(r => r.emoji === emoji);

                    if (existingReaction) {
                        if (existingReaction.users.includes(principal.userId)) {
                            // Remove user from reaction
                            existingReaction.users = existingReaction.users.filter(u => u !== principal.userId);
                            existingReaction.count = existingReaction.users.length;
                            if (existingReaction.count === 0) {
                                const idx = reactions.indexOf(existingReaction);
                                reactions.splice(idx, 1);
                            }
                        } else {
                            // Add user to reaction
                            existingReaction.users.push(principal.userId);
                            existingReaction.count = existingReaction.users.length;
                        }
                    } else {
                        // New reaction
                        reactions.push({
                            emoji,
                            count: 1,
                            users: [principal.userId]
                        });
                    }

                    message.reactions = reactions;
                    message.updatedAt = new Date().toISOString();

                    const { resource: updated } = await messagesContainer.item(message.id, channelId).replace(message);

                    return successResponse({
                        message: updated,
                        action: 'reaction_updated'
                    });
                }

                // Send new message
                let body;
                try {
                    body = await request.json();
                } catch (parseError) {
                    context.log(`[CommunityMessages] JSON parse error:`, parseError.message);
                    return errorResponse(400, 'Invalid JSON in request body');
                }
                
                const { content, replyTo } = body;
                context.log(`[CommunityMessages] Received message request - content length: ${content?.length || 0}, hasReplyTo: ${!!replyTo}`);

                if (!content || !content.trim()) {
                    return errorResponse(400, 'Message content is required');
                }

                // Get user profile first to check admin status
                const userProfile = await getUserProfile(principal.userId, principal.userDetails, usersContainer);
                const isAdmin = userProfile?.isAdmin === true;

                // Content moderation check (admins bypass moderation)
                if (!isAdmin) {
                    try {
                        const moderationResult = await moderateContent({
                            type: 'message',
                            text: content.trim(),
                            userId: principal.userId,
                            userEmail: principal.userDetails,
                            channelId: channelId,
                            workflow: 'community' // Specify community workflow for tier configuration
                        });

                        if (!moderationResult.allowed) {
                            context.log(`[CommunityMessages] Content blocked for user ${principal.userDetails}:`, moderationResult.reason);
                            
                            // Provide specific error message based on tier
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
                                action: moderationResult.action,
                                tierFlow: moderationResult.tierFlow
                            });
                        }
                        
                        // Log if content is pending review
                        if (moderationResult.action === 'pending') {
                            context.log(`[CommunityMessages] Content pending review for ${principal.userDetails}`);
                        }
                    } catch (moderationError) {
                        // Log but don't block on moderation errors
                        console.warn('[CommunityMessages] Moderation check failed, allowing message:', moderationError.message);
                    }
                } else {
                    context.log(`[CommunityMessages] Admin ${principal.userDetails} bypassing content moderation`);
                }

                const newMessage = {
                    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    channelId,
                    userId: principal.userId,
                    userName: userProfile?.displayName || principal.userDetails?.split('@')[0] || 'Member',
                    userEmail: principal.userDetails,
                    userPhoto: userProfile?.profilePicture || null,
                    content: content.trim(),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    reactions: [],
                    isDeleted: false,
                    ...(replyTo && { replyTo })
                };

                const { resource: created } = await messagesContainer.items.create(newMessage);

                context.log(`[CommunityMessages] Message created: ${created.id} in channel ${channelId}`);

                return successResponse({
                    message: created,
                    action: 'created'
                }, 201);
            }

            // DELETE - Delete a message
            if (method === 'DELETE' && messageId) {
                // Get the message
                const { resources: [message] } = await messagesContainer.items
                    .query({
                        query: 'SELECT * FROM c WHERE c.id = @id AND c.channelId = @channelId',
                        parameters: [
                            { name: '@id', value: messageId },
                            { name: '@channelId', value: channelId }
                        ]
                    })
                    .fetchAll();

                if (!message) {
                    return errorResponse(404, 'Message not found');
                }

                // Only allow deletion by message author or admin
                if (message.userId !== principal.userId) {
                    // Check if user is admin (pass email for Azure AD fallback lookup)
                    const userProfile = await getUserProfile(principal.userId, principal.userDetails, usersContainer);
                    context.log(`[CommunityMessages] Delete check - User: ${principal.userId}, isAdmin: ${userProfile?.isAdmin}, messageOwner: ${message.userId}`);
                    
                    if (!userProfile?.isAdmin) {
                        return errorResponse(403, 'You can only delete your own messages');
                    }
                    context.log(`[CommunityMessages] Admin ${principal.userDetails} deleting message from ${message.userName}`);
                }

                // Soft delete
                message.isDeleted = true;
                message.deletedAt = new Date().toISOString();
                message.deletedBy = principal.userId;

                await messagesContainer.item(message.id, channelId).replace(message);

                context.log(`[CommunityMessages] Message deleted: ${messageId}`);

                return successResponse({
                    messageId,
                    action: 'deleted'
                });
            }

            return errorResponse(405, 'Method not allowed');

        } catch (error) {
            context.error('[CommunityMessages] Error:', error);
            return errorResponse(500, 'Internal server error', error.message);
        }
    }
});

/**
 * Get online/active users API
 * Returns users who have been active in the last 15 minutes
 */
app.http('communityActiveUsers', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'community/active-users',
    handler: async (request, context) => {
        try {
            context.log('[CommunityActiveUsers] GET /community/active-users');

            // Authentication required
            const authResult = await requireAuth(request);
            if (!authResult.authenticated) {
                return errorResponse(401, 'Authentication required');
            }

            const principal = getClientPrincipal(request);
            const usersContainer = getContainer(CONTAINERS.USERS);

            // Get users who have been active in the last 15 minutes
            const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
            
            // Get all users (we'll track activity separately, for now just get registered users)
            const { resources: users } = await usersContainer.items
                .query({
                    query: `SELECT c.id, c.email, c.displayName, c.profilePicture, c.lastActiveAt, c.isAdmin, c.createdAt 
                            FROM c 
                            WHERE c.email != null 
                            ORDER BY c.lastActiveAt DESC`
                })
                .fetchAll();

            // Separate into online (active recently) and offline
            const online = [];
            const offline = [];

            users.forEach(user => {
                const userInfo = {
                    id: user.id,
                    name: user.displayName || user.email?.split('@')[0] || 'Member',
                    email: user.email,
                    photoUrl: user.profilePicture,
                    isAdmin: user.isAdmin || false,
                    isCurrentUser: user.id === principal.userId
                };

                if (user.lastActiveAt && user.lastActiveAt > fifteenMinutesAgo) {
                    online.push({ ...userInfo, status: 'online' });
                } else {
                    offline.push({ ...userInfo, status: 'offline' });
                }
            });

            // Update current user's lastActiveAt
            try {
                const { resources: [currentUser] } = await usersContainer.items
                    .query({
                        query: 'SELECT * FROM c WHERE c.id = @userId',
                        parameters: [{ name: '@userId', value: principal.userId }]
                    })
                    .fetchAll();

                if (currentUser) {
                    currentUser.lastActiveAt = new Date().toISOString();
                    await usersContainer.item(currentUser.id, currentUser.id).replace(currentUser);
                }
            } catch (err) {
                console.warn('[CommunityActiveUsers] Could not update lastActiveAt:', err.message);
            }

            return successResponse({
                online,
                offline,
                totalOnline: online.length,
                totalOffline: offline.length,
                totalUsers: users.length
            });

        } catch (error) {
            context.error('[CommunityActiveUsers] Error:', error);
            return errorResponse(500, 'Internal server error', error.message);
        }
    }
});
