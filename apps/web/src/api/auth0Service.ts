/**
 * Auth0 API Service
 * 
 * Frontend service for Auth0 user management operations
 */

import { apiUrl } from './httpClient';

const auth0Endpoint = (path = '') => apiUrl(`/auth0${path}`);

/**
 * Block an Auth0 user (admin only)
 */
export async function blockAuth0User(userId: string, reason: string): Promise<void> {
    const response = await fetch(auth0Endpoint(`/users/${userId}/block`), {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ reason }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to block user' }));
        throw new Error(error.message || error.error || 'Failed to block user');
    }
}

/**
 * Unblock an Auth0 user (admin only)
 */
export async function unblockAuth0User(userId: string): Promise<void> {
    const response = await fetch(auth0Endpoint(`/users/${userId}/unblock`), {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to unblock user' }));
        throw new Error(error.message || error.error || 'Failed to unblock user');
    }
}

/**
 * Delete an Auth0 user (admin only)
 */
export async function deleteAuth0User(userId: string): Promise<void> {
    const response = await fetch(auth0Endpoint(`/users/${userId}`), {
        method: 'DELETE',
        credentials: 'include',
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to delete user' }));
        throw new Error(error.message || error.error || 'Failed to delete user');
    }
}

/**
 * Delete own Auth0 account (self-deletion)
 * This permanently removes the user's Auth0 account
 */
export async function deleteOwnAuth0Account(): Promise<{ redirect?: string }> {
    const response = await fetch(auth0Endpoint('/account'), {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ confirmation: 'DELETE_MY_ACCOUNT' }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to delete account' }));
        throw new Error(error.message || error.error || 'Failed to delete account');
    }

    const data = await response.json();
    return data.data || data;
}

/**
 * Check if Auth0 Management API is configured (admin only)
 */
export async function checkAuth0Status(): Promise<{ configured: boolean; message: string }> {
    const response = await fetch(auth0Endpoint('/status'), {
        credentials: 'include',
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to check status' }));
        throw new Error(error.message || error.error || 'Failed to check status');
    }

    const data = await response.json();
    return data.data || data;
}
