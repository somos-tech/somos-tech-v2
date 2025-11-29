/**
 * Community Groups API - Enhanced group management with chat functionality
 * 
 * Endpoints:
 * - GET /api/community-groups - List all groups
 * - GET /api/community-groups/:id - Get single group with details
 * - POST /api/community-groups - Create new group (admin only)
 * - PUT /api/community-groups/:id - Update group (admin only)
 * - DELETE /api/community-groups/:id - Delete group (admin only)
 * - POST /api/community-groups/:id/join - Join a group
 * - POST /api/community-groups/:id/leave - Leave a group
 * - GET /api/community-groups/:id/members - Get group members
 * - POST /api/community-groups/auto-assign - Auto-assign user to nearest city group
 * - GET /api/community-groups/my-groups - Get user's group memberships
 * 
 * @module communityGroups
 * @author SOMOS.tech
 */

import { app } from '@azure/functions';
import { requireAuth, requireAdmin, getClientPrincipal } from '../shared/authMiddleware.js';
import { getContainer } from '../shared/db.js';
import { successResponse, errorResponse } from '../shared/httpResponse.js';
import { assignUserToNearestGroup, getUserGroups, findNearestCity } from '../shared/services/locationService.js';

const CONTAINERS = {
    GROUPS: 'community-groups',
    MEMBERSHIPS: 'group-memberships',
    MESSAGES: 'group-messages',
    EVENTS: 'group-events'
};

/**
 * Generate URL-friendly slug from city and state
 */
