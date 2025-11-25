import { app } from '@azure/functions';
import { getContainer } from '../shared/db.js';
import { successResponse, errorResponse } from '../shared/httpResponse.js';

const containerId = 'admin-users';

/**
 * Check if a user is an admin
 * This endpoint is called by the frontend to determine admin status
 * It uses the x-ms-client-principal header to get the current user's email
 */
app.http('checkAdmin', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'check-admin',
    handler: async (request, context) => {
        try {
            // Get the client principal from the Static Web App auth header
            const header = request.headers.get('x-ms-client-principal');
            
            if (!header) {
                context.log('[checkAdmin] No client principal header');
                return successResponse({ isAdmin: false, authenticated: false });
            }

            // Decode the header
            const buffer = Buffer.from(header, 'base64');
            const principal = JSON.parse(buffer.toString('utf-8'));
            
            const email = principal.userDetails?.toLowerCase();
            
            if (!email) {
                context.log('[checkAdmin] No email in principal');
                return successResponse({ isAdmin: false, authenticated: false });
            }

            context.log(`[checkAdmin] Checking admin status for: ${email}`);

            // Only allow checking @somos.tech emails
            if (!email.endsWith('@somos.tech')) {
                context.log(`[checkAdmin] Email ${email} is not from somos.tech domain`);
                return successResponse({ 
                    isAdmin: false, 
                    authenticated: true,
                    email 
                });
            }

            // Query the admin-users container
            const container = getContainer(containerId);
            const querySpec = {
                query: 'SELECT * FROM c WHERE c.email = @email',
                parameters: [{ name: '@email', value: email }]
            };

            const { resources: users } = await container.items
                .query(querySpec)
                .fetchAll();

            if (users.length === 0) {
                context.log(`[checkAdmin] No admin user found for ${email}`);
                return successResponse({ 
                    isAdmin: false, 
                    authenticated: true,
                    email 
                });
            }

            const adminUser = users[0];
            const isAdmin = adminUser.status === 'active' && 
                           Array.isArray(adminUser.roles) && 
                           adminUser.roles.includes('admin');
            
            context.log(`[checkAdmin] Admin check result for ${email}: ${isAdmin}`);
            
            return successResponse({ 
                isAdmin,
                authenticated: true,
                email,
                adminUser
            });
        } catch (error) {
            context.error('[checkAdmin] Error:', error.message, error.stack);
            return successResponse({ 
                isAdmin: false, 
                authenticated: false, 
                error: error.message 
            });
        }
    }
});
