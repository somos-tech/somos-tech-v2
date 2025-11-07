import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

// Configure JWKS client to fetch signing keys from Azure AD
const client = jwksClient({
    jwksUri: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/discovery/v2.0/keys`,
    cache: true,
    cacheMaxAge: 86400000, // 24 hours
});

/**
 * Gets the signing key from Azure AD
 */
function getKey(header, callback) {
    client.getSigningKey(header.kid, (err, key) => {
        if (err) {
            callback(err);
            return;
        }
        const signingKey = key.getPublicKey();
        callback(null, signingKey);
    });
}

/**
 * Validates the JWT token from the Authorization header
 * @param {import('@azure/functions').HttpRequest} request
 * @returns {Promise<{isValid: boolean, user?: any, error?: string}>}
 */
export async function validateToken(request) {
    try {
        // Skip validation in local development
        if (process.env.AZURE_FUNCTIONS_ENVIRONMENT === 'Development' && !process.env.AZURE_CLIENT_ID) {
            return {
                isValid: true,
                user: {
                    userId: 'dev-user',
                    email: 'developer@somos.tech',
                    roles: ['admin'],
                }
            };
        }

        const authHeader = request.headers.get('authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return {
                isValid: false,
                error: 'No authorization header or invalid format'
            };
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Validate token
        return new Promise((resolve) => {
            jwt.verify(
                token,
                getKey,
                {
                    audience: process.env.AZURE_CLIENT_ID, // Your app's client ID
                    issuer: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0`,
                    algorithms: ['RS256']
                },
                (err, decoded) => {
                    if (err) {
                        console.error('Token validation error:', err);
                        resolve({
                            isValid: false,
                            error: err.message
                        });
                        return;
                    }

                    // Extract user information
                    resolve({
                        isValid: true,
                        user: {
                            userId: decoded.oid || decoded.sub,
                            email: decoded.preferred_username || decoded.email,
                            name: decoded.name,
                            roles: decoded.roles || [],
                            tenantId: decoded.tid,
                        }
                    });
                }
            );
        });
    } catch (error) {
        console.error('Error validating token:', error);
        return {
            isValid: false,
            error: error.message
        };
    }
}

/**
 * Middleware to check if user has admin role
 * @param {any} user - User object from validateToken
 * @returns {boolean}
 */
export function isAdmin(user) {
    return user?.roles?.some(role =>
        role.toLowerCase() === 'admin' ||
        role.toLowerCase() === 'administrator'
    );
}

/**
 * Gets the access token from the request for OBO flow
 * @param {import('@azure/functions').HttpRequest} request
 * @returns {string|null}
 */
export function getAccessToken(request) {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    return authHeader.substring(7);
}

/**
 * Exchange the user's token for a token to call downstream services (OBO flow)
 * @param {string} userToken - The user's access token
 * @param {string[]} scopes - The scopes required for the downstream service
 * @returns {Promise<string|null>}
 */
export async function getOboToken(userToken, scopes) {
    try {
        const { ConfidentialClientApplication } = await import('@azure/msal-node');

        const msalConfig = {
            auth: {
                clientId: process.env.AZURE_CLIENT_ID,
                authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
                clientSecret: process.env.AZURE_CLIENT_SECRET, // You'll need to add this
            },
        };

        const cca = new ConfidentialClientApplication(msalConfig);

        const oboRequest = {
            oboAssertion: userToken,
            scopes: scopes,
        };

        const response = await cca.acquireTokenOnBehalfOf(oboRequest);
        return response.accessToken;
    } catch (error) {
        console.error('Error getting OBO token:', error);
        return null;
    }
}
