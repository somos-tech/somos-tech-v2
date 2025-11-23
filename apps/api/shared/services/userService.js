import { getContainer as getDbContainer } from '../db.js';

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
  GOOGLE: 'google'
};

/**
 * Create a new user profile
 * @param {Object} userData - User data from authentication provider
 * @returns {Promise<Object>} Created user profile
 */
async function createUser(userData) {
  const now = new Date().toISOString();
  
  const user = {
    id: userData.userId || userData.id,
    email: userData.email.toLowerCase(),
    displayName: userData.displayName || userData.name || extractNameFromEmail(userData.email),
    profilePicture: userData.profilePicture || null,
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
 * Update user last login timestamp
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
async function updateLastLogin(userId) {
  const user = await getUserById(userId);
  
  if (!user) {
    return;
  }

  const updatedUser = {
    ...user,
    lastLoginAt: new Date().toISOString(),
    'metadata.firstLogin': false
  };

  await getContainer().item(userId, userId).replace(updatedUser);
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
  if (!user) {
    user = await createUser(authUser);
  } else {
    // Update last login
    await updateLastLogin(user.id);
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
  }
  return AuthProvider.EXTERNAL_ID;
}

export {
  UserStatus,
  AuthProvider,
  createUser,
  getUserById,
  getUserByEmail,
  updateUser,
  updateLastLogin,
  updateUserStatus,
  listUsers,
  getOrCreateUser,
  isUserBlocked,
  getUserStats
};
