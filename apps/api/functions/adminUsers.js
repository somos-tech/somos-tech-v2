import { app } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';
import { DefaultAzureCredential, ManagedIdentityCredential } from '@azure/identity';
import { requireAdmin, requireAuth, getClientPrincipal, isAdmin } from '../shared/authMiddleware.js';
import { successResponse, errorResponse } from '../shared/httpResponse.js';
import { notifyAdminRoleAssigned, notifyAdminRoleRemoved } from '../shared/services/notificationService.js';

// Initialize Cosmos DB client
const endpoint = process.env.COSMOS_ENDPOINT;

if (!endpoint) {
    throw new Error('COSMOS_ENDPOINT must be configured');
}

const databaseId = process.env.COSMOS_DATABASE_NAME || 'somostech';
const containerId = 'admin-users';

// Lazy initialization to avoid cold start issues with Flex Consumption
let cosmosClient = null;
function getCosmosClient() {
    if (!cosmosClient) {
        const isLocal = process.env.AZURE_FUNCTIONS_ENVIRONMENT === 'Development' ||
            process.env.NODE_ENV === 'development';
        const credential = isLocal
            ? new DefaultAzureCredential()
            : new ManagedIdentityCredential();
        
        cosmosClient = new CosmosClient({ endpoint, aadCredentials: credential });
    }
    return cosmosClient;
}

/**
 * Admin Users Management API
 * Endpoints for managing admin users and their roles
 */
