import { app } from '@azure/functions';

/**
 * SWA managed function to check if the current user is an admin.
 * This function:
 * 1. Extracts the user identity from the x-ms-client-principal header
 * 2. Calls the Azure Functions API to look up admin status
 * 3. Returns whether the user is an admin
 */
app.http('check-admin', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'check-admin',
    handler: async (request, context) => {
        try {
            // Get the client principal from the Static Web App auth header
            const header = request.headers.get('x-ms-client-principal');
            
            if (!header) {
                return {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                    jsonBody: { isAdmin: false, authenticated: false }
                };
            }

            // Decode the header
            const buffer = Buffer.from(header, 'base64');
            const principal = JSON.parse(buffer.toString('utf-8'));
            
            const email = principal.userDetails?.toLowerCase();
            
            if (!email) {
                return {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                    jsonBody: { isAdmin: false, authenticated: false }
                };
            }

            // Check if user is admin by calling the Azure Function API through the SWA front door
            // The admin lookup endpoint is public and doesn't require authentication
            const resolveApiBase = () => {
                const explicitBase = process.env.VITE_API_URL?.trim();
                if (explicitBase) {
                    return explicitBase.replace(/\/$/, '');
                }

                const host = process.env.WEBSITE_HOSTNAME?.trim();
                if (host) {
                    const normalizedHost = host.startsWith('http') ? host : `https://${host}`;
                    return normalizedHost.replace(/\/$/, '');
                }

                return 'https://dev.somos.tech';
            };

            const apiBase = resolveApiBase();
            const adminLookupUrl = `${apiBase}/api/dashboard-users/${encodeURIComponent(email)}`;
            
            context.log(`Checking admin status for ${email} via ${adminLookupUrl}`);
            
            const response = await fetch(adminLookupUrl);
            
            context.log(`Admin API response status: ${response.status}`);
            
            // Get the response text first to debug
            const responseText = await response.text();
            context.log(`Admin API response body: ${responseText}`);
            
            if (response.ok) {
                let adminUser;
                try {
                    adminUser = JSON.parse(responseText);
                } catch (parseError) {
                    context.error(`Failed to parse response as JSON: ${parseError.message}`);
                    return {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' },
                        jsonBody: { 
                            isAdmin: false,
                            authenticated: true,
                            email,
                            error: 'Invalid JSON response from API'
                        }
                    };
                }
                
                const isAdmin = adminUser && 
                               adminUser.status === 'active' && 
                               Array.isArray(adminUser.roles) && 
                               adminUser.roles.includes('admin');
                
                context.log(`Admin check result for ${email}: ${isAdmin}`);
                
                return {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                    jsonBody: { 
                        isAdmin,
                        authenticated: true,
                        email,
                        adminUser: adminUser
                    }
                };
            } else if (response.status === 404) {
                // User not found in admin-users - not an admin
                context.log(`User ${email} not found in admin-users`);
                return {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                    jsonBody: { 
                        isAdmin: false,
                        authenticated: true,
                        email
                    }
                };
            } else {
                // API error - log and return false for security
                context.error(`API error checking admin status: ${response.status} ${response.statusText}`);
                
                return {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                    jsonBody: { 
                        isAdmin: false,
                        authenticated: true,
                        email,
                        error: `API error: ${response.status}`
                    }
                };
            }
        } catch (error) {
            context.error('Error checking admin status:', error);
            return {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
                jsonBody: { isAdmin: false, authenticated: false, error: error.message }
            };
        }
    }
});
