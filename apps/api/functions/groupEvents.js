/**
 * Group Events API - Event calendar functionality for community groups
 * 
 * Endpoints:
 * - GET /api/group-events/:groupId - Get events for a group
 * - POST /api/group-events/:groupId - Create an event (admin/moderator)
 * - PUT /api/group-events/:groupId/:eventId - Update an event
 * - DELETE /api/group-events/:groupId/:eventId - Delete an event
 * - POST /api/group-events/:groupId/:eventId/rsvp - RSVP to an event
 * 
 * @module groupEvents
 * @author SOMOS.tech
 */

import { app } from '@azure/functions';
import { requireAuth, getClientPrincipal } from '../shared/authMiddleware.js';
import { getContainer } from '../shared/db.js';
import { successResponse, errorResponse } from '../shared/httpResponse.js';

const CONTAINERS = {
    EVENTS: 'group-events',
    RSVPS: 'group-event-rsvps',
    MEMBERSHIPS: 'group-memberships'
};

/**
 * Get user's role in a group
 */
async function getUserRole(userId, groupId, membershipsContainer) {
    const { resources } = await membershipsContainer.items
        .query({
            query: 'SELECT c.role FROM c WHERE c.groupId = @groupId AND c.userId = @userId',
            parameters: [
                { name: '@groupId', value: groupId },
                { name: '@userId', value: userId }
            ]
        })
        .fetchAll();
    return resources.length > 0 ? resources[0].role : null;
}

/**
 * Check if user can manage events
 */
function canManageEvents(role) {
    return ['owner', 'admin', 'moderator'].includes(role);
}

/**
 * Group Events Handler
 */
