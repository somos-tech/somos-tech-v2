import type { Notification } from '@/shared/types';
import { apiUrl } from './httpClient';

const notificationsEndpoint = (path = '') => apiUrl(`/notifications${path}`);

export const notificationsService = {
    /**
     * Get all notifications for the current user
     */
    async getNotifications(): Promise<Notification[]> {
        const response = await fetch(notificationsEndpoint('/list'), {
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch notifications: ${response.statusText}`);
        }

        return response.json();
    },

    /**
     * Get unread notifications
     */
    async getUnreadNotifications(): Promise<Notification[]> {
        const response = await fetch(notificationsEndpoint('/unread'), {
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch unread notifications: ${response.statusText}`);
        }

        return response.json();
    },

    /**
     * Get unread notification count
     */
    async getUnreadCount(): Promise<number> {
        const response = await fetch(notificationsEndpoint('/count'), {
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch notification count: ${response.statusText}`);
        }

        const data = await response.json();
        return data.count;
    },

    /**
     * Mark a notification as read
     */
    async markAsRead(notificationId: string, type: string): Promise<Notification> {
        const response = await fetch(notificationsEndpoint('/mark-read'), {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ notificationId, type }),
        });

        if (!response.ok) {
            throw new Error(`Failed to mark notification as read: ${response.statusText}`);
        }

        return response.json();
    },

    /**
     * Mark all notifications as read
     */
    async markAllAsRead(): Promise<void> {
        const response = await fetch(notificationsEndpoint('/mark-all-read'), {
            method: 'PUT',
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error(`Failed to mark all notifications as read: ${response.statusText}`);
        }
    },
};
