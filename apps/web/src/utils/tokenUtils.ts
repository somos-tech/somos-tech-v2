import { IPublicClientApplication } from '@azure/msal-browser';
import { apiRequest } from '@/config/msalConfig';

/**
 * Acquires an access token for calling the backend API
 */
export async function getAccessToken(instance: IPublicClientApplication): Promise<string | null> {
    const accounts = instance.getAllAccounts();

    if (accounts.length === 0) {
        console.error('No accounts found');
        return null;
    }

    try {
        // Try to get token silently first
        const response = await instance.acquireTokenSilent({
            ...apiRequest,
            account: accounts[0],
        });

        return response.accessToken;
    } catch (error) {
        console.error('Silent token acquisition failed, attempting interactive:', error);

        try {
            // Fall back to interactive token acquisition
            const response = await instance.acquireTokenPopup(apiRequest);
            return response.accessToken;
        } catch (interactiveError) {
            console.error('Interactive token acquisition failed:', interactiveError);
            return null;
        }
    }
}

/**
 * Gets user roles from token claims
 */
export function getUserRoles(instance: IPublicClientApplication): string[] {
    const accounts = instance.getAllAccounts();

    if (accounts.length === 0) {
        return [];
    }

    const account = accounts[0];
    const idTokenClaims = account.idTokenClaims as any;

    // Roles can be in 'roles' claim or 'groups' claim
    return idTokenClaims?.roles || idTokenClaims?.groups || [];
}

/**
 * Checks if user has admin role
 */
export function isUserAdmin(instance: IPublicClientApplication): boolean {
    const roles = getUserRoles(instance);
    return roles.some(role =>
        role.toLowerCase() === 'admin' ||
        role.toLowerCase() === 'administrator'
    );
}
