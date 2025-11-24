import type { AdminUser, CreateAdminUserDto, UpdateAdminUserDto } from '@/shared/types';
import { apiUrl } from './httpClient';

const adminUsersEndpoint = (path = '') => apiUrl(`/dashboard-users${path}`);

export const adminUsersService = {
    /**
     * List all admin users
     */
    async listAdminUsers(): Promise<AdminUser[]> {
        const response = await fetch(adminUsersEndpoint('/list'), {
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch admin users: ${response.statusText}`);
        }

        const result = await response.json();
        return result.data;
    },

    /**
     * Get a specific admin user by email
     */
    async getAdminUser(email: string): Promise<AdminUser> {
        const response = await fetch(adminUsersEndpoint(`/${encodeURIComponent(email)}`), {
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch admin user: ${response.statusText}`);
        }

        const result = await response.json();
        return result.data;
    },

    /**
     * Create a new admin user
     */
    async createAdminUser(data: CreateAdminUserDto): Promise<AdminUser> {
        const response = await fetch(adminUsersEndpoint(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(error.message || `Failed to create admin user: ${response.statusText}`);
        }

        const result = await response.json();
        return result.data;
    },

    /**
     * Update an admin user's roles or status
     */
    async updateAdminUser(data: UpdateAdminUserDto): Promise<AdminUser> {
        const response = await fetch(adminUsersEndpoint(), {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(error.message || `Failed to update admin user: ${response.statusText}`);
        }

        const result = await response.json();
        return result.data;
    },

    /**
     * Delete an admin user
     */
    async deleteAdminUser(email: string): Promise<void> {
        const response = await fetch(adminUsersEndpoint(), {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ email }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(error.message || `Failed to delete admin user: ${response.statusText}`);
        }
    },
};
