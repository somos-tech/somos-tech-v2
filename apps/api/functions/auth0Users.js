/**
 * Auth0 User Management API
 * 
 * Endpoints for managing Auth0 users:
 * - PUT /api/auth0/users/:userId/block - Block an Auth0 user (admin only)
 * - PUT /api/auth0/users/:userId/unblock - Unblock an Auth0 user (admin only)
 * - DELETE /api/auth0/users/:userId - Delete an Auth0 user (admin only)
 * - DELETE /api/auth0/account - Delete own Auth0 account (self-deletion)
 * 
 * @module auth0Users
 */

import { app } from '@azure/functions';
import { requireAdmin, requireAuth, getClientPrincipal, getCurrentUser } from '../shared/authMiddleware.js';
import { successResponse, errorResponse } from '../shared/httpResponse.js';
import { 
    blockAuth0User, 
    unblockAuth0User, 
    deleteAuth0User, 
    isAuth0ManagementConfigured,
    extractAuth0UserId,
    getAuth0UserByEmail
} from '../shared/services/auth0Service.js';
import { getContainer as getDbContainer } from '../shared/db.js';
import { logSecurityEvent } from './adminSecurityAudit.js';

/**
 * Admin endpoint to block/unblock Auth0 users
 * PUT /api/auth0/users/:userId/block or /unblock
 */
app.http('auth0UserBlock', {
    methods: ['PUT'],
    authLevel: 'anonymous',
    route: 'auth0/users/{userId}/{action}',
    handler: async (request, context) => {
        try {
            // Check admin authentication
            const authResult = await requireAdmin(request);
            if (!authResult.authenticated) {
                return errorResponse(401, 'Authentication required');
            }
            if (!authResult.isAdmin) {
                return errorResponse(403, 'Admin access required');
            }

            // Verify Auth0 Management API is configured
            if (!isAuth0ManagementConfigured()) {
                return errorResponse(503, 'Auth0 Management API not configured. Please set AUTH0_MANAGEMENT_CLIENT_ID and AUTH0_MANAGEMENT_CLIENT_SECRET.');
            }

            const { userId, action } = request.params;
            const currentUser = getCurrentUser(request);

            // Validate action
            if (!['block', 'unblock'].includes(action)) {
                return errorResponse(400, 'Action must be "block" or "unblock"');
            }

            // Parse request body
            let body = {};
            try {
                body = await request.json();
            } catch (e) {
                // Body is optional for unblock
            }

            const { reason } = body;

            // Require reason for blocking
            if (action === 'block' && !reason) {
                return errorResponse(400, 'Reason is required for blocking a user');
            }

            // Get user's Auth0 ID from our database
            const usersContainer = getDbContainer('users');
            const { resources } = await usersContainer.items
                .query({
                    query: 'SELECT * FROM c WHERE c.id = @id',
                    parameters: [{ name: '@id', value: userId }]
                })
                .fetchAll();

            if (resources.length === 0) {
                return errorResponse(404, 'User not found in database');
            }

            const user = resources[0];

            // Check if user is from Auth0
            if (user.authProvider !== 'auth0' && !user.auth0Id) {
                return errorResponse(400, 'User is not an Auth0 user. Cannot perform Auth0 operations.');
            }

            // Get Auth0 user ID
            let auth0UserId = user.auth0Id;
            if (!auth0UserId && user.email) {
                // Try to find by email
                const auth0Users = await getAuth0UserByEmail(user.email);
                if (auth0Users.length > 0) {
                    auth0UserId = auth0Users[0].user_id;
                }
            }

            if (!auth0UserId) {
                return errorResponse(404, 'Auth0 user ID not found');
            }

            let result;
            if (action === 'block') {
                result = await blockAuth0User(auth0UserId, currentUser.userDetails, reason);
                
                // Also update local database
                await usersContainer.items.upsert({
                    ...user,
                    status: 'blocked',
                    auth0Blocked: true,
                    blockedAt: new Date().toISOString(),
                    blockedBy: currentUser.userDetails,
                    blockReason: reason
                });

                // Log security event
                await logSecurityEvent({
                    eventType: 'USER_BLOCKED',
                    severity: 'high',
                    actorEmail: currentUser.userDetails,
                    targetUserId: userId,
                    details: { reason, auth0UserId }
                });

                context.log(`[Auth0Users] User ${userId} blocked by ${currentUser.userDetails}`);
            } else {
                result = await unblockAuth0User(auth0UserId, currentUser.userDetails);
                
                // Also update local database
                await usersContainer.items.upsert({
                    ...user,
                    status: 'active',
                    auth0Blocked: false,
                    unblockedAt: new Date().toISOString(),
                    unblockedBy: currentUser.userDetails
                });

                // Log security event
                await logSecurityEvent({
                    eventType: 'USER_UNBLOCKED',
                    severity: 'medium',
                    actorEmail: currentUser.userDetails,
                    targetUserId: userId,
                    details: { auth0UserId }
                });

                context.log(`[Auth0Users] User ${userId} unblocked by ${currentUser.userDetails}`);
            }

            return successResponse({
                success: true,
                action,
                userId,
                auth0UserId,
                performedBy: currentUser.userDetails
            });

        } catch (error) {
            context.error('[Auth0Users] Block/unblock error:', error);
            return errorResponse(500, 'Failed to update user status', { message: error.message });
        }
    }
});

