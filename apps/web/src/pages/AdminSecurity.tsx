import { useState } from 'react';
import { 
    Shield, 
    Key, 
    Lock, 
    Users, 
    FileText, 
    Clock, 
    AlertTriangle,
    CheckCircle,
    Settings,
    Eye,
    EyeOff,
    Smartphone,
    Globe,
    RefreshCw
} from 'lucide-react';
import AdminBreadcrumbs from '@/components/AdminBreadcrumbs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface SecuritySetting {
    id: string;
    label: string;
    description: string;
    enabled: boolean;
    category: string;
}

export default function AdminSecurity() {
    const [settings, setSettings] = useState<SecuritySetting[]>([
        { id: 'two-factor', label: 'Two-Factor Authentication', description: 'Require 2FA for admin accounts', enabled: true, category: 'authentication' },
        { id: 'session-timeout', label: 'Session Timeout', description: 'Auto-logout after 30 minutes of inactivity', enabled: true, category: 'session' },
        { id: 'ip-whitelist', label: 'IP Whitelisting', description: 'Restrict admin access to specific IPs', enabled: false, category: 'access' },
        { id: 'audit-logs', label: 'Audit Logging', description: 'Log all admin actions for review', enabled: true, category: 'logging' },
        { id: 'password-policy', label: 'Strong Password Policy', description: 'Require complex passwords for all users', enabled: true, category: 'authentication' },
        { id: 'brute-force', label: 'Brute Force Protection', description: 'Lock accounts after 5 failed attempts', enabled: true, category: 'protection' },
    ]);

    const toggleSetting = (id: string) => {
        setSettings(prev => prev.map(s => 
            s.id === id ? { ...s, enabled: !s.enabled } : s
        ));
    };

    const securityStats = [
        { label: 'Active Sessions', value: '12', icon: Users, color: '#00FF91' },
        { label: 'Failed Logins (24h)', value: '3', icon: AlertTriangle, color: '#FFB800' },
        { label: 'Admin Users', value: '5', icon: Shield, color: '#00D4FF' },
        { label: 'Last Audit', value: '2h ago', icon: Clock, color: '#FF6B6B' },
    ];

    const recentActivity = [
        { action: 'Admin login', user: 'jcruz@somos.tech', time: '2 minutes ago', status: 'success' },
        { action: 'Password changed', user: 'admin@somos.tech', time: '1 hour ago', status: 'success' },
        { action: 'Failed login attempt', user: 'unknown@gmail.com', time: '3 hours ago', status: 'warning' },
        { action: 'Role updated', user: 'member@somos.tech', time: '5 hours ago', status: 'success' },
        { action: 'API key regenerated', user: 'system', time: '1 day ago', status: 'info' },
    ];

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#0a1f35' }}>
            <div className="max-w-7xl mx-auto px-4 py-6">
                {/* Breadcrumbs */}
                <AdminBreadcrumbs />

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-bold mb-2" style={{ color: '#FFFFFF' }}>
                            Security Settings
                        </h1>
                        <p style={{ color: '#8394A7' }}>
                            Manage authentication, access control, and security policies
                        </p>
                    </div>
                    <Button
                        className="rounded-lg"
                        style={{ backgroundColor: '#00FF91', color: '#051323' }}
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Run Security Scan
                    </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {securityStats.map((stat) => {
                        const Icon = stat.icon;
                        return (
                            <Card
                                key={stat.label}
                                className="p-4"
                                style={{ 
                                    backgroundColor: '#051323',
                                    border: `1px solid ${stat.color}30`
                                }}
                            >
                                <div className="flex items-center gap-3">
                                    <div 
                                        className="p-2 rounded-lg"
                                        style={{ backgroundColor: `${stat.color}20` }}
                                    >
                                        <Icon className="h-5 w-5" style={{ color: stat.color }} />
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>
                                            {stat.value}
                                        </div>
                                        <div className="text-xs" style={{ color: '#8394A7' }}>
                                            {stat.label}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Security Settings */}
                    <Card
                        className="p-6"
                        style={{ 
                            backgroundColor: '#051323',
                            border: '1px solid rgba(255, 107, 107, 0.3)'
                        }}
                    >
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2" style={{ color: '#FFFFFF' }}>
                            <Shield className="h-5 w-5" style={{ color: '#FF6B6B' }} />
                            Security Controls
                        </h2>
                        <div className="space-y-4">
                            {settings.map((setting) => (
                                <div 
                                    key={setting.id}
                                    className="flex items-center justify-between p-3 rounded-lg"
                                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
                                >
                                    <div className="flex-1">
                                        <div className="font-medium" style={{ color: '#FFFFFF' }}>
                                            {setting.label}
                                        </div>
                                        <div className="text-xs" style={{ color: '#8394A7' }}>
                                            {setting.description}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => toggleSetting(setting.id)}
                                        className={`relative w-12 h-6 rounded-full transition-colors ${
                                            setting.enabled ? 'bg-green-500' : 'bg-gray-600'
                                        }`}
                                    >
                                        <div 
                                            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                                                setting.enabled ? 'left-7' : 'left-1'
                                            }`}
                                        />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Recent Activity */}
                    <Card
                        className="p-6"
                        style={{ 
                            backgroundColor: '#051323',
                            border: '1px solid rgba(0, 255, 145, 0.3)'
                        }}
                    >
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2" style={{ color: '#FFFFFF' }}>
                            <FileText className="h-5 w-5" style={{ color: '#00FF91' }} />
                            Recent Security Activity
                        </h2>
                        <div className="space-y-3">
                            {recentActivity.map((activity, index) => (
                                <div 
                                    key={index}
                                    className="flex items-center gap-3 p-3 rounded-lg"
                                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
                                >
                                    <div 
                                        className="w-2 h-2 rounded-full"
                                        style={{ 
                                            backgroundColor: activity.status === 'success' ? '#00FF91' :
                                                           activity.status === 'warning' ? '#FFB800' : '#00D4FF'
                                        }}
                                    />
                                    <div className="flex-1">
                                        <div className="text-sm" style={{ color: '#FFFFFF' }}>
                                            {activity.action}
                                        </div>
                                        <div className="text-xs" style={{ color: '#8394A7' }}>
                                            {activity.user} • {activity.time}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Button
                            variant="ghost"
                            className="w-full mt-4"
                            style={{ color: '#00FF91' }}
                        >
                            View Full Audit Log →
                        </Button>
                    </Card>
                </div>

                {/* Role Management Preview */}
                <Card
                    className="mt-6 p-6"
                    style={{ 
                        backgroundColor: '#051323',
                        border: '1px solid rgba(0, 212, 255, 0.3)'
                    }}
                >
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2" style={{ color: '#FFFFFF' }}>
                        <Users className="h-5 w-5" style={{ color: '#00D4FF' }} />
                        Role Management
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                            { role: 'Super Admin', users: 1, permissions: 'Full Access', color: '#FF6B6B' },
                            { role: 'Admin', users: 4, permissions: 'Manage Content', color: '#00FF91' },
                            { role: 'Moderator', users: 8, permissions: 'Moderate Content', color: '#00D4FF' },
                        ].map((role) => (
                            <div
                                key={role.role}
                                className="p-4 rounded-lg"
                                style={{ 
                                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                    border: `1px solid ${role.color}30`
                                }}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium" style={{ color: '#FFFFFF' }}>{role.role}</span>
                                    <span 
                                        className="text-xs px-2 py-1 rounded"
                                        style={{ backgroundColor: `${role.color}20`, color: role.color }}
                                    >
                                        {role.users} users
                                    </span>
                                </div>
                                <div className="text-xs" style={{ color: '#8394A7' }}>{role.permissions}</div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
}
