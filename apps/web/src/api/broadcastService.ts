/**
 * Broadcast Notification Service
 * API client for sending notifications to groups or all members
 */

const API_BASE = '/api';

interface BroadcastTarget {
    id: string;
    name: string;
    description: string;
    memberCount: number | null;
}

interface BroadcastResult {
    email: { sent: number; failed: number };
    push: { sent: number; failed: number };
}

interface BroadcastRecord {
    id: string;
    targetType: 'all' | 'group';
    targetGroupId: string | null;
    targetName: string;
    subject: string;
    message: string;
    channels: ('email' | 'push')[];
    recipientCount: number;
    results: BroadcastResult;
    sentBy: string;
    sentAt: string;
}

export interface SendBroadcastDto {
    targetType: 'all' | 'group';
    targetGroupId?: string;
    subject: string;
    message: string;
    channels: ('email' | 'push')[];
}

/**
 * Get available broadcast targets (groups + all members option)
 */
export async function getBroadcastTargets(): Promise<{ targets: BroadcastTarget[] }> {
    const response = await fetch(`${API_BASE}/broadcast/groups`, {
        credentials: 'include'
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to get broadcast targets' }));
        throw new Error(error.message || 'Failed to get broadcast targets');
    }

    const data = await response.json();
    return data.data;
}

/**
 * Send a broadcast notification
 */
export async function sendBroadcast(data: SendBroadcastDto): Promise<{
    message: string;
    recipientCount: number;
    results: BroadcastResult;
}> {
    const response = await fetch(`${API_BASE}/broadcast/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to send broadcast' }));
        throw new Error(error.message || 'Failed to send broadcast');
    }

    const result = await response.json();
    return result.data;
}

/**
 * Get broadcast history
 */
export async function getBroadcastHistory(): Promise<{ broadcasts: BroadcastRecord[] }> {
    const response = await fetch(`${API_BASE}/broadcast/history`, {
        credentials: 'include'
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to get broadcast history' }));
        throw new Error(error.message || 'Failed to get broadcast history');
    }

    const data = await response.json();
    return data.data;
}

export type { BroadcastTarget, BroadcastResult, BroadcastRecord };
