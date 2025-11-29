/**
 * AdminQuickNav - Quick Navigation Component for Admin Portal
 * 
 * Provides easy navigation between all admin sections.
 * Can be placed at the top of any admin page.
 */

import { useLocation, useNavigate } from 'react-router-dom';
import { 
    LayoutDashboard, 
    Users, 
    Calendar, 
    Activity, 
    Shield,
    Image,
    Settings,
    Bell,
    MessageSquare,
    Flag,
    ChevronRight,
    Zap,
    Mail
} from 'lucide-react';

interface NavItem {
    id: string;
    label: string;
    path: string;
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
    description?: string;
}

const NAV_ITEMS: NavItem[] = [
    { 
        id: 'dashboard', 
        label: 'Dashboard', 
        path: '/admin/dashboard', 
        icon: LayoutDashboard,
        description: 'Overview & metrics'
    },
    { 
        id: 'users', 
        label: 'Users', 
        path: '/admin/users', 
        icon: Users,
        description: 'Manage members'
    },
    { 
        id: 'events', 
        label: 'Events', 
        path: '/admin/events', 
        icon: Calendar,
        description: 'Event management'
    },
    { 
        id: 'moderation', 
        label: 'Moderation', 
        path: '/admin/moderation', 
        icon: Flag,
        description: 'Content moderation'
    },
    { 
        id: 'notifications', 
        label: 'Broadcasts', 
        path: '/admin/notifications', 
        icon: Bell,
        description: 'Push notifications'
    },
    { 
        id: 'announcements', 
        label: 'Email', 
        path: '/admin/announcements', 
        icon: Mail,
        description: 'Newsletters & email'
    },
    { 
        id: 'media', 
        label: 'Media', 
        path: '/admin/media', 
        icon: Image,
        description: 'Asset management'
    },
    { 
        id: 'security', 
        label: 'Security', 
        path: '/admin/security', 
        icon: Shield,
        description: 'Security audit'
    },
    { 
        id: 'api-health', 
        label: 'API Health', 
        path: '/admin/api-health', 
        icon: Activity,
        description: 'System status'
    },
    { 
        id: 'settings', 
        label: 'Settings', 
        path: '/admin/settings', 
        icon: Settings,
        description: 'Admin settings'
    },
];

interface AdminQuickNavProps {
    className?: string;
    variant?: 'full' | 'compact' | 'icons';
}

export default function AdminQuickNav({ className = '', variant = 'full' }: AdminQuickNavProps) {
    const navigate = useNavigate();
    const location = useLocation();
    
    const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

    if (variant === 'icons') {
        return (
            <div className={`flex items-center gap-1 ${className}`}>
                {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    return (
                        <button
                            key={item.id}
                            onClick={() => navigate(item.path)}
                            className={`p-2 rounded-lg transition-all duration-200 ${
                                active 
                                    ? 'bg-[#00FF91]/20 text-[#00FF91]' 
                                    : 'text-gray-500 hover:text-white hover:bg-white/5'
                            }`}
                            title={item.label}
                        >
                            <Icon className="w-4 h-4" />
                        </button>
                    );
                })}
            </div>
        );
    }

    if (variant === 'compact') {
        return (
            <div className={`flex items-center gap-2 flex-wrap ${className}`}>
                {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    return (
                        <button
                            key={item.id}
                            onClick={() => navigate(item.path)}
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                                active 
                                    ? 'bg-[#00FF91]/20 text-[#00FF91] border border-[#00FF91]/30' 
                                    : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                            }`}
                        >
                            <Icon className="w-3.5 h-3.5" />
                            {item.label}
                        </button>
                    );
                })}
            </div>
        );
    }

    // Full variant (default) - Single row horizontal layout
    return (
        <div className={`${className}`}>
            <div 
                className="rounded-xl border overflow-hidden"
                style={{ 
                    backgroundColor: 'rgba(10, 31, 53, 0.5)', 
                    borderColor: 'rgba(0, 255, 145, 0.1)'
                }}
            >
                <div className="px-4 py-3">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 shrink-0">
                            <Zap className="w-4 h-4" style={{ color: '#00FF91' }} />
                            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#8394A7' }}>
                                Quick Access
                            </span>
                        </div>
                        
                        <div className="flex items-center gap-1 overflow-x-auto">
                            {NAV_ITEMS.map((item) => {
                                const Icon = item.icon;
                                const active = isActive(item.path);
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => navigate(item.path)}
                                        className={`group flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition-all duration-200 ${
                                            active 
                                                ? 'bg-[#00FF91]/15 border-[#00FF91]/30' 
                                                : 'hover:bg-white/5 border-transparent'
                                        } border`}
                                        title={item.description}
                                    >
                                        <Icon 
                                            className="w-4 h-4 shrink-0" 
                                            style={{ color: active ? '#00FF91' : '#8394A7' }} 
                                        />
                                        <span 
                                            className={`text-sm font-medium transition-colors ${
                                                active ? 'text-[#00FF91]' : 'text-gray-400 group-hover:text-white'
                                            }`}
                                        >
                                            {item.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Horizontal variant for header bars
export function AdminQuickNavBar({ className = '' }: { className?: string }) {
    const navigate = useNavigate();
    const location = useLocation();
    
    const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

    return (
        <div className={`flex items-center gap-1 overflow-x-auto pb-1 ${className}`}>
            {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                    <button
                        key={item.id}
                        onClick={() => navigate(item.path)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-all duration-200 ${
                            active 
                                ? 'bg-[#00FF91]/15 text-[#00FF91]' 
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <Icon className="w-4 h-4" />
                        <span className="hidden sm:inline">{item.label}</span>
                    </button>
                );
            })}
        </div>
    );
}
