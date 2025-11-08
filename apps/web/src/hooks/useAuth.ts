import { useState, useEffect } from 'react';

// SECURITY: Development mode authentication should ONLY be enabled in local development
// This is controlled by Vite's import.meta.env.DEV which is false in production builds
// Never manually override this in production
const isMockAuth = import.meta.env.DEV && import.meta.env.MODE === 'development';

// Additional safety check: Verify we're actually running on localhost
const isLocalhost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || 
     window.location.hostname === '127.0.0.1' ||
     window.location.hostname === '');

// Only allow mock auth if BOTH conditions are true
const allowMockAuth = isMockAuth && isLocalhost;

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
                // SECURITY: Only allow mock authentication in local development
                if (allowMockAuth) {
                    console.warn('⚠️ DEVELOPMENT MODE: Using mock authentication');
                    // Mock authenticated admin user
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

                const response = await fetch('/.auth/me');
                const data = await response.json();

                if (data.clientPrincipal) {
                    const user = data.clientPrincipal;
                    const userEmail = user.userDetails?.toLowerCase() || '';
                    
                    // Check if user is from somos.tech domain
                    const isSomosTech = userEmail.endsWith('@somos.tech');
                    
                    // If user is from somos.tech, check admin status from API
                    let isAdminUser = false;
                    if (isSomosTech) {
                        try {
                            // Use relative path - will be proxied by Static Web App to Function App
                            const adminCheckUrl = `/api/admin-users/${encodeURIComponent(userEmail)}`;
                            
                            const adminResponse = await fetch(adminCheckUrl, {
                                credentials: 'include',
                            });
                            
                            if (adminResponse.ok) {
                                const adminUser = await adminResponse.json();
                                isAdminUser = adminUser.status === 'active' && 
                                             adminUser.roles && 
                                             Array.isArray(adminUser.roles) && 
                                             adminUser.roles.includes('admin');
                            }
                        } catch (err) {
                            console.error('Error checking admin status:', err);
                            // If API call fails, default to false
                        }
                    }
                    
                    setAuthState({
                        user,
                        isAuthenticated: true,
                        isAdmin: isAdminUser,
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
