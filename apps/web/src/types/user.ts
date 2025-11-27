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
 * Login Location Info
 */
export interface LoginLocation {
  city?: string | null;
  region?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

/**
 * Login History Entry
 */
export interface LoginHistoryEntry {
  timestamp: string;
  ip?: string | null;
  location?: LoginLocation | null;
  locationSource?: 'entra' | 'ip-api' | null;
  userAgent?: string | null;
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
  lastLoginLocation?: LoginLocation | null;
  lastLoginLocationSource?: 'entra' | 'ip-api' | null;
  lastLoginUserAgent?: string | null;
  loginHistory?: LoginHistoryEntry[];
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
