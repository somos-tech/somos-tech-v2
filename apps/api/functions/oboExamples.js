// Example: Calling Microsoft Graph on behalf of the user
import { app } from '@azure/functions';
import { validateToken, getOboToken } from '../shared/authMiddleware.js';
import { successResponse, errorResponse } from '../shared/httpResponse.js';

/**
 * Get user's calendar events using OBO flow
 */
app.http('GetUserCalendar', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'calendar',
    handler: async (request, context) => {
        // Step 1: Validate the incoming token
        const { isValid, user, error } = await validateToken(request);

        if (!isValid) {
            return errorResponse('Unauthorized: ' + error, 401);
        }

        try {
            // Step 2: Get the user's access token
            const userToken = request.headers.get('authorization')?.substring(7);

            if (!userToken) {
                return errorResponse('No access token', 401);
            }

            // Step 3: Exchange for Graph API token using OBO
            const graphToken = await getOboToken(
                userToken,
                ['https://graph.microsoft.com/.default']
            );

            if (!graphToken) {
                return errorResponse('Failed to get Graph token', 500);
            }

            // Step 4: Call Microsoft Graph API
            const response = await fetch(
                'https://graph.microsoft.com/v1.0/me/calendar/events',
                {
                    headers: {
                        'Authorization': `Bearer ${graphToken}`,
                        'Content-Type': 'application/json',
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Graph API error: ${response.status}`);
            }

            const events = await response.json();

            // Step 5: Return the data
            return successResponse({
                user: user.email,
                eventsCount: events.value.length,
                events: events.value,
            });

        } catch (error) {
            context.error('Error calling Graph API:', error);
            return errorResponse('Failed to get calendar events');
        }
    }
});

/**
 * Call a custom downstream API with OBO
 */
app.http('CallCustomAPI', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'downstream/custom',
    handler: async (request, context) => {
        const { isValid, user } = await validateToken(request);

        if (!isValid) {
            return errorResponse('Unauthorized', 401);
        }

        try {
            const userToken = request.headers.get('authorization')?.substring(7);

            // Exchange for custom API token
            // Scope should match your downstream API's App ID URI
            const customApiToken = await getOboToken(
                userToken,
                ['api://your-downstream-api-client-id/.default']
            );

            if (!customApiToken) {
                return errorResponse('Failed to get custom API token', 500);
            }

            // Call your custom API
            const response = await fetch('https://your-custom-api.com/endpoint', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${customApiToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: user.userId,
                    // your data
                })
            });

            const data = await response.json();
            return successResponse(data);

        } catch (error) {
            context.error('Error calling custom API:', error);
            return errorResponse('Failed to call downstream service');
        }
    }
});

/**
 * Example: Update user profile in Microsoft Graph
 */
app.http('UpdateUserProfile', {
    methods: ['PATCH'],
    authLevel: 'anonymous',
    route: 'profile/update',
    handler: async (request, context) => {
        const { isValid, user } = await validateToken(request);

        if (!isValid) {
            return errorResponse('Unauthorized', 401);
        }

        try {
            const body = await request.json();
            const userToken = request.headers.get('authorization')?.substring(7);

            // Get Graph token with specific permissions
            const graphToken = await getOboToken(
                userToken,
                ['https://graph.microsoft.com/User.ReadWrite']
            );

            if (!graphToken) {
                return errorResponse('Failed to get Graph token', 500);
            }

            // Update user profile
            const response = await fetch('https://graph.microsoft.com/v1.0/me', {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${graphToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    displayName: body.displayName,
                    jobTitle: body.jobTitle,
                    // other fields
                })
            });

            if (!response.ok) {
                throw new Error(`Graph API error: ${response.status}`);
            }

            const updatedUser = await response.json();
            return successResponse(updatedUser);

        } catch (error) {
            context.error('Error updating profile:', error);
            return errorResponse('Failed to update profile');
        }
    }
});
