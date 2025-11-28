import { app } from '@azure/functions';
import { getClientPrincipal } from '../shared/authMiddleware.js';
import { 
  getOrCreateUser, 
  syncProfilePictureFromProvider,
  getProfilePicture 
} from '../shared/services/userService.js';

/**
 * Sync User Profile Endpoint
 * 
 * Called by the frontend after successful Auth0 login to:
 * 1. Create or update the user profile in Cosmos DB
 * 2. Sync profile picture from social provider (Google, etc.)
 * 3. Return the current user profile with best available picture
 * 
 * The frontend should call this endpoint after receiving the auth callback
 * and before displaying the user profile.
 */
app.http('syncUserProfile', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'user/sync',
  handler: async (request, context) => {
    try {
      const principal = getClientPrincipal(request);
      
      if (!principal || !principal.userId) {
        return {
          status: 401,
          jsonBody: { error: 'Not authenticated' }
        };
      }

      context.log(`Syncing user profile for: ${principal.userDetails}`);

      // Get additional claims from request body (frontend can pass /.auth/me response)
      let claims = principal.claims || [];
      try {
        const body = await request.json();
        if (body.claims && Array.isArray(body.claims)) {
          claims = body.claims;
        }
      } catch (e) {
        // No body or not JSON, use principal claims
      }

      // Merge claims into principal for profile picture extraction
      const principalWithClaims = {
        ...principal,
        claims: claims.length > 0 ? claims : principal.claims
      };

      // Get or create user in database
      const user = await getOrCreateUser({
        userId: principal.userId,
        email: principal.userDetails,
        identityProvider: principal.identityProvider,
        displayName: extractDisplayNameFromClaims(claims) || principal.userDetails,
        claims: claims
      });

      if (!user) {
        return {
          status: 500,
          jsonBody: { error: 'Failed to sync user profile' }
        };
      }

      // Sync profile picture from provider if available
      await syncProfilePictureFromProvider(user.id, principalWithClaims);

      // Get the best available profile picture
      const profilePicture = getProfilePicture(user, principalWithClaims);

      context.log(`User profile synced: ${user.email}, picture: ${profilePicture ? 'yes' : 'no'}`);

      return {
        status: 200,
        jsonBody: {
          success: true,
          user: {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            profilePicture: profilePicture,
            status: user.status,
            authProvider: user.authProvider,
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt
          }
        }
      };

    } catch (error) {
      context.log.error('Error syncing user profile:', error);
      return {
        status: 500,
        jsonBody: { error: 'Failed to sync user profile' }
      };
    }
  }
});

/**
 * Extract display name from claims array
 * Auth0 and social providers include name in different claim types
 */
function extractDisplayNameFromClaims(claims) {
  if (!claims || !Array.isArray(claims)) return null;
  
  // Look for common name claims
  const nameClaimTypes = ['name', 'displayname', 'given_name', 'nickname'];
  
  for (const claimType of nameClaimTypes) {
    const claim = claims.find(c => 
      c.typ?.toLowerCase() === claimType || 
      c.typ?.toLowerCase().includes(claimType)
    );
    if (claim && claim.val) {
      return claim.val;
    }
  }
  
  // Try to construct from given_name + family_name
  const givenName = claims.find(c => c.typ?.toLowerCase() === 'given_name')?.val;
  const familyName = claims.find(c => c.typ?.toLowerCase() === 'family_name')?.val;
  
  if (givenName && familyName) {
    return `${givenName} ${familyName}`;
  }
  
  if (givenName) return givenName;
  
  return null;
}
