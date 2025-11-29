import { app } from '@azure/functions';
import * as userService from '../shared/services/userService.js';
import { successResponse, errorResponse } from '../shared/httpResponse.js';
import { requireAuth, requireAdmin, getCurrentUser } from '../shared/authMiddleware.js';

/**
 * GET /api/admin/users - List all users with pagination and filtering
 * GET /api/admin/users?stats=true - Get user statistics
 */
app.http('adminListUsers', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'dashboard/users',
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

      // Parse query parameters
      const url = new URL(request.url);
      const statsParam = url.searchParams.get('stats');
      
      // If stats=true, return user statistics instead of list
      if (statsParam === 'true') {
        context.log('[adminListUsers] Getting user statistics');
        try {
          const stats = await userService.getUserStats();
          context.log('[adminListUsers] Stats retrieved successfully');
          return successResponse(stats);
        } catch (statsError) {
          context.error('[adminListUsers] Error getting stats:', statsError);
          context.error('[adminListUsers] Stats error details:', {
            message: statsError.message,
            code: statsError.code,
            statusCode: statsError.statusCode
          });
          throw statsError;
        }
      }

      const limit = parseInt(url.searchParams.get('limit') || '50');
      const continuationToken = url.searchParams.get('continuationToken') || null;
      const status = url.searchParams.get('status') || null;
      const search = url.searchParams.get('search') || null;

      // Validate limit (allow up to 500 for admin user listing)
      if (limit < 1 || limit > 500) {
        return errorResponse(400, 'Limit must be between 1 and 500');
      }

      // Validate status
      if (status && !Object.values(userService.UserStatus).includes(status)) {
        return errorResponse(400, 'Invalid status value');
      }

      // Get users
      context.log('[adminListUsers] Listing users with params:', { limit, status, search });
      try {
        const result = await userService.listUsers({
          limit,
          continuationToken,
          status,
          search
        });
        context.log(`[adminListUsers] Retrieved ${result.users?.length || 0} users`);
        return successResponse(result);
      } catch (listError) {
        context.error('[adminListUsers] Error listing users:', listError);
        context.error('[adminListUsers] List error details:', {
          message: listError.message,
          code: listError.code,
          statusCode: listError.statusCode
        });
        throw listError;
      }
    } catch (error) {
      context.error('[adminListUsers] CRITICAL ERROR:', error);
      context.error('[adminListUsers] Error details:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
        statusCode: error.statusCode,
        body: error.body
      });
      return errorResponse(500, 'Failed to list users or stats', error.message);
    }
  }
});

/**
 * GET/DELETE /api/admin/users/:id - Get or Delete user
 */
app.http('adminUserById', {
  methods: ['GET', 'DELETE'],
  authLevel: 'anonymous',
  route: 'dashboard/users/{id}',
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

      const userId = request.params.id;
      if (!userId) {
        return errorResponse(400, 'User ID is required');
      }

      // GET: Get user details
      if (request.method === 'GET') {
        const user = await userService.getUserById(userId);
        if (!user) {
          return errorResponse(404, 'User not found');
        }
        return successResponse(user);
      }

      // DELETE: Soft delete user
      if (request.method === 'DELETE') {
        const currentUser = getCurrentUser(request);
        
        // Prevent admin from deleting themselves
        if (userId === currentUser.userId) {
          return errorResponse(400, 'You cannot delete your own account');
        }

        // Soft delete by blocking
        const updatedUser = await userService.updateUserStatus(userId, userService.UserStatus.BLOCKED, currentUser.userId);

        context.log(`Admin ${currentUser.userDetails} deleted (blocked) user ${userId}`);

        return successResponse({
          message: 'User has been blocked (soft deleted)',
          user: updatedUser
        });
      }
    } catch (error) {
      context.error(`Error handling user request (${request.method}):`, error);
      
      if (error.message === 'User not found') {
        return errorResponse(404, 'User not found');
      }
      
      return errorResponse(500, 'Failed to process request');
    }
  }
});

/**
 * PUT /api/admin/users/:id/status - Update user status (block/allow)
 */
app.http('adminUpdateUserStatus', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'dashboard/users/{id}/status',
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

      const userId = request.params.id;
      const currentUser = getCurrentUser(request);

      if (!userId) {
        return errorResponse(400, 'User ID is required');
      }

      // Parse request body
      const { status, reason } = await request.json();

      if (!status) {
        return errorResponse(400, 'Status is required');
      }

      // Validate status
      if (!Object.values(userService.UserStatus).includes(status)) {
        return errorResponse(400, `Invalid status. Must be one of: ${Object.values(userService.UserStatus).join(', ')}`);
      }

      // Prevent admin from blocking themselves
      if (userId === currentUser.userId) {
        return errorResponse(400, 'You cannot change your own status');
      }

      // Update status
      const updatedUser = await userService.updateUserStatus(userId, status, currentUser.userId);

      // Log the action
      context.log(`Admin ${currentUser.userDetails} changed user ${userId} status to ${status}. Reason: ${reason || 'None provided'}`);

      return successResponse({
        user: updatedUser,
        message: `User status updated to ${status}`
      });
    } catch (error) {
      context.error('Error updating user status:', error);
      
      if (error.message === 'User not found') {
        return errorResponse(404, 'User not found');
      }
      
      return errorResponse(500, 'Failed to update user status');
    }
  }
});
