import { app } from '@azure/functions';
import * as userService from '../shared/services/userService.js';
import { createSuccessResponse, createErrorResponse } from '../shared/httpResponse.js';
import { requireAuth, requireAdmin, getCurrentUser } from '../shared/authMiddleware.js';

/**
 * GET /api/admin/users - List all users with pagination and filtering
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
        return createErrorResponse('Authentication required', 401);
      }
      if (!authResult.isAdmin) {
        return createErrorResponse('Admin access required', 403);
      }

      // Parse query parameters
      const url = new URL(request.url);
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const continuationToken = url.searchParams.get('continuationToken') || null;
      const status = url.searchParams.get('status') || null;
      const search = url.searchParams.get('search') || null;

      // Validate limit
      if (limit < 1 || limit > 100) {
        return createErrorResponse('Limit must be between 1 and 100', 400);
      }

      // Validate status
      if (status && !Object.values(userService.UserStatus).includes(status)) {
        return createErrorResponse('Invalid status value', 400);
      }

      // Get users
      const result = await userService.listUsers({
        limit,
        continuationToken,
        status,
        search
      });

      return createSuccessResponse(result);
    } catch (error) {
      context.error('Error listing users:', error);
      return createErrorResponse('Failed to list users', 500);
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
        return createErrorResponse('Authentication required', 401);
      }
      if (!authResult.isAdmin) {
        return createErrorResponse('Admin access required', 403);
      }

      const userId = request.params.id;

      if (!userId) {
        return createErrorResponse('User ID is required', 400);
      }

      const user = await userService.getUserById(userId);

      if (!user) {
        return createErrorResponse('User not found', 404);
      }

      return createSuccessResponse(user);
    } catch (error) {
      context.error('Error getting user:', error);
      return createErrorResponse('Failed to get user', 500);
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
        return createErrorResponse('Authentication required', 401);
      }
      if (!authResult.isAdmin) {
        return createErrorResponse('Admin access required', 403);
      }

      const userId = request.params.id;
      const currentUser = getCurrentUser(request);

      if (!userId) {
        return createErrorResponse('User ID is required', 400);
      }

      // Parse request body
      const { status, reason } = await request.json();

      if (!status) {
        return createErrorResponse('Status is required', 400);
      }

      // Validate status
      if (!Object.values(userService.UserStatus).includes(status)) {
        return createErrorResponse(`Invalid status. Must be one of: ${Object.values(userService.UserStatus).join(', ')}`, 400);
      }

      // Prevent admin from blocking themselves
      if (userId === currentUser.userId) {
        return createErrorResponse('You cannot change your own status', 400);
      }

      // Update status
      const updatedUser = await userService.updateUserStatus(userId, status, currentUser.userId);

      // Log the action
      context.log(`Admin ${currentUser.userDetails} changed user ${userId} status to ${status}. Reason: ${reason || 'None provided'}`);

      return createSuccessResponse({
        user: updatedUser,
        message: `User status updated to ${status}`
      });
    } catch (error) {
      context.error('Error updating user status:', error);
      
      if (error.message === 'User not found') {
        return createErrorResponse('User not found', 404);
      }
      
      return createErrorResponse('Failed to update user status', 500);
    }
  }
});

/**
 * GET /api/admin/users/stats - Get user statistics
 */
app.http('adminGetUserStats', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'admin/users/stats',
  handler: async (request, context) => {
    try {
      // Check admin authentication
      const authResult = await requireAdmin(request);
      if (!authResult.authenticated) {
        return createErrorResponse('Authentication required', 401);
      }
      if (!authResult.isAdmin) {
        return createErrorResponse('Admin access required', 403);
      }

      const stats = await userService.getUserStats();

      return createSuccessResponse(stats);
    } catch (error) {
      context.error('Error getting user stats:', error);
      return createErrorResponse('Failed to get user stats', 500);
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
        return createErrorResponse('Authentication required', 401);
      }
      if (!authResult.isAdmin) {
        return createErrorResponse('Admin access required', 403);
      }

      const userId = request.params.id;
      const currentUser = getCurrentUser(request);

      if (!userId) {
        return createErrorResponse('User ID is required', 400);
      }

      // Prevent admin from deleting themselves
      if (userId === currentUser.userId) {
        return createErrorResponse('You cannot delete your own account', 400);
      }

      // Soft delete by blocking
      const updatedUser = await userService.updateUserStatus(userId, userService.UserStatus.BLOCKED, currentUser.userId);

      context.log(`Admin ${currentUser.userDetails} deleted (blocked) user ${userId}`);

      return createSuccessResponse({
        message: 'User has been blocked (soft deleted)',
        user: updatedUser
      });
    } catch (error) {
      context.error('Error deleting user:', error);
      
      if (error.message === 'User not found') {
        return createErrorResponse('User not found', 404);
      }
      
      return createErrorResponse('Failed to delete user', 500);
    }
  }
});
