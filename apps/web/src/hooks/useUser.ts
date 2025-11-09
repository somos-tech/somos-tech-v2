import { useState, useEffect, useCallback } from 'react';
import type { UserProfile, UserProfileUpdate } from '../types/user';
import { getCurrentUserProfile, updateCurrentUserProfile, syncUserProfile } from '../api/userService';
import { useAuth } from './useAuth';

interface UseUserReturn {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  isBlocked: boolean;
  updateProfile: (updates: UserProfileUpdate) => Promise<void>;
  refreshProfile: () => Promise<void>;
  syncProfile: () => Promise<void>;
}

/**
 * Hook to manage current user profile
 * Automatically loads and syncs user profile on mount
 */
export function useUser(): UseUserReturn {
  const { user: authUser, isLoading: authLoading } = useAuth();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load user profile
  const loadProfile = useCallback(async () => {
    if (!authUser) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const profile = await getCurrentUserProfile();
      setUser(profile);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load profile';
      setError(message);
      console.error('Error loading user profile:', err);
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  // Sync profile with auth provider
  const syncProfile = useCallback(async () => {
    if (!authUser) return;

    try {
      setLoading(true);
      setError(null);
      const { user: syncedUser } = await syncUserProfile();
      setUser(syncedUser);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sync profile';
      setError(message);
      console.error('Error syncing user profile:', err);
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  // Update profile
  const updateProfile = useCallback(async (updates: UserProfileUpdate) => {
    try {
      setLoading(true);
      setError(null);
      const updatedUser = await updateCurrentUserProfile(updates);
      setUser(updatedUser);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update profile';
      setError(message);
      throw err; // Re-throw so UI can handle it
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh profile
  const refreshProfile = useCallback(async () => {
    await loadProfile();
  }, [loadProfile]);

  // Load profile when auth user changes
  useEffect(() => {
    if (!authLoading) {
      loadProfile();
    }
  }, [authUser, authLoading, loadProfile]);

  // Sync profile on mount if authenticated (creates profile if needed)
  useEffect(() => {
    if (authUser && !authLoading) {
      syncProfile();
    }
  }, [authUser?.userId]); // Only on auth user ID change, not on every render

  const isBlocked = user?.status === 'blocked';

  return {
    user,
    loading: loading || authLoading,
    error,
    isBlocked,
    updateProfile,
    refreshProfile,
    syncProfile
  };
}
