import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Copy, Pencil, SlidersHorizontal, Trash2 } from "lucide-react";

export default function RowActions({ onEdit, onDuplicate, onDelete }: { onEdit: () => void; onDuplicate: () => void; onDelete: () => void }) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <SlidersHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl">
                <DropdownMenuLabel>Quick actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={onEdit}><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                <DropdownMenuItem onClick={onDuplicate}><Copy className="mr-2 h-4 w-4" /> Duplicate</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-rose-600" onClick={onDelete}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}