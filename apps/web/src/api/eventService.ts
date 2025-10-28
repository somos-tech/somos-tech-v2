// API client for making requests to the backend
import { Event, CreateEventDto, UpdateEventDto, ApiResponse } from '@shared/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class ApiEventService {
    private baseUrl: string;

    constructor() {
        this.baseUrl = `${API_BASE_URL}/api/events`;
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
}

export default new ApiEventService();
