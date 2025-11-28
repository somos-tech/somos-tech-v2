import { useState, useEffect, useCallback } from 'react';
import { 
    Shield, 
    AlertTriangle, 
    Ban, 
    Filter, 
    MessageSquare, 
    CheckCircle, 
    XCircle,
    Eye,
    Clock,
    Users,
    Settings,
    RefreshCw,
    Plus,
    Save,
    ChevronDown,
    ChevronUp,
    Link2,
    Brain,
    Workflow,
    MessageCircle,
    Calendar,
    Bell,
    X,
    ExternalLink,
    ShieldAlert,
    ShieldCheck
} from 'lucide-react';
import AdminBreadcrumbs from '@/components/AdminBreadcrumbs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// Types
interface TierCheck {
    name: string;
    passed: boolean;
    message: string;
    category?: string;
    severity?: number;
    threshold?: number;
    url?: string;
}

interface Tier1Config {
    enabled: boolean;
    name: string;
    description: string;
    blocklist: string[];
    caseSensitive: boolean;
    matchWholeWord: boolean;
    action: 'block' | 'review' | 'flag';
}

interface Tier2Config {
    enabled: boolean;
    name: string;
    description: string;
    useVirusTotal: boolean;
    usePatternAnalysis: boolean;
    blockMalicious: boolean;
    flagSuspicious: boolean;
    safeDomains: string[];
    action: 'block' | 'review';
}

interface Tier3Config {
    enabled: boolean;
    name: string;
    description: string;
    thresholds: {
        hate: number;
        sexual: number;
        violence: number;
        selfHarm: number;
    };
    autoBlock: boolean;
    notifyAdmins: boolean;
    action: 'block' | 'review';
}

interface WorkflowConfig {
    enabled: boolean;
    name: string;
    description: string;
    tier1: boolean;
    tier2: boolean;
    tier3: boolean;
}

interface ModerationConfig {
    id: string;
    enabled: boolean;
    tier1: Tier1Config;
    tier2: Tier2Config;
    tier3: Tier3Config;
    workflows: {
        community: WorkflowConfig;
        groups: WorkflowConfig;
        events: WorkflowConfig;
        notifications: WorkflowConfig;
    };
    showPendingMessage: boolean;
    pendingMessageText: string;
    updatedAt?: string;
}

interface QueueItem {
    id: string;
    type: string;
    contentType: string;
    content: string;
    safeContent?: string;
    contentId?: string;
    userId: string;
    userEmail: string;
    channelId?: string;
    groupId?: string;
    workflow?: string;
    tier1Result?: {
        tier: number;
        name: string;
        passed: boolean;
        action: string;
        matches: { term: string; type: string }[];
        checks: TierCheck[];
    };
    tier2Result?: {
        tier: number;
        name: string;
        passed: boolean;
        action: string;
        hasLinks: boolean;
        urls: {
            defangedUrl: string;
            safe: boolean;
            riskLevel: string;
            threats: { type: string; severity: string; message: string }[];
            virusTotal?: {
                checked: boolean;
                status?: string;
                malicious: boolean;
                suspicious: boolean;
                message?: string;
                details?: { malicious: number; suspicious: number; harmless: number };
            };
        }[];
        checks: TierCheck[];
    };
    tier3Result?: {
        tier: number;
        name: string;
        passed: boolean;
        action: string;
        categories: { category: string; severity: number; threshold: number }[];
        checks: TierCheck[];
    };
    tierFlow?: {
        tier: number;
        name: string;
        action: string;
        passed?: boolean | null;
        message?: string;
        checks?: TierCheck[];
    }[];
    priority?: 'critical' | 'high' | 'medium' | 'low';
    overallAction?: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
    reviewedAt?: string;
    reviewedBy?: string;
    notes?: string;
}

interface ModerationStats {
    pending: number;
    approved: number;
    rejected: number;
    todayTotal: number;
}

type TabType = 'queue' | 'tiers' | 'workflows' | 'blocklist';

