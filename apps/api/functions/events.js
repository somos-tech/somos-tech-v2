import { app } from '@azure/functions';
import eventService from '../shared/services/eventService.js';
import socialMediaService from '../shared/services/socialMediaService.js';
import { successResponse, errorResponse, badRequestResponse, notFoundResponse } from '../shared/httpResponse.js';

app.http('CreateEvent', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'events',
    handler: async (request, context) => {
        try {
            context.log('Creating new event');

            const body = await request.json();

            if (!body || !body.name || !body.date) {
                return badRequestResponse('Event name and date are required');
            }

            const newEvent = await eventService.createEvent(body);

            // Generate social media posts asynchronously (non-blocking)
            context.log(`Triggering social media post generation for event ${newEvent.id}`);
            socialMediaService.generatePostsAsync(newEvent, eventService);

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
            const id = request.params.id;
            context.log(`Deleting event with id: ${id}`);

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
            context.log('Getting all events');
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
            const id = request.params.id;
            context.log(`Getting event with id: ${id}`);

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
            const id = request.params.id;
            context.log(`Updating event with id: ${id}`);

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
            const id = request.params.id;
            context.log(`Regenerating social media posts for event: ${id}`);

            const event = await eventService.getEventById(id);

            if (!event) {
                return notFoundResponse('Event not found');
            }

            // Trigger regeneration asynchronously
            socialMediaService.generatePostsAsync(event, eventService);

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
