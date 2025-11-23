import { app } from '@azure/functions';

/**
 * GET /api/health - Health check endpoint
 */
app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: async (request, context) => {
    // We now use Managed Identity, so COSMOS_KEY is not strictly required in prod
    const cosmosConfigured = !!process.env.COSMOS_ENDPOINT;
    
    return {
      status: 200,
      jsonBody: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.2-db-fix',
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
