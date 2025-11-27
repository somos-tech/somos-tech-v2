import { useState } from 'react';
import { 
    Ban, 
    Flag, 
    MessageSquare, 
    AlertTriangle, 
    CheckCircle, 
    XCircle,
    Eye,
    Filter,
    Users,
    Clock,
    Trash2,
    Shield,
    ThumbsUp,
    ThumbsDown
} from 'lucide-react';
import AdminBreadcrumbs from '@/components/AdminBreadcrumbs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Report {
    id: string;
    type: 'message' | 'user' | 'content';
    reason: string;
    reportedBy: string;
    target: string;
    status: 'pending' | 'resolved' | 'dismissed';
    timestamp: string;
}

export default function AdminModeration() {
    const [activeTab, setActiveTab] = useState<'reports' | 'banned' | 'filters'>('reports');
    
    const moderationStats = [
        { label: 'Pending Reports', value: '12', icon: Flag, color: '#FF6B6B' },
        { label: 'Resolved Today', value: '28', icon: CheckCircle, color: '#00FF91' },
        { label: 'Banned Users', value: '5', icon: Ban, color: '#FFB800' },
        { label: 'Auto-Blocked', value: '45', icon: Shield, color: '#00D4FF' },
    ];

    const pendingReports: Report[] = [
        { id: '1', type: 'message', reason: 'Spam', reportedBy: 'user1@gmail.com', target: 'Suspicious links in message', status: 'pending', timestamp: '5 min ago' },
        { id: '2', type: 'user', reason: 'Harassment', reportedBy: 'user2@gmail.com', target: 'user_problematic', status: 'pending', timestamp: '15 min ago' },
        { id: '3', type: 'content', reason: 'Inappropriate', reportedBy: 'user3@gmail.com', target: 'Post in #general', status: 'pending', timestamp: '1 hour ago' },
        { id: '4', type: 'message', reason: 'Misinformation', reportedBy: 'mod@somos.tech', target: 'False event details', status: 'pending', timestamp: '2 hours ago' },
    ];

    const bannedUsers = [
        { email: 'spammer@fake.com', reason: 'Repeated spam', bannedBy: 'admin', date: '2 days ago' },
        { email: 'troll123@gmail.com', reason: 'Harassment', bannedBy: 'moderator', date: '1 week ago' },
        { email: 'bot@suspicious.net', reason: 'Bot activity', bannedBy: 'system', date: '2 weeks ago' },
    ];

    const contentFilters = [
        { pattern: 'crypto scam keywords', type: 'Auto-block', matches: 156, enabled: true },
        { pattern: 'Profanity filter', type: 'Auto-flag', matches: 89, enabled: true },
        { pattern: 'External links', type: 'Require approval', matches: 234, enabled: true },
        { pattern: 'Competitor mentions', type: 'Auto-flag', matches: 12, enabled: false },
    ];

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'message': return MessageSquare;
            case 'user': return Users;
            default: return Flag;
        }
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
                            Moderation
                        </h1>
                        <p style={{ color: '#8394A7' }}>
                            Review reports, manage bans, and configure content filters
                        </p>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {moderationStats.map((stat) => {
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
                <div className="flex gap-2 mb-6">
                    {[
                        { id: 'reports', label: 'Reports Queue', icon: Flag, count: pendingReports.length },
                        { id: 'banned', label: 'Banned Users', icon: Ban, count: bannedUsers.length },
                        { id: 'filters', label: 'Content Filters', icon: Filter, count: contentFilters.length },
                    ].map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                                    activeTab === tab.id ? 'bg-white/10' : 'hover:bg-white/5'
                                }`}
                                style={{ 
                                    color: activeTab === tab.id ? '#00FF91' : '#8394A7',
                                    border: activeTab === tab.id ? '1px solid #00FF91' : '1px solid transparent'
                                }}
                            >
                                <Icon className="h-4 w-4" />
                                <span>{tab.label}</span>
                                <span 
                                    className="px-2 py-0.5 rounded-full text-xs"
                                    style={{ 
                                        backgroundColor: activeTab === tab.id ? '#00FF9120' : 'rgba(255,255,255,0.1)',
                                        color: activeTab === tab.id ? '#00FF91' : '#8394A7'
                                    }}
                                >
                                    {tab.count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Content */}
                {activeTab === 'reports' && (
                    <Card
                        className="p-6"
                        style={{ 
                            backgroundColor: '#051323',
                            border: '1px solid rgba(255, 107, 107, 0.3)'
                        }}
                    >
                        <h2 className="text-xl font-semibold mb-4" style={{ color: '#FFFFFF' }}>
                            Pending Reports
                        </h2>
                        <div className="space-y-4">
                            {pendingReports.map((report) => {
                                const TypeIcon = getTypeIcon(report.type);
                                return (
                                    <div 
                                        key={report.id}
                                        className="flex items-start gap-4 p-4 rounded-lg"
                                        style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
                                    >
                                        <div 
                                            className="p-2 rounded-lg"
                                            style={{ backgroundColor: 'rgba(255, 107, 107, 0.2)' }}
                                        >
                                            <TypeIcon className="h-5 w-5" style={{ color: '#FF6B6B' }} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-medium" style={{ color: '#FFFFFF' }}>
                                                    {report.reason}
                                                </span>
                                                <span 
                                                    className="text-xs px-2 py-0.5 rounded capitalize"
                                                    style={{ backgroundColor: '#FFB80020', color: '#FFB800' }}
                                                >
                                                    {report.type}
                                                </span>
                                            </div>
                                            <div className="text-sm mb-2" style={{ color: '#8394A7' }}>
                                                {report.target}
                                            </div>
                                            <div className="text-xs" style={{ color: '#6B7280' }}>
                                                Reported by {report.reportedBy} • {report.timestamp}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button 
                                                size="sm" 
                                                className="rounded-lg"
                                                style={{ backgroundColor: '#00FF9120', color: '#00FF91' }}
                                            >
                                                <ThumbsUp className="h-4 w-4" />
                                            </Button>
                                            <Button 
                                                size="sm"
                                                className="rounded-lg"
                                                style={{ backgroundColor: '#FF6B6B20', color: '#FF6B6B' }}
                                            >
                                                <ThumbsDown className="h-4 w-4" />
                                            </Button>
                                            <Button 
                                                size="sm"
                                                variant="ghost"
                                                className="rounded-lg"
                                                style={{ color: '#8394A7' }}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                )}

                {activeTab === 'banned' && (
                    <Card
                        className="p-6"
                        style={{ 
                            backgroundColor: '#051323',
                            border: '1px solid rgba(255, 184, 0, 0.3)'
                        }}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold" style={{ color: '#FFFFFF' }}>
                                Banned Users
                            </h2>
                            <Button 
                                className="rounded-lg"
                                style={{ backgroundColor: '#FFB800', color: '#051323' }}
                            >
                                <Ban className="h-4 w-4 mr-2" />
                                Add Ban
                            </Button>
                        </div>
                        <div className="space-y-3">
                            {bannedUsers.map((user, index) => (
                                <div 
                                    key={index}
                                    className="flex items-center justify-between p-4 rounded-lg"
                                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
                                >
                                    <div>
                                        <div className="font-medium" style={{ color: '#FFFFFF' }}>
                                            {user.email}
                                        </div>
                                        <div className="text-sm" style={{ color: '#8394A7' }}>
                                            {user.reason} • Banned by {user.bannedBy}
                                        </div>
                                        <div className="text-xs" style={{ color: '#6B7280' }}>
                                            {user.date}
                                        </div>
                                    </div>
                                    <Button 
                                        size="sm"
                                        variant="ghost"
                                        className="rounded-lg"
                                        style={{ color: '#00FF91' }}
                                    >
                                        Unban
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}

                {activeTab === 'filters' && (
                    <Card
                        className="p-6"
                        style={{ 
                            backgroundColor: '#051323',
                            border: '1px solid rgba(0, 212, 255, 0.3)'
                        }}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold" style={{ color: '#FFFFFF' }}>
                                Content Filters
                            </h2>
                            <Button 
                                className="rounded-lg"
                                style={{ backgroundColor: '#00D4FF', color: '#051323' }}
                            >
                                <Filter className="h-4 w-4 mr-2" />
                                Add Filter
                            </Button>
                        </div>
                        <div className="space-y-3">
                            {contentFilters.map((filter, index) => (
                                <div 
                                    key={index}
                                    className="flex items-center justify-between p-4 rounded-lg"
                                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
                                >
                                    <div className="flex-1">
                                        <div className="font-medium" style={{ color: '#FFFFFF' }}>
                                            {filter.pattern}
                                        </div>
                                        <div className="flex items-center gap-3 text-sm" style={{ color: '#8394A7' }}>
                                            <span>{filter.type}</span>
                                            <span>•</span>
                                            <span>{filter.matches} matches</span>
                                        </div>
                                    </div>
                                    <button
                                        className={`relative w-12 h-6 rounded-full transition-colors ${
                                            filter.enabled ? 'bg-green-500' : 'bg-gray-600'
                                        }`}
                                    >
                                        <div 
                                            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                                                filter.enabled ? 'left-7' : 'left-1'
                                            }`}
                                        />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
}
