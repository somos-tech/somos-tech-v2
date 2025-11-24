import { app } from '@azure/functions';
import { getContainer } from '../shared/db.js';

// Simple admin users endpoint without complex dependencies  
// Updated to ensure deployment propagation
const containerId = 'admin-users';

app.http('adminUsersSimple', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'adminusers/{action?}',
    handler: async (request, context) => {
        try {
            const action = request.params.action || 'list';
            context.log(`[adminUsersSimple] Action: ${action}`);
            
            const container = getContainer(containerId);

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
