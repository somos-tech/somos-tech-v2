import type {
  UserProfile,
  PublicUserProfile,
  UserProfileUpdate,
  UserListResponse,
  UserStats,
  UserStatusUpdate
} from '../types/user';

const API_URL = (import.meta as any).env.VITE_API_URL || '';

/**
 * Get current user profile
 * Creates profile automatically on first call if doesn't exist
 */
export async function getCurrentUserProfile(): Promise<UserProfile> {
  const response = await fetch(`${API_URL}/api/users/me`, {
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
  const response = await fetch(`${API_URL}/api/users/me`, {
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
  const response = await fetch(`${API_URL}/api/users/${userId}`, {
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
 * Called automatically on login
 */
export async function syncUserProfile(): Promise<{ user: UserProfile; isNewUser: boolean }> {
  const response = await fetch(`${API_URL}/api/users/sync`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to sync profile' }));
    throw new Error(error.message || 'Failed to sync profile');
  }

  const data = await response.json();
  return data.data;
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

  const response = await fetch(`${API_URL}/api/admin-users/list?${params}`, {
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
export async function getAdminUserById(userId: string): Promise<UserProfile> {
  const response = await fetch(`${API_URL}/api/admin-users/${userId}`, {
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
  const response = await fetch(`${API_URL}/api/admin-users/${userId}/status`, {
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
  const response = await fetch(`${API_URL}/api/admin-users/stats`, {
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
  const response = await fetch(`${API_URL}/api/admin-users/${userId}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to delete user' }));
    throw new Error(error.message || 'Failed to delete user');
  }
}