/**
 * Admin endpoint to delete Auth0 user
 * DELETE /api/auth0/users/:userId
 */
app.http('auth0UserDelete', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'auth0/users/{userId}',
    handler: async (request, context) => {
        try {
            // Check admin authentication
            const authResult = await requireAdmin(request);
            if (!authResult.authenticated) {
                return errorResponse(401, 'Authentication required');
            }
            if (!authResult.isAdmin) {
                return errorResponse(403, 'Admin access required');
            }

            // Verify Auth0 Management API is configured
            if (!isAuth0ManagementConfigured()) {
                return errorResponse(503, 'Auth0 Management API not configured');
            }

            const { userId } = request.params;
            const currentUser = getCurrentUser(request);

            // Prevent admin from deleting themselves
            if (userId === currentUser.userId) {
                return errorResponse(400, 'Cannot delete your own account through admin endpoint');
            }

            // Get user from database
            const usersContainer = getDbContainer('users');
            const { resources } = await usersContainer.items
                .query({
                    query: 'SELECT * FROM c WHERE c.id = @id',
                    parameters: [{ name: '@id', value: userId }]
                })
                .fetchAll();

            if (resources.length === 0) {
                return errorResponse(404, 'User not found');
            }

            const user = resources[0];

            // Get Auth0 user ID
            let auth0UserId = user.auth0Id;
            if (!auth0UserId && user.email) {
                const auth0Users = await getAuth0UserByEmail(user.email);
                if (auth0Users.length > 0) {
                    auth0UserId = auth0Users[0].user_id;
                }
            }

            // Delete from Auth0 if we have the ID
            if (auth0UserId) {
                await deleteAuth0User(auth0UserId);
                context.log(`[Auth0Users] Auth0 user ${auth0UserId} deleted`);
            }

            // Mark user as deleted in local database (soft delete)
            await usersContainer.items.upsert({
                ...user,
                status: 'deleted',
                deletedAt: new Date().toISOString(),
                deletedBy: currentUser.userDetails,
                auth0Deleted: true
            });

            // Log security event
            await logSecurityEvent({
                eventType: 'USER_DELETED_BY_ADMIN',
                severity: 'critical',
                actorEmail: currentUser.userDetails,
                targetUserId: userId,
                details: { auth0UserId, userEmail: user.email }
            });

            context.log(`[Auth0Users] User ${userId} deleted by admin ${currentUser.userDetails}`);

            return successResponse({
                success: true,
                message: 'User account deleted',
                userId,
                deletedBy: currentUser.userDetails
            });

        } catch (error) {
            context.error('[Auth0Users] Delete error:', error);
            return errorResponse(500, 'Failed to delete user', { message: error.message });
        }
    }
});

/**
 * Self-deletion endpoint - allows user to delete their own account
 * DELETE /api/auth0/account
 */
