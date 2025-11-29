import { useState, useEffect } from 'react';
import { 
    Shield, 
    AlertTriangle, 
    AlertCircle,
    CheckCircle,
    XCircle,
    RefreshCw,
    Users,
    Clock,
    FileWarning,
    UserX,
    Activity,
    ChevronDown,
    ChevronUp,
    ExternalLink
} from 'lucide-react';
import AdminBreadcrumbs from '@/components/AdminBreadcrumbs';
import { 
    getSecurityReport, 
    quickSecurityCheck,
    getSeverityColor,
    getSeverityBg,
    type SecurityReport,
    type SecurityAnomaly,
    type AdminRecord
} from '@/api/securityService';

export default function SecurityDashboard() {
    const [report, setReport] = useState<SecurityReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedAnomaly, setExpandedAnomaly] = useState<string | null>(null);
    const [showAllAdmins, setShowAllAdmins] = useState(false);

    useEffect(() => {
        loadSecurityReport();
        
        // Refresh every 5 minutes
        const interval = setInterval(loadSecurityReport, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const loadSecurityReport = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getSecurityReport();
            setReport(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load security report');
        } finally {
            setLoading(false);
        }
    };

    const getSeverityIcon = (severity: SecurityAnomaly['severity']) => {
        switch (severity) {
            case 'critical': return XCircle;
            case 'high': return AlertCircle;
            case 'medium': return AlertTriangle;
            case 'low': return FileWarning;
            default: return AlertTriangle;
        }
    };

    const getStatusBadge = (hasIssues: boolean, severity?: 'high' | 'critical') => {
        if (!hasIssues) {
            return (
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Secure</span>
                </div>
            );
        }
        
        if (severity === 'critical') {
            return (
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-400">
                    <XCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Critical Issues</span>
                </div>
            );
        }
        
        return (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-400">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">Issues Detected</span>
            </div>
        );
    };

    if (loading && !report) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0a1f35' }}>
                <div className="flex items-center gap-3 text-gray-400">
                    <RefreshCw className="w-6 h-6 animate-spin" />
                    <span>Loading security report...</span>
                </div>
            </div>
        );
    }

    if (error && !report) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0a1f35' }}>
                <div className="text-center">
                    <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                    <h2 className="text-xl text-white mb-2">Failed to Load Security Report</h2>
                    <p className="text-gray-400 mb-4">{error}</p>
                    <button
                        onClick={loadSecurityReport}
                        className="px-4 py-2 rounded-lg bg-[#00FF91] text-[#051323] font-medium"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    const hasCritical = report?.anomalies.items.some(a => a.severity === 'critical');
    const hasHighSeverity = report?.anomalies.hasHighSeverity;

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#0a1f35' }}>
            <div className="max-w-7xl mx-auto px-4 py-6">
                <AdminBreadcrumbs />

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-[#00FF91]/20">
                            <Shield className="w-8 h-8 text-[#00FF91]" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white">Security Dashboard</h1>
                            <p className="text-gray-400">Admin access monitoring and anomaly detection</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {report && getStatusBadge(report.anomalies.count > 0, hasCritical ? 'critical' : hasHighSeverity ? 'high' : undefined)}
                        <button
                            onClick={loadSecurityReport}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#051323] text-gray-300 hover:text-white transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Security Alerts */}
                {report && report.anomalies.count > 0 && (
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-yellow-400" />
                            Security Alerts ({report.anomalies.count})
                        </h2>
                        <div className="space-y-3">
                            {report.anomalies.items.map((anomaly, index) => {
                                const Icon = getSeverityIcon(anomaly.severity);
                                const isExpanded = expandedAnomaly === `${anomaly.type}-${index}`;
                                
                                return (
                                    <div
                                        key={`${anomaly.type}-${index}`}
                                        className="rounded-xl overflow-hidden"
                                        style={{ 
                                            backgroundColor: getSeverityBg(anomaly.severity),
                                            border: `1px solid ${getSeverityColor(anomaly.severity)}40`
                                        }}
                                    >
                                        <div 
                                            className="p-4 cursor-pointer"
                                            onClick={() => setExpandedAnomaly(isExpanded ? null : `${anomaly.type}-${index}`)}
                                        >
                                            <div className="flex items-start gap-3">
                                                <Icon 
                                                    className="w-5 h-5 flex-shrink-0 mt-0.5" 
                                                    style={{ color: getSeverityColor(anomaly.severity) }}
                                                />
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between">
                                                        <h3 
                                                            className="font-medium"
                                                            style={{ color: getSeverityColor(anomaly.severity) }}
                                                        >
                                                            {anomaly.title}
                                                        </h3>
                                                        <div className="flex items-center gap-2">
                                                            <span 
                                                                className="text-xs px-2 py-1 rounded-full uppercase font-medium"
                                                                style={{ 
                                                                    backgroundColor: `${getSeverityColor(anomaly.severity)}20`,
                                                                    color: getSeverityColor(anomaly.severity)
                                                                }}
                                                            >
                                                                {anomaly.severity}
                                                            </span>
                                                            {isExpanded ? (
                                                                <ChevronUp className="w-4 h-4 text-gray-400" />
                                                            ) : (
                                                                <ChevronDown className="w-4 h-4 text-gray-400" />
                                                            )}
                                                        </div>
                                                    </div>
                                                    <p className="text-gray-400 text-sm mt-1">{anomaly.message}</p>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {isExpanded && (
                                            <div className="px-4 pb-4 border-t border-gray-700/50">
                                                <div className="pt-4">
                                                    <h4 className="text-sm font-medium text-gray-300 mb-2">Recommendation:</h4>
                                                    <p className="text-sm text-gray-400">{anomaly.recommendation}</p>
                                                    
                                                    {anomaly.details && anomaly.details.length > 0 && (
                                                        <div className="mt-4">
                                                            <h4 className="text-sm font-medium text-gray-300 mb-2">Affected Accounts:</h4>
                                                            <div className="bg-[#051323] rounded-lg p-3 overflow-x-auto">
                                                                <pre className="text-xs text-gray-400">
                                                                    {JSON.stringify(anomaly.details, null, 2)}
                                                                </pre>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* No Issues Banner */}
                {report && report.anomalies.count === 0 && (
                    <div className="mb-8 p-6 rounded-xl bg-green-500/10 border border-green-500/30">
                        <div className="flex items-center gap-4">
                            <CheckCircle className="w-8 h-8 text-green-400" />
                            <div>
                                <h3 className="text-lg font-medium text-green-400">No Security Issues Detected</h3>
                                <p className="text-gray-400">All admin access controls are functioning normally.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Stats Grid */}
                {report && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <StatCard
                            icon={Users}
                            label="Total Admins"
                            value={report.summary.totalAdmins}
                            color="#00FF91"
                        />
                        <StatCard
                            icon={Clock}
                            label="Added Last 24h"
                            value={report.summary.addedLast24Hours}
                            color={report.summary.addedLast24Hours > 0 ? '#eab308' : '#00FF91'}
                            alert={report.summary.addedLast24Hours > 0}
                        />
                        <StatCard
                            icon={Activity}
                            label="With Audit Trail"
                            value={`${report.summary.withAuditTrail}/${report.summary.totalAdmins}`}
                            color={report.summary.withoutAuditTrail > 0 ? '#f97316' : '#00FF91'}
                            alert={report.summary.withoutAuditTrail > 0}
                        />
                        <StatCard
                            icon={UserX}
                            label="Non-SOMOS Domain"
                            value={report.summary.otherDomains}
                            color={report.summary.otherDomains > 0 ? '#ef4444' : '#00FF91'}
                            alert={report.summary.otherDomains > 0}
                        />
                    </div>
                )}

                {/* Admin Users Table */}
                {report && (
                    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#051323', border: '1px solid rgba(0, 255, 145, 0.2)' }}>
                        <div className="p-4 border-b border-gray-700/50 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Users className="w-5 h-5 text-[#00FF91]" />
                                Registered Admin Users
                            </h2>
                            <button
                                onClick={() => setShowAllAdmins(!showAllAdmins)}
                                className="text-sm text-[#00FF91] hover:underline"
                            >
                                {showAllAdmins ? 'Show Less' : 'Show All'}
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-700/50">
                                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Email</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Status</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Created</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Created By</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Audit</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(showAllAdmins ? report.summary.admins : report.summary.admins.slice(0, 5)).map((admin, index) => {
                                        const hasAuditTrail = admin.createdBy && admin.createdBy !== 'unknown (possible bypass)';
                                        const isNonSomos = !admin.email.endsWith('@somos.tech');
                                        
                                        return (
                                            <tr 
                                                key={admin.email} 
                                                className={`border-b border-gray-700/30 ${
                                                    !hasAuditTrail || isNonSomos ? 'bg-red-500/5' : ''
                                                }`}
                                            >
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-white">{admin.email}</span>
                                                        {isNonSomos && (
                                                            <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">
                                                                Non-SOMOS
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                                        admin.status === 'active' 
                                                            ? 'bg-green-500/20 text-green-400'
                                                            : 'bg-gray-500/20 text-gray-400'
                                                    }`}>
                                                        {admin.status}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-gray-400 text-sm">
                                                    {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : 'Unknown'}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className={`text-sm ${hasAuditTrail ? 'text-gray-400' : 'text-orange-400'}`}>
                                                        {admin.createdBy}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    {hasAuditTrail ? (
                                                        <CheckCircle className="w-4 h-4 text-green-400" />
                                                    ) : (
                                                        <AlertTriangle className="w-4 h-4 text-orange-400" />
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {!showAllAdmins && report.summary.admins.length > 5 && (
                            <div className="p-3 text-center text-gray-400 text-sm border-t border-gray-700/50">
                                +{report.summary.admins.length - 5} more admin(s)
                            </div>
                        )}
                    </div>
                )}

                {/* Last Updated */}
                {report && (
                    <p className="text-center text-gray-500 text-sm mt-6">
                        Report generated: {new Date(report.generatedAt).toLocaleString()}
                    </p>
                )}
            </div>
        </div>
    );
}

interface StatCardProps {
    icon: React.ElementType;
    label: string;
    value: string | number;
    color: string;
    alert?: boolean;
}

function StatCard({ icon: Icon, label, value, color, alert }: StatCardProps) {
    return (
        <div 
            className="p-4 rounded-xl"
            style={{ 
                backgroundColor: '#051323',
                border: `1px solid ${color}30`
            }}
        >
            <div className="flex items-center gap-3">
                <div 
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: `${color}20` }}
                >
                    <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <div>
                    <div className="text-xs text-gray-400">{label}</div>
                    <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-white">{value}</span>
                        {alert && (
                            <AlertTriangle className="w-4 h-4" style={{ color }} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
