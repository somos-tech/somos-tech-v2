/**
 * Authentication and Authorization Middleware for Azure Functions
 * Validates Azure Static Web Apps authentication headers
 */

// SECURITY: Development mode authentication should ONLY be enabled in local development
// This is controlled by NODE_ENV environment variable
// Never enable this in production
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Get mock client principal for local development
 * SECURITY: This should only be used in local development
 * @returns {Object} Mock client principal for development
 */
function getMockClientPrincipal() {
    if (!isDevelopment) {
        return null;
    }

    console.warn('⚠️ DEVELOPMENT MODE: Using mock authentication in API');
    return {
        identityProvider: 'mock',
        userId: 'mock-user-123',
        userDetails: 'developer@somos.tech',
        userRoles: ['authenticated', 'admin', 'administrator']
    };
}

/**
 * Extract and validate client principal from Azure Static Web Apps headers
 * @param {import('@azure/functions').HttpRequest} request - The HTTP request
 * @returns {Object|null} Parsed client principal or null if not authenticated
 */
export function getClientPrincipal(request) {
    try {
        const clientPrincipalHeader = request.headers.get('x-ms-client-principal');

        if (!clientPrincipalHeader) {
            // SECURITY: In local development, use mock authentication
            // This matches the frontend's mock auth behavior
            if (isDevelopment) {
                return getMockClientPrincipal();
            }
            return null;
        }

        // Decode the base64 encoded client principal
        const decoded = Buffer.from(clientPrincipalHeader, 'base64').toString('utf-8');
        const clientPrincipal = JSON.parse(decoded);

        return clientPrincipal;
    } catch (error) {
        console.error('Error parsing client principal:', error);

        // SECURITY: In local development, fall back to mock authentication on error
        if (isDevelopment) {
            return getMockClientPrincipal();
        }
        return null;
    }
}

/**
 * Check if user is authenticated
 * @param {import('@azure/functions').HttpRequest} request - The HTTP request
 * @returns {boolean} True if user is authenticated
 */
export function isAuthenticated(request) {
    const principal = getClientPrincipal(request);
    return principal !== null && principal.userId !== undefined;
}

/**
 * Check if user has a specific role
 * @param {import('@azure/functions').HttpRequest} request - The HTTP request
 * @param {string|string[]} requiredRoles - Role(s) to check for
 * @returns {boolean} True if user has the required role
 */
export function hasRole(request, requiredRoles) {
    const principal = getClientPrincipal(request);

    if (!principal || !principal.userRoles) {
        return false;
    }

    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    return roles.some(role => principal.userRoles.includes(role));
}

/**
 * Check if user is an admin
 * @param {import('@azure/functions').HttpRequest} request - The HTTP request
 * @returns {boolean} True if user has admin role
 */
export function isAdmin(request) {
    return hasRole(request, ['admin', 'administrator']);
}

/**
 * Middleware to require authentication
 * Returns an error response if not authenticated
 * @param {import('@azure/functions').HttpRequest} request - The HTTP request
 * @returns {Object|null} Error response or null if authenticated
 */
export function requireAuth(request) {
    if (!isAuthenticated(request)) {
        return {
            status: 401,
            jsonBody: {
                error: 'Authentication required',
                message: 'You must be logged in to access this resource'
            }
        };
    }
    return null;
}

/**
 * Middleware to require admin role
 * Returns an error response if not admin
 * @param {import('@azure/functions').HttpRequest} request - The HTTP request
 * @returns {Object|null} Error response or null if user is admin
 */
export function requireAdmin(request) {
    // First check if authenticated
    const authError = requireAuth(request);
    if (authError) {
        return authError;
    }

    // Then check for admin role
    if (!isAdmin(request)) {
        return {
            status: 403,
            jsonBody: {
                error: 'Insufficient permissions',
                message: 'Admin role required to access this resource'
            }
        };
    }

    return null;
}

/**
 * Get user email from client principal
 * @param {import('@azure/functions').HttpRequest} request - The HTTP request
 * @returns {string|null} User email or null
 */
export function getUserEmail(request) {
    const principal = getClientPrincipal(request);
    return principal?.userDetails || null;
}

/**
 * Get user ID from client principal
 * @param {import('@azure/functions').HttpRequest} request - The HTTP request
 * @returns {string|null} User ID or null
 */
export function getUserId(request) {
    const principal = getClientPrincipal(request);
    return principal?.userId || null;
}

/**
 * Log authentication event for audit trail
 * @param {Object} context - Function context
 * @param {import('@azure/functions').HttpRequest} request - The HTTP request
 * @param {string} action - Action being performed
 * @param {string} resource - Resource being accessed
 * @param {boolean} allowed - Whether access was allowed
 */
export function logAuthEvent(context, request, action, resource, allowed) {
    const principal = getClientPrincipal(request);
    const userEmail = principal?.userDetails || 'anonymous';
    const userId = principal?.userId || 'N/A';

    context.log({
        timestamp: new Date().toISOString(),
        event: 'auth_event',
        action,
        resource,
        allowed,
        user: {
            id: userId,
            email: userEmail,
            roles: principal?.userRoles || []
        },
        ip: request.headers.get('x-forwarded-for') || 'unknown'
    });
}
