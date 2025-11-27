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
    Trash2,
    Plus,
    Save,
    ChevronDown,
    ChevronUp,
    AlertOctagon,
    Flame,
    Heart,
    Skull,
    Search,
    Download,
    X
} from 'lucide-react';
import AdminBreadcrumbs from '@/components/AdminBreadcrumbs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// Types
interface ModerationConfig {
    id: string;
    enabled: boolean;
    thresholds: {
        hate: number;
        sexual: number;
        violence: number;
        selfHarm: number;
    };
    autoBlock: boolean;
    notifyAdmins: boolean;
    blocklist: string[];
    updatedAt?: string;
}

interface QueueItem {
    id: string;
    type: string;
    contentType: string;
    content: string;
    contentId?: string;
    userId: string;
    userEmail: string;
    channelId?: string;
    categories: { category: string; severity: number; threshold: number }[];
    blocklist: { blocklistName: string; text: string }[];
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

type TabType = 'queue' | 'settings' | 'blocklist' | 'users';

export default function AdminModeration() {
    const [activeTab, setActiveTab] = useState<TabType>('queue');
    const [config, setConfig] = useState<ModerationConfig | null>(null);
    const [queue, setQueue] = useState<QueueItem[]>([]);
    const [stats, setStats] = useState<ModerationStats>({ pending: 0, approved: 0, rejected: 0, todayTotal: 0 });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [newBlocklistItem, setNewBlocklistItem] = useState('');
    const [queueFilter, setQueueFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

    // Fetch moderation data
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch config
            const configRes = await fetch('/api/moderation/config');
            if (configRes.ok) {
                const configData = await configRes.json();
                setConfig(configData);
            }

            // Fetch stats
            const statsRes = await fetch('/api/moderation/stats');
            if (statsRes.ok) {
                const statsData = await statsRes.json();
                setStats(statsData);
            }

            // Fetch queue
            const queueRes = await fetch(`/api/moderation/queue?status=${queueFilter}`);
            if (queueRes.ok) {
                const queueData = await queueRes.json();
                setQueue(queueData.items || []);
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
                const updated = await res.json();
                setConfig(updated);
            }
        } catch (error) {
            console.error('Error saving config:', error);
        } finally {
            setSaving(false);
        }
    };

    // Update threshold
    const updateThreshold = (category: keyof ModerationConfig['thresholds'], value: number) => {
        if (!config) return;
        setConfig({
            ...config,
            thresholds: {
                ...config.thresholds,
                [category]: value
            }
        });
    };

