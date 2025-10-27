import { Bell, CheckCircle2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function HeaderBar({ onNew }: { onNew: () => void }) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="text-xl font-semibold tracking-tight">Events</div>
                <Badge className="rounded-lg bg-emerald-100 text-emerald-800 hidden md:inline-flex"><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Healthy</Badge>
            </div>
            <div className="flex items-center gap-2">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-xl"><Bell className="h-5 w-5" /></Button>
                        </TooltipTrigger>
                        <TooltipContent>Notifications</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <Button onClick={onNew} className="rounded-xl bg-black text-white hover:bg-black/90"><Plus className="mr-2 h-4 w-4" /> New event</Button>
            </div>
        </div>
    );
}