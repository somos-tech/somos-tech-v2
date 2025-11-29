/**
 * Authentication and Authorization Middleware for Azure Functions
 * Validates Azure Static Web Apps authentication headers
 */

import { getContainer } from './db.js';

// SECURITY: Development mode authentication should ONLY be enabled in local development
// Flex Consumption plans don't set FUNCTIONS_EXTENSION_VERSION, so we use multiple indicators
// to detect if we're running in Azure
const isAzureFunctions = !!process.env.FUNCTIONS_EXTENSION_VERSION;
const isFlexConsumption = !!process.env.AzureWebJobsStorage__accountName || 
                          !!process.env.WEBSITE_INSTANCE_ID ||
                          !!process.env.WEBSITE_SITE_NAME;
const isRunningInAzure = isAzureFunctions || isFlexConsumption;

// Only enable local development mode when NOT in Azure AND in development environment
const isLocalDevelopment = !isRunningInAzure && 
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
    console.warn('  - isFlexConsumption:', isFlexConsumption);
    console.warn('  - isRunningInAzure:', isRunningInAzure);
    console.warn('  - isLocalDevelopment:', isLocalDevelopment);
    console.warn('  - NODE_ENV:', process.env.NODE_ENV);
    
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
        
        // Log details for debugging Auth0 vs Entra ID differences
        console.log('[Auth] Client principal found:', {
            userDetails: clientPrincipal.userDetails,
            identityProvider: clientPrincipal.identityProvider,
            claimTypes: clientPrincipal.claims?.map(c => c.typ) || []
        });

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
 * @returns {Promise<Object>} Object with authenticated status and proper HTTP error response
 */
async function requireAuth(request) {
    if (!isAuthenticated(request)) {
        return {
            authenticated: false,
            error: {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    success: false,
                    error: 'Authentication required',
                    message: 'You must be logged in to access this resource'
                })
            }
        };
    }
    return { authenticated: true };
}

/**
 * Middleware to require admin role
 * Checks both userRoles from auth header AND admin-users container in Cosmos DB
 * @param {import('@azure/functions').HttpRequest} request - The HTTP request
 * @returns {Promise<Object>} Object with authenticated and isAdmin status, and proper HTTP error response
 */
async function requireAdmin(request) {
    // First check if authenticated
    const authResult = await requireAuth(request);
    if (!authResult.authenticated) {
        return authResult;
    }

    const principal = getClientPrincipal(request);
    const email = principal?.userDetails?.toLowerCase();
    
    // Check 1: userRoles from auth header (local dev mock or SWA role mappings)
    if (isAdmin(request)) {
        console.log(`[Auth] Admin access granted via userRoles for ${email}`);
        return { authenticated: true, isAdmin: true };
    }
    
    // Check 2: Query admin-users container in Cosmos DB
    // This is the primary way to determine admin status in production
    if (email) {
        try {
            const container = getContainer('admin-users');
            const { resources: users } = await container.items
                .query({
                    query: 'SELECT * FROM c WHERE c.email = @email',
                    parameters: [{ name: '@email', value: email }]
                })
                .fetchAll();
            
            if (users.length > 0) {
                const adminUser = users[0];
                const hasAdminRole = adminUser.status === 'active' && 
                                     Array.isArray(adminUser.roles) && 
                                     adminUser.roles.includes('admin');
                
                if (hasAdminRole) {
                    console.log(`[Auth] Admin access granted via Cosmos DB for ${email}`);
                    return { authenticated: true, isAdmin: true };
                }
            }
            console.log(`[Auth] User ${email} not found in admin-users or not active admin`);
        } catch (dbError) {
            console.error(`[Auth] Error checking admin-users container:`, dbError.message);
            // Fall through to deny access - don't fail open
        }
    }

    // Not an admin
    return {
        authenticated: true,
        isAdmin: false,
        error: {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                success: false,
                error: 'Insufficient permissions',
                message: 'Admin role required to access this resource'
            })
        }
    };
}

/**
 * Get current user information
 * @param {import('@azure/functions').HttpRequest} request - The HTTP request
 * @returns {Object|null} User information
 */
function getCurrentUser(request) {
    const principal = getClientPrincipal(request);
    if (!principal) return null;

    // Try to extract email from various sources
    // For Auth0: email is often in claims, userDetails might be nickname/username
    // For Entra ID: userDetails is typically the email
    const claims = principal.claims || [];
    
    // Look for email in claims (Auth0 puts it here)
    const emailClaim = claims.find(c => 
        c.typ === 'email' || 
        c.typ === 'emails' || 
        c.typ === 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress' ||
        c.typ === 'preferred_username'
    );
    
    // Determine the email - prioritize claims, then check if userDetails looks like an email
    let email = principal.userDetails;
    
    if (emailClaim?.val) {
        // Use the email from claims if available
        email = Array.isArray(emailClaim.val) ? emailClaim.val[0] : emailClaim.val;
    } else if (principal.userDetails && !principal.userDetails.includes('@')) {
        // userDetails doesn't look like an email, try to find one in claims
        const anyEmailClaim = claims.find(c => 
            c.val && typeof c.val === 'string' && c.val.includes('@')
        );
        if (anyEmailClaim) {
            email = anyEmailClaim.val;
        }
    }

    return {
        userId: principal.userId,
        email: email,
        userDetails: email, // Keep consistent with email
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