    // Add blocklist item
    const addBlocklistItem = async () => {
        if (!newBlocklistItem.trim() || !config) return;
        const newList = [...(config.blocklist || []), newBlocklistItem.trim().toLowerCase()];
        
        try {
            const res = await fetch('/api/moderation/blocklist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ terms: newList })
            });
            if (res.ok) {
                setConfig({ ...config, blocklist: newList });
                setNewBlocklistItem('');
            }
        } catch (error) {
            console.error('Error updating blocklist:', error);
        }
    };

    // Remove blocklist item
    const removeBlocklistItem = async (term: string) => {
        if (!config) return;
        const newList = (config.blocklist || []).filter(t => t !== term);
        
        try {
            const res = await fetch('/api/moderation/blocklist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ terms: newList })
            });
            if (res.ok) {
                setConfig({ ...config, blocklist: newList });
            }
        } catch (error) {
            console.error('Error updating blocklist:', error);
        }
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
            if (next.has(itemId)) {
                next.delete(itemId);
            } else {
                next.add(itemId);
            }
            return next;
        });
    };

    // Toggle item selection
    const toggleSelected = (itemId: string) => {
        setSelectedItems(prev => {
            const next = new Set(prev);
            if (next.has(itemId)) {
                next.delete(itemId);
            } else {
                next.add(itemId);
            }
            return next;
        });
    };

    // Get category icon
    const getCategoryIcon = (category: string) => {
        switch (category.toLowerCase()) {
            case 'hate': return <AlertOctagon className="h-4 w-4" />;
            case 'sexual': return <Heart className="h-4 w-4" />;
            case 'violence': return <Flame className="h-4 w-4" />;
            case 'selfharm':
            case 'self-harm': return <Skull className="h-4 w-4" />;
            default: return <AlertTriangle className="h-4 w-4" />;
        }
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

    // Stats cards data
    const statsCards = [
        { label: 'Pending Review', value: stats.pending, icon: Clock, color: '#FFB800' },
        { label: 'Approved Today', value: stats.approved, icon: CheckCircle, color: '#00FF91' },
        { label: 'Rejected', value: stats.rejected, icon: XCircle, color: '#FF6B6B' },
        { label: 'Total Today', value: stats.todayTotal, icon: Shield, color: '#00D4FF' },
    ];

    const tabs = [
        { id: 'queue' as TabType, label: 'Review Queue', icon: MessageSquare, count: stats.pending },
        { id: 'settings' as TabType, label: 'Settings', icon: Settings, count: 0 },
        { id: 'blocklist' as TabType, label: 'Blocklist', icon: Filter, count: config?.blocklist?.length || 0 },
        { id: 'users' as TabType, label: 'Blocked Users', icon: Ban, count: 0 },
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
                            Content Moderation
                        </h1>
                        <p style={{ color: '#8394A7' }}>
                            AI-powered content safety with Azure AI Content Safety
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

                {/* Content */}
                {activeTab === 'queue' && (
                    <div className="space-y-4">
                        {/* Queue filters and actions */}
                        <div className="flex items-center justify-between">
                            <div className="flex gap-2">
                                {(['pending', 'approved', 'rejected', 'all'] as const).map((filter) => (
                                    <button
                                        key={filter}
                                        onClick={() => setQueueFilter(filter)}
                                        className={`px-3 py-1.5 rounded-lg text-sm capitalize ${
                                            queueFilter === filter ? 'bg-white/10' : 'hover:bg-white/5'
                                        }`}
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
                                    <span className="text-sm" style={{ color: '#8394A7' }}>
                                        {selectedItems.size} selected
                                    </span>
                                    <Button
                                        size="sm"
                                        onClick={() => bulkReview('approved')}
                                        className="rounded-lg"
                                        style={{ backgroundColor: '#00FF9120', color: '#00FF91' }}
                                    >
                                        <CheckCircle className="h-4 w-4 mr-1" />
                                        Approve All
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={() => bulkReview('rejected')}
                                        className="rounded-lg"
                                        style={{ backgroundColor: '#FF6B6B20', color: '#FF6B6B' }}
                                    >
                                        <XCircle className="h-4 w-4 mr-1" />
                                        Reject All
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Queue items */}
                        <Card
                            className="p-6"
                            style={{ 
                                backgroundColor: '#051323',
                                border: '1px solid rgba(255, 184, 0, 0.3)'
                            }}
                        >
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <RefreshCw className="h-8 w-8 animate-spin" style={{ color: '#00D4FF' }} />
                                </div>
                            ) : queue.length === 0 ? (
                                <div className="text-center py-12">
                                    <Shield className="h-12 w-12 mx-auto mb-4" style={{ color: '#00FF91' }} />
                                    <p className="text-lg" style={{ color: '#FFFFFF' }}>
                                        No items in queue
                                    </p>
                                    <p className="text-sm" style={{ color: '#8394A7' }}>
                                        All content has been reviewed
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {queue.map((item) => (
                                        <div 
                                            key={item.id}
                                            className="p-4 rounded-lg"
                                            style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
                                        >
                                            <div className="flex items-start gap-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedItems.has(item.id)}
                                                    onChange={() => toggleSelected(item.id)}
                                                    className="mt-1"
                                                />
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span 
                                                            className="text-xs px-2 py-0.5 rounded capitalize"
                                                            style={{ 
                                                                backgroundColor: item.status === 'pending' ? '#FFB80020' : 
                                                                               item.status === 'approved' ? '#00FF9120' : '#FF6B6B20',
                                                                color: item.status === 'pending' ? '#FFB800' : 
                                                                      item.status === 'approved' ? '#00FF91' : '#FF6B6B'
                                                            }}
                                                        >
                                                            {item.status}
                                                        </span>
                                                        <span className="text-xs" style={{ color: '#6B7280' }}>
                                                            {item.contentType} • {new Date(item.createdAt).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    
                                                    {/* Content preview */}
                                                    <div 
                                                        className="p-3 rounded-lg mb-3"
                                                        style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
                                                    >
                                                        <p className="text-sm" style={{ color: '#FFFFFF' }}>
                                                            {expandedItems.has(item.id) 
                                                                ? item.content 
                                                                : item.content.substring(0, 200) + (item.content.length > 200 ? '...' : '')}
                                                        </p>
                                                        {item.content.length > 200 && (
                                                            <button
                                                                onClick={() => toggleExpanded(item.id)}
                                                                className="text-xs mt-2 flex items-center gap-1"
                                                                style={{ color: '#00D4FF' }}
                                                            >
                                                                {expandedItems.has(item.id) ? (
                                                                    <>Show less <ChevronUp className="h-3 w-3" /></>
                                                                ) : (
                                                                    <>Show more <ChevronDown className="h-3 w-3" /></>
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* Violations */}
                                                    <div className="flex flex-wrap gap-2 mb-3">
                                                        {item.categories.map((cat, i) => (
                                                            <div 
                                                                key={i}
                                                                className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                                                                style={{ 
                                                                    backgroundColor: `${getSeverityColor(cat.severity)}20`,
                                                                    color: getSeverityColor(cat.severity)
                                                                }}
                                                            >
                                                                {getCategoryIcon(cat.category)}
                                                                <span className="capitalize">{cat.category}</span>
                                                                <span>({getSeverityLabel(cat.severity)})</span>
                                                            </div>
                                                        ))}
                                                        {item.blocklist.map((bl, i) => (
                                                            <div 
                                                                key={`bl-${i}`}
                                                                className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                                                                style={{ backgroundColor: '#FF6B6B20', color: '#FF6B6B' }}
                                                            >
                                                                <Filter className="h-3 w-3" />
                                                                <span>Blocklist: "{bl.text}"</span>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* User info */}
                                                    <div className="flex items-center gap-2 text-xs" style={{ color: '#8394A7' }}>
                                                        <Users className="h-3 w-3" />
                                                        <span>{item.userEmail}</span>
                                                        {item.channelId && (
                                                            <>
                                                                <span>•</span>
                                                                <span>Channel: {item.channelId}</span>
                                                            </>
                                                        )}
                                                    </div>

                                                    {/* Review notes input */}
                                                    {item.status === 'pending' && (
                                                        <div className="mt-3">
                                                            <input
                                                                type="text"
                                                                placeholder="Add notes (optional)"
                                                                value={reviewNotes[item.id] || ''}
                                                                onChange={(e) => setReviewNotes({ ...reviewNotes, [item.id]: e.target.value })}
                                                                className="w-full px-3 py-2 rounded-lg text-sm"
                                                                style={{ 
                                                                    backgroundColor: 'rgba(0,0,0,0.3)',
                                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                                    color: '#FFFFFF'
                                                                }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Actions */}
                                                {item.status === 'pending' && (
                                                    <div className="flex gap-2">
                                                        <Button 
                                                            size="sm"
                                                            onClick={() => reviewItem(item.id, 'approved')}
                                                            className="rounded-lg"
                                                            style={{ backgroundColor: '#00FF9120', color: '#00FF91' }}
                                                        >
                                                            <CheckCircle className="h-4 w-4" />
                                                        </Button>
                                                        <Button 
                                                            size="sm"
                                                            onClick={() => reviewItem(item.id, 'rejected')}
                                                            className="rounded-lg"
                                                            style={{ backgroundColor: '#FF6B6B20', color: '#FF6B6B' }}
                                                        >
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

                {activeTab === 'settings' && config && (
                    <div className="space-y-6">
                        {/* General Settings */}
                        <Card
                            className="p-6"
                            style={{ 
                                backgroundColor: '#051323',
                                border: '1px solid rgba(0, 212, 255, 0.3)'
                            }}
                        >
                            <h2 className="text-xl font-semibold mb-4" style={{ color: '#FFFFFF' }}>
                                General Settings
                            </h2>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                                    <div>
                                        <div className="font-medium" style={{ color: '#FFFFFF' }}>Content Moderation</div>
                                        <div className="text-sm" style={{ color: '#8394A7' }}>Enable AI-powered content safety checks</div>
                                    </div>
                                    <button
                                        onClick={() => setConfig({ ...config, enabled: !config.enabled })}
                                        className={`relative w-12 h-6 rounded-full transition-colors ${config.enabled ? 'bg-green-500' : 'bg-gray-600'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${config.enabled ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                                    <div>
                                        <div className="font-medium" style={{ color: '#FFFFFF' }}>Auto-Block Violations</div>
                                        <div className="text-sm" style={{ color: '#8394A7' }}>Automatically block content that exceeds thresholds</div>
                                    </div>
                                    <button
                                        onClick={() => setConfig({ ...config, autoBlock: !config.autoBlock })}
                                        className={`relative w-12 h-6 rounded-full transition-colors ${config.autoBlock ? 'bg-green-500' : 'bg-gray-600'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${config.autoBlock ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                                    <div>
                                        <div className="font-medium" style={{ color: '#FFFFFF' }}>Admin Notifications</div>
                                        <div className="text-sm" style={{ color: '#8394A7' }}>Send alerts to admins when content is flagged</div>
                                    </div>
                                    <button
                                        onClick={() => setConfig({ ...config, notifyAdmins: !config.notifyAdmins })}
                                        className={`relative w-12 h-6 rounded-full transition-colors ${config.notifyAdmins ? 'bg-green-500' : 'bg-gray-600'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${config.notifyAdmins ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>
                            </div>
                        </Card>

                        {/* Severity Thresholds */}
                        <Card
                            className="p-6"
                            style={{ 
                                backgroundColor: '#051323',
                                border: '1px solid rgba(255, 107, 107, 0.3)'
                            }}
                        >
                            <h2 className="text-xl font-semibold mb-2" style={{ color: '#FFFFFF' }}>
                                Severity Thresholds
                            </h2>
                            <p className="text-sm mb-6" style={{ color: '#8394A7' }}>
                                Content with severity at or above these levels will be flagged. 
                                <br />Levels: 0 (Safe), 2 (Low), 4 (Medium), 6 (High)
                            </p>
                            
                            <div className="space-y-6">
                                {Object.entries(config.thresholds).map(([category, value]) => {
                                    const categoryLabels: Record<string, { label: string; description: string; icon: typeof AlertOctagon }> = {
                                        hate: { label: 'Hate Speech', description: 'Content targeting protected characteristics', icon: AlertOctagon },
                                        sexual: { label: 'Sexual Content', description: 'Sexually explicit or suggestive content', icon: Heart },
                                        violence: { label: 'Violence', description: 'Violent or graphic content', icon: Flame },
                                        selfHarm: { label: 'Self-Harm', description: 'Content promoting self-harm or suicide', icon: Skull },
                                    };
                                    const info = categoryLabels[category];
                                    if (!info) return null;
                                    const Icon = info.icon;

                                    return (
                                        <div key={category} className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                                            <div className="flex items-center gap-3 mb-3">
                                                <div 
                                                    className="p-2 rounded-lg"
                                                    style={{ backgroundColor: `${getSeverityColor(value)}20` }}
                                                >
                                                    <Icon className="h-5 w-5" style={{ color: getSeverityColor(value) }} />
                                                </div>
                                                <div>
                                                    <div className="font-medium" style={{ color: '#FFFFFF' }}>{info.label}</div>
                                                    <div className="text-xs" style={{ color: '#8394A7' }}>{info.description}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="6"
                                                    step="2"
                                                    value={value}
                                                    onChange={(e) => updateThreshold(category as keyof ModerationConfig['thresholds'], parseInt(e.target.value))}
                                                    className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
                                                    style={{ 
                                                        background: `linear-gradient(to right, #00FF91, #FFB800, #FF8C00, #FF6B6B)`,
                                                        accentColor: getSeverityColor(value)
                                                    }}
                                                />
                                                <div 
                                                    className="px-3 py-1 rounded-lg text-sm font-medium min-w-[80px] text-center"
                                                    style={{ 
                                                        backgroundColor: `${getSeverityColor(value)}20`,
                                                        color: getSeverityColor(value)
                                                    }}
                                                >
                                                    {getSeverityLabel(value)}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>

                        {/* Save button */}
                        <div className="flex justify-end">
                            <Button
                                onClick={saveConfig}
                                disabled={saving}
                                className="rounded-lg px-6"
                                style={{ backgroundColor: '#00FF91', color: '#051323' }}
                            >
                                {saving ? (
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <Save className="h-4 w-4 mr-2" />
                                )}
                                Save Settings
                            </Button>
                        </div>
                    </div>
                )}

                {activeTab === 'blocklist' && config && (
                    <Card
                        className="p-6"
                        style={{ 
                            backgroundColor: '#051323',
                            border: '1px solid rgba(255, 107, 107, 0.3)'
                        }}
                    >
                        <h2 className="text-xl font-semibold mb-2" style={{ color: '#FFFFFF' }}>
                            Custom Blocklist
                        </h2>
                        <p className="text-sm mb-6" style={{ color: '#8394A7' }}>
                            Add words or phrases that should always be blocked, regardless of AI analysis.
                        </p>

                        {/* Add new term */}
                        <div className="flex gap-2 mb-6">
                            <input
                                type="text"
                                placeholder="Enter word or phrase to block..."
                                value={newBlocklistItem}
                                onChange={(e) => setNewBlocklistItem(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addBlocklistItem()}
                                className="flex-1 px-4 py-2 rounded-lg"
                                style={{ 
                                    backgroundColor: 'rgba(0,0,0,0.3)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: '#FFFFFF'
                                }}
                            />
                            <Button
                                onClick={addBlocklistItem}
                                className="rounded-lg"
                                style={{ backgroundColor: '#FF6B6B', color: '#FFFFFF' }}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add
                            </Button>
                        </div>

                        {/* Blocklist items */}
                        <div className="flex flex-wrap gap-2">
                            {(config.blocklist || []).map((term, index) => (
                                <div 
                                    key={index}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                                    style={{ backgroundColor: 'rgba(255, 107, 107, 0.2)' }}
                                >
                                    <Filter className="h-3 w-3" style={{ color: '#FF6B6B' }} />
                                    <span style={{ color: '#FFFFFF' }}>{term}</span>
                                    <button
                                        onClick={() => removeBlocklistItem(term)}
                                        className="ml-1 hover:bg-white/10 rounded p-0.5"
                                    >
                                        <X className="h-3 w-3" style={{ color: '#8394A7' }} />
                                    </button>
                                </div>
                            ))}
                            {(config.blocklist || []).length === 0 && (
                                <p className="text-sm" style={{ color: '#8394A7' }}>
                                    No blocked terms. Add words or phrases above to create your custom blocklist.
                                </p>
                            )}
                        </div>
                    </Card>
                )}

                {activeTab === 'users' && (
                    <Card
                        className="p-6"
                        style={{ 
                            backgroundColor: '#051323',
                            border: '1px solid rgba(255, 184, 0, 0.3)'
                        }}
                    >
                        <h2 className="text-xl font-semibold mb-4" style={{ color: '#FFFFFF' }}>
                            Blocked Users
                        </h2>
                        <div className="text-center py-12">
                            <Ban className="h-12 w-12 mx-auto mb-4" style={{ color: '#FFB800' }} />
                            <p className="text-lg" style={{ color: '#FFFFFF' }}>
                                No blocked users
                            </p>
                            <p className="text-sm" style={{ color: '#8394A7' }}>
                                Users who repeatedly violate community guidelines will appear here
                            </p>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
}
