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

export default function RecentActivity({ eventId }: { eventId?: string }) {
    const lines = eventId && EVENT_AGENTS[eventId]?.activity ? EVENT_AGENTS[eventId].activity : [
        "Priya scheduled ‘Fundraising Gala’ for Nov 12",
        "Jordan created event idea ‘Women in Tech Panel’",
        "Social copy ready for ‘Coding Night’",
    ];
    return (
        <div className="space-y-2 text-sm text-slate-600">
            {lines.map((l, i) => (<div key={i}>• {l}</div>))}
        </div>
    );
}