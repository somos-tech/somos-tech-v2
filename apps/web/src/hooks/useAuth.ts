import { useState, useEffect } from 'react';

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
    const [authState, setAuthState] = useState<AuthState>({
        user: null,
        isAuthenticated: false,
        isAdmin: false,
        isLoading: true,
    });

    useEffect(() => {
        async function fetchUserInfo() {
            try {
                const response = await fetch('/.auth/me');
                const data = await response.json();
                
                if (data.clientPrincipal) {
                    const user = data.clientPrincipal;
                    setAuthState({
                        user,
                        isAuthenticated: true,
                        isAdmin: user.userRoles.includes('admin') || user.userRoles.includes('administrator'),
                        isLoading: false,
                    });
                } else {
                    setAuthState({
                        user: null,
                        isAuthenticated: false,
                        isAdmin: false,
                        isLoading: false,
                    });
                }
            } catch (error) {
                console.error('Error fetching user info:', error);
                setAuthState({
                    user: null,
                    isAuthenticated: false,
                    isAdmin: false,
                    isLoading: false,
                });
            }
        }

        fetchUserInfo();
    }, []);

    return authState;
}
