/**
 * Smart Logout Utility
 * 
 * Detects the identity provider and routes to the correct logout endpoint:
 * - Auth0 (auth0) → /.auth/logout with Auth0 OIDC logout
 * - Entra ID (aad) → /.auth/logout with Microsoft logout
 * - Other → Generic SWA logout
 */

export type IdentityProvider = 'auth0' | 'aad' | 'google' | 'github' | 'twitter' | 'facebook' | 'mock' | string;

/**
 * Get the appropriate logout URL based on identity provider
 */
export function getLogoutUrl(identityProvider?: IdentityProvider | null): string {
    const origin = window.location.origin;
    const postLogoutRedirect = encodeURIComponent(origin);

    // Azure Static Web Apps logout endpoint
    // SWA handles the federated logout to the identity provider
    const baseLogoutUrl = '/.auth/logout';

    switch (identityProvider?.toLowerCase()) {
        case 'auth0':
            // Auth0 custom OIDC provider - SWA will redirect to Auth0's logout
            return `${baseLogoutUrl}?post_logout_redirect_uri=${postLogoutRedirect}`;

        case 'aad':
        case 'azureactivedirectory':
            // Entra ID (Azure AD) - SWA will redirect to Microsoft's logout
            return `${baseLogoutUrl}?post_logout_redirect_uri=${postLogoutRedirect}`;

        case 'google':
            // Google doesn't have a programmatic logout, just clear SWA session
            return `${baseLogoutUrl}?post_logout_redirect_uri=${postLogoutRedirect}`;

        case 'github':
        case 'twitter':
        case 'facebook':
            // Social providers - clear SWA session
            return `${baseLogoutUrl}?post_logout_redirect_uri=${postLogoutRedirect}`;

        case 'mock':
            // Development mock - just redirect to home
            return '/';

        default:
            // Unknown provider - use generic logout
            return `${baseLogoutUrl}?post_logout_redirect_uri=${postLogoutRedirect}`;
    }
}

/**
 * Perform logout with smart identity provider detection
 */
export function performLogout(identityProvider?: IdentityProvider | null): void {
    const logoutUrl = getLogoutUrl(identityProvider);
    
    // Log for debugging
    console.log(`[Logout] Identity provider: ${identityProvider || 'unknown'}`);
    console.log(`[Logout] Redirecting to: ${logoutUrl}`);
    
    window.location.href = logoutUrl;
}

/**
 * React hook-friendly logout function that accepts the full user object
 */
export function createLogoutHandler(user: { identityProvider?: string } | null) {
    return () => {
        performLogout(user?.identityProvider);
    };
}
