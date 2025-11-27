import { useNavigate } from 'react-router-dom';
import { 
    Shield, 
    Ban, 
    Image, 
    Sliders,
    Bell, 
    Palette, 
    Key,
    Globe,
    Mail,
    Database,
    Lock,
    Eye,
    Flag,
    Filter,
    Trash2,
    Upload,
    FolderOpen,
    HardDrive,
    ToggleLeft,
    RefreshCw,
    Zap
} from 'lucide-react';
import AdminBreadcrumbs from '@/components/AdminBreadcrumbs';

interface SettingsCard {
    title: string;
    description: string;
    icon: React.ElementType;
    path: string;
    color: string;
    badge?: string;
    features?: string[];
}

export default function AdminSettings() {
    const navigate = useNavigate();

    // Primary Settings - Security, Moderation, Media, Options
    const primarySettings: SettingsCard[] = [
        {
            title: 'Security',
            description: 'Authentication, access control, and security policies',
            icon: Shield,
            path: '/admin/settings/security',
            color: '#FF6B6B',
            features: ['Role Management', 'Session Control', 'Two-Factor Auth', 'Audit Logs']
        },
        {
            title: 'Moderation',
            description: 'Content moderation tools and community guidelines',
            icon: Ban,
            path: '/admin/settings/moderation',
            color: '#FFB800',
            features: ['Content Filters', 'Report Queue', 'Auto-Moderation', 'Ban Management']
        },
        {
            title: 'Media Manager',
            description: 'Upload, organize, and manage all platform media',
            icon: Image,
            path: '/admin/media',
            color: '#00FF91',
            features: ['Image Library', 'Storage Usage', 'Bulk Upload', 'CDN Settings']
        },
        {
            title: 'Options',
            description: 'General platform settings and configurations',
            icon: Sliders,
            path: '/admin/settings/options',
            color: '#00D4FF',
            features: ['Site Settings', 'Feature Flags', 'Defaults', 'Maintenance']
        }
    ];

    // Additional Settings
    const additionalSettings: SettingsCard[] = [
        {
            title: 'Notifications',
            description: 'Email templates and notification preferences',
            icon: Bell,
            path: '/admin/settings/notifications',
            color: '#9D4EDD',
            badge: 'Coming Soon'
        },
        {
            title: 'Branding',
            description: 'Customize colors, logos, and site appearance',
            icon: Palette,
            path: '/admin/settings/branding',
            color: '#F72585',
            badge: 'Coming Soon'
        },
        {
            title: 'API & Integrations',
            description: 'API keys and third-party service connections',
            icon: Key,
            path: '/admin/settings/integrations',
            color: '#4CC9F0',
            badge: 'Coming Soon'
        },
        {
            title: 'Email Settings',
            description: 'SMTP configuration and email providers',
            icon: Mail,
            path: '/admin/settings/email',
            color: '#80ED99',
            badge: 'Coming Soon'
        },
        {
            title: 'Domain & SEO',
            description: 'Domains, redirects, and search optimization',
            icon: Globe,
            path: '/admin/settings/domain',
            color: '#F9A826',
            badge: 'Coming Soon'
        },
        {
            title: 'Database',
            description: 'Database statistics and data management',
            icon: Database,
            path: '/admin/settings/database',
            color: '#A78BFA',
            badge: 'Coming Soon'
        }
    ];

    const SettingsCardComponent = ({ card, isPrimary = false }: { card: SettingsCard; isPrimary?: boolean }) => {
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

                <div className={`relative ${isPrimary ? 'p-6' : 'p-4'}`}>
                    {/* Icon and Title */}
                    <div className="flex items-start gap-4">
                        <div 
                            className={`${isPrimary ? 'p-4' : 'p-3'} rounded-xl transition-all duration-300 group-hover:scale-110`}
                            style={{ 
                                backgroundColor: `${card.color}20`,
                            }}
                        >
                            <Icon 
                                className={isPrimary ? 'h-8 w-8' : 'h-6 w-6'} 
                                style={{ color: card.color }}
                            />
                        </div>
                        <div className="flex-1">
                            <h3 
                                className={`font-bold mb-1 ${isPrimary ? 'text-xl' : 'text-lg'}`}
                                style={{ color: '#FFFFFF' }}
                            >
                                {card.title}
                            </h3>
                            <p 
                                className={`${isPrimary ? 'text-sm' : 'text-xs'}`}
                                style={{ color: '#8394A7' }}
                            >
                                {card.description}
                            </p>
                        </div>
                    </div>

                    {/* Features list for primary cards */}
                    {isPrimary && card.features && (
                        <div 
                            className="mt-4 pt-4 border-t"
                            style={{ borderColor: `${card.color}20` }}
                        >
                            <div className="flex flex-wrap gap-2">
                                {card.features.map((feature) => (
                                    <span
                                        key={feature}
                                        className="px-2 py-1 rounded-md text-xs"
                                        style={{ 
                                            backgroundColor: `${card.color}10`,
                                            color: card.color
                                        }}
                                    >
                                        {feature}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Action indicator */}
                    {!isDisabled && isPrimary && (
                        <div 
                            className="mt-4 flex items-center gap-2 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ color: card.color }}
                        >
                            <span>Configure</span>
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
                        Settings
                    </h1>
                    <p style={{ color: '#8394A7' }}>
                        Configure your platform's security, moderation, and general options
                    </p>
                </div>

                {/* Primary Settings Section */}
                <div className="mb-10">
                    <h2 className="text-lg font-semibold mb-4" style={{ color: '#FFFFFF' }}>
                        Core Settings
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {primarySettings.map((card) => (
                            <SettingsCardComponent key={card.path} card={card} isPrimary={true} />
                        ))}
                    </div>
                </div>

                {/* Additional Settings Section */}
                <div className="mb-8">
                    <h2 className="text-lg font-semibold mb-4" style={{ color: '#FFFFFF' }}>
                        Additional Settings
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {additionalSettings.map((card) => (
                            <SettingsCardComponent key={card.path} card={card} isPrimary={false} />
                        ))}
                    </div>
                </div>

                {/* Quick Actions */}
                <div 
                    className="mt-8 p-6 rounded-xl"
                    style={{ 
                        backgroundColor: '#051323',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                >
                    <h3 className="text-lg font-semibold mb-4" style={{ color: '#FFFFFF' }}>
                        Quick Actions
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { label: 'Clear Cache', icon: RefreshCw, color: '#00FF91' },
                            { label: 'Export Data', icon: Upload, color: '#00D4FF' },
                            { label: 'View Logs', icon: Eye, color: '#FFB800' },
                            { label: 'System Status', icon: Zap, color: '#FF6B6B' }
                        ].map((action) => {
                            const ActionIcon = action.icon;
                            return (
                                <button
                                    key={action.label}
                                    className="flex items-center gap-2 p-3 rounded-lg transition-colors hover:bg-white/5"
                                    style={{ 
                                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)'
                                    }}
                                >
                                    <ActionIcon className="h-4 w-4" style={{ color: action.color }} />
                                    <span className="text-sm" style={{ color: '#FFFFFF' }}>{action.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
