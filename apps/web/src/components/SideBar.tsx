import { Building2, Calendar, ChevronDown, ChevronRight, Handshake, Inbox, Settings, Shield, Sparkles, Ticket, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";

export default function Sidebar() {
    const navigate = useNavigate();
    const location = useLocation();
    const [isAdminExpanded, setIsAdminExpanded] = useState(location.pathname.startsWith('/admin'));

    const nav = [
        { label: "Home", icon: <Inbox className="h-4 w-4" />, path: "/" },
    ];

    const adminSubItems = [
        { label: "Events", icon: <Calendar className="h-4 w-4" />, path: "/admin/events" },
        { label: "Admin Users", icon: <Shield className="h-4 w-4" />, path: "/admin/users" }
    ];

    return (
        <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 border-r border-slate-200 p-4 bg-white">
            <div className="text-lg font-semibold tracking-tight mb-4">SOMOS.tech</div>

            {/* Regular nav items */}
            <div className="space-y-1">
                {nav.map((n, i) => (
                    <Button
                        key={i}
                        variant={location.pathname === n.path ? "secondary" : "ghost"}
                        className={`justify-start rounded-xl ${location.pathname === n.path ? "bg-slate-100" : ""}`}
                        onClick={() => navigate(n.path)}
                    >
                        <span className="mr-2">{n.icon}</span>{n.label}
                    </Button>
                ))}
            </div>

            {/* Admin section */}
            <div className="space-y-1">
                <Button
                    variant="ghost"
                    className="justify-start rounded-xl w-full"
                    onClick={() => setIsAdminExpanded(!isAdminExpanded)}
                >
                    <span className="mr-2"><Ticket className="h-4 w-4" /></span>
                    Admin
                    <span className="ml-auto">
                        {isAdminExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </span>
                </Button>

                {isAdminExpanded && (
                    <div className="ml-6 mt-1 space-y-1">
                        {adminSubItems.map((item, i) => (
                            <Button
                                key={i}
                                variant={location.pathname === item.path ? "secondary" : "ghost"}
                                size="sm"
                                className={`justify-start rounded-lg w-full ${location.pathname === item.path ? "bg-slate-100" : ""}`}
                                onClick={() => navigate(item.path)}
                            >
                                <span className="mr-2">{item.icon}</span>{item.label}
                            </Button>
                        ))}
                    </div>
                )}
            </div>

            <div className="mt-auto text-xs text-slate-400">v1.0</div>
        </aside>
    );
}