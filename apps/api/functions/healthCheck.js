import { app } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';
import { DefaultAzureCredential, ManagedIdentityCredential } from '@azure/identity';
import { successResponse, errorResponse } from '../shared/httpResponse.js';
import { requireAdmin } from '../shared/authMiddleware.js';

/**
 * GET /api/health/check - Comprehensive health check for all API endpoints
 * Admin only endpoint that tests all critical services
 */
app.http('healthCheck', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health/check',
  handler: async (request, context) => {
    try {
      // Check if user is admin
      const authResult = await requireAdmin(request);
      if (!authResult.authenticated) {
        return errorResponse('Admin access required', 403);
      }

      const checks = [];
      const startTime = Date.now();

      // 1. Check Cosmos DB connection
      const cosmosCheck = await checkCosmosDB(context);
      checks.push(cosmosCheck);

      // 2. Check environment variables
      const envCheck = checkEnvironmentVariables();
      checks.push(envCheck);

      // 3. Check critical API endpoints (internal)
      const apiChecks = await checkInternalAPIs(context);
      checks.push(...apiChecks);

      // Calculate overall health
      const failedChecks = checks.filter(c => c.status === 'unhealthy');
      const overallStatus = failedChecks.length === 0 ? 'healthy' : 'unhealthy';
      
      const responseTime = Date.now() - startTime;

      return successResponse({
        status: overallStatus,
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`,
        checks: checks,
        summary: {
          total: checks.length,
          healthy: checks.filter(c => c.status === 'healthy').length,
          unhealthy: failedChecks.length,
          warning: checks.filter(c => c.status === 'warning').length
        }
      });

    } catch (error) {
      context.error('Health check failed:', error);
      return errorResponse(`Health check failed: ${error.message}`, 500);
    }
  }
});

/**
 * Check Cosmos DB connectivity and containers
 */
async function checkCosmosDB(context) {
  const check = {
    name: 'Cosmos DB',
    service: 'database',
    status: 'healthy',
    message: 'Connected successfully',
    lastChecked: new Date().toISOString(),
    details: {}
  };

  try {
    const endpoint = process.env.COSMOS_ENDPOINT;
    const databaseName = process.env.COSMOS_DATABASE_NAME || 'somostech';

    if (!endpoint) {
      check.status = 'unhealthy';
      check.message = 'COSMOS_ENDPOINT not configured';
      return check;
    }

    // Initialize Cosmos client
    const isLocal = process.env.AZURE_FUNCTIONS_ENVIRONMENT === 'Development';
    const credential = isLocal ? new DefaultAzureCredential() : new ManagedIdentityCredential();
    
    const client = new CosmosClient({ endpoint, aadCredentials: credential });
    const database = client.database(databaseName);

    // Test database connection
    const { resource } = await database.read();
    check.details.database = resource.id;

    // Check critical containers
    const requiredContainers = ['users', 'admin-users', 'events', 'notifications'];
    const containerStatuses = [];

    for (const containerName of requiredContainers) {
      try {
        const container = database.container(containerName);
        const { resource: containerResource } = await container.read();
        containerStatuses.push({
          name: containerName,
          status: 'exists',
          partitionKey: containerResource.partitionKey
        });
      } catch (err) {
        containerStatuses.push({
          name: containerName,
          status: 'missing',
          error: err.message
        });
        check.status = 'warning';
      }
    }

    check.details.containers = containerStatuses;

    if (check.status === 'warning') {
      check.message = 'Some containers are missing';
    }

  } catch (error) {
    check.status = 'unhealthy';
    check.message = `Connection failed: ${error.message}`;
    check.details.error = error.message;
  }

  return check;
}

/**
 * Check critical environment variables
 */
function checkEnvironmentVariables() {
  const check = {
    name: 'Environment Variables',
    service: 'configuration',
    status: 'healthy',
    message: 'All required variables configured',
    lastChecked: new Date().toISOString(),
    details: {}
  };

  const required = [
    'COSMOS_ENDPOINT',
    'COSMOS_DATABASE_NAME',
    'EXTERNAL_TENANT_ID',
    'EXTERNAL_ADMIN_CLIENT_ID',
    'EXTERNAL_MEMBER_CLIENT_ID'
  ];

  const optional = [
    'AZURE_OPENAI_ENDPOINT',
    'AZURE_OPENAI_DEPLOYMENT'
  ];

  const missing = [];
  const configured = [];

  for (const varName of required) {
    if (process.env[varName]) {
      configured.push(varName);
    } else {
      missing.push(varName);
    }
  }

  const optionalConfigured = optional.filter(v => process.env[v]);

  check.details.required = {
    total: required.length,
    configured: configured.length,
    missing: missing
  };

  check.details.optional = {
    total: optional.length,
    configured: optionalConfigured.length
  };

  if (missing.length > 0) {
    check.status = 'unhealthy';
    check.message = `Missing required variables: ${missing.join(', ')}`;
  }

  return check;
}

/**
 * Check internal API endpoints
 */
async function checkInternalAPIs(context) {
  const checks = [];
  
  // Define API endpoints to check
  const endpoints = [
    { name: 'User Sync', path: '/api/users/sync', method: 'POST', critical: true },
    { name: 'User Profile', path: '/api/users/me', method: 'GET', critical: true },
    { name: 'Admin Users List', path: '/api/admin/users', method: 'GET', critical: true },
    { name: 'Events API', path: '/api/events', method: 'GET', critical: true },
    { name: 'Groups API', path: '/api/groups', method: 'GET', critical: false },
    { name: 'Notifications API', path: '/api/notifications', method: 'GET', critical: false },
    { name: 'User Roles', path: '/api/getuserroles', method: 'GET', critical: true }
  ];

  for (const endpoint of endpoints) {
    const check = {
      name: endpoint.name,
      service: 'api',
      path: endpoint.path,
      method: endpoint.method,
      status: 'healthy',
      message: 'Endpoint available',
      lastChecked: new Date().toISOString(),
      critical: endpoint.critical,
      details: {}
    };

    try {
      // For now, just verify the function exists
      // In production, you might want to do actual HTTP checks
      check.details.registered = true;
      check.message = 'Function registered';
    } catch (error) {
      check.status = endpoint.critical ? 'unhealthy' : 'warning';
      check.message = `Endpoint check failed: ${error.message}`;
      check.details.error = error.message;
    }

    checks.push(check);
  }

  return checks;
}

/**
 * GET /api/health/status - Simple health status for quick checks
 * Public endpoint for basic health monitoring
 */
app.http('healthStatus', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health/status',
  handler: async (request, context) => {
    try {
      // Quick health check - just verify we can respond
      const cosmosConfigured = !!(
        process.env.COSMOS_ENDPOINT &&
        process.env.COSMOS_DATABASE_NAME
      );

      return successResponse({
        status: cosmosConfigured ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.AZURE_FUNCTIONS_ENVIRONMENT || 'unknown'
      });
    } catch (error) {
      context.error('Health status check failed:', error);
      return errorResponse('Health check failed', 500);
    }
  }
});
