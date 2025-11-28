/**
 * System Health Service
 * 
 * Monitors the health of critical system components:
 * - API availability
 * - Authentication configuration
 * - Database connectivity
 * - Function app status
 * 
 * Provides real-time alerts to admins when issues are detected.
 */

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'critical';
  message: string;
  lastChecked: Date;
  details?: Record<string, unknown>;
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'critical';
  checks: HealthCheck[];
  lastUpdated: Date;
}

export interface HealthAlert {
  id: string;
  severity: 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  component: string;
  actionUrl?: string;
  actionLabel?: string;
}

/**
 * Check if the API health endpoint is responding
 */
async function checkApiHealth(): Promise<HealthCheck> {
  const startTime = Date.now();
  try {
    const response = await fetch('/api/health', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      return {
        name: 'API Health',
        status: 'critical',
        message: `API returned status ${response.status}`,
        lastChecked: new Date(),
        details: { statusCode: response.status, responseTime }
      };
    }

    const data = await response.json();
    
    // Check if Cosmos DB is configured
    const cosmosOk = data.cosmos?.configured === true;
    
    if (!cosmosOk) {
      return {
        name: 'API Health',
        status: 'degraded',
        message: 'API is running but database connection may have issues',
        lastChecked: new Date(),
        details: { cosmos: data.cosmos, responseTime }
      };
    }

    // Check response time
    if (responseTime > 5000) {
      return {
        name: 'API Health',
        status: 'degraded',
        message: `API is slow (${responseTime}ms response time)`,
        lastChecked: new Date(),
        details: { responseTime, version: data.version }
      };
    }

    return {
      name: 'API Health',
      status: 'healthy',
      message: `API responding normally (${responseTime}ms)`,
      lastChecked: new Date(),
      details: { responseTime, version: data.version, cosmos: data.cosmos }
    };
  } catch (error) {
    return {
      name: 'API Health',
      status: 'critical',
      message: error instanceof Error ? `API unreachable: ${error.message}` : 'API is not responding',
      lastChecked: new Date(),
      details: { error: String(error), responseTime: Date.now() - startTime }
    };
  }
}

/**
 * Check if Azure AD authentication is properly configured
 */
async function checkAuthConfiguration(): Promise<HealthCheck> {
  try {
    // Try to access the AAD login endpoint - it should redirect to Microsoft, not return HTML
    const response = await fetch('/.auth/login/aad', {
      method: 'GET',
      redirect: 'manual', // Don't follow redirects
      signal: AbortSignal.timeout(10000)
    });

    // When using redirect: 'manual' with cross-origin redirects, the browser returns an
    // opaque redirect response with type 'opaqueredirect' and status 0. This is expected
    // behavior and indicates that authentication is properly configured (it's redirecting).
    if (response.type === 'opaqueredirect' || (response.status === 0 && response.type !== 'error')) {
      return {
        name: 'Admin Authentication',
        status: 'healthy',
        message: 'AAD authentication is configured (redirect detected)',
        lastChecked: new Date(),
        details: { responseType: response.type }
      };
    }

    // A properly configured auth should return a redirect (302/307) to login.microsoftonline.com
    // If it returns 200 with HTML, the auth is misconfigured
    if (response.status === 200) {
      // Check if it's returning the SPA HTML (misconfigured)
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        return {
          name: 'Admin Authentication',
          status: 'critical',
          message: 'AAD authentication is not configured - admin login will fail',
          lastChecked: new Date(),
          details: { 
            hint: 'ADMIN_AAD_CLIENT_ID or ADMIN_AAD_CLIENT_SECRET may be empty',
            statusCode: response.status
          }
        };
      }
    }

    // 302 or 307 redirect is expected
    if (response.status === 302 || response.status === 307) {
      const location = response.headers.get('location') || '';
      if (location.includes('login.microsoftonline.com') || location.includes('login.microsoft.com')) {
        return {
          name: 'Admin Authentication',
          status: 'healthy',
          message: 'AAD authentication is properly configured',
          lastChecked: new Date(),
          details: { redirectUrl: location.substring(0, 50) + '...' }
        };
      }
      // Any redirect is a good sign
      return {
        name: 'Admin Authentication',
        status: 'healthy',
        message: 'Authentication redirect is working',
        lastChecked: new Date(),
        details: { statusCode: response.status }
      };
    }

    return {
      name: 'Admin Authentication',
      status: 'degraded',
      message: `Unexpected auth response (status ${response.status})`,
      lastChecked: new Date(),
      details: { statusCode: response.status, responseType: response.type }
    };
  } catch (error) {
    // Network error or timeout
    return {
      name: 'Admin Authentication',
      status: 'degraded',
      message: 'Could not verify authentication configuration',
      lastChecked: new Date(),
      details: { error: String(error) }
    };
  }
}

/**
 * Check if Auth0 member authentication is configured
 */
