/**
 * Broadcast Notifications API - Send notifications to groups or all members
 * 
 * Endpoints:
 * - POST /api/broadcast/send - Send broadcast notification (admin only)
 * - GET /api/broadcast/groups - Get available target groups
 * - GET /api/broadcast/history - Get broadcast history
 * 
 * @module broadcastNotifications
 * @author SOMOS.tech
 */

import { app } from '@azure/functions';
import { requireAdmin, getClientPrincipal } from '../shared/authMiddleware.js';
import { getContainer } from '../shared/db.js';
import { successResponse, errorResponse } from '../shared/httpResponse.js';
import { sendBroadcastNotification, createNotification } from '../shared/services/notificationService.js';

const CONTAINERS = {
    GROUPS: 'community-groups',
    MEMBERSHIPS: 'group-memberships',
    USERS: 'users',
    BROADCASTS: 'broadcasts',
    COMMUNITY_MESSAGES: 'community-messages'
};

/**
 * Get all members for a specific group (includes userId for notifications)
 */
async function getGroupMembers(groupId) {
    const membershipsContainer = getContainer(CONTAINERS.MEMBERSHIPS);
    const { resources: members } = await membershipsContainer.items
        .query({
            query: 'SELECT c.userId, c.userEmail, c.userName FROM c WHERE c.groupId = @groupId AND c.status = "active"',
            parameters: [{ name: '@groupId', value: groupId }]
        })
        .fetchAll();
    return members;
}

/**
 * Get all active users
 */
async function getAllUsers() {
    const usersContainer = getContainer(CONTAINERS.USERS);
    const { resources: users } = await usersContainer.items
        .query({
            query: 'SELECT c.id, c.email, c.displayName FROM c WHERE c.status = "active"'
        })
        .fetchAll();
    return users;
}

/**
 * Get all groups for targeting
 */
async function getAllGroups() {
    const groupsContainer = getContainer(CONTAINERS.GROUPS);
    const { resources: groups } = await groupsContainer.items
        .query('SELECT c.id, c.name, c.city, c.state, c.memberCount FROM c WHERE c.visibility = "Public" ORDER BY c.name ASC')
        .fetchAll();
    return groups;
}

/**
 * Post announcement to community channel
 */