app.http('groupEvents', {
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    authLevel: 'anonymous',
    route: 'group-events/{groupId}/{eventId?}/{action?}',
    handler: async (request, context) => {
        try {
            const method = request.method;
            const groupId = request.params.groupId;
            const eventId = request.params.eventId;
            const action = request.params.action;

            context.log(`[GroupEvents] ${method} /group-events/${groupId}/${eventId || ''}/${action || ''}`);

            if (!groupId) {
                return errorResponse(400, 'Group ID is required');
            }

            const eventsContainer = getContainer(CONTAINERS.EVENTS);
            const rsvpsContainer = getContainer(CONTAINERS.RSVPS);
            const membershipsContainer = getContainer(CONTAINERS.MEMBERSHIPS);

            // GET - Fetch events (public for group members)
            if (method === 'GET') {
                const url = new URL(request.url);
                const upcoming = url.searchParams.get('upcoming') === 'true';
                const past = url.searchParams.get('past') === 'true';

                let query = 'SELECT * FROM c WHERE c.groupId = @groupId';
                const parameters = [{ name: '@groupId', value: groupId }];
                const now = new Date().toISOString();

                if (upcoming) {
                    query += ' AND c.startDate >= @now';
                    parameters.push({ name: '@now', value: now });
                    query += ' ORDER BY c.startDate ASC';
                } else if (past) {
                    query += ' AND c.startDate < @now';
                    parameters.push({ name: '@now', value: now });
                    query += ' ORDER BY c.startDate DESC';
                } else {
                    query += ' ORDER BY c.startDate ASC';
                }

                const { resources: events } = await eventsContainer.items
                    .query({ query, parameters })
                    .fetchAll();

                // Get user's RSVPs if authenticated
                let userRsvps = {};
                const principal = getClientPrincipal(request);
                if (principal?.userId) {
                    try {
                        const { resources: rsvps } = await rsvpsContainer.items
                            .query({
                                query: 'SELECT c.eventId, c.status FROM c WHERE c.groupId = @groupId AND c.userId = @userId',
                                parameters: [
                                    { name: '@groupId', value: groupId },
                                    { name: '@userId', value: principal.userId }
                                ]
                            })
                            .fetchAll();

                        userRsvps = rsvps.reduce((acc, r) => {
                            acc[r.eventId] = r.status;
                            return acc;
                        }, {});
                    } catch (e) {
                        // Continue without RSVPs
                    }
                }

                // Add RSVP status to events
                const eventsWithRsvp = events.map(event => ({
                    ...event,
                    userRsvp: userRsvps[event.id] || null
                }));

                return successResponse({
                    events: eventsWithRsvp,
                    total: events.length
                });
            }

            // All other operations require authentication
            const authResult = await requireAuth(request);
            if (!authResult.authenticated) {
                return errorResponse(401, 'Authentication required');
            }

            const principal = getClientPrincipal(request);
            if (!principal?.userId) {
                return errorResponse(400, 'User ID not found');
            }

            // POST - Create event or RSVP
            if (method === 'POST') {
                // RSVP to an event
                if (eventId && action === 'rsvp') {
                    const body = await request.json();
                    const status = body.status; // 'going', 'maybe', 'not-going'

                    if (!['going', 'maybe', 'not-going'].includes(status)) {
                        return errorResponse(400, 'Invalid RSVP status');
                    }

                    // Check if event exists
                    try {
                        const { resource: event } = await eventsContainer.item(eventId, eventId).read();
                        if (!event || event.groupId !== groupId) {
                            return errorResponse(404, 'Event not found');
                        }

                        // Check if already RSVP'd
                        const { resources: existing } = await rsvpsContainer.items
                            .query({
                                query: 'SELECT * FROM c WHERE c.eventId = @eventId AND c.userId = @userId',
                                parameters: [
                                    { name: '@eventId', value: eventId },
                                    { name: '@userId', value: principal.userId }
                                ]
                            })
                            .fetchAll();

                        let rsvp;
                        let wasGoing = false;
                        let isNowGoing = status === 'going';

                        if (existing.length > 0) {
                            // Update existing RSVP
                            rsvp = existing[0];
                            wasGoing = rsvp.status === 'going';
                            rsvp.status = status;
                            rsvp.updatedAt = new Date().toISOString();
                            await rsvpsContainer.item(rsvp.id, rsvp.id).replace(rsvp);
                        } else {
                            // Create new RSVP
                            rsvp = {
                                id: `rsvp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                eventId,
                                groupId,
                                userId: principal.userId,
                                userName: principal.userDetails?.split('@')[0] || 'Member',
                                userPhoto: null,
                                status,
                                createdAt: new Date().toISOString()
                            };
                            await rsvpsContainer.items.create(rsvp);
                        }

                        // Update attendee count
                        if (wasGoing !== isNowGoing) {
                            event.attendeeCount = event.attendeeCount || 0;
                            if (isNowGoing && !wasGoing) {
                                event.attendeeCount++;
                            } else if (!isNowGoing && wasGoing) {
                                event.attendeeCount = Math.max(0, event.attendeeCount - 1);
                            }
                            await eventsContainer.item(eventId, eventId).replace(event);
                        }

                        context.log(`[GroupEvents] RSVP ${status} for event ${eventId} by ${principal.userId}`);

                        return successResponse({
                            rsvp,
                            attendeeCount: event.attendeeCount
                        });
                    } catch (error) {
                        return errorResponse(404, 'Event not found');
                    }
                }

                // Create new event (admin/moderator only)
                const role = await getUserRole(principal.userId, groupId, membershipsContainer);
                if (!canManageEvents(role)) {
                    return errorResponse(403, 'Only admins and moderators can create events');
                }

                const body = await request.json();

                if (!body.title || !body.startDate || !body.location) {
                    return errorResponse(400, 'Missing required fields: title, startDate, location');
                }

                const newEvent = {
                    id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    groupId,
                    title: body.title.slice(0, 200),
                    description: (body.description || '').slice(0, 2000),
                    imageUrl: body.imageUrl || null,
                    startDate: body.startDate,
                    endDate: body.endDate || null,
                    location: body.location,
                    isVirtual: body.isVirtual || false,
                    virtualLink: body.virtualLink || null,
                    maxAttendees: body.maxAttendees || null,
                    attendeeCount: 0,
                    createdAt: new Date().toISOString(),
                    createdBy: principal.userId
                };

                const { resource: created } = await eventsContainer.items.create(newEvent);

                context.log(`[GroupEvents] Created event ${created.id} in group ${groupId}`);

                return successResponse(created, 201);
            }

            // PUT - Update event
            if (method === 'PUT') {
                if (!eventId) {
                    return errorResponse(400, 'Event ID is required');
                }

                const role = await getUserRole(principal.userId, groupId, membershipsContainer);
                if (!canManageEvents(role)) {
                    return errorResponse(403, 'Only admins and moderators can update events');
                }

                const body = await request.json();

                try {
                    const { resource: event } = await eventsContainer.item(eventId, eventId).read();
                    if (!event || event.groupId !== groupId) {
                        return errorResponse(404, 'Event not found');
                    }

                    const updatedEvent = {
                        ...event,
                        title: body.title || event.title,
                        description: body.description !== undefined ? body.description : event.description,
                        imageUrl: body.imageUrl !== undefined ? body.imageUrl : event.imageUrl,
                        startDate: body.startDate || event.startDate,
                        endDate: body.endDate !== undefined ? body.endDate : event.endDate,
                        location: body.location || event.location,
                        isVirtual: body.isVirtual !== undefined ? body.isVirtual : event.isVirtual,
                        virtualLink: body.virtualLink !== undefined ? body.virtualLink : event.virtualLink,
                        maxAttendees: body.maxAttendees !== undefined ? body.maxAttendees : event.maxAttendees,
                        updatedAt: new Date().toISOString()
                    };

                    const { resource: result } = await eventsContainer.item(eventId, eventId).replace(updatedEvent);

                    context.log(`[GroupEvents] Updated event ${eventId}`);

                    return successResponse(result);
                } catch (error) {
                    return errorResponse(404, 'Event not found');
                }
            }

            // DELETE - Delete event
            if (method === 'DELETE') {
                if (!eventId) {
                    return errorResponse(400, 'Event ID is required');
                }

                const role = await getUserRole(principal.userId, groupId, membershipsContainer);
                if (!canManageEvents(role)) {
                    return errorResponse(403, 'Only admins and moderators can delete events');
                }

                try {
                    await eventsContainer.item(eventId, eventId).delete();

                    // Delete all RSVPs for this event
                    const { resources: rsvps } = await rsvpsContainer.items
                        .query({
                            query: 'SELECT c.id FROM c WHERE c.eventId = @eventId',
                            parameters: [{ name: '@eventId', value: eventId }]
                        })
                        .fetchAll();

                    for (const rsvp of rsvps) {
                        try {
                            await rsvpsContainer.item(rsvp.id, rsvp.id).delete();
                        } catch (e) {
                            // Continue
                        }
                    }

                    context.log(`[GroupEvents] Deleted event ${eventId}`);

                    return successResponse({ message: 'Event deleted' });
                } catch (error) {
                    return errorResponse(404, 'Event not found');
                }
            }

            return errorResponse(405, 'Method not allowed');

        } catch (error) {
            context.log.error('[GroupEvents] Error:', error);
            return errorResponse(500, 'Internal server error', error.message);
        }
    }
});
