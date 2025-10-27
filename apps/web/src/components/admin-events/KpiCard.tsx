import { Card, CardContent } from "@/components/ui/card";

export default function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
    return (
        <Card className="rounded-2xl shadow-sm" style={{ backgroundColor: '#051323', border: '1px solid rgba(0, 255, 145, 0.2)' }}>
            <CardContent className="p-5">
                <div className="text-sm" style={{ color: '#8394A7' }}>{label}</div>
                <div className="mt-1 text-2xl font-semibold" style={{ color: '#00FF91' }}>{value}</div>
                {sub && <div className="mt-1 text-xs" style={{ color: '#8394A7' }}>{sub}</div>}
            </CardContent>
        </Card>
    );
}