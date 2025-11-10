import { app } from '@azure/functions';

/**
 * Simple test endpoint to verify admin routes work
 */
app.http('testAdminRoute', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'admin-users/test',
  handler: async (request, context) => {
    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Admin route test successful!', timestamp: new Date().toISOString() })
    };
  }
});
