/**
 * Admin Announcements Page - Manage email subscriptions, contacts, and newsletters
 * 
 * Features:
 * - Create and send email announcements
 * - Import/manage email contacts
 * - View subscription statistics
 * - Announcement history with metrics
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Send, 
    Mail, 
    Users, 
    Upload, 
    Download,
    ChevronDown, 
    Check, 
    AlertCircle, 
    Loader2,
    Clock,
    ArrowLeft,
    Plus,
    Trash2,
    Edit3,
    Eye,
    BarChart3,
    FileText,
    UserPlus,
    Search,
    Filter,
    MoreVertical,
    Megaphone,
    Calendar,
    Newspaper,
    AlertTriangle,
    CheckCircle,
    XCircle,
    RefreshCw,
    MapPin,
    Globe,
    Bell
} from 'lucide-react';
import AdminQuickNav from '@/components/AdminQuickNav';

// API base for direct fetch calls
const API_BASE = '/api';

// Types
interface Contact {
    id: string;
    email: string;
    name?: string;
    source: 'signup' | 'admin_import' | 'csv_import';
    status: 'active' | 'unsubscribed' | 'bounced';
    linkedUserId?: string;
    subscriptions: {
        newsletters: boolean;
        events: boolean;
        announcements: boolean;
    };
    createdAt: string;
    lastEmailSentAt?: string;
    emailCount?: number;
}

interface Announcement {
    id: string;
    title: string;
    content: string;
    type: 'general' | 'event' | 'newsletter' | 'urgent';
    status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
    isPublic: boolean;
    ctaText?: string;
    ctaUrl?: string;
    targetAudience?: string;
    createdAt: string;
    sentAt?: string;
    sendResults?: {
        totalRecipients: number;
        sent: number;
        failed: number;
    };
    createdBy?: {
        email: string;
    };
}

interface CommunityGroup {
    id: string;
    name: string;
    city?: string;
    memberCount: number;
}

interface SubscriptionStats {
    total: number;
    active: number;
    newsletters: number;
    events: number;
    announcements: number;
}

// Constants
const ANNOUNCEMENT_TYPES = [
    { value: 'general', label: 'General', icon: Megaphone, color: '#00FF91' },
    { value: 'event', label: 'Event', icon: Calendar, color: '#00D4FF' },
    { value: 'newsletter', label: 'Newsletter', icon: Newspaper, color: '#FF6B9D' },
    { value: 'urgent', label: 'Urgent', icon: AlertTriangle, color: '#FF4444' }
];

export default function AdminAnnouncements() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'announcements' | 'contacts' | 'stats'>('announcements');
    
    // Announcements state
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [showComposer, setShowComposer] = useState(false);
    const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
    
    // Contacts state
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [contactsPage, setContactsPage] = useState(1);
    const [contactsTotal, setContactsTotal] = useState(0);
    const [contactSearch, setContactSearch] = useState('');
    const [showImportModal, setShowImportModal] = useState(false);
    
    // Groups state for targeting
    const [groups, setGroups] = useState<CommunityGroup[]>([]);
    
    // Stats state
    const [stats, setStats] = useState<SubscriptionStats | null>(null);
    
    // Form state for composer
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        type: 'general' as Announcement['type'],
        isPublic: true,
        ctaText: '',
        ctaUrl: '',
        targetAudience: 'all',
        deliveryMethod: 'email' as 'email' | 'push' | 'both'
    });
    const [sending, setSending] = useState(false);
    const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Load initial data
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            await Promise.all([
                loadAnnouncements(),
                loadContacts(),
                loadStats(),
                loadGroups()
            ]);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadAnnouncements = async () => {
        try {
            const response = await fetch(`${API_BASE}/announcements`, { credentials: 'include' });
            if (!response.ok) throw new Error('Failed to load');
            const data = await response.json();
            setAnnouncements(data.announcements || []);
        } catch (error) {
            console.error('Failed to load announcements:', error);
        }
    };

    const loadContacts = async (search?: string) => {
        try {
            const params = new URLSearchParams();
            params.set('limit', '50');
            params.set('offset', String((contactsPage - 1) * 50));
            if (search) params.set('search', search);
            
            const response = await fetch(`${API_BASE}/email/contacts?${params}`, { credentials: 'include' });
            if (!response.ok) throw new Error('Failed to load');
            const data = await response.json();
            setContacts(data.contacts || []);
            setContactsTotal(data.total || 0);
        } catch (error) {
            console.error('Failed to load contacts:', error);
        }
    };

    const loadStats = async () => {
        try {
            const statsResponse = await fetch(`${API_BASE}/email/contacts/stats`, { credentials: 'include' });
            if (statsResponse.ok) {
                const data = await statsResponse.json();
                setStats(data);
            }
        } catch (error) {
            // Stats endpoint might not exist yet, compute from contacts
            console.log('Stats endpoint not available, using defaults');
            setStats({
                total: contactsTotal,
                active: contacts.filter(c => c.status === 'active').length,
                newsletters: contacts.filter(c => c.subscriptions?.newsletters).length,
                events: contacts.filter(c => c.subscriptions?.events).length,
                announcements: contacts.filter(c => c.subscriptions?.announcements).length
            });
        }
    };

    const loadGroups = async () => {
        try {
            const response = await fetch(`${API_BASE}/community-groups`, { credentials: 'include' });
            if (!response.ok) throw new Error('Failed to load groups');
            const data = await response.json();
            const groupsList = data.groups || data.data?.groups || [];
            setGroups(groupsList);
        } catch (error) {
            console.error('Failed to load groups:', error);
        }
    };

    // Handle search with debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            loadContacts(contactSearch);
        }, 300);
        return () => clearTimeout(timer);
    }, [contactSearch, contactsPage]);

    // Announcement actions
    const handleSaveAnnouncement = async (send = false) => {
        if (!formData.title.trim() || !formData.content.trim()) {
            setSaveStatus({ type: 'error', message: 'Title and content are required' });
            return;
        }

        try {
            setSending(true);
            setSaveStatus(null);

            let announcement: Announcement;

            if (editingAnnouncement) {
                // Update existing
                const response = await fetch(`${API_BASE}/announcements/${editingAnnouncement.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(formData)
                });
                if (!response.ok) throw new Error('Failed to update');
                const data = await response.json();
                announcement = data.announcement;
            } else {
                // Create new
                const response = await fetch(`${API_BASE}/announcements`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(formData)
                });
                if (!response.ok) throw new Error('Failed to create');
                const data = await response.json();
                announcement = data.announcement;
            }

            if (send) {
                // Preview first
                const previewResponse = await fetch(`${API_BASE}/announcements/${announcement.id}/send`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ preview: true })
                });
                if (!previewResponse.ok) throw new Error('Failed to preview');
                const previewData = await previewResponse.json();
                const recipientCount = previewData.recipientCount;

                if (recipientCount === 0) {
                    setSaveStatus({ type: 'error', message: 'No eligible recipients found' });
                    setSending(false);
                    return;
                }

                // Confirm and send
                if (confirm(`This will send to ${recipientCount} recipients. Continue?`)) {
                    const sendResponse = await fetch(`${API_BASE}/announcements/${announcement.id}/send`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({})
                    });
                    if (!sendResponse.ok) throw new Error('Failed to send');
                    const sendData = await sendResponse.json();
                    setSaveStatus({ 
                        type: 'success', 
                        message: sendData.message || `Sent to ${sendData.results?.sent} recipients`
                    });
                }
            } else {
                setSaveStatus({ type: 'success', message: 'Draft saved successfully' });
            }

            // Reset form
            setFormData({ title: '', content: '', type: 'general', isPublic: true, ctaText: '', ctaUrl: '', targetAudience: 'all', deliveryMethod: 'email' });
            setShowComposer(false);
            setEditingAnnouncement(null);
            await loadAnnouncements();

        } catch (error: any) {
            setSaveStatus({ 
                type: 'error', 
                message: error.message || 'Failed to save announcement'
            });
        } finally {
            setSending(false);
        }
    };

    const handleDeleteAnnouncement = async (id: string) => {
        if (!confirm('Delete this draft announcement?')) return;
        
        try {
            const response = await fetch(`${API_BASE}/announcements/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to delete');
            }
            await loadAnnouncements();
        } catch (error: any) {
            alert(error.message || 'Failed to delete announcement');
        }
    };

    const handleEditAnnouncement = (announcement: Announcement) => {
        setEditingAnnouncement(announcement);
        setFormData({
            title: announcement.title,
            content: announcement.content,
            type: announcement.type,
            isPublic: announcement.isPublic,
            ctaText: announcement.ctaText || '',
            ctaUrl: announcement.ctaUrl || '',
            targetAudience: announcement.targetAudience || 'all',
            deliveryMethod: (announcement as any).deliveryMethod || 'email'
        });
        setShowComposer(true);
    };

    // Contact import
    const handleImportContacts = async (emails: string) => {
        try {
            const emailList = emails.split(/[\n,;]/)
                .map(e => e.trim())
                .filter(e => e && e.includes('@'));

            if (emailList.length === 0) {
                alert('No valid emails found');
                return;
            }

            const contacts = emailList.map(email => ({
                email,
                subscriptions: { newsletters: true, events: true, announcements: true }
            }));

            const response = await fetch(`${API_BASE}/email/contacts/import`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ contacts })
            });
            
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to import');
            }
            
            const data = await response.json();
            alert(`Imported ${data.created} new contacts. ${data.skipped} already existed.`);
            setShowImportModal(false);
            await loadContacts();
        } catch (error: any) {
            alert(error.message || 'Failed to import contacts');
        }
    };

    // Delete contact
    const handleDeleteContact = async (id: string) => {
        if (!confirm('Remove this contact?')) return;
        
        try {
            const response = await fetch(`${API_BASE}/email/contacts/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to delete');
            }
            await loadContacts();
        } catch (error: any) {
            alert(error.message || 'Failed to delete contact');
        }
    };

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
            <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4">
                <AdminQuickNav />
            </div>
            
            {/* Header */}
            <div 
                className="border-b sticky top-16 z-40"
                style={{ backgroundColor: 'rgba(5, 19, 35, 0.95)', borderColor: 'rgba(0, 255, 145, 0.1)' }}
            >
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/admin')}
                                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5 text-white" />
                            </button>
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
                                    <Mail className="w-8 h-8" style={{ color: '#00FF91' }} />
                                    Email Announcements
                                </h1>
                                <p style={{ color: '#8394A7' }} className="text-sm mt-1">
                                    Manage email contacts, subscriptions, and send newsletters
                                </p>
                            </div>
                        </div>
                        
                        <button
                            onClick={() => setShowComposer(true)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all"
                            style={{ backgroundColor: '#00FF91', color: '#051323' }}
                        >
                            <Plus className="w-5 h-5" />
                            New Announcement
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    {[
                        { id: 'announcements', label: 'Announcements', icon: Megaphone },
                        { id: 'contacts', label: 'Contacts', icon: Users },
                        { id: 'stats', label: 'Statistics', icon: BarChart3 }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap flex items-center gap-2 ${
                                activeTab === tab.id 
                                    ? 'bg-[#00FF91] text-[#051323]' 
                                    : 'text-white border border-white/20 hover:border-[#00FF91]'
                            }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Status Message */}
            {saveStatus && (
                <div className="max-w-6xl mx-auto px-4 sm:px-6">
                    <div 
                        className={`p-4 rounded-lg flex items-center gap-3 mb-4 ${
                            saveStatus.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}
                    >
                        {saveStatus.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                        {saveStatus.message}
                        <button onClick={() => setSaveStatus(null)} className="ml-auto hover:opacity-70">×</button>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
                
                {/* Announcements Tab */}
                {activeTab === 'announcements' && (
                    <div className="space-y-4">
                        {/* Composer Modal */}
                        {showComposer && (
                            <div 
                                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                                style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
                            >
                                <div 
                                    className="w-full max-w-2xl rounded-2xl border overflow-hidden max-h-[90vh] overflow-y-auto"
                                    style={{ backgroundColor: '#0A1628', borderColor: 'rgba(0, 255, 145, 0.2)' }}
                                >
                                    <div className="p-6 border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-xl font-bold text-white">
                                                {editingAnnouncement ? 'Edit Announcement' : 'New Announcement'}
                                            </h2>
                                            <button 
                                                onClick={() => {
                                                    setShowComposer(false);
                                                    setEditingAnnouncement(null);
                                                    setFormData({ title: '', content: '', type: 'general', isPublic: true, ctaText: '', ctaUrl: '', targetAudience: 'all', deliveryMethod: 'email' });
                                                }}
                                                className="text-gray-400 hover:text-white"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="p-6 space-y-4">
                                        {/* Delivery Method */}
                                        <div>
                                            <label className="block text-sm font-medium text-white mb-2">Delivery Method</label>
                                            <div className="flex gap-2 flex-wrap">
                                                <button
                                                    onClick={() => setFormData(f => ({ ...f, deliveryMethod: 'email' }))}
                                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                                                        formData.deliveryMethod === 'email'
                                                            ? 'bg-[#00D4FF] text-[#051323]'
                                                            : 'text-white border border-white/20 hover:border-white/40'
                                                    }`}
                                                >
                                                    <Mail className="w-4 h-4" />
                                                    Send Email
                                                </button>
                                                <button
                                                    onClick={() => setFormData(f => ({ ...f, deliveryMethod: 'push' }))}
                                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                                                        formData.deliveryMethod === 'push'
                                                            ? 'bg-[#00FF91] text-[#051323]'
                                                            : 'text-white border border-white/20 hover:border-white/40'
                                                    }`}
                                                >
                                                    <Bell className="w-4 h-4" />
                                                    Push Notification
                                                </button>
                                                <button
                                                    onClick={() => setFormData(f => ({ ...f, deliveryMethod: 'both' }))}
                                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                                                        formData.deliveryMethod === 'both'
                                                            ? 'bg-gradient-to-r from-[#00D4FF] to-[#00FF91] text-[#051323]'
                                                            : 'text-white border border-white/20 hover:border-white/40'
                                                    }`}
                                                >
                                                    <Mail className="w-4 h-4" />
                                                    <Bell className="w-4 h-4" />
                                                    Both
                                                </button>
                                            </div>
                                            <p className="mt-1 text-xs text-gray-500">
                                                {formData.deliveryMethod === 'email' && 'Send announcement via email to subscribed contacts'}
                                                {formData.deliveryMethod === 'push' && 'Send in-app push notification (appears in notification bell)'}
                                                {formData.deliveryMethod === 'both' && 'Send both email and push notification'}
                                            </p>
                                        </div>

                                        {/* Type Selection */}
                                        <div>
                                            <label className="block text-sm font-medium text-white mb-2">Type</label>
                                            <div className="flex gap-2 flex-wrap">
                                                {ANNOUNCEMENT_TYPES.map(type => (
                                                    <button
                                                        key={type.value}
                                                        onClick={() => setFormData(f => ({ ...f, type: type.value as any }))}
                                                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                                                            formData.type === type.value
                                                                ? 'text-[#051323]'
                                                                : 'text-white border border-white/20 hover:border-white/40'
                                                        }`}
                                                        style={formData.type === type.value ? { backgroundColor: type.color } : {}}
                                                    >
                                                        <type.icon className="w-4 h-4" />
                                                        {type.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Target Audience */}
                                        <div>
                                            <label className="block text-sm font-medium text-white mb-2">Target Audience</label>
                                            <div className="flex gap-2 flex-wrap">
                                                <button
                                                    onClick={() => setFormData(f => ({ ...f, targetAudience: 'all' }))}
                                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                                                        formData.targetAudience === 'all'
                                                            ? 'bg-[#00FF91] text-[#051323]'
                                                            : 'text-white border border-white/20 hover:border-white/40'
                                                    }`}
                                                >
                                                    <Globe className="w-4 h-4" />
                                                    All Subscribers
                                                </button>
                                                {groups.map(group => (
                                                    <button
                                                        key={group.id}
                                                        onClick={() => setFormData(f => ({ ...f, targetAudience: group.id }))}
                                                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                                                            formData.targetAudience === group.id
                                                                ? 'bg-[#00D4FF] text-[#051323]'
                                                                : 'text-white border border-white/20 hover:border-white/40'
                                                        }`}
                                                    >
                                                        <MapPin className="w-4 h-4" />
                                                        {group.city || group.name}
                                                        {group.memberCount > 0 && (
                                                            <span className="text-xs opacity-75">({group.memberCount})</span>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                            <p className="mt-1 text-xs text-gray-500">
                                                {formData.targetAudience === 'all' 
                                                    ? 'Email will be sent to all subscribed contacts' 
                                                    : `Email will be sent only to members of this group`}
                                            </p>
                                        </div>

                                        {/* Title */}
                                        <div>
                                            <label className="block text-sm font-medium text-white mb-2">Title *</label>
                                            <input
                                                type="text"
                                                value={formData.title}
                                                onChange={(e) => setFormData(f => ({ ...f, title: e.target.value }))}
                                                placeholder="Announcement title..."
                                                className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00FF91]"
                                                style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                                            />
                                        </div>

                                        {/* Content */}
                                        <div>
                                            <label className="block text-sm font-medium text-white mb-2">Message *</label>
                                            <textarea
                                                value={formData.content}
                                                onChange={(e) => setFormData(f => ({ ...f, content: e.target.value }))}
                                                placeholder="Write your announcement message..."
                                                rows={6}
                                                className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 resize-none"
                                                style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
                                            />
                                        </div>

                                        {/* CTA */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-white mb-2">Button Text (optional)</label>
                                                <input
                                                    type="text"
                                                    value={formData.ctaText}
                                                    onChange={(e) => setFormData(f => ({ ...f, ctaText: e.target.value }))}
                                                    placeholder="e.g., Learn More"
                                                    className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-500 focus:outline-none"
                                                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-white mb-2">Button URL</label>
                                                <input
                                                    type="url"
                                                    value={formData.ctaUrl}
                                                    onChange={(e) => setFormData(f => ({ ...f, ctaUrl: e.target.value }))}
                                                    placeholder="https://..."
                                                    className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-500 focus:outline-none"
                                                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                                                />
                                            </div>
                                        </div>

                                        {/* Public Toggle */}
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                id="isPublic"
                                                checked={formData.isPublic}
                                                onChange={(e) => setFormData(f => ({ ...f, isPublic: e.target.checked }))}
                                                className="w-4 h-4 rounded"
                                            />
                                            <label htmlFor="isPublic" className="text-sm text-gray-300">
                                                Show on public announcements page after sending
                                            </label>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="p-6 border-t flex gap-3 justify-end" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                                        <button
                                            onClick={() => handleSaveAnnouncement(false)}
                                            disabled={sending}
                                            className="px-4 py-2 rounded-lg font-medium text-white border border-white/20 hover:border-white/40 transition-all disabled:opacity-50"
                                        >
                                            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Draft'}
                                        </button>
                                        <button
                                            onClick={() => handleSaveAnnouncement(true)}
                                            disabled={sending}
                                            className="px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50 flex items-center gap-2"
                                            style={{ backgroundColor: '#00FF91', color: '#051323' }}
                                        >
                                            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                            Send Now
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Announcements List */}
                        {announcements.length === 0 ? (
                            <div className="text-center py-16">
                                <Mail className="w-16 h-16 mx-auto mb-4 opacity-30" style={{ color: '#00FF91' }} />
                                <h3 className="text-xl font-semibold text-white mb-2">No announcements yet</h3>
                                <p style={{ color: '#8394A7' }} className="mb-6">Create your first email announcement to reach your community</p>
                                <button
                                    onClick={() => setShowComposer(true)}
                                    className="px-6 py-3 rounded-lg font-medium inline-flex items-center gap-2"
                                    style={{ backgroundColor: '#00FF91', color: '#051323' }}
                                >
                                    <Plus className="w-5 h-5" />
                                    Create Announcement
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {announcements.map(announcement => {
                                    const typeInfo = ANNOUNCEMENT_TYPES.find(t => t.value === announcement.type);
                                    const TypeIcon = typeInfo?.icon || Megaphone;
                                    
                                    return (
                                        <div 
                                            key={announcement.id}
                                            className="p-4 rounded-xl border transition-all hover:border-[#00FF91]/30"
                                            style={{ backgroundColor: '#0A1628', borderColor: 'rgba(255, 255, 255, 0.1)' }}
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex items-start gap-3">
                                                    <div 
                                                        className="p-2 rounded-lg"
                                                        style={{ backgroundColor: `${typeInfo?.color || '#00FF91'}20` }}
                                                    >
                                                        <TypeIcon className="w-5 h-5" style={{ color: typeInfo?.color || '#00FF91' }} />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-white">{announcement.title}</h3>
                                                        <p className="text-sm mt-1 line-clamp-2" style={{ color: '#8394A7' }}>
                                                            {announcement.content}
                                                        </p>
                                                        <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: '#5A6F82' }}>
                                                            <span className={`px-2 py-0.5 rounded-full ${
                                                                announcement.status === 'sent' ? 'bg-green-500/20 text-green-400' :
                                                                announcement.status === 'draft' ? 'bg-yellow-500/20 text-yellow-400' :
                                                                announcement.status === 'sending' ? 'bg-blue-500/20 text-blue-400' :
                                                                'bg-red-500/20 text-red-400'
                                                            }`}>
                                                                {announcement.status.toUpperCase()}
                                                            </span>
                                                            {announcement.sentAt && (
                                                                <span>
                                                                    Sent {new Date(announcement.sentAt).toLocaleDateString()}
                                                                </span>
                                                            )}
                                                            {announcement.sendResults && (
                                                                <span>
                                                                    {announcement.sendResults.sent}/{announcement.sendResults.totalRecipients} delivered
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-2">
                                                    {announcement.status === 'draft' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleEditAnnouncement(announcement)}
                                                                className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
                                                                title="Edit"
                                                            >
                                                                <Edit3 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteAnnouncement(announcement.id)}
                                                                className="p-2 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400"
                                                                title="Delete"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Contacts Tab */}
                {activeTab === 'contacts' && (
                    <div className="space-y-4">
                        {/* Toolbar */}
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div className="relative flex-1 min-w-[200px] max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={contactSearch}
                                    onChange={(e) => setContactSearch(e.target.value)}
                                    placeholder="Search contacts..."
                                    className="w-full pl-10 pr-4 py-2.5 rounded-lg text-white placeholder-gray-500 focus:outline-none"
                                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                                />
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => loadContacts(contactSearch)}
                                    className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
                                    title="Refresh"
                                >
                                    <RefreshCw className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => setShowImportModal(true)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white border border-white/20 hover:border-[#00FF91] transition-all"
                                >
                                    <Upload className="w-4 h-4" />
                                    Import
                                </button>
                            </div>
                        </div>

                        {/* Import Modal */}
                        {showImportModal && (
                            <div 
                                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                                style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
                            >
                                <div 
                                    className="w-full max-w-lg rounded-2xl border overflow-hidden"
                                    style={{ backgroundColor: '#0A1628', borderColor: 'rgba(0, 255, 145, 0.2)' }}
                                >
                                    <div className="p-6 border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-xl font-bold text-white">Import Contacts</h2>
                                            <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-white">×</button>
                                        </div>
                                    </div>
                                    
                                    <form onSubmit={(e) => {
                                        e.preventDefault();
                                        const textarea = e.currentTarget.querySelector('textarea');
                                        if (textarea) handleImportContacts(textarea.value);
                                    }}>
                                        <div className="p-6">
                                            <p className="text-sm text-gray-400 mb-4">
                                                Paste email addresses below, one per line or separated by commas. 
                                                They will be added to your contact list with all subscriptions enabled.
                                            </p>
                                            <textarea
                                                name="emails"
                                                rows={8}
                                                placeholder="email1@example.com&#10;email2@example.com&#10;email3@example.com"
                                                className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-500 focus:outline-none resize-none"
                                                style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                                            />
                                            <p className="text-xs text-gray-500 mt-2">
                                                Note: If an imported email matches a future user signup, the contact will be automatically linked.
                                            </p>
                                        </div>
                                        <div className="p-6 border-t flex justify-end gap-3" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                                            <button
                                                type="button"
                                                onClick={() => setShowImportModal(false)}
                                                className="px-4 py-2 rounded-lg font-medium text-white border border-white/20"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                className="px-4 py-2 rounded-lg font-medium flex items-center gap-2"
                                                style={{ backgroundColor: '#00FF91', color: '#051323' }}
                                            >
                                                <UserPlus className="w-4 h-4" />
                                                Import Contacts
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}

                        {/* Contacts Table */}
                        <div 
                            className="rounded-xl border overflow-hidden"
                            style={{ backgroundColor: '#0A1628', borderColor: 'rgba(255, 255, 255, 0.1)' }}
                        >
                            <table className="w-full">
                                <thead>
                                    <tr style={{ backgroundColor: 'rgba(0, 255, 145, 0.05)' }}>
                                        <th className="text-left px-4 py-3 text-sm font-medium text-white">Email</th>
                                        <th className="text-left px-4 py-3 text-sm font-medium text-white">Source</th>
                                        <th className="text-left px-4 py-3 text-sm font-medium text-white">Subscriptions</th>
                                        <th className="text-left px-4 py-3 text-sm font-medium text-white">Status</th>
                                        <th className="text-right px-4 py-3 text-sm font-medium text-white">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {contacts.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                                                No contacts found. Import some contacts to get started.
                                            </td>
                                        </tr>
                                    ) : contacts.map(contact => (
                                        <tr 
                                            key={contact.id} 
                                            className="border-t hover:bg-white/5"
                                            style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}
                                        >
                                            <td className="px-4 py-3">
                                                <div>
                                                    <p className="text-white font-medium">{contact.email}</p>
                                                    {contact.name && <p className="text-xs text-gray-400">{contact.name}</p>}
                                                    {contact.linkedUserId && (
                                                        <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
                                                            Linked User
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-400">
                                                {contact.source === 'signup' ? 'User Signup' :
                                                 contact.source === 'admin_import' ? 'Admin Import' : 'CSV Import'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex gap-1">
                                                    {contact.subscriptions?.newsletters && (
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-400">News</span>
                                                    )}
                                                    {contact.subscriptions?.events && (
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400">Events</span>
                                                    )}
                                                    {contact.subscriptions?.announcements && (
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">Announce</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                    contact.status === 'active' ? 'bg-green-500/20 text-green-400' :
                                                    contact.status === 'unsubscribed' ? 'bg-yellow-500/20 text-yellow-400' :
                                                    'bg-red-500/20 text-red-400'
                                                }`}>
                                                    {contact.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={() => handleDeleteContact(contact.id)}
                                                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400"
                                                    title="Remove"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        
                        {/* Pagination */}
                        {contactsTotal > 50 && (
                            <div className="flex items-center justify-between text-sm text-gray-400">
                                <span>Showing {((contactsPage - 1) * 50) + 1}-{Math.min(contactsPage * 50, contactsTotal)} of {contactsTotal}</span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setContactsPage(p => Math.max(1, p - 1))}
                                        disabled={contactsPage === 1}
                                        className="px-3 py-1 rounded border border-white/20 hover:border-white/40 disabled:opacity-50"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => setContactsPage(p => p + 1)}
                                        disabled={contactsPage * 50 >= contactsTotal}
                                        className="px-3 py-1 rounded border border-white/20 hover:border-white/40 disabled:opacity-50"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Stats Tab */}
                {activeTab === 'stats' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            label="Total Contacts"
                            value={stats?.total || contactsTotal}
                            icon={Users}
                            color="#00FF91"
                        />
                        <StatCard
                            label="Newsletter Subscribers"
                            value={stats?.newsletters || 0}
                            icon={Newspaper}
                            color="#FF6B9D"
                        />
                        <StatCard
                            label="Event Subscribers"
                            value={stats?.events || 0}
                            icon={Calendar}
                            color="#00D4FF"
                        />
                        <StatCard
                            label="Announcement Subscribers"
                            value={stats?.announcements || 0}
                            icon={Megaphone}
                            color="#FFC107"
                        />

                        {/* Recent Activity */}
                        <div 
                            className="col-span-full p-6 rounded-xl border"
                            style={{ backgroundColor: '#0A1628', borderColor: 'rgba(255, 255, 255, 0.1)' }}
                        >
                            <h3 className="font-semibold text-white mb-4">Recent Announcements</h3>
                            {announcements.filter(a => a.status === 'sent').slice(0, 5).length === 0 ? (
                                <p className="text-gray-400">No announcements sent yet</p>
                            ) : (
                                <div className="space-y-3">
                                    {announcements.filter(a => a.status === 'sent').slice(0, 5).map(ann => (
                                        <div key={ann.id} className="flex items-center justify-between py-2 border-b border-white/5">
                                            <div>
                                                <p className="text-white font-medium">{ann.title}</p>
                                                <p className="text-xs text-gray-400">
                                                    {new Date(ann.sentAt!).toLocaleDateString()} • 
                                                    {ann.sendResults?.sent || 0} recipients
                                                </p>
                                            </div>
                                            <div className="text-right text-sm">
                                                <span className="text-green-400">
                                                    {ann.sendResults ? 
                                                        Math.round((ann.sendResults.sent / ann.sendResults.totalRecipients) * 100) 
                                                        : 100}% delivered
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// Stat Card Component
function StatCard({ label, value, icon: Icon, color }: { 
    label: string; 
    value: number; 
    icon: any; 
    color: string; 
}) {
    return (
        <div 
            className="p-6 rounded-xl border"
            style={{ backgroundColor: '#0A1628', borderColor: 'rgba(255, 255, 255, 0.1)' }}
        >
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-400">{label}</p>
                    <p className="text-3xl font-bold text-white mt-1">{value.toLocaleString()}</p>
                </div>
                <div 
                    className="p-3 rounded-xl"
                    style={{ backgroundColor: `${color}20` }}
                >
                    <Icon className="w-6 h-6" style={{ color }} />
                </div>
            </div>
        </div>
    );
}
