// API client for making requests to the backend
import { Event, CreateEventDto, UpdateEventDto, ApiResponse } from '@shared/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class ApiEventService {
    private baseUrl: string;

    constructor() {
        this.baseUrl = `${API_BASE_URL}/api/events`;
    }

    /**
     * Get the user's access token from Azure Static Web Apps
     * This token will be used for On-Behalf-Of authentication
     */
    private async getAccessToken(): Promise<string | null> {
        try {
            // In production with Azure SWA, get the access token
            if (!import.meta.env.DEV) {
                const response = await fetch('/.auth/me');
                const data = await response.json();

                if (data.clientPrincipal && data.clientPrincipal.accessToken) {
                    return data.clientPrincipal.accessToken;
                }
            }
            return null;
        } catch (error) {
            console.warn('Failed to get access token:', error);
            return null;
        }
    }

    /**
     * Build headers with authentication token if available
     */
    private async buildHeaders(additionalHeaders: Record<string, string> = {}): Promise<HeadersInit> {
        const headers: Record<string, string> = {
            ...additionalHeaders
        };

        const accessToken = await this.getAccessToken();
        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        }

        return headers;
    }

    async getEvents(): Promise<Event[]> {
        const headers = await this.buildHeaders();
        const response = await fetch(this.baseUrl, { headers });
        const result: ApiResponse<Event[]> = await response.json();

        if (!result.success || !result.data) {
            throw new Error(result.error || 'Failed to fetch events');
        }

        return result.data;
    }

    async getEventById(id: string): Promise<Event | null> {
        const headers = await this.buildHeaders();
        const response = await fetch(`${this.baseUrl}/${id}`, { headers });

        if (response.status === 404) {
            return null;
        }

        const result: ApiResponse<Event> = await response.json();

        if (!result.success || !result.data) {
            throw new Error(result.error || 'Failed to fetch event');
        }

        return result.data;
    }

    async createEvent(event: CreateEventDto): Promise<Event> {
        console.log('sending event to API:', event);
        const headers = await this.buildHeaders({
            'Content-Type': 'application/json',
        });

        const response = await fetch(this.baseUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(event),
        });

        const result: ApiResponse<Event> = await response.json();

        if (!result.success || !result.data) {
            throw new Error(result.error || 'Failed to create event');
        }

        return result.data;
    }

    async updateEvent(id: string, event: UpdateEventDto): Promise<Event> {
        const headers = await this.buildHeaders({
            'Content-Type': 'application/json',
        });

        const response = await fetch(`${this.baseUrl}/${id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(event),
        });

        const result: ApiResponse<Event> = await response.json();

        if (!result.success || !result.data) {
            throw new Error(result.error || 'Failed to update event');
        }

        return result.data;
    }

    async deleteEvent(id: string): Promise<void> {
        const headers = await this.buildHeaders();
        const response = await fetch(`${this.baseUrl}/${id}`, {
            method: 'DELETE',
            headers,
        });

        const result: ApiResponse<null> = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Failed to delete event');
        }
    }

    async regenerateSocialMediaPosts(id: string): Promise<void> {
        const headers = await this.buildHeaders({
            'Content-Type': 'application/json',
        });

        const response = await fetch(`${this.baseUrl}/${id}/regenerate-social-media-posts`, {
            method: 'POST',
            headers,
        });

        const result: ApiResponse<null> = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Failed to regenerate social media posts');
        }
    }

    async checkSocialMediaPostsStatus(id: string): Promise<{
        status: 'idle' | 'in-progress' | 'completed' | 'failed';
        posts?: any;
        error?: string;
        agentRunStatus?: string;
    }> {
        const headers = await this.buildHeaders();
        const response = await fetch(`${this.baseUrl}/${id}/social-media-posts-status`, { headers });
        const result: ApiResponse<any> = await response.json();

        if (!result.success || !result.data) {
            throw new Error(result.error || 'Failed to check social media posts status');
        }

        return result.data;
    }

    async regenerateVenueRecommendations(id: string): Promise<void> {
        const headers = await this.buildHeaders({
            'Content-Type': 'application/json',
        });

        const response = await fetch(`${this.baseUrl}/${id}/regenerate-venue-recommendations`, {
            method: 'POST',
            headers,
        });

        const result: ApiResponse<null> = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Failed to regenerate venue recommendations');
        }
    }

    async checkVenueRecommendationsStatus(id: string): Promise<{
        status: 'idle' | 'in-progress' | 'completed' | 'failed';
        venues?: any;
        error?: string;
        agentRunStatus?: string;
    }> {
        const headers = await this.buildHeaders();
        const response = await fetch(`${this.baseUrl}/${id}/venue-recommendations-status`, { headers });
        const result: ApiResponse<any> = await response.json();

        if (!result.success || !result.data) {
            throw new Error(result.error || 'Failed to check venue recommendations status');
        }

        return result.data;
    }
}

export default new ApiEventService();