async function checkMemberAuthConfiguration(): Promise<HealthCheck> {
  try {
    const response = await fetch('/.auth/login/auth0', {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(10000)
    });

    // When using redirect: 'manual' with cross-origin redirects, the browser returns an
    // opaque redirect response with type 'opaqueredirect' and status 0. This is expected
    // behavior and indicates that authentication is properly configured (it's redirecting).
    if (response.type === 'opaqueredirect' || (response.status === 0 && response.type !== 'error')) {
      return {
        name: 'Member Authentication',
        status: 'healthy',
        message: 'Auth0 member authentication is configured (redirect detected)',
        lastChecked: new Date(),
        details: { responseType: response.type }
      };
    }

    // Expect a redirect to Auth0
    if (response.status === 302 || response.status === 307) {
      const location = response.headers.get('location') || '';
      if (location.includes('auth0.com') || location.includes('.auth/')) {
        return {
          name: 'Member Authentication',
          status: 'healthy',
          message: 'Auth0 member authentication is configured',
          lastChecked: new Date()
        };
      }
      // Any redirect is a good sign
      return {
        name: 'Member Authentication',
        status: 'healthy',
        message: 'Member authentication redirect is working',
        lastChecked: new Date(),
        details: { statusCode: response.status }
      };
    }

    if (response.status === 200) {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        return {
          name: 'Member Authentication',
          status: 'critical',
          message: 'Auth0 authentication is not configured - member login will fail',
          lastChecked: new Date(),
          details: { hint: 'AUTH0_CLIENT_ID or AUTH0_CLIENT_SECRET may be empty' }
        };
      }
    }

    return {
      name: 'Member Authentication',
      status: 'degraded',
      message: 'Member auth configuration could not be verified',
      lastChecked: new Date(),
      details: { statusCode: response.status, responseType: response.type }
    };
  } catch (error) {
    return {
      name: 'Member Authentication',
      status: 'degraded',
      message: 'Could not verify member auth',
      lastChecked: new Date(),
      details: { error: String(error) }
    };
  }
}

/**
 * Check if key API endpoints are responding
 */
async function checkApiEndpoints(): Promise<HealthCheck> {
  const endpoints = [
    { name: 'Users', path: '/api/dashboard-users?stats=true' },
    { name: 'Groups', path: '/api/groups' },
    { name: 'Moderation', path: '/api/moderation/stats' }
  ];

  const results: { name: string; ok: boolean; status?: number }[] = [];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint.path, {
        method: 'GET',
        credentials: 'include',
        signal: AbortSignal.timeout(5000)
      });
      results.push({ name: endpoint.name, ok: response.ok, status: response.status });
    } catch {
      results.push({ name: endpoint.name, ok: false });
    }
  }

  const failedCount = results.filter(r => !r.ok).length;
  
  if (failedCount === 0) {
    return {
      name: 'API Endpoints',
      status: 'healthy',
      message: 'All API endpoints responding',
      lastChecked: new Date(),
      details: { endpoints: results }
    };
  } else if (failedCount < endpoints.length) {
    const failed = results.filter(r => !r.ok).map(r => r.name).join(', ');
    return {
      name: 'API Endpoints',
      status: 'degraded',
      message: `Some endpoints failing: ${failed}`,
      lastChecked: new Date(),
      details: { endpoints: results }
    };
  } else {
    return {
      name: 'API Endpoints',
      status: 'critical',
      message: 'All API endpoints are failing - Function App may be down',
      lastChecked: new Date(),
      details: { endpoints: results, hint: 'Check Function App deployment and logs' }
    };
  }
}

/**
 * Run all health checks and compile results
 */
export async function runHealthChecks(): Promise<SystemHealth> {
  const checks = await Promise.all([
    checkApiHealth(),
    checkAuthConfiguration(),
    checkMemberAuthConfiguration(),
    checkApiEndpoints()
  ]);

  // Determine overall status
  const hasCritical = checks.some(c => c.status === 'critical');
  const hasDegraded = checks.some(c => c.status === 'degraded');

  let overall: 'healthy' | 'degraded' | 'critical' = 'healthy';
  if (hasCritical) {
    overall = 'critical';
  } else if (hasDegraded) {
    overall = 'degraded';
  }

  return {
    overall,
    checks,
    lastUpdated: new Date()
  };
}

/**
 * Convert health checks to actionable alerts for the dashboard
 */
export function healthToAlerts(health: SystemHealth): HealthAlert[] {
  const alerts: HealthAlert[] = [];

  for (const check of health.checks) {
    if (check.status === 'critical') {
      alerts.push({
        id: `${check.name}-critical-${Date.now()}`,
        severity: 'critical',
        title: `${check.name} - Critical Issue`,
        message: check.message,
        timestamp: check.lastChecked,
        component: check.name,
        actionUrl: check.name.includes('Auth') ? '/admin/settings' : '/admin/health',
        actionLabel: 'View Details'
      });
    } else if (check.status === 'degraded') {
      alerts.push({
        id: `${check.name}-warning-${Date.now()}`,
        severity: 'warning',
        title: `${check.name} - Degraded`,
        message: check.message,
        timestamp: check.lastChecked,
        component: check.name
      });
    }
  }

  return alerts;
}

/**
 * Quick check for critical issues only (faster, for frequent polling)
 */
export async function quickHealthCheck(): Promise<{ ok: boolean; criticalIssues: string[] }> {
  const criticalIssues: string[] = [];

  // Quick API check
  try {
    const response = await fetch('/api/health', { 
      signal: AbortSignal.timeout(5000) 
    });
    if (!response.ok) {
      criticalIssues.push('API is not responding');
    }
  } catch {
    criticalIssues.push('API is unreachable');
  }

  // Quick auth check - just see if it redirects properly
  try {
    const response = await fetch('/.auth/login/aad', { 
      redirect: 'manual',
      signal: AbortSignal.timeout(5000)
    });
    // Status 0 with opaqueredirect type means cross-origin redirect is happening - auth is working
    // Only flag as misconfigured if we get a 200 with HTML content
    if (response.status === 200 && response.type !== 'opaqueredirect') {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        criticalIssues.push('Admin authentication is misconfigured');
      }
    }
  } catch {
    // Auth check failed, but don't mark as critical unless confirmed
  }

  return {
    ok: criticalIssues.length === 0,
    criticalIssues
  };
}

export default {
  runHealthChecks,
  quickHealthCheck,
  healthToAlerts
};
