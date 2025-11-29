/**
 * Auth0 Management API Service
 * 
 * Provides functionality to manage Auth0 users including:
 * - Blocking/unblocking users (admin)
 * - Deleting users (admin or self-deletion)
 * - Getting user details
 * 
 * @module auth0Service
 */

// Get Auth0 configuration dynamically to ensure environment variables are loaded
function getAuth0Config() {
    return {
        domain: process.env.AUTH0_DOMAIN || 'dev-0tp5bbdn7af0lfpv.us.auth0.com',
        clientId: process.env.AUTH0_MANAGEMENT_CLIENT_ID,
        clientSecret: process.env.AUTH0_MANAGEMENT_CLIENT_SECRET,
        get audience() {
            return `https://${this.domain}/api/v2/`;
        }
    };
}

// Cache for the management API token
let managementToken = null;
let tokenExpiry = null;

/**
 * Get Auth0 Management API access token
 * Uses client credentials grant with caching
 * @returns {Promise<string>} Access token
 */
async function getManagementToken() {
    const config = getAuth0Config();
    
    // Return cached token if still valid (with 5 minute buffer)
    if (managementToken && tokenExpiry && Date.now() < tokenExpiry - 300000) {
        return managementToken;
    }

    if (!config.clientId || !config.clientSecret) {
        console.error('[Auth0Service] Missing credentials - clientId:', !!config.clientId, 'clientSecret:', !!config.clientSecret);
        throw new Error('Auth0 Management API credentials not configured. Set AUTH0_MANAGEMENT_CLIENT_ID and AUTH0_MANAGEMENT_CLIENT_SECRET environment variables.');
    }

    try {
        console.log('[Auth0Service] Requesting token from:', `https://${config.domain}/oauth/token`);
        const response = await fetch(`https://${config.domain}/oauth/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                client_id: config.clientId,
                client_secret: config.clientSecret,
                audience: config.audience,
                grant_type: 'client_credentials'
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            console.error('[Auth0Service] Failed to get management token:', error);
            throw new Error(`Failed to get Auth0 management token: ${error.error_description || response.statusText}`);
        }

        const data = await response.json();
        managementToken = data.access_token;
        // Token usually expires in 24 hours, cache it
        tokenExpiry = Date.now() + (data.expires_in * 1000);

        console.log('[Auth0Service] Management API token obtained successfully');
        return managementToken;
    } catch (error) {
        console.error('[Auth0Service] Error getting management token:', error);
        throw error;
    }
}

/**
 * Make a request to the Auth0 Management API
 * @param {string} endpoint - API endpoint (without base URL)
 * @param {string} method - HTTP method
 * @param {Object} body - Request body (optional)
 * @returns {Promise<Object>} API response
 */
async function managementApiRequest(endpoint, method = 'GET', body = null) {
    const config = getAuth0Config();
    const token = await getManagementToken();

    const options = {
        method,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };

    if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`https://${config.domain}/api/v2${endpoint}`, options);

    // Handle 204 No Content
    if (response.status === 204) {
        return { success: true };
    }

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.error(`[Auth0Service] API request failed: ${endpoint}`, error);
        throw new Error(error.message || `Auth0 API error: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get Auth0 user by ID
 * @param {string} auth0UserId - Auth0 user ID (e.g., "auth0|123456")
 * @returns {Promise<Object>} User profile
 */
async function getAuth0User(auth0UserId) {
    try {
        return await managementApiRequest(`/users/${encodeURIComponent(auth0UserId)}`);
    } catch (error) {
        console.error(`[Auth0Service] Failed to get user ${auth0UserId}:`, error);
        throw error;
    }
}

/**
 * Get Auth0 user by email
 * @param {string} email - User email
 * @returns {Promise<Object[]>} Array of users with that email
 */
async function getAuth0UserByEmail(email) {
    try {
        const encodedEmail = encodeURIComponent(email);
        return await managementApiRequest(`/users-by-email?email=${encodedEmail}`);
    } catch (error) {
        console.error(`[Auth0Service] Failed to get user by email ${email}:`, error);
        throw error;
    }
}

/**
 * Block (disable) an Auth0 user
 * This sets the user's blocked flag to true, preventing login
 * @param {string} auth0UserId - Auth0 user ID
 * @param {string} adminEmail - Email of admin performing the action
 * @param {string} reason - Reason for blocking
 * @returns {Promise<Object>} Updated user profile
 */
async function blockAuth0User(auth0UserId, adminEmail, reason = 'Blocked by admin') {
    try {
        console.log(`[Auth0Service] Blocking user ${auth0UserId} by ${adminEmail}. Reason: ${reason}`);
        
        const result = await managementApiRequest(`/users/${encodeURIComponent(auth0UserId)}`, 'PATCH', {
            blocked: true,
            app_metadata: {
                blocked_at: new Date().toISOString(),
                blocked_by: adminEmail,
                block_reason: reason
            }
        });

        console.log(`[Auth0Service] User ${auth0UserId} blocked successfully`);
        return result;
    } catch (error) {
        console.error(`[Auth0Service] Failed to block user ${auth0UserId}:`, error);
        throw error;
    }
}

/**
 * Unblock (enable) an Auth0 user
 * @param {string} auth0UserId - Auth0 user ID
 * @param {string} adminEmail - Email of admin performing the action
 * @returns {Promise<Object>} Updated user profile
 */
async function unblockAuth0User(auth0UserId, adminEmail) {
    try {
        console.log(`[Auth0Service] Unblocking user ${auth0UserId} by ${adminEmail}`);
        
        const result = await managementApiRequest(`/users/${encodeURIComponent(auth0UserId)}`, 'PATCH', {
            blocked: false,
            app_metadata: {
                unblocked_at: new Date().toISOString(),
                unblocked_by: adminEmail
            }
        });

        console.log(`[Auth0Service] User ${auth0UserId} unblocked successfully`);
        return result;
    } catch (error) {
        console.error(`[Auth0Service] Failed to unblock user ${auth0UserId}:`, error);
        throw error;
    }
}

/**
 * Delete an Auth0 user permanently
 * WARNING: This action cannot be undone
 * @param {string} auth0UserId - Auth0 user ID
 * @returns {Promise<Object>} Success response
 */
async function deleteAuth0User(auth0UserId) {
    try {
        console.log(`[Auth0Service] Deleting user ${auth0UserId}`);
        
        await managementApiRequest(`/users/${encodeURIComponent(auth0UserId)}`, 'DELETE');

        console.log(`[Auth0Service] User ${auth0UserId} deleted successfully`);
        return { success: true, userId: auth0UserId };
    } catch (error) {
        console.error(`[Auth0Service] Failed to delete user ${auth0UserId}:`, error);
        throw error;
    }
}

/**
 * Check if Auth0 Management API is properly configured
 * @returns {boolean} True if configured
 */
function isAuth0ManagementConfigured() {
    const config = getAuth0Config();
    const isConfigured = !!(config.clientId && config.clientSecret);
    if (!isConfigured) {
        console.log('[Auth0Service] Not configured - clientId:', !!config.clientId, 'clientSecret:', !!config.clientSecret);
    }
    return isConfigured;
}

/**
 * Extract Auth0 user ID from client principal
 * The user ID comes in format like "auth0|123456" or from identity provider
 * @param {Object} clientPrincipal - Azure SWA client principal
 * @returns {string|null} Auth0 user ID or null
 */
function extractAuth0UserId(clientPrincipal) {
    if (!clientPrincipal) return null;

    // Check if identity provider is Auth0
    const identityProvider = clientPrincipal.identityProvider;
    if (identityProvider !== 'auth0') {
        console.log(`[Auth0Service] User is not from Auth0 provider: ${identityProvider}`);
        return null;
    }

    // The userId from Auth0 custom OIDC is typically in the format "auth0|user_id"
    // or just the user_id depending on configuration
    const userId = clientPrincipal.userId;
    
    // If it doesn't have auth0| prefix, add it
    if (userId && !userId.startsWith('auth0|') && !userId.includes('|')) {
        return `auth0|${userId}`;
    }

    return userId;
}

export {
    getAuth0User,
    getAuth0UserByEmail,
    blockAuth0User,
    unblockAuth0User,
    deleteAuth0User,
    isAuth0ManagementConfigured,
    extractAuth0UserId,
    getManagementToken
};
