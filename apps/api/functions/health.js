const { app } = require('@azure/functions');

/**
 * GET /api/health - Health check endpoint
 */
app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: async (request, context) => {
    const cosmosConfigured = !!(process.env.COSMOS_ENDPOINT && process.env.COSMOS_KEY && process.env.COSMOS_DATABASE_NAME);
    
    return {
      status: 200,
      jsonBody: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'unknown',
        cosmos: {
          configured: cosmosConfigured,
          endpoint: process.env.COSMOS_ENDPOINT ? 'set' : 'missing',
          key: process.env.COSMOS_KEY ? 'set' : 'missing',
          database: process.env.COSMOS_DATABASE_NAME || 'missing'
        }
      }
    };
  }
});
