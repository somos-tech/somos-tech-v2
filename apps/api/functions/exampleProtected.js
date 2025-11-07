import { app } from '@azure/functions';
import { validateToken, isAdmin, getOboToken } from '../shared/authMiddleware.js';
import { successResponse, errorResponse, badRequestResponse } from '../shared/httpResponse.js';

/**
 * Example protected endpoint that validates MSAL tokens
 */
app.http('GetUserProfile', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'profile',
    handler: async (request, context) => {
        try {
            // Validate the token
            const { isValid, user, error } = await validateToken(request);

            if (!isValid) {
                return errorResponse('Unauthorized: ' + (error || 'Invalid token'), 401);
            }

            context.log('Authenticated user:', user);

            return successResponse({
                userId: user.userId,
                email: user.email,
                name: user.name,
                roles: user.roles,
                isAdmin: isAdmin(user),
            });
        } catch (error) {
            context.error('Error getting user profile:', error);
            return errorResponse('Internal server error');
        }
    }
});

/**
 * Example admin-only endpoint
 */
app.http('AdminOnlyEndpoint', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'admin/test',
    handler: async (request, context) => {
        try {
            // Validate the token
            const { isValid, user, error } = await validateToken(request);

            if (!isValid) {
                return errorResponse('Unauthorized: ' + (error || 'Invalid token'), 401);
            }

            // Check admin role
            if (!isAdmin(user)) {
                return errorResponse('Forbidden: Admin access required', 403);
            }

            return successResponse({
                message: 'Admin access granted',
                user: user.email,
            });
        } catch (error) {
            context.error('Error in admin endpoint:', error);
            return errorResponse('Internal server error');
        }
    }
});

/**
 * Example using OBO flow to call Microsoft Graph
 */
app.http('GetUserGroups', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'user/groups',
    handler: async (request, context) => {
        try {
            // Validate the token
            const { isValid, user, error } = await validateToken(request);

            if (!isValid) {
                return errorResponse('Unauthorized: ' + (error || 'Invalid token'), 401);
            }

            // Get the user's access token for OBO flow
            const userToken = request.headers.get('authorization')?.substring(7);

            if (!userToken) {
                return errorResponse('No access token provided', 401);
            }

            // Exchange the user's token for a Graph API token
            const graphToken = await getOboToken(userToken, ['https://graph.microsoft.com/.default']);

            if (!graphToken) {
                return errorResponse('Failed to acquire Graph API token', 500);
            }

            // Call Microsoft Graph to get user's groups
            const graphResponse = await fetch('https://graph.microsoft.com/v1.0/me/memberOf', {
                headers: {
                    'Authorization': `Bearer ${graphToken}`,
                    'Content-Type': 'application/json',
                }
            });

            if (!graphResponse.ok) {
                throw new Error(`Graph API error: ${graphResponse.status}`);
            }

            const groups = await graphResponse.json();

            return successResponse({
                user: user.email,
                groups: groups.value,
            });
        } catch (error) {
            context.error('Error getting user groups:', error);
            return errorResponse('Internal server error');
        }
    }
});
