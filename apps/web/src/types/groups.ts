/**
 * Community Groups Types
 * 
 * Data models for community groups with Discord-like chat functionality,
 * events calendar, and member management.
 * 
 * @module types/groups
 * @author SOMOS.tech
 */

/**
 * Group visibility options
 */
export type GroupVisibility = 'Public' | 'Private' | 'Hidden';

/**
 * Member role within a group
 */
export type GroupMemberRole = 'owner' | 'admin' | 'moderator' | 'member';

/**
 * Community Group Interface
 */
export interface CommunityGroup {
    id: string;
    name: string;
    city: string;
    state: string;
    slug: string; // URL-friendly identifier
    visibility: GroupVisibility;
    imageUrl: string; // Cover image
    thumbnailUrl?: string; // Thumbnail for cards
    description: string;
    memberCount: number;
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    // Additional metadata
    timezone?: string;
    discordUrl?: string;
    instagramUrl?: string;
    linkedinUrl?: string;
}

/**
 * Group Membership
 */
export interface GroupMembership {
    id: string;
    groupId: string;
    userId: string;
    userEmail: string;
    userName: string;
    userPhoto?: string;
    role: GroupMemberRole;
    joinedAt: string;
    lastActiveAt: string;
    notificationsEnabled: boolean;
}

/**
 * Chat Message in a group
 */
export interface GroupMessage {
    id: string;
    groupId: string;
    userId: string;
    userName: string;
    userPhoto?: string;
    content: string;
    type: 'text' | 'image' | 'system';
    imageUrl?: string;
    replyToId?: string; // For threaded replies
    replyToContent?: string; // Preview of replied message
    likes: string[]; // Array of user IDs who liked
    likeCount: number;
    createdAt: string;
    updatedAt?: string;
    isEdited: boolean;
    isDeleted: boolean;
}

/**
 * Group Event
 */
export interface GroupEvent {
    id: string;
    groupId: string;
    title: string;
    description: string;
    imageUrl?: string;
    startDate: string;
    endDate?: string;
    location: string;
    isVirtual: boolean;
    virtualLink?: string;
    maxAttendees?: number;
    attendeeCount: number;
    createdAt: string;
    createdBy: string;
}

/**
 * Event RSVP
 */
export interface EventRsvp {
    id: string;
    eventId: string;
    groupId: string;
    userId: string;
    userName: string;
    userPhoto?: string;
    status: 'going' | 'maybe' | 'not-going';
    createdAt: string;
}

// DTO Types for API requests

export interface CreateGroupDto {
    name?: string;
    city: string;
    state: string;
    visibility?: GroupVisibility;
    imageUrl: string;
    description?: string;
    timezone?: string;
}

export interface UpdateGroupDto {
    name?: string;
    city?: string;
    state?: string;
    visibility?: GroupVisibility;
    imageUrl?: string;
    thumbnailUrl?: string;
    description?: string;
    discordUrl?: string;
    instagramUrl?: string;
    linkedinUrl?: string;
}

export interface SendMessageDto {
    content: string;
    type?: 'text' | 'image';
    imageUrl?: string;
    replyToId?: string;
}

export interface CreateGroupEventDto {
    title: string;
    description: string;
    imageUrl?: string;
    startDate: string;
    endDate?: string;
    location: string;
    isVirtual?: boolean;
    virtualLink?: string;
    maxAttendees?: number;
}

// API Response types

export interface GroupListResponse {
    groups: CommunityGroup[];
    total: number;
}

export interface GroupMessagesResponse {
    messages: GroupMessage[];
    hasMore: boolean;
    continuationToken?: string;
}

export interface GroupMembersResponse {
    members: GroupMembership[];
    total: number;
    hasMore: boolean;
}
