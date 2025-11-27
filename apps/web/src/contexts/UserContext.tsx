import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { UserProfile, UserProfileUpdate } from '../types/user';
import { getCurrentUserProfile, updateCurrentUserProfile, syncUserProfile } from '../api/userService';

// Auth info from /.auth/me
interface AuthUser {
  identityProvider: string;
  userId: string;
  userDetails: string;
  userRoles: string[];
}

interface UserContextType {
  // Auth state
  authUser: AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  
  // User profile (from database)
  profile: UserProfile | null;
  profileLoading: boolean;
  profileError: string | null;
  
  // Actions
  updateProfile: (updates: UserProfileUpdate) => Promise<void>;
  refreshProfile: () => Promise<void>;
  
  // Convenience getters
  displayName: string;
  profilePicture: string | null;
  email: string;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// SECURITY: Development mode authentication
const isMockAuth = import.meta.env.DEV && import.meta.env.MODE === 'development';
const isLocalhost = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || 
   window.location.hostname === '127.0.0.1' ||
   window.location.hostname === '');
const allowMockAuth = isMockAuth && isLocalhost;

export function UserProvider({ children }: { children: ReactNode }) {
  // Auth state
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Profile state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Resolve admin status
  const resolveAdminStatus = async (email: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/check-admin', { credentials: 'include' });
      if (response.ok) {
        const payload = await response.json();
        return Boolean(payload?.data?.isAdmin ?? payload?.isAdmin ?? false);
      }
    } catch (error) {
      console.error('Failed to resolve admin status:', error);
    }
    // Fallback
    return email.endsWith('@somos.tech');
  };

  // Load user profile from database
  const loadProfile = useCallback(async () => {
    if (!authUser) {
      setProfile(null);
      return;
    }

    try {
      setProfileLoading(true);
      setProfileError(null);
      
      // Sync first (creates profile if needed)
      const syncResult = await syncUserProfile();
      setProfile(syncResult.user);
    } catch (err) {
      console.error('Error loading profile:', err);
      setProfileError(err instanceof Error ? err.message : 'Failed to load profile');
      
      // Try to get profile without sync
      try {
        const profileData = await getCurrentUserProfile();
        setProfile(profileData);
      } catch {
        // Profile doesn't exist yet, that's okay
      }
    } finally {
      setProfileLoading(false);
    }
  }, [authUser]);

  // Update profile
  const updateProfile = useCallback(async (updates: UserProfileUpdate) => {
    try {
      setProfileLoading(true);
      setProfileError(null);
      const updatedProfile = await updateCurrentUserProfile(updates);
      setProfile(updatedProfile);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Failed to update profile');
      throw err;
    } finally {
      setProfileLoading(false);
    }
  }, []);

  // Refresh profile
  const refreshProfile = useCallback(async () => {
    await loadProfile();
  }, [loadProfile]);

  // Fetch auth info on mount
  useEffect(() => {
    async function fetchAuth() {
      try {
        // Mock auth for local dev
        if (allowMockAuth) {
          console.warn('⚠️ DEVELOPMENT MODE: Using mock authentication');
          const mockUser: AuthUser = {
            identityProvider: 'mock',
            userId: 'mock-user-123',
            userDetails: 'developer@somos.tech',
            userRoles: ['authenticated', 'admin']
          };
          setAuthUser(mockUser);
          setIsAuthenticated(true);
          setIsAdmin(true);
          setIsLoading(false);
          return;
        }

        const response = await fetch('/.auth/me');
        const data = await response.json();

        if (data.clientPrincipal) {
          const user = data.clientPrincipal;
          const userEmail = user.userDetails?.toLowerCase() || '';
          const adminStatus = await resolveAdminStatus(userEmail);
          
          setAuthUser(user);
          setIsAuthenticated(true);
          setIsAdmin(adminStatus);
        } else {
          setAuthUser(null);
          setIsAuthenticated(false);
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Error fetching auth:', error);
        setAuthUser(null);
        setIsAuthenticated(false);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAuth();
  }, []);

  // Load profile when auth changes
  useEffect(() => {
    if (!isLoading && authUser) {
      loadProfile();
    }
  }, [authUser, isLoading, loadProfile]);

  // Convenience getters
  const displayName = profile?.displayName || 
    (authUser?.userDetails?.split('@')[0] || 'User');
  
  const profilePicture = profile?.profilePicture || null;
  
  const email = profile?.email || authUser?.userDetails || '';

  const value: UserContextType = {
    authUser,
    isAuthenticated,
    isAdmin,
    isLoading,
    profile,
    profileLoading,
    profileError,
    updateProfile,
    refreshProfile,
    displayName,
    profilePicture,
    email
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUserContext() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUserContext must be used within a UserProvider');
  }
  return context;
}

// Re-export for backwards compatibility with useAuth
export function useAuth() {
  const { authUser, isAuthenticated, isAdmin, isLoading } = useUserContext();
  return {
    user: authUser,
    isAuthenticated,
    isAdmin,
    isLoading
  };
}