app.http('auth0AccountDelete', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'auth0/account',
    handler: async (request, context) => {
        try {
            // Check authentication
            const authResult = await requireAuth(request);
            if (!authResult.authenticated) {
                return errorResponse(401, 'Authentication required');
            }

            // Debug: Log environment variables availability
            context.log('[Auth0Users] Checking Auth0 config...');
            context.log('[Auth0Users] AUTH0_DOMAIN:', process.env.AUTH0_DOMAIN ? 'set' : 'NOT SET');
            context.log('[Auth0Users] AUTH0_MANAGEMENT_CLIENT_ID:', process.env.AUTH0_MANAGEMENT_CLIENT_ID ? 'set' : 'NOT SET');
            context.log('[Auth0Users] AUTH0_MANAGEMENT_CLIENT_SECRET:', process.env.AUTH0_MANAGEMENT_CLIENT_SECRET ? 'set (length: ' + process.env.AUTH0_MANAGEMENT_CLIENT_SECRET.length + ')' : 'NOT SET');

            // Verify Auth0 Management API is configured
            if (!isAuth0ManagementConfigured()) {
                context.error('[Auth0Users] Auth0 Management API not configured!');
                return errorResponse(503, 'Auth0 Management API not configured. Please contact support.', {
                    domain: process.env.AUTH0_DOMAIN ? 'set' : 'missing',
                    clientId: process.env.AUTH0_MANAGEMENT_CLIENT_ID ? 'set' : 'missing',
                    clientSecret: process.env.AUTH0_MANAGEMENT_CLIENT_SECRET ? 'set' : 'missing'
                });
            }

            const currentUser = getCurrentUser(request);
            const clientPrincipal = getClientPrincipal(request);

            // Verify user is from Auth0
            if (clientPrincipal.identityProvider !== 'auth0') {
                return errorResponse(400, 'This endpoint is only for Auth0 users. Your account is managed by a different provider.');
            }

            // Parse confirmation
            let body = {};
            try {
                body = await request.json();
            } catch (e) {
                // Body might be empty
            }

            const { confirmation, password } = body;

            // Require explicit confirmation
            if (confirmation !== 'DELETE_MY_ACCOUNT') {
                return errorResponse(400, 'Please confirm account deletion by sending { "confirmation": "DELETE_MY_ACCOUNT" }');
            }

            // Get user from database
            const usersContainer = getDbContainer('users');
            const { resources } = await usersContainer.items
                .query({
                    query: 'SELECT * FROM c WHERE c.id = @id',
                    parameters: [{ name: '@id', value: currentUser.userId }]
                })
                .fetchAll();

            const user = resources.length > 0 ? resources[0] : null;

            // Get Auth0 user ID
            const auth0UserId = extractAuth0UserId(clientPrincipal) || user?.auth0Id;
            
            // Try to get from Auth0 by email if needed
            let auth0User = null;
            if (!auth0UserId && currentUser.userDetails) {
                const auth0Users = await getAuth0UserByEmail(currentUser.userDetails);
                if (auth0Users.length > 0) {
                    auth0User = auth0Users[0];
                }
            }

            const finalAuth0UserId = auth0UserId || auth0User?.user_id;

            if (!finalAuth0UserId) {
                return errorResponse(404, 'Could not find your Auth0 account');
            }

            // Delete from Auth0
            await deleteAuth0User(finalAuth0UserId);
            context.log(`[Auth0Users] Auth0 user ${finalAuth0UserId} self-deleted`);

            // Update local database if user exists
            if (user) {
                await usersContainer.items.upsert({
                    ...user,
                    status: 'deleted',
                    deletedAt: new Date().toISOString(),
                    deletedBy: 'self',
                    auth0Deleted: true,
                    // Clear sensitive data
                    email: `deleted_${user.id}@deleted.local`,
                    name: 'Deleted User',
                    profilePicture: null
                });
            }

            // Log security event
            await logSecurityEvent({
                eventType: 'USER_SELF_DELETED',
                severity: 'high',
                actorEmail: currentUser.userDetails,
                targetUserId: currentUser.userId,
                details: { auth0UserId: finalAuth0UserId }
            });

            context.log(`[Auth0Users] User ${currentUser.userId} (${currentUser.userDetails}) self-deleted`);

            return successResponse({
                success: true,
                message: 'Your account has been permanently deleted. You will be logged out shortly.',
                redirect: '/logout'
            });

        } catch (error) {
            context.error('[Auth0Users] Self-delete error:', error);
            return errorResponse(500, 'Failed to delete account', { message: error.message });
        }
    }
});

/**
 * Get Auth0 configuration status
 * GET /api/auth0/status
 */
app.http('auth0Status', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'auth0/status',
    handler: async (request, context) => {
        try {
            // Check admin authentication
            const authResult = await requireAdmin(request);
            if (!authResult.authenticated || !authResult.isAdmin) {
                return errorResponse(403, 'Admin access required');
            }

            const configured = isAuth0ManagementConfigured();

            return successResponse({
                configured,
                message: configured 
                    ? 'Auth0 Management API is configured' 
                    : 'Auth0 Management API is not configured. Set AUTH0_MANAGEMENT_CLIENT_ID and AUTH0_MANAGEMENT_CLIENT_SECRET.'
            });

        } catch (error) {
            context.error('[Auth0Users] Status check error:', error);
            return errorResponse(500, 'Failed to check status');
        }
    }
});

export default app;
