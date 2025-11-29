/**
 * API Dependencies Tracker Component
 * 
 * Shows admins the status of all 3rd party API integrations:
 * - Configuration status
 * - Rate limits
 * - Health indicators
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
    Loader2
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
    const [expandedAPIs, setExpandedAPIs] = useState<Set<string>>(new Set());
    const [showRecommendations, setShowRecommendations] = useState(true);

    const fetchStatus = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch('/api/api-status', { credentials: 'include' });
            if (!response.ok) {
                throw new Error('Failed to fetch API status');
            }
            const result = await response.json();
            setData(result.data || result);
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
                    <button 
                        onClick={fetchStatus}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className="w-4 h-4 text-gray-400 hover:text-white" />
                    </button>
                </div>

                {/* Health Score */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(0, 255, 145, 0.1)' }}>
                        <div className="text-2xl font-bold text-white">{data.summary.healthScore}%</div>
                        <div className="text-xs text-gray-400">Health Score</div>
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
