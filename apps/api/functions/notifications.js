import { app } from '@azure/functions';
import { requireAuth, getClientPrincipal, getUserEmail } from '../shared/authMiddleware.js';
import { successResponse, errorResponse } from '../shared/httpResponse.js';
import {
    getAllNotifications,
    getUnreadNotifications,
    markNotificationAsRead,
    markAllAsRead
} from '../shared/services/notificationService.js';

/**
 * Notifications API
 * Endpoints for managing user notifications
 */
app.http('notifications', {
    methods: ['GET', 'POST', 'PUT'],
    authLevel: 'anonymous',
    route: 'notifications/{action?}',
    handler: async (request, context) => {
        try {
            const action = request.params.action || 'list';
            const method = request.method;

            // All notifications endpoints require authentication
            const authError = requireAuth(request);
            if (authError) {
                return authError;
            }

            const userEmail = getUserEmail(request);

            // GET: List notifications
            if (method === 'GET' && action === 'list') {
                const notifications = await getAllNotifications(userEmail);
                return successResponse(notifications);
            }

            // GET: Get unread notifications
            if (method === 'GET' && action === 'unread') {
                const notifications = await getUnreadNotifications(userEmail);
                return successResponse(notifications);
            }

            // GET: Get notification count
            if (method === 'GET' && action === 'count') {
                const notifications = await getUnreadNotifications(userEmail);
                return successResponse({ count: notifications.length });
            }

            // PUT: Mark notification as read
            if (method === 'PUT' && action === 'mark-read') {
                const body = await request.json();
                const { notificationId, type } = body;

                if (!notificationId || !type) {
                    return errorResponse(400, 'notificationId and type are required');
                }

                const notification = await markNotificationAsRead(notificationId, type);
                return successResponse(notification);
            }

            // PUT: Mark all as read
            if (method === 'PUT' && action === 'mark-all-read') {
                const result = await markAllAsRead(userEmail);
                return successResponse(result);
            }

            return errorResponse(400, 'Invalid action or method');

        } catch (error) {
            context.log.error('Error in notifications function:', error);
            return errorResponse(500, 'Internal server error', error.message);
        }
    }
});
