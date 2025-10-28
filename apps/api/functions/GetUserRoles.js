const { app } = require('@azure/functions');
const { CosmosClient } = require('@azure/cosmos');

// Initialize Cosmos DB client using managed identity
const endpoint = process.env.COSMOS_ENDPOINT;
const client = new CosmosClient({ endpoint, aadCredentials: { type: 'ManagedIdentity' } });

const databaseId = process.env.COSMOS_DATABASE_NAME || 'somostech';
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
            // Get user information from the request headers (set by Azure SWA)
            const userId = request.headers.get('x-ms-client-principal-id');
            const userDetails = request.headers.get('x-ms-client-principal-name');
            const clientPrincipal = request.headers.get('x-ms-client-principal');

            context.log('GetUserRoles called', { userId, userDetails });

            // If no user is authenticated, return empty roles
            if (!clientPrincipal) {
                return {
                    status: 200,
                    jsonBody: {
                        roles: []
                    }
                };
            }

            // Decode the client principal (base64 encoded)
            const principal = JSON.parse(Buffer.from(clientPrincipal, 'base64').toString());
            const userEmail = principal.userDetails?.toLowerCase() || '';
            const identityProvider = principal.identityProvider;

            context.log('User email:', userEmail);
            context.log('Identity provider:', identityProvider);

            // Check if user email is from allowed domain
            const roles = [];
            
            if (userEmail.endsWith(`@${allowedDomain}`)) {
                // User is from somos.tech domain
                roles.push('authenticated');
                
                // Check if user is in admin-users container
                try {
                    const database = client.database(databaseId);
                    const container = database.container(containerId);
                    
                    // Query for the user
                    const querySpec = {
                        query: 'SELECT * FROM c WHERE c.email = @email',
                        parameters: [
                            {
                                name: '@email',
                                value: userEmail
                            }
                        ]
                    };

                    const { resources: adminUsers } = await container.items
                        .query(querySpec)
                        .fetchAll();

                    if (adminUsers.length > 0) {
                        const adminUser = adminUsers[0];
                        
                        // Add roles from database
                        if (adminUser.roles && Array.isArray(adminUser.roles)) {
                            roles.push(...adminUser.roles);
                        } else {
                            // Default admin role for somos.tech users
                            roles.push('admin');
                        }

                        // Update last login time
                        adminUser.lastLogin = new Date().toISOString();
                        await container.item(adminUser.id, userEmail).replace(adminUser);
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

                        await container.items.create(newAdminUser);
                        roles.push('admin');
                        
                        context.log(`Auto-registered admin user: ${userEmail}`);
                    }
                } catch (dbError) {
                    context.log.error('Database error:', dbError);
                    // On database error, still grant admin role to somos.tech users
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