export default function AdminModeration() {
    const [activeTab, setActiveTab] = useState<TabType>('queue');
    const [config, setConfig] = useState<ModerationConfig | null>(null);
    const [queue, setQueue] = useState<QueueItem[]>([]);
    const [stats, setStats] = useState<ModerationStats>({ pending: 0, approved: 0, rejected: 0, todayTotal: 0 });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [newBlocklistItem, setNewBlocklistItem] = useState('');
    const [newSafeDomain, setNewSafeDomain] = useState('');
    const [queueFilter, setQueueFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

    // Fetch moderation data
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const configRes = await fetch('/api/moderation/config');
            if (configRes.ok) {
                const configData = await configRes.json();
                setConfig(configData.data || configData);
            }

            const statsRes = await fetch('/api/moderation/stats');
            if (statsRes.ok) {
                const statsData = await statsRes.json();
                setStats(statsData.data || statsData);
            }

            const queueRes = await fetch(`/api/moderation/queue?status=${queueFilter}`);
            if (queueRes.ok) {
                const queueData = await queueRes.json();
                const queuePayload = queueData.data || queueData;
                setQueue(queuePayload.items || []);
            }
        } catch (error) {
            console.error('Error fetching moderation data:', error);
        } finally {
            setLoading(false);
        }
    }, [queueFilter]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Save config
    const saveConfig = async () => {
        if (!config) return;
        setSaving(true);
        try {
            const res = await fetch('/api/moderation/config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
            if (res.ok) {
                const result = await res.json();
                setConfig(result.data || result);
            }
        } catch (error) {
            console.error('Error saving config:', error);
        } finally {
            setSaving(false);
        }
    };

    // Add blocklist item (Tier 1)
    const addBlocklistItem = () => {
        if (!newBlocklistItem.trim() || !config) return;
        const newList = [...(config.tier1?.blocklist || []), newBlocklistItem.trim().toLowerCase()];
        setConfig({
            ...config,
            tier1: { ...config.tier1, blocklist: newList }
        });
        setNewBlocklistItem('');
    };

    // Remove blocklist item
    const removeBlocklistItem = (term: string) => {
        if (!config) return;
        const newList = (config.tier1?.blocklist || []).filter(t => t !== term);
        setConfig({
            ...config,
            tier1: { ...config.tier1, blocklist: newList }
        });
    };

    // Add safe domain (Tier 2)
    const addSafeDomain = () => {
        if (!newSafeDomain.trim() || !config) return;
        const newList = [...(config.tier2?.safeDomains || []), newSafeDomain.trim().toLowerCase()];
        setConfig({
            ...config,
            tier2: { ...config.tier2, safeDomains: newList }
        });
        setNewSafeDomain('');
    };

    // Remove safe domain
    const removeSafeDomain = (domain: string) => {
        if (!config) return;
        const newList = (config.tier2?.safeDomains || []).filter(d => d !== domain);
        setConfig({
            ...config,
            tier2: { ...config.tier2, safeDomains: newList }
        });
    };

    // Review queue item
    const reviewItem = async (itemId: string, action: 'approved' | 'rejected') => {
        try {
            const res = await fetch(`/api/moderation/queue/${itemId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, notes: reviewNotes[itemId] || '' })
            });
            if (res.ok) {
                fetchData();
                setSelectedItems(prev => {
                    const next = new Set(prev);
                    next.delete(itemId);
                    return next;
                });
            }
        } catch (error) {
            console.error('Error reviewing item:', error);
        }
    };

    // Bulk review
    const bulkReview = async (action: 'approved' | 'rejected') => {
        for (const itemId of selectedItems) {
            await reviewItem(itemId, action);
        }
        setSelectedItems(new Set());
    };

    // Toggle item expansion
    const toggleExpanded = (itemId: string) => {
        setExpandedItems(prev => {
            const next = new Set(prev);
            if (next.has(itemId)) next.delete(itemId);
            else next.add(itemId);
            return next;
        });
    };

    // Toggle item selection
    const toggleSelected = (itemId: string) => {
        setSelectedItems(prev => {
            const next = new Set(prev);
            if (next.has(itemId)) next.delete(itemId);
            else next.add(itemId);
            return next;
        });
    };

    // Get severity color
    const getSeverityColor = (severity: number) => {
        if (severity === 0) return '#00FF91';
        if (severity <= 2) return '#FFB800';
        if (severity <= 4) return '#FF8C00';
        return '#FF6B6B';
    };

    // Get severity label
    const getSeverityLabel = (severity: number) => {
        if (severity === 0) return 'Safe';
        if (severity <= 2) return 'Low';
        if (severity <= 4) return 'Medium';
        return 'High';
    };

    // Stats cards
    const statsCards = [
        { label: 'Pending Review', value: stats.pending, icon: Clock, color: '#FFB800' },
        { label: 'Approved Today', value: stats.approved, icon: CheckCircle, color: '#00FF91' },
        { label: 'Rejected', value: stats.rejected, icon: XCircle, color: '#FF6B6B' },
        { label: 'Total Today', value: stats.todayTotal, icon: Shield, color: '#00D4FF' },
    ];

    const tabs = [
        { id: 'queue' as TabType, label: 'Review Queue', icon: MessageSquare, count: stats.pending },
        { id: 'tiers' as TabType, label: 'Moderation Tiers', icon: Shield, count: 0 },
        { id: 'workflows' as TabType, label: 'Workflows', icon: Workflow, count: 0 },
        { id: 'blocklist' as TabType, label: 'Blocklist', icon: Filter, count: config?.tier1?.blocklist?.length || 0 },
    ];

    const workflowIcons: Record<string, typeof MessageCircle> = {
        community: MessageCircle,
        groups: Users,
        events: Calendar,
        notifications: Bell
    };

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#0a1f35' }}>
            <div className="max-w-7xl mx-auto px-4 py-6">
                <AdminBreadcrumbs />

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-bold mb-2" style={{ color: '#FFFFFF' }}>
                            Content Moderation
                        </h1>
                        <p style={{ color: '#8394A7' }}>
                            Three-tier moderation: Keyword Filter → VirusTotal Link Check → Azure AI
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            onClick={fetchData}
                            disabled={loading}
                            className="rounded-lg"
                            style={{ backgroundColor: '#1a3a5c', color: '#00D4FF' }}
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                        {config && (
                            <div 
                                className="px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2"
                                style={{ 
                                    backgroundColor: config.enabled ? '#00FF9120' : '#FF6B6B20',
                                    color: config.enabled ? '#00FF91' : '#FF6B6B'
                                }}
                            >
                                <Shield className="h-4 w-4" />
                                {config.enabled ? 'Enabled' : 'Disabled'}
                            </div>
                        )}
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {statsCards.map((stat) => {
                        const Icon = stat.icon;
                        return (
                            <Card key={stat.label} className="p-4" style={{ backgroundColor: '#051323', border: `1px solid ${stat.color}30` }}>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg" style={{ backgroundColor: `${stat.color}20` }}>
                                        <Icon className="h-5 w-5" style={{ color: stat.color }} />
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>{stat.value}</div>
                                        <div className="text-xs" style={{ color: '#8394A7' }}>{stat.label}</div>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 overflow-x-auto">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                                    activeTab === tab.id ? 'bg-white/10' : 'hover:bg-white/5'
                                }`}
                                style={{ 
                                    color: activeTab === tab.id ? '#00FF91' : '#8394A7',
                                    border: activeTab === tab.id ? '1px solid #00FF91' : '1px solid transparent'
                                }}
                            >
                                <Icon className="h-4 w-4" />
                                <span>{tab.label}</span>
                                {tab.count > 0 && (
                                    <span 
                                        className="px-2 py-0.5 rounded-full text-xs"
                                        style={{ 
                                            backgroundColor: activeTab === tab.id ? '#00FF9120' : 'rgba(255,255,255,0.1)',
                                            color: activeTab === tab.id ? '#00FF91' : '#8394A7'
                                        }}
                                    >
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Queue Tab */}
                {activeTab === 'queue' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex gap-2">
                                {(['pending', 'approved', 'rejected', 'all'] as const).map((filter) => (
                                    <button
                                        key={filter}
                                        onClick={() => setQueueFilter(filter)}
                                        className={`px-3 py-1.5 rounded-lg text-sm capitalize ${queueFilter === filter ? 'bg-white/10' : 'hover:bg-white/5'}`}
                                        style={{ 
                                            color: queueFilter === filter ? '#00D4FF' : '#8394A7',
                                            border: queueFilter === filter ? '1px solid #00D4FF40' : '1px solid transparent'
                                        }}
                                    >
                                        {filter}
                                    </button>
                                ))}
                            </div>
                            {selectedItems.size > 0 && (
                                <div className="flex items-center gap-2">
                                    <span className="text-sm" style={{ color: '#8394A7' }}>{selectedItems.size} selected</span>
                                    <Button size="sm" onClick={() => bulkReview('approved')} className="rounded-lg" style={{ backgroundColor: '#00FF9120', color: '#00FF91' }}>
                                        <CheckCircle className="h-4 w-4 mr-1" /> Approve All
                                    </Button>
                                    <Button size="sm" onClick={() => bulkReview('rejected')} className="rounded-lg" style={{ backgroundColor: '#FF6B6B20', color: '#FF6B6B' }}>
                                        <XCircle className="h-4 w-4 mr-1" /> Reject All
                                    </Button>
                                </div>
                            )}
                        </div>

                        <Card className="p-6" style={{ backgroundColor: '#051323', border: '1px solid rgba(255, 184, 0, 0.3)' }}>
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <RefreshCw className="h-8 w-8 animate-spin" style={{ color: '#00D4FF' }} />
                                </div>
                            ) : queue.length === 0 ? (
                                <div className="text-center py-12">
                                    <Shield className="h-12 w-12 mx-auto mb-4" style={{ color: '#00FF91' }} />
                                    <p className="text-lg" style={{ color: '#FFFFFF' }}>No items in queue</p>
                                    <p className="text-sm" style={{ color: '#8394A7' }}>All content has been reviewed</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {queue.map((item) => (
                                        <div 
                                            key={item.id}
                                            className="p-4 rounded-lg"
                                            style={{ 
                                                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                                borderLeft: `3px solid ${
                                                    item.priority === 'critical' ? '#FF0000' :
                                                    item.priority === 'high' ? '#FF6B6B' :
                                                    item.priority === 'medium' ? '#FFB800' : '#00D4FF'
                                                }`
                                            }}
                                        >
                                            <div className="flex items-start gap-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedItems.has(item.id)}
                                                    onChange={() => toggleSelected(item.id)}
                                                    className="mt-1"
                                                />
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                        <span 
                                                            className="text-xs px-2 py-0.5 rounded capitalize"
                                                            style={{ 
                                                                backgroundColor: item.status === 'pending' ? '#FFB80020' : item.status === 'approved' ? '#00FF9120' : '#FF6B6B20',
                                                                color: item.status === 'pending' ? '#FFB800' : item.status === 'approved' ? '#00FF91' : '#FF6B6B'
                                                            }}
                                                        >
                                                            {item.status}
                                                        </span>
                                                        {item.priority && (
                                                            <span 
                                                                className="text-xs px-2 py-0.5 rounded uppercase font-bold"
                                                                style={{ 
                                                                    backgroundColor: item.priority === 'critical' ? '#FF000020' : item.priority === 'high' ? '#FF6B6B20' : '#FFB80020',
                                                                    color: item.priority === 'critical' ? '#FF0000' : item.priority === 'high' ? '#FF6B6B' : '#FFB800'
                                                                }}
                                                            >
                                                                {item.priority}
                                                            </span>
                                                        )}
                                                        {item.workflow && (
                                                            <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#00D4FF20', color: '#00D4FF' }}>
                                                                {item.workflow}
                                                            </span>
                                                        )}
                                                        <span className="text-xs" style={{ color: '#6B7280' }}>
                                                            {new Date(item.createdAt).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    
                                                    {/* Content preview */}
                                                    <div className="p-3 rounded-lg mb-3" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
                                                        <p className="text-sm font-mono" style={{ color: '#FFFFFF' }}>
                                                            {expandedItems.has(item.id) 
                                                                ? (item.safeContent || item.content) 
                                                                : (item.safeContent || item.content).substring(0, 200) + ((item.safeContent || item.content).length > 200 ? '...' : '')}
                                                        </p>
                                                        {(item.safeContent || item.content).length > 200 && (
                                                            <button onClick={() => toggleExpanded(item.id)} className="text-xs mt-2 flex items-center gap-1" style={{ color: '#00D4FF' }}>
                                                                {expandedItems.has(item.id) ? <>Show less <ChevronUp className="h-3 w-3" /></> : <>Show more <ChevronDown className="h-3 w-3" /></>}
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* Tier Results */}
                                                    <div className="flex flex-wrap gap-2 mb-3">
                                                        {item.tier1Result && !item.tier1Result.passed && (
                                                            <div className="flex items-center gap-1 px-2 py-1 rounded text-xs" style={{ backgroundColor: '#FF6B6B20', color: '#FF6B6B' }}>
                                                                <Filter className="h-3 w-3" />
                                                                <span>Tier 1: {item.tier1Result.matches?.map(m => m.term).join(', ')}</span>
                                                            </div>
                                                        )}
                                                        {item.tier2Result?.urls?.some(u => !u.safe) && (
                                                            <div className="flex items-center gap-1 px-2 py-1 rounded text-xs" style={{ backgroundColor: '#FF6B6B20', color: '#FF6B6B' }}>
                                                                <Link2 className="h-3 w-3" />
                                                                <span>Tier 2: Malicious link detected</span>
                                                            </div>
                                                        )}
                                                        {item.tier3Result?.categories?.map((cat, i) => (
                                                            <div key={i} className="flex items-center gap-1 px-2 py-1 rounded text-xs" style={{ backgroundColor: `${getSeverityColor(cat.severity)}20`, color: getSeverityColor(cat.severity) }}>
                                                                <Brain className="h-3 w-3" />
                                                                <span>{cat.category} ({getSeverityLabel(cat.severity)})</span>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* VirusTotal Results */}
                                                    {expandedItems.has(item.id) && item.tier2Result?.urls?.map((url, i) => (
                                                        url.virusTotal?.checked && (
                                                            <div key={i} className="p-2 rounded mb-2 text-xs" style={{ backgroundColor: url.virusTotal.malicious ? '#FF6B6B10' : '#00FF9110', border: `1px solid ${url.virusTotal.malicious ? '#FF6B6B' : '#00FF91'}30` }}>
                                                                <div className="font-mono break-all mb-1" style={{ color: '#FFB800' }}>{url.defangedUrl}</div>
                                                                <div className="flex items-center gap-2">
                                                                    <ExternalLink className="h-3 w-3" style={{ color: '#8394A7' }} />
                                                                    <span style={{ color: url.virusTotal.malicious ? '#FF6B6B' : '#00FF91' }}>
                                                                        VirusTotal: {url.virusTotal.message}
                                                                    </span>
                                                                    {url.virusTotal.details && (
                                                                        <span style={{ color: '#8394A7' }}>
                                                                            ({url.virusTotal.details.malicious} malicious, {url.virusTotal.details.suspicious} suspicious, {url.virusTotal.details.harmless} harmless)
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )
                                                    ))}

                                                    {/* User info */}
                                                    <div className="flex items-center gap-2 text-xs" style={{ color: '#8394A7' }}>
                                                        <Users className="h-3 w-3" />
                                                        <span>{item.userEmail}</span>
                                                    </div>

                                                    {/* Review notes */}
                                                    {item.status === 'pending' && (
                                                        <div className="mt-3">
                                                            <input
                                                                type="text"
                                                                placeholder="Add notes (optional)"
                                                                value={reviewNotes[item.id] || ''}
                                                                onChange={(e) => setReviewNotes({ ...reviewNotes, [item.id]: e.target.value })}
                                                                className="w-full px-3 py-2 rounded-lg text-sm"
                                                                style={{ backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF' }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Actions */}
                                                {item.status === 'pending' && (
                                                    <div className="flex gap-2">
                                                        <Button size="sm" onClick={() => reviewItem(item.id, 'approved')} className="rounded-lg" style={{ backgroundColor: '#00FF9120', color: '#00FF91' }}>
                                                            <CheckCircle className="h-4 w-4" />
                                                        </Button>
                                                        <Button size="sm" onClick={() => reviewItem(item.id, 'rejected')} className="rounded-lg" style={{ backgroundColor: '#FF6B6B20', color: '#FF6B6B' }}>
                                                            <XCircle className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>
                    </div>
                )}

                {/* Tiers Tab */}
                {activeTab === 'tiers' && config && (
                    <div className="space-y-6">
                        {/* Global Enable */}
                        <Card className="p-6" style={{ backgroundColor: '#051323', border: '1px solid rgba(0, 212, 255, 0.3)' }}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-semibold" style={{ color: '#FFFFFF' }}>Content Moderation</h2>
                                    <p className="text-sm" style={{ color: '#8394A7' }}>Enable or disable all content moderation</p>
                                </div>
                                <button
                                    onClick={() => setConfig({ ...config, enabled: !config.enabled })}
                                    className={`relative w-14 h-7 rounded-full transition-colors ${config.enabled ? 'bg-green-500' : 'bg-gray-600'}`}
                                >
                                    <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${config.enabled ? 'left-8' : 'left-1'}`} />
                                </button>
                            </div>
                        </Card>

                        {/* Tier 1: Keyword Filter */}
                        <Card className="p-6" style={{ backgroundColor: '#051323', border: '1px solid rgba(0, 212, 255, 0.3)' }}>
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 rounded-xl" style={{ backgroundColor: '#00D4FF20' }}>
                                    <Filter className="h-6 w-6" style={{ color: '#00D4FF' }} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-xl font-semibold" style={{ color: '#FFFFFF' }}>Tier 1: Keyword Filter</h2>
                                        <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#00D4FF20', color: '#00D4FF' }}>Fastest</span>
                                    </div>
                                    <p className="text-sm" style={{ color: '#8394A7' }}>{config.tier1?.description || 'Custom blocklist of words and phrases'}</p>
                                </div>
                                <button
                                    onClick={() => setConfig({ ...config, tier1: { ...config.tier1, enabled: !config.tier1?.enabled } })}
                                    className={`relative w-12 h-6 rounded-full transition-colors ${config.tier1?.enabled ? 'bg-green-500' : 'bg-gray-600'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${config.tier1?.enabled ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>

                            {config.tier1?.enabled && (
                                <div className="space-y-4 pl-16">
                                    <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                                        <div>
                                            <div className="text-sm" style={{ color: '#FFFFFF' }}>Case Sensitive</div>
                                            <div className="text-xs" style={{ color: '#8394A7' }}>Match exact case of blocked terms</div>
                                        </div>
                                        <button
                                            onClick={() => setConfig({ ...config, tier1: { ...config.tier1, caseSensitive: !config.tier1?.caseSensitive } })}
                                            className={`relative w-10 h-5 rounded-full transition-colors ${config.tier1?.caseSensitive ? 'bg-green-500' : 'bg-gray-600'}`}
                                        >
                                            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${config.tier1?.caseSensitive ? 'left-5' : 'left-0.5'}`} />
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                                        <div>
                                            <div className="text-sm" style={{ color: '#FFFFFF' }}>Match Whole Word</div>
                                            <div className="text-xs" style={{ color: '#8394A7' }}>Only match complete words, not partial</div>
                                        </div>
                                        <button
                                            onClick={() => setConfig({ ...config, tier1: { ...config.tier1, matchWholeWord: !config.tier1?.matchWholeWord } })}
                                            className={`relative w-10 h-5 rounded-full transition-colors ${config.tier1?.matchWholeWord ? 'bg-green-500' : 'bg-gray-600'}`}
                                        >
                                            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${config.tier1?.matchWholeWord ? 'left-5' : 'left-0.5'}`} />
                                        </button>
                                    </div>
                                    <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                                        <div className="text-sm mb-2" style={{ color: '#FFFFFF' }}>Action on Match</div>
                                        <div className="flex gap-2">
                                            {(['block', 'review', 'flag'] as const).map(action => (
                                                <button
                                                    key={action}
                                                    onClick={() => setConfig({ ...config, tier1: { ...config.tier1, action } })}
                                                    className={`px-3 py-1.5 rounded text-xs capitalize ${config.tier1?.action === action ? 'bg-white/10' : ''}`}
                                                    style={{ 
                                                        color: config.tier1?.action === action ? '#00D4FF' : '#8394A7',
                                                        border: config.tier1?.action === action ? '1px solid #00D4FF' : '1px solid transparent'
                                                    }}
                                                >
                                                    {action}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </Card>

                        {/* Tier 2: Link Safety */}
                        <Card className="p-6" style={{ backgroundColor: '#051323', border: '1px solid rgba(255, 184, 0, 0.3)' }}>
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 rounded-xl" style={{ backgroundColor: '#FFB80020' }}>
                                    <Link2 className="h-6 w-6" style={{ color: '#FFB800' }} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-xl font-semibold" style={{ color: '#FFFFFF' }}>Tier 2: Link Safety</h2>
                                        <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#FFB80020', color: '#FFB800' }}>VirusTotal</span>
                                    </div>
                                    <p className="text-sm" style={{ color: '#8394A7' }}>{config.tier2?.description || 'VirusTotal + pattern-based URL analysis'}</p>
                                </div>
                                <button
                                    onClick={() => setConfig({ ...config, tier2: { ...config.tier2, enabled: !config.tier2?.enabled } })}
                                    className={`relative w-12 h-6 rounded-full transition-colors ${config.tier2?.enabled ? 'bg-green-500' : 'bg-gray-600'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${config.tier2?.enabled ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>

                            {config.tier2?.enabled && (
                                <div className="space-y-4 pl-16">
                                    <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                                        <div>
                                            <div className="text-sm flex items-center gap-2" style={{ color: '#FFFFFF' }}>
                                                <ShieldAlert className="h-4 w-4" style={{ color: '#FFB800' }} />
                                                Use VirusTotal API
                                            </div>
                                            <div className="text-xs" style={{ color: '#8394A7' }}>Send URLs to VirusTotal for malware scanning</div>
                                        </div>
                                        <button
                                            onClick={() => setConfig({ ...config, tier2: { ...config.tier2, useVirusTotal: !config.tier2?.useVirusTotal } })}
                                            className={`relative w-10 h-5 rounded-full transition-colors ${config.tier2?.useVirusTotal ? 'bg-green-500' : 'bg-gray-600'}`}
                                        >
                                            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${config.tier2?.useVirusTotal ? 'left-5' : 'left-0.5'}`} />
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                                        <div>
                                            <div className="text-sm" style={{ color: '#FFFFFF' }}>Use Pattern Analysis</div>
                                            <div className="text-xs" style={{ color: '#8394A7' }}>Check URLs against known malicious patterns</div>
                                        </div>
                                        <button
                                            onClick={() => setConfig({ ...config, tier2: { ...config.tier2, usePatternAnalysis: !config.tier2?.usePatternAnalysis } })}
                                            className={`relative w-10 h-5 rounded-full transition-colors ${config.tier2?.usePatternAnalysis ? 'bg-green-500' : 'bg-gray-600'}`}
                                        >
                                            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${config.tier2?.usePatternAnalysis ? 'left-5' : 'left-0.5'}`} />
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                                        <div>
                                            <div className="text-sm" style={{ color: '#FFFFFF' }}>Block Malicious Links</div>
                                            <div className="text-xs" style={{ color: '#8394A7' }}>Auto-block content with confirmed malicious URLs</div>
                                        </div>
                                        <button
                                            onClick={() => setConfig({ ...config, tier2: { ...config.tier2, blockMalicious: !config.tier2?.blockMalicious } })}
                                            className={`relative w-10 h-5 rounded-full transition-colors ${config.tier2?.blockMalicious ? 'bg-green-500' : 'bg-gray-600'}`}
                                        >
                                            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${config.tier2?.blockMalicious ? 'left-5' : 'left-0.5'}`} />
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                                        <div>
                                            <div className="text-sm" style={{ color: '#FFFFFF' }}>Flag Suspicious Links</div>
                                            <div className="text-xs" style={{ color: '#8394A7' }}>Send suspicious URLs to review queue</div>
                                        </div>
                                        <button
                                            onClick={() => setConfig({ ...config, tier2: { ...config.tier2, flagSuspicious: !config.tier2?.flagSuspicious } })}
                                            className={`relative w-10 h-5 rounded-full transition-colors ${config.tier2?.flagSuspicious ? 'bg-green-500' : 'bg-gray-600'}`}
                                        >
                                            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${config.tier2?.flagSuspicious ? 'left-5' : 'left-0.5'}`} />
                                        </button>
                                    </div>

                                    {/* Safe Domains */}
                                    <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                                        <div className="text-sm mb-2 flex items-center gap-2" style={{ color: '#FFFFFF' }}>
                                            <ShieldCheck className="h-4 w-4" style={{ color: '#00FF91' }} />
                                            Trusted Domains (whitelist)
                                        </div>
                                        <div className="flex gap-2 mb-3">
                                            <input
                                                type="text"
                                                placeholder="e.g., example.com"
                                                value={newSafeDomain}
                                                onChange={(e) => setNewSafeDomain(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && addSafeDomain()}
                                                className="flex-1 px-3 py-2 rounded-lg text-sm"
                                                style={{ backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF' }}
                                            />
                                            <Button onClick={addSafeDomain} size="sm" className="rounded-lg" style={{ backgroundColor: '#00FF9120', color: '#00FF91' }}>
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {(config.tier2?.safeDomains || []).slice(0, 10).map((domain) => (
                                                <div key={domain} className="flex items-center gap-1 px-2 py-1 rounded text-xs" style={{ backgroundColor: '#00FF9120', color: '#00FF91' }}>
                                                    <span>{domain}</span>
                                                    <button onClick={() => removeSafeDomain(domain)} className="hover:bg-white/10 rounded p-0.5">
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            ))}
                                            {(config.tier2?.safeDomains?.length || 0) > 10 && (
                                                <span className="text-xs" style={{ color: '#8394A7' }}>+{(config.tier2?.safeDomains?.length || 0) - 10} more</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </Card>

                        {/* Tier 3: Azure AI */}
                        <Card className="p-6" style={{ backgroundColor: '#051323', border: '1px solid rgba(0, 255, 145, 0.3)' }}>
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 rounded-xl" style={{ backgroundColor: '#00FF9120' }}>
                                    <Brain className="h-6 w-6" style={{ color: '#00FF91' }} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-xl font-semibold" style={{ color: '#FFFFFF' }}>Tier 3: Azure AI Content Safety</h2>
                                        <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#00FF9120', color: '#00FF91' }}>AI-Powered</span>
                                    </div>
                                    <p className="text-sm" style={{ color: '#8394A7' }}>{config.tier3?.description || 'Advanced AI analysis for harmful content'}</p>
                                </div>
                                <button
                                    onClick={() => setConfig({ ...config, tier3: { ...config.tier3, enabled: !config.tier3?.enabled } })}
                                    className={`relative w-12 h-6 rounded-full transition-colors ${config.tier3?.enabled ? 'bg-green-500' : 'bg-gray-600'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${config.tier3?.enabled ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>

                            {config.tier3?.enabled && (
                                <div className="space-y-4 pl-16">
                                    <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                                        <div>
                                            <div className="text-sm" style={{ color: '#FFFFFF' }}>Auto-Block Violations</div>
                                            <div className="text-xs" style={{ color: '#8394A7' }}>Automatically block content exceeding thresholds</div>
                                        </div>
                                        <button
                                            onClick={() => setConfig({ ...config, tier3: { ...config.tier3, autoBlock: !config.tier3?.autoBlock } })}
                                            className={`relative w-10 h-5 rounded-full transition-colors ${config.tier3?.autoBlock ? 'bg-green-500' : 'bg-gray-600'}`}
                                        >
                                            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${config.tier3?.autoBlock ? 'left-5' : 'left-0.5'}`} />
                                        </button>
                                    </div>

                                    {/* Thresholds */}
                                    <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                                        <div className="text-sm mb-4" style={{ color: '#FFFFFF' }}>Severity Thresholds (0=Safe, 2=Low, 4=Medium, 6=High)</div>
                                        {Object.entries(config.tier3?.thresholds || {}).map(([category, value]) => (
                                            <div key={category} className="flex items-center gap-4 mb-3">
                                                <span className="text-sm w-24 capitalize" style={{ color: '#8394A7' }}>{category}</span>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="6"
                                                    step="2"
                                                    value={value}
                                                    onChange={(e) => setConfig({
                                                        ...config,
                                                        tier3: {
                                                            ...config.tier3,
                                                            thresholds: {
                                                                ...config.tier3.thresholds,
                                                                [category]: parseInt(e.target.value)
                                                            }
                                                        }
                                                    })}
                                                    className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
                                                    style={{ background: 'linear-gradient(to right, #00FF91, #FFB800, #FF8C00, #FF6B6B)' }}
                                                />
                                                <span 
                                                    className="px-2 py-1 rounded text-xs min-w-[60px] text-center"
                                                    style={{ backgroundColor: `${getSeverityColor(value)}20`, color: getSeverityColor(value) }}
                                                >
                                                    {getSeverityLabel(value)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </Card>

                        {/* Save Button */}
                        <div className="flex justify-end">
                            <Button onClick={saveConfig} disabled={saving} className="rounded-lg px-6" style={{ backgroundColor: '#00FF91', color: '#051323' }}>
                                {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                                Save Settings
                            </Button>
                        </div>
                    </div>
                )}

                {/* Workflows Tab */}
                {activeTab === 'workflows' && config && (
                    <div className="space-y-6">
                        <Card className="p-6" style={{ backgroundColor: '#051323', border: '1px solid rgba(0, 212, 255, 0.3)' }}>
                            <h2 className="text-xl font-semibold mb-2" style={{ color: '#FFFFFF' }}>Workflow Scopes</h2>
                            <p className="text-sm mb-6" style={{ color: '#8394A7' }}>
                                Configure which moderation tiers apply to each feature area
                            </p>

                            <div className="space-y-4">
                                {Object.entries(config.workflows || {}).map(([key, workflow]) => {
                                    const Icon = workflowIcons[key] || MessageCircle;
                                    return (
                                        <div key={key} className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 rounded-lg" style={{ backgroundColor: workflow.enabled ? '#00D4FF20' : 'rgba(255,255,255,0.05)' }}>
                                                        <Icon className="h-5 w-5" style={{ color: workflow.enabled ? '#00D4FF' : '#8394A7' }} />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium" style={{ color: '#FFFFFF' }}>{workflow.name}</div>
                                                        <div className="text-xs" style={{ color: '#8394A7' }}>{workflow.description}</div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => setConfig({
                                                        ...config,
                                                        workflows: {
                                                            ...config.workflows,
                                                            [key]: { ...workflow, enabled: !workflow.enabled }
                                                        }
                                                    })}
                                                    className={`relative w-12 h-6 rounded-full transition-colors ${workflow.enabled ? 'bg-green-500' : 'bg-gray-600'}`}
                                                >
                                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${workflow.enabled ? 'left-7' : 'left-1'}`} />
                                                </button>
                                            </div>

                                            {workflow.enabled && (
                                                <div className="flex gap-4 pl-12">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={workflow.tier1}
                                                            onChange={(e) => setConfig({
                                                                ...config,
                                                                workflows: {
                                                                    ...config.workflows,
                                                                    [key]: { ...workflow, tier1: e.target.checked }
                                                                }
                                                            })}
                                                            className="rounded"
                                                        />
                                                        <span className="text-sm flex items-center gap-1" style={{ color: '#00D4FF' }}>
                                                            <Filter className="h-3 w-3" /> Tier 1
                                                        </span>
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={workflow.tier2}
                                                            onChange={(e) => setConfig({
                                                                ...config,
                                                                workflows: {
                                                                    ...config.workflows,
                                                                    [key]: { ...workflow, tier2: e.target.checked }
                                                                }
                                                            })}
                                                            className="rounded"
                                                        />
                                                        <span className="text-sm flex items-center gap-1" style={{ color: '#FFB800' }}>
                                                            <Link2 className="h-3 w-3" /> Tier 2
                                                        </span>
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={workflow.tier3}
                                                            onChange={(e) => setConfig({
                                                                ...config,
                                                                workflows: {
                                                                    ...config.workflows,
                                                                    [key]: { ...workflow, tier3: e.target.checked }
                                                                }
                                                            })}
                                                            className="rounded"
                                                        />
                                                        <span className="text-sm flex items-center gap-1" style={{ color: '#00FF91' }}>
                                                            <Brain className="h-3 w-3" /> Tier 3
                                                        </span>
                                                    </label>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>

                        {/* Save Button */}
                        <div className="flex justify-end">
                            <Button onClick={saveConfig} disabled={saving} className="rounded-lg px-6" style={{ backgroundColor: '#00FF91', color: '#051323' }}>
                                {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                                Save Settings
                            </Button>
                        </div>
                    </div>
                )}

                {/* Blocklist Tab */}
                {activeTab === 'blocklist' && config && (
                    <Card className="p-6" style={{ backgroundColor: '#051323', border: '1px solid rgba(255, 107, 107, 0.3)' }}>
                        <h2 className="text-xl font-semibold mb-2" style={{ color: '#FFFFFF' }}>
                            Tier 1 Blocklist
                        </h2>
                        <p className="text-sm mb-6" style={{ color: '#8394A7' }}>
                            Words and phrases that will be instantly blocked by Tier 1 keyword filter
                        </p>

                        <div className="flex gap-2 mb-6">
                            <input
                                type="text"
                                placeholder="Enter word or phrase to block..."
                                value={newBlocklistItem}
                                onChange={(e) => setNewBlocklistItem(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addBlocklistItem()}
                                className="flex-1 px-4 py-2 rounded-lg"
                                style={{ backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF' }}
                            />
                            <Button onClick={addBlocklistItem} className="rounded-lg" style={{ backgroundColor: '#FF6B6B', color: '#FFFFFF' }}>
                                <Plus className="h-4 w-4 mr-2" /> Add
                            </Button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {(config.tier1?.blocklist || []).map((term, index) => (
                                <div key={index} className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'rgba(255, 107, 107, 0.2)' }}>
                                    <Filter className="h-3 w-3" style={{ color: '#FF6B6B' }} />
                                    <span style={{ color: '#FFFFFF' }}>{term}</span>
                                    <button onClick={() => removeBlocklistItem(term)} className="ml-1 hover:bg-white/10 rounded p-0.5">
                                        <X className="h-3 w-3" style={{ color: '#8394A7' }} />
                                    </button>
                                </div>
                            ))}
                            {(config.tier1?.blocklist || []).length === 0 && (
                                <p className="text-sm" style={{ color: '#8394A7' }}>
                                    No blocked terms. Add words or phrases above to create your blocklist.
                                </p>
                            )}
                        </div>

                        {/* Save Button */}
                        <div className="flex justify-end mt-6">
                            <Button onClick={saveConfig} disabled={saving} className="rounded-lg px-6" style={{ backgroundColor: '#00FF91', color: '#051323' }}>
                                {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                                Save Blocklist
                            </Button>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
}
