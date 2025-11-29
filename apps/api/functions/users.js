import { app } from '@azure/functions';
import * as userService from '../shared/services/userService.js';
import * as graphService from '../shared/services/graphService.js';
import { successResponse, errorResponse } from '../shared/httpResponse.js';
import { requireAuth, getCurrentUser } from '../shared/authMiddleware.js';
import { moderateContent } from '../shared/services/moderationService.js';

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
      
      // Check if user is blocked (pass email for fallback lookup)
      const isBlocked = await userService.isUserBlocked(currentUser.userId, currentUser.userDetails);
      if (isBlocked) {
        return errorResponse('Your account has been blocked', 403);
      }

      // Parse request body
      const updates = await request.json();

      // Validate updates
      const allowedFields = ['displayName', 'profilePicture', 'bio', 'location', 'website', 'showLocation'];
      const invalidFields = Object.keys(updates).filter(key => !allowedFields.includes(key));
      
      if (invalidFields.length > 0) {
        return errorResponse(`Invalid fields: ${invalidFields.join(', ')}`, 400);
      }

      // Validate showLocation
      if (updates.showLocation !== undefined && typeof updates.showLocation !== 'boolean') {
        return errorResponse('showLocation must be a boolean', 400);
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

      // ========== CONTENT MODERATION ==========
      // Moderate text fields (displayName, bio, website) before saving
      const textFieldsToModerate = [];
      
      if (updates.displayName) {
        textFieldsToModerate.push(updates.displayName);
      }
      if (updates.bio) {
        textFieldsToModerate.push(updates.bio);
      }
      if (updates.website) {
        textFieldsToModerate.push(updates.website);
      }

      // Only run moderation if there are text fields to check
      if (textFieldsToModerate.length > 0) {
        const combinedText = textFieldsToModerate.join(' ');
        
        try {
          const moderationResult = await moderateContent({
            type: 'profile',
            text: combinedText,
            userId: currentUser.userId,
            userEmail: currentUser.userDetails,
            contentId: `profile-${currentUser.userId}`,
            workflow: 'profile'
          });

          context.log('[Profile Moderation] Result:', {
            allowed: moderationResult.allowed,
            action: moderationResult.action,
            reason: moderationResult.reason,
            tierFlow: moderationResult.tierFlow?.map(t => ({ tier: t.tier, action: t.action }))
          });

          // Block the update if moderation failed
          if (!moderationResult.allowed) {
            const blockReason = moderationResult.tier1Result?.matches?.length > 0
              ? 'Your profile contains inappropriate content that violates our community guidelines.'
              : moderationResult.tier2Result?.issues?.length > 0
                ? 'Your profile contains a link that has been flagged as potentially harmful.'
                : 'Your profile content has been flagged for review. Please revise and try again.';
            
            return errorResponse(blockReason, 400);
          }

          // If content needs review, allow but flag
          if (moderationResult.needsReview) {
            context.log('[Profile Moderation] Content allowed but flagged for review');
          }
        } catch (moderationError) {
          // Log but don't block on moderation service errors
          context.error('[Profile Moderation] Error during moderation:', moderationError);
          // Continue with update if moderation fails (fail open for profile updates)
        }
      }

      // Update user - pass email for fallback lookup (Entra ID users may have different ID than Auth0)
      const userEmail = currentUser.userDetails; // email is in userDetails
      const updatedUser = await userService.updateUser(currentUser.userId, updates, userEmail);

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
      // Respect showLocation privacy setting (default to true if not set)
      const showLocation = user.showLocation !== false;
      
      const publicUser = {
        id: user.id,
        displayName: user.displayName,
        profilePicture: user.profilePicture,
        bio: user.bio || null,
        location: showLocation ? (user.location || null) : null,
        lastLoginLocation: showLocation ? (user.lastLoginLocation || null) : null,
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
      
      // Extract client IP from various headers (Azure passes through X-Forwarded-For)
      const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
        || request.headers.get('x-client-ip')
        || request.headers.get('x-real-ip')
        || 'unknown';
      
      // Get user agent
      const userAgent = request.headers.get('user-agent') || 'unknown';
      
      // First, try to get location from Microsoft Graph sign-in logs (most accurate)
      let locationInfo = null;
      let locationSource = null;
      
      if (graphService.isGraphEnabled() && currentUser?.userDetails) {
        try {
          const signInData = await graphService.getLatestSignIn(currentUser.userDetails);
          if (signInData?.location) {
            locationInfo = {
              city: signInData.location.city,
              region: signInData.location.state,
              country: signInData.location.country,
              latitude: signInData.location.latitude,
              longitude: signInData.location.longitude
            };
            locationSource = 'entra';
            context.log('[syncUserProfile] Location from Entra sign-in logs:', locationInfo);
          }
        } catch (graphError) {
          context.log('[syncUserProfile] Entra sign-in lookup failed (falling back to IP):', graphError.message);
        }
      }
      
      // Fallback: Try to get location from IP using free API (ip-api.com)
      if (!locationInfo && clientIp && clientIp !== 'unknown' && !clientIp.startsWith('10.') && !clientIp.startsWith('192.168.') && !clientIp.startsWith('127.')) {
        try {
          const geoResponse = await fetch(`http://ip-api.com/json/${clientIp}?fields=status,country,regionName,city,lat,lon`);
          if (geoResponse.ok) {
            const geoData = await geoResponse.json();
            if (geoData.status === 'success') {
              locationInfo = {
                city: geoData.city,
                region: geoData.regionName,
                country: geoData.country,
                latitude: geoData.lat,
                longitude: geoData.lon
              };
              locationSource = 'ip-api';
              context.log('[syncUserProfile] Location from IP lookup:', locationInfo);
            }
          }
        } catch (geoError) {
          context.log('[syncUserProfile] IP geo lookup failed (non-critical):', geoError.message);
        }
      }
      
      // Get or create user profile
      const user = await userService.getOrCreateUser({
        userId: currentUser.userId,
        email: currentUser.userDetails,
        name: currentUser.claims?.find(c => c.typ === 'name')?.val,
        identityProvider: currentUser.identityProvider,
        emailVerified: currentUser.claims?.find(c => c.typ === 'email_verified')?.val === 'true',
        ip: clientIp,
        location: locationInfo,
        locationSource: locationSource,
        userAgent: userAgent
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
