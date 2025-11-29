import { useState, useEffect } from 'react';
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
    RefreshCw,
    XCircle,
    Loader2
} from 'lucide-react';
import AdminBreadcrumbs from '@/components/AdminBreadcrumbs';
import AdminQuickNav from '@/components/AdminQuickNav';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getHealthCheck, type HealthCheckResponse, type HealthCheck } from '@/api/healthService';

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

    const [healthData, setHealthData] = useState<HealthCheckResponse | null>(null);
    const [healthLoading, setHealthLoading] = useState(true);
    const [healthError, setHealthError] = useState<string | null>(null);

    useEffect(() => {
        loadHealthData();
    }, []);

    const loadHealthData = async () => {
        try {
            setHealthLoading(true);
            setHealthError(null);
            const data = await getHealthCheck();
            setHealthData(data);
        } catch (error) {
            console.error('Failed to load health data:', error);
            setHealthError(error instanceof Error ? error.message : 'Failed to load health data');
        } finally {
            setHealthLoading(false);
        }
    };

    // Get security-relevant alerts from health data
    const getSecurityAlerts = (): HealthCheck[] => {
        if (!healthData) return [];
        return healthData.checks.filter(check => 
            check.status === 'unhealthy' || 
            check.status === 'warning' ||
            check.name === 'Authentication Config'
        );
    };

    const securityAlerts = getSecurityAlerts();
    const criticalAlerts = securityAlerts.filter(a => a.critical && a.status === 'unhealthy');

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
                
                {/* Quick Navigation */}
                <AdminQuickNav className="mt-4 mb-6" />

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
                        onClick={loadHealthData}
                        className="rounded-lg"
                        style={{ backgroundColor: '#00FF91', color: '#051323' }}
                        disabled={healthLoading}
                    >
                        {healthLoading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Run Security Scan
                    </Button>
                </div>

                {/* Security Alerts Banner */}
                {criticalAlerts.length > 0 && (
                    <Card
                        className="p-4 mb-6"
                        style={{ 
                            backgroundColor: 'rgba(239, 68, 68, 0.2)',
                            border: '1px solid #ef4444'
                        }}
                    >
                        <div className="flex items-start gap-3">
                            <XCircle className="h-6 w-6 flex-shrink-0" style={{ color: '#ef4444' }} />
                            <div className="flex-1">
                                <h3 className="font-bold text-lg" style={{ color: '#ef4444' }}>
                                    Critical Security Alerts ({criticalAlerts.length})
                                </h3>
                                <div className="mt-2 space-y-2">
                                    {criticalAlerts.map((alert, index) => (
                                        <div key={index} className="text-sm" style={{ color: '#FFFFFF' }}>
                                            <strong>{alert.name}:</strong> {alert.message}
                                            {alert.details?.fix && (
                                                <span className="block text-xs mt-1" style={{ color: '#8394A7' }}>
                                                    Fix: {alert.details.fix}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </Card>
                )}

                {/* System Health Alerts */}
                <Card
                    className="p-6 mb-6"
                    style={{ 
                        backgroundColor: '#051323',
                        border: `1px solid ${securityAlerts.length > 0 && securityAlerts.some(a => a.status === 'unhealthy') ? '#ef4444' : '#00FF91'}30`
                    }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold flex items-center gap-2" style={{ color: '#FFFFFF' }}>
                            <AlertTriangle className="h-5 w-5" style={{ color: securityAlerts.some(a => a.status === 'unhealthy') ? '#ef4444' : '#00FF91' }} />
                            System Health Alerts
                        </h2>
                        <span className="text-xs px-2 py-1 rounded" style={{ 
                            backgroundColor: healthData?.status === 'healthy' ? 'rgba(0, 255, 145, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                            color: healthData?.status === 'healthy' ? '#00FF91' : '#ef4444'
                        }}>
                            {healthData?.status === 'healthy' ? 'All Systems Healthy' : 'Issues Detected'}
                        </span>
                    </div>
                    
                    {healthLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#8394A7' }} />
                        </div>
                    ) : healthError ? (
                        <div className="text-center py-4" style={{ color: '#ef4444' }}>
                            {healthError}
                        </div>
                    ) : securityAlerts.length === 0 ? (
                        <div className="flex items-center gap-2 py-4" style={{ color: '#00FF91' }}>
                            <CheckCircle className="h-5 w-5" />
                            <span>No security alerts at this time</span>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {securityAlerts.map((alert, index) => (
                                <div 
                                    key={index}
                                    className="flex items-start gap-3 p-3 rounded-lg"
                                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
                                >
                                    <div 
                                        className="p-1.5 rounded-full"
                                        style={{ 
                                            backgroundColor: alert.status === 'unhealthy' ? 'rgba(239, 68, 68, 0.2)' :
                                                           alert.status === 'warning' ? 'rgba(255, 184, 0, 0.2)' : 'rgba(0, 255, 145, 0.2)'
                                        }}
                                    >
                                        {alert.status === 'unhealthy' ? (
                                            <XCircle className="h-4 w-4" style={{ color: '#ef4444' }} />
                                        ) : alert.status === 'warning' ? (
                                            <AlertTriangle className="h-4 w-4" style={{ color: '#FFB800' }} />
                                        ) : (
                                            <CheckCircle className="h-4 w-4" style={{ color: '#00FF91' }} />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium" style={{ color: '#FFFFFF' }}>
                                                {alert.name}
                                            </span>
                                            {alert.critical && (
                                                <span className="text-xs px-1.5 py-0.5 rounded" style={{ 
                                                    backgroundColor: 'rgba(239, 68, 68, 0.2)', 
                                                    color: '#ef4444' 
                                                }}>
                                                    Critical
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-sm mt-1" style={{ color: '#8394A7' }}>
                                            {alert.message}
                                        </div>
                                        {alert.details?.error && (
                                            <div className="text-xs mt-1" style={{ color: '#ef4444' }}>
                                                {alert.details.error}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-xs" style={{ color: '#8394A7' }}>
                                        {alert.service}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

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
