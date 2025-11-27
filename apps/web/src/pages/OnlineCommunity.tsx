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
import { useNavigate } from 'react-router-dom';
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
    Trash2
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
 * Channel Sidebar Component
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
            style={{ backgroundColor: '#0a1628', borderColor: 'rgba(0, 255, 145, 0.1)' }}
        >
            {/* Server Header */}
            <div 
                className="h-14 px-4 flex items-center justify-between border-b"
                style={{ borderColor: 'rgba(0, 255, 145, 0.1)' }}
            >
                <div className="flex items-center gap-3">
                    <img 
                        src="https://static.wixstatic.com/media/0c204d_5f310ee2b2a848ceac8e68b25c0c39eb~mv2.png"
                        alt="SOMOS.tech"
                        className="w-8 h-8 rounded-full"
                    />
                    <span className="font-bold text-white">SOMOS Community</span>
                </div>
            </div>

            {/* Quick Links */}
            <div className="px-3 py-3 space-y-1 border-b" style={{ borderColor: 'rgba(0, 255, 145, 0.1)' }}>
                <button 
                    onClick={() => navigate('/groups')}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-[#00FF91]/10 transition-colors group"
                >
                    <Users className="w-4 h-4 text-[#00FF91]" />
                    <span className="text-sm text-gray-300 group-hover:text-white">Browse Groups</span>
                    <ExternalLink className="w-3 h-3 ml-auto text-gray-500 opacity-0 group-hover:opacity-100" />
                </button>
            </div>

            {/* Channel Categories */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
                {CHANNEL_CATEGORIES.map(category => (
                    <div key={category.name}>
                        <button
                            onClick={() => toggleCategory(category.name)}
                            className="w-full flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wider hover:text-white transition-colors mb-1"
                            style={{ color: '#8394A7' }}
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
                            <div className="space-y-0.5">
                                {category.channels.map(channel => (
                                    <button
                                        key={channel.id}
                                        onClick={() => onSelectChannel(channel.id)}
                                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all ${
                                            selectedChannel === channel.id 
                                                ? 'bg-[#00FF91]/20 text-white border border-[#00FF91]/30' 
                                                : 'hover:bg-white/5 text-gray-400 hover:text-gray-200'
                                        }`}
                                    >
                                        <channel.icon className={`w-4 h-4 ${selectedChannel === channel.id ? 'text-[#00FF91]' : ''}`} />
                                        <span className="text-sm">{channel.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* User Panel */}
            <div 
                className="h-16 px-3 flex items-center gap-3 border-t cursor-pointer hover:bg-white/5 transition-colors"
                style={{ backgroundColor: '#071018', borderColor: 'rgba(0, 255, 145, 0.1)' }}
                onClick={onNavigateToProfile}
            >
                <div className="relative">
                    <UserAvatar 
                        name={currentUser?.name || 'You'} 
                        photoUrl={currentUser?.photoUrl}
                        size="sm" 
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#00FF91] border-2 border-[#071018]" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{currentUser?.name || 'You'}</div>
                    <div className="text-xs text-[#00FF91]">Online</div>
                </div>
                <Settings className="w-4 h-4 text-gray-500 hover:text-white transition-colors" />
            </div>
        </div>
    );
}

/**
 * Chat Message Component
 */
function ChatMessageItem({ 
    message, 
    currentUserId,
    onDelete,
    onReact
}: { 
    message: Message;
    currentUserId: string;
    onDelete: (messageId: string) => void;
    onReact: (messageId: string, emoji: string) => void;
}) {
    const isOwn = message.userId === currentUserId;
    const [showActions, setShowActions] = useState(false);
    
    return (
        <div 
            className="group flex gap-4 py-3 px-4 hover:bg-white/5 transition-colors rounded-lg mx-2"
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            <UserAvatar
                photoUrl={message.userPhoto || undefined}
                name={message.userName}
                size="md"
            />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className={`font-semibold ${isOwn ? 'text-[#00FF91]' : 'text-white'}`}>
                        {message.userName}
                    </span>
                    <span className="text-xs text-gray-500">
                        {new Date(message.createdAt).toLocaleString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                        })}
                    </span>
                </div>

                {/* Reply Preview */}
                {message.replyTo && (
                    <div 
                        className="text-xs mb-2 pl-3 py-1 border-l-2 rounded-r bg-white/5"
                        style={{ borderColor: '#00FF91' }}
                    >
                        <span className="text-[#00FF91]">@{message.replyTo.userName}</span>
                        <span className="text-gray-400 ml-2 truncate">{message.replyTo.content}</span>
                    </div>
                )}

                {/* Message Content */}
                <p className="text-gray-200 whitespace-pre-wrap break-words leading-relaxed">
                    {message.content}
                </p>

                {/* Reactions */}
                {message.reactions && message.reactions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                        {message.reactions.map((reaction, idx) => (
                            <button
                                key={idx}
                                onClick={() => onReact(message.id, reaction.emoji)}
                                className="flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all hover:scale-105"
                                style={{ 
                                    backgroundColor: reaction.users.includes(currentUserId) 
                                        ? 'rgba(0, 255, 145, 0.2)' 
                                        : 'rgba(255, 255, 255, 0.1)',
                                    border: reaction.users.includes(currentUserId) 
                                        ? '1px solid rgba(0, 255, 145, 0.5)' 
                                        : '1px solid transparent'
                                }}
                            >
                                <span>{reaction.emoji}</span>
                                <span className={reaction.users.includes(currentUserId) ? 'text-[#00FF91]' : 'text-gray-400'}>
                                    {reaction.count}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Message Actions (shown on hover) */}
            {showActions && (
                <div className="flex items-start gap-1">
                    <button 
                        onClick={() => onReact(message.id, '❤️')}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                        title="React"
                    >
                        <Smile className="w-4 h-4 text-gray-400 hover:text-white" />
                    </button>
                    {isOwn && (
                        <button 
                            onClick={() => onDelete(message.id)}
                            className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors"
                            title="Delete"
                        >
                            <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-400" />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

/**
 * Member Sidebar Component
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
            style={{ backgroundColor: '#0a1628', borderColor: 'rgba(0, 255, 145, 0.1)' }}
        >
            <div className="p-4">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#00FF91]" />
                    Members
                    {isLoading && <Loader2 className="w-3 h-3 animate-spin text-gray-400" />}
                </h3>

                {/* Online Members */}
                {onlineUsers.length > 0 && (
                    <div className="mb-6">
                        <div className="text-xs font-medium uppercase tracking-wider mb-2 flex items-center gap-2" style={{ color: '#00FF91' }}>
                            <div className="w-2 h-2 rounded-full bg-[#00FF91]" />
                            Online — {onlineUsers.length}
                        </div>
                        <div className="space-y-1">
                            {onlineUsers.map(user => (
                                <div 
                                    key={user.id}
                                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
                                >
                                    <div className="relative">
                                        <UserAvatar name={user.name} photoUrl={user.photoUrl} size="sm" />
                                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#00FF91] border-2 border-[#0a1628]" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className={`text-sm truncate block ${user.isCurrentUser ? 'text-[#00FF91] font-medium' : 'text-gray-200'}`}>
                                            {user.name}
                                            {user.isCurrentUser && ' (you)'}
                                        </span>
                                    </div>
                                    {user.isAdmin && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#00FF91]/20 text-[#00FF91]">
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
                        <div className="text-xs font-medium uppercase tracking-wider mb-2 text-gray-500">
                            Offline — {offlineUsers.length}
                        </div>
                        <div className="space-y-1">
                            {offlineUsers.slice(0, 10).map(user => (
                                <div 
                                    key={user.id}
                                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors opacity-60"
                                >
                                    <UserAvatar name={user.name} photoUrl={user.photoUrl} size="sm" />
                                    <span className="text-sm text-gray-400 truncate">{user.name}</span>
                                </div>
                            ))}
                            {offlineUsers.length > 10 && (
                                <p className="text-xs text-gray-500 px-2 py-1">
                                    +{offlineUsers.length - 10} more members
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {totalUsers === 0 && !isLoading && (
                    <p className="text-sm text-gray-500 text-center py-4">
                        No members yet
                    </p>
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
    
    const [selectedChannel, setSelectedChannel] = useState('general');
    const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
    const [messageInput, setMessageInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const [onlineUsers, setOnlineUsers] = useState<CommunityUser[]>([]);
    const [offlineUsers, setOfflineUsers] = useState<CommunityUser[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null);

    // Current user info from context
    const currentUser = {
        id: authUser?.userId || '',
        name: displayName,
        photoUrl: profilePicture
    };

    // Fetch messages for selected channel
    const fetchMessages = useCallback(async () => {
        if (!selectedChannel) return;
        
        setIsLoadingMessages(true);
        setError(null);
        
        try {
            const response = await fetch(`/api/community-messages/${selectedChannel}?limit=100`);
            if (!response.ok) {
                throw new Error('Failed to fetch messages');
            }
            const json = await response.json();
            // API returns { success, data: { messages } }
            const data = json.data || json;
            setMessages(data.messages || []);
        } catch (err) {
            console.error('Error fetching messages:', err);
            setError('Failed to load messages');
        } finally {
            setIsLoadingMessages(false);
        }
    }, [selectedChannel]);

    // Fetch active users
    const fetchActiveUsers = useCallback(async () => {
        setIsLoadingUsers(true);
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

    // Channel change handler
    useEffect(() => {
        fetchMessages();
    }, [selectedChannel, fetchMessages]);

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
        
        try {
            const response = await fetch(`/api/community-messages/${selectedChannel}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: messageInput.trim() })
            });
            
            if (!response.ok) {
                throw new Error('Failed to send message');
            }
            
            const json = await response.json();
            // API returns { success, data: { message } }
            const data = json.data || json;
            setMessages(prev => [...prev, data.message]);
            setMessageInput('');
        } catch (err) {
            console.error('Error sending message:', err);
            setError('Failed to send message');
        } finally {
            setIsSending(false);
        }
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
        return 'general';
    };

    const getCurrentChannelDescription = () => {
        for (const category of CHANNEL_CATEGORIES) {
            const channel = category.channels.find(c => c.id === selectedChannel);
            if (channel) return channel.description;
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
            <div className="flex-1 flex flex-col min-w-0" style={{ backgroundColor: '#0d1f2d' }}>
                {/* Channel Header */}
                <div 
                    className="h-14 px-4 flex items-center justify-between border-b flex-shrink-0"
                    style={{ borderColor: 'rgba(0, 255, 145, 0.1)' }}
                >
                    <div className="flex items-center gap-3">
                        <Hash className="w-5 h-5 text-[#00FF91]" />
                        <div>
                            <span className="font-semibold text-white">{getCurrentChannelName()}</span>
                            <span className="text-sm text-gray-500 ml-3">{getCurrentChannelDescription()}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={fetchMessages}
                            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                            title="Refresh messages"
                        >
                            <RefreshCw className={`w-4 h-4 text-gray-400 hover:text-white ${isLoadingMessages ? 'animate-spin' : ''}`} />
                        </button>
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search"
                                className="w-40 pl-9 pr-3 py-2 text-sm rounded-lg border focus:border-[#00FF91] focus:outline-none transition-colors"
                                style={{ backgroundColor: '#051323', borderColor: 'rgba(255,255,255,0.1)', color: 'white' }}
                            />
                        </div>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto py-4">
                    {/* Welcome Message for empty channels */}
                    {messages.length === 0 && !isLoadingMessages && (
                        <div className="flex flex-col items-center justify-center h-full text-center px-4">
                            <div className="w-16 h-16 rounded-full bg-[#00FF91]/20 flex items-center justify-center mb-4">
                                <MessageSquare className="w-8 h-8 text-[#00FF91]" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">
                                Welcome to #{getCurrentChannelName()}!
                            </h3>
                            <p className="text-gray-400 max-w-md">
                                This is the beginning of the #{getCurrentChannelName()} channel. 
                                Start the conversation!
                            </p>
                        </div>
                    )}

                    {/* Loading State */}
                    {isLoadingMessages && messages.length === 0 && (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="w-8 h-8 animate-spin text-[#00FF91]" />
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div className="mx-4 mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
                            {error}
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
                            />
                        ))}
                    </div>
                    <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-4 flex-shrink-0 border-t" style={{ borderColor: 'rgba(0, 255, 145, 0.1)' }}>
                    <div 
                        className="flex items-center gap-3 px-4 py-3 rounded-xl border focus-within:border-[#00FF91] transition-colors"
                        style={{ backgroundColor: '#0a1628', borderColor: 'rgba(255,255,255,0.1)' }}
                    >
                        <input
                            type="text"
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                            placeholder={`Message #${getCurrentChannelName()}`}
                            className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-500"
                            disabled={isSending}
                        />
                        <button 
                            onClick={handleSendMessage}
                            disabled={!messageInput.trim() || isSending}
                            className="p-2 rounded-lg bg-[#00FF91] hover:bg-[#00FF91]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {isSending ? (
                                <Loader2 className="w-5 h-5 text-[#051323] animate-spin" />
                            ) : (
                                <Send className="w-5 h-5 text-[#051323]" />
                            )}
                        </button>
                    </div>
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
