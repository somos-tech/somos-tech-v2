/**
 * Authentication and Authorization Middleware for Azure Functions
 * Validates Azure Static Web Apps authentication headers
 */

// SECURITY: Development mode authentication should ONLY be enabled in local development
// This is controlled by FUNCTIONS_EXTENSION_VERSION (which is set in Azure) 
// and specific local development indicators
// Never enable this in production
const isAzureFunctions = !!process.env.FUNCTIONS_EXTENSION_VERSION;
const isLocalDevelopment = !isAzureFunctions && 
                          (process.env.NODE_ENV === 'development' || 
                           process.env.NODE_ENV === 'dev' ||
                           process.env.AZURE_FUNCTIONS_ENVIRONMENT === 'Development');
const isDevelopment = isLocalDevelopment;

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
    console.warn('  - isAzureFunctions:', isAzureFunctions);
    console.warn('  - isLocalDevelopment:', isLocalDevelopment);
    console.warn('  - NODE_ENV:', process.env.NODE_ENV);
    console.warn('  - FUNCTIONS_EXTENSION_VERSION:', process.env.FUNCTIONS_EXTENSION_VERSION);
    
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
function getClientPrincipal(request) {
    try {
        const clientPrincipalHeader = request.headers.get('x-ms-client-principal');

        if (!clientPrincipalHeader) {
            // SECURITY: In local development, use mock authentication
            // This matches the frontend's mock auth behavior
            if (isDevelopment) {
                console.log('[Auth] Using mock authentication (dev mode)');
                return getMockClientPrincipal();
            }
            console.log('[Auth] No client principal header found');
            return null;
        }

        // Decode the base64 encoded client principal
        const decoded = Buffer.from(clientPrincipalHeader, 'base64').toString('utf-8');
        const clientPrincipal = JSON.parse(decoded);
        console.log('[Auth] Client principal found:', clientPrincipal.userDetails);

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
function isAuthenticated(request) {
    const principal = getClientPrincipal(request);
    return principal !== null && principal.userId !== undefined;
}

/**
 * Check if user has a specific role
 * @param {import('@azure/functions').HttpRequest} request - The HTTP request
 * @param {string|string[]} requiredRoles - Role(s) to check for
 * @returns {boolean} True if user has the required role
 */
function hasRole(request, requiredRoles) {
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
function isAdmin(request) {
    return hasRole(request, ['admin', 'administrator']);
}

/**
 * Middleware to require authentication
 * Returns an error response if not authenticated
 * @param {import('@azure/functions').HttpRequest} request - The HTTP request
 * @returns {Promise<Object>} Object with authenticated status
 */
async function requireAuth(request) {
    if (!isAuthenticated(request)) {
        return {
            authenticated: false,
            status: 401,
            error: 'Authentication required',
            message: 'You must be logged in to access this resource'
        };
    }
    return { authenticated: true };
}

/**
 * Middleware to require admin role
 * Returns an error response if not admin
 * @param {import('@azure/functions').HttpRequest} request - The HTTP request
 * @returns {Promise<Object>} Object with authenticated and isAdmin status
 */
async function requireAdmin(request) {
    // First check if authenticated
    const authResult = await requireAuth(request);
    if (!authResult.authenticated) {
        return authResult;
    }

    // Then check for admin role
    if (!isAdmin(request)) {
        return {
            authenticated: true,
            isAdmin: false,
            status: 403,
            error: 'Insufficient permissions',
            message: 'Admin role required to access this resource'
        };
    }

    return { authenticated: true, isAdmin: true };
}

/**
 * Get current user information
 * @param {import('@azure/functions').HttpRequest} request - The HTTP request
 * @returns {Object|null} User information
 */
function getCurrentUser(request) {
    const principal = getClientPrincipal(request);
    if (!principal) return null;

    return {
        userId: principal.userId,
        email: principal.userDetails,
        userDetails: principal.userDetails,
        identityProvider: principal.identityProvider,
        userRoles: principal.userRoles || [],
        claims: principal.claims || []
    };
}

/**
 * Get user email from client principal
 * @param {import('@azure/functions').HttpRequest} request - The HTTP request
 * @returns {string|null} User email or null
 */
function getUserEmail(request) {
    const principal = getClientPrincipal(request);
    return principal?.userDetails || null;
}

/**
 * Get user ID from client principal
 * @param {import('@azure/functions').HttpRequest} request - The HTTP request
 * @returns {string|null} User ID or null
 */
function getUserId(request) {
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
function logAuthEvent(context, request, action, resource, allowed) {
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

// Export functions
export {
    getClientPrincipal,
    isAuthenticated,
    hasRole,
    isAdmin,
    requireAuth,
    requireAdmin,
    getCurrentUser,
    getUserEmail,
    getUserId,
    logAuthEvent
};
