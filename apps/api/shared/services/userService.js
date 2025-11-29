import { getContainer as getDbContainer } from '../db.js';
import crypto from 'crypto';
import { assignUserToNearestGroup } from './locationService.js';

function getContainer() {
  return getDbContainer('users');
}

/**
 * User Status Enum
 */
const UserStatus = {
  ACTIVE: 'active',
  BLOCKED: 'blocked',
  PENDING: 'pending'
};

/**
 * Auth Provider Enum
 */
const AuthProvider = {
  EXTERNAL_ID: 'external-id',
  AZURE_AD: 'azure-ad',
  MICROSOFT: 'microsoft',
  GOOGLE: 'google',
  AUTH0: 'auth0'
};

/**
 * Create a new user profile
 * @param {Object} userData - User data from authentication provider
 * @returns {Promise<Object>} Created user profile
 */
async function createUser(userData) {
  const now = new Date().toISOString();
  
  // Extract picture from claims if available
  const providerPicture = extractProfilePictureFromClaims(userData);
  
  // Use provider picture, or fall back to Gravatar
  const profilePicture = userData.profilePicture || 
                         providerPicture || 
                         generateGravatarUrl(userData.email);
  
  const user = {
    id: userData.userId || userData.id,
    email: userData.email.toLowerCase(),
    displayName: userData.displayName || userData.name || extractNameFromEmail(userData.email),
    profilePicture: profilePicture,
    providerPicture: providerPicture, // Store provider picture separately for comparison
    authProvider: determineAuthProvider(userData),
    status: UserStatus.ACTIVE,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
    metadata: {
      signupIp: userData.ip || null,
      emailVerified: userData.emailVerified || false,
      firstLogin: true
    }
  };

  const { resource } = await getContainer().items.create(user);
  return resource;
}

/**
 * Get user by ID
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} User profile or null
 */
