import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Users, 
    MapPin, 
    Calendar, 
    Settings,
    GraduationCap,
    BarChart3,
    Megaphone,
    FileText,
    MessageSquare,
    Activity,
    TrendingUp,
    AlertTriangle,
    Loader2,
    Shield
} from 'lucide-react';
import AdminBreadcrumbs from '@/components/AdminBreadcrumbs';
import SystemHealthAlert from '@/components/SystemHealthAlert';
import SWASizeTracker from '@/components/SWASizeTracker';
import { getUserStats } from '@/api/userService';
import eventService from '@/api/eventService';
import { listGroups } from '@/api/groupsService';

interface AdminCard {
    title: string;
    description: string;
    icon: React.ElementType;
    path: string;
    color: string;
    badge?: string;
    stats?: { label: string; value: string | number };
}

interface DashboardStats {
    totalUsers: number;
    activeUsers: number;
    newSignups: number;
    totalGroups: number;
    totalEvents: number;
    upcomingEvents: number;
    alerts: number;
    moderationPending: number;
}

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState<DashboardStats>({
        totalUsers: 0,
        activeUsers: 0,
        newSignups: 0,
        totalGroups: 0,
        totalEvents: 0,
        upcomingEvents: 0,
        alerts: 0,
        moderationPending: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardStats();
    }, []);

    const loadDashboardStats = async () => {
        try {
            setLoading(true);
            
            // Fetch all stats in parallel
            const [userStats, events, groupsData, moderationStats] = await Promise.all([
                getUserStats().catch(() => ({ total: 0, active: 0, blocked: 0 })),
                eventService.getEvents().catch(() => []),
                listGroups().catch(() => ({ groups: [], total: 0, userMemberships: [] })),
                fetch('/api/moderation/stats').then(r => r.ok ? r.json() : { pending: 0 }).catch(() => ({ pending: 0 }))
            ]);

            // Calculate upcoming events (events with date >= today)
            const now = new Date();
            const upcomingEvents = events.filter(e => new Date(e.date) >= now).length;

            setStats({
                totalUsers: userStats.total || 0,
                activeUsers: userStats.active || 0,
                newSignups: 0, // Not tracked in current API
                totalGroups: groupsData.total || groupsData.groups?.length || 0,
                totalEvents: events.length,
                upcomingEvents: upcomingEvents,
                alerts: moderationStats.pending || 0, // Use moderation pending as alerts
                moderationPending: moderationStats.pending || 0
            });
        } catch (error) {
            console.error('Failed to load dashboard stats:', error);
        } finally {
            setLoading(false);
        }
    };

    // Primary Controls - Main admin sections in priority order
    const primaryControls: AdminCard[] = [
        {
            title: 'Users',
            description: 'Manage members, roles, and permissions',
            icon: Users,
            path: '/admin/users',
            color: '#00FF91',
            stats: { label: 'Total Members', value: loading ? '...' : stats.totalUsers.toLocaleString() }
        },
        {
            title: 'Groups',
            description: 'Manage city chapters and community groups',
            icon: MapPin,
            path: '/admin/groups',
            color: '#00D4FF',
            stats: { label: 'Active Groups', value: loading ? '...' : stats.totalGroups }
        },
        {
            title: 'Events',
            description: 'Create and manage events across all chapters',
            icon: Calendar,
            path: '/admin/events',
            color: '#FF6B6B',
            stats: { label: 'Upcoming', value: loading ? '...' : stats.upcomingEvents }
        },
        {
            title: 'Settings',
            description: 'Security, moderation, media, and platform options',
            icon: Settings,
            path: '/admin/settings',
            color: '#FFB800'
        }
    ];

    // Secondary Controls - Additional admin tools
    const secondaryControls: AdminCard[] = [
        {
            title: 'Programs',
            description: 'Manage learning programs, roadmaps, and courses',
            icon: GraduationCap,
            path: '/admin/programs',
            color: '#9D4EDD',
            badge: 'Coming Soon'
        },
        {
            title: 'Announcements',
            description: 'Send emails and manage newsletters to the community',
            icon: Megaphone,
            path: '/admin/announcements',
            color: '#F72585'
        },
        {
            title: 'Analytics',
            description: 'View engagement metrics and platform insights',
            icon: BarChart3,
            path: '/admin/analytics',
            color: '#4CC9F0',
            badge: 'Coming Soon'
        },
        {
            title: 'Reports',
            description: 'Generate and view community reports',
            icon: FileText,
            path: '/admin/reports',
            color: '#80ED99',
            badge: 'Coming Soon'
        },
        {
            title: 'Feedback',
            description: 'Review user feedback and suggestions',
            icon: MessageSquare,
            path: '/admin/feedback',
            color: '#F9A826',
            badge: 'Coming Soon'
        },
        {
            title: 'Security',
            description: 'Monitor admin access and security anomalies',
            icon: Shield,
            path: '/admin/security',
            color: '#ef4444'
        },
        {
            title: 'API Health',
            description: 'Monitor API status and performance',
            icon: Activity,
            path: '/admin/health',
            color: '#00FF91'
        }
    ];

    // Quick stats
    const quickStats = [
        { label: 'Total Users', value: loading ? '...' : stats.totalUsers.toLocaleString(), icon: Users, path: '/admin/users', color: '#00FF91' },
        { label: 'Events This Week', value: loading ? '...' : stats.upcomingEvents.toString(), icon: Calendar, path: '/admin/events', color: '#00D4FF' },
        { label: 'Active Groups', value: loading ? '...' : stats.totalGroups.toString(), icon: MapPin, path: '/admin/groups', color: '#FF6B6B' },
        { label: 'Moderation Queue', value: loading ? '...' : stats.moderationPending.toString(), icon: AlertTriangle, path: '/admin/settings/moderation', color: '#FFB800' }
    ];

    const AdminCardComponent = ({ card, size = 'large' }: { card: AdminCard; size?: 'large' | 'small' }) => {
        const Icon = card.icon;
        const isDisabled = card.badge === 'Coming Soon';
        
        return (
            <div
                onClick={() => !isDisabled && navigate(card.path)}
                className={`
                    relative group rounded-xl transition-all duration-300 overflow-hidden
                    ${isDisabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:scale-[1.02] hover:shadow-2xl'}
                `}
                style={{ 
                    backgroundColor: '#051323',
                    border: `2px solid ${card.color}30`,
                }}
            >
                {/* Hover glow effect */}
                {!isDisabled && (
                    <div 
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{ 
                            background: `linear-gradient(135deg, ${card.color}10, transparent)`,
                        }}
                    />
                )}

                {/* Badge */}
                {card.badge && (
                    <div 
                        className="absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium"
                        style={{ 
                            backgroundColor: `${card.color}20`,
                            color: card.color
                        }}
                    >
                        {card.badge}
                    </div>
                )}

                <div className={`relative ${size === 'large' ? 'p-6' : 'p-4'}`}>
                    {/* Icon and Title */}
                    <div className="flex items-start gap-4">
                        <div 
                            className={`${size === 'large' ? 'p-4' : 'p-3'} rounded-xl transition-all duration-300 group-hover:scale-110`}
                            style={{ 
                                backgroundColor: `${card.color}20`,
                            }}
                        >
                            <Icon 
                                className={size === 'large' ? 'h-8 w-8' : 'h-6 w-6'} 
                                style={{ color: card.color }}
                            />
                        </div>
                        <div className="flex-1">
                            <h3 
                                className={`font-bold mb-1 ${size === 'large' ? 'text-xl' : 'text-lg'}`}
                                style={{ color: '#FFFFFF' }}
                            >
                                {card.title}
                            </h3>
                            <p 
                                className={`${size === 'large' ? 'text-sm' : 'text-xs'}`}
                                style={{ color: '#8394A7' }}
                            >
                                {card.description}
                            </p>
                        </div>
                    </div>

                    {/* Stats (only for large cards) */}
                    {size === 'large' && card.stats && (
                        <div 
                            className="mt-4 pt-4 border-t"
                            style={{ borderColor: `${card.color}20` }}
                        >
                            <div className="flex items-center justify-between">
                                <span style={{ color: '#8394A7' }}>{card.stats.label}</span>
                                <span 
                                    className="text-2xl font-bold"
                                    style={{ color: card.color }}
                                >
                                    {card.stats.value}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Action indicator */}
                    {!isDisabled && size === 'large' && (
                        <div 
                            className="mt-4 flex items-center gap-2 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ color: card.color }}
                        >
                            <span>Manage</span>
                            <span>→</span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#0a1f35' }}>
            <div className="max-w-7xl mx-auto px-4 py-6">
                {/* Breadcrumbs */}
                <AdminBreadcrumbs />

                {/* System Health Alerts */}
                <SystemHealthAlert />

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-2" style={{ color: '#FFFFFF' }}>
                        Admin Portal
                    </h1>
                    <p style={{ color: '#8394A7' }}>
                        Manage your SOMOS.tech community platform
                    </p>
                </div>

                {/* Quick Stats Bar */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {quickStats.map((stat) => {
                        const Icon = stat.icon;
                        return (
                            <div
                                key={stat.label}
                                onClick={() => navigate(stat.path)}
                                className="p-4 rounded-xl cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
                                style={{ 
                                    backgroundColor: '#051323',
                                    border: `1px solid ${stat.color}30`
                                }}
                            >
                                <div className="flex items-center gap-3">
                                    <Icon className="h-5 w-5" style={{ color: stat.color }} />
                                    <div className="flex-1">
                                        <div className="text-xs" style={{ color: '#8394A7' }}>
                                            {stat.label}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>
                                                {loading ? (
                                                    <Loader2 className="h-5 w-5 animate-spin" style={{ color: stat.color }} />
                                                ) : stat.value}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Azure SWA Size Tracker */}
                <div className="mb-8">
                    <SWASizeTracker variant="compact" />
                </div>

                {/* Primary Controls Section */}
                <div className="mb-8">
                    <h2 className="text-lg font-semibold mb-4" style={{ color: '#FFFFFF' }}>
                        Management Controls
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {primaryControls.map((card) => (
                            <AdminCardComponent key={card.path} card={card} size="large" />
                        ))}
                    </div>
                </div>

                {/* Secondary Controls Section */}
                <div className="mb-8">
                    <h2 className="text-lg font-semibold mb-4" style={{ color: '#FFFFFF' }}>
                        Tools & Utilities
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {secondaryControls.map((card) => (
                            <AdminCardComponent key={card.path} card={card} size="small" />
                        ))}
                    </div>
                </div>

                {/* Footer Help Section */}
                <div 
                    className="mt-8 p-6 rounded-xl text-center"
                    style={{ 
                        backgroundColor: '#051323',
                        border: '1px solid rgba(0, 255, 145, 0.2)'
                    }}
                >
                    <h3 className="text-lg font-semibold mb-2" style={{ color: '#FFFFFF' }}>
                        Need Help?
                    </h3>
                    <p className="text-sm mb-4" style={{ color: '#8394A7' }}>
                        Check out the admin documentation or contact support for assistance.
                    </p>
                    <div className="flex justify-center gap-4">
                        <button 
                            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-opacity-80"
                            style={{ 
                                backgroundColor: 'rgba(0, 255, 145, 0.2)',
                                color: '#00FF91'
                            }}
                        >
                            View Documentation
                        </button>
                        <button 
                            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-opacity-80"
                            style={{ 
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                color: '#FFFFFF'
                            }}
                        >
                            Contact Support
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
