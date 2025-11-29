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

    // Azure Static Web Apps logout endpoint
    const baseLogoutUrl = '/.auth/logout';

    switch (identityProvider?.toLowerCase()) {
        case 'auth0':
            // Auth0 custom OIDC provider
            // Use the origin directly as post_logout_redirect_uri (must be in Auth0 Allowed Logout URLs)
            // Ensure this exact URL is added: https://dev.somos.tech
            return `${baseLogoutUrl}?post_logout_redirect_uri=${encodeURIComponent(origin)}`;

        case 'aad':
        case 'azureactivedirectory':
            // Entra ID (Azure AD) - SWA will redirect to Microsoft's logout
            return `${baseLogoutUrl}?post_logout_redirect_uri=${encodeURIComponent(origin)}`;

        case 'google':
            // Google doesn't have a programmatic logout, just clear SWA session
            return `${baseLogoutUrl}?post_logout_redirect_uri=${encodeURIComponent(origin)}`;

        case 'github':
        case 'twitter':
        case 'facebook':
            // Social providers - clear SWA session
            return `${baseLogoutUrl}?post_logout_redirect_uri=${encodeURIComponent(origin)}`;

        case 'mock':
            // Development mock - just redirect to home
            return '/';

        default:
            // Unknown provider - use generic logout (no redirect param to avoid issues)
            return baseLogoutUrl;
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
