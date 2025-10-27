import { app } from '@azure/functions';
import sponsorService from '../shared/services/sponsorService.js';
import { successResponse, badRequestResponse, errorResponse, notFoundResponse } from '../shared/httpResponse.js';

app.http('CreateSponsor', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'sponsors',
    handler: async (request, context) => {
        try {
            context.log('Creating new sponsor');

            const body = await request.json();

            if (!body || !body.name) {
                return badRequestResponse('Sponsor name is required');
            }

            const newSponsor = await sponsorService.createSponsor(body);
            return successResponse(newSponsor, 201);
        } catch (error) {
            context.error('Error creating sponsor:', error);
            return badRequestResponse(error.message);
        }
    }
});

app.http('DeleteSponsor', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'sponsors/{id}',
    handler: async (request, context) => {
        try {
            const id = request.params.id;
            context.log(`Deleting sponsor with id: ${id}`);

            await sponsorService.deleteSponsor(id);
            return successResponse({ message: 'Sponsor deleted successfully' });
        } catch (error) {
            context.error('Error deleting sponsor:', error);
            return badRequestResponse(error.message);
        }
    }
});

app.http('GetAllSponsors', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'sponsors',
    handler: async (request, context) => {
        try {
            context.log('Getting all sponsors');
            const sponsors = await sponsorService.getSponsors();
            return successResponse(sponsors);
        } catch (error) {
            context.error('Error getting sponsors:', error);
            return errorResponse(error);
        }
    }
});

app.http('GetSponsorById', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'sponsors/{id}',
    handler: async (request, context) => {
        try {
            const id = request.params.id;
            context.log(`Getting sponsor with id: ${id}`);

            const sponsor = await sponsorService.getSponsorById(id);

            if (!sponsor) {
                return notFoundResponse('Sponsor not found');
            }

            return successResponse(sponsor);
        } catch (error) {
            context.error('Error getting sponsor:', error);
            return errorResponse(error);
        }
    }
});

app.http('UpdateSponsor', {
    methods: ['PUT', 'PATCH'],
    authLevel: 'anonymous',
    route: 'sponsors/{id}',
    handler: async (request, context) => {
        try {
            const id = request.params.id;
            context.log(`Updating sponsor with id: ${id}`);

            const body = await request.json();

            if (!body) {
                return badRequestResponse('Request body is required');
            }

            const updatedSponsor = await sponsorService.updateSponsor(id, body);
            return successResponse(updatedSponsor);
        } catch (error) {
            context.error('Error updating sponsor:', error);
            return badRequestResponse(error.message);
        }
    }
});
