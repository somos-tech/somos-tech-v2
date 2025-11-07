// API client with MSAL token authentication
import { Event, CreateEventDto, UpdateEventDto, ApiResponse } from '@shared/types';
import { IPublicClientApplication } from '@azure/msal-browser';
import { getAccessToken } from '@/utils/tokenUtils';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class ApiEventService {
    private baseUrl: string;
    private msalInstance: IPublicClientApplication | null = null;

    constructor() {
        this.baseUrl = `${API_BASE_URL}/api/events`;
    }

    // Set the MSAL instance (call this from your component)
    setMsalInstance(instance: IPublicClientApplication) {
        this.msalInstance = instance;
    }

    private async getAuthHeaders(): Promise<HeadersInit> {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        // Skip auth in dev mode without Azure AD configured
        if (import.meta.env.DEV && !import.meta.env.VITE_AZURE_CLIENT_ID) {
            return headers;
        }

        if (this.msalInstance) {
            const token = await getAccessToken(this.msalInstance);
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }

        return headers;
    }

    async getEvents(): Promise<Event[]> {
        const headers = await this.getAuthHeaders();
        const response = await fetch(this.baseUrl, { headers });
        const result: ApiResponse<Event[]> = await response.json();

        if (!result.success || !result.data) {
            throw new Error(result.error || 'Failed to fetch events');
        }

        return result.data;
    }

    async getEventById(id: string): Promise<Event | null> {
        const headers = await this.getAuthHeaders();
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
        const headers = await this.getAuthHeaders();
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
        const headers = await this.getAuthHeaders();
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
        const headers = await this.getAuthHeaders();
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
        const headers = await this.getAuthHeaders();
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
        const headers = await this.getAuthHeaders();
        const response = await fetch(`${this.baseUrl}/${id}/social-media-posts-status`, { headers });
        const result: ApiResponse<any> = await response.json();

        if (!result.success || !result.data) {
            throw new Error(result.error || 'Failed to check social media posts status');
        }

        return result.data;
    }

    async regenerateVenueRecommendations(id: string): Promise<void> {
        const headers = await this.getAuthHeaders();
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
        const headers = await this.getAuthHeaders();
        const response = await fetch(`${this.baseUrl}/${id}/venue-recommendations-status`, { headers });
        const result: ApiResponse<any> = await response.json();

        if (!result.success || !result.data) {
            throw new Error(result.error || 'Failed to check venue recommendations status');
        }

        return result.data;
    }
}

export default new ApiEventService();
