import React, { useMemo, useState, useEffect } from "react";
import { Calendar, Plus, Search, SlidersHorizontal, Users, Settings, Bell, Sparkles, Ticket, Building2, Handshake, Upload, Wand2, CheckCircle2, Clock, Loader2, ChevronRight, Pencil, Trash2, Copy, Inbox, CalendarDays, X, Link } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import EventTable from "@/components/admin-events/EventTable";
import CreateEventDialog from "@/components/admin-events/CreateEventDialog";
import AgentInbox from "@/components/admin-events/AgentInbox";
import RecentActivity from "@/components/admin-events/RecentActivity";
import EventDetails from "@/components/admin-events/EventDetails";
import HeaderBar from "@/components/admin-events/HeaderBar";
import TopKpis from "@/components/admin-events/TopKpis";
import eventService from "@/api/eventService";
import type { Event } from "@shared/types";

export default function AdminEvents() {
    const [openCreate, setOpenCreate] = useState(false);
    const [openEventId, setOpenEventId] = useState<string | undefined>();
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch events from API
    useEffect(() => {
        loadEvents();
    }, []);

    const loadEvents = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await eventService.getEvents();
            setEvents(data);
        } catch (err) {
            console.error('Failed to load events:', err);
            setError('Failed to load events. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenEvent = (id: string) => setOpenEventId(id);

    const handleEventCreated = () => {
        loadEvents(); // Refresh the list after creating
    };

    const handleEventDeleted = () => {
        loadEvents(); // Refresh the list after deleting
    };

    return (
        <main className="flex-1 space-y-6" style={{ backgroundColor: '#0a1f35' }}>
            <HeaderBar onNew={() => setOpenCreate(true)} />

            {/* KPI row */}
            <TopKpis />

            {/* Create Event Dialog */}
            <CreateEventDialog open={openCreate} setOpen={setOpenCreate} onEventCreated={handleEventCreated} />

            {/* Content split */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Left: tabs with table & calendar */}
                <div className="xl:col-span-2 space-y-4">
                    <Tabs defaultValue="list" className="w-full">
                        <div className="flex items-center justify-between">
                            <TabsList className="rounded-2xl" style={{ backgroundColor: '#051323', border: '1px solid rgba(0, 255, 145, 0.2)' }}>
                                <TabsTrigger value="list" style={{ color: '#FFFFFF' }}>List</TabsTrigger>
                                <TabsTrigger value="calendar" style={{ color: '#FFFFFF' }}>Calendar</TabsTrigger>
                                <TabsTrigger value="drafts" style={{ color: '#FFFFFF' }}>Drafts</TabsTrigger>
                            </TabsList>
                            <div className="text-xs hidden md:block" style={{ color: '#8394A7' }}>Tip: Click a row to open its details and see linked Agent Inbox + Activity.</div>
                        </div>

                        <TabsContent value="list" className="mt-4">
                            <EventTable
                                data={events}
                                loading={loading}
                                error={error}
                                onOpen={handleOpenEvent}
                                onNew={() => setOpenCreate(true)}
                                onDelete={handleEventDeleted}
                            />
                        </TabsContent>

                        <TabsContent value="calendar" className="mt-4">
                            <Card className="rounded-2xl h-[480px]" style={{ backgroundColor: '#051323', border: '1px solid rgba(0, 255, 145, 0.2)' }}>
                                <CardContent className="p-6 h-full flex items-center justify-center" style={{ color: '#8394A7' }}>
                                    <div className="flex flex-col items-center gap-2">
                                        <CalendarDays className="h-6 w-6" />
                                        <div className="text-sm">(Calendar view placeholder)</div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="drafts" className="mt-4">
                            <Card className="rounded-2xl" style={{ backgroundColor: '#051323', border: '1px solid rgba(0, 255, 145, 0.2)' }}>
                                <CardContent className="p-6 text-sm" style={{ color: '#8394A7' }}>No drafts yet.</CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Right: Event details (if open) otherwise global AI inbox/activity */}
                <div className="space-y-4">
                    {openEventId ? (
                        <Card className="rounded-2xl" style={{ backgroundColor: '#051323', border: '1px solid rgba(0, 255, 145, 0.2)' }}>
                            <CardContent className="p-5">
                                <EventDetails eventId={openEventId} onClose={() => setOpenEventId(undefined)} />
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                            <Card className="rounded-2xl" style={{ backgroundColor: '#051323', border: '1px solid rgba(0, 255, 145, 0.2)' }}>
                                <CardContent className="p-5">
                                    <div className="flex items-center justify-between">
                                        <div className="font-medium flex items-center gap-2" style={{ color: '#00FF91' }}><Sparkles className="h-4 w-4" /> Agent Inbox</div>
                                        <Button variant="outline" size="sm" className="rounded-xl" style={{ borderColor: '#00FF91', color: '#00FF91' }}><Wand2 className="mr-2 h-4 w-4" />Run all</Button>
                                    </div>
                                    <div className="mt-4">
                                        <AgentInbox />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="rounded-2xl" style={{ backgroundColor: '#051323', border: '1px solid rgba(0, 255, 145, 0.2)' }}>
                                <CardContent className="p-5 space-y-3">
                                    <div className="font-medium flex items-center gap-2" style={{ color: '#02DBFF' }}><Clock className="h-4 w-4" /> Recent activity</div>
                                    <RecentActivity />
                                </CardContent>
                            </Card>
                        </>
                    )}
                </div>
            </div>
        </main>
    );
}
