import { app } from '@azure/functions';
import { requireAuth, requireAdmin, logAuthEvent } from '../shared/authMiddleware.js';
import { getContainer } from '../shared/db.js';

// Use community-groups container (where the actual data is stored)
const containerId = 'community-groups';

/**
 * Groups API - CRUD operations for city/location groups
 * GET /api/groups - List all groups
 * GET /api/groups/:id - Get single group
 * POST /api/groups - Create new group
 * PUT /api/groups/:id - Update group
 * DELETE /api/groups/:id - Delete group
 */
app.http('groups', {
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    authLevel: 'anonymous',
    route: 'groups/{id?}',
    handler: async (request, context) => {
        try {
            const method = request.method;
            const groupId = request.params.id;

            // Check authentication for all operations
            // GET requires authentication, POST/PUT/DELETE require admin
            if (method === 'GET') {
                const authError = requireAuth(request);
                if (authError) {
                    logAuthEvent(context, request, 'GET_GROUPS', `groups/${groupId || 'all'}`, false);
                    return authError;
                }
                logAuthEvent(context, request, 'GET_GROUPS', `groups/${groupId || 'all'}`, true);
            } else {
                // POST, PUT, DELETE require admin
                const authError = requireAdmin(request);
                if (authError) {
                    logAuthEvent(context, request, `${method}_GROUP`, `groups/${groupId || ''}`, false);
                    return authError;
                }
                logAuthEvent(context, request, `${method}_GROUP`, `groups/${groupId || ''}`, true);
            }

            const container = getContainer(containerId);

            // GET - List all groups or get single group
            if (method === 'GET') {
                if (groupId) {
                    // Get single group
                    try {
                        const { resource: group } = await container.item(groupId, groupId).read();
                        if (!group) {
                            return {
                                status: 404,
                                jsonBody: { error: 'Group not found' }
                            };
                        }
                        return {
                            status: 200,
                            jsonBody: group
                        };
                    } catch (error) {
                        return {
                            status: 404,
                            jsonBody: { error: 'Group not found' }
                        };
                    }
                } else {
                    // List all groups
                    const querySpec = {
                        query: 'SELECT * FROM c ORDER BY c.city ASC'
                    };

                    const { resources: groups } = await container.items
                        .query(querySpec)
                        .fetchAll();

                    return {
                        status: 200,
                        jsonBody: groups
                    };
                }
            }

            // POST - Create new group
            if (method === 'POST') {
                const body = await request.json();

                // Validate required fields
                if (!body.city || !body.state || !body.imageUrl) {
                    return {
                        status: 400,
                        jsonBody: { error: 'Missing required fields: city, state, imageUrl' }
                    };
                }

                const newGroup = {
                    id: `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    name: body.name || `${body.city}, ${body.state}`,
                    city: body.city,
                    state: body.state,
                    visibility: body.visibility || 'Public',
                    imageUrl: body.imageUrl,
                    description: body.description || '',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                const { resource: createdGroup } = await container.items.create(newGroup);

                context.log(`Created group: ${createdGroup.id}`);

                return {
                    status: 201,
                    jsonBody: createdGroup
                };
            }

            // PUT - Update group
            if (method === 'PUT') {
                if (!groupId) {
                    return {
                        status: 400,
                        jsonBody: { error: 'Group ID is required' }
                    };
                }

                const body = await request.json();

                try {
                    // Get existing group
                    const { resource: existingGroup } = await container.item(groupId, groupId).read();

                    if (!existingGroup) {
                        return {
                            status: 404,
                            jsonBody: { error: 'Group not found' }
                        };
                    }

                    // Update group
                    const updatedGroup = {
                        ...existingGroup,
                        name: body.name || existingGroup.name,
                        city: body.city || existingGroup.city,
                        state: body.state || existingGroup.state,
                        visibility: body.visibility || existingGroup.visibility,
                        imageUrl: body.imageUrl || existingGroup.imageUrl,
                        description: body.description !== undefined ? body.description : existingGroup.description,
                        updatedAt: new Date().toISOString()
                    };

                    const { resource: result } = await container.item(groupId, groupId).replace(updatedGroup);

                    context.log(`Updated group: ${groupId}`);

                    return {
                        status: 200,
                        jsonBody: result
                    };
                } catch (error) {
                    return {
                        status: 404,
                        jsonBody: { error: 'Group not found' }
                    };
                }
            }

            // DELETE - Delete group
            if (method === 'DELETE') {
                if (!groupId) {
                    return {
                        status: 400,
                        jsonBody: { error: 'Group ID is required' }
                    };
                }

                try {
                    await container.item(groupId, groupId).delete();

                    context.log(`Deleted group: ${groupId}`);

                    return {
                        status: 204,
                        body: ''
                    };
                } catch (error) {
                    return {
                        status: 404,
                        jsonBody: { error: 'Group not found' }
                    };
                }
            }

            return {
                status: 405,
                jsonBody: { error: 'Method not allowed' }
            };

        } catch (error) {
            context.log.error('Error in groups API:', error);
            return {
                status: 500,
                jsonBody: { error: 'Internal server error', details: error.message }
            };
        }
    }
});
