/**
 * Admin Users Management - Redesigned
 * 
 * A modern, intuitive interface for managing social platform users.
 * Features:
 * - Dashboard overview with key metrics
 * - Filterable/searchable user grid with quick actions
 * - Tabbed interface (All Users, Active, Blocked, Admins)
 * - Bulk actions support
 * - User detail slideout panel
 * - Activity timeline
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users, Shield, Search, Filter, MoreVertical, Eye, Ban, CheckCircle,
    Clock, MapPin, Mail, Calendar, Activity, TrendingUp, UserPlus,
    ChevronDown, X, AlertTriangle, History, Globe, Monitor, Loader2,
    RefreshCw, Download, UserCheck, UserX, Edit2, Trash2, MessageCircle,
    ArrowUpRight, Settings, Plus, Camera, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminNav } from '@/components/AdminNav';
import AdminBreadcrumbs from '@/components/AdminBreadcrumbs';
import AdminQuickNav from '@/components/AdminQuickNav';
import { UserAvatar } from '@/components/DefaultAvatar';
import type { AdminUser } from '@/shared/types';
import type { UserProfile, LoginHistoryEntry } from '@/types/user';
import { AuthProvider, UserStatus } from '@/types/user';
import { adminUsersService } from '@/api/adminUsersService';
import { listUsers, getUserStats, updateUserStatus } from '@/api/userService';
import { blockAuth0User, unblockAuth0User } from '@/api/auth0Service';
import { uploadProfilePhoto, validateFile, ALLOWED_EXTENSIONS } from '@/api/mediaService';
import { useAuth } from '@/hooks/useAuth';

// ============================================================================
// Types
// ============================================================================

type TabFilter = 'all' | 'active' | 'blocked' | 'admins' | 'recent';
type SortOption = 'recent' | 'name' | 'email' | 'logins';

interface UserStats {
    total: number;
    active: number;
    blocked: number;
    newThisWeek?: number;
    newToday?: number;
}

// ============================================================================
// Utility Functions
// ============================================================================

const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatLocation = (user: UserProfile): string => {
    if (user.lastLoginLocation) {
        const { city, region, country } = user.lastLoginLocation;
        const parts = [city, region].filter(Boolean);
        if (parts.length > 0) return parts.join(', ');
        if (country) return country;
    }
    return 'Unknown location';
};

const getProviderIcon = (provider: string): string => {
    switch (provider?.toLowerCase()) {
        case 'auth0':
        case 'google':
            return '🔐';
        case 'azure-ad':
        case 'aad':
            return '🔷';
        default:
            return '👤';
    }
};

const getProviderLabel = (provider: string): string => {
    switch (provider?.toLowerCase()) {
        case 'auth0':
            return 'Auth0';
        case 'google':
            return 'Google';
        case 'azure-ad':
        case 'aad':
            return 'Entra ID';
        default:
            return provider || 'Unknown';
    }
};

// ============================================================================
// Stat Card Component
// ============================================================================

interface StatCardProps {
    label: string;
    value: number;
    icon: React.ReactNode;
    trend?: string;
    color: 'green' | 'blue' | 'red' | 'yellow';
    onClick?: () => void;
}

function StatCard({ label, value, icon, trend, color, onClick }: StatCardProps) {
    const colorStyles = {
        green: { bg: 'rgba(0, 255, 145, 0.1)', border: 'rgba(0, 255, 145, 0.3)', text: '#00FF91' },
        blue: { bg: 'rgba(0, 212, 255, 0.1)', border: 'rgba(0, 212, 255, 0.3)', text: '#00D4FF' },
        red: { bg: 'rgba(255, 68, 68, 0.1)', border: 'rgba(255, 68, 68, 0.3)', text: '#FF4444' },
        yellow: { bg: 'rgba(255, 193, 7, 0.1)', border: 'rgba(255, 193, 7, 0.3)', text: '#FFC107' },
    };

    const styles = colorStyles[color];

    return (
        <button
            onClick={onClick}
            className="p-4 rounded-xl transition-all duration-200 hover:scale-[1.02] text-left w-full"
            style={{
                backgroundColor: styles.bg,
                border: `1px solid ${styles.border}`,
            }}
        >
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm" style={{ color: '#8394A7' }}>{label}</span>
                <span style={{ color: styles.text }}>{icon}</span>
            </div>
            <div className="flex items-end gap-2">
                <span className="text-3xl font-bold" style={{ color: '#FFFFFF' }}>{value}</span>
                {trend && (
                    <span className="text-xs pb-1 flex items-center gap-1" style={{ color: styles.text }}>
                        <TrendingUp className="h-3 w-3" />
                        {trend}
                    </span>
                )}
            </div>
        </button>
    );
}

// ============================================================================
// User Card Component
// ============================================================================

interface UserCardProps {
    user: UserProfile;
    isAdmin?: boolean;
    onViewDetails: () => void;
    onBlock: () => void;
    onUnblock: () => void;
    onViewHistory: () => void;
}

function UserCard({ user, isAdmin, onViewDetails, onBlock, onUnblock, onViewHistory }: UserCardProps) {
    // Cast status to string for comparison since API may return string values
    const statusStr = user.status as unknown as string;
    const isBlocked = statusStr === 'blocked';
    const isDeleted = statusStr === 'deleted' || user.displayName === 'Deleted User';

    return (
        <div
            className={`group relative p-4 rounded-xl transition-all duration-200 hover:scale-[1.01] cursor-pointer ${
                isBlocked ? 'opacity-60' : ''
            }`}
            style={{
                backgroundColor: '#0A1929',
                border: `1px solid ${isBlocked ? '#FF4444' : isDeleted ? '#FFC107' : '#1E3A5F'}`,
            }}
            onClick={onViewDetails}
        >
            {/* Status indicator */}
            {isBlocked && (
                <div className="absolute top-2 right-2">
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
                        <Ban className="h-3 w-3 mr-1" />
                        Blocked
                    </Badge>
                </div>
            )}
            {isDeleted && !isBlocked && (
                <div className="absolute top-2 right-2">
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Deleted
                    </Badge>
                </div>
            )}
            {isAdmin && !isBlocked && !isDeleted && (
                <div className="absolute top-2 right-2">
                    <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">
                        <Shield className="h-3 w-3 mr-1" />
                        Admin
                    </Badge>
                </div>
            )}

            <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                    <UserAvatar
                        photoUrl={user.profilePicture}
                        name={user.displayName}
                        size="lg"
                    />
                    <div
                        className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-xs"
                        style={{ backgroundColor: '#0F2744' }}
                        title={getProviderLabel(user.authProvider)}
                    >
                        {getProviderIcon(user.authProvider)}
                    </div>
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate" style={{ color: '#FFFFFF' }}>
                        {user.displayName}
                    </h3>
                    <p className="text-sm truncate" style={{ color: '#8394A7' }}>
                        {user.email}
                    </p>
                    
                    {/* Meta info */}
                    <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: '#5A6F82' }}>
                        <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatRelativeTime(user.lastLoginAt)}
                        </span>
                        <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {formatLocation(user)}
                        </span>
                    </div>

                    {/* Login count */}
                    {user.metadata?.loginCount && user.metadata.loginCount > 1 && (
                        <div className="mt-2">
                            <span
                                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                                style={{ backgroundColor: '#0F2744', color: '#00D4FF' }}
                            >
                                <Activity className="h-3 w-3" />
                                {user.metadata.loginCount} logins
                            </span>
                        </div>
                    )}
                </div>

                {/* Quick Actions (hidden by default, shown on hover) */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-3 right-3">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                style={{ color: '#8394A7' }}
                            >
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align="end"
                            className="w-48"
                            style={{ backgroundColor: '#0F2744', borderColor: '#1E3A5F' }}
                        >
                            <DropdownMenuItem
                                onClick={(e) => { e.stopPropagation(); onViewDetails(); }}
                                style={{ color: '#FFFFFF' }}
                            >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={(e) => { e.stopPropagation(); onViewHistory(); }}
                                style={{ color: '#FFFFFF' }}
                            >
                                <History className="h-4 w-4 mr-2" />
                                Login History
                            </DropdownMenuItem>
                            <DropdownMenuSeparator style={{ backgroundColor: '#1E3A5F' }} />
                            {isBlocked ? (
                                <DropdownMenuItem
                                    onClick={(e) => { e.stopPropagation(); onUnblock(); }}
                                    style={{ color: '#00FF91' }}
                                >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Enable Account
                                </DropdownMenuItem>
                            ) : (
                                <DropdownMenuItem
                                    onClick={(e) => { e.stopPropagation(); onBlock(); }}
                                    style={{ color: '#FF4444' }}
                                >
                                    <Ban className="h-4 w-4 mr-2" />
                                    Disable Account
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// User Detail Panel Component
// ============================================================================

interface UserDetailPanelProps {
    user: UserProfile | null;
    isOpen: boolean;
    onClose: () => void;
    onBlock: () => void;
    onUnblock: () => void;
    isAdmin?: boolean;
}

function UserDetailPanel({ user, isOpen, onClose, onBlock, onUnblock, isAdmin }: UserDetailPanelProps) {
    if (!user) return null;

    const isBlocked = (user.status as unknown as string) === 'blocked';

    return (
        <div
            className={`fixed inset-y-0 right-0 w-full sm:w-[450px] z-50 transform transition-transform duration-300 ${
                isOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
            style={{
                backgroundColor: '#0A1929',
                borderLeft: '1px solid #1E3A5F',
            }}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: '#1E3A5F' }}>
                <h2 className="text-lg font-semibold" style={{ color: '#FFFFFF' }}>User Details</h2>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="h-8 w-8 p-0"
                    style={{ color: '#8394A7' }}
                >
                    <X className="h-5 w-5" />
                </Button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto h-[calc(100%-60px)] p-6">
                {/* Profile Header */}
                <div className="text-center mb-6">
                    <div className="relative inline-block mb-4">
                        <UserAvatar
                            photoUrl={user.profilePicture}
                            name={user.displayName}
                            size="xl"
                        />
                        <div
                            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-sm"
                            style={{ backgroundColor: '#0F2744', border: '2px solid #0A1929' }}
                            title={getProviderLabel(user.authProvider)}
                        >
                            {getProviderIcon(user.authProvider)}
                        </div>
                    </div>
                    <h3 className="text-xl font-bold" style={{ color: '#FFFFFF' }}>{user.displayName}</h3>
                    <p className="text-sm" style={{ color: '#8394A7' }}>{user.email}</p>
                    
                    {/* Status badges */}
                    <div className="flex items-center justify-center gap-2 mt-3">
                        <Badge className={isBlocked ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'bg-green-500/20 text-green-400 border-green-500/50'}>
                            {isBlocked ? <Ban className="h-3 w-3 mr-1" /> : <CheckCircle className="h-3 w-3 mr-1" />}
                            {isBlocked ? 'Blocked' : 'Active'}
                        </Badge>
                        {isAdmin && (
                            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">
                                <Shield className="h-3 w-3 mr-1" />
                                Admin
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="p-3 rounded-lg text-center" style={{ backgroundColor: '#0F2744' }}>
                        <div className="text-2xl font-bold" style={{ color: '#00D4FF' }}>
                            {user.metadata?.loginCount || 1}
                        </div>
                        <div className="text-xs" style={{ color: '#8394A7' }}>Total Logins</div>
                    </div>
                    <div className="p-3 rounded-lg text-center" style={{ backgroundColor: '#0F2744' }}>
                        <div className="text-2xl font-bold" style={{ color: '#00FF91' }}>
                            {Math.floor((new Date().getTime() - new Date(user.createdAt).getTime()) / 86400000)}
                        </div>
                        <div className="text-xs" style={{ color: '#8394A7' }}>Days as Member</div>
                    </div>
                </div>

                {/* Details Section */}
                <div className="space-y-4">
                    <h4 className="text-sm font-medium" style={{ color: '#00FF91' }}>Account Information</h4>
                    
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: '#0F2744' }}>
                            <Mail className="h-4 w-4" style={{ color: '#8394A7' }} />
                            <div>
                                <div className="text-xs" style={{ color: '#8394A7' }}>Email</div>
                                <div className="text-sm" style={{ color: '#FFFFFF' }}>{user.email}</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: '#0F2744' }}>
                            <Calendar className="h-4 w-4" style={{ color: '#8394A7' }} />
                            <div>
                                <div className="text-xs" style={{ color: '#8394A7' }}>Member Since</div>
                                <div className="text-sm" style={{ color: '#FFFFFF' }}>
                                    {new Date(user.createdAt).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: '#0F2744' }}>
                            <Clock className="h-4 w-4" style={{ color: '#8394A7' }} />
                            <div>
                                <div className="text-xs" style={{ color: '#8394A7' }}>Last Login</div>
                                <div className="text-sm" style={{ color: '#FFFFFF' }}>
                                    {new Date(user.lastLoginAt).toLocaleString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: '#0F2744' }}>
                            <Globe className="h-4 w-4" style={{ color: '#8394A7' }} />
                            <div>
                                <div className="text-xs" style={{ color: '#8394A7' }}>Last Location</div>
                                <div className="text-sm" style={{ color: '#FFFFFF' }}>
                                    {formatLocation(user)}
                                </div>
                                {user.lastLoginIp && user.lastLoginIp !== 'unknown' && (
                                    <div className="text-xs" style={{ color: '#5A6F82' }}>
                                        IP: {user.lastLoginIp}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: '#0F2744' }}>
                            <Shield className="h-4 w-4" style={{ color: '#8394A7' }} />
                            <div>
                                <div className="text-xs" style={{ color: '#8394A7' }}>Auth Provider</div>
                                <div className="text-sm" style={{ color: '#FFFFFF' }}>
                                    {getProviderIcon(user.authProvider)} {getProviderLabel(user.authProvider)}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bio if available */}
                    {user.bio && (
                        <div className="mt-4">
                            <h4 className="text-sm font-medium mb-2" style={{ color: '#00FF91' }}>Bio</h4>
                            <p className="text-sm p-3 rounded-lg" style={{ backgroundColor: '#0F2744', color: '#8394A7' }}>
                                {user.bio}
                            </p>
                        </div>
                    )}

                    {/* Login History Preview */}
                    {user.loginHistory && user.loginHistory.length > 0 && (
                        <div className="mt-4">
                            <h4 className="text-sm font-medium mb-2" style={{ color: '#00FF91' }}>Recent Activity</h4>
                            <div className="space-y-2">
                                {user.loginHistory.slice(0, 3).map((entry, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center gap-3 p-2 rounded-lg text-xs"
                                        style={{ backgroundColor: '#0F2744' }}
                                    >
                                        <Activity className="h-3 w-3" style={{ color: '#00D4FF' }} />
                                        <span style={{ color: '#8394A7' }}>
                                            Login from {entry.location?.city || 'Unknown'}
                                        </span>
                                        <span className="ml-auto" style={{ color: '#5A6F82' }}>
                                            {formatRelativeTime(entry.timestamp)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="mt-6 pt-4 border-t" style={{ borderColor: '#1E3A5F' }}>
                    <div className="flex gap-3">
                        {isBlocked ? (
                            <Button
                                className="flex-1 gap-2"
                                onClick={onUnblock}
                                style={{ backgroundColor: '#00FF91', color: '#051323' }}
                            >
                                <CheckCircle className="h-4 w-4" />
                                Enable Account
                            </Button>
                        ) : (
                            <Button
                                variant="outline"
                                className="flex-1 gap-2"
                                onClick={onBlock}
                                style={{ borderColor: '#FF4444', color: '#FF4444' }}
                            >
                                <Ban className="h-4 w-4" />
                                Disable Account
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// Main Component
// ============================================================================

export default function AdminUsersRedesigned() {
    const { user: authUser } = useAuth();
    const navigate = useNavigate();
    
    // State
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
    const [userStats, setUserStats] = useState<UserStats>({ total: 0, active: 0, blocked: 0 });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Filters & Search
    const [activeTab, setActiveTab] = useState<TabFilter>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<SortOption>('recent');
    
    // Selected user for detail panel
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
    const [showDetailPanel, setShowDetailPanel] = useState(false);
    
    // Dialogs
    const [showStatusDialog, setShowStatusDialog] = useState(false);
    const [statusAction, setStatusAction] = useState<'block' | 'unblock'>('block');
    const [statusReason, setStatusReason] = useState('');
    const [updatingStatus, setUpdatingStatus] = useState(false);
    
    const [showAddAdminDialog, setShowAddAdminDialog] = useState(false);
    const [newAdminEmail, setNewAdminEmail] = useState('');
    const [newAdminName, setNewAdminName] = useState('');
    const [addingAdmin, setAddingAdmin] = useState(false);

    // ========================================================================
    // Data Loading
    // ========================================================================

    const loadData = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            setError(null);

            const [usersResult, stats, admins] = await Promise.all([
                listUsers({ limit: 200, status: null, search: null, continuationToken: null }),
                getUserStats(),
                adminUsersService.listAdminUsers().catch(() => []),
            ]);

            setAllUsers(usersResult.users);
            setUserStats({
                ...stats,
                newThisWeek: usersResult.users.filter(u => {
                    const created = new Date(u.createdAt);
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return created > weekAgo;
                }).length,
                newToday: usersResult.users.filter(u => {
                    const created = new Date(u.createdAt);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return created > today;
                }).length,
            });
            setAdminUsers(admins);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load users');
            console.error('Error loading data:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // ========================================================================
    // Filtering & Sorting
    // ========================================================================

    const adminEmails = useMemo(() => new Set(adminUsers.map(a => a.email.toLowerCase())), [adminUsers]);

    const filteredUsers = useMemo(() => {
        let users = [...allUsers];

        // Apply tab filter
        switch (activeTab) {
            case 'active':
                users = users.filter(u => u.status === 'active');
                break;
            case 'blocked':
                users = users.filter(u => u.status === 'blocked');
                break;
            case 'admins':
                users = users.filter(u => adminEmails.has(u.email.toLowerCase()));
                break;
            case 'recent':
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                users = users.filter(u => new Date(u.createdAt) > weekAgo);
                break;
        }

        // Apply search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            users = users.filter(u =>
                u.displayName.toLowerCase().includes(query) ||
                u.email.toLowerCase().includes(query)
            );
        }

        // Apply sort
        switch (sortBy) {
            case 'recent':
                users.sort((a, b) => new Date(b.lastLoginAt).getTime() - new Date(a.lastLoginAt).getTime());
                break;
            case 'name':
                users.sort((a, b) => a.displayName.localeCompare(b.displayName));
                break;
            case 'email':
                users.sort((a, b) => a.email.localeCompare(b.email));
                break;
            case 'logins':
                users.sort((a, b) => (b.metadata?.loginCount || 0) - (a.metadata?.loginCount || 0));
                break;
        }

        return users;
    }, [allUsers, activeTab, searchQuery, sortBy, adminEmails]);

    // ========================================================================
    // Actions
    // ========================================================================

    const openStatusDialog = (user: UserProfile, action: 'block' | 'unblock') => {
        setSelectedUser(user);
        setStatusAction(action);
        setStatusReason('');
        setShowStatusDialog(true);
    };

    const handleStatusChange = async () => {
        if (!selectedUser) return;

        try {
            setUpdatingStatus(true);
            setError(null);

            const newStatus = statusAction === 'block' ? 'blocked' : 'active';

            // Update Auth0 if applicable
            if (selectedUser.authProvider === AuthProvider.AUTH0) {
                try {
                    if (statusAction === 'block') {
                        await blockAuth0User(selectedUser.id, statusReason || 'Blocked by admin');
                    } else {
                        await unblockAuth0User(selectedUser.id);
                    }
                } catch (auth0Error) {
                    console.warn('Auth0 status update failed:', auth0Error);
                }
            }

            // Update local database
            await updateUserStatus(selectedUser.id, {
                status: newStatus as any,
                reason: statusReason || undefined,
            });

            setShowStatusDialog(false);
            setShowDetailPanel(false);
            setSelectedUser(null);
            await loadData(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : `Failed to ${statusAction} user`);
        } finally {
            setUpdatingStatus(false);
        }
    };

    const handleAddAdmin = async () => {
        if (!newAdminEmail.trim()) return;

        try {
            setAddingAdmin(true);
            setError(null);

            await adminUsersService.createAdminUser({
                email: newAdminEmail.trim(),
                name: newAdminName.trim() || newAdminEmail.split('@')[0],
                roles: ['admin', 'authenticated'],
                status: 'active',
            });

            setShowAddAdminDialog(false);
            setNewAdminEmail('');
            setNewAdminName('');
            await loadData(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add admin');
        } finally {
            setAddingAdmin(false);
        }
    };

    const handleViewDetails = (user: UserProfile) => {
        setSelectedUser(user);
        setShowDetailPanel(true);
    };

    // ========================================================================
    // Render
    // ========================================================================

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#051323' }}>
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" style={{ color: '#00FF91' }} />
                    <p style={{ color: '#8394A7' }}>Loading users...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-8" style={{ backgroundColor: '#051323' }}>
            {/* Admin Navigation */}
            <div className="px-8 pt-8">
                <AdminNav />
                <AdminBreadcrumbs />
                <AdminQuickNav className="mt-4" />
            </div>

            {/* Header */}
            <div className="px-8 mt-6 mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3" style={{ color: '#FFFFFF' }}>
                            <Users className="h-8 w-8" style={{ color: '#00FF91' }} />
                            User Management
                        </h1>
                        <p className="mt-1" style={{ color: '#8394A7' }}>
                            Manage and monitor your community members
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => loadData(true)}
                            disabled={refreshing}
                            style={{ borderColor: '#1E3A5F', color: '#8394A7' }}
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => setShowAddAdminDialog(true)}
                            style={{ backgroundColor: '#00FF91', color: '#051323' }}
                        >
                            <Shield className="h-4 w-4 mr-2" />
                            Add Admin
                        </Button>
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mx-8 mb-6 p-4 rounded-lg flex items-center gap-3" style={{ backgroundColor: 'rgba(255, 68, 68, 0.1)', border: '1px solid rgba(255, 68, 68, 0.3)' }}>
                    <AlertTriangle className="h-5 w-5" style={{ color: '#FF4444' }} />
                    <span style={{ color: '#FF4444' }}>{error}</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setError(null)}
                        className="ml-auto"
                        style={{ color: '#FF4444' }}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            )}

            {/* Stats Cards */}
            <div className="px-8 mb-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard
                        label="Total Users"
                        value={userStats.total}
                        icon={<Users className="h-5 w-5" />}
                        color="blue"
                        onClick={() => setActiveTab('all')}
                    />
                    <StatCard
                        label="Active Users"
                        value={userStats.active}
                        icon={<UserCheck className="h-5 w-5" />}
                        color="green"
                        onClick={() => setActiveTab('active')}
                    />
                    <StatCard
                        label="Blocked"
                        value={userStats.blocked}
                        icon={<Ban className="h-5 w-5" />}
                        color="red"
                        onClick={() => setActiveTab('blocked')}
                    />
                    <StatCard
                        label="New This Week"
                        value={userStats.newThisWeek || 0}
                        icon={<TrendingUp className="h-5 w-5" />}
                        trend={userStats.newToday ? `+${userStats.newToday} today` : undefined}
                        color="yellow"
                        onClick={() => setActiveTab('recent')}
                    />
                </div>
            </div>

            {/* Filters & Search */}
            <div className="px-8 mb-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-xl" style={{ backgroundColor: '#0A1929', border: '1px solid #1E3A5F' }}>
                    {/* Tabs */}
                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabFilter)} className="w-full md:w-auto">
                        <TabsList style={{ backgroundColor: '#0F2744' }}>
                            <TabsTrigger value="all" style={{ color: activeTab === 'all' ? '#00FF91' : '#8394A7' }}>
                                All ({allUsers.length})
                            </TabsTrigger>
                            <TabsTrigger value="active" style={{ color: activeTab === 'active' ? '#00FF91' : '#8394A7' }}>
                                Active
                            </TabsTrigger>
                            <TabsTrigger value="blocked" style={{ color: activeTab === 'blocked' ? '#00FF91' : '#8394A7' }}>
                                Blocked
                            </TabsTrigger>
                            <TabsTrigger value="admins" style={{ color: activeTab === 'admins' ? '#00FF91' : '#8394A7' }}>
                                Admins ({adminUsers.length})
                            </TabsTrigger>
                            <TabsTrigger value="recent" style={{ color: activeTab === 'recent' ? '#00FF91' : '#8394A7' }}>
                                New
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {/* Search & Sort */}
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: '#8394A7' }} />
                            <Input
                                placeholder="Search users..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                                style={{ backgroundColor: '#0F2744', borderColor: '#1E3A5F', color: '#FFFFFF' }}
                            />
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" style={{ borderColor: '#1E3A5F', color: '#8394A7' }}>
                                    <Filter className="h-4 w-4 mr-2" />
                                    Sort
                                    <ChevronDown className="h-4 w-4 ml-2" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent style={{ backgroundColor: '#0F2744', borderColor: '#1E3A5F' }}>
                                <DropdownMenuItem onClick={() => setSortBy('recent')} style={{ color: sortBy === 'recent' ? '#00FF91' : '#FFFFFF' }}>
                                    Most Recent
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setSortBy('name')} style={{ color: sortBy === 'name' ? '#00FF91' : '#FFFFFF' }}>
                                    Name A-Z
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setSortBy('email')} style={{ color: sortBy === 'email' ? '#00FF91' : '#FFFFFF' }}>
                                    Email A-Z
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setSortBy('logins')} style={{ color: sortBy === 'logins' ? '#00FF91' : '#FFFFFF' }}>
                                    Most Active
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>

            {/* User Grid */}
            <div className="px-8">
                {filteredUsers.length === 0 ? (
                    <div className="text-center py-16 rounded-xl" style={{ backgroundColor: '#0A1929', border: '1px solid #1E3A5F' }}>
                        <Users className="h-12 w-12 mx-auto mb-4" style={{ color: '#8394A7' }} />
                        <p style={{ color: '#8394A7' }}>
                            {searchQuery ? 'No users match your search' : 'No users found'}
                        </p>
                        {searchQuery && (
                            <Button
                                variant="link"
                                onClick={() => setSearchQuery('')}
                                style={{ color: '#00FF91' }}
                            >
                                Clear search
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredUsers.map((user) => (
                            <UserCard
                                key={user.id}
                                user={user}
                                isAdmin={adminEmails.has(user.email.toLowerCase())}
                                onViewDetails={() => handleViewDetails(user)}
                                onBlock={() => openStatusDialog(user, 'block')}
                                onUnblock={() => openStatusDialog(user, 'unblock')}
                                onViewHistory={() => handleViewDetails(user)}
                            />
                        ))}
                    </div>
                )}

                {/* Results count */}
                {filteredUsers.length > 0 && (
                    <div className="mt-4 text-center">
                        <span className="text-sm" style={{ color: '#8394A7' }}>
                            Showing {filteredUsers.length} of {allUsers.length} users
                        </span>
                    </div>
                )}
            </div>

            {/* User Detail Panel */}
            <UserDetailPanel
                user={selectedUser}
                isOpen={showDetailPanel}
                onClose={() => {
                    setShowDetailPanel(false);
                    setSelectedUser(null);
                }}
                onBlock={() => openStatusDialog(selectedUser!, 'block')}
                onUnblock={() => openStatusDialog(selectedUser!, 'unblock')}
                isAdmin={selectedUser ? adminEmails.has(selectedUser.email.toLowerCase()) : false}
            />

            {/* Backdrop for detail panel */}
            {showDetailPanel && (
                <div
                    className="fixed inset-0 bg-black/50 z-40"
                    onClick={() => {
                        setShowDetailPanel(false);
                        setSelectedUser(null);
                    }}
                />
            )}

            {/* Status Change Dialog */}
            <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
                <DialogContent style={{ backgroundColor: '#0A1929', borderColor: '#1E3A5F' }} className="max-w-md">
                    <DialogHeader>
                        <DialogTitle
                            className="flex items-center gap-2"
                            style={{ color: statusAction === 'block' ? '#FF4444' : '#00FF91' }}
                        >
                            {statusAction === 'block' ? (
                                <>
                                    <AlertTriangle className="h-5 w-5" />
                                    Disable User Account
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="h-5 w-5" />
                                    Enable User Account
                                </>
                            )}
                        </DialogTitle>
                        <DialogDescription style={{ color: '#8394A7' }}>
                            {statusAction === 'block'
                                ? 'This will prevent the user from accessing the platform.'
                                : "This will restore the user's access to the platform."}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedUser && (
                        <div className="py-4">
                            <div className="flex items-center gap-4 p-4 rounded-lg" style={{ backgroundColor: '#0F2744' }}>
                                <UserAvatar
                                    photoUrl={selectedUser.profilePicture}
                                    name={selectedUser.displayName}
                                    size="md"
                                />
                                <div>
                                    <div className="font-medium" style={{ color: '#FFFFFF' }}>
                                        {selectedUser.displayName}
                                    </div>
                                    <div className="text-sm" style={{ color: '#8394A7' }}>
                                        {selectedUser.email}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4">
                                <Label htmlFor="reason" style={{ color: '#FFFFFF' }}>
                                    Reason {statusAction === 'block' ? '(recommended)' : '(optional)'}
                                </Label>
                                <Input
                                    id="reason"
                                    placeholder={statusAction === 'block' ? 'e.g., Violated terms of service' : 'e.g., Account review complete'}
                                    value={statusReason}
                                    onChange={(e) => setStatusReason(e.target.value)}
                                    className="mt-2"
                                    style={{ backgroundColor: '#0F2744', borderColor: '#1E3A5F', color: '#FFFFFF' }}
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowStatusDialog(false)}
                            disabled={updatingStatus}
                            style={{ borderColor: '#1E3A5F', color: '#FFFFFF' }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleStatusChange}
                            disabled={updatingStatus}
                            style={{
                                backgroundColor: statusAction === 'block' ? '#FF4444' : '#00FF91',
                                color: statusAction === 'block' ? '#FFFFFF' : '#051323',
                            }}
                        >
                            {updatingStatus && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            {statusAction === 'block' ? 'Disable Account' : 'Enable Account'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Admin Dialog */}
            <Dialog open={showAddAdminDialog} onOpenChange={setShowAddAdminDialog}>
                <DialogContent style={{ backgroundColor: '#0A1929', borderColor: '#1E3A5F' }} className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2" style={{ color: '#00FF91' }}>
                            <Shield className="h-5 w-5" />
                            Add Admin User
                        </DialogTitle>
                        <DialogDescription style={{ color: '#8394A7' }}>
                            Grant admin privileges to a user. They will have access to all admin features.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div>
                            <Label htmlFor="admin-email" style={{ color: '#FFFFFF' }}>
                                Email *
                            </Label>
                            <Input
                                id="admin-email"
                                type="email"
                                placeholder="user@example.com"
                                value={newAdminEmail}
                                onChange={(e) => setNewAdminEmail(e.target.value)}
                                className="mt-2"
                                style={{ backgroundColor: '#0F2744', borderColor: '#1E3A5F', color: '#FFFFFF' }}
                            />
                        </div>
                        <div>
                            <Label htmlFor="admin-name" style={{ color: '#FFFFFF' }}>
                                Name (optional)
                            </Label>
                            <Input
                                id="admin-name"
                                type="text"
                                placeholder="Full Name"
                                value={newAdminName}
                                onChange={(e) => setNewAdminName(e.target.value)}
                                className="mt-2"
                                style={{ backgroundColor: '#0F2744', borderColor: '#1E3A5F', color: '#FFFFFF' }}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowAddAdminDialog(false);
                                setNewAdminEmail('');
                                setNewAdminName('');
                            }}
                            disabled={addingAdmin}
                            style={{ borderColor: '#1E3A5F', color: '#FFFFFF' }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAddAdmin}
                            disabled={!newAdminEmail.trim() || addingAdmin}
                            style={{ backgroundColor: '#00FF91', color: '#051323' }}
                        >
                            {addingAdmin && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            Add Admin
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
