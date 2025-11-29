/**
 * Admin Notifications Page - Send broadcasts to groups or all members
 * Supports email and push notification channels
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Send, 
    Mail, 
    Bell, 
    Users, 
    MapPin, 
    ChevronDown, 
    Check, 
    AlertCircle, 
    Loader2,
    Clock,
    ArrowLeft
} from 'lucide-react';
import { getBroadcastTargets, sendBroadcast, getBroadcastHistory } from '@/api/broadcastService';
import type { BroadcastTarget, BroadcastRecord, SendBroadcastDto } from '@/api/broadcastService';
import AdminQuickNav from '@/components/AdminQuickNav';

export default function AdminNotifications() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [targets, setTargets] = useState<BroadcastTarget[]>([]);
    const [history, setHistory] = useState<BroadcastRecord[]>([]);
    const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose');

    // Form state
    const [selectedTarget, setSelectedTarget] = useState<string>('all');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [channels, setChannels] = useState<('email' | 'push')[]>(['email', 'push']);
    const [showTargetDropdown, setShowTargetDropdown] = useState(false);

    // Result state
    const [result, setResult] = useState<{
        success: boolean;
        message: string;
        recipientCount?: number;
    } | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [targetsData, historyData] = await Promise.all([
                getBroadcastTargets().catch(() => ({ targets: [] })),
                getBroadcastHistory().catch(() => ({ broadcasts: [] }))
            ]);
            setTargets(targetsData.targets);
            setHistory(historyData.broadcasts);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChannelToggle = (channel: 'email' | 'push') => {
        setChannels(prev => 
            prev.includes(channel) 
                ? prev.filter(c => c !== channel)
                : [...prev, channel]
        );
    };

    const handleSend = async () => {
        if (!subject.trim() || !message.trim()) {
            setResult({ success: false, message: 'Please fill in subject and message' });
            return;
        }

        if (channels.length === 0) {
            setResult({ success: false, message: 'Please select at least one channel (Email or Push)' });
            return;
        }

        try {
            setSending(true);
            setResult(null);

            const targetInfo = targets.find(t => t.id === selectedTarget);
            const isGroupTarget = selectedTarget !== 'all';

            const data: SendBroadcastDto = {
                targetType: isGroupTarget ? 'group' : 'all',
                targetGroupId: isGroupTarget ? selectedTarget : undefined,
                subject: subject.trim(),
                message: message.trim(),
                channels
            };

            const response = await sendBroadcast(data);

            setResult({
                success: true,
                message: `Successfully sent to ${response.recipientCount} recipients`,
                recipientCount: response.recipientCount
            });

            // Reset form
            setSubject('');
            setMessage('');

            // Reload history
            const historyData = await getBroadcastHistory().catch(() => ({ broadcasts: [] }));
            setHistory(historyData.broadcasts);

        } catch (error) {
            setResult({
                success: false,
                message: error instanceof Error ? error.message : 'Failed to send broadcast'
            });
        } finally {
            setSending(false);
        }
    };

    const selectedTargetInfo = targets.find(t => t.id === selectedTarget);

    if (loading) {
        return (
            <div style={{ backgroundColor: '#051323', minHeight: '100vh' }} className="flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#00FF91' }} />
            </div>
        );
    }

    return (
        <div style={{ backgroundColor: '#051323', minHeight: '100vh' }}>
            {/* Quick Navigation */}
            <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-4">
                <AdminQuickNav />
            </div>
            
            {/* Header */}
            <div 
                className="border-b sticky top-16 z-40"
                style={{ backgroundColor: 'rgba(5, 19, 35, 0.95)', borderColor: 'rgba(0, 255, 145, 0.1)' }}
            >
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/admin')}
                            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-white" />
                        </button>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-white">Send Notifications</h1>
                            <p style={{ color: '#8394A7' }} className="text-sm mt-1">
                                Send emails and push notifications to your community
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setActiveTab('compose')}
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                            activeTab === 'compose' 
                                ? 'bg-[#00FF91] text-[#051323]' 
                                : 'text-white border border-white/20 hover:border-[#00FF91]'
                        }`}
                    >
                        <Send className="w-4 h-4 inline mr-2" />
                        Compose Message
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                            activeTab === 'history' 
                                ? 'bg-[#00FF91] text-[#051323]' 
                                : 'text-white border border-white/20 hover:border-[#00FF91]'
                        }`}
                    >
                        <Clock className="w-4 h-4 inline mr-2" />
                        History
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
                {activeTab === 'compose' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Compose Form */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Target Selection */}
                            <div
                                className="p-6 rounded-2xl border"
                                style={{ backgroundColor: '#0A1628', borderColor: 'rgba(0, 255, 145, 0.1)' }}
                            >
                                <h3 className="text-lg font-bold text-white mb-4">Recipients</h3>
                                
                                <div className="relative">
                                    <button
                                        onClick={() => setShowTargetDropdown(!showTargetDropdown)}
                                        className="w-full p-4 rounded-xl border flex items-center justify-between transition-colors hover:border-[#00FF91]"
                                        style={{ backgroundColor: '#051323', borderColor: 'rgba(0, 255, 145, 0.2)' }}
                                    >
                                        <div className="flex items-center gap-3">
                                            {selectedTarget === 'all' ? (
                                                <Users className="w-5 h-5" style={{ color: '#00FF91' }} />
                                            ) : (
                                                <MapPin className="w-5 h-5" style={{ color: '#00D4FF' }} />
                                            )}
                                            <div className="text-left">
                                                <p className="text-white font-medium">
                                                    {selectedTargetInfo?.name || 'All Members'}
                                                </p>
                                                <p className="text-xs" style={{ color: '#8394A7' }}>
                                                    {selectedTargetInfo?.description || 'Send to all registered members'}
                                                </p>
                                            </div>
                                        </div>
                                        <ChevronDown className="w-5 h-5 text-gray-400" />
                                    </button>

                                    {showTargetDropdown && (
                                        <div 
                                            className="absolute z-10 w-full mt-2 rounded-xl border shadow-lg max-h-64 overflow-y-auto"
                                            style={{ backgroundColor: '#0A1628', borderColor: 'rgba(0, 255, 145, 0.2)' }}
                                        >
                                            {targets.map((target) => (
                                                <button
                                                    key={target.id}
                                                    onClick={() => {
                                                        setSelectedTarget(target.id);
                                                        setShowTargetDropdown(false);
                                                    }}
                                                    className="w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-colors border-b last:border-b-0"
                                                    style={{ borderColor: 'rgba(255,255,255,0.05)' }}
                                                >
                                                    {target.id === 'all' ? (
                                                        <Users className="w-5 h-5" style={{ color: '#00FF91' }} />
                                                    ) : (
                                                        <MapPin className="w-5 h-5" style={{ color: '#00D4FF' }} />
                                                    )}
                                                    <div className="text-left flex-1">
                                                        <p className="text-white font-medium">{target.name}</p>
                                                        <p className="text-xs" style={{ color: '#8394A7' }}>
                                                            {target.description}
                                                            {target.memberCount !== null && ` • ${target.memberCount} members`}
                                                        </p>
                                                    </div>
                                                    {selectedTarget === target.id && (
                                                        <Check className="w-5 h-5" style={{ color: '#00FF91' }} />
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Message Compose */}
                            <div
                                className="p-6 rounded-2xl border"
                                style={{ backgroundColor: '#0A1628', borderColor: 'rgba(0, 255, 145, 0.1)' }}
                            >
                                <h3 className="text-lg font-bold text-white mb-4">Message</h3>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-white mb-2">Subject</label>
                                        <input
                                            type="text"
                                            value={subject}
                                            onChange={(e) => setSubject(e.target.value)}
                                            placeholder="Enter subject line..."
                                            className="w-full p-3 rounded-lg border text-white placeholder-gray-500 focus:outline-none focus:border-[#00FF91]"
                                            style={{ backgroundColor: '#051323', borderColor: 'rgba(0, 255, 145, 0.2)' }}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-white mb-2">Message</label>
                                        <textarea
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            placeholder="Write your message here..."
                                            rows={8}
                                            className="w-full p-3 rounded-lg border text-white placeholder-gray-500 focus:outline-none focus:border-[#00FF91] resize-none"
                                            style={{ backgroundColor: '#051323', borderColor: 'rgba(0, 255, 145, 0.2)' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Result Message */}
                            {result && (
                                <div
                                    className={`p-4 rounded-xl flex items-center gap-3 ${
                                        result.success ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'
                                    }`}
                                >
                                    {result.success ? (
                                        <Check className="w-5 h-5 text-green-500" />
                                    ) : (
                                        <AlertCircle className="w-5 h-5 text-red-500" />
                                    )}
                                    <p className={result.success ? 'text-green-400' : 'text-red-400'}>
                                        {result.message}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Channels */}
                            <div
                                className="p-6 rounded-2xl border"
                                style={{ backgroundColor: '#0A1628', borderColor: 'rgba(0, 255, 145, 0.1)' }}
                            >
                                <h3 className="text-lg font-bold text-white mb-4">Channels</h3>
                                
                                <div className="space-y-3">
                                    <button
                                        onClick={() => handleChannelToggle('email')}
                                        className={`w-full p-4 rounded-xl border flex items-center gap-3 transition-all ${
                                            channels.includes('email') 
                                                ? 'border-[#00FF91] bg-[#00FF91]/10' 
                                                : 'border-white/10 hover:border-white/20'
                                        }`}
                                    >
                                        <Mail className="w-5 h-5" style={{ color: channels.includes('email') ? '#00FF91' : '#8394A7' }} />
                                        <div className="text-left flex-1">
                                            <p className="text-white font-medium">Email</p>
                                            <p className="text-xs" style={{ color: '#8394A7' }}>Send via email</p>
                                        </div>
                                        {channels.includes('email') && (
                                            <Check className="w-5 h-5" style={{ color: '#00FF91' }} />
                                        )}
                                    </button>

                                    <button
                                        onClick={() => handleChannelToggle('push')}
                                        className={`w-full p-4 rounded-xl border flex items-center gap-3 transition-all ${
                                            channels.includes('push') 
                                                ? 'border-[#00D4FF] bg-[#00D4FF]/10' 
                                                : 'border-white/10 hover:border-white/20'
                                        }`}
                                    >
                                        <Bell className="w-5 h-5" style={{ color: channels.includes('push') ? '#00D4FF' : '#8394A7' }} />
                                        <div className="text-left flex-1">
                                            <p className="text-white font-medium">Push Notification</p>
                                            <p className="text-xs" style={{ color: '#8394A7' }}>In-app notification</p>
                                        </div>
                                        {channels.includes('push') && (
                                            <Check className="w-5 h-5" style={{ color: '#00D4FF' }} />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Send Button */}
                            <button
                                onClick={handleSend}
                                disabled={sending || !subject.trim() || !message.trim() || channels.length === 0}
                                className="w-full py-4 rounded-xl font-bold text-lg transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                                style={{ backgroundColor: '#00FF91', color: '#051323' }}
                            >
                                {sending ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-5 h-5" />
                                        Send Message
                                    </>
                                )}
                            </button>

                            {/* Help Text */}
                            <div 
                                className="p-4 rounded-xl text-sm"
                                style={{ backgroundColor: 'rgba(0, 212, 255, 0.1)', color: '#00D4FF' }}
                            >
                                <p className="font-medium mb-1">💡 Tips</p>
                                <ul className="list-disc list-inside text-xs space-y-1" style={{ color: '#8394A7' }}>
                                    <li>Email sends to all members' registered emails</li>
                                    <li>Push notifications appear in the bell icon</li>
                                    <li>Select a specific group to target local chapters</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* History Tab */
                    <div
                        className="rounded-2xl border overflow-hidden"
                        style={{ backgroundColor: '#0A1628', borderColor: 'rgba(0, 255, 145, 0.1)' }}
                    >
                        <div className="p-4 border-b" style={{ borderColor: 'rgba(0, 255, 145, 0.1)' }}>
                            <h3 className="text-lg font-bold text-white">Broadcast History</h3>
                        </div>

                        {history.length === 0 ? (
                            <div className="p-12 text-center">
                                <Clock className="w-12 h-12 mx-auto mb-4 opacity-30" style={{ color: '#8394A7' }} />
                                <p className="text-white font-medium">No broadcasts sent yet</p>
                                <p className="text-sm" style={{ color: '#8394A7' }}>
                                    Your broadcast history will appear here
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                                {history.map((broadcast) => (
                                    <div key={broadcast.id} className="p-4 hover:bg-white/5 transition-colors">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <p className="text-white font-medium">{broadcast.subject}</p>
                                                <p className="text-sm mt-1 line-clamp-2" style={{ color: '#8394A7' }}>
                                                    {broadcast.message}
                                                </p>
                                                <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: '#8394A7' }}>
                                                    <span className="flex items-center gap-1">
                                                        <Users className="w-3 h-3" />
                                                        {broadcast.targetName}
                                                    </span>
                                                    <span>{broadcast.recipientCount} recipients</span>
                                                    <span>
                                                        {new Date(broadcast.sentAt).toLocaleDateString()} at{' '}
                                                        {new Date(broadcast.sentAt).toLocaleTimeString()}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                {broadcast.channels.includes('email') && (
                                                    <span 
                                                        className="px-2 py-1 rounded text-xs font-medium"
                                                        style={{ backgroundColor: 'rgba(0, 255, 145, 0.1)', color: '#00FF91' }}
                                                    >
                                                        Email
                                                    </span>
                                                )}
                                                {broadcast.channels.includes('push') && (
                                                    <span 
                                                        className="px-2 py-1 rounded text-xs font-medium"
                                                        style={{ backgroundColor: 'rgba(0, 212, 255, 0.1)', color: '#00D4FF' }}
                                                    >
                                                        Push
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
