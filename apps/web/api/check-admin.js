// Static Web App API function to check if user is admin
// This runs in the Static Web App context and has access to x-ms-client-principal header

module.exports = async function (context, req) {
    try {
        // Get the client principal from the Static Web App auth header
        const header = req.headers['x-ms-client-principal'];
        
        if (!header) {
            context.res = {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isAdmin: false, authenticated: false })
            };
            return;
        }

        // Decode the header
        const buffer = Buffer.from(header, 'base64');
        const principal = JSON.parse(buffer.toString('utf-8'));
        
        const email = principal.userDetails?.toLowerCase();
        
        if (!email) {
            context.res = {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isAdmin: false, authenticated: false })
            };
            return;
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
        const adminLookupUrl = `${apiBase}/api/admin-users/${encodeURIComponent(email)}`;
        
        context.log(`Checking admin status for ${email} via ${adminLookupUrl}`);
        
        const response = await fetch(adminLookupUrl);
        
        context.log(`Admin API response status: ${response.status}`);
        
        // Get the response text first to debug
        const responseText = await response.text();
        context.log(`Admin API response body: ${responseText}`);
        
        if (response.ok) {
            let apiResponse;
            try {
                apiResponse = JSON.parse(responseText);
            } catch (parseError) {
                context.log.error(`Failed to parse response as JSON: ${parseError.message}`);
                context.res = {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        isAdmin: false,
                        authenticated: true,
                        email,
                        error: 'Invalid JSON response from API'
                    })
                };
                return;
            }
            
            // The API wraps responses in { success: true, data: {...} }
            // Unwrap to get the actual admin user object
            const adminUser = apiResponse.data || apiResponse;
            
            const isAdmin = adminUser && 
                           adminUser.status === 'active' && 
                           Array.isArray(adminUser.roles) && 
                           adminUser.roles.includes('admin');
            
            context.log(`Admin check result for ${email}: ${isAdmin}, status: ${adminUser?.status}, roles: ${JSON.stringify(adminUser?.roles)}`);
            
            context.res = {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    isAdmin,
                    authenticated: true,
                    email,
                    adminUser: adminUser
                })
            };
        } else if (response.status === 404) {
            // User not found in admin-users - not an admin
            context.log(`User ${email} not found in admin-users`);
            context.res = {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    isAdmin: false,
                    authenticated: true,
                    email
                })
            };
        } else {
            // API error - log and return false for security
            context.log.error(`API error checking admin status: ${response.status} ${response.statusText}`);
            const errorText = await response.text();
            context.log.error(`Error details: ${errorText}`);
            
            context.res = {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    isAdmin: false,
                    authenticated: true,
                    email,
                    error: `API error: ${response.status}`
                })
            };
        }
    } catch (error) {
        context.log.error('Error checking admin status:', error);
        context.res = {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isAdmin: false, authenticated: false, error: error.message })
        };
    }
};
