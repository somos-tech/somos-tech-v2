/**
 * API Dependencies Tracker Component
 * 
 * Shows admins the status of all 3rd party API integrations:
 * - Configuration status
 * - Rate limits
 * - Health indicators
 * - Usage statistics for 3rd party APIs (VirusTotal, Auth0)
 * - Recommendations for missing APIs
 */

import { useState, useEffect } from 'react';
import { 
    Cloud, 
    CheckCircle2, 
    XCircle, 
    AlertTriangle, 
    ExternalLink, 
    RefreshCw,
    Shield,
    Zap,
    Mail,
    Database,
    Lock,
    Image,
    Bot,
    Link2,
    ChevronDown,
    ChevronUp,
    Info,
    Loader2,
    Activity,
    TrendingUp,
    HeartPulse
} from 'lucide-react';

interface APIStatus {
    name: string;
    description: string;
    configured: boolean;
    status: string;
    freeLimit: string;
    standardLimit?: string;
    premiumLimit?: string;
    documentation: string;
    criticalFor: string[];
    envVar?: string;
    envVars?: string[];
    [key: string]: any;
}

interface APISummary {
    total: number;
    configured: number;
    notConfigured: number;
    partial: number;
    criticalMissing: string[];
    healthScore: number;
}

interface Recommendation {
    priority: 'critical' | 'high' | 'medium' | 'low';
    api: string;
    message: string;
    action: string;
}

interface APIUsageStats {
    apiName: string;
    today: {
        totalCalls: number;
        successCalls: number;
        failedCalls: number;
        operations?: Record<string, number>;
    };
    last30Days: {
        totalCalls: number;
        successCalls: number;
        failedCalls: number;
        operations?: Record<string, number>;
    };
    lastCall?: string;
    error?: string;
}

interface APIUsageWarning {
    api: string;
    severity: 'critical' | 'warning';
    message: string;
    recommendation: string;
}

interface APIUsageResponse {
    timestamp: string;
    usage: Record<string, APIUsageStats>;
    limits: Record<string, {
        dailyLimit?: number;
        monthlyLimit?: number;
        minuteLimit?: number;
        tier: string;
        limitType?: string;
        resetTime: string;
    }>;
    warnings: APIUsageWarning[];
}

interface APIStatusResponse {
    timestamp: string;
    environment: string;
    summary: APISummary;
    apis: Record<string, APIStatus>;
    recommendations: Recommendation[];
}

const API_ICONS: Record<string, any> = {
    virustotal: Link2,
    contentSafety: Shield,
    azureOpenAI: Bot,
    auth0: Lock,
    azureCommunication: Mail,
    azureStorage: Image,
    cosmosDB: Database,
    microsoftGraph: Cloud
};

const STATUS_COLORS = {
    active: '#00FF91',
    partial: '#FFB800',
    not_configured: '#EF4444'
};

