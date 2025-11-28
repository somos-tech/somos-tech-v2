import type {
  UserProfile,
  PublicUserProfile,
  UserProfileUpdate,
  UserListResponse,
  UserStats,
  UserStatusUpdate
} from '../types/user';
import { apiUrl } from './httpClient';

const userEndpoint = (path = '') => apiUrl(`/users${path}`);
const dashboardUsersEndpoint = (path = '') => apiUrl(`/dashboard/users${path}`);

/**
 * Get current user profile
 * Creates profile automatically on first call if doesn't exist
 */
export async function getCurrentUserProfile(): Promise<UserProfile> {
  const response = await fetch(userEndpoint('/me'), {
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to get user profile' }));
    throw new Error(error.message || 'Failed to get user profile');
  }

  const data = await response.json();
  return data.data;
}

/**
 * Update current user profile
 */
export async function updateCurrentUserProfile(updates: UserProfileUpdate): Promise<UserProfile> {
  const response = await fetch(userEndpoint('/me'), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to update profile' }));
    throw new Error(error.message || 'Failed to update profile');
  }

  const data = await response.json();
  return data.data;
}

/**
 * Get public user profile by ID
 */
export async function getUserById(userId: string): Promise<PublicUserProfile> {
  const response = await fetch(userEndpoint(`/${userId}`), {
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to get user' }));
    throw new Error(error.message || 'Failed to get user');
  }

  const data = await response.json();
  return data.data;
}

/**
 * Sync user profile with authentication provider
 * Called automatically on login to sync profile data including picture from social providers
 */
export async function syncUserProfile(): Promise<{ user: UserProfile; isNewUser: boolean }> {
  // First, get the full claims from /.auth/me
  let claims: Array<{ typ: string; val: string }> = [];
  try {
    const authResponse = await fetch('/.auth/me');
    if (authResponse.ok) {
      const authData = await authResponse.json();
      if (authData.clientPrincipal?.claims) {
        claims = authData.clientPrincipal.claims;
      }
    }
  } catch (e) {
    console.warn('Could not fetch claims from /.auth/me:', e);
  }

  // Sync with backend, passing claims to extract profile picture
  const response = await fetch(userEndpoint('/sync'), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ claims }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to sync profile' }));
    throw new Error(error.message || 'Failed to sync profile');
  }

  const data = await response.json();
  return data.data || data;
}

// Admin endpoints

/**
 * List all users (admin only)
 */
export async function listUsers(options: {
  limit?: number;
  continuationToken?: string | null;
  status?: string | null;
  search?: string | null;
} = {}): Promise<UserListResponse> {
  const params = new URLSearchParams();
  
  if (options.limit) params.append('limit', options.limit.toString());
  if (options.continuationToken) params.append('continuationToken', options.continuationToken);
  if (options.status) params.append('status', options.status);
  if (options.search) params.append('search', options.search);

  const query = params.toString();
  const response = await fetch(dashboardUsersEndpoint(query ? `?${query}` : ''), {
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to list users' }));
    throw new Error(error.message || 'Failed to list users');
  }

  const data = await response.json();
  return data.data;
}

/**
 * Get user by ID (admin only - returns full profile)
 */
export async function getUserDetails(userId: string): Promise<UserProfile> {
  const response = await fetch(dashboardUsersEndpoint(`/${userId}`), {
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to get user' }));
    throw new Error(error.message || 'Failed to get user');
  }

  const data = await response.json();
  return data.data;
}

/**
 * Update user status (admin only)
 */
export async function updateUserStatus(
  userId: string,
  statusUpdate: UserStatusUpdate
): Promise<UserProfile> {
  const response = await fetch(dashboardUsersEndpoint(`/${userId}/status`), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(statusUpdate),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to update user status' }));
    throw new Error(error.message || 'Failed to update user status');
  }

  const data = await response.json();
  return data.data.user;
}

/**
 * Get user statistics (admin only)
 */
export async function getUserStats(): Promise<UserStats> {
  const response = await fetch(dashboardUsersEndpoint('?stats=true'), {
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to get user stats' }));
    throw new Error(error.message || 'Failed to get user stats');
  }

  const data = await response.json();
  return data.data;
}

/**
 * Delete user (admin only - soft delete by blocking)
 */
export async function deleteUser(userId: string): Promise<void> {
  const response = await fetch(dashboardUsersEndpoint(`/${userId}`), {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to delete user' }));
    throw new Error(error.message || 'Failed to delete user');
  }
}
// Trigger redeploy
