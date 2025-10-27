import KpiCard from "@/components/admin-events/KpiCard";

export default function TopKpis() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Upcoming events" value="8" sub="Next 30 days" />
            <KpiCard label="Avg RSVP rate" value="41%" sub="Last 90 days" />
            <KpiCard label="Active sponsors" value="12" sub="Across 4 tiers" />
            <KpiCard label="Open tasks" value="23" sub="Agent/Team" />
        </div>
    );
}