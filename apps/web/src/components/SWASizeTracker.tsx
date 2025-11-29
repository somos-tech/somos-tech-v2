/**
 * SWASizeTracker - Azure Static Web App Size Tracker Component
 * 
 * Displays the current app size and how close it is to Azure SWA limits.
 * Azure SWA Free tier: 250 MB max app size
 * Azure SWA Standard tier: 500 MB max app size
 */

import { useState, useEffect } from 'react';
import { HardDrive, AlertTriangle, CheckCircle, RefreshCw, Info, TrendingUp, Cloud } from 'lucide-react';

interface SizeData {
    totalSize: number;
    limit: number;
    tier: 'free' | 'standard';
    percentage: number;
    breakdown?: {
        name: string;
        size: number;
        percentage: number;
    }[];
    lastUpdated: string;
}

interface SWASizeTrackerProps {
    variant?: 'compact' | 'full';
    className?: string;
}

// Azure SWA limits
const SWA_LIMITS = {
    free: 250 * 1024 * 1024, // 250 MB in bytes
    standard: 500 * 1024 * 1024, // 500 MB in bytes
};

// Format bytes to human readable
function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function SWASizeTracker({ variant = 'compact', className = '' }: SWASizeTrackerProps) {
    const [sizeData, setSizeData] = useState<SizeData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSizeData = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const response = await fetch('/api/swa-size');
            
            if (!response.ok) {
                throw new Error('Failed to fetch size data');
            }
            
            const data = await response.json();
            setSizeData(data.data || data);
        } catch (err) {
            console.error('Error fetching SWA size:', err);
            // Use estimated data if API fails
            setSizeData({
                totalSize: 45 * 1024 * 1024, // Estimated 45 MB
                limit: SWA_LIMITS.free,
                tier: 'free',
                percentage: 18,
                breakdown: [
                    { name: 'JavaScript', size: 25 * 1024 * 1024, percentage: 55 },
                    { name: 'CSS', size: 8 * 1024 * 1024, percentage: 18 },
                    { name: 'Images', size: 10 * 1024 * 1024, percentage: 22 },
                    { name: 'Other', size: 2 * 1024 * 1024, percentage: 5 },
                ],
                lastUpdated: new Date().toISOString()
            });
            setError('Using estimated data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSizeData();
    }, []);

    const getStatusColor = (percentage: number) => {
        if (percentage >= 90) return '#ef4444'; // Red - Critical
        if (percentage >= 75) return '#f59e0b'; // Orange - Warning
        if (percentage >= 50) return '#eab308'; // Yellow - Caution
        return '#00FF91'; // Green - Healthy
    };

    const getStatusLabel = (percentage: number) => {
        if (percentage >= 90) return 'Critical';
        if (percentage >= 75) return 'Warning';
        if (percentage >= 50) return 'Moderate';
        return 'Healthy';
    };

    const StatusIcon = ({ percentage }: { percentage: number }) => {
        if (percentage >= 75) {
            return <AlertTriangle className="w-4 h-4" style={{ color: getStatusColor(percentage) }} />;
        }
        return <CheckCircle className="w-4 h-4" style={{ color: getStatusColor(percentage) }} />;
    };

    if (loading) {
        return (
            <div 
                className={`rounded-xl p-4 ${className}`}
                style={{ 
                    backgroundColor: '#051323',
                    border: '1px solid rgba(0, 255, 145, 0.2)'
                }}
            >
                <div className="flex items-center gap-3">
                    <RefreshCw className="w-5 h-5 animate-spin" style={{ color: '#00FF91' }} />
                    <span style={{ color: '#8394A7' }}>Loading app size data...</span>
                </div>
            </div>
        );
    }

    if (!sizeData) {
        return null;
    }

    const statusColor = getStatusColor(sizeData.percentage);

    if (variant === 'compact') {
        return (
            <div 
                className={`rounded-xl p-4 ${className}`}
                style={{ 
                    backgroundColor: '#051323',
                    border: `1px solid ${statusColor}30`
                }}
            >
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Cloud className="w-5 h-5" style={{ color: '#00D4FF' }} />
                        <span className="text-sm font-medium" style={{ color: '#FFFFFF' }}>
                            Azure SWA Size
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <StatusIcon percentage={sizeData.percentage} />
                        <span 
                            className="text-xs font-medium px-2 py-0.5 rounded-full"
                            style={{ 
                                backgroundColor: `${statusColor}20`,
                                color: statusColor
                            }}
                        >
                            {getStatusLabel(sizeData.percentage)}
                        </span>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="relative h-3 rounded-full overflow-hidden mb-2" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                    <div 
                        className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                        style={{ 
                            width: `${Math.min(sizeData.percentage, 100)}%`,
                            background: `linear-gradient(90deg, ${statusColor}, ${statusColor}CC)`
                        }}
                    />
                    {/* Threshold markers */}
                    <div className="absolute inset-y-0 left-[50%] w-px bg-white/20" />
                    <div className="absolute inset-y-0 left-[75%] w-px bg-yellow-500/40" />
                    <div className="absolute inset-y-0 left-[90%] w-px bg-red-500/40" />
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: '#8394A7' }}>
                        {formatBytes(sizeData.totalSize)} / {formatBytes(sizeData.limit)}
                    </span>
                    <span className="text-lg font-bold" style={{ color: statusColor }}>
                        {sizeData.percentage.toFixed(1)}%
                    </span>
                </div>

                {error && (
                    <div className="mt-2 flex items-center gap-1 text-xs" style={{ color: '#f59e0b' }}>
                        <Info className="w-3 h-3" />
                        <span>{error}</span>
                    </div>
                )}
            </div>
        );
    }

    // Full variant
    return (
        <div 
            className={`rounded-xl overflow-hidden ${className}`}
            style={{ 
                backgroundColor: '#051323',
                border: `2px solid ${statusColor}30`
            }}
        >
            {/* Header */}
            <div 
                className="px-5 py-4 border-b flex items-center justify-between"
                style={{ borderColor: 'rgba(255,255,255,0.1)' }}
            >
                <div className="flex items-center gap-3">
                    <div 
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: `${statusColor}20` }}
                    >
                        <HardDrive className="w-5 h-5" style={{ color: statusColor }} />
                    </div>
                    <div>
                        <h3 className="font-semibold" style={{ color: '#FFFFFF' }}>
                            Azure Static Web App Size
                        </h3>
                        <p className="text-xs" style={{ color: '#8394A7' }}>
                            {sizeData.tier === 'free' ? 'Free Tier' : 'Standard Tier'} • Max {formatBytes(sizeData.limit)}
                        </p>
                    </div>
                </div>
                <button
                    onClick={fetchSizeData}
                    className="p-2 rounded-lg transition-colors hover:bg-white/5"
                    title="Refresh"
                >
                    <RefreshCw className="w-4 h-4" style={{ color: '#8394A7' }} />
                </button>
            </div>

            {/* Content */}
            <div className="p-5">
                {/* Main progress */}
                <div className="mb-6">
                    <div className="flex items-end justify-between mb-2">
                        <div>
                            <span className="text-3xl font-bold" style={{ color: '#FFFFFF' }}>
                                {formatBytes(sizeData.totalSize)}
                            </span>
                            <span className="text-sm ml-2" style={{ color: '#8394A7' }}>
                                of {formatBytes(sizeData.limit)}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <StatusIcon percentage={sizeData.percentage} />
                            <span 
                                className="text-2xl font-bold"
                                style={{ color: statusColor }}
                            >
                                {sizeData.percentage.toFixed(1)}%
                            </span>
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="relative h-4 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                        <div 
                            className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                            style={{ 
                                width: `${Math.min(sizeData.percentage, 100)}%`,
                                background: `linear-gradient(90deg, ${statusColor}, ${statusColor}CC)`
                            }}
                        />
                        {/* Animated glow effect */}
                        <div 
                            className="absolute inset-y-0 left-0 rounded-full opacity-50"
                            style={{ 
                                width: `${Math.min(sizeData.percentage, 100)}%`,
                                background: `linear-gradient(90deg, transparent, ${statusColor}40, transparent)`,
                                animation: 'pulse 2s ease-in-out infinite'
                            }}
                        />
                    </div>

                    {/* Threshold labels */}
                    <div className="flex justify-between mt-1 text-xs" style={{ color: '#8394A7' }}>
                        <span>0%</span>
                        <span className="text-yellow-500/70">50%</span>
                        <span className="text-orange-500/70">75%</span>
                        <span className="text-red-500/70">90%</span>
                        <span>100%</span>
                    </div>
                </div>

                {/* Breakdown */}
                {sizeData.breakdown && sizeData.breakdown.length > 0 && (
                    <div className="mb-4">
                        <h4 className="text-sm font-medium mb-3" style={{ color: '#FFFFFF' }}>
                            Size Breakdown
                        </h4>
                        <div className="space-y-2">
                            {sizeData.breakdown.map((item, index) => (
                                <div key={item.name} className="flex items-center gap-3">
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between text-xs mb-1">
                                            <span style={{ color: '#FFFFFF' }}>{item.name}</span>
                                            <span style={{ color: '#8394A7' }}>{formatBytes(item.size)}</span>
                                        </div>
                                        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                                            <div 
                                                className="h-full rounded-full"
                                                style={{ 
                                                    width: `${item.percentage}%`,
                                                    backgroundColor: ['#00FF91', '#00D4FF', '#FF6B6B', '#FFB800'][index % 4]
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <span 
                                        className="text-xs font-medium w-10 text-right"
                                        style={{ color: '#8394A7' }}
                                    >
                                        {item.percentage}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Recommendations */}
                {sizeData.percentage >= 50 && (
                    <div 
                        className="p-3 rounded-lg flex items-start gap-3"
                        style={{ 
                            backgroundColor: `${statusColor}10`,
                            border: `1px solid ${statusColor}30`
                        }}
                    >
                        <TrendingUp className="w-4 h-4 mt-0.5 shrink-0" style={{ color: statusColor }} />
                        <div className="text-xs" style={{ color: '#FFFFFF' }}>
                            {sizeData.percentage >= 90 ? (
                                <span>
                                    <strong>Critical:</strong> App is near the size limit. Consider removing unused assets or upgrading to Standard tier.
                                </span>
                            ) : sizeData.percentage >= 75 ? (
                                <span>
                                    <strong>Warning:</strong> App size is growing. Review and optimize assets to stay within limits.
                                </span>
                            ) : (
                                <span>
                                    <strong>Tip:</strong> Monitor your app size as you add features. Consider lazy loading large components.
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs" style={{ borderColor: 'rgba(255,255,255,0.1)', color: '#8394A7' }}>
                    <span>Last updated: {new Date(sizeData.lastUpdated).toLocaleString()}</span>
                    {error && (
                        <span className="flex items-center gap-1" style={{ color: '#f59e0b' }}>
                            <Info className="w-3 h-3" />
                            {error}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
