import { app } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';
import { DefaultAzureCredential, ManagedIdentityCredential } from '@azure/identity';
import { requireAdmin, getClientPrincipal } from '../shared/authMiddleware.js';
import { successResponse, errorResponse } from '../shared/httpResponse.js';

// Initialize Cosmos DB client
const endpoint = process.env.COSMOS_ENDPOINT;

if (!endpoint) {
    throw new Error('COSMOS_ENDPOINT must be configured');
}

const isLocal = process.env.AZURE_FUNCTIONS_ENVIRONMENT === 'Development' ||
    process.env.NODE_ENV === 'development';
const credential = isLocal
    ? new DefaultAzureCredential()
    : new ManagedIdentityCredential();

const client = new CosmosClient({ endpoint, aadCredentials: credential });

const databaseId = process.env.COSMOS_DATABASE_NAME || 'somostech';
const containerId = 'admin-users';

/**
 * Admin Users Management API
 * Endpoints for managing admin users and their roles
 */
app.http('adminUsers', {
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    authLevel: 'anonymous',
    route: 'admin-users/{action?}',
    handler: async (request, context) => {
        try {
            const action = request.params.action || 'list';
            const method = request.method;

            // All admin-users endpoints require admin role
            const authError = requireAdmin(request);
            if (authError) {
                return authError;
            }

            const database = client.database(databaseId);
            const container = database.container(containerId);

            // GET: List all admin users
            if (method === 'GET' && action === 'list') {
                const { resources: users } = await container.items
                    .query('SELECT * FROM c ORDER BY c.createdAt DESC')
                    .fetchAll();

                return successResponse(users);
            }

            // GET: Get specific admin user by email
            if (method === 'GET' && action !== 'list') {
                const email = decodeURIComponent(action);
                
                const querySpec = {
                    query: 'SELECT * FROM c WHERE c.email = @email',
                    parameters: [{ name: '@email', value: email }]
                };

                const { resources: users } = await container.items
                    .query(querySpec)
                    .fetchAll();

                if (users.length === 0) {
                    return errorResponse(404, 'Admin user not found');
                }

                return successResponse(users[0]);
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
                if (roles && Array.isArray(roles)) {
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

                return successResponse({ message: 'Admin user deleted successfully' });
            }

            return errorResponse(400, 'Invalid action or method');

        } catch (error) {
            context.log.error('Error in adminUsers function:', error);
            return errorResponse(500, 'Internal server error', error.message);
        }
    }
});
