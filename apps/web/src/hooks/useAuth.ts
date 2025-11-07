import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { useState, useEffect } from 'react';
import { getUserRoles, isUserAdmin } from '@/utils/tokenUtils';

const isMockAuth = import.meta.env.DEV && !import.meta.env.VITE_AZURE_CLIENT_ID;

interface UserInfo {
    identityProvider: string;
    userId: string;
    userDetails: string;
    userRoles: string[];
}

interface AuthState {
    user: UserInfo | null;
    isAuthenticated: boolean;
    isAdmin: boolean;
    isLoading: boolean;
}

export function useAuth(): AuthState {
    const { instance, accounts, inProgress } = useMsal();
    const isAuthenticated = useIsAuthenticated();
    const [authState, setAuthState] = useState<AuthState>({
        user: null,
        isAuthenticated: false,
        isAdmin: false,
        isLoading: true,
    });

    useEffect(() => {
        // Mock auth for development without Azure AD
        if (isMockAuth) {
            setAuthState({
                user: {
                    identityProvider: 'mock',
                    userId: 'mock-user-123',
                    userDetails: 'developer@somos.tech',
                    userRoles: ['authenticated', 'admin']
                },
                isAuthenticated: true,
                isAdmin: true,
                isLoading: false,
            });
            return;
        }

        // MSAL is still processing
        if (inProgress !== 'none') {
            setAuthState(prev => ({ ...prev, isLoading: true }));
            return;
        }

        // User is authenticated with MSAL
        if (isAuthenticated && accounts.length > 0) {
            const account = accounts[0];
            const roles = getUserRoles(instance);
            const admin = isUserAdmin(instance);

            setAuthState({
                user: {
                    identityProvider: 'aad',
                    userId: account.localAccountId,
                    userDetails: account.username,
                    userRoles: roles,
                },
                isAuthenticated: true,
                isAdmin: admin,
                isLoading: false,
            });
        } else {
            // Not authenticated
            setAuthState({
                user: null,
                isAuthenticated: false,
                isAdmin: false,
                isLoading: false,
            });
        }
    }, [instance, accounts, isAuthenticated, inProgress]);

    return authState;
}
