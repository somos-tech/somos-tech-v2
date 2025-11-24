// API client for making requests to the backend
import { Event, CreateEventDto, UpdateEventDto, ApiResponse } from '@shared/types';
import { apiUrl } from './httpClient';

const eventsBase = apiUrl('/events');

class ApiEventService {
    private baseUrl: string;

    constructor() {
        // Always honor the SWA reverse proxy so auth headers/cookies flow automatically
        this.baseUrl = eventsBase;
    }

    async getEvents(): Promise<Event[]> {
        const response = await fetch(this.baseUrl);
        const result: ApiResponse<Event[]> = await response.json();

        if (!result.success || !result.data) {
            throw new Error(result.error || 'Failed to fetch events');
        }

        return result.data;
    }

    async getEventById(id: string): Promise<Event | null> {
        const response = await fetch(`${this.baseUrl}/${id}`);

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
        const response = await fetch(this.baseUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(event),
        });

        const result: ApiResponse<Event> = await response.json();

        if (!result.success || !result.data) {
            throw new Error(result.error || 'Failed to create event');
        }

        return result.data;
    }

    async updateEvent(id: string, event: UpdateEventDto): Promise<Event> {
        const response = await fetch(`${this.baseUrl}/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(event),
        });

        const result: ApiResponse<Event> = await response.json();

        if (!result.success || !result.data) {
            throw new Error(result.error || 'Failed to update event');
        }

        return result.data;
    }

    async deleteEvent(id: string): Promise<void> {
        const response = await fetch(`${this.baseUrl}/${id}`, {
            method: 'DELETE',
        });

        const result: ApiResponse<null> = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Failed to delete event');
        }
    }

    async regenerateSocialMediaPosts(id: string): Promise<void> {
        const response = await fetch(`${this.baseUrl}/${id}/regenerate-social-media-posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
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
        const response = await fetch(`${this.baseUrl}/${id}/social-media-posts-status`);
        const result: ApiResponse<any> = await response.json();

        if (!result.success || !result.data) {
            throw new Error(result.error || 'Failed to check social media posts status');
        }

        return result.data;
    }

    async regenerateVenueRecommendations(id: string): Promise<void> {
        const response = await fetch(`${this.baseUrl}/${id}/regenerate-venue-recommendations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
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
        const response = await fetch(`${this.baseUrl}/${id}/venue-recommendations-status`);
        const result: ApiResponse<any> = await response.json();

        if (!result.success || !result.data) {
            throw new Error(result.error || 'Failed to check venue recommendations status');
        }

        return result.data;
    }
}

export default new ApiEventService();
