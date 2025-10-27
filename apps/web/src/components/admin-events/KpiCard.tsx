import { Card, CardContent } from "@/components/ui/card";

export default function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
    return (
        <Card className="rounded-2xl shadow-sm border-slate-200">
            <CardContent className="p-5">
                <div className="text-sm text-slate-500">{label}</div>
                <div className="mt-1 text-2xl font-semibold">{value}</div>
                {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
            </CardContent>
        </Card>
    );
}