app.http('adminUsers', {
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    authLevel: 'anonymous',
    route: 'admin-users/{action?}',
    handler: async (request, context) => {
        context.log('[adminUsers] Function invoked');
        context.log('[adminUsers] Method:', request.method);
        context.log('[adminUsers] Action:', request.params.action);
        context.log('[adminUsers] URL:', request.url);
        
        try {
            const action = request.params.action || 'list';
            const method = request.method;
            
            context.log('[adminUsers] Getting Cosmos client...');
            const client = getCosmosClient();
            context.log('[adminUsers] Getting database...');
            const database = client.database(databaseId);
            context.log('[adminUsers] Getting container...');
            const container = database.container(containerId);
            context.log('[adminUsers] Container obtained successfully');

            // GET: Get specific admin user by email (public endpoint for checking admin status)
            // This endpoint does NOT require authentication to allow the SWA check-admin API to call it
            if (method === 'GET' && action !== 'list') {
                const email = decodeURIComponent(action).toLowerCase();
                
                context.log(`[Admin Check] Looking up admin user: ${email}`);
                context.log(`[Admin Check] Original action parameter: ${action}`);
                context.log(`[Admin Check] Decoded email: ${email}`);
                
                // Only allow checking @somos.tech emails
                if (!email.endsWith('@somos.tech')) {
                    context.log(`[Admin Check] Email ${email} is not from somos.tech domain`);
                    return errorResponse(403, 'Only somos.tech users can be checked');
                }
                
                const querySpec = {
                    query: 'SELECT * FROM c WHERE c.email = @email',
                    parameters: [{ name: '@email', value: email }]
                };

                context.log(`[Admin Check] Executing query:`, JSON.stringify(querySpec));
                context.log(`[Admin Check] Container: ${containerId}, Database: ${databaseId}`);

                try {
                    const { resources: users } = await container.items
                        .query(querySpec)
                        .fetchAll();

                    context.log(`[Admin Check] Query returned ${users.length} results`);
                    
                    if (users.length > 0) {
                        context.log(`[Admin Check] First result:`, JSON.stringify(users[0]));
                    }

                    if (users.length === 0) {
                        context.log(`[Admin Check] No admin user found for ${email}`);
                        
                        // Try querying without filter to see all documents
                        const { resources: allUsers } = await container.items
                            .query('SELECT c.email, c.id FROM c')
                            .fetchAll();
                        context.log(`[Admin Check] Total documents in container: ${allUsers.length}`);
                        context.log(`[Admin Check] Sample emails:`, JSON.stringify(allUsers.slice(0, 5)));
                        
                        return errorResponse(404, 'Admin user not found');
                    }

                    // Log the check for audit purposes
                    context.log(`[Admin Check] Admin user found: ${email}, status: ${users[0].status}, roles: ${JSON.stringify(users[0].roles)}`);

                    return successResponse(users[0]);
                } catch (queryError) {
                    context.log.error(`[Admin Check] Query error:`, queryError);
                    return errorResponse(500, 'Database query failed', queryError.message);
                }
            }

            // All other endpoints require admin role
            const authResult = await requireAdmin(request);
            if (!authResult.authenticated || !authResult.isAdmin) {
                return errorResponse(authResult.status || 403, authResult.error || 'Admin access required', authResult.message);
            }

            // GET: List all admin users
            if (method === 'GET' && action === 'list') {
                const { resources: users } = await container.items
                    .query('SELECT * FROM c ORDER BY c.createdAt DESC')
                    .fetchAll();

                return successResponse(users);
            }

            // GET: Get admin users statistics
            if (method === 'GET' && action === 'stats') {
                const { resources: users } = await container.items
                    .query('SELECT * FROM c')
                    .fetchAll();

                const stats = {
                    total: users.length,
                    active: users.filter(u => u.status === 'active').length,
                    inactive: users.filter(u => u.status === 'inactive').length,
                    blocked: users.filter(u => u.status === 'blocked').length
                };

                return successResponse(stats);
            }

            // POST: Create/Add new admin user
            if (method === 'POST') {
                const body = await request.json();
                const { email, name, roles = ['admin', 'authenticated'], status = 'active' } = body;

                if (!email || !email.includes('@')) {
                    return errorResponse(400, 'Valid email is required');
                }

                // Check if user already exists
                const querySpec = {
                    query: 'SELECT * FROM c WHERE c.email = @email',
                    parameters: [{ name: '@email', value: email.toLowerCase() }]
                };

                const { resources: existingUsers } = await container.items
                    .query(querySpec)
                    .fetchAll();

                if (existingUsers.length > 0) {
                    return errorResponse(409, 'Admin user already exists');
                }

                // Create new admin user
                const newAdminUser = {
                    id: `admin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    email: email.toLowerCase(),
                    name: name || email,
                    roles: roles,
                    status: status,
                    createdAt: new Date().toISOString(),
                    createdBy: getClientPrincipal(request)?.userDetails || 'system',
                    lastLogin: null
                };

                const { resource: created } = await container.items.create(newAdminUser);

                context.log(`Admin user created: ${email} by ${newAdminUser.createdBy}`);

                // Send notification
                try {
                    await notifyAdminRoleAssigned({
                        userEmail: email.toLowerCase(),
                        userName: newAdminUser.name,
                        roles: newAdminUser.roles,
                        assignedBy: newAdminUser.createdBy
                    });
                } catch (notifError) {
                    context.log.error('Error sending notification:', notifError);
                    // Don't fail the request if notification fails
                }

                return successResponse(created, 201);
            }

            // PUT: Update admin user roles/status
            if (method === 'PUT') {
                const body = await request.json();
                const { email, roles, status, name } = body;

                if (!email) {
                    return errorResponse(400, 'Email is required');
                }

                // Find existing user
                const querySpec = {
                    query: 'SELECT * FROM c WHERE c.email = @email',
                    parameters: [{ name: '@email', value: email.toLowerCase() }]
                };

                const { resources: users } = await container.items
                    .query(querySpec)
                    .fetchAll();

                if (users.length === 0) {
                    return errorResponse(404, 'Admin user not found');
                }

                const user = users[0];

                // Update fields
                if (roles) {
                    user.roles = roles;
                }
                if (status) {
                    user.status = status;
                }
                if (name) {
                    user.name = name;
                }

                user.updatedAt = new Date().toISOString();
                user.updatedBy = getClientPrincipal(request)?.userDetails || 'system';

                // Replace the document
                const { resource: updated } = await container.item(user.id, user.email).replace(user);

                context.log(`Admin user updated: ${email} by ${user.updatedBy}`);

                // Send notification if roles changed
                try {
                    const oldRoles = users[0].roles || [];
                    const newRoles = roles || oldRoles;
                    
                    if (JSON.stringify(oldRoles.sort()) !== JSON.stringify(newRoles.sort())) {
                        await notifyAdminRoleAssigned({
                            userEmail: email.toLowerCase(),
                            userName: user.name,
                            roles: newRoles,
                            assignedBy: user.updatedBy
                        });
                    }
                } catch (notifError) {
                    context.log.error('Error sending notification:', notifError);
                }

                return successResponse(updated);
            }

            // DELETE: Remove admin user
            if (method === 'DELETE') {
                const body = await request.json();
                const { email } = body;

                if (!email) {
                    return errorResponse(400, 'Email is required');
                }

                // Find existing user
                const querySpec = {
                    query: 'SELECT * FROM c WHERE c.email = @email',
                    parameters: [{ name: '@email', value: email.toLowerCase() }]
                };

                const { resources: users } = await container.items
                    .query(querySpec)
                    .fetchAll();

                if (users.length === 0) {
                    return errorResponse(404, 'Admin user not found');
                }

                const user = users[0];

                // Prevent deleting yourself
                const currentUser = getClientPrincipal(request);
                if (currentUser?.userDetails?.toLowerCase() === email.toLowerCase()) {
                    return errorResponse(400, 'Cannot delete your own admin account');
                }

                // Delete the user
                await container.item(user.id, user.email).delete();

                context.log(`Admin user deleted: ${email} by ${currentUser?.userDetails || 'system'}`);

                // Send notification
                try {
                    await notifyAdminRoleRemoved({
                        userEmail: email.toLowerCase(),
                        userName: user.name,
                        removedBy: currentUser?.userDetails || 'system'
                    });
                } catch (notifError) {
                    context.log.error('Error sending notification:', notifError);
                }

                return successResponse({ message: 'Admin user deleted successfully' });
            }

            return errorResponse(400, 'Invalid action or method');

        } catch (error) {
            context.log.error('[adminUsers] ERROR:', error);
            context.log.error('[adminUsers] Error stack:', error.stack);
            context.log.error('[adminUsers] Error message:', error.message);
            return errorResponse(500, 'Internal server error', error.message);
        }
    }
});
