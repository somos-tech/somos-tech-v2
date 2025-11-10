import { app } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';
import { DefaultAzureCredential, ManagedIdentityCredential } from '@azure/identity';

// Simple admin users endpoint without complex dependencies
const endpoint = process.env.COSMOS_ENDPOINT;
const databaseId = process.env.COSMOS_DATABASE_NAME || 'somostech';
const containerId = 'admin-users';

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

app.http('adminUsersSimple', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'admin-users/{action?}',
    handler: async (request, context) => {
        try {
            const action = request.params.action || 'list';
            context.log(`[adminUsersSimple] Action: ${action}`);
            
            const client = getCosmosClient();
            const database = client.database(databaseId);
            const container = database.container(containerId);

            // GET: List all admin users
            if (action === 'list') {
                const { resources: users } = await container.items
                    .query('SELECT * FROM c ORDER BY c.createdAt DESC')
                    .fetchAll();

                return {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        success: true,
                        data: users
                    })
                };
            }

            // GET: Get admin users statistics
            if (action === 'stats') {
                const { resources: users } = await container.items
                    .query('SELECT * FROM c')
                    .fetchAll();

                const stats = {
                    total: users.length,
                    active: users.filter(u => u.status === 'active').length,
                    inactive: users.filter(u => u.status === 'inactive').length,
                    blocked: users.filter(u => u.status === 'blocked').length
                };

                return {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        success: true,
                        data: stats
                    })
                };
            }

            return {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    success: false,
                    error: 'Invalid action'
                })
            };

        } catch (error) {
            context.error('[adminUsersSimple] Error:', error);
            return {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    success: false,
                    error: 'Internal server error',
                    message: error.message
                })
            };
        }
    }
});
