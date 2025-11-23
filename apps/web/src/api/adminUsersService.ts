import type { AdminUser, CreateAdminUserDto, UpdateAdminUserDto } from '@/shared/types';

const API_BASE_URL = import.meta.env?.VITE_API_URL || '';
const API_PATH = API_BASE_URL ? `${API_BASE_URL}/dashboard-users` : '/api/dashboard-users';

export const adminUsersService = {
    /**
     * List all admin users
     */
    async listAdminUsers(): Promise<AdminUser[]> {
        const response = await fetch(`${API_PATH}/list`, {
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
        const response = await fetch(`${API_PATH}/${encodeURIComponent(email)}`, {
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
        const response = await fetch(`${API_PATH}`, {
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
        const response = await fetch(`${API_PATH}`, {
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
        const response = await fetch(`${API_PATH}`, {
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
