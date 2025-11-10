import { app } from '@azure/functions';
import * as userService from '../shared/services/userService.js';
import { successResponse, errorResponse } from '../shared/httpResponse.js';
import { requireAuth, getCurrentUser } from '../shared/authMiddleware.js';

/**
 * GET /api/users/me - Get current user profile
 */
app.http('getUserProfile', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'users/me',
  handler: async (request, context) => {
    try {
      // Check authentication
      const authResult = await requireAuth(request);
      if (!authResult.authenticated) {
        return errorResponse('Authentication required', 401);
      }

      const currentUser = getCurrentUser(request);
      
      // Get or create user profile
      const user = await userService.getOrCreateUser({
        userId: currentUser.userId,
        email: currentUser.userDetails,
        name: currentUser.claims?.find(c => c.typ === 'name')?.val,
        identityProvider: currentUser.identityProvider
      });

      // Check if user is blocked
      if (user.status === 'blocked') {
        return errorResponse('Your account has been blocked. Please contact support.', 403);
      }

      // Remove sensitive fields
      const { statusChangedBy, ...safeUser } = user;

      return successResponse(safeUser);
    } catch (error) {
      context.error('Error getting user profile:', error);
      return errorResponse('Failed to get user profile', 500);
    }
  }
});

/**
 * PUT /api/users/me - Update current user profile
 */
app.http('updateUserProfile', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'users/me',
  handler: async (request, context) => {
    try {
      // Check authentication
      const authResult = await requireAuth(request);
      if (!authResult.authenticated) {
        return errorResponse('Authentication required', 401);
      }

      const currentUser = getCurrentUser(request);
      
      // Check if user is blocked
      const isBlocked = await userService.isUserBlocked(currentUser.userId);
      if (isBlocked) {
        return errorResponse('Your account has been blocked', 403);
      }

      // Parse request body
      const updates = await request.json();

      // Validate updates
      const allowedFields = ['displayName', 'profilePicture', 'bio', 'location', 'website'];
      const invalidFields = Object.keys(updates).filter(key => !allowedFields.includes(key));
      
      if (invalidFields.length > 0) {
        return errorResponse(`Invalid fields: ${invalidFields.join(', ')}`, 400);
      }

      // Validate displayName
      if (updates.displayName !== undefined) {
        if (typeof updates.displayName !== 'string' || updates.displayName.trim().length === 0) {
          return errorResponse('Display name cannot be empty', 400);
        }
        if (updates.displayName.length > 100) {
          return errorResponse('Display name must be 100 characters or less', 400);
        }
        updates.displayName = updates.displayName.trim();
      }

      // Validate profilePicture URL
      if (updates.profilePicture !== undefined && updates.profilePicture !== null) {
        if (typeof updates.profilePicture !== 'string') {
          return errorResponse('Profile picture must be a URL string', 400);
        }
        // Basic URL validation
        try {
          new URL(updates.profilePicture);
        } catch {
          return errorResponse('Invalid profile picture URL', 400);
        }
      }

      // Validate bio
      if (updates.bio !== undefined && updates.bio !== null) {
        if (typeof updates.bio !== 'string') {
          return errorResponse('Bio must be a string', 400);
        }
        if (updates.bio.length > 500) {
          return errorResponse('Bio must be 500 characters or less', 400);
        }
      }

      // Validate website
      if (updates.website !== undefined && updates.website !== null) {
        if (typeof updates.website !== 'string') {
          return errorResponse('Website must be a URL string', 400);
        }
        try {
          new URL(updates.website);
        } catch {
          return errorResponse('Invalid website URL', 400);
        }
      }

      // Update user
      const updatedUser = await userService.updateUser(currentUser.userId, updates);

      return successResponse(updatedUser);
    } catch (error) {
      context.error('Error updating user profile:', error);
      
      if (error.message === 'User not found') {
        return errorResponse('User not found', 404);
      }
      
      return errorResponse('Failed to update user profile', 500);
    }
  }
});

/**
 * GET /api/users/:id - Get user by ID (for public profiles, comments, groups)
 */
app.http('getUserById', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'users/{id}',
  handler: async (request, context) => {
    try {
      const userId = request.params.id;

      if (!userId) {
        return errorResponse('User ID is required', 400);
      }

      const user = await userService.getUserById(userId);

      if (!user) {
        return errorResponse('User not found', 404);
      }

      // Return only public fields
      const publicUser = {
        id: user.id,
        displayName: user.displayName,
        profilePicture: user.profilePicture,
        bio: user.bio || null,
        location: user.location || null,
        website: user.website || null,
        createdAt: user.createdAt
      };

      return successResponse(publicUser);
    } catch (error) {
      context.error('Error getting user by ID:', error);
      return errorResponse('Failed to get user', 500);
    }
  }
});

/**
 * POST /api/users/sync - Sync user profile with auth provider
 * Called automatically on login to create/update user record
 */
app.http('syncUserProfile', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'users/sync',
  handler: async (request, context) => {
    try {
      context.log('[syncUserProfile] Starting sync...');
      
      // Check authentication
      const authResult = await requireAuth(request);
      context.log('[syncUserProfile] Auth result:', authResult);
      
      if (!authResult.authenticated) {
        return errorResponse('Authentication required', 401);
      }

      const currentUser = getCurrentUser(request);
      context.log('[syncUserProfile] Current user:', currentUser?.userDetails);
      
      // Get or create user profile
      const user = await userService.getOrCreateUser({
        userId: currentUser.userId,
        email: currentUser.userDetails,
        name: currentUser.claims?.find(c => c.typ === 'name')?.val,
        identityProvider: currentUser.identityProvider,
        emailVerified: currentUser.claims?.find(c => c.typ === 'email_verified')?.val === 'true'
      });

      context.log('[syncUserProfile] User synced successfully');

      // Check if user is blocked
      if (user.status === 'blocked') {
        return errorResponse('Your account has been blocked', 403);
      }

      return successResponse({
        user,
        isNewUser: user.metadata?.firstLogin || false
      });
    } catch (error) {
      context.error('[syncUserProfile] Error:', error.message, error.stack);
      return errorResponse(`Failed to sync user profile: ${error.message}`, 500);
    }
  }
});