export default function APITracker() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<APIStatusResponse | null>(null);
    const [usageData, setUsageData] = useState<APIUsageResponse | null>(null);
    const [healthCheckLoading, setHealthCheckLoading] = useState(false);
    const [healthCheckResult, setHealthCheckResult] = useState<any>(null);
    const [expandedAPIs, setExpandedAPIs] = useState<Set<string>>(new Set());
    const [showRecommendations, setShowRecommendations] = useState(true);
    const [showUsageStats, setShowUsageStats] = useState(true);

    const fetchStatus = async () => {
        try {
            setLoading(true);
            setError(null);
            
            // Fetch both status and usage in parallel
            const [statusResponse, usageResponse] = await Promise.all([
                fetch('/api/api-status', { credentials: 'include' }),
                fetch('/api/api-usage-stats', { credentials: 'include' })
            ]);
            
            if (!statusResponse.ok) {
                throw new Error('Failed to fetch API status');
            }
            const statusResult = await statusResponse.json();
            setData(statusResult.data || statusResult);
            
            // Usage stats are optional - don't fail if not available
            if (usageResponse.ok) {
                const usageResult = await usageResponse.json();
                setUsageData(usageResult.data || usageResult);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load API status');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    const toggleExpanded = (apiKey: string) => {
        setExpandedAPIs(prev => {
            const next = new Set(prev);
            if (next.has(apiKey)) {
                next.delete(apiKey);
            } else {
                next.add(apiKey);
            }
            return next;
        });
    };

    const runHealthCheck = async () => {
        try {
            setHealthCheckLoading(true);
            const response = await fetch('/api/api-health-check', { 
                method: 'POST',
                credentials: 'include' 
            });
            if (response.ok) {
                const result = await response.json();
                setHealthCheckResult(result.data || result);
            }
        } catch (err) {
            console.error('Health check failed:', err);
        } finally {
            setHealthCheckLoading(false);
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'critical': return '#EF4444';
            case 'high': return '#F97316';
            case 'medium': return '#FFB800';
            case 'low': return '#00D4FF';
            default: return '#8394A7';
        }
    };

    if (loading) {
        return (
            <div 
                className="p-6 rounded-2xl border"
                style={{ backgroundColor: '#0A1628', borderColor: 'rgba(255, 255, 255, 0.1)' }}
            >
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#00FF91' }} />
                    <span className="ml-2 text-gray-400">Loading API status...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div 
                className="p-6 rounded-2xl border"
                style={{ backgroundColor: '#0A1628', borderColor: 'rgba(239, 68, 68, 0.3)' }}
            >
                <div className="flex items-center gap-3 text-red-400">
                    <XCircle className="w-5 h-5" />
                    <span>{error}</span>
                    <button 
                        onClick={fetchStatus}
                        className="ml-auto p-2 rounded-lg hover:bg-white/10"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="space-y-6">
            {/* Header with Summary */}
            <div 
                className="p-6 rounded-2xl border"
                style={{ backgroundColor: '#0A1628', borderColor: 'rgba(0, 255, 145, 0.2)' }}
            >
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div 
                            className="p-2 rounded-lg"
                            style={{ backgroundColor: 'rgba(0, 255, 145, 0.15)' }}
                        >
                            <Zap className="w-5 h-5" style={{ color: '#00FF91' }} />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white">API Dependencies</h3>
                            <p className="text-sm text-gray-400">3rd Party Integration Status</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={runHealthCheck}
                            disabled={healthCheckLoading}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
                            style={{ 
                                backgroundColor: 'rgba(0, 212, 255, 0.15)',
                                color: '#00D4FF'
                            }}
                            title="Run connectivity health check"
                        >
                            {healthCheckLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <HeartPulse className="w-4 h-4" />
                            )}
                            <span className="text-sm hidden sm:inline">Health Check</span>
                        </button>
                        <button 
                            onClick={fetchStatus}
                            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                            title="Refresh"
                        >
                            <RefreshCw className="w-4 h-4 text-gray-400 hover:text-white" />
                        </button>
                    </div>
                </div>

                {/* Health Check Result */}
                {healthCheckResult && (
                    <div 
                        className="mb-4 p-4 rounded-xl"
                        style={{ 
                            backgroundColor: healthCheckResult.overallHealth === 'healthy' 
                                ? 'rgba(0, 255, 145, 0.1)' 
                                : healthCheckResult.overallHealth === 'critical'
                                    ? 'rgba(239, 68, 68, 0.1)'
                                    : 'rgba(255, 184, 0, 0.1)'
                        }}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <HeartPulse 
                                    className="w-5 h-5" 
                                    style={{ 
                                        color: healthCheckResult.overallHealth === 'healthy' 
                                            ? '#00FF91' 
                                            : healthCheckResult.overallHealth === 'critical'
                                                ? '#EF4444'
                                                : '#FFB800'
                                    }}
                                />
                                <span className="font-medium text-white">
                                    Live Health: {healthCheckResult.overallHealth.toUpperCase()}
                                </span>
                                <span className="text-sm text-gray-400">
                                    ({healthCheckResult.healthScore}% APIs responding)
                                </span>
                            </div>
                            <span className="text-xs text-gray-500">
                                {new Date(healthCheckResult.timestamp).toLocaleTimeString()}
                            </span>
                        </div>
                        {healthCheckResult.criticalIssues > 0 && (
                            <div className="mt-2 text-sm text-red-400">
                                ⚠️ {healthCheckResult.criticalIssues} critical API(s) not responding
                            </div>
                        )}
                    </div>
                )}

                {/* Health Score */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(0, 255, 145, 0.1)' }}>
                        <div className="text-2xl font-bold text-white">{data.summary.healthScore}%</div>
                        <div className="text-xs text-gray-400">Config Score</div>
                    </div>
                    <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(0, 255, 145, 0.1)' }}>
                        <div className="text-2xl font-bold" style={{ color: '#00FF91' }}>{data.summary.configured}</div>
                        <div className="text-xs text-gray-400">Active APIs</div>
                    </div>
                    <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                        <div className="text-2xl font-bold text-red-400">{data.summary.notConfigured}</div>
                        <div className="text-xs text-gray-400">Not Configured</div>
                    </div>
                    <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(255, 184, 0, 0.1)' }}>
                        <div className="text-2xl font-bold" style={{ color: '#FFB800' }}>{data.summary.partial}</div>
                        <div className="text-xs text-gray-400">Partial Setup</div>
                    </div>
                </div>

                {/* Critical Missing Warning */}
                {data.summary.criticalMissing.length > 0 && (
                    <div 
                        className="p-3 rounded-lg flex items-start gap-2"
                        style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)' }}
                    >
                        <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <div className="text-sm font-medium text-red-400">Critical APIs Missing</div>
                            <div className="text-xs text-gray-400 mt-1">
                                {data.summary.criticalMissing.join(', ')}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Recommendations */}
            {data.recommendations.length > 0 && (
                <div 
                    className="p-6 rounded-2xl border"
                    style={{ backgroundColor: '#0A1628', borderColor: 'rgba(255, 255, 255, 0.1)' }}
                >
                    <button 
                        onClick={() => setShowRecommendations(!showRecommendations)}
                        className="w-full flex items-center justify-between mb-4"
                    >
                        <div className="flex items-center gap-2">
                            <Info className="w-5 h-5" style={{ color: '#00D4FF' }} />
                            <span className="font-semibold text-white">
                                Recommendations ({data.recommendations.length})
                            </span>
                        </div>
                        {showRecommendations ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                    </button>

                    {showRecommendations && (
                        <div className="space-y-3">
                            {data.recommendations.map((rec, idx) => (
                                <div 
                                    key={idx}
                                    className="p-3 rounded-lg border-l-4"
                                    style={{ 
                                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                        borderLeftColor: getPriorityColor(rec.priority)
                                    }}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span 
                                                    className="text-xs px-2 py-0.5 rounded uppercase font-medium"
                                                    style={{ 
                                                        backgroundColor: `${getPriorityColor(rec.priority)}20`,
                                                        color: getPriorityColor(rec.priority)
                                                    }}
                                                >
                                                    {rec.priority}
                                                </span>
                                                <span className="font-medium text-white">{rec.api}</span>
                                            </div>
                                            <p className="text-sm text-gray-400 mt-1">{rec.message}</p>
                                            <p className="text-xs text-gray-500 mt-1 font-mono">{rec.action}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* 3rd Party API Usage Stats (VirusTotal & Auth0) */}
            {usageData && (
                <div 
                    className="p-6 rounded-2xl border"
                    style={{ backgroundColor: '#0A1628', borderColor: 'rgba(0, 212, 255, 0.2)' }}
                >
                    <button 
                        onClick={() => setShowUsageStats(!showUsageStats)}
                        className="w-full flex items-center justify-between mb-4"
                    >
                        <div className="flex items-center gap-2">
                            <Activity className="w-5 h-5" style={{ color: '#00D4FF' }} />
                            <span className="font-semibold text-white">
                                3rd Party API Usage (Non-Microsoft)
                            </span>
                        </div>
                        {showUsageStats ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                    </button>

                    {showUsageStats && (
                        <div className="space-y-4">
                            {/* Usage Warnings */}
                            {usageData.warnings && usageData.warnings.length > 0 && (
                                <div className="space-y-2">
                                    {usageData.warnings.map((warning, idx) => (
                                        <div 
                                            key={idx}
                                            className="p-3 rounded-lg flex items-start gap-2"
                                            style={{ 
                                                backgroundColor: warning.severity === 'critical' 
                                                    ? 'rgba(239, 68, 68, 0.15)' 
                                                    : 'rgba(255, 184, 0, 0.15)' 
                                            }}
                                        >
                                            <AlertTriangle 
                                                className="w-5 h-5 flex-shrink-0 mt-0.5" 
                                                style={{ 
                                                    color: warning.severity === 'critical' ? '#EF4444' : '#FFB800' 
                                                }}
                                            />
                                            <div>
                                                <div className="text-sm font-medium" style={{ 
                                                    color: warning.severity === 'critical' ? '#EF4444' : '#FFB800' 
                                                }}>
                                                    {warning.api}: {warning.message}
                                                </div>
                                                <div className="text-xs text-gray-400 mt-1">
                                                    {warning.recommendation}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* VirusTotal Usage */}
                            {usageData.usage?.virustotal && (
                                <div 
                                    className="p-4 rounded-xl"
                                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <div 
                                            className="p-2 rounded-lg"
                                            style={{ backgroundColor: 'rgba(0, 255, 145, 0.15)' }}
                                        >
                                            <Link2 className="w-5 h-5" style={{ color: '#00FF91' }} />
                                        </div>
                                        <div>
                                            <div className="font-medium text-white">VirusTotal</div>
                                            <div className="text-xs text-gray-400">Link Safety Scanning</div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(0, 255, 145, 0.1)' }}>
                                            <div className="text-xl font-bold text-white">
                                                {usageData.usage.virustotal.today?.totalCalls || 0}
                                            </div>
                                            <div className="text-xs text-gray-400">Today</div>
                                            <div className="text-xs" style={{ color: '#00FF91' }}>
                                                / {usageData.limits?.virustotal?.dailyLimit || 500} limit
                                            </div>
                                        </div>
                                        <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(0, 212, 255, 0.1)' }}>
                                            <div className="text-xl font-bold text-white">
                                                {usageData.usage.virustotal.last30Days?.totalCalls || 0}
                                            </div>
                                            <div className="text-xs text-gray-400">Last 30 Days</div>
                                        </div>
                                        <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(0, 255, 145, 0.1)' }}>
                                            <div className="text-xl font-bold" style={{ color: '#00FF91' }}>
                                                {usageData.usage.virustotal.today?.successCalls || 0}
                                            </div>
                                            <div className="text-xs text-gray-400">Successful</div>
                                        </div>
                                        <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                                            <div className="text-xl font-bold text-red-400">
                                                {usageData.usage.virustotal.today?.failedCalls || 0}
                                            </div>
                                            <div className="text-xs text-gray-400">Failed</div>
                                        </div>
                                    </div>
                                    {usageData.usage.virustotal.lastCall && (
                                        <div className="mt-2 text-xs text-gray-500">
                                            Last call: {new Date(usageData.usage.virustotal.lastCall).toLocaleString()}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Auth0 Usage */}
                            {usageData.usage?.auth0 && (
                                <div 
                                    className="p-4 rounded-xl"
                                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <div 
                                            className="p-2 rounded-lg"
                                            style={{ backgroundColor: 'rgba(255, 184, 0, 0.15)' }}
                                        >
                                            <Lock className="w-5 h-5" style={{ color: '#FFB800' }} />
                                        </div>
                                        <div>
                                            <div className="font-medium text-white">Auth0</div>
                                            <div className="text-xs text-gray-400">User Management API</div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(255, 184, 0, 0.1)' }}>
                                            <div className="text-xl font-bold text-white">
                                                {usageData.usage.auth0.today?.totalCalls || 0}
                                            </div>
                                            <div className="text-xs text-gray-400">Today</div>
                                        </div>
                                        <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(0, 212, 255, 0.1)' }}>
                                            <div className="text-xl font-bold text-white">
                                                {usageData.usage.auth0.last30Days?.totalCalls || 0}
                                            </div>
                                            <div className="text-xs text-gray-400">Last 30 Days</div>
                                            <div className="text-xs" style={{ color: '#FFB800' }}>
                                                / {usageData.limits?.auth0?.monthlyLimit || 1000} M2M limit
                                            </div>
                                        </div>
                                        <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(0, 255, 145, 0.1)' }}>
                                            <div className="text-xl font-bold" style={{ color: '#00FF91' }}>
                                                {usageData.usage.auth0.today?.successCalls || 0}
                                            </div>
                                            <div className="text-xs text-gray-400">Successful</div>
                                        </div>
                                        <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                                            <div className="text-xl font-bold text-red-400">
                                                {usageData.usage.auth0.today?.failedCalls || 0}
                                            </div>
                                            <div className="text-xs text-gray-400">Failed</div>
                                        </div>
                                    </div>
                                    {usageData.usage.auth0.lastCall && (
                                        <div className="mt-2 text-xs text-gray-500">
                                            Last call: {new Date(usageData.usage.auth0.lastCall).toLocaleString()}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* No usage data yet */}
                            {(!usageData.usage?.virustotal?.today?.totalCalls && !usageData.usage?.auth0?.today?.totalCalls) && (
                                <div className="text-center py-4 text-gray-400 text-sm">
                                    <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    No API calls tracked yet. Usage statistics will appear as APIs are used.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* API List */}
            <div 
                className="p-6 rounded-2xl border"
                style={{ backgroundColor: '#0A1628', borderColor: 'rgba(255, 255, 255, 0.1)' }}
            >
                <h3 className="font-semibold text-white mb-4">All Integrations</h3>
                <div className="space-y-3">
                    {Object.entries(data.apis).map(([key, api]) => {
                        const Icon = API_ICONS[key] || Cloud;
                        const isExpanded = expandedAPIs.has(key);
                        const statusColor = STATUS_COLORS[api.status as keyof typeof STATUS_COLORS] || '#8394A7';

                        return (
                            <div 
                                key={key}
                                className="rounded-xl border overflow-hidden"
                                style={{ 
                                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                    borderColor: 'rgba(255, 255, 255, 0.05)'
                                }}
                            >
                                <button
                                    onClick={() => toggleExpanded(key)}
                                    className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div 
                                            className="p-2 rounded-lg"
                                            style={{ backgroundColor: `${statusColor}15` }}
                                        >
                                            <Icon className="w-5 h-5" style={{ color: statusColor }} />
                                        </div>
                                        <div className="text-left">
                                            <div className="font-medium text-white">{api.name}</div>
                                            <div className="text-xs text-gray-400">{api.description}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {api.configured ? (
                                            <CheckCircle2 className="w-5 h-5" style={{ color: '#00FF91' }} />
                                        ) : api.status === 'partial' ? (
                                            <AlertTriangle className="w-5 h-5" style={{ color: '#FFB800' }} />
                                        ) : (
                                            <XCircle className="w-5 h-5 text-red-400" />
                                        )}
                                        {isExpanded ? (
                                            <ChevronUp className="w-4 h-4 text-gray-400" />
                                        ) : (
                                            <ChevronDown className="w-4 h-4 text-gray-400" />
                                        )}
                                    </div>
                                </button>

                                {isExpanded && (
                                    <div 
                                        className="px-4 pb-4 space-y-3"
                                        style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}
                                    >
                                        <div className="pt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div>
                                                <div className="text-xs text-gray-500 uppercase mb-1">Free Tier Limit</div>
                                                <div className="text-sm text-gray-300">{api.freeLimit}</div>
                                            </div>
                                            {(api.standardLimit || api.premiumLimit) && (
                                                <div>
                                                    <div className="text-xs text-gray-500 uppercase mb-1">Paid Tier</div>
                                                    <div className="text-sm text-gray-300">
                                                        {api.standardLimit || api.premiumLimit}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <div className="text-xs text-gray-500 uppercase mb-1">Used For</div>
                                            <div className="flex flex-wrap gap-2">
                                                {api.criticalFor.map((use, idx) => (
                                                    <span 
                                                        key={idx}
                                                        className="text-xs px-2 py-1 rounded"
                                                        style={{ backgroundColor: 'rgba(0, 212, 255, 0.1)', color: '#00D4FF' }}
                                                    >
                                                        {use}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-2">
                                            <div>
                                                <div className="text-xs text-gray-500 uppercase mb-1">Environment Variables</div>
                                                <div className="text-xs font-mono text-gray-400">
                                                    {api.envVars?.join(', ') || api.envVar || 'N/A'}
                                                </div>
                                            </div>
                                            <a
                                                href={api.documentation}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1 text-sm hover:text-white transition-colors"
                                                style={{ color: '#00FF91' }}
                                            >
                                                Docs <ExternalLink className="w-3 h-3" />
                                            </a>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Footer */}
            <div className="text-center text-xs text-gray-500">
                Last updated: {new Date(data.timestamp).toLocaleString()} • 
                Environment: {data.environment}
            </div>
        </div>
    );
}
