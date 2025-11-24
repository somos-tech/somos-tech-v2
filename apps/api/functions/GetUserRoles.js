import { app } from '@azure/functions';
import { getContainer } from '../shared/db.js';

const containerId = 'admin-users';
const allowedDomain = process.env.ALLOWED_ADMIN_DOMAIN || 'somos.tech';

/**
 * Azure Static Web Apps custom roles function
 * This function is called by SWA to determine user roles based on their email domain
 */
app.http('GetUserRoles', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    route: 'GetUserRoles',
    handler: async (request, context) => {
        try {
            let principal;
            
            // 1. Try to get principal from request body (Standard for SWA rolesSource)
            try {
                // Clone the request to avoid "body used already" issues if we need to read it again (though we shouldn't)
                const body = await request.json();
                if (body && (body.userId || body.userDetails)) {
                    principal = body;
                    context.log('Received principal from request body:', JSON.stringify(principal));
                }
            } catch (e) {
                context.log('No JSON body or failed to parse body:', e.message);
            }

            // 2. Fallback to x-ms-client-principal header (Standard for authenticated API calls)
            if (!principal) {
                const clientPrincipal = request.headers.get('x-ms-client-principal');
                if (clientPrincipal) {
                    try {
                        principal = JSON.parse(Buffer.from(clientPrincipal, 'base64').toString());
                        context.log('Received principal from x-ms-client-principal header');
                    } catch (e) {
                        context.log.error('Failed to parse x-ms-client-principal header:', e);
                    }
                }
            }

            if (!principal) {
                context.log('No principal found in body or header. Returning empty roles.');
                return { status: 200, jsonBody: { roles: [] } };
            }

            const userEmail = (principal.userDetails || '').toLowerCase();
            const identityProvider = principal.identityProvider || 'unknown';
            const userId = principal.userId;

            context.log(`Processing roles for user: ${userEmail} (${identityProvider})`);

            // Check if user email is from allowed domain
            const roles = [];

            if (userEmail.endsWith(`@${allowedDomain}`)) {
                // User is from somos.tech domain
                roles.push('authenticated');

                // Check if user is in admin-users container
                try {
                    // Create a timeout promise
                    const timeout = new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Database query timed out')), 2000)
                    );

                    const dbOperation = async () => {
                        const container = getContainer(containerId);
                        const querySpec = {
                            query: 'SELECT * FROM c WHERE c.email = @email',
                            parameters: [{ name: '@email', value: userEmail }]
                        };
                        const { resources } = await container.items.query(querySpec).fetchAll();
                        return resources;
                    };

                    // Race the DB operation against the timeout
                    const adminUsers = await Promise.race([dbOperation(), timeout]);

                    if (adminUsers.length > 0) {
                        const adminUser = adminUsers[0];

                        // Add roles from database
                        if (adminUser.roles && Array.isArray(adminUser.roles)) {
                            roles.push(...adminUser.roles);
                        } else {
                            // Default admin role for somos.tech users
                            roles.push('admin');
                        }

                        // Update last login time (fire and forget, don't await)
                        try {
                            adminUser.lastLogin = new Date().toISOString();
                            getContainer(containerId).item(adminUser.id, userEmail).replace(adminUser).catch(e => context.log.error('Failed to update lastLogin:', e));
                        } catch (e) { /* ignore */ }
                    } else {
                        // Auto-register somos.tech users as admins
                        const newAdminUser = {
                            id: `admin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            email: userEmail,
                            name: principal.userDetails || userEmail,
                            roles: ['admin', 'authenticated'],
                            identityProvider,
                            createdAt: new Date().toISOString(),
                            lastLogin: new Date().toISOString(),
                            status: 'active'
                        };

                        // Fire and forget creation
                        getContainer(containerId).items.create(newAdminUser).catch(e => context.log.error('Failed to auto-register admin:', e));
                        
                        roles.push('admin');
                        context.log(`Auto-registered admin user: ${userEmail}`);
                    }
                } catch (dbError) {
                    context.log.error('Database error or timeout:', dbError);
                    // On database error/timeout, still grant admin role to somos.tech users
                    // This ensures they can access the dashboard even if DB is slow
                    roles.push('admin');
                }
            } else {
                // User is not from somos.tech domain
                context.log(`User ${userEmail} is not from allowed domain ${allowedDomain}`);
            }

            // Remove duplicates
            const uniqueRoles = [...new Set(roles)];

            context.log('Assigned roles:', uniqueRoles);

            return {
                status: 200,
                jsonBody: {
                    roles: uniqueRoles
                }
            };

        } catch (error) {
            context.log.error('Error in GetUserRoles:', error);
            return {
                status: 200,
                jsonBody: {
                    roles: []
                }
            };
        }
    }
});
