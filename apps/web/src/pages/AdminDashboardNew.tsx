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
    Clock
} from 'lucide-react';
import AdminBreadcrumbs from '@/components/AdminBreadcrumbs';

interface AdminCard {
    title: string;
    description: string;
    icon: React.ElementType;
    path: string;
    color: string;
    badge?: string;
    stats?: { label: string; value: string | number };
}

export default function AdminDashboard() {
    const navigate = useNavigate();

    // Primary Controls - Main admin sections in priority order
    const primaryControls: AdminCard[] = [
        {
            title: 'Users',
            description: 'Manage members, roles, and permissions',
            icon: Users,
            path: '/admin/users',
            color: '#00FF91',
            stats: { label: 'Total Members', value: '1,247' }
        },
        {
            title: 'Groups',
            description: 'Manage city chapters and community groups',
            icon: MapPin,
            path: '/admin/groups',
            color: '#00D4FF',
            stats: { label: 'Active Groups', value: '24' }
        },
        {
            title: 'Events',
            description: 'Create and manage events across all chapters',
            icon: Calendar,
            path: '/admin/events',
            color: '#FF6B6B',
            stats: { label: 'Upcoming', value: '15' }
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
            description: 'Create platform-wide announcements and alerts',
            icon: Megaphone,
            path: '/admin/announcements',
            color: '#F72585',
            badge: 'Coming Soon'
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
            title: 'API Health',
            description: 'Monitor API status and performance',
            icon: Activity,
            path: '/admin/health',
            color: '#00FF91'
        }
    ];

    // Quick stats
    const quickStats = [
        { label: 'Active Users Today', value: '142', icon: Users, change: '+12%', color: '#00FF91' },
        { label: 'Events This Week', value: '8', icon: Calendar, change: '+3', color: '#00D4FF' },
        { label: 'New Signups', value: '47', icon: TrendingUp, change: '+23%', color: '#FF6B6B' },
        { label: 'Pending Reviews', value: '5', icon: Clock, change: '-2', color: '#FFB800' }
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
                                className="p-4 rounded-xl"
                                style={{ 
                                    backgroundColor: '#051323',
                                    border: '1px solid rgba(255, 255, 255, 0.1)'
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
                                                {stat.value}
                                            </span>
                                            <span 
                                                className="text-xs px-1.5 py-0.5 rounded"
                                                style={{ 
                                                    backgroundColor: `${stat.color}20`,
                                                    color: stat.color 
                                                }}
                                            >
                                                {stat.change}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
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
