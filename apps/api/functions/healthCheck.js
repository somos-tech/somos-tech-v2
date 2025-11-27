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
      if (!authResult.authenticated || !authResult.isAdmin) {
        return errorResponse(authResult.message || 'Admin access required', authResult.status || 403);
      }

      const checks = [];
      const startTime = Date.now();

      // 1. Check Cosmos DB connection
      const cosmosCheck = await checkCosmosDB(context);
      checks.push(cosmosCheck);

      // 2. Check environment variables
      const envCheck = checkEnvironmentVariables();
      checks.push(envCheck);

      // 3. Check authentication configuration
      const authCheck = checkAuthConfiguration();
      checks.push(authCheck);

      // 4. Check critical API endpoints (internal)
      const apiChecks = await checkInternalAPIs(context, request);
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
 * Check authentication configuration to prevent mock auth in production
 * This specifically checks for the issue that caused 401 errors
 */
function checkAuthConfiguration() {
  const check = {
    name: 'Authentication Config',
    service: 'configuration',
    status: 'healthy',
    message: 'Authentication properly configured',
    lastChecked: new Date().toISOString(),
    critical: true,
    details: {}
  };

  const isAzureFunctions = !!process.env.FUNCTIONS_EXTENSION_VERSION;
  const nodeEnv = process.env.NODE_ENV;
  const azureEnv = process.env.AZURE_FUNCTIONS_ENVIRONMENT;

  check.details.isAzureFunctions = isAzureFunctions;
  check.details.nodeEnv = nodeEnv || 'not set';
  check.details.azureEnv = azureEnv || 'not set';

  // Check for the specific issue: mock auth running in production
  if (isAzureFunctions && nodeEnv === 'dev') {
    check.status = 'unhealthy';
    check.message = 'CRITICAL: NODE_ENV=dev in Azure - mock auth may be active!';
    check.details.error = 'This will cause 401 Unauthorized errors for all users';
    check.details.fix = 'Set NODE_ENV to production in Azure configuration';
    return check;
  }

  if (isAzureFunctions && nodeEnv === 'development') {
    check.status = 'unhealthy';
    check.message = 'CRITICAL: NODE_ENV=development in Azure - mock auth may be active!';
    check.details.error = 'This will cause 401 Unauthorized errors for all users';
    check.details.fix = 'Set NODE_ENV to production in Azure configuration';
    return check;
  }

  // Verify production environment is properly set
  if (isAzureFunctions) {
    if (nodeEnv !== 'production') {
      check.status = 'warning';
      check.message = `NODE_ENV is "${nodeEnv}" - recommend setting to "production"`;
    } else {
      check.message = 'Running in production mode with proper auth';
    }
  } else {
    check.message = 'Local development mode (mock auth allowed)';
    check.details.note = 'Mock auth is enabled for local development';
  }

  return check;
}

/**
 * Check internal API endpoints by making actual HTTP requests
 * This tests both the endpoint availability AND authentication middleware
 */
async function checkInternalAPIs(context, request) {
  const checks = [];
  
  // Get the base URL for internal API calls
  // In Azure, we use the same host. In local dev, we construct it.
  const protocol = request.url.startsWith('https') ? 'https' : 'http';
  const host = request.headers.get('host') || 'localhost:7071';
  const baseUrl = `${protocol}://${host}`;
  
  // Forward auth headers to simulate authenticated requests
  const authHeader = request.headers.get('x-ms-client-principal');
  const headers = {
    'Content-Type': 'application/json',
  };
  if (authHeader) {
    headers['x-ms-client-principal'] = authHeader;
  }

  // Define API endpoints to check with expected behavior
  const endpoints = [
    { name: 'Events API (Public)', path: '/api/events', method: 'GET', critical: true, requiresAuth: false },
    { name: 'Groups API (Public)', path: '/api/groups', method: 'GET', critical: true, requiresAuth: false },
    { name: 'Health Status', path: '/api/health/status', method: 'GET', critical: true, requiresAuth: false },
    { name: 'User Roles', path: '/api/getuserroles', method: 'GET', critical: true, requiresAuth: true }
  ];

  for (const endpoint of endpoints) {
    const check = {
      name: endpoint.name,
      service: 'api',
      path: endpoint.path,
      method: endpoint.method,
      status: 'healthy',
      message: 'Endpoint responding correctly',
      lastChecked: new Date().toISOString(),
      critical: endpoint.critical,
      details: {}
    };

    try {
      const startTime = Date.now();
      const response = await fetch(`${baseUrl}${endpoint.path}`, {
        method: endpoint.method,
        headers: endpoint.requiresAuth ? headers : { 'Content-Type': 'application/json' }
      });
      const responseTime = Date.now() - startTime;

      check.details.statusCode = response.status;
      check.details.responseTime = `${responseTime}ms`;

      // Check for authentication errors (401, 403)
      if (response.status === 401) {
        check.status = endpoint.critical ? 'unhealthy' : 'warning';
        check.message = 'Authentication failed - API returning 401 Unauthorized';
        check.details.error = 'Users will not be able to access this endpoint';
      } else if (response.status === 403) {
        check.status = endpoint.critical ? 'unhealthy' : 'warning';
        check.message = 'Access denied - API returning 403 Forbidden';
        check.details.error = 'Authorization issue detected';
      } else if (response.status >= 500) {
        check.status = 'unhealthy';
        check.message = `Server error: ${response.status} ${response.statusText}`;
        check.details.error = 'Internal server error';
      } else if (response.status >= 400) {
        check.status = 'warning';
        check.message = `Client error: ${response.status} ${response.statusText}`;
      } else {
        check.message = `OK (${response.status}) in ${responseTime}ms`;
      }
    } catch (error) {
      check.status = endpoint.critical ? 'unhealthy' : 'warning';
      check.message = `Request failed: ${error.message}`;
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