function generateSlug(city, state) {
    return `${city}-${state}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/**
 * Main Community Groups Handler
 */
app.http('communityGroups', {
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    authLevel: 'anonymous',
    route: 'community-groups/{id?}/{action?}',
    handler: async (request, context) => {
        try {
            const method = request.method;
            const groupId = request.params.id;
            const action = request.params.action;

            context.log(`[CommunityGroups] ${method} /${groupId || ''}/${action || ''}`);

            const groupsContainer = getContainer(CONTAINERS.GROUPS);
            const membershipsContainer = getContainer(CONTAINERS.MEMBERSHIPS);

            // GET requests
            if (method === 'GET') {
                // Get user's memberships if authenticated
                let userMemberships = [];
                const principal = getClientPrincipal(request);
                if (principal?.userId) {
                    try {
                        const { resources } = await membershipsContainer.items
                            .query({
                                query: 'SELECT c.groupId FROM c WHERE c.userId = @userId',
                                parameters: [{ name: '@userId', value: principal.userId }]
                            })
                            .fetchAll();
                        userMemberships = resources.map(m => m.groupId);
                    } catch (e) {
                        context.log('[CommunityGroups] Error fetching memberships:', e.message);
                    }
                }

                // Get user's group memberships with full details
                if (groupId === 'my-groups') {
                    const authResult = await requireAuth(request);
                    if (!authResult.authenticated) {
                        return errorResponse(401, 'Authentication required');
                    }

                    const myMemberships = await getUserGroups(principal.userId);
                    
                    // Get full group details for each membership
                    const groupDetails = await Promise.all(
                        myMemberships.map(async (membership) => {
                            try {
                                const { resource: group } = await groupsContainer.item(membership.groupId, membership.groupId).read();
                                return {
                                    ...membership,
                                    group: group || null
                                };
                            } catch (e) {
                                return { ...membership, group: null };
                            }
                        })
                    );

                    return successResponse({
                        memberships: groupDetails.filter(m => m.group !== null),
                        total: groupDetails.filter(m => m.group !== null).length
                    });
                }

                // Get single group
                if (groupId && !action) {
                    try {
                        const { resource: group } = await groupsContainer.item(groupId, groupId).read();
                        if (!group) {
                            return errorResponse(404, 'Group not found');
                        }

                        // Check if user is member
                        const isMember = userMemberships.includes(groupId);

                        return successResponse({
                            ...group,
                            isMember,
                            userMemberships
                        });
                    } catch (error) {
                        return errorResponse(404, 'Group not found');
                    }
                }

                // Get group members
                if (groupId && action === 'members') {
                    const { resources: members } = await membershipsContainer.items
                        .query({
                            query: 'SELECT * FROM c WHERE c.groupId = @groupId ORDER BY c.joinedAt DESC',
                            parameters: [{ name: '@groupId', value: groupId }]
                        })
                        .fetchAll();

                    return successResponse({
                        members,
                        total: members.length
                    });
                }

                // List all groups
                const { resources: groups } = await groupsContainer.items
                    .query('SELECT * FROM c WHERE c.visibility = "Public" ORDER BY c.name ASC')
                    .fetchAll();

                return successResponse({
                    groups,
                    total: groups.length,
                    userMemberships
                });
            }

            // POST - Create group or perform actions
            if (method === 'POST') {
                // Auto-assign user to nearest city group
                if (groupId === 'auto-assign') {
                    const authResult = await requireAuth(request);
                    if (!authResult.authenticated) {
                        return errorResponse(401, 'Authentication required');
                    }

                    const principal = getClientPrincipal(request);
                    if (!principal?.userId) {
                        return errorResponse(400, 'User ID not found');
                    }

                    // Get location from request body
                    let location = null;
                    try {
                        const body = await request.json();
                        location = body.location || body;
                    } catch (e) {
                        return errorResponse(400, 'Location data required (latitude, longitude, city, region)');
                    }

                    if (!location.latitude && !location.city) {
                        return errorResponse(400, 'Location data required (latitude, longitude or city name)');
                    }

                    // First check if there's a nearby city
                    const nearbyCheck = location.latitude && location.longitude 
                        ? findNearestCity(location.latitude, location.longitude)
                        : null;

                    const result = await assignUserToNearestGroup(
                        {
                            id: principal.userId,
                            email: principal.userDetails || '',
                            displayName: principal.userDetails?.split('@')[0] || 'Member'
                        },
                        location
                    );

                    if (result?.assigned) {
                        context.log(`[CommunityGroups] Auto-assigned ${principal.userId} to ${result.groupName}`);
                        return successResponse({
                            assigned: true,
                            group: {
                                id: result.groupId,
                                name: result.groupName
                            },
                            distance: result.distance,
                            method: result.method,
                            alreadyMember: result.alreadyMember,
                            nearestCity: nearbyCheck
                        });
                    } else {
                        return successResponse({
                            assigned: false,
                            message: 'No suitable group found for your location',
                            nearestCity: nearbyCheck
                        });
                    }
                }

                // Join group
                if (groupId && action === 'join') {
                    const authResult = await requireAuth(request);
                    if (!authResult.authenticated) {
                        return errorResponse(401, 'Authentication required');
                    }

                    const principal = getClientPrincipal(request);
                    if (!principal?.userId) {
                        return errorResponse(400, 'User ID not found');
                    }

                    // Check if already a member
                    const { resources: existing } = await membershipsContainer.items
                        .query({
                            query: 'SELECT * FROM c WHERE c.groupId = @groupId AND c.userId = @userId',
                            parameters: [
                                { name: '@groupId', value: groupId },
                                { name: '@userId', value: principal.userId }
                            ]
                        })
                        .fetchAll();

                    if (existing.length > 0) {
                        return errorResponse(400, 'Already a member of this group');
                    }

                    // Get group to verify it exists
                    try {
                        const { resource: group } = await groupsContainer.item(groupId, groupId).read();
                        if (!group) {
                            return errorResponse(404, 'Group not found');
                        }

                        // Create membership
                        const membership = {
                            id: `membership-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            groupId,
                            userId: principal.userId,
                            userEmail: principal.userDetails || '',
                            userName: principal.userDetails?.split('@')[0] || 'Member',
                            userPhoto: null,
                            role: 'member',
                            joinedAt: new Date().toISOString(),
                            lastActiveAt: new Date().toISOString(),
                            notificationsEnabled: true
                        };

                        await membershipsContainer.items.create(membership);

                        // Update member count
                        group.memberCount = (group.memberCount || 0) + 1;
                        group.updatedAt = new Date().toISOString();
                        await groupsContainer.item(groupId, groupId).replace(group);

                        context.log(`[CommunityGroups] User ${principal.userId} joined group ${groupId}`);

                        return successResponse({ message: 'Successfully joined group', membership });
                    } catch (error) {
                        return errorResponse(404, 'Group not found');
                    }
                }

                // Leave group
                if (groupId && action === 'leave') {
                    const authResult = await requireAuth(request);
                    if (!authResult.authenticated) {
                        return errorResponse(401, 'Authentication required');
                    }

                    const principal = getClientPrincipal(request);
                    if (!principal?.userId) {
                        return errorResponse(400, 'User ID not found');
                    }

                    // Find membership
                    const { resources: memberships } = await membershipsContainer.items
                        .query({
                            query: 'SELECT * FROM c WHERE c.groupId = @groupId AND c.userId = @userId',
                            parameters: [
                                { name: '@groupId', value: groupId },
                                { name: '@userId', value: principal.userId }
                            ]
                        })
                        .fetchAll();

                    if (memberships.length === 0) {
                        return errorResponse(400, 'Not a member of this group');
                    }

                    const membership = memberships[0];

                    // Delete membership
                    await membershipsContainer.item(membership.id, membership.id).delete();

                    // Update member count
                    try {
                        const { resource: group } = await groupsContainer.item(groupId, groupId).read();
                        if (group) {
                            group.memberCount = Math.max(0, (group.memberCount || 1) - 1);
                            group.updatedAt = new Date().toISOString();
                            await groupsContainer.item(groupId, groupId).replace(group);
                        }
                    } catch (e) {
                        context.log('[CommunityGroups] Error updating member count:', e.message);
                    }

                    context.log(`[CommunityGroups] User ${principal.userId} left group ${groupId}`);

                    return successResponse({ message: 'Successfully left group' });
                }

                // Create new group (admin only)
                const authResult = await requireAdmin(request);
                if (!authResult.authenticated || !authResult.isAdmin) {
                    return errorResponse(403, 'Admin access required');
                }

                const body = await request.json();

                if (!body.city || !body.state || !body.imageUrl) {
                    return errorResponse(400, 'Missing required fields: city, state, imageUrl');
                }

                const principal = getClientPrincipal(request);
                const slug = generateSlug(body.city, body.state);

                const newGroup = {
                    id: `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    name: body.name || `${body.city}, ${body.state}`,
                    city: body.city,
                    state: body.state,
                    slug,
                    visibility: body.visibility || 'Public',
                    imageUrl: body.imageUrl,
                    thumbnailUrl: body.thumbnailUrl || body.imageUrl,
                    description: body.description || `Welcome to the ${body.city}, ${body.state} SOMOS community!`,
                    memberCount: 0,
                    timezone: body.timezone || 'America/Los_Angeles',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    createdBy: principal?.userDetails || 'system'
                };

                const { resource: createdGroup } = await groupsContainer.items.create(newGroup);

                context.log(`[CommunityGroups] Created group: ${createdGroup.id} - ${createdGroup.name}`);

                return successResponse(createdGroup, 201);
            }

            // PUT - Update group (admin only)
            if (method === 'PUT') {
                if (!groupId) {
                    return errorResponse(400, 'Group ID is required');
                }

                const authResult = await requireAdmin(request);
                if (!authResult.authenticated || !authResult.isAdmin) {
                    return errorResponse(403, 'Admin access required');
                }

                const body = await request.json();

                try {
                    const { resource: group } = await groupsContainer.item(groupId, groupId).read();
                    if (!group) {
                        return errorResponse(404, 'Group not found');
                    }

                    const updatedGroup = {
                        ...group,
                        name: body.name || group.name,
                        city: body.city || group.city,
                        state: body.state || group.state,
                        visibility: body.visibility || group.visibility,
                        imageUrl: body.imageUrl || group.imageUrl,
                        thumbnailUrl: body.thumbnailUrl || group.thumbnailUrl,
                        description: body.description !== undefined ? body.description : group.description,
                        discordUrl: body.discordUrl !== undefined ? body.discordUrl : group.discordUrl,
                        instagramUrl: body.instagramUrl !== undefined ? body.instagramUrl : group.instagramUrl,
                        linkedinUrl: body.linkedinUrl !== undefined ? body.linkedinUrl : group.linkedinUrl,
                        updatedAt: new Date().toISOString()
                    };

                    // Update slug if city/state changed
                    if (body.city || body.state) {
                        updatedGroup.slug = generateSlug(updatedGroup.city, updatedGroup.state);
                    }

                    const { resource: result } = await groupsContainer.item(groupId, groupId).replace(updatedGroup);

                    context.log(`[CommunityGroups] Updated group: ${groupId}`);

                    return successResponse(result);
                } catch (error) {
                    return errorResponse(404, 'Group not found');
                }
            }

            // DELETE - Delete group (admin only)
            if (method === 'DELETE') {
                if (!groupId) {
                    return errorResponse(400, 'Group ID is required');
                }

                const authResult = await requireAdmin(request);
                if (!authResult.authenticated || !authResult.isAdmin) {
                    return errorResponse(403, 'Admin access required');
                }

                try {
                    await groupsContainer.item(groupId, groupId).delete();

                    // Also delete all memberships for this group
                    const { resources: memberships } = await membershipsContainer.items
                        .query({
                            query: 'SELECT c.id FROM c WHERE c.groupId = @groupId',
                            parameters: [{ name: '@groupId', value: groupId }]
                        })
                        .fetchAll();

                    for (const m of memberships) {
                        try {
                            await membershipsContainer.item(m.id, m.id).delete();
                        } catch (e) {
                            context.log(`[CommunityGroups] Error deleting membership ${m.id}:`, e.message);
                        }
                    }

                    context.log(`[CommunityGroups] Deleted group: ${groupId}`);

                    return successResponse({ message: 'Group deleted successfully' });
                } catch (error) {
                    return errorResponse(404, 'Group not found');
                }
            }

            return errorResponse(405, 'Method not allowed');

        } catch (error) {
            context.log.error('[CommunityGroups] Error:', error);
            return errorResponse(500, 'Internal server error', error.message);
        }
    }
});
