import { app } from '@azure/functions';
import eventService from '../shared/services/eventService.js';
import socialMediaService from '../shared/services/socialMediaService.js';
import venueAgentService from '../shared/services/venueAgentService.js';
import { successResponse, errorResponse, badRequestResponse, notFoundResponse } from '../shared/httpResponse.js';
import { requireAuth, requireAdmin, logAuthEvent } from '../shared/authMiddleware.js';

/**
 * Extract user access token from Azure Static Web Apps authentication headers
 * This token can be used for On-Behalf-Of authentication flow
 */
function extractUserAccessToken(request) {
    // Try to get token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }

    // For Static Web Apps, you might also get it from x-ms-token-aad-access-token
    const swaToken = request.headers.get('x-ms-token-aad-access-token');
    if (swaToken) {
        return swaToken;
    }

    return null;
}

app.http('CreateEvent', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'events',
    handler: async (request, context) => {
        try {
            // Require admin authentication
            const authError = requireAdmin(request);
            if (authError) {
                logAuthEvent(context, request, 'CREATE_EVENT', 'events', false);
                return authError;
            }

            context.log('Creating new event');
            logAuthEvent(context, request, 'CREATE_EVENT', 'events', true);

            const body = await request.json();

            if (!body || !body.name || !body.date) {
                return badRequestResponse('Event name and date are required');
            }

            const userAccessToken = extractUserAccessToken(request);

            if (userAccessToken) {
                context.log('Using On-Behalf-Of authentication with user token');
            } else {
                context.log('Using ManagedIdentity/DefaultAzureCredential (no user token found)');
            }

            const newEvent = await eventService.createEvent(body);

            // Generate social media posts asynchronously (non-blocking)
            context.log(`Triggering social media post generation for event ${newEvent.id}`);
            socialMediaService.generatePostsAsync(newEvent, eventService, userAccessToken);

            // Generate venue recommendations asynchronously (non-blocking)
            context.log(`Triggering venue search for event ${newEvent.id}`);
            venueAgentService.generateVenuesAsync(newEvent, eventService, userAccessToken);

            return successResponse(newEvent, 201);
        } catch (error) {
            context.error('Error creating event:', error);
            return badRequestResponse(error.message);
        }
    }
});

app.http('DeleteEvent', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'events/{id}',
    handler: async (request, context) => {
        try {
            // Require admin authentication
            const authError = requireAdmin(request);
            if (authError) {
                logAuthEvent(context, request, 'DELETE_EVENT', `events/${request.params.id}`, false);
                return authError;
            }

            const id = request.params.id;
            context.log(`Deleting event with id: ${id}`);
            logAuthEvent(context, request, 'DELETE_EVENT', `events/${id}`, true);

            await eventService.deleteEvent(id);
            return successResponse({ message: 'Event deleted successfully' });
        } catch (error) {
            context.error('Error deleting event:', error);
            return badRequestResponse(error.message);
        }
    }
});

app.http('GetAllEvents', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'events',
    handler: async (request, context) => {
        try {
            // Require authentication for viewing events
            const authError = requireAuth(request);
            if (authError) {
                logAuthEvent(context, request, 'GET_EVENTS', 'events', false);
                return authError;
            }

            context.log('Getting all events');
            logAuthEvent(context, request, 'GET_EVENTS', 'events', true);
            const events = await eventService.getEvents();
            return successResponse(events);
        } catch (error) {
            context.error('Error getting events:', error);
            return errorResponse(error);
        }
    }
});

app.http('GetEventById', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'events/{id}',
    handler: async (request, context) => {
        try {
            // Require authentication for viewing events
            const authError = requireAuth(request);
            if (authError) {
                logAuthEvent(context, request, 'GET_EVENT', `events/${request.params.id}`, false);
                return authError;
            }

            const id = request.params.id;
            context.log(`Getting event with id: ${id}`);
            logAuthEvent(context, request, 'GET_EVENT', `events/${id}`, true);

            const event = await eventService.getEventById(id);

            if (!event) {
                return notFoundResponse('Event not found');
            }

            return successResponse(event);
        } catch (error) {
            context.error('Error getting event:', error);
            return errorResponse(error);
        }
    }
});

app.http('UpdateEvent', {
    methods: ['PUT', 'PATCH'],
    authLevel: 'anonymous',
    route: 'events/{id}',
    handler: async (request, context) => {
        try {
            // Require admin authentication
            const authError = requireAdmin(request);
            if (authError) {
                logAuthEvent(context, request, 'UPDATE_EVENT', `events/${request.params.id}`, false);
                return authError;
            }

            const id = request.params.id;
            context.log(`Updating event with id: ${id}`);
            logAuthEvent(context, request, 'UPDATE_EVENT', `events/${id}`, true);

            const body = await request.json();

            if (!body) {
                return badRequestResponse('Request body is required');
            }

            const updatedEvent = await eventService.updateEvent(id, body);
            return successResponse(updatedEvent);
        } catch (error) {
            context.error('Error updating event:', error);
            return badRequestResponse(error.message);
        }
    }
});