async function postAnnouncementToChannel(channelId, subject, message, senderName, senderEmail) {
    try {
        const messagesContainer = getContainer(CONTAINERS.COMMUNITY_MESSAGES);
        
        const announcementMessage = {
            id: `announcement-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            channelId,
            content: `📢 **${subject}**\n\n${message}`,
            userId: 'system',
            userName: senderName || 'SOMOS Admin',
            userPhoto: null,
            isAnnouncement: true,
            reactions: [],
            createdAt: new Date().toISOString(),
            metadata: {
                type: 'broadcast_announcement',
                senderEmail
            }
        };
        
        const { resource } = await messagesContainer.items.create(announcementMessage);
        return resource;
    } catch (error) {
        console.error(`[BroadcastNotifications] Failed to post to channel ${channelId}:`, error.message);
        return null;
    }
}

/**
 * Save broadcast record
 */
async function saveBroadcast(broadcastData) {
    const broadcastsContainer = getContainer(CONTAINERS.BROADCASTS);
    const { resource } = await broadcastsContainer.items.create(broadcastData);
    return resource;
}

/**
 * Main Broadcast Notifications Handler
 */
app.http('broadcastNotifications', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    route: 'broadcast/{action?}',
    handler: async (request, context) => {
        try {
            const method = request.method;
            const action = request.params.action;

            context.log(`[BroadcastNotifications] ${method} /${action || ''}`);

            // All broadcast actions require admin
            const authResult = await requireAdmin(request);
            if (!authResult.authenticated || !authResult.isAdmin) {
                return errorResponse(403, 'Admin access required');
            }

            const principal = getClientPrincipal(request);

            // GET /api/broadcast/groups - Get available target groups
            if (method === 'GET' && action === 'groups') {
                const groups = await getAllGroups();
                
                // Add "All Members" option
                const targets = [
                    { 
                        id: 'all', 
                        name: 'All Members', 
                        description: 'Send to all registered members',
                        memberCount: null 
                    },
                    ...groups.map(g => ({
                        id: g.id,
                        name: g.name,
                        description: `${g.city}, ${g.state}`,
                        memberCount: g.memberCount || 0
                    }))
                ];

                return successResponse({ targets });
            }

            // GET /api/broadcast/history - Get broadcast history
            if (method === 'GET' && action === 'history') {
                try {
                    const broadcastsContainer = getContainer(CONTAINERS.BROADCASTS);
                    const { resources: broadcasts } = await broadcastsContainer.items
                        .query('SELECT * FROM c ORDER BY c.sentAt DESC OFFSET 0 LIMIT 50')
                        .fetchAll();
                    return successResponse({ broadcasts });
                } catch (e) {
                    // Container might not exist yet
                    return successResponse({ broadcasts: [] });
                }
            }

            // POST /api/broadcast/send - Send broadcast notification
            if (method === 'POST' && action === 'send') {
                const body = await request.json();
                const { 
                    targetType, // 'all' or 'group'
                    targetGroupId, // group ID if targetType is 'group'
                    subject,
                    message,
                    channels // ['email', 'push'] - which channels to use
                } = body;

                // Validate required fields
                if (!targetType || !subject || !message) {
                    return errorResponse(400, 'Missing required fields: targetType, subject, message');
                }

                if (targetType === 'group' && !targetGroupId) {
                    return errorResponse(400, 'targetGroupId is required when targetType is "group"');
                }

                if (!channels || channels.length === 0) {
                    return errorResponse(400, 'At least one channel (email or push) must be selected');
                }

                context.log(`[BroadcastNotifications] Sending broadcast to ${targetType === 'all' ? 'all members' : targetGroupId}`);

                // Get recipients
                let recipients = [];
                let targetName = '';

                if (targetType === 'all') {
                    const users = await getAllUsers();
                    recipients = users.map(u => ({
                        email: u.email,
                        name: u.displayName || u.email.split('@')[0]
                    }));
                    targetName = 'All Members';
                } else if (targetType === 'group') {
                    // Get group info
                    const groupsContainer = getContainer(CONTAINERS.GROUPS);
                    try {
                        const { resource: group } = await groupsContainer.item(targetGroupId, targetGroupId).read();
                        targetName = group?.name || targetGroupId;
                    } catch (e) {
                        targetName = targetGroupId;
                    }

                    const members = await getGroupMembers(targetGroupId);
                    recipients = members.map(m => ({
                        email: m.userEmail,
                        name: m.userName || m.userEmail?.split('@')[0] || 'Member'
                    }));
                }

                if (recipients.length === 0) {
                    const targetDesc = targetType === 'all' ? 'all members' : `group "${targetName}"`;
                    return errorResponse(400, `No recipients found for ${targetDesc}. The target has no registered members.`);
                }

                context.log(`[BroadcastNotifications] Found ${recipients.length} recipients`);

                // Send notifications through selected channels
                const results = {
                    email: { sent: 0, failed: 0 },
                    push: { sent: 0, failed: 0 },
                    channel: { posted: false, messageId: null }
                };

                // Determine the community channel to post to
                // For group broadcasts, use the group channel (e.g., "group-seattle")
                // For all-member broadcasts, use the "announcements" channel
                const channelId = targetType === 'group' ? targetGroupId : 'announcements';
                const actionUrl = `/online?channel=${channelId}`;

                // Post to community channel (for push notifications, always post)
                if (channels.includes('push')) {
                    const channelPost = await postAnnouncementToChannel(
                        channelId,
                        subject,
                        message,
                        principal?.userDetails?.split('@')[0] || 'Admin',
                        principal?.userDetails || 'admin@somos.tech'
                    );
                    if (channelPost) {
                        results.channel = { posted: true, messageId: channelPost.id };
                        context.log(`[BroadcastNotifications] Posted to channel ${channelId}: ${channelPost.id}`);
                    }
                }

                // Send email notifications
                if (channels.includes('email')) {
                    const emailResult = await sendBroadcastNotification({
                        recipients: recipients.map(r => r.email).filter(Boolean),
                        subject,
                        message,
                        channel: 'email',
                        senderEmail: principal?.userDetails || 'admin@somos.tech'
                    });
                    results.email = emailResult;
                }

                // Send push/in-app notifications
                if (channels.includes('push')) {
                    let pushSent = 0;
                    let pushFailed = 0;

                    for (const recipient of recipients) {
                        try {
                            await createNotification({
                                type: 'broadcast',
                                title: `📢 ${subject}`,
                                message: message.length > 100 ? message.substring(0, 100) + '...' : message,
                                severity: 'info',
                                actionUrl: actionUrl,
                                metadata: {
                                    broadcastId: results.channel.messageId || `broadcast-${Date.now()}`,
                                    targetType,
                                    targetGroupId,
                                    channelId
                                },
                                recipientEmail: recipient.email,
                                createdBy: principal?.userDetails || 'admin'
                            });
                            pushSent++;
                        } catch (e) {
                            pushFailed++;
                            context.log(`[BroadcastNotifications] Failed to send push to ${recipient.email}:`, e.message);
                        }
                    }
                    results.push = { sent: pushSent, failed: pushFailed };
                }

                // Save broadcast record
                const broadcastRecord = {
                    id: `broadcast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    targetType,
                    targetGroupId: targetGroupId || null,
                    targetName,
                    subject,
                    message,
                    channels,
                    channelId,
                    channelMessageId: results.channel.messageId,
                    recipientCount: recipients.length,
                    results,
                    sentBy: principal?.userDetails || 'admin',
                    sentAt: new Date().toISOString()
                };

                try {
                    await saveBroadcast(broadcastRecord);
                } catch (e) {
                    context.log('[BroadcastNotifications] Error saving broadcast record:', e.message);
                    // Don't fail the request if saving the record fails
                }

                context.log(`[BroadcastNotifications] Broadcast sent: ${JSON.stringify(results)}`);

                return successResponse({
                    message: 'Broadcast sent successfully',
                    recipientCount: recipients.length,
                    results
                });
            }

            return errorResponse(400, 'Invalid action');

        } catch (error) {
            context.log.error('[BroadcastNotifications] ERROR:', error);
            return errorResponse(500, 'Internal server error', error.message);
        }
    }
});
