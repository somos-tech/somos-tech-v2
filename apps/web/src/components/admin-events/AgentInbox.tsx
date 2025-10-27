import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight, Wand2 } from "lucide-react";

// Mock per-event agent outputs & activity
const EVENT_AGENTS: Record<string, { inbox: Array<{ id: string; type: string; status: string; preview: string; updated: string }>; activity: string[]; links: { manageUrl?: string; publicUrl?: string } }> = {
    evt_101: {
        inbox: [
            { id: "ai_1", type: "Social copy", status: "Ready", preview: "✨ Join us Nov 5 at the Downtown Library for Community Coding Night…", updated: "2m ago" },
            { id: "ai_2", type: "Venue outreach", status: "Waiting on reply", preview: "Emailed 4 venues in El Poblado—awaiting 2 responses.", updated: "10m ago" },
            { id: "ai_3", type: "Sponsor leads", status: "Queued", preview: "Configured queries for local tech sponsors.", updated: "Just now" }
        ],
        activity: [
            "Alex created the event draft",
            "Agent generated 3 social captions",
            "Outreach sent to Library admin",
        ],
        links: { manageUrl: "#/events/evt_101", publicUrl: "#/c/community-coding-night" }
    },
    evt_102: {
        inbox: [
            { id: "ai_4", type: "Social copy", status: "Approved", preview: "🎟️ Save the date: Fundraising Gala Nov 12…", updated: "1h ago" },
            { id: "ai_5", type: "Venue outreach", status: "Confirmed", preview: "Horizon Hall booked 7–11pm, catering quote received.", updated: "3h ago" },
        ],
        activity: ["Priya scheduled event", "Invoice approved for venue"],
        links: { manageUrl: "#/events/evt_102", publicUrl: "#/c/fundraising-gala" }
    }
};

export default function AgentInbox({ eventId }: { eventId?: string }) {
    const items = eventId && EVENT_AGENTS[eventId]?.inbox ? EVENT_AGENTS[eventId].inbox : [
        { id: "ai_generic_1", type: "Social copy", status: "Ready", preview: "✨ Join us for Community Coding Night on Nov 5…", updated: "2m ago" },
        { id: "ai_generic_2", type: "Venue outreach", status: "Waiting on reply", preview: "Emailed 4 venues in El Poblado…", updated: "10m ago" },
        { id: "ai_generic_3", type: "Sponsor leads", status: "Queued", preview: "Setting up search criteria…", updated: "Just now" },
    ];

    return (
        <div className="space-y-2">
            {items.map((it) => (
                <Card key={it.id} className="rounded-2xl" style={{ backgroundColor: '#051323', border: '1px solid rgba(0, 255, 145, 0.2)' }}>
                    <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5"><Wand2 className="h-4 w-4" style={{ color: '#00FF91' }} /></div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm font-medium" style={{ color: '#FFFFFF' }}>{it.type}</div>
                                    <Badge className="rounded-lg" style={{ backgroundColor: 'rgba(148, 163, 184, 0.1)', color: '#8394A7' }}>{it.status}</Badge>
                                </div>
                                <div className="text-sm mt-1" style={{ color: '#8394A7' }}>{it.preview}</div>
                                <div className="text-xs mt-2" style={{ color: '#58687B' }}>Updated {it.updated}</div>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8" style={{ color: '#00FF91' }}><ChevronRight className="h-4 w-4" /></Button>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}