/**
 * Online Community Page
 * 
 * Real-time community chat with channels and member sidebar.
 * All messages are stored in Cosmos DB and users are fetched from the database.
 * 
 * @module pages/OnlineCommunity
 * @author SOMOS.tech
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Hash,
    ChevronDown,
    ChevronRight,
    Settings,
    Users,
    Search,
    Send,
    Smile,
    Loader2,
    MessageSquare,
    ExternalLink,
    RefreshCw,
    Trash2,
    Reply,
    Heart,
    ThumbsUp,
    Flame,
    X
} from 'lucide-react';
import { UserAvatar } from '@/components/DefaultAvatar';
import { useUserContext } from '@/contexts/UserContext';

// Message type
interface Message {
    id: string;
    channelId: string;
    userId: string;
    userName: string;
    userEmail?: string;
    userPhoto: string | null;
    content: string;
    createdAt: string;
    reactions: { emoji: string; count: number; users: string[] }[];
    replyTo?: { userName: string; content: string };
    isDeleted?: boolean;
}

// User type
interface CommunityUser {
    id: string;
    name: string;
    email?: string;
    photoUrl?: string;
    status: 'online' | 'offline';
    isAdmin?: boolean;
    isCurrentUser?: boolean;
}

// Channel categories and channels
const CHANNEL_CATEGORIES = [
    {
        name: 'Information',
        icon: '📢',
        channels: [
            { id: 'welcome', name: 'welcome', icon: Hash, description: 'Welcome to SOMOS.tech!' },
            { id: 'announcements', name: 'announcements', icon: Hash, description: 'Important announcements' },
        ]
    },
    {
        name: 'General',
        icon: '💬',
        channels: [
            { id: 'introductions', name: 'introductions', icon: Hash, description: 'Introduce yourself!' },
            { id: 'general', name: 'general', icon: Hash, description: 'General discussion' },
            { id: 'opportunities', name: 'opportunities', icon: Hash, description: 'Job & opportunities' },
        ]
    },
    {
        name: 'Tech Talk',
        icon: '💻',
        channels: [
            { id: 'coding', name: 'coding', icon: Hash, description: 'Programming discussion' },
            { id: 'career-advice', name: 'career-advice', icon: Hash, description: 'Career tips & advice' },
            { id: 'resources', name: 'resources', icon: Hash, description: 'Helpful resources' },
        ]
    },
    {
        name: 'Community',
        icon: '🌟',
        channels: [
            { id: 'events', name: 'events', icon: Hash, description: 'Community events' },
            { id: 'off-topic', name: 'off-topic', icon: Hash, description: 'Random chat' },
        ]
    },
];

/**
 * Channel Sidebar Component - Modern design
 */
