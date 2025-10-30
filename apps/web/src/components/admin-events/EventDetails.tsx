import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Link, Loader2, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import AgentInbox from "./AgentInbox";
import RecentActivity from "./RecentActivity";
import SocialMediaPosts from "./SocialMediaPosts";
import eventService from "@/api/eventService";
import type { Event } from "@shared/types";

const STATUS_COLOR: Record<string, string> = {
    "draft": "text-amber-400",
    "published": "text-emerald-400",
    "cancelled": "text-rose-400",
    "completed": "text-slate-400"
};

const STATUS_BG: Record<string, string> = {
    "draft": "rgba(251, 191, 36, 0.1)",
    "published": "rgba(52, 211, 153, 0.1)",
    "cancelled": "rgba(251, 113, 133, 0.1)",
    "completed": "rgba(148, 163, 184, 0.1)"
};

export default function EventDetails({ eventId, onClose }: { eventId: string; onClose: () => void }) {
    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [workflowExpanded, setWorkflowExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState("overview");

    useEffect(() => {
        loadEvent();
    }, [eventId]);

    const loadEvent = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await eventService.getEventById(eventId);
            setEvent(data);
        } catch (err) {
            console.error('Failed to load event:', err);
            setError('Failed to load event details');
        } finally {
            setLoading(false);
        }
    };

    const handleRegenerateSocialMedia = async () => {
        try {
            await eventService.regenerateSocialMediaPosts(eventId);
            // Reload the event to get the updated status
            await loadEvent();
        } catch (err) {
            console.error('Failed to regenerate social media posts:', err);
            alert('Failed to regenerate social media posts');
        }
    };

    const handleSocialMediaStatusUpdate = async () => {
        // Reload the event when the social media status changes
        await loadEvent();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#00FF91' }} />
            </div>
        );
    }

    if (error || !event) {
        return (
            <div className="flex flex-col items-center justify-center p-12 space-y-3">
                <AlertCircle className="h-8 w-8" style={{ color: '#00FF91' }} />
                <div className="text-sm" style={{ color: '#8394A7' }}>{error || 'Event not found'}</div>
                <Button onClick={onClose} variant="outline" className="rounded-xl" style={{ borderColor: '#00FF91', color: '#00FF91' }}>
                    Close
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-3 md:space-y-4">
            {/* Event Header - Compact */}
            <div>
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="text-lg md:text-xl font-semibold tracking-tight" style={{ color: '#FFFFFF' }}>{event.name}</div>
                    <Badge className={`rounded-lg ${STATUS_COLOR[event.status] || 'text-slate-400'}`} style={{ backgroundColor: STATUS_BG[event.status] || 'rgba(148, 163, 184, 0.1)' }}>
                        {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                    </Badge>
                </div>
                <div className="text-xs md:text-sm mt-1" style={{ color: '#8394A7' }}>
                    {format(new Date(event.date), "EEE, MMM d • h:mma")} · {event.location}
                </div>
                {(event.capacity || event.attendees) && (
                    <div className="text-xs md:text-sm" style={{ color: '#8394A7' }}>
                        {event.capacity && `Capacity: ${event.capacity}`}
                        {event.attendees && ` · ${event.attendees} attendees`}
                    </div>
                )}
                {event.description && (
                    <div className="text-xs md:text-sm mt-2 line-clamp-2" style={{ color: '#8394A7' }}>{event.description}</div>
                )}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="rounded-2xl w-full overflow-x-auto flex-nowrap justify-start" style={{ backgroundColor: '#051323', border: '1px solid rgba(0, 255, 145, 0.2)' }}>
                    <TabsTrigger value="overview" className="text-xs md:text-sm" style={{ color: '#FFFFFF' }}>Overview</TabsTrigger>
                    <TabsTrigger value="social" className="text-xs md:text-sm" style={{ color: '#FFFFFF' }}>Social</TabsTrigger>
                    <TabsTrigger value="venues" className="text-xs md:text-sm" style={{ color: '#FFFFFF' }}>Venues</TabsTrigger>
                    <TabsTrigger value="sponsors" className="text-xs md:text-sm" style={{ color: '#FFFFFF' }}>Sponsors</TabsTrigger>
                    <TabsTrigger value="activity" className="text-xs md:text-sm" style={{ color: '#FFFFFF' }}>Activity</TabsTrigger>
                    <TabsTrigger value="assets" className="text-xs md:text-sm" style={{ color: '#FFFFFF' }}>Assets</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-3 md:mt-4 space-y-3 md:space-y-4">
                    {/* Agent Workflow Status Dashboard */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Card className="rounded-xl md:rounded-2xl" style={{ borderColor: 'rgba(0, 255, 145, 0.2)' }}>
                            <CardContent className="p-3 md:p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="text-xs font-medium" style={{ color: '#8394A7' }}>Social Media</div>
                                    <Badge
                                        className="rounded-lg text-xs"
                                        style={{
                                            backgroundColor: event.socialMediaPostsStatus === 'completed'
                                                ? 'rgba(0, 255, 145, 0.1)'
                                                : event.socialMediaPostsStatus === 'in-progress'
                                                    ? 'rgba(251, 191, 36, 0.1)'
                                                    : event.socialMediaPostsStatus === 'failed'
                                                        ? 'rgba(239, 68, 68, 0.1)'
                                                        : 'rgba(148, 163, 184, 0.1)',
                                            color: event.socialMediaPostsStatus === 'completed'
                                                ? '#00FF91'
                                                : event.socialMediaPostsStatus === 'in-progress'
                                                    ? '#FBB924'
                                                    : event.socialMediaPostsStatus === 'failed'
                                                        ? '#ef4444'
                                                        : '#8394A7'
                                        }}
                                    >
                                        {event.socialMediaPostsStatus === 'completed'
                                            ? 'Ready'
                                            : event.socialMediaPostsStatus === 'in-progress'
                                                ? 'Generating'
                                                : event.socialMediaPostsStatus === 'failed'
                                                    ? 'Failed'
                                                    : 'Pending'}
                                    </Badge>
                                </div>
                                <div className="text-xl md:text-2xl font-semibold mb-1" style={{ color: '#FFFFFF' }}>
                                    {event.socialMediaPosts?.posts?.length || 0} Posts
                                </div>
                                <div className="text-xs" style={{ color: '#8394A7' }}>
                                    {event.socialMediaPostsStatus === 'completed'
                                        ? 'Initial templates'
                                        : event.socialMediaPostsStatus === 'in-progress'
                                            ? 'Generating posts...'
                                            : event.socialMediaPostsStatus === 'failed'
                                                ? 'Generation failed'
                                                : 'Not started'}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="rounded-xl md:rounded-2xl" style={{ borderColor: 'rgba(0, 255, 145, 0.2)' }}>
                            <CardContent className="p-3 md:p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="text-xs font-medium" style={{ color: '#8394A7' }}>Venue Outreach</div>
                                    <Badge className="rounded-lg text-xs" style={{ backgroundColor: event.venueId ? 'rgba(0, 255, 145, 0.1)' : 'rgba(148, 163, 184, 0.1)', color: event.venueId ? '#00FF91' : '#8394A7' }}>
                                        {event.venueId ? 'Confirmed' : 'Pending'}
                                    </Badge>
                                </div>
                                <div className="text-xl md:text-2xl font-semibold mb-1" style={{ color: '#FFFFFF' }}>
                                    {event.venueId ? '1 Venue' : '0 / 3'}
                                </div>
                                <div className="text-xs" style={{ color: '#8394A7' }}>
                                    {event.venueId ? 'Confirmed' : 'Reaching out'}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="rounded-xl md:rounded-2xl" style={{ borderColor: 'rgba(0, 255, 145, 0.2)' }}>
                            <CardContent className="p-3 md:p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="text-xs font-medium" style={{ color: '#8394A7' }}>Sponsor Outreach</div>
                                    <Badge className="rounded-lg text-xs" style={{ backgroundColor: event.sponsorIds?.length ? 'rgba(0, 255, 145, 0.1)' : 'rgba(148, 163, 184, 0.1)', color: event.sponsorIds?.length ? '#00FF91' : '#8394A7' }}>
                                        {event.sponsorIds?.length ? 'Active' : 'Pending'}
                                    </Badge>
                                </div>
                                <div className="text-xl md:text-2xl font-semibold mb-1" style={{ color: '#FFFFFF' }}>
                                    {event.sponsorIds?.length || 0} / 5
                                </div>
                                <div className="text-xs" style={{ color: '#8394A7' }}>
                                    {event.sponsorIds?.length ? `${event.sponsorIds.length} confirmed` : 'Reaching out'}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Workflow Timeline - Collapsible */}
                    <Card className="rounded-xl md:rounded-2xl" style={{ borderColor: 'rgba(0, 255, 145, 0.2)' }}>
                        <CardContent className="p-3 md:p-4">
                            <button
                                onClick={() => setWorkflowExpanded(!workflowExpanded)}
                                className="w-full flex items-center justify-between text-sm font-medium mb-3"
                                style={{ color: '#FFFFFF' }}
                            >
                                <span>Agent Workflow Status</span>
                                {workflowExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>

                            {workflowExpanded && (
                                <div className="space-y-3">
                                    <div className="flex items-start gap-2">
                                        <div className="mt-1 p-1 rounded-full shrink-0" style={{ backgroundColor: 'rgba(0, 255, 145, 0.2)' }}>
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#00FF91' }} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-xs md:text-sm font-medium" style={{ color: '#FFFFFF' }}>Event Created</div>
                                            <div className="text-xs" style={{ color: '#8394A7' }}>Social media agent generating initial post templates</div>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-2">
                                        <div className="mt-1 p-1 rounded-full shrink-0" style={{ backgroundColor: event.venueId ? 'rgba(0, 255, 145, 0.2)' : 'rgba(148, 163, 184, 0.2)' }}>
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: event.venueId ? '#00FF91' : '#8394A7' }} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-xs md:text-sm font-medium" style={{ color: '#FFFFFF' }}>Venue Confirmation</div>
                                            <div className="text-xs" style={{ color: '#8394A7' }}>
                                                {event.venueId ? 'Venue confirmed - Social media will update with location details' : 'Waiting for venue confirmation'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-2">
                                        <div className="mt-1 p-1 rounded-full shrink-0" style={{ backgroundColor: event.sponsorIds?.length ? 'rgba(0, 255, 145, 0.2)' : 'rgba(148, 163, 184, 0.2)' }}>
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: event.sponsorIds?.length ? '#00FF91' : '#8394A7' }} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-xs md:text-sm font-medium" style={{ color: '#FFFFFF' }}>Sponsor Confirmation</div>
                                            <div className="text-xs" style={{ color: '#8394A7' }}>
                                                {event.sponsorIds?.length ? 'Sponsors confirmed - Social media will update' : 'Waiting for sponsor confirmations'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-2">
                                        <div className="mt-1 p-1 rounded-full shrink-0" style={{ backgroundColor: 'rgba(148, 163, 184, 0.2)' }}>
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#8394A7' }} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-xs md:text-sm font-medium" style={{ color: '#FFFFFF' }}>Image Generation</div>
                                            <div className="text-xs" style={{ color: '#8394A7' }}>Images will be generated once venue and sponsors are confirmed</div>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-2">
                                        <div className="mt-1 p-1 rounded-full shrink-0" style={{ backgroundColor: 'rgba(148, 163, 184, 0.2)' }}>
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#8394A7' }} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-xs md:text-sm font-medium" style={{ color: '#FFFFFF' }}>Final Social Media Posts</div>
                                            <div className="text-xs" style={{ color: '#8394A7' }}>Posts updated with complete details and images</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Recent Messages */}
                    <Card className="rounded-xl md:rounded-2xl" style={{ borderColor: 'rgba(0, 255, 145, 0.2)' }}>
                        <CardContent className="p-3 md:p-4">
                            <div className="text-xs md:text-sm font-medium mb-2" style={{ color: '#FFFFFF' }}>Recent Messages</div>
                            <div className="text-xs" style={{ color: '#8394A7' }}>
                                No recent messages. Agent communications will appear here.
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="social" className="mt-3 md:mt-4">
                    <SocialMediaPosts
                        eventId={eventId}
                        socialMediaPosts={event.socialMediaPosts}
                        socialMediaPostsStatus={event.socialMediaPostsStatus}
                        socialMediaAgentError={event.socialMediaAgentError}
                        onRegenerate={handleRegenerateSocialMedia}
                        onStatusUpdate={handleSocialMediaStatusUpdate}
                    />
                </TabsContent>

                <TabsContent value="venues" className="mt-3 md:mt-4">
                    {/* Venue Outreach Inbox */}
                    <Card className="rounded-xl md:rounded-2xl" style={{ borderColor: 'rgba(0, 255, 145, 0.2)' }}>
                        <CardContent className="p-3 md:p-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                                <div className="text-xs md:text-sm font-medium" style={{ color: '#FFFFFF' }}>Venue Outreach Inbox</div>
                                <Button size="sm" className="rounded-xl text-xs w-full sm:w-auto" style={{ backgroundColor: '#00FF91', color: '#000000' }}>
                                    + Start New Outreach
                                </Button>
                            </div>

                            <div className="space-y-2 md:space-y-3">
                                {/* Placeholder for venue conversations */}
                                <Card className="rounded-lg md:rounded-xl" style={{ borderColor: 'rgba(148, 163, 184, 0.2)' }}>
                                    <CardContent className="p-3">
                                        <div className="flex items-start justify-between mb-2 gap-2">
                                            <div>
                                                <div className="font-medium text-xs md:text-sm" style={{ color: '#FFFFFF' }}>Downtown Event Center</div>
                                                <div className="text-xs" style={{ color: '#8394A7' }}>Capacity: 250 · Downtown SF</div>
                                            </div>
                                            <Badge className="rounded-lg text-xs shrink-0" style={{ backgroundColor: 'rgba(251, 191, 36, 0.1)', color: '#FBB924' }}>
                                                Awaiting
                                            </Badge>
                                        </div>
                                        <div className="text-xs mb-2 p-2 rounded-lg" style={{ backgroundColor: '#051323', color: '#8394A7' }}>
                                            <strong style={{ color: '#FFFFFF' }}>Agent:</strong> Sent initial inquiry about availability for {format(new Date(event.date), "MMM d, yyyy")}
                                        </div>
                                        <div className="flex gap-2 flex-wrap">
                                            <Button size="sm" variant="outline" className="rounded-xl text-xs" style={{ borderColor: '#8394A7', color: '#8394A7' }}>
                                                View Thread
                                            </Button>
                                            <Button size="sm" variant="outline" className="rounded-xl text-xs" style={{ borderColor: '#00FF91', color: '#00FF91' }}>
                                                Follow-up
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="rounded-lg md:rounded-xl" style={{ borderColor: 'rgba(148, 163, 184, 0.2)' }}>
                                    <CardContent className="p-3">
                                        <div className="flex items-start justify-between mb-2 gap-2">
                                            <div>
                                                <div className="font-medium text-xs md:text-sm" style={{ color: '#FFFFFF' }}>Tech Hub Conference Room</div>
                                                <div className="text-xs" style={{ color: '#8394A7' }}>Capacity: 150 · SoMa</div>
                                            </div>
                                            <Badge className="rounded-lg text-xs shrink-0" style={{ backgroundColor: 'rgba(0, 255, 145, 0.1)', color: '#00FF91' }}>
                                                Active
                                            </Badge>
                                        </div>
                                        <div className="text-xs mb-2 p-2 rounded-lg" style={{ backgroundColor: '#051323', color: '#8394A7' }}>
                                            <div className="mb-1"><strong style={{ color: '#FFFFFF' }}>Venue:</strong> We have availability. Rate is $2,500 for 4 hours.</div>
                                            <strong style={{ color: '#FFFFFF' }}>Last reply:</strong> 2 hours ago
                                        </div>
                                        <div className="flex gap-2 flex-wrap">
                                            <Button size="sm" variant="outline" className="rounded-xl text-xs" style={{ borderColor: '#8394A7', color: '#8394A7' }}>
                                                View Thread
                                            </Button>
                                            <Button size="sm" className="rounded-xl text-xs" style={{ backgroundColor: '#00FF91', color: '#000000' }}>
                                                Reply
                                            </Button>
                                            <Button size="sm" className="rounded-xl text-xs" style={{ backgroundColor: '#00FF91', color: '#000000' }}>
                                                Accept
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="rounded-lg md:rounded-xl" style={{ borderColor: 'rgba(148, 163, 184, 0.2)' }}>
                                    <CardContent className="p-3">
                                        <div className="flex items-start justify-between mb-2 gap-2">
                                            <div>
                                                <div className="font-medium text-xs md:text-sm" style={{ color: '#FFFFFF' }}>Innovation Space</div>
                                                <div className="text-xs" style={{ color: '#8394A7' }}>Capacity: 200 · Mission Bay</div>
                                            </div>
                                            <Badge className="rounded-lg text-xs shrink-0" style={{ backgroundColor: 'rgba(148, 163, 184, 0.1)', color: '#8394A7' }}>
                                                Declined
                                            </Badge>
                                        </div>
                                        <div className="text-xs mb-2 p-2 rounded-lg" style={{ backgroundColor: '#051323', color: '#8394A7' }}>
                                            <strong style={{ color: '#FFFFFF' }}>Venue:</strong> Unfortunately we're fully booked for that date.
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="mt-3 text-center text-xs" style={{ color: '#8394A7' }}>
                                💡 The venue agent will automatically reach out based on your requirements
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="sponsors" className="mt-3 md:mt-4">
                    {/* Sponsor Outreach Inbox */}
                    <Card className="rounded-xl md:rounded-2xl" style={{ borderColor: 'rgba(0, 255, 145, 0.2)' }}>
                        <CardContent className="p-3 md:p-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                                <div className="text-xs md:text-sm font-medium" style={{ color: '#FFFFFF' }}>Sponsor Outreach Inbox</div>
                                <Button size="sm" className="rounded-xl text-xs w-full sm:w-auto" style={{ backgroundColor: '#00FF91', color: '#000000' }}>
                                    + Start New Outreach
                                </Button>
                            </div>

                            {/* Sponsor tiers */}
                            <div className="space-y-3">
                                <div>
                                    <div className="text-xs font-medium mb-2" style={{ color: '#8394A7' }}>PLATINUM TIER ($10,000+)</div>
                                    <Card className="rounded-lg md:rounded-xl" style={{ borderColor: 'rgba(148, 163, 184, 0.2)' }}>
                                        <CardContent className="p-3">
                                            <div className="flex items-start justify-between mb-2 gap-2">
                                                <div>
                                                    <div className="font-medium text-xs md:text-sm" style={{ color: '#FFFFFF' }}>TechCorp Industries</div>
                                                    <div className="text-xs" style={{ color: '#8394A7' }}>Software · Previous Sponsor</div>
                                                </div>
                                                <Badge className="rounded-lg text-xs shrink-0" style={{ backgroundColor: 'rgba(0, 255, 145, 0.1)', color: '#00FF91' }}>
                                                    Negotiating
                                                </Badge>
                                            </div>
                                            <div className="text-xs mb-2 p-2 rounded-lg" style={{ backgroundColor: '#051323', color: '#8394A7' }}>
                                                <div className="mb-1"><strong style={{ color: '#FFFFFF' }}>Sponsor:</strong> Interested in platinum at $12,000.</div>
                                                <strong style={{ color: '#FFFFFF' }}>Last reply:</strong> 1 day ago
                                            </div>
                                            <div className="flex gap-2 flex-wrap">
                                                <Button size="sm" variant="outline" className="rounded-xl text-xs" style={{ borderColor: '#8394A7', color: '#8394A7' }}>
                                                    Details
                                                </Button>
                                                <Button size="sm" className="rounded-xl text-xs" style={{ backgroundColor: '#00FF91', color: '#000000' }}>
                                                    Accept
                                                </Button>
                                                <Button size="sm" variant="outline" className="rounded-xl text-xs" style={{ borderColor: '#00FF91', color: '#00FF91' }}>
                                                    Counter
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                <div>
                                    <div className="text-xs font-medium mb-2" style={{ color: '#8394A7' }}>GOLD TIER ($5,000 - $9,999)</div>
                                    <div className="space-y-2">
                                        <Card className="rounded-lg md:rounded-xl" style={{ borderColor: 'rgba(148, 163, 184, 0.2)' }}>
                                            <CardContent className="p-3">
                                                <div className="flex items-start justify-between mb-2 gap-2">
                                                    <div>
                                                        <div className="font-medium text-xs md:text-sm" style={{ color: '#FFFFFF' }}>Innovation Labs</div>
                                                        <div className="text-xs" style={{ color: '#8394A7' }}>R&D Company</div>
                                                    </div>
                                                    <Badge className="rounded-lg text-xs shrink-0" style={{ backgroundColor: 'rgba(251, 191, 36, 0.1)', color: '#FBB924' }}>
                                                        Awaiting
                                                    </Badge>
                                                </div>
                                                <div className="text-xs mb-2 p-2 rounded-lg" style={{ backgroundColor: '#051323', color: '#8394A7' }}>
                                                    <strong style={{ color: '#FFFFFF' }}>Agent:</strong> Sent gold tier proposal ($7,500)
                                                </div>
                                                <div className="flex gap-2 flex-wrap">
                                                    <Button size="sm" variant="outline" className="rounded-xl text-xs" style={{ borderColor: '#8394A7', color: '#8394A7' }}>
                                                        View
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="rounded-xl text-xs" style={{ borderColor: '#00FF91', color: '#00FF91' }}>
                                                        Follow-up
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card className="rounded-lg md:rounded-xl" style={{ borderColor: 'rgba(148, 163, 184, 0.2)' }}>
                                            <CardContent className="p-3">
                                                <div className="flex items-start justify-between mb-2 gap-2">
                                                    <div>
                                                        <div className="font-medium text-xs md:text-sm" style={{ color: '#FFFFFF' }}>Cloud Solutions Inc</div>
                                                        <div className="text-xs" style={{ color: '#8394A7' }}>Cloud Services</div>
                                                    </div>
                                                    <Badge className="rounded-lg text-xs shrink-0" style={{ backgroundColor: 'rgba(0, 255, 145, 0.1)', color: '#00FF91' }}>
                                                        Confirmed
                                                    </Badge>
                                                </div>
                                                <div className="text-xs mb-2 p-2 rounded-lg" style={{ backgroundColor: '#051323', color: '#8394A7' }}>
                                                    <strong style={{ color: '#FFFFFF' }}>Confirmed:</strong> Gold sponsorship at $6,000 ✓
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>

                                <div>
                                    <div className="text-xs font-medium mb-2" style={{ color: '#8394A7' }}>SILVER TIER ($2,500 - $4,999)</div>
                                    <Card className="rounded-lg md:rounded-xl" style={{ borderColor: 'rgba(148, 163, 184, 0.2)' }}>
                                        <CardContent className="p-3 text-center text-xs" style={{ color: '#8394A7' }}>
                                            No active outreach at this tier
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>

                            <div className="mt-3 text-center text-xs" style={{ color: '#8394A7' }}>
                                💡 The sponsor agent will reach out based on your event type and audience
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="activity" className="mt-3 md:mt-4">
                    <Card className="rounded-xl md:rounded-2xl border-slate-200">
                        <CardContent className="p-3 md:p-4">
                            <RecentActivity eventId={eventId} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="assets" className="mt-3 md:mt-4">
                    <Card className="rounded-xl md:rounded-2xl" style={{ borderColor: 'rgba(0, 255, 145, 0.2)' }}>
                        <CardContent className="p-3 md:p-4">
                            <div className="text-xs md:text-sm font-medium mb-3" style={{ color: '#FFFFFF' }}>Generated Assets</div>

                            <div className="space-y-3">
                                {/* Images Section */}
                                <div>
                                    <div className="text-xs font-medium mb-2" style={{ color: '#8394A7' }}>GENERATED IMAGES</div>
                                    <Card className="rounded-lg md:rounded-xl" style={{ borderColor: 'rgba(148, 163, 184, 0.2)' }}>
                                        <CardContent className="p-3 text-xs text-center" style={{ color: '#8394A7' }}>
                                            Images will be generated once venue and sponsor details are confirmed.
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Email Templates */}
                                <div>
                                    <div className="text-xs font-medium mb-2" style={{ color: '#8394A7' }}>EMAIL TEMPLATES</div>
                                    <Card className="rounded-lg md:rounded-xl" style={{ borderColor: 'rgba(148, 163, 184, 0.2)' }}>
                                        <CardContent className="p-3 text-xs text-center" style={{ color: '#8394A7' }}>
                                            Email templates used for venue and sponsor outreach
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Social Media Assets */}
                                <div>
                                    <div className="text-xs font-medium mb-2" style={{ color: '#8394A7' }}>SOCIAL MEDIA ASSETS</div>
                                    <Card className="rounded-lg md:rounded-xl" style={{ borderColor: 'rgba(148, 163, 184, 0.2)' }}>
                                        <CardContent className="p-3 text-xs text-center" style={{ color: '#8394A7' }}>
                                            Approved posts with final images and copy
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}