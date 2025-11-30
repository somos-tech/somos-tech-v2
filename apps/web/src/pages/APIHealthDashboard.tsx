import { useEffect, useState } from 'react';
import { 
    Activity, 
    AlertCircle, 
    CheckCircle, 
    AlertTriangle, 
    RefreshCw, 
    Clock, 
    Server, 
    Database, 
    Settings, 
    Zap,
    XCircle,
    Loader2,
    Wifi,
    WifiOff,
    PlugZap
} from 'lucide-react';
import AdminBreadcrumbs from '@/components/AdminBreadcrumbs';
import AdminQuickNav from '@/components/AdminQuickNav';
import APITracker from '@/components/APITracker';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
    getHealthCheck, 
    type HealthCheckResponse, 
    type HealthCheck,
    formatLastChecked
} from '../api/healthService';

/**
 * API Health Dashboard Page
 * Comprehensive view of all API health checks with status, timestamps, and error details
 */
export default function APIHealthDashboard() {
    const [healthData, setHealthData] = useState<HealthCheckResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

    useEffect(() => {
        fetchHealth();
        
        if (autoRefresh) {
            const interval = setInterval(fetchHealth, 30000); // Refresh every 30 seconds
            return () => clearInterval(interval);
        }
    }, [autoRefresh]);

    const fetchHealth = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getHealthCheck();
            setHealthData(data);
            setLastRefresh(new Date());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch health data');
            console.error('Failed to fetch health check:', err);
        } finally {
            setLoading(false);
        }
    };

    const getServiceIcon = (service: string) => {
        switch (service) {
            case 'database':
                return Database;
            case 'api':
                return Zap;
            case 'configuration':
                return Settings;
            case 'external':
                return Server;
            default:
                return Activity;
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'healthy':
                return CheckCircle;
            case 'warning':
                return AlertTriangle;
            case 'unhealthy':
                return XCircle;
            default:
                return Activity;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'healthy':
                return '#00FF91';
            case 'warning':
                return '#FFB800';
            case 'unhealthy':
                return '#ef4444';
            default:
                return '#8394A7';
        }
    };

    // Stats for the header cards
    const stats = healthData ? [
        { label: 'Total Checks', value: healthData.summary.total, icon: Activity, color: '#00D4FF' },
        { label: 'Healthy', value: healthData.summary.healthy, icon: CheckCircle, color: '#00FF91' },
        { label: 'Warnings', value: healthData.summary.warning, icon: AlertTriangle, color: '#FFB800' },
        { label: 'Unhealthy', value: healthData.summary.unhealthy, icon: XCircle, color: '#ef4444' },
    ] : [];

    // Group checks by service type
    const serviceGroups = healthData ? ['database', 'configuration', 'api'].map(serviceType => ({
        type: serviceType,
        label: serviceType.charAt(0).toUpperCase() + serviceType.slice(1) + ' Services',
        icon: getServiceIcon(serviceType),
        checks: healthData.checks.filter(c => c.service === serviceType)
    })).filter(g => g.checks.length > 0) : [];

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
                            API Health Dashboard
                        </h1>
                        <p style={{ color: '#8394A7' }}>
                            Monitor the health and status of all API endpoints and services
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Auto-refresh toggle */}
                        <label 
                            className="flex items-center gap-2 text-sm cursor-pointer"
                            style={{ color: '#8394A7' }}
                        >
                            <button
                                onClick={() => setAutoRefresh(!autoRefresh)}
                                className={`relative w-10 h-5 rounded-full transition-colors ${
                                    autoRefresh ? 'bg-green-500' : 'bg-gray-600'
                                }`}
                            >
                                <div 
                                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                                        autoRefresh ? 'left-5' : 'left-0.5'
                                    }`}
                                />
                            </button>
                            <span className="flex items-center gap-1">
                                {autoRefresh ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                                Auto-refresh
                            </span>
                        </label>
                        
                        <Button
                            onClick={fetchHealth}
                            disabled={loading}
                            className="rounded-lg"
                            style={{ backgroundColor: '#00FF91', color: '#051323' }}
                        >
                            {loading ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <RefreshCw className="h-4 w-4 mr-2" />
                            )}
                            Refresh
                        </Button>
                    </div>
                </div>

                {/* Last Updated */}
                <div className="flex items-center gap-2 mb-6 text-sm" style={{ color: '#8394A7' }}>
                    <Clock className="h-4 w-4" />
                    <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
                    {healthData && (
                        <span className="ml-2">• Response time: {healthData.responseTime}</span>
                    )}
                </div>

                {/* Error Alert */}
                {error && (
                    <Card
                        className="p-4 mb-6"
                        style={{ 
                            backgroundColor: 'rgba(239, 68, 68, 0.2)',
                            border: '1px solid #ef4444'
                        }}
                    >
                        <div className="flex items-center gap-3">
                            <AlertCircle className="h-5 w-5" style={{ color: '#ef4444' }} />
                            <span style={{ color: '#FFFFFF' }}>{error}</span>
                        </div>
                    </Card>
                )}

                {/* Loading State */}
                {loading && !healthData && (
                    <div className="flex items-center justify-center py-20">
                        <div className="text-center">
                            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" style={{ color: '#00FF91' }} />
                            <p style={{ color: '#8394A7' }}>Loading health data...</p>
                        </div>
                    </div>
                )}

                {healthData && (
                    <>
                        {/* Overall Status Banner */}
                        <Card
                            className="p-6 mb-6"
                            style={{ 
                                backgroundColor: healthData.status === 'healthy' 
                                    ? 'rgba(0, 255, 145, 0.1)' 
                                    : 'rgba(239, 68, 68, 0.1)',
                                border: `2px solid ${healthData.status === 'healthy' ? '#00FF91' : '#ef4444'}`
                            }}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    {healthData.status === 'healthy' ? (
                                        <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(0, 255, 145, 0.2)' }}>
                                            <CheckCircle className="h-10 w-10" style={{ color: '#00FF91' }} />
                                        </div>
                                    ) : (
                                        <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)' }}>
                                            <XCircle className="h-10 w-10" style={{ color: '#ef4444' }} />
                                        </div>
                                    )}
                                    <div>
                                        <h2 
                                            className="text-2xl font-bold"
                                            style={{ color: healthData.status === 'healthy' ? '#00FF91' : '#ef4444' }}
                                        >
                                            System Status: {healthData.status === 'healthy' ? 'Healthy' : 'Unhealthy'}
                                        </h2>
                                        <p style={{ color: '#8394A7' }}>
                                            {healthData.status === 'healthy' 
                                                ? 'All systems are operational' 
                                                : 'Some systems are experiencing issues'}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm" style={{ color: '#8394A7' }}>Timestamp</div>
                                    <div className="text-lg font-mono" style={{ color: '#FFFFFF' }}>
                                        {new Date(healthData.timestamp).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            {stats.map((stat) => {
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
                                                <div className="text-3xl font-bold" style={{ color: '#FFFFFF' }}>
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

                        {/* 3rd Party API Integrations - Primary Card */}
                        <Card 
                            className="mb-8 p-6"
                            style={{ 
                                backgroundColor: '#051323',
                                border: '2px solid rgba(0, 212, 255, 0.3)'
                            }}
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <div 
                                    className="p-3 rounded-xl"
                                    style={{ backgroundColor: 'rgba(0, 212, 255, 0.15)' }}
                                >
                                    <PlugZap className="h-6 w-6" style={{ color: '#00D4FF' }} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold" style={{ color: '#FFFFFF' }}>
                                        3rd Party API Integrations
                                    </h2>
                                    <p className="text-sm" style={{ color: '#8394A7' }}>
                                        External API dependencies, usage statistics, and configuration status
                                    </p>
                                </div>
                            </div>
                            <APITracker />
                        </Card>

                        {/* Service Groups */}
                        <div className="space-y-6">
                            {serviceGroups.map((group) => {
                                const GroupIcon = group.icon;
                                const hasIssues = group.checks.some(c => c.status !== 'healthy');
                                
                                return (
                                    <Card
                                        key={group.type}
                                        className="overflow-hidden"
                                        style={{ 
                                            backgroundColor: '#051323',
                                            border: `1px solid ${hasIssues ? '#FFB80030' : '#00FF9130'}`
                                        }}
                                    >
                                        {/* Group Header */}
                                        <div 
                                            className="px-6 py-4 border-b flex items-center gap-3"
                                            style={{ 
                                                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                                borderColor: 'rgba(255, 255, 255, 0.1)'
                                            }}
                                        >
                                            <GroupIcon className="h-5 w-5" style={{ color: '#00D4FF' }} />
                                            <h3 className="text-lg font-semibold" style={{ color: '#FFFFFF' }}>
                                                {group.label}
                                            </h3>
                                            <span 
                                                className="text-xs px-2 py-0.5 rounded-full ml-auto"
                                                style={{ 
                                                    backgroundColor: hasIssues ? 'rgba(255, 184, 0, 0.2)' : 'rgba(0, 255, 145, 0.2)',
                                                    color: hasIssues ? '#FFB800' : '#00FF91'
                                                }}
                                            >
                                                {group.checks.filter(c => c.status === 'healthy').length}/{group.checks.length} healthy
                                            </span>
                                        </div>

                                        {/* Checks */}
                                        <div className="divide-y" style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}>
                                            {group.checks.map((check, index) => {
                                                const StatusIcon = getStatusIcon(check.status);
                                                const statusColor = getStatusColor(check.status);
                                                
                                                return (
                                                    <HealthCheckRow 
                                                        key={index}
                                                        check={check}
                                                        StatusIcon={StatusIcon}
                                                        statusColor={statusColor}
                                                    />
                                                );
                                            })}
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

/**
 * Individual Health Check Row Component
 */
function HealthCheckRow({ 
    check, 
    StatusIcon,
    statusColor
}: { 
    check: HealthCheck; 
    StatusIcon: React.ElementType;
    statusColor: string;
}) {
    const [expanded, setExpanded] = useState(false);
    const hasDetails = check.details && Object.keys(check.details).length > 0;

    return (
        <div 
            className="p-4 hover:bg-opacity-50 transition-colors"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.01)' }}
        >
            <div className="flex items-start gap-4">
                {/* Status Icon */}
                <div 
                    className="p-2 rounded-lg flex-shrink-0"
                    style={{ backgroundColor: `${statusColor}20` }}
                >
                    <StatusIcon className="h-5 w-5" style={{ color: statusColor }} />
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <h4 className="font-semibold" style={{ color: '#FFFFFF' }}>
                            {check.name}
                        </h4>
                        <span 
                            className="text-xs px-2 py-0.5 rounded font-medium"
                            style={{ 
                                backgroundColor: `${statusColor}20`,
                                color: statusColor
                            }}
                        >
                            {check.status.toUpperCase()}
                        </span>
                        {check.critical && (
                            <span 
                                className="text-xs px-2 py-0.5 rounded font-medium"
                                style={{ 
                                    backgroundColor: 'rgba(147, 51, 234, 0.2)',
                                    color: '#a855f7'
                                }}
                            >
                                CRITICAL
                            </span>
                        )}
                    </div>
                    
                    <p className="text-sm mb-2" style={{ color: '#8394A7' }}>
                        {check.message}
                    </p>
                    
                    {/* Metadata */}
                    <div className="flex items-center gap-4 text-xs flex-wrap" style={{ color: '#6B7280' }}>
                        {check.path && (
                            <span 
                                className="font-mono px-2 py-1 rounded"
                                style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                            >
                                {check.method} {check.path}
                            </span>
                        )}
                        <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatLastChecked(check.lastChecked)}
                        </span>
                        {check.details?.responseTime && (
                            <span className="flex items-center gap-1">
                                <Zap className="h-3 w-3" />
                                {check.details.responseTime}
                            </span>
                        )}
                    </div>
                    
                    {/* Expandable Details */}
                    {hasDetails && (
                        <div className="mt-3">
                            <button
                                onClick={() => setExpanded(!expanded)}
                                className="text-xs font-medium transition-colors"
                                style={{ color: '#00D4FF' }}
                            >
                                {expanded ? '▼ Hide Details' : '▶ Show Details'}
                            </button>
                            
                            {expanded && (
                                <div 
                                    className="mt-2 p-3 rounded-lg text-xs overflow-x-auto"
                                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
                                >
                                    <pre style={{ color: '#8394A7' }}>
                                        {JSON.stringify(check.details, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
