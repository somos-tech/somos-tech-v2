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

        // Check if user is admin by calling the main API
        const apiUrl = process.env.VITE_API_URL || 'https://func-somos-tech-dev-64qb73pzvgekw.azurewebsites.net';
        const response = await fetch(`${apiUrl}/api/admin-users/${encodeURIComponent(email)}`);
        
        if (response.ok) {
            const adminUser = await response.json();
            const isAdmin = adminUser && 
                           adminUser.status === 'active' && 
                           Array.isArray(adminUser.roles) && 
                           adminUser.roles.includes('admin');
            
            context.res = {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    isAdmin,
                    authenticated: true,
                    email
                })
            };
        } else {
            // User not found in admin-users - not an admin
            context.res = {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    isAdmin: false,
                    authenticated: true,
                    email
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
