import { app } from '@azure/functions';
import venueService from '../shared/services/venueService.js';
import { successResponse, badRequestResponse, errorResponse, notFoundResponse } from '../shared/httpResponse.js';

app.http('CreateVenue', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'venues',
    handler: async (request, context) => {
        try {
            context.log('Creating new venue');

            const body = await request.json();

            if (!body || !body.name) {
                return badRequestResponse('Venue name is required');
            }

            const newVenue = await venueService.createVenue(body);
            return successResponse(newVenue, 201);
        } catch (error) {
            context.error('Error creating venue:', error);
            return badRequestResponse(error.message);
        }
    }
});

app.http('DeleteVenue', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'venues/{id}',
    handler: async (request, context) => {
        try {
            const id = request.params.id;
            context.log(`Deleting venue with id: ${id}`);

            await venueService.deleteVenue(id);
            return successResponse({ message: 'Venue deleted successfully' });
        } catch (error) {
            context.error('Error deleting venue:', error);
            return badRequestResponse(error.message);
        }
    }
});

app.http('GetAllVenues', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'venues',
    handler: async (request, context) => {
        try {
            context.log('Getting all venues');
            const venues = await venueService.getVenues();
            return successResponse(venues);
        } catch (error) {
            context.error('Error getting venues:', error);
            return errorResponse(error);
        }
    }
});

app.http('GetVenueById', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'venues/{id}',
    handler: async (request, context) => {
        try {
            const id = request.params.id;
            context.log(`Getting venue with id: ${id}`);

            const venue = await venueService.getVenueById(id);

            if (!venue) {
                return notFoundResponse('Venue not found');
            }

            return successResponse(venue);
        } catch (error) {
            context.error('Error getting venue:', error);
            return errorResponse(error);
        }
    }
});

app.http('UpdateVenue', {
    methods: ['PUT', 'PATCH'],
    authLevel: 'anonymous',
    route: 'venues/{id}',
    handler: async (request, context) => {
        try {
            const id = request.params.id;
            context.log(`Updating venue with id: ${id}`);

            const body = await request.json();

            if (!body) {
                return badRequestResponse('Request body is required');
            }

            const updatedVenue = await venueService.updateVenue(id, body);
            return successResponse(updatedVenue);
        } catch (error) {
            context.error('Error updating venue:', error);
            return badRequestResponse(error.message);
        }
    }
});