async function getUserById(userId) {
  try {
    const { resource } = await getContainer().item(userId, userId).read();
    return resource;
  } catch (error) {
    if (error.code === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Get user by email
 * @param {string} email - User email
 * @returns {Promise<Object|null>} User profile or null
 */
async function getUserByEmail(email) {
  const querySpec = {
    query: 'SELECT * FROM users u WHERE LOWER(u.email) = @email',
    parameters: [
      { name: '@email', value: email.toLowerCase() }
    ]
  };

  const { resources } = await getContainer().items.query(querySpec).fetchAll();
  return resources.length > 0 ? resources[0] : null;
}

/**
 * Update user profile
 * @param {string} userId - User ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated user profile
 */
async function updateUser(userId, updates) {
  const user = await getUserById(userId);
  
  if (!user) {
    throw new Error('User not found');
  }

  // Only allow updating specific fields
  const allowedFields = ['displayName', 'profilePicture', 'bio', 'location', 'website'];
  const sanitizedUpdates = {};
  
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      sanitizedUpdates[field] = updates[field];
    }
  }

  const updatedUser = {
    ...user,
    ...sanitizedUpdates,
    updatedAt: new Date().toISOString()
  };

  const { resource } = await getContainer().item(userId, userId).replace(updatedUser);
  return resource;
}

/**
 * Update user last login timestamp and location
 * @param {string} userId - User ID
 * @param {Object} loginData - Login metadata (ip, userAgent, location, etc.)
 * @returns {Promise<void>}
 */
async function updateLastLogin(userId, loginData = {}) {
  const user = await getUserById(userId);
  
  if (!user) {
    return;
  }

  // Build login history entry
  const loginEntry = {
    timestamp: new Date().toISOString(),
    ip: loginData.ip || null,
    location: loginData.location || null,
    locationSource: loginData.locationSource || null,
    userAgent: loginData.userAgent || null
  };

  // Keep last 10 login entries in history
  const loginHistory = user.loginHistory || [];
  loginHistory.unshift(loginEntry);
  if (loginHistory.length > 10) {
    loginHistory.pop();
  }

  const updatedUser = {
    ...user,
    lastLoginAt: new Date().toISOString(),
    lastLoginIp: loginData.ip || user.lastLoginIp || null,
    lastLoginLocation: loginData.location || user.lastLoginLocation || null,
    lastLoginLocationSource: loginData.locationSource || user.lastLoginLocationSource || null,
    lastLoginUserAgent: loginData.userAgent || user.lastLoginUserAgent || null,
    loginHistory: loginHistory,
    metadata: {
      ...user.metadata,
      firstLogin: false,
      loginCount: (user.metadata?.loginCount || 0) + 1
    }
  };

  await getContainer().item(userId, userId).replace(updatedUser);
}

/**
 * Update user metadata (internal)
 * @param {string} userId - User ID
 * @param {Object} metadataUpdates - Metadata fields to update/add
 * @returns {Promise<Object>} Updated user profile
 */
async function updateUserMetadata(userId, metadataUpdates) {
  const user = await getUserById(userId);
  
  if (!user) {
    throw new Error('User not found');
  }

  const updatedUser = {
    ...user,
    metadata: {
      ...user.metadata,
      ...metadataUpdates
    },
    updatedAt: new Date().toISOString()
  };

  const { resource } = await getContainer().item(userId, userId).replace(updatedUser);
  return resource;
}

/**
 * Update user status (admin only)
 * @param {string} userId - User ID
 * @param {string} status - New status (active/blocked)
 * @param {string} adminId - Admin user ID performing the action
 * @returns {Promise<Object>} Updated user profile
 */
async function updateUserStatus(userId, status, adminId) {
  const user = await getUserById(userId);
  
  if (!user) {
    throw new Error('User not found');
  }

  if (!Object.values(UserStatus).includes(status)) {
    throw new Error('Invalid status value');
  }

  const updatedUser = {
    ...user,
    status,
    updatedAt: new Date().toISOString(),
    statusChangedBy: adminId,
    statusChangedAt: new Date().toISOString()
  };

  const { resource } = await getContainer().item(userId, userId).replace(updatedUser);
  return resource;
}

/**
 * List all users with pagination
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Users list with pagination info
 */
async function listUsers(options = {}) {
  const {
    limit = 50,
    continuationToken = null,
    status = null,
    search = null
  } = options;

  let query = 'SELECT * FROM users u';
  const parameters = [];

  // Build WHERE clause
  const conditions = [];
  
  if (status) {
    conditions.push('u.status = @status');
    parameters.push({ name: '@status', value: status });
  }

  if (search) {
    conditions.push('(CONTAINS(LOWER(u.email), @search) OR CONTAINS(LOWER(u.displayName), @search))');
    parameters.push({ name: '@search', value: search.toLowerCase() });
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY u.createdAt DESC';

  const querySpec = {
    query,
    parameters
  };

  const queryIterator = getContainer().items.query(querySpec, {
    maxItemCount: limit,
    continuationToken
  });

  const { resources, continuationToken: nextToken } = await queryIterator.fetchNext();

  return {
    users: resources,
    continuationToken: nextToken,
    hasMore: !!nextToken
  };
}

/**
 * Get or create user (for automatic registration on first login)
 * Also auto-assigns user to their nearest city group based on location
 * @param {Object} authUser - Authenticated user data from provider
 * @returns {Promise<Object>} User profile
 */
async function getOrCreateUser(authUser) {
  // Try to find existing user
  let user = await getUserById(authUser.userId);
  
  if (!user && authUser.email) {
    user = await getUserByEmail(authUser.email);
  }

  // Create new user if doesn't exist
  const isNewUser = !user;
  if (isNewUser) {
    user = await createUser(authUser);
    
    // Auto-assign new user to nearest city group if location available
    if (authUser.location) {
      try {
        const groupAssignment = await assignUserToNearestGroup(user, authUser.location);
        if (groupAssignment?.assigned) {
          console.log(`[LocationService] Auto-assigned new user ${user.email} to ${groupAssignment.groupName} (${groupAssignment.method}, ${groupAssignment.distance ? groupAssignment.distance + ' miles' : 'city match'})`);
          
          // Store the auto-assignment info on the user
          user = await updateUserMetadata(user.id, {
            autoAssignedGroup: groupAssignment.groupId,
            autoAssignedGroupName: groupAssignment.groupName,
            autoAssignedAt: new Date().toISOString()
          });
        }
      } catch (locationError) {
        // Non-critical - log but don't fail user creation
        console.error('[LocationService] Failed to auto-assign group:', locationError.message);
      }
    }
  } else {
    // Update last login with location data
    await updateLastLogin(user.id, {
      ip: authUser.ip,
      location: authUser.location,
      userAgent: authUser.userAgent
    });
    // Refresh user data
    user = await getUserById(user.id);
  }

  return user;
}

/**
 * Check if user is blocked
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} True if blocked
 */
async function isUserBlocked(userId) {
  const user = await getUserById(userId);
  return user ? user.status === UserStatus.BLOCKED : false;
}

/**
 * Get user statistics (admin only)
 * @returns {Promise<Object>} User statistics
 */
async function getUserStats() {
  const totalQuery = {
    query: 'SELECT VALUE COUNT(1) FROM users'
  };
  
  const activeQuery = {
    query: 'SELECT VALUE COUNT(1) FROM users u WHERE u.status = @status',
    parameters: [{ name: '@status', value: UserStatus.ACTIVE }]
  };

  const blockedQuery = {
    query: 'SELECT VALUE COUNT(1) FROM users u WHERE u.status = @status',
    parameters: [{ name: '@status', value: UserStatus.BLOCKED }]
  };

  const container = getContainer();
  const [totalResult, activeResult, blockedResult] = await Promise.all([
    container.items.query(totalQuery).fetchAll(),
    container.items.query(activeQuery).fetchAll(),
    container.items.query(blockedQuery).fetchAll()
  ]);

  return {
    total: totalResult.resources[0] || 0,
    active: activeResult.resources[0] || 0,
    blocked: blockedResult.resources[0] || 0
  };
}

// Helper functions

/**
 * Extract display name from email
 * @param {string} email - Email address
 * @returns {string} Display name
 */
function extractNameFromEmail(email) {
  const username = email.split('@')[0];
  return username
    .split(/[._-]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * Determine auth provider from user data
 * @param {Object} userData - User data from auth
 * @returns {string} Auth provider identifier
 */
function determineAuthProvider(userData) {
  if (userData.identityProvider) {
    const provider = userData.identityProvider.toLowerCase();
    if (provider.includes('google')) return AuthProvider.GOOGLE;
    if (provider.includes('microsoft')) return AuthProvider.MICROSOFT;
    if (provider.includes('aad') || provider.includes('azuread')) return AuthProvider.AZURE_AD;
    if (provider.includes('auth0')) return AuthProvider.AUTH0;
  }
  return AuthProvider.EXTERNAL_ID;
}

/**
 * Generate a Gravatar URL for an email address
 * Falls back to a default avatar if user has no Gravatar
 * @param {string} email - User's email address
 * @param {number} size - Avatar size in pixels (default 200)
 * @returns {string} Gravatar URL
 */
function generateGravatarUrl(email, size = 200) {
  if (!email) return null;
  
  // MD5 hash of lowercase email
  const hash = crypto.createHash('md5').update(email.toLowerCase().trim()).digest('hex');
  
  // d=mp means "mystery person" default, d=identicon generates unique patterns
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=identicon`;
}

/**
 * Extract profile picture URL from authentication claims
 * Auth0 and social providers include picture in claims
 * @param {Object} principal - Client principal from auth provider
 * @returns {string|null} Profile picture URL or null
 */
function extractProfilePictureFromClaims(principal) {
  if (!principal) return null;
  
  // Check claims array (from /.auth/me or rolesSource body)
  if (principal.claims && Array.isArray(principal.claims)) {
    // Look for picture claim - Auth0 and social providers use this
    const pictureClaim = principal.claims.find(
      c => c.typ === 'picture' || c.typ === 'photo' || c.typ === 'avatar'
    );
    if (pictureClaim && pictureClaim.val) {
      return pictureClaim.val;
    }
    
    // Some providers use different claim names
    const imageClaim = principal.claims.find(
      c => c.typ?.includes('picture') || c.typ?.includes('photo') || c.typ?.includes('image')
    );
    if (imageClaim && imageClaim.val) {
      return imageClaim.val;
    }
  }
  
  // Direct property (some implementations pass it directly)
  if (principal.picture) return principal.picture;
  if (principal.photo) return principal.photo;
  if (principal.avatar) return principal.avatar;
  
  return null;
}

/**
 * Get the best available profile picture for a user
 * Priority: Provider picture > Uploaded picture > Gravatar
 * @param {Object} user - User object from database
 * @param {Object} principal - Client principal with claims (optional)
 * @returns {string} Profile picture URL
 */
function getProfilePicture(user, principal = null) {
  // 1. Check if user uploaded a custom picture
  if (user?.profilePicture && !user.profilePicture.includes('gravatar.com')) {
    return user.profilePicture;
  }
  
  // 2. Check for picture from auth provider claims
  const providerPicture = extractProfilePictureFromClaims(principal);
  if (providerPicture) {
    return providerPicture;
  }
  
  // 3. Check stored provider picture
  if (user?.providerPicture) {
    return user.providerPicture;
  }
  
  // 4. Check existing profile picture (could be gravatar)
  if (user?.profilePicture) {
    return user.profilePicture;
  }
  
  // 5. Fall back to Gravatar
  return generateGravatarUrl(user?.email);
}

/**
 * Update user's profile picture from auth provider
 * Called on login to sync latest picture from social providers
 * @param {string} userId - User ID
 * @param {Object} principal - Client principal with claims
 * @returns {Promise<Object|null>} Updated user or null if no update needed
 */
async function syncProfilePictureFromProvider(userId, principal) {
  const providerPicture = extractProfilePictureFromClaims(principal);
  
  if (!providerPicture) {
    return null;
  }
  
  const user = await getUserById(userId);
  if (!user) {
    return null;
  }
  
  // Only update if:
  // 1. User doesn't have a custom uploaded picture, OR
  // 2. Provider picture has changed
  const hasCustomPicture = user.profilePicture && 
    !user.profilePicture.includes('gravatar.com') && 
    user.profilePicture !== user.providerPicture;
  
  if (!hasCustomPicture || user.providerPicture !== providerPicture) {
    const updates = {
      providerPicture: providerPicture
    };
    
    // If no custom picture, also set as main profile picture
    if (!hasCustomPicture) {
      updates.profilePicture = providerPicture;
    }
    
    return await updateUser(userId, updates);
  }
  
  return null;
}

export {
  UserStatus,
  AuthProvider,
  createUser,
  getUserById,
  getUserByEmail,
  updateUser,
  updateLastLogin,
  updateUserMetadata,
  updateUserStatus,
  listUsers,
  getOrCreateUser,
  isUserBlocked,
  getUserStats,
  generateGravatarUrl,
  extractProfilePictureFromClaims,
  getProfilePicture,
  syncProfilePictureFromProvider
};
