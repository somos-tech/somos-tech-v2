import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Search, Plus, Upload, CalendarDays, Sparkles, Loader2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import RowActions from "./RowActions";
import type { Event } from "@shared/types";
import eventService from "@/api/eventService";

const STATUS_COLOR: Record<string, string> = {
    "draft": "bg-amber-100 text-amber-800",
    "published": "bg-emerald-100 text-emerald-800",
    "cancelled": "bg-rose-100 text-rose-800",
    "completed": "bg-slate-100 text-slate-700"
};

interface EventTableProps {
    data: Event[];
    loading?: boolean;
    error?: string | null;
    onOpen: (id: string) => void;
    onNew?: () => void;
    onDelete?: () => void;
}

export default function EventTable({ data, loading, error, onOpen, onNew, onDelete }: EventTableProps) {
    const [query, setQuery] = useState("");
    const [status, setStatus] = useState<string | undefined>();
    const [selected, setSelected] = useState<string[]>([]);
    const [deleting, setDeleting] = useState<string | null>(null);

    const filtered = useMemo(() => {
        return data.filter(e =>
            (!status || e.status === status) &&
            (e.name.toLowerCase().includes(query.toLowerCase()) ||
                e.location.toLowerCase().includes(query.toLowerCase()))
        );
    }, [data, query, status]);

    const toggleAll = (checked: boolean) => {
        setSelected(checked ? filtered.map(e => e.id) : []);
    };

    const toggleOne = (id: string, checked: boolean) => {
        setSelected(prev => checked ? [...prev, id] : prev.filter(x => x !== id));
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this event?')) return;

        try {
            setDeleting(id);
            await eventService.deleteEvent(id);
            onDelete?.();
        } catch (err) {
            console.error('Failed to delete event:', err);
            alert('Failed to delete event. Please try again.');
        } finally {
            setDeleting(null);
        }
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Delete ${selected.length} event(s)?`)) return;

        try {
            await Promise.all(selected.map(id => eventService.deleteEvent(id)));
            setSelected([]);
            onDelete?.();
        } catch (err) {
            console.error('Failed to delete events:', err);
            alert('Failed to delete some events. Please try again.');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-12 space-y-3">
                <AlertCircle className="h-8 w-8 text-rose-500" />
                <div className="text-sm text-slate-600">{error}</div>
                <Button onClick={() => window.location.reload()} variant="outline" className="rounded-xl">
                    Retry
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
                <div className="flex-1 flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search events, owners…" className="pl-9 rounded-xl" />
                    </div>
                    <Select onValueChange={(v) => setStatus(v)}>
                        <SelectTrigger className="w-40 rounded-xl">
                            <SelectValue placeholder="All statuses" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            {["draft", "published", "cancelled", "completed"].map(s => (
                                <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="rounded-xl"><Upload className="mr-2 h-4 w-4" />Import</Button>
                    <Button onClick={onNew} className="rounded-xl bg-black text-white hover:bg-black/90"><Plus className="mr-2 h-4 w-4" />New event</Button>
                </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                        <tr>
                            <th className="p-4 text-left w-10">
                                <Checkbox checked={selected.length === filtered.length && filtered.length > 0} onCheckedChange={(c) => toggleAll(Boolean(c))} />
                            </th>
                            <th className="p-4 text-left">Event</th>
                            <th className="p-4 text-left">Date</th>
                            <th className="p-4 text-left">Status</th>
                            <th className="p-4 text-left">Location</th>
                            <th className="p-4 text-left">Capacity</th>
                            <th className="p-4 text-left">Attendees</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={8} className="p-8 text-center text-slate-500">
                                    No events found
                                </td>
                            </tr>
                        )}
                        {filtered.map((e) => (
                            <tr key={e.id} className="border-t border-slate-100 hover:bg-slate-50/60 cursor-pointer" onClick={() => onOpen(e.id)}>
                                <td className="p-4" onClick={(ev) => ev.stopPropagation()}>
                                    <Checkbox checked={selected.includes(e.id)} onCheckedChange={(c) => toggleOne(e.id, Boolean(c))} />
                                </td>
                                <td className="p-4 font-medium">{e.name}</td>
                                <td className="p-4 text-slate-600">{format(new Date(e.date), "EEE, MMM d • h:mma")}</td>
                                <td className="p-4">
                                    <Badge className={`rounded-lg ${STATUS_COLOR[e.status] || 'bg-slate-100 text-slate-700'}`}>
                                        {e.status.charAt(0).toUpperCase() + e.status.slice(1)}
                                    </Badge>
                                </td>
                                <td className="p-4 text-slate-600">{e.location}</td>
                                <td className="p-4 text-slate-600">{e.capacity || '—'}</td>
                                <td className="p-4 text-slate-600">{e.attendees || 0}</td>
                                <td className="p-4 text-right" onClick={(ev) => ev.stopPropagation()}>
                                    <RowActions
                                        onEdit={() => { }}
                                        onDuplicate={() => { }}
                                        onDelete={() => handleDelete(e.id)}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {selected.length > 0 && (
                <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-3">
                    <div className="text-sm text-slate-600">{selected.length} selected</div>
                    <div className="flex gap-2">
                        <Button variant="outline" className="rounded-xl"><CalendarDays className="mr-2 h-4 w-4" />Schedule</Button>
                        <Button variant="outline" className="rounded-xl"><Sparkles className="mr-2 h-4 w-4" />Run AI agent</Button>
                        <Button variant="destructive" className="rounded-xl" onClick={handleBulkDelete}>Delete</Button>
                    </div>
                </div>
            )}
        </div>
    );
}