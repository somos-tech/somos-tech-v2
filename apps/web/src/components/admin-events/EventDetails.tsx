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
    "draft": "bg-amber-100 text-amber-800",
    "published": "bg-emerald-100 text-emerald-800",
    "cancelled": "bg-rose-100 text-rose-800",
    "completed": "bg-slate-100 text-slate-700"
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
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        );
    }

    if (error || !event) {
        return (
            <div className="flex flex-col items-center justify-center p-12 space-y-3">
                <AlertCircle className="h-8 w-8 text-rose-500" />
                <div className="text-sm text-slate-600">{error || 'Event not found'}</div>
                <Button onClick={onClose} variant="outline" className="rounded-xl">
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
                        <div className="text-xl font-semibold tracking-tight">{event.name}</div>
                        <Badge className={`rounded-lg ${STATUS_COLOR[event.status] || 'bg-slate-100 text-slate-700'}`}>
                            {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                        </Badge>
                    </div>
                    <div className="text-sm text-slate-600 mt-1">
                        {format(new Date(event.date), "EEE, MMM d • h:mma")} · {event.location}
                    </div>
                    <div className="text-sm text-slate-600">
                        {event.capacity && `Capacity: ${event.capacity}`}
                        {event.attendees && ` · ${event.attendees} attendees`}
                    </div>
                    <div className="text-sm text-slate-500 mt-2 max-w-prose">{event.description || 'No description'}</div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl"><X className="h-5 w-5" /></Button>
                </div>
            </div>

            <Tabs defaultValue="inbox" className="w-full">
                <TabsList className="rounded-2xl">
                    <TabsTrigger value="inbox">Agent Inbox</TabsTrigger>
                    <TabsTrigger value="activity">Activity</TabsTrigger>
                    <TabsTrigger value="assets">Assets</TabsTrigger>
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