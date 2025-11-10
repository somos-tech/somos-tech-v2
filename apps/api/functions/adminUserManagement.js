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
  route: 'admin/users',
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
        const stats = await userService.getUserStats();
        return successResponse(stats);
      }

      const limit = parseInt(url.searchParams.get('limit') || '50');
      const continuationToken = url.searchParams.get('continuationToken') || null;
      const status = url.searchParams.get('status') || null;
      const search = url.searchParams.get('search') || null;

      // Validate limit
      if (limit < 1 || limit > 100) {
        return errorResponse(400, 'Limit must be between 1 and 100');
      }

      // Validate status
      if (status && !Object.values(userService.UserStatus).includes(status)) {
        return errorResponse(400, 'Invalid status value');
      }

      // Get users
      const result = await userService.listUsers({
        limit,
        continuationToken,
        status,
        search
      });

      return successResponse(result);
    } catch (error) {
      context.error('Error listing users:', error);
      return errorResponse(500, 'Failed to list users or stats');
    }
  }
});

/**
 * GET /api/admin/users/:id - Get user details by ID
 */
app.http('adminGetUser', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'admin/users/{id}',
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

      const user = await userService.getUserById(userId);

      if (!user) {
        return errorResponse(404, 'User not found');
      }

      return successResponse(user);
    } catch (error) {
      context.error('Error getting user:', error);
      return errorResponse(500, 'Failed to get user');
    }
  }
});

/**
 * PUT /api/admin/users/:id/status - Update user status (block/allow)
 */
app.http('adminUpdateUserStatus', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'admin/users/{id}/status',
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

/**
 * DELETE /api/admin/users/:id - Delete user (soft delete by blocking)
 */
app.http('adminDeleteUser', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'admin/users/{id}',
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
    } catch (error) {
      context.error('Error deleting user:', error);
      
      if (error.message === 'User not found') {
        return errorResponse(404, 'User not found');
      }
      
      return errorResponse(500, 'Failed to delete user');
    }
  }
});