app.http('GetSocialMediaPosts', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'events/{id}/social-media-posts',
    handler: async (request, context) => {
        try {
            // Require authentication
            const authError = requireAuth(request);
            if (authError) {
                return authError;
            }

            const id = request.params.id;
            context.log(`Getting social media posts for event: ${id}`);

            const event = await eventService.getEventById(id);

            if (!event) {
                return notFoundResponse('Event not found');
            }

            return successResponse(event.socialMediaPosts || null);
        } catch (error) {
            context.error('Error getting social media posts:', error);
            return errorResponse(error);
        }
    }
});

app.http('RegenerateSocialMediaPosts', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'events/{id}/regenerate-social-media-posts',
    handler: async (request, context) => {
        try {
            // Require admin authentication
            const authError = requireAdmin(request);
            if (authError) {
                return authError;
            }

            const id = request.params.id;
            context.log(`Regenerating social media posts for event: ${id}`);

            const event = await eventService.getEventById(id);

            if (!event) {
                return notFoundResponse('Event not found');
            }

            const userAccessToken = extractUserAccessToken(request);

            // Trigger regeneration asynchronously
            socialMediaService.generatePostsAsync(event, eventService, userAccessToken);

            return successResponse({ message: 'Social media posts regeneration started' });
        } catch (error) {
            context.error('Error regenerating social media posts:', error);
            return errorResponse(error);
        }
    }
});

app.http('CheckSocialMediaPostsStatus', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'events/{id}/social-media-posts-status',
    handler: async (request, context) => {
        try {
            // Require authentication
            const authError = requireAuth(request);
            if (authError) {
                return authError;
            }

            const id = request.params.id;
            context.log(`Checking social media posts status for event: ${id}`);

            const event = await eventService.getEventById(id);

            if (!event) {
                return notFoundResponse('Event not found');
            }

            // If status is in-progress and we have agent run details, check the actual status
            if (event.socialMediaPostsStatus === 'in-progress' && event.socialMediaAgentThreadId && event.socialMediaAgentRunId) {
                const result = await socialMediaService.checkAgentRunStatus(event, eventService);

                // Fetch the updated event to return the latest data
                const updatedEvent = await eventService.getEventById(id);

                return successResponse({
                    status: updatedEvent.socialMediaPostsStatus,
                    posts: updatedEvent.socialMediaPosts,
                    error: updatedEvent.socialMediaAgentError,
                    agentRunStatus: result.status
                });
            }

            // Otherwise just return the current status
            return successResponse({
                status: event.socialMediaPostsStatus || 'idle',
                posts: event.socialMediaPosts,
                error: event.socialMediaAgentError
            });
        } catch (error) {
            context.error('Error checking social media posts status:', error);
            return errorResponse(error);
        }
    }
});

app.http('GetVenueRecommendations', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'events/{id}/venue-recommendations',
    handler: async (request, context) => {
        try {
            // Require authentication
            const authError = requireAuth(request);
            if (authError) {
                return authError;
            }

            const id = request.params.id;
            context.log(`Getting venue recommendations for event: ${id}`);

            const event = await eventService.getEventById(id);

            if (!event) {
                return notFoundResponse('Event not found');
            }

            return successResponse(event.venueRecommendations || null);
        } catch (error) {
            context.error('Error getting venue recommendations:', error);
            return errorResponse(error);
        }
    }
});

app.http('RegenerateVenueRecommendations', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'events/{id}/regenerate-venue-recommendations',
    handler: async (request, context) => {
        try {
            // Require admin authentication
            const authError = requireAdmin(request);
            if (authError) {
                return authError;
            }

            const id = request.params.id;
            context.log(`Regenerating venue recommendations for event: ${id}`);

            const event = await eventService.getEventById(id);

            if (!event) {
                return notFoundResponse('Event not found');
            }

            const userAccessToken = extractUserAccessToken(request);

            // Trigger regeneration asynchronously
            venueAgentService.generateVenuesAsync(event, eventService, userAccessToken);

            return successResponse({ message: 'Venue recommendations regeneration started' });
        } catch (error) {
            context.error('Error regenerating venue recommendations:', error);
            return errorResponse(error);
        }
    }
});

app.http('CheckVenueRecommendationsStatus', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'events/{id}/venue-recommendations-status',
    handler: async (request, context) => {
        try {
            // Require authentication
            const authError = requireAuth(request);
            if (authError) {
                return authError;
            }

            const id = request.params.id;
            context.log(`Checking venue recommendations status for event: ${id}`);

            const event = await eventService.getEventById(id);

            if (!event) {
                return notFoundResponse('Event not found');
            }

            // If status is in-progress and we have agent run details, check the actual status
            if (event.venueAgentStatus === 'in-progress' && event.venueAgentThreadId && event.venueAgentRunId) {
                const result = await venueAgentService.checkAgentRunStatus(event, eventService);

                // Fetch the updated event to return the latest data
                const updatedEvent = await eventService.getEventById(id);

                return successResponse({
                    status: updatedEvent.venueAgentStatus,
                    venues: updatedEvent.venueRecommendations,
                    error: updatedEvent.venueAgentError,
                    agentRunStatus: result.status
                });
            }

            // Otherwise just return the current status
            return successResponse({
                status: event.venueAgentStatus || 'idle',
                venues: event.venueRecommendations,
                error: event.venueAgentError
            });
        } catch (error) {
            context.error('Error checking venue recommendations status:', error);
            return errorResponse(error);
        }
    }
});
