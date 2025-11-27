/**
 * User Status Enum
 */
export enum UserStatus {
  ACTIVE = 'active',
  BLOCKED = 'blocked',
  PENDING = 'pending'
}

/**
 * Auth Provider Enum
 */
export enum AuthProvider {
  EXTERNAL_ID = 'external-id',
  AZURE_AD = 'azure-ad',
  MICROSOFT = 'microsoft',
  GOOGLE = 'google'
}

/**
 * User Profile Interface
 */
export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  profilePicture: string | null;
  bio?: string | null;
  location?: string | null;
  website?: string | null;
  authProvider: AuthProvider;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
  lastLoginIp?: string | null;
  lastLoginLocation?: {
    city?: string;
    region?: string;
    country?: string;
  } | null;
  lastLoginUserAgent?: string | null;
  metadata?: {
    signupIp?: string | null;
    emailVerified?: boolean;
    firstLogin?: boolean;
    loginCount?: number;
  };
  statusChangedBy?: string;
  statusChangedAt?: string;
}

/**
 * Public User Profile (limited fields for public display)
 */
export interface PublicUserProfile {
  id: string;
  displayName: string;
  profilePicture: string | null;
  bio?: string | null;
  location?: string | null;
  website?: string | null;
  createdAt: string;
}

/**
 * User Profile Update DTO
 */
export interface UserProfileUpdate {
  displayName?: string;
  profilePicture?: string | null;
  bio?: string | null;
  location?: string | null;
  website?: string | null;
}

/**
 * User List Response
 */
export interface UserListResponse {
  users: UserProfile[];
  continuationToken: string | null;
  hasMore: boolean;
}

/**
 * User Statistics
 */
export interface UserStats {
  total: number;
  active: number;
  blocked: number;
}

/**
 * User Status Update Request
 */
export interface UserStatusUpdate {
  status: UserStatus;
  reason?: string;
}
