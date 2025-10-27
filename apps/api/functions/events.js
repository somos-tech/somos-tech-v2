import { app } from '@azure/functions';
import eventService from '../shared/services/eventService.js';
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
