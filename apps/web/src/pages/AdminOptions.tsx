import { useState } from 'react';
import { 
    Sliders, 
    ToggleLeft,
    Globe,
    Clock,
    Calendar,
    Users,
    Bell,
    Zap,
    Shield,
    Eye,
    Lock,
    Save,
    RefreshCw,
    AlertTriangle
} from 'lucide-react';
import AdminBreadcrumbs from '@/components/AdminBreadcrumbs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface OptionSection {
    title: string;
    icon: React.ElementType;
    color: string;
    options: {
        id: string;
        label: string;
        description: string;
        type: 'toggle' | 'select' | 'input';
        value: string | boolean;
        options?: string[];
    }[];
}

export default function AdminOptions() {
    const [hasChanges, setHasChanges] = useState(false);
    
    const optionSections: OptionSection[] = [
        {
            title: 'General Settings',
            icon: Globe,
            color: '#00FF91',
            options: [
                { id: 'site-name', label: 'Site Name', description: 'Display name for your community', type: 'input', value: 'SOMOS.tech' },
                { id: 'timezone', label: 'Timezone', description: 'Default timezone for events and dates', type: 'select', value: 'America/New_York', options: ['America/New_York', 'America/Chicago', 'America/Los_Angeles', 'UTC'] },
                { id: 'language', label: 'Default Language', description: 'Primary language for the platform', type: 'select', value: 'English', options: ['English', 'Spanish', 'Portuguese'] },
            ]
        },
        {
            title: 'Registration & Access',
            icon: Users,
            color: '#00D4FF',
            options: [
                { id: 'open-registration', label: 'Open Registration', description: 'Allow new users to sign up', type: 'toggle', value: true },
                { id: 'email-verification', label: 'Require Email Verification', description: 'Users must verify email before access', type: 'toggle', value: true },
                { id: 'approval-required', label: 'Manual Approval', description: 'Require admin approval for new accounts', type: 'toggle', value: false },
                { id: 'invite-only', label: 'Invite Only Mode', description: 'Only allow signups via invitation', type: 'toggle', value: false },
            ]
        },
        {
            title: 'Content Settings',
            icon: Eye,
            color: '#FFB800',
            options: [
                { id: 'public-profiles', label: 'Public Profiles', description: 'Make user profiles visible to non-members', type: 'toggle', value: true },
                { id: 'public-events', label: 'Public Events', description: 'Show events to non-authenticated users', type: 'toggle', value: true },
                { id: 'public-groups', label: 'Public Groups', description: 'Allow viewing groups without login', type: 'toggle', value: true },
                { id: 'comments-enabled', label: 'Enable Comments', description: 'Allow comments on events and posts', type: 'toggle', value: true },
            ]
        },
        {
            title: 'Feature Flags',
            icon: Zap,
            color: '#9D4EDD',
            options: [
                { id: 'online-community', label: 'Online Community', description: 'Enable real-time chat features', type: 'toggle', value: true },
                { id: 'programs', label: 'Programs Module', description: 'Enable learning programs section', type: 'toggle', value: true },
                { id: 'donations', label: 'Donations', description: 'Enable donation/contribution features', type: 'toggle', value: true },
                { id: 'ai-features', label: 'AI Features', description: 'Enable AI-powered features (beta)', type: 'toggle', value: false },
            ]
        },
        {
            title: 'Maintenance',
            icon: AlertTriangle,
            color: '#FF6B6B',
            options: [
                { id: 'maintenance-mode', label: 'Maintenance Mode', description: 'Show maintenance page to all visitors', type: 'toggle', value: false },
                { id: 'debug-mode', label: 'Debug Mode', description: 'Enable verbose logging (dev only)', type: 'toggle', value: false },
                { id: 'read-only', label: 'Read-Only Mode', description: 'Disable all write operations', type: 'toggle', value: false },
            ]
        }
    ];

    const handleToggle = () => {
        setHasChanges(true);
    };

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#0a1f35' }}>
            <div className="max-w-7xl mx-auto px-4 py-6">
                {/* Breadcrumbs */}
                <AdminBreadcrumbs />

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-bold mb-2" style={{ color: '#FFFFFF' }}>
                            Platform Options
                        </h1>
                        <p style={{ color: '#8394A7' }}>
                            Configure general settings, feature flags, and platform behavior
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            variant="ghost"
                            className="rounded-lg"
                            style={{ color: '#8394A7' }}
                        >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Reset to Defaults
                        </Button>
                        <Button
                            className="rounded-lg"
                            style={{ 
                                backgroundColor: hasChanges ? '#00FF91' : '#8394A7',
                                color: '#051323' 
                            }}
                            disabled={!hasChanges}
                        >
                            <Save className="h-4 w-4 mr-2" />
                            Save Changes
                        </Button>
                    </div>
                </div>

                {/* Options Sections */}
                <div className="space-y-6">
                    {optionSections.map((section) => {
                        const Icon = section.icon;
                        return (
                            <Card
                                key={section.title}
                                className="p-6"
                                style={{ 
                                    backgroundColor: '#051323',
                                    border: `1px solid ${section.color}30`
                                }}
                            >
                                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2" style={{ color: '#FFFFFF' }}>
                                    <Icon className="h-5 w-5" style={{ color: section.color }} />
                                    {section.title}
                                </h2>
                                <div className="space-y-4">
                                    {section.options.map((option) => (
                                        <div 
                                            key={option.id}
                                            className="flex items-center justify-between p-4 rounded-lg"
                                            style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
                                        >
                                            <div className="flex-1">
                                                <div className="font-medium" style={{ color: '#FFFFFF' }}>
                                                    {option.label}
                                                </div>
                                                <div className="text-sm" style={{ color: '#8394A7' }}>
                                                    {option.description}
                                                </div>
                                            </div>
                                            
                                            {option.type === 'toggle' && (
                                                <button
                                                    onClick={handleToggle}
                                                    className={`relative w-12 h-6 rounded-full transition-colors ${
                                                        option.value ? 'bg-green-500' : 'bg-gray-600'
                                                    }`}
                                                >
                                                    <div 
                                                        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                                                            option.value ? 'left-7' : 'left-1'
                                                        }`}
                                                    />
                                                </button>
                                            )}
                                            
                                            {option.type === 'select' && (
                                                <select
                                                    className="px-3 py-2 rounded-lg text-sm"
                                                    style={{ 
                                                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                        color: '#FFFFFF',
                                                        border: '1px solid rgba(255, 255, 255, 0.2)'
                                                    }}
                                                    defaultValue={option.value as string}
                                                    onChange={handleToggle}
                                                >
                                                    {option.options?.map((opt) => (
                                                        <option key={opt} value={opt} style={{ backgroundColor: '#051323' }}>
                                                            {opt}
                                                        </option>
                                                    ))}
                                                </select>
                                            )}
                                            
                                            {option.type === 'input' && (
                                                <Input
                                                    className="w-48"
                                                    defaultValue={option.value as string}
                                                    onChange={handleToggle}
                                                    style={{ 
                                                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                        color: '#FFFFFF',
                                                        border: '1px solid rgba(255, 255, 255, 0.2)'
                                                    }}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        );
                    })}
                </div>

                {/* Danger Zone */}
                <Card
                    className="mt-6 p-6"
                    style={{ 
                        backgroundColor: '#051323',
                        border: '2px solid rgba(255, 107, 107, 0.5)'
                    }}
                >
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2" style={{ color: '#FF6B6B' }}>
                        <AlertTriangle className="h-5 w-5" />
                        Danger Zone
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(255, 107, 107, 0.1)' }}>
                            <div className="font-medium mb-1" style={{ color: '#FFFFFF' }}>Clear All Cache</div>
                            <div className="text-sm mb-3" style={{ color: '#8394A7' }}>
                                Clear all cached data. May temporarily slow down the site.
                            </div>
                            <Button 
                                size="sm"
                                variant="outline"
                                className="rounded-lg"
                                style={{ borderColor: '#FF6B6B', color: '#FF6B6B' }}
                            >
                                Clear Cache
                            </Button>
                        </div>
                        <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(255, 107, 107, 0.1)' }}>
                            <div className="font-medium mb-1" style={{ color: '#FFFFFF' }}>Export All Data</div>
                            <div className="text-sm mb-3" style={{ color: '#8394A7' }}>
                                Download a complete backup of all platform data.
                            </div>
                            <Button 
                                size="sm"
                                variant="outline"
                                className="rounded-lg"
                                style={{ borderColor: '#FF6B6B', color: '#FF6B6B' }}
                            >
                                Export Data
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
