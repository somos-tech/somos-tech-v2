/**
 * Community Groups API Service
 * 
 * Frontend API client for community groups, messages, and events.
 * 
 * @module api/groupsService
 * @author SOMOS.tech
 */

import type {
    CommunityGroup,
    GroupMembership,
    GroupMessage,
    GroupEvent,
    CreateGroupDto,
    SendMessageDto,
    CreateGroupEventDto,
    GroupListResponse,
    GroupMessagesResponse,
    GroupMembersResponse
} from '@/types/groups';

const API_BASE = '/api';

/**
 * Generic API response handler
 */
async function handleResponse<T>(response: Response): Promise<T> {
    const data = await response.json();
    
    if (!response.ok) {
        // Create error with moderation details if present
        const error = new Error(data.error?.message || data.error || data.message || `Request failed with status ${response.status}`);
        // Attach reason for moderation errors
        (error as any).reason = data.error?.reason || data.reason;
        throw error;
    }
    
    return data.data || data;
}

// ============================================================================
// GROUPS API
// ============================================================================

/**
 * List all community groups
 */
export async function listGroups(): Promise<{
    groups: CommunityGroup[];
    total: number;
    userMemberships: string[];
}> {
    const response = await fetch(`${API_BASE}/community-groups`, {
        credentials: 'include'
    });
    return handleResponse(response);
}

/**
 * Get a single group by ID
 */
export async function getGroup(groupId: string): Promise<CommunityGroup & { isMember: boolean }> {
    const response = await fetch(`${API_BASE}/community-groups/${groupId}`, {
        credentials: 'include'
    });
    return handleResponse(response);
}

/**
 * Create a new group (admin only)
 */
export async function createGroup(data: CreateGroupDto): Promise<CommunityGroup> {
    const response = await fetch(`${API_BASE}/community-groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
    });
    return handleResponse(response);
}

/**
 * Join a group
 */
export async function joinGroup(groupId: string): Promise<{ message: string; membership: GroupMembership }> {
    const response = await fetch(`${API_BASE}/community-groups/${groupId}/join`, {
        method: 'POST',
        credentials: 'include'
    });
    return handleResponse(response);
}

/**
 * Leave a group
 */
export async function leaveGroup(groupId: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE}/community-groups/${groupId}/leave`, {
        method: 'POST',
        credentials: 'include'
    });
    return handleResponse(response);
}

/**
 * Get group members
 */
export async function getGroupMembers(groupId: string): Promise<GroupMembersResponse> {
    const response = await fetch(`${API_BASE}/community-groups/${groupId}/members`, {
        credentials: 'include'
    });
    return handleResponse(response);
}

// ============================================================================
// MESSAGES API
// ============================================================================

/**
 * Get messages for a group
 */
export async function getGroupMessages(
    groupId: string,
    options?: { limit?: number; before?: string }
): Promise<GroupMessagesResponse> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', options.limit.toString());
    if (options?.before) params.set('before', options.before);
    
    const url = `${API_BASE}/group-messages/${groupId}${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url, {
        credentials: 'include'
    });
    return handleResponse(response);
}

/**
 * Send a message to a group
 */
export async function sendMessage(groupId: string, data: SendMessageDto): Promise<GroupMessage> {
    const response = await fetch(`${API_BASE}/group-messages/${groupId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
    });
    return handleResponse(response);
}

/**
 * Edit a message
 */
export async function editMessage(
    groupId: string,
    messageId: string,
    content: string
): Promise<GroupMessage> {
    const response = await fetch(`${API_BASE}/group-messages/${groupId}/${messageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content })
    });
    return handleResponse(response);
}

/**
 * Delete a message
 */
export async function deleteMessage(groupId: string, messageId: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE}/group-messages/${groupId}/${messageId}`, {
        method: 'DELETE',
        credentials: 'include'
    });
    return handleResponse(response);
}

/**
 * Like/unlike a message
 */
export async function toggleLike(
    groupId: string,
    messageId: string
): Promise<{ liked: boolean; likeCount: number }> {
    const response = await fetch(`${API_BASE}/group-messages/${groupId}/${messageId}/like`, {
        method: 'POST',
        credentials: 'include'
    });
    return handleResponse(response);
}

// ============================================================================
// EVENTS API
// ============================================================================

/**
 * Get events for a group
 */
export async function getGroupEvents(
    groupId: string,
    options?: { upcoming?: boolean; past?: boolean }
): Promise<{ events: GroupEvent[]; total: number }> {
    const params = new URLSearchParams();
    if (options?.upcoming) params.set('upcoming', 'true');
    if (options?.past) params.set('past', 'true');
    
    const url = `${API_BASE}/group-events/${groupId}${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url, {
        credentials: 'include'
    });
    return handleResponse(response);
}

/**
 * Create a group event
 */
export async function createGroupEvent(
    groupId: string,
    data: CreateGroupEventDto
): Promise<GroupEvent> {
    const response = await fetch(`${API_BASE}/group-events/${groupId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
    });
    return handleResponse(response);
}

/**
 * RSVP to an event
 */
export async function rsvpToEvent(
    groupId: string,
    eventId: string,
    status: 'going' | 'maybe' | 'not-going'
): Promise<{ rsvp: any; attendeeCount: number }> {
    const response = await fetch(`${API_BASE}/group-events/${groupId}/${eventId}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status })
    });
    return handleResponse(response);
}

/**
 * Delete an event
 */
export async function deleteGroupEvent(groupId: string, eventId: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE}/group-events/${groupId}/${eventId}`, {
        method: 'DELETE',
        credentials: 'include'
    });
    return handleResponse(response);
}