function ChannelSidebar({ 
    selectedChannel, 
    onSelectChannel,
    collapsedCategories,
    toggleCategory,
    currentUser,
    onNavigateToProfile
}: {
    selectedChannel: string;
    onSelectChannel: (id: string) => void;
    collapsedCategories: Set<string>;
    toggleCategory: (name: string) => void;
    currentUser: { name: string; photoUrl?: string } | null;
    onNavigateToProfile: () => void;
}) {
    const navigate = useNavigate();
    
    return (
        <div 
            className="w-64 flex-shrink-0 flex flex-col h-full border-r"
            style={{ 
                backgroundColor: '#0a1628', 
                borderColor: 'rgba(0, 255, 145, 0.08)',
                boxShadow: 'inset -1px 0 0 rgba(0, 255, 145, 0.05)'
            }}
        >
            {/* Server Header - Glassmorphism effect */}
            <div 
                className="h-16 px-4 flex items-center justify-between border-b"
                style={{ 
                    borderColor: 'rgba(0, 255, 145, 0.1)',
                    background: 'linear-gradient(180deg, rgba(0, 255, 145, 0.05) 0%, transparent 100%)'
                }}
            >
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="absolute inset-0 rounded-full bg-[#00FF91]/20 blur-md" />
                        <img 
                            src="https://static.wixstatic.com/media/0c204d_5f310ee2b2a848ceac8e68b25c0c39eb~mv2.png"
                            alt="SOMOS.tech"
                            className="w-9 h-9 rounded-full relative z-10 ring-2 ring-[#00FF91]/30"
                        />
                    </div>
                    <div>
                        <span className="font-bold text-white text-[15px]">SOMOS</span>
                        <span className="text-[#00FF91] text-xs ml-1.5 font-medium">.tech</span>
                    </div>
                </div>
            </div>

            {/* Channel Categories - Modern spacing */}
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
                {CHANNEL_CATEGORIES.map(category => (
                    <div key={category.name}>
                        <button
                            onClick={() => toggleCategory(category.name)}
                            className="w-full flex items-center gap-2 px-2 text-[11px] font-bold uppercase tracking-[0.08em] hover:text-white transition-colors mb-2"
                            style={{ color: '#6B7A8A' }}
                        >
                            {collapsedCategories.has(category.name) ? (
                                <ChevronRight className="w-3 h-3" />
                            ) : (
                                <ChevronDown className="w-3 h-3" />
                            )}
                            <span>{category.icon}</span>
                            <span>{category.name}</span>
                        </button>
                        
                        {!collapsedCategories.has(category.name) && (
                            <div className="space-y-1">
                                {category.channels.map(channel => (
                                    <button
                                        key={channel.id}
                                        onClick={() => onSelectChannel(channel.id)}
                                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all duration-200 ${
                                            selectedChannel === channel.id 
                                                ? 'bg-gradient-to-r from-[#00FF91]/20 to-[#00FF91]/5 text-white shadow-[0_0_20px_rgba(0,255,145,0.1)]' 
                                                : 'hover:bg-white/5 text-gray-400 hover:text-gray-200'
                                        }`}
                                        style={{
                                            border: selectedChannel === channel.id 
                                                ? '1px solid rgba(0, 255, 145, 0.2)' 
                                                : '1px solid transparent'
                                        }}
                                    >
                                        <channel.icon className={`w-4 h-4 ${selectedChannel === channel.id ? 'text-[#00FF91]' : 'text-gray-500'}`} />
                                        <span className="text-sm font-medium">{channel.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* User Panel - Modern card style */}
            <div 
                className="px-3 py-3 border-t"
                style={{ borderColor: 'rgba(0, 255, 145, 0.1)' }}
            >
                <div 
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 hover:bg-white/5 group"
                    onClick={onNavigateToProfile}
                >
                    <div className="relative">
                        <UserAvatar 
                            name={currentUser?.name || 'You'} 
                            photoUrl={currentUser?.photoUrl}
                            size="sm" 
                        />
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#00FF91] border-2 border-[#0a1628] shadow-[0_0_8px_rgba(0,255,145,0.5)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-white truncate">{currentUser?.name || 'You'}</div>
                        <div className="text-xs text-[#00FF91] font-medium">Online</div>
                    </div>
                    <Settings className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                </div>
            </div>
        </div>
    );
}

/**
 * Chat Message Component - Modern design with hover actions
 */
function ChatMessageItem({ 
    message, 
    currentUserId,
    onDelete,
    onReact,
    onReply
}: { 
    message: Message;
    currentUserId: string;
    onDelete: (messageId: string) => void;
    onReact: (messageId: string, emoji: string) => void;
    onReply: (message: Message) => void;
}) {
    const isOwn = message.userId === currentUserId;
    const [showActions, setShowActions] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    
    const quickEmojis = ['❤️', '👍', '🔥', '😂', '🎉', '👀'];
    
    return (
        <div 
            className="group relative flex gap-4 py-4 px-5 transition-all duration-200 rounded-xl mx-3 my-1"
            style={{ 
                backgroundColor: showActions ? 'rgba(0, 255, 145, 0.03)' : 'transparent',
            }}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => { setShowActions(false); setShowEmojiPicker(false); }}
        >
            {/* Avatar with modern glow effect */}
            <div className="relative flex-shrink-0">
                <div className={`absolute inset-0 rounded-full blur-md transition-opacity duration-300 ${isOwn ? 'bg-[#00FF91]/20' : 'bg-white/5'} ${showActions ? 'opacity-100' : 'opacity-0'}`} />
                <UserAvatar
                    photoUrl={message.userPhoto || undefined}
                    name={message.userName}
                    size="md"
                />
            </div>
            
            <div className="flex-1 min-w-0">
                {/* Header with name and time */}
                <div className="flex items-center gap-3 mb-1.5">
                    <span className={`font-semibold text-[15px] ${isOwn ? 'text-[#00FF91]' : 'text-white'}`}>
                        {message.userName}
                        {isOwn && <span className="ml-1.5 text-xs opacity-60">(you)</span>}
                    </span>
                    <span className="text-xs text-gray-500 font-medium">
                        {new Date(message.createdAt).toLocaleString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                        })}
                    </span>
                </div>

                {/* Reply Preview - Modern card style */}
                {message.replyTo && (
                    <div 
                        className="mb-3 pl-4 py-2 pr-3 rounded-lg border-l-2 bg-gradient-to-r from-white/5 to-transparent"
                        style={{ borderColor: '#00FF91' }}
                    >
                        <div className="flex items-center gap-2 text-xs">
                            <Reply className="w-3 h-3 text-[#00FF91]" />
                            <span className="text-[#00FF91] font-medium">@{message.replyTo.userName}</span>
                        </div>
                        <p className="text-gray-400 text-sm mt-1 truncate">{message.replyTo.content}</p>
                    </div>
                )}

                {/* Message Content - Better typography */}
                <p className="text-gray-200 whitespace-pre-wrap break-words leading-relaxed text-[15px]">
                    {message.content}
                </p>

                {/* Reactions - Pill style */}
                {message.reactions && message.reactions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                        {message.reactions.map((reaction, idx) => {
                            const isReacted = reaction.users.includes(currentUserId);
                            return (
                                <button
                                    key={idx}
                                    onClick={() => onReact(message.id, reaction.emoji)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 ${
                                        isReacted 
                                            ? 'bg-[#00FF91]/20 border border-[#00FF91]/50 shadow-[0_0_12px_rgba(0,255,145,0.15)]' 
                                            : 'bg-white/5 border border-white/10 hover:bg-white/10'
                                    }`}
                                >
                                    <span className="text-base">{reaction.emoji}</span>
                                    <span className={isReacted ? 'text-[#00FF91]' : 'text-gray-400'}>
                                        {reaction.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Floating Action Bar - Only visible on hover */}
            <div 
                className={`absolute -top-3 right-4 flex items-center gap-1 p-1.5 rounded-xl border shadow-xl transition-all duration-200 ${
                    showActions ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
                }`}
                style={{ 
                    backgroundColor: 'rgba(13, 31, 45, 0.95)',
                    borderColor: 'rgba(0, 255, 145, 0.2)',
                    backdropFilter: 'blur(8px)'
                }}
            >
                {/* Quick Reactions */}
                <div className="relative">
                    <button 
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                        title="Add reaction"
                    >
                        <Smile className="w-4 h-4 text-gray-400 hover:text-[#00FF91]" />
                    </button>
                    
                    {/* Emoji Picker Popup */}
                    {showEmojiPicker && (
                        <div 
                            className="absolute top-full right-0 mt-2 p-2 rounded-xl border shadow-2xl flex gap-1 z-50"
                            style={{ 
                                backgroundColor: 'rgba(13, 31, 45, 0.98)',
                                borderColor: 'rgba(0, 255, 145, 0.2)'
                            }}
                        >
                            {quickEmojis.map(emoji => (
                                <button
                                    key={emoji}
                                    onClick={() => { onReact(message.id, emoji); setShowEmojiPicker(false); }}
                                    className="p-2 rounded-lg hover:bg-white/10 transition-all hover:scale-110 text-lg"
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                
                {/* Reply Button */}
                <button 
                    onClick={() => onReply(message)}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    title="Reply"
                >
                    <Reply className="w-4 h-4 text-gray-400 hover:text-[#00FF91]" />
                </button>
                
                {/* Delete Button - Only for own messages */}
                {isOwn && (
                    <button 
                        onClick={() => onDelete(message.id)}
                        className="p-2 rounded-lg hover:bg-red-500/20 transition-colors"
                        title="Delete"
                    >
                        <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-400" />
                    </button>
                )}
            </div>
        </div>
    );
}

/**
 * Member Sidebar Component - Modern design
 */
function MemberSidebar({ 
    onlineUsers, 
    offlineUsers,
    totalUsers,
    isLoading 
}: { 
    onlineUsers: CommunityUser[];
    offlineUsers: CommunityUser[];
    totalUsers: number;
    isLoading: boolean;
}) {
    return (
        <div 
            className="w-60 flex-shrink-0 h-full overflow-y-auto border-l"
            style={{ 
                backgroundColor: '#0a1628', 
                borderColor: 'rgba(0, 255, 145, 0.08)',
                boxShadow: 'inset 1px 0 0 rgba(0, 255, 145, 0.05)'
            }}
        >
            <div className="p-4">
                <h3 className="text-sm font-bold text-white mb-5 flex items-center gap-2.5 uppercase tracking-wider">
                    <div className="p-1.5 rounded-lg bg-[#00FF91]/10">
                        <Users className="w-4 h-4 text-[#00FF91]" />
                    </div>
                    Members
                    {isLoading && <Loader2 className="w-3 h-3 animate-spin text-[#00FF91] ml-auto" />}
                </h3>

                {/* Online Members */}
                {onlineUsers.length > 0 && (
                    <div className="mb-6">
                        <div className="text-[11px] font-bold uppercase tracking-[0.08em] mb-3 flex items-center gap-2 px-1" style={{ color: '#00FF91' }}>
                            <div className="w-2 h-2 rounded-full bg-[#00FF91] shadow-[0_0_8px_rgba(0,255,145,0.5)] animate-pulse" />
                            Online — {onlineUsers.length}
                        </div>
                        <div className="space-y-1">
                            {onlineUsers.map(user => (
                                <div 
                                    key={user.id}
                                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all duration-200 cursor-pointer hover:bg-gradient-to-r hover:from-white/5 hover:to-transparent group"
                                >
                                    <div className="relative">
                                        <UserAvatar name={user.name} photoUrl={user.photoUrl} size="sm" />
                                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#00FF91] border-2 border-[#0a1628] shadow-[0_0_6px_rgba(0,255,145,0.5)]" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className={`text-sm truncate block font-medium ${user.isCurrentUser ? 'text-[#00FF91]' : 'text-gray-200 group-hover:text-white'}`}>
                                            {user.name}
                                            {user.isCurrentUser && <span className="text-xs opacity-60 ml-1">(you)</span>}
                                        </span>
                                    </div>
                                    {user.isAdmin && (
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00FF91]/15 text-[#00FF91] font-semibold border border-[#00FF91]/30">
                                            Admin
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Offline Members */}
                {offlineUsers.length > 0 && (
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-[0.08em] mb-3 text-gray-500 px-1">
                            Offline — {offlineUsers.length}
                        </div>
                        <div className="space-y-1">
                            {offlineUsers.slice(0, 10).map(user => (
                                <div 
                                    key={user.id}
                                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all duration-200 cursor-pointer hover:bg-white/5 opacity-50 hover:opacity-70"
                                >
                                    <UserAvatar name={user.name} photoUrl={user.photoUrl} size="sm" />
                                    <span className="text-sm text-gray-400 truncate font-medium">{user.name}</span>
                                </div>
                            ))}
                            {offlineUsers.length > 10 && (
                                <p className="text-xs text-gray-600 px-2.5 py-2 font-medium">
                                    +{offlineUsers.length - 10} more members
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {totalUsers === 0 && !isLoading && (
                    <div className="text-center py-8">
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                            <Users className="w-6 h-6 text-gray-500" />
                        </div>
                        <p className="text-sm text-gray-500">No members yet</p>
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Main Online Community Page
 */
export default function OnlineCommunity() {
    const { authUser, displayName, profilePicture } = useUserContext();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    
    // Get channel from URL query param (for deep linking from notifications)
    const urlChannel = searchParams.get('channel');
    const [selectedChannel, setSelectedChannel] = useState(urlChannel || 'general');
    const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
    const [messageInput, setMessageInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isInitialLoading, setIsInitialLoading] = useState(true); // Only for first load
    const [isRefreshing, setIsRefreshing] = useState(false); // For manual refresh button
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [moderationWarning, setModerationWarning] = useState<string | null>(null);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null); // Reply state
    
    const [onlineUsers, setOnlineUsers] = useState<CommunityUser[]>([]);
    const [offlineUsers, setOfflineUsers] = useState<CommunityUser[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null);
    const hasLoadedOnce = useRef(false); // Track if initial load completed

    // Current user info from context
    const currentUser = {
        id: authUser?.userId || '',
        name: displayName,
        photoUrl: profilePicture
    };

    // Fetch messages for selected channel
    // isManualRefresh: true when user clicks refresh button (show spinner)
    // isBackground: true for polling (silent refresh)
    const fetchMessages = useCallback(async (options?: { isManualRefresh?: boolean }) => {
        if (!selectedChannel) return;
        
        const isManualRefresh = options?.isManualRefresh ?? false;
        
        // Only show loading indicators appropriately:
        // - Initial load: show full spinner
        // - Manual refresh: show refresh button spinner
        // - Background poll: silent (no indicators)
        if (!hasLoadedOnce.current) {
            setIsInitialLoading(true);
        } else if (isManualRefresh) {
            setIsRefreshing(true);
        }
        // Background polls don't set any loading state
        
        setError(null);
        
        try {
            const response = await fetch(`/api/community-messages/${selectedChannel}?limit=100`);
            if (!response.ok) {
                const errorText = await response.text();
                console.error('[OnlineCommunity] API Error:', response.status, errorText);
                throw new Error(`Failed to fetch messages: ${response.status}`);
            }
            const json = await response.json();
            console.log('[OnlineCommunity] Messages response:', json);
            // API returns { success, data: { messages } }
            const data = json.data || json;
            const fetchedMessages = data.messages || [];
            console.log(`[OnlineCommunity] Loaded ${fetchedMessages.length} messages for #${selectedChannel}`);
            setMessages(fetchedMessages);
            hasLoadedOnce.current = true;
        } catch (err) {
            console.error('Error fetching messages:', err);
            // Only show error if this was initial load or manual refresh
            if (!hasLoadedOnce.current || isManualRefresh) {
                setError('Failed to load messages. Please try again.');
            }
        } finally {
            setIsInitialLoading(false);
            setIsRefreshing(false);
        }
    }, [selectedChannel]);

    // Track if users have been loaded once
    const hasLoadedUsersOnce = useRef(false);

    // Fetch active users (graceful - no loading indicator on background refresh)
    const fetchActiveUsers = useCallback(async () => {
        // Only show loading on initial load
        if (!hasLoadedUsersOnce.current) {
            setIsLoadingUsers(true);
        }
        try {
            const response = await fetch('/api/community/active-users');
            if (!response.ok) {
                throw new Error('Failed to fetch users');
            }
            const json = await response.json();
            // API returns { success, data: { online, offline } }
            const data = json.data || json;
            setOnlineUsers(data.online || []);
            setOfflineUsers(data.offline || []);
            hasLoadedUsersOnce.current = true;
        } catch (err) {
            console.error('Error fetching users:', err);
        } finally {
            setIsLoadingUsers(false);
        }
    }, []);

    // Initial load and polling
    useEffect(() => {
        fetchMessages();
        fetchActiveUsers();
        
        // Poll for new messages every 5 seconds
        pollInterval.current = setInterval(() => {
            fetchMessages();
        }, 5000);
        
        // Poll for active users every 30 seconds
        const usersPoll = setInterval(() => {
            fetchActiveUsers();
        }, 30000);
        
        return () => {
            if (pollInterval.current) clearInterval(pollInterval.current);
            clearInterval(usersPoll);
        };
    }, [fetchMessages, fetchActiveUsers]);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Channel change handler - reset loaded state when changing channels
    useEffect(() => {
        hasLoadedOnce.current = false;
        setMessages([]); // Clear messages immediately for smooth channel switch
        fetchMessages();
    }, [selectedChannel, fetchMessages]);

    // Manual refresh handler (shows spinner in button)
    const handleManualRefresh = () => {
        fetchMessages({ isManualRefresh: true });
    };

    const toggleCategory = (name: string) => {
        setCollapsedCategories(prev => {
            const next = new Set(prev);
            if (next.has(name)) {
                next.delete(name);
            } else {
                next.add(name);
            }
            return next;
        });
    };

    const handleSendMessage = async () => {
        if (!messageInput.trim() || isSending) return;
        
        setIsSending(true);
        setError(null);
        setModerationWarning(null);
        
        try {
            // Build request body with optional reply data
            const requestBody: { content: string; replyTo?: { userName: string; content: string } } = {
                content: messageInput.trim()
            };
            
            if (replyingTo) {
                requestBody.replyTo = {
                    userName: replyingTo.userName,
                    content: replyingTo.content.substring(0, 100) // Truncate for preview
                };
            }
            
            const response = await fetch(`/api/community-messages/${selectedChannel}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });
            
            const json = await response.json();
            
            if (!response.ok) {
                // Check if it's a moderation block
                const errorData = json.error || json;
                if (errorData.reason === 'tier1_keyword_match' || 
                    errorData.reason === 'tier2_malicious_link' || 
                    errorData.reason === 'tier3_ai_violation' ||
                    errorData.reason === 'content_moderation') {
                    setModerationWarning(errorData.message || 'Your message was blocked due to content policy violations.');
                    // Auto-clear warning after 8 seconds
                    setTimeout(() => setModerationWarning(null), 8000);
                } else {
                    setError('Failed to send message');
                }
                return;
            }
            
            // API returns { success, data: { message } }
            const data = json.data || json;
            setMessages(prev => [...prev, data.message]);
            setMessageInput('');
            setReplyingTo(null); // Clear reply after sending
        } catch (err) {
            console.error('Error sending message:', err);
            setError('Failed to send message');
        } finally {
            setIsSending(false);
        }
    };

    const handleReply = (message: Message) => {
        setReplyingTo(message);
        inputRef.current?.focus();
    };

    const cancelReply = () => {
        setReplyingTo(null);
    };

    const handleDeleteMessage = async (messageId: string) => {
        try {
            const response = await fetch(`/api/community-messages/${selectedChannel}/${messageId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error('Failed to delete message');
            }
            
            setMessages(prev => prev.filter(m => m.id !== messageId));
        } catch (err) {
            console.error('Error deleting message:', err);
            setError('Failed to delete message');
        }
    };

    const handleReaction = async (messageId: string, emoji: string) => {
        try {
            const response = await fetch(`/api/community-messages/${selectedChannel}/${messageId}/react`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emoji })
            });
            
            if (!response.ok) {
                throw new Error('Failed to add reaction');
            }
            
            const json = await response.json();
            // API returns { success, data: { message } }
            const data = json.data || json;
            setMessages(prev => prev.map(m => m.id === messageId ? data.message : m));
        } catch (err) {
            console.error('Error adding reaction:', err);
        }
    };

    const getCurrentChannelName = () => {
        for (const category of CHANNEL_CATEGORIES) {
            const channel = category.channels.find(c => c.id === selectedChannel);
            if (channel) return channel.name;
        }
        // Handle dynamic group channels (e.g., "seattle-announcements")
        if (selectedChannel.endsWith('-announcements')) {
            const groupName = selectedChannel.replace('-announcements', '');
            return `${groupName}-announcements`;
        }
        return selectedChannel || 'general';
    };

    const getCurrentChannelDescription = () => {
        for (const category of CHANNEL_CATEGORIES) {
            const channel = category.channels.find(c => c.id === selectedChannel);
            if (channel) return channel.description;
        }
        // Handle dynamic group channels
        if (selectedChannel.endsWith('-announcements')) {
            const groupName = selectedChannel.replace('-announcements', '');
            return `Announcements for ${groupName.charAt(0).toUpperCase() + groupName.slice(1)} community`;
        }
        return '';
    };

    return (
        <div className="h-[calc(100vh-80px)] flex" style={{ backgroundColor: '#051323' }}>
            {/* Channel Sidebar */}
            <ChannelSidebar
                selectedChannel={selectedChannel}
                onSelectChannel={setSelectedChannel}
                collapsedCategories={collapsedCategories}
                toggleCategory={toggleCategory}
                currentUser={currentUser}
                onNavigateToProfile={() => navigate('/profile')}
            />

            {/* Main Chat Area */}
            <div 
                className="flex-1 flex flex-col min-w-0" 
                style={{ 
                    backgroundColor: '#0d1f2d',
                    backgroundImage: 'radial-gradient(ellipse at top, rgba(0, 255, 145, 0.02) 0%, transparent 50%)'
                }}
            >
                {/* Channel Header - Modern glassmorphism */}
                <div 
                    className="h-16 px-5 flex items-center justify-between border-b flex-shrink-0"
                    style={{ 
                        borderColor: 'rgba(0, 255, 145, 0.1)',
                        background: 'linear-gradient(180deg, rgba(0, 255, 145, 0.03) 0%, transparent 100%)'
                    }}
                >
                    <div className="flex items-center gap-4">
                        <div className="p-2 rounded-xl bg-[#00FF91]/10">
                            <Hash className="w-5 h-5 text-[#00FF91]" />
                        </div>
                        <div>
                            <h2 className="font-bold text-white text-lg">{getCurrentChannelName()}</h2>
                            <p className="text-sm text-gray-500">{getCurrentChannelDescription()}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handleManualRefresh}
                            className="p-2.5 rounded-xl hover:bg-white/10 transition-all duration-200 hover:scale-105"
                            title="Refresh messages"
                            disabled={isRefreshing}
                        >
                            <RefreshCw className={`w-4 h-4 text-gray-400 hover:text-[#00FF91] ${isRefreshing ? 'animate-spin text-[#00FF91]' : ''}`} />
                        </button>
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search messages..."
                                className="w-48 pl-10 pr-4 py-2.5 text-sm rounded-xl border focus:border-[#00FF91] focus:outline-none transition-all duration-200 focus:shadow-[0_0_20px_rgba(0,255,145,0.1)]"
                                style={{ backgroundColor: 'rgba(5, 19, 35, 0.8)', borderColor: 'rgba(255,255,255,0.1)', color: 'white' }}
                            />
                        </div>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto py-6">
                    {/* Welcome Message for empty channels - Modern card style */}
                    {messages.length === 0 && !isInitialLoading && (
                        <div className="flex flex-col items-center justify-center h-full text-center px-4">
                            <div className="relative mb-6">
                                <div className="absolute inset-0 rounded-full bg-[#00FF91]/20 blur-xl" />
                                <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-[#00FF91]/20 to-[#00FF91]/5 flex items-center justify-center border border-[#00FF91]/20">
                                    <MessageSquare className="w-10 h-10 text-[#00FF91]" />
                                </div>
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-3">
                                Welcome to <span className="text-[#00FF91]">#{getCurrentChannelName()}</span>
                            </h3>
                            <p className="text-gray-400 max-w-md text-base leading-relaxed">
                                This is the start of the #{getCurrentChannelName()} channel. 
                                Be the first to share something with the community!
                            </p>
                        </div>
                    )}

                    {/* Loading State - Modern spinner */}
                    {isInitialLoading && messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full gap-4">
                            <div className="relative">
                                <div className="absolute inset-0 rounded-full bg-[#00FF91]/20 blur-lg animate-pulse" />
                                <Loader2 className="w-10 h-10 animate-spin text-[#00FF91] relative" />
                            </div>
                            <p className="text-gray-500 text-sm font-medium">Loading messages...</p>
                        </div>
                    )}

                    {/* Error State - Modern alert */}
                    {error && (
                        <div 
                            className="mx-5 mb-4 p-4 rounded-xl flex items-center gap-3"
                            style={{ 
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.2)'
                            }}
                        >
                            <div className="p-2 rounded-lg bg-red-500/20">
                                <MessageSquare className="w-4 h-4 text-red-400" />
                            </div>
                            <div className="flex-1">
                                <p className="text-red-400 font-medium text-sm">{error}</p>
                                <button 
                                    onClick={() => fetchMessages({ isManualRefresh: true })}
                                    className="text-red-400/80 text-xs mt-1 hover:text-red-300 transition-colors"
                                >
                                    Click to retry
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Messages List */}
                    <div className="space-y-1">
                        {messages.map(message => (
                            <ChatMessageItem 
                                key={message.id} 
                                message={message}
                                currentUserId={currentUser.id}
                                onDelete={handleDeleteMessage}
                                onReact={handleReaction}
                                onReply={handleReply}
                            />
                        ))}
                    </div>
                    <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-4 flex-shrink-0 border-t" style={{ borderColor: 'rgba(0, 255, 145, 0.1)' }}>
                    {/* Reply Preview Bar */}
                    {replyingTo && (
                        <div 
                            className="mb-3 px-4 py-3 rounded-xl flex items-center gap-3 animate-in slide-in-from-bottom-2 duration-200"
                            style={{ 
                                backgroundColor: 'rgba(0, 255, 145, 0.08)',
                                border: '1px solid rgba(0, 255, 145, 0.2)'
                            }}
                        >
                            <Reply className="w-4 h-4 text-[#00FF91] flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <span className="text-xs text-[#00FF91] font-medium">Replying to {replyingTo.userName}</span>
                                <p className="text-sm text-gray-400 truncate">{replyingTo.content}</p>
                            </div>
                            <button 
                                onClick={cancelReply}
                                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                            >
                                <X className="w-4 h-4 text-gray-400 hover:text-white" />
                            </button>
                        </div>
                    )}
                    
                    <div 
                        className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 focus-within:border-[#00FF91] focus-within:shadow-[0_0_20px_rgba(0,255,145,0.1)]"
                        style={{ backgroundColor: '#0a1628', borderColor: moderationWarning ? '#FF4444' : 'rgba(255,255,255,0.1)' }}
                    >
                        <input
                            ref={inputRef}
                            type="text"
                            value={messageInput}
                            onChange={(e) => {
                                setMessageInput(e.target.value);
                                if (moderationWarning) setModerationWarning(null);
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                            placeholder={replyingTo ? `Reply to ${replyingTo.userName}...` : `Message #${getCurrentChannelName()}`}
                            className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-500 text-[15px]"
                            disabled={isSending}
                        />
                        <button 
                            onClick={handleSendMessage}
                            disabled={!messageInput.trim() || isSending}
                            className="p-2.5 rounded-xl bg-[#00FF91] hover:bg-[#00FF91]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-[0_0_20px_rgba(0,255,145,0.3)]"
                        >
                            {isSending ? (
                                <Loader2 className="w-5 h-5 text-[#051323] animate-spin" />
                            ) : (
                                <Send className="w-5 h-5 text-[#051323]" />
                            )}
                        </button>
                    </div>
                    
                    {/* Moderation Warning */}
                    {moderationWarning && (
                        <div className="mt-2 px-4 py-2 rounded-lg flex items-center gap-2 text-sm animate-pulse" 
                             style={{ backgroundColor: 'rgba(255, 68, 68, 0.15)', border: '1px solid rgba(255, 68, 68, 0.3)' }}>
                            <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span className="text-red-400">{moderationWarning}</span>
                            <button 
                                onClick={() => setModerationWarning(null)}
                                className="ml-auto text-red-400 hover:text-red-300"
                            >
                                ×
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Member Sidebar */}
            <MemberSidebar 
                onlineUsers={onlineUsers}
                offlineUsers={offlineUsers}
                totalUsers={onlineUsers.length + offlineUsers.length}
                isLoading={isLoadingUsers}
            />
        </div>
    );
}
