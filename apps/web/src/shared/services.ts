// Service interfaces for dependency injection

import { Event, CreateEventDto, UpdateEventDto } from './types';

export interface IEventService {
    getEvents(): Promise<Event[]>;
    getEventById(id: string): Promise<Event | null>;
    createEvent(event: CreateEventDto): Promise<Event>;
    updateEvent(id: string, event: UpdateEventDto): Promise<Event>;
    deleteEvent(id: string): Promise<void>;
}

