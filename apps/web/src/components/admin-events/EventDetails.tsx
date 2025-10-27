import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Link, Loader2, AlertCircle } from "lucide-react";
import AgentInbox from "./AgentInbox";
import RecentActivity from "./RecentActivity";
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
        <div className="space-y-4">
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="text-xl font-semibold tracking-tight" style={{ color: '#FFFFFF' }}>{event.name}</div>
                        <Badge className={`rounded-lg ${STATUS_COLOR[event.status] || 'text-slate-400'}`} style={{ backgroundColor: STATUS_BG[event.status] || 'rgba(148, 163, 184, 0.1)' }}>
                            {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                        </Badge>
                    </div>
                    <div className="text-sm mt-1" style={{ color: '#8394A7' }}>
                        {format(new Date(event.date), "EEE, MMM d • h:mma")} · {event.location}
                    </div>
                    <div className="text-sm" style={{ color: '#8394A7' }}>
                        {event.capacity && `Capacity: ${event.capacity}`}
                        {event.attendees && ` · ${event.attendees} attendees`}
                    </div>
                    <div className="text-sm mt-2 max-w-prose" style={{ color: '#8394A7' }}>{event.description || 'No description'}</div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl"><X className="h-5 w-5" /></Button>
                </div>
            </div>

            <Tabs defaultValue="inbox" className="w-full">
                <TabsList className="rounded-2xl" style={{ backgroundColor: '#051323', border: '1px solid rgba(0, 255, 145, 0.2)' }}>
                    <TabsTrigger value="inbox" style={{ color: '#FFFFFF' }}>Agent Inbox</TabsTrigger>
                    <TabsTrigger value="activity" style={{ color: '#FFFFFF' }}>Activity</TabsTrigger>
                    <TabsTrigger value="assets" style={{ color: '#FFFFFF' }}>Assets</TabsTrigger>
                </TabsList>

                <TabsContent value="inbox" className="mt-4">
                    <AgentInbox eventId={eventId} />
                </TabsContent>

                <TabsContent value="activity" className="mt-4">
                    <Card className="rounded-2xl border-slate-200">
                        <CardContent className="p-5">
                            <RecentActivity eventId={eventId} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="assets" className="mt-4">
                    <Card className="rounded-2xl border-slate-200">
                        <CardContent className="p-5 text-sm text-slate-600">No assets yet. Generated images, flyers, and email templates will appear here.</CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}