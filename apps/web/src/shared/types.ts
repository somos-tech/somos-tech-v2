// Common types shared between client and server

export interface SocialMediaPost {
    platform: 'x' | 'instagram' | 'linkedin';
    variant: 'A' | 'B';
    copy: string;
    text: string;
    altText: string;
    imageAltText: string;
    suggestedMedia: string[];
    suggestedHashtags: string[];
    suggestedMentions: string[];
    suggestedTime: string;
    utmLink: string;
    notes?: string;
}

export interface SocialMediaPosts {
    summary: string;
    recommendedWindow: string[];
    posts: SocialMediaPost[];
    complianceChecklist: {
        no_deceptive_claims: boolean;
        no_personal_data: boolean;
        alt_text_present: boolean;
        length_ok: boolean;
    };
}

export interface VenueContact {
    email?: string;
    phone?: string;
    website?: string;
}

export interface VenueRecommendation {
    name: string;
    address: string;
    capacity: number;
    amenities: string[];
    contact: VenueContact;
    notes?: string;
    emailTemplate?: string;
}

export interface VenueRecommendations {
    venues: VenueRecommendation[];
}

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
    organizerName?: string;
    organizationName?: string;
    socialMediaPosts?: SocialMediaPosts;
    socialMediaPostsStatus?: 'idle' | 'in-progress' | 'completed' | 'failed';
    socialMediaAgentThreadId?: string;
    socialMediaAgentRunId?: string;
    socialMediaAgentError?: string;
    venueRecommendations?: VenueRecommendations;
    venueAgentStatus?: 'idle' | 'in-progress' | 'completed' | 'failed';
    venueAgentThreadId?: string;
    venueAgentRunId?: string;
    venueAgentError?: string;
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
    organizerName?: string;
    organizationName?: string;
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
