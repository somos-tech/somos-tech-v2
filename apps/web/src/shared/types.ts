// Common types shared between client and server

export interface Event {
    id: string;
    name: string;
    date: string;
    location: string;
    status: 'draft' | 'published' | 'cancelled' | 'completed';
    attendees?: number;
    capacity?: number;
    description?: string;
    venueId?: string;
    sponsorIds?: string[];
    createdAt: string;
    updatedAt: string;
}

export interface Venue {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    capacity: number;
    amenities?: string[];
    contactEmail?: string;
    contactPhone?: string;
    createdAt: string;
    updatedAt: string;
}

export interface Sponsor {
    id: string;
    name: string;
    tier: 'platinum' | 'gold' | 'silver' | 'bronze';
    logo?: string;
    website?: string;
    contactEmail: string;
    contactName: string;
    contributionAmount?: number;
    createdAt: string;
    updatedAt: string;
}

// DTOs for create/update operations
export interface CreateEventDto {
    name: string;
    date: string;
    location: string;
    status?: 'draft' | 'published' | 'cancelled' | 'completed';
    attendees?: number;
    capacity?: number;
    description?: string;
    venueId?: string;
    sponsorIds?: string[];
}

export interface UpdateEventDto extends Partial<CreateEventDto> {
    id: string;
}

export interface CreateVenueDto {
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    capacity: number;
    amenities?: string[];
    contactEmail?: string;
    contactPhone?: string;
}

export interface UpdateVenueDto extends Partial<CreateVenueDto> {
    id: string;
}

export interface CreateSponsorDto {
    name: string;
    tier: 'platinum' | 'gold' | 'silver' | 'bronze';
    logo?: string;
    website?: string;
    contactEmail: string;
    contactName: string;
    contributionAmount?: number;
}

export interface UpdateSponsorDto extends Partial<CreateSponsorDto> {
    id: string;
}

// API Response types
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}
