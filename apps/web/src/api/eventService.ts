// Mock data service - replace with real DB implementation later

import type { Event, CreateEventDto, UpdateEventDto } from '@/shared/types';

class EventService {
    private events: Event[];

    constructor() {
        // In-memory store for now
        this.events = [
            {
                id: '1',
                name: 'Tech Conference 2024',
                date: '2024-06-15',
                location: 'San Francisco Convention Center',
                status: 'published',
                attendees: 500,
                capacity: 1000,
                description: 'Annual tech conference featuring industry leaders',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: '2',
                name: 'Music Festival',
                date: '2024-07-20',
                location: 'Central Park',
                status: 'published',
                attendees: 2000,
                capacity: 5000,
                description: 'Summer music festival with multiple stages',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ];
    }

    async getEvents(): Promise<Event[]> {
        return this.events;
    }

    async getEventById(id: string): Promise<Event | null> {
        const event = this.events.find(e => e.id === id);
        return event || null;
    }

    async createEvent(eventDto: CreateEventDto): Promise<Event> {
        const newEvent: Event = {
            id: String(Date.now()),
            ...eventDto,
            status: eventDto.status || 'draft',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        this.events.push(newEvent);
        return newEvent;
    }

    async updateEvent(id: string, eventDto: UpdateEventDto): Promise<Event> {
        const index = this.events.findIndex(e => e.id === id);
        if (index === -1) {
            throw new Error('Event not found');
        }

        const updatedEvent: Event = {
            ...this.events[index],
            ...eventDto,
            id,
            updatedAt: new Date().toISOString()
        };

        this.events[index] = updatedEvent;
        return updatedEvent;
    }

    async deleteEvent(id: string): Promise<void> {
        const index = this.events.findIndex(e => e.id === id);
        if (index === -1) {
            throw new Error('Event not found');
        }
        this.events.splice(index, 1);
    }
}

// Export singleton instance
export default new EventService();
