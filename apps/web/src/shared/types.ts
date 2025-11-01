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

export interface VenueContactInfo {
    email?: string;
    phone?: string;
    website?: string;
    bookingUrl?: string;
    contactName?: string;
}

export interface VenueAvailability {
    status: 'confirmed' | 'likely' | 'unknown';
    notes?: string;
}

export interface VenueEstimatedCost {
    amount: number;
    currency: string;
    notes?: string;
}

export interface VenueRecommendation {
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    capacity: number;
    estimatedCost: VenueEstimatedCost;
    amenities: string[];
    contactInfo: VenueContactInfo;
    availability: VenueAvailability;
    whyRecommended: string;
    outreachPriority: 'high' | 'medium' | 'low';
    venueType: 'library' | 'coworking_space' | 'tech_company' | 'community_center' | 'university' | 'other';
}

export interface VenueOutreachTemplate {
    venueId: number;
    subject: string;
    body: string;
    followUpDays: number;
}

export interface VenueRecommendations {
    searchSummary: string;
    recommendedVenues: VenueRecommendation[];
    outreachTemplates: VenueOutreachTemplate[];
    searchMetadata: {
        searchDate: string;
        totalVenuesFound: number;
        totalRecommended: number;
        citiesSearched: string[];
    };
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
