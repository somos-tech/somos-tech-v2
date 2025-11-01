import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Users, Wifi, Phone, Globe, Calendar, RefreshCw, Building2, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import type { VenueRecommendations as VenueRecommendationsType } from "@shared/types";

interface VenueRecommendationsProps {
    eventId: string;
    eventDate: string;
    venueRecommendations?: VenueRecommendationsType;
    venueAgentStatus?: 'idle' | 'in-progress' | 'completed' | 'failed';
    venueAgentError?: string;
    onRegenerate: () => void;
    onStatusUpdate: (status: any) => void;
}

export default function VenueRecommendations({
    eventId,
    eventDate,
    venueRecommendations,
    venueAgentStatus,
    venueAgentError,
    onRegenerate,
    onStatusUpdate
}: VenueRecommendationsProps) {

    const getStatusIcon = () => {
        switch (venueAgentStatus) {
            case 'completed':
                return <CheckCircle2 className="h-4 w-4" style={{ color: '#00FF91' }} />;
            case 'in-progress':
                return <Loader2 className="h-4 w-4 animate-spin" style={{ color: '#FBB924' }} />;
            case 'failed':
                return <AlertCircle className="h-4 w-4" style={{ color: '#ef4444' }} />;
            default:
                return <Clock className="h-4 w-4" style={{ color: '#8394A7' }} />;
        }
    };

    const getStatusBadge = () => {
        switch (venueAgentStatus) {
            case 'completed':
                return (
                    <Badge className="rounded-lg" style={{ backgroundColor: 'rgba(0, 255, 145, 0.1)', color: '#00FF91' }}>
                        Completed
                    </Badge>
                );
            case 'in-progress':
                return (
                    <Badge className="rounded-lg" style={{ backgroundColor: 'rgba(251, 191, 36, 0.1)', color: '#FBB924' }}>
                        Searching...
                    </Badge>
                );
            case 'failed':
                return (
                    <Badge className="rounded-lg" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                        Failed
                    </Badge>
                );
            default:
                return (
                    <Badge className="rounded-lg" style={{ backgroundColor: 'rgba(148, 163, 184, 0.1)', color: '#8394A7' }}>
                        Pending
                    </Badge>
                );
        }
    };

    const getVenueTypeIcon = () => {
        return <Building2 className="h-4 w-4" style={{ color: '#00FF91' }} />;
    };

    return (
        <div className="space-y-4">
            {/* Status Header */}
            <Card className="rounded-2xl" style={{ borderColor: 'rgba(0, 255, 145, 0.2)' }}>
                <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            {getStatusIcon()}
                            <span className="font-medium" style={{ color: '#FFFFFF' }}>Venue Search Status</span>
                        </div>
                        {getStatusBadge()}
                    </div>

                    {venueAgentStatus === 'in-progress' && (
                        <div className="text-sm" style={{ color: '#8394A7' }}>
                            The venue agent is searching for suitable venues based on your event requirements...
                        </div>
                    )}

                    {venueAgentStatus === 'completed' && venueRecommendations && (
                        <div className="text-sm" style={{ color: '#8394A7' }}>
                            Found {venueRecommendations.venues.length} venue{venueRecommendations.venues.length !== 1 ? 's' : ''} for your event.
                        </div>
                    )}

                    {venueAgentStatus === 'failed' && (
                        <div className="rounded-xl p-3 text-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5' }}>
                            {venueAgentError || 'Failed to generate venue recommendations'}
                        </div>
                    )}

                    {venueAgentStatus === 'idle' && (
                        <div className="text-sm" style={{ color: '#8394A7' }}>
                            Venue search has not started yet.
                        </div>
                    )}

                    <div className="mt-3 flex gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl"
                            style={{ borderColor: '#00FF91', color: '#00FF91' }}
                            onClick={onRegenerate}
                            disabled={venueAgentStatus === 'in-progress'}
                        >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            {venueAgentStatus === 'completed' ? 'Regenerate' : 'Start Search'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Venue Recommendations */}
            {venueAgentStatus === 'completed' && venueRecommendations && venueRecommendations.venues.length > 0 && (
                <div className="space-y-4">
                    {venueRecommendations.venues.map((venue, index) => {
                        return (
                            <Card key={index} className="rounded-2xl" style={{ borderColor: 'rgba(0, 255, 145, 0.2)' }}>
                                <CardContent className="p-4">
                                    {/* Venue Header */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                {getVenueTypeIcon()}
                                                <h3 className="font-semibold text-lg" style={{ color: '#FFFFFF' }}>{venue.name}</h3>
                                            </div>
                                            <div className="flex items-center gap-1 text-sm" style={{ color: '#8394A7' }}>
                                                <MapPin className="h-3 w-3" />
                                                {venue.address}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Venue Details Grid */}
                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <div className="flex items-center gap-2">
                                            <Users className="h-4 w-4" style={{ color: '#00FF91' }} />
                                            <div>
                                                <div className="text-xs" style={{ color: '#8394A7' }}>Capacity</div>
                                                <div className="text-sm font-medium" style={{ color: '#FFFFFF' }}>{venue.capacity} people</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Notes */}
                                    {venue.notes && (
                                        <div className="mb-3 p-3 rounded-xl" style={{ backgroundColor: '#0a1f35', border: '1px solid rgba(0, 255, 145, 0.1)' }}>
                                            <div className="text-xs font-medium mb-1" style={{ color: '#00FF91' }}>Notes</div>
                                            <div className="text-sm" style={{ color: '#FFFFFF' }}>{venue.notes}</div>
                                        </div>
                                    )}

                                    {/* Amenities */}
                                    {venue.amenities.length > 0 && (
                                        <div className="mb-3">
                                            <div className="text-xs font-medium mb-2" style={{ color: '#8394A7' }}>Amenities</div>
                                            <div className="flex flex-wrap gap-2">
                                                {venue.amenities.map((amenity, i) => (
                                                    <Badge key={i} variant="outline" className="rounded-lg text-xs" style={{ borderColor: 'rgba(0, 255, 145, 0.3)', color: '#FFFFFF' }}>
                                                        <Wifi className="h-3 w-3 mr-1" />
                                                        {amenity}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Contact Info */}
                                    <div className="mb-3 p-3 rounded-xl" style={{ backgroundColor: '#051323', border: '1px solid rgba(0, 255, 145, 0.1)' }}>
                                        <div className="text-xs font-medium mb-2" style={{ color: '#8394A7' }}>Contact Information</div>
                                        <div className="space-y-1 text-sm">
                                            {venue.contact.phone && (
                                                <div className="flex items-center gap-2" style={{ color: '#8394A7' }}>
                                                    <Phone className="h-3 w-3" />
                                                    {venue.contact.phone}
                                                </div>
                                            )}
                                            {venue.contact.website && (
                                                <div className="flex items-center gap-2" style={{ color: '#8394A7' }}>
                                                    <Globe className="h-3 w-3" />
                                                    <a href={venue.contact.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                                        {venue.contact.website}
                                                    </a>
                                                </div>
                                            )}
                                            {venue.contact.booking && (
                                                <div className="flex items-center gap-2" style={{ color: '#8394A7' }}>
                                                    <Calendar className="h-3 w-3" />
                                                    <a href={venue.contact.booking} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                                        Book Online
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-wrap gap-2">
                                        {venue.contact.website && (
                                            <Button
                                                size="sm"
                                                className="rounded-xl"
                                                style={{ backgroundColor: '#00FF91', color: '#051323' }}
                                                onClick={() => window.open(venue.contact.website, '_blank')}
                                            >
                                                <Globe className="h-3 w-3 mr-1" />
                                                Visit Website
                                            </Button>
                                        )}
                                        {venue.contact.booking && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="rounded-xl"
                                                style={{ borderColor: '#00FF91', color: '#00FF91' }}
                                                onClick={() => window.open(venue.contact.booking, '_blank')}
                                            >
                                                <Calendar className="h-3 w-3 mr-1" />
                                                Book Now
                                            </Button>
                                        )}
                                        {venue.contact.phone && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="rounded-xl"
                                                style={{ borderColor: '#8394A7', color: '#8394A7' }}
                                                onClick={() => window.open(`tel:${venue.contact.phone}`, '_blank')}
                                            >
                                                <Phone className="h-3 w-3 mr-1" />
                                                Call
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Empty State */}
            {venueAgentStatus === 'completed' && (!venueRecommendations || venueRecommendations.venues.length === 0) && (
                <Card className="rounded-2xl" style={{ borderColor: 'rgba(0, 255, 145, 0.2)' }}>
                    <CardContent className="p-8 text-center">
                        <Building2 className="h-12 w-12 mx-auto mb-3" style={{ color: '#8394A7' }} />
                        <div className="text-lg font-medium mb-2" style={{ color: '#FFFFFF' }}>No Venues Found</div>
                        <div className="text-sm mb-4" style={{ color: '#8394A7' }}>
                            The venue agent couldn't find suitable venues for your event. Try adjusting your requirements or search again.
                        </div>
                        <Button
                            className="rounded-xl"
                            style={{ backgroundColor: '#00FF91', color: '#051323' }}
                            onClick={onRegenerate}
                        >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Search Again
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
