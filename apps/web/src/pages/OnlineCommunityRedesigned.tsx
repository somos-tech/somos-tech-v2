/**
 * Community Page - Redesigned
 * 
 * Modern, sleek real-time community chat with:
 * - Glassmorphism design elements
 * - Reactions below messages (left-aligned)
 * - Clickable user profiles with location display
 * - Smooth animations and transitions
 * 
 * @module pages/Community
 * @author SOMOS.tech
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    MessageCircle,
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
    X,
    Sparkles,
    MapPin,
    Megaphone,
    Briefcase,
    Calendar,
    Star,
    Bell,
    BellOff
} from 'lucide-react';
import { UserAvatar } from '@/components/DefaultAvatar';
import UserProfilePopup from '@/components/UserProfilePopup';
import { useUserContext } from '@/contexts/UserContext';

// Official SOMOS.tech logo URL
const SOMOS_LOGO_URL = 'https://stsomostechdev64qb73pzvg.blob.core.windows.net/site-branding/shortcircle.png';

// Background image for header
const HEADER_BG_URL = 'https://stsomostechdev64qb73pzvg.blob.core.windows.net/site-branding/beyondthecouldv2';

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
    location?: string;
    status: 'online' | 'offline';
    isAdmin?: boolean;
    isCurrentUser?: boolean;
}

// Channel categories and channels with modern icons
const CHANNEL_CATEGORIES = [
    {
        name: 'Information',
        icon: '📢',
        channels: [
            { id: 'announcements', name: 'announcements', icon: Megaphone, description: 'Important announcements' },
        ]
    },
    {
        name: 'General',
        icon: '💬',
        channels: [
            { id: 'introductions', name: 'introductions', icon: Users, description: 'Introduce yourself!' },
            { id: 'general', name: 'general', icon: MessageCircle, description: 'General discussion' },
            { id: 'opportunities', name: 'opportunities', icon: Briefcase, description: 'Job & opportunities' },
        ]
    },
    {
        name: 'Community',
        icon: '🌟',
        channels: [
            { id: 'events', name: 'events', icon: Calendar, description: 'Community events' },
            // City Chapters
            { id: 'group-seattle', name: 'Seattle, WA', icon: MapPin, description: 'Seattle tech community' },
            { id: 'group-newyork', name: 'New York, NY', icon: MapPin, description: 'New York tech community' },
            { id: 'group-boston', name: 'Boston, MA', icon: MapPin, description: 'Boston tech community' },
            { id: 'group-denver', name: 'Denver, CO', icon: MapPin, description: 'Denver tech community' },
            { id: 'group-washingtondc', name: 'Washington DC', icon: MapPin, description: 'Washington DC tech community' },
            { id: 'group-atlanta', name: 'Atlanta, GA', icon: MapPin, description: 'Atlanta tech community' },
            { id: 'group-sanfrancisco', name: 'San Francisco, CA', icon: MapPin, description: 'San Francisco tech community' },
            { id: 'group-chicago', name: 'Chicago, IL', icon: MapPin, description: 'Chicago tech community' },
            { id: 'group-austin', name: 'Austin, TX', icon: MapPin, description: 'Austin tech community' },
            { id: 'group-houston', name: 'Houston, TX', icon: MapPin, description: 'Houston tech community' },
            { id: 'group-losangeles', name: 'Los Angeles, CA', icon: MapPin, description: 'Los Angeles tech community' },
            { id: 'group-miami', name: 'Miami, FL', icon: MapPin, description: 'Miami tech community' },
            { id: 'group-dallas', name: 'Dallas, TX', icon: MapPin, description: 'Dallas tech community' },
            { id: 'group-phoenix', name: 'Phoenix, AZ', icon: MapPin, description: 'Phoenix tech community' },
            { id: 'group-sandiego', name: 'San Diego, CA', icon: MapPin, description: 'San Diego tech community' },
            { id: 'group-philadelphia', name: 'Philadelphia, PA', icon: MapPin, description: 'Philadelphia tech community' },
            { id: 'group-sacramento', name: 'Sacramento, CA', icon: MapPin, description: 'Sacramento tech community' },
            { id: 'group-dallasftworth', name: 'Dallas/Ft. Worth, TX', icon: MapPin, description: 'DFW tech community' },
        ]
    },
];

// Helper to get all channel IDs for lookup
const ALL_CHANNELS = CHANNEL_CATEGORIES.flatMap(cat => cat.channels);

// Local storage key for favorites
const FAVORITES_STORAGE_KEY = 'somos-community-favorites';

// Local storage key for notification settings
const NOTIFICATIONS_STORAGE_KEY = 'somos-community-notifications';

// Default notification settings
const DEFAULT_NOTIFICATIONS = {
    announcements: true,
    events: true
};

// Quick emoji reactions - 5 essential reactions
const EMOJI_REACTIONS = ['👍', '❤️', '💯', '😎', '😮'];

/**
 * Modern Channel Sidebar Component with Favorites
 */
function ChannelSidebar({ 
    selectedChannel, 
    onSelectChannel,
    collapsedCategories,
    toggleCategory,
    currentUser,
    onNavigateToProfile,
    favorites,
    onToggleFavorite
}: {
    selectedChannel: string;
    onSelectChannel: (id: string) => void;
    collapsedCategories: Set<string>;
    toggleCategory: (name: string) => void;
    currentUser: { name: string; photoUrl?: string } | null;
    onNavigateToProfile: () => void;
    favorites: Set<string>;
    onToggleFavorite: (channelId: string) => void;
}) {
    const navigate = useNavigate();
    
    // Get favorite channels
    const favoriteChannels = ALL_CHANNELS.filter(ch => favorites.has(ch.id));
    
    return (
        <div 
            className="w-72 flex-shrink-0 flex flex-col h-full"
            style={{ 
                backgroundColor: '#0a1520',
                borderRight: '1px solid rgba(0, 255, 145, 0.06)'
            }}
        >
            {/* Community Header with Background */}
            <div 
                className="h-20 px-5 flex items-start pt-3 relative overflow-hidden"
                style={{ 
                    borderBottom: '1px solid rgba(0, 255, 145, 0.08)',
                }}
            >
                {/* Background Image - aligned right */}
                <div 
                    className="absolute inset-0 z-0"
                    style={{
                        backgroundImage: `url(${HEADER_BG_URL})`,
                        backgroundSize: 'auto 100%',
                        backgroundPosition: 'right center',
                        backgroundRepeat: 'no-repeat',
                        opacity: 0.9
                    }}
                />
                {/* Gradient Overlay - fade from left */}
                <div 
                    className="absolute inset-0 z-[1]"
                    style={{
                        background: 'linear-gradient(270deg, transparent 0%, rgba(10, 21, 32, 0.3) 40%, rgba(10, 21, 32, 0.8) 100%)'
                    }}
                />
                <div className="relative z-10">
                    <span className="font-bold text-white text-xl tracking-tight">Community</span>
                </div>
            </div>

            {/* Channel Categories */}
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4 scrollbar-thin scrollbar-thumb-[#00FF91]/10 scrollbar-track-transparent">
                {/* Favorites Section - Only show if there are favorites */}
                {favoriteChannels.length > 0 && (
                    <div>
                        <button
                            onClick={() => toggleCategory('Favorites')}
                            className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.1em] hover:text-white transition-colors rounded-lg hover:bg-white/5"
                            style={{ color: '#FFD700' }}
                        >
                            {collapsedCategories.has('Favorites') ? (
                                <ChevronRight className="w-3.5 h-3.5" />
                            ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                            )}
                            <Star className="w-3.5 h-3.5 fill-current" />
                            <span>Favorites</span>
                        </button>
                        
                        {!collapsedCategories.has('Favorites') && (
                            <div className="mt-1.5 space-y-0.5 pl-2">
                                {favoriteChannels.map(channel => (
                                    <div key={channel.id} className="group/item relative">
                                        <button
                                            onClick={() => onSelectChannel(channel.id)}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 group ${
                                                selectedChannel === channel.id 
                                                    ? 'text-white' 
                                                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                                            }`}
                                            style={{
                                                background: selectedChannel === channel.id 
                                                    ? 'linear-gradient(90deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 215, 0, 0.05) 100%)' 
                                                    : 'transparent',
                                                border: selectedChannel === channel.id 
                                                    ? '1px solid rgba(255, 215, 0, 0.15)' 
                                                    : '1px solid transparent',
                                            }}
                                        >
                                            <channel.icon className={`w-4 h-4 transition-colors ${selectedChannel === channel.id ? 'text-[#FFD700]' : 'text-gray-500 group-hover:text-gray-400'}`} />
                                            <span className="text-sm font-medium truncate flex-1">{channel.name}</span>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onToggleFavorite(channel.id); }}
                                                className="opacity-0 group-hover/item:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded"
                                                title="Remove from favorites"
                                            >
                                                <Star className="w-3 h-3 text-[#FFD700] fill-current" />
                                            </button>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Regular Categories */}
                {CHANNEL_CATEGORIES.map(category => (
                    <div key={category.name}>
                        <button
                            onClick={() => toggleCategory(category.name)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.1em] hover:text-white transition-colors rounded-lg hover:bg-white/5"
                            style={{ color: '#5a6a7a' }}
                        >
                            {collapsedCategories.has(category.name) ? (
                                <ChevronRight className="w-3.5 h-3.5" />
                            ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                            )}
                            <span className="text-base">{category.icon}</span>
                            <span>{category.name}</span>
                        </button>
                        
                        {!collapsedCategories.has(category.name) && (
                            <div className="mt-1.5 space-y-0.5 pl-2">
                                {category.channels.map(channel => (
                                    <div key={channel.id} className="group/item relative">
                                        <button
                                            onClick={() => onSelectChannel(channel.id)}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 group ${
                                                selectedChannel === channel.id 
                                                    ? 'text-white' 
                                                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                                            }`}
                                            style={{
                                                background: selectedChannel === channel.id 
                                                    ? 'linear-gradient(90deg, rgba(0, 255, 145, 0.15) 0%, rgba(0, 255, 145, 0.05) 100%)' 
                                                    : 'transparent',
                                                border: selectedChannel === channel.id 
                                                    ? '1px solid rgba(0, 255, 145, 0.15)' 
                                                    : '1px solid transparent',
                                                boxShadow: selectedChannel === channel.id 
                                                    ? '0 0 20px rgba(0, 255, 145, 0.08)' 
                                                    : 'none'
                                            }}
                                        >
                                            <channel.icon className={`w-4 h-4 transition-colors flex-shrink-0 ${selectedChannel === channel.id ? 'text-[#00FF91]' : 'text-gray-500 group-hover:text-gray-400'}`} />
                                            <span className="text-sm font-medium truncate flex-1">{channel.name}</span>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onToggleFavorite(channel.id); }}
                                                className="opacity-0 group-hover/item:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded"
                                                title={favorites.has(channel.id) ? "Remove from favorites" : "Add to favorites"}
                                            >
                                                <Star className={`w-3 h-3 ${favorites.has(channel.id) ? 'text-[#FFD700] fill-current' : 'text-gray-500'}`} />
                                            </button>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* User Panel */}
            <div 
                className="px-3 py-3"
                style={{ borderTop: '1px solid rgba(0, 255, 145, 0.08)' }}
            >
                <div 
                    className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 hover:bg-white/5 group"
                    onClick={onNavigateToProfile}
                    style={{ border: '1px solid rgba(255, 255, 255, 0.03)' }}
                >
                    <div className="relative">
                        <UserAvatar 
                            name={currentUser?.name || 'You'} 
                            photoUrl={currentUser?.photoUrl}
                            size="sm" 
                        />
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#00FF91] border-2 border-[#0a1520]" style={{ boxShadow: '0 0 10px rgba(0, 255, 145, 0.5)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-white truncate">{currentUser?.name || 'You'}</div>
                        <div className="text-xs text-[#00FF91] font-medium flex items-center gap-1">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00FF91] opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00FF91]"></span>
                            </span>
                            Online
                        </div>
                    </div>
                    <Settings className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
                </div>
            </div>
        </div>
    );
}

/**
 * Hyperlink Preview Component - Rich previews with Open Graph metadata
 */
function LinkPreview({ url }: { url: string }) {
    const [preview, setPreview] = useState<{ 
        title?: string; 
        description?: string; 
        image?: string; 
        icon?: string;
        siteName?: string;
        loading: boolean; 
        error: boolean 
    }>({
        loading: true,
        error: false
    });
    const [imageError, setImageError] = useState(false);

    useEffect(() => {
        let isMounted = true;
        setImageError(false);
        
        const fetchPreview = async () => {
            try {
                const response = await fetch('/api/link-preview', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url })
                });
                
                if (!response.ok) throw new Error('Failed to fetch');
                
                const json = await response.json();
                const data = json.data || json;
                
                if (isMounted) {
                    setPreview({
                        title: data.title,
                        description: data.description,
                        image: data.image,
                        icon: data.icon,
                        siteName: data.siteName,
                        loading: false,
                        error: false
                    });
                }
            } catch {
                // Fallback to basic preview
                try {
                    const urlObj = new URL(url);
                    const domain = urlObj.hostname.replace('www.', '');
                    if (isMounted) {
                        setPreview({
                            title: domain,
                            description: url,
                            siteName: domain,
                            loading: false,
                            error: false
                        });
                    }
                } catch {
                    if (isMounted) {
                        setPreview({ loading: false, error: true });
                    }
                }
            }
        };
        
        fetchPreview();
        
        return () => { isMounted = false; };
    }, [url]);

    if (preview.loading) {
        return (
            <div className="mt-3 rounded-xl border overflow-hidden animate-pulse" style={{ backgroundColor: 'rgba(10, 22, 40, 0.8)', borderColor: 'rgba(255,255,255,0.08)' }}>
                <div className="p-4 flex items-start gap-3">
                    <div className="w-12 h-12 rounded-lg bg-white/10 flex-shrink-0"></div>
                    <div className="flex-1">
                        <div className="h-3 bg-white/10 rounded w-1/4 mb-2"></div>
                        <div className="h-4 bg-white/10 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-white/5 rounded w-full"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (preview.error) return null;

    // Check if we have an image for rich preview
    const hasImage = preview.image && !preview.image.includes('undefined') && !imageError;

    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 block rounded-xl border overflow-hidden hover:border-[#00FF91]/30 transition-all duration-200 group"
            style={{ backgroundColor: 'rgba(10, 22, 40, 0.8)', borderColor: 'rgba(255,255,255,0.1)' }}
        >
            {/* Image Preview */}
            {hasImage && (
                <div className="relative h-40 overflow-hidden bg-gray-900">
                    <img 
                        src={preview.image}
                        alt={preview.title || 'Link preview'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={() => setImageError(true)}
                    />
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#051323] via-transparent to-transparent opacity-60" />
                </div>
            )}
            
            {/* Content */}
            <div className="p-3">
                {/* Site name / domain with icon */}
                <div className="flex items-center gap-2 mb-1.5">
                    {preview.icon ? (
                        <img 
                            src={preview.icon} 
                            alt="" 
                            className="w-4 h-4 rounded flex-shrink-0"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                    ) : (
                        <div className="w-4 h-4 rounded bg-gradient-to-br from-[#00FF91]/20 to-[#02dbff]/20 flex items-center justify-center flex-shrink-0">
                            <ExternalLink className="w-2.5 h-2.5 text-[#02dbff]" />
                        </div>
                    )}
                    <span className="text-xs text-gray-500 font-medium truncate">
                        {preview.siteName || new URL(url).hostname.replace('www.', '')}
                    </span>
                </div>
                
                {/* Title */}
                {preview.title && preview.title !== preview.siteName && (
                    <h4 className="text-sm font-semibold text-white group-hover:text-[#00FF91] transition-colors line-clamp-2 mb-1">
                        {preview.title}
                    </h4>
                )}
                
                {/* Description */}
                {preview.description && preview.description !== url && (
                    <p className="text-xs text-gray-400 line-clamp-2">
                        {preview.description}
                    </p>
                )}
            </div>
        </a>
    );
}

/**
 * Parse message content and extract URLs
 */
function parseMessageContent(content: string): { text: string; urls: string[] } {
    const urlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;
    const urls = content.match(urlRegex) || [];
    return { text: content, urls: [...new Set(urls)] }; // Remove duplicates
}

/**
 * Modern Chat Message Component with reactions below
 */
function ChatMessageItem({ 
    message, 
    currentUserId,
    isAdmin,
    onDelete,
    onReact,
    onReply,
    onUserClick
}: { 
    message: Message;
    currentUserId: string;
    isAdmin: boolean;
    onDelete: (messageId: string) => void;
    onReact: (messageId: string, emoji: string) => void;
    onReply: (message: Message) => void;
    onUserClick: (userId: string, userName: string, userPhoto: string | null, event: React.MouseEvent) => void;
}) {
    const isOwn = message.userId === currentUserId;
    const canDelete = isOwn || isAdmin; // Allow delete if own message OR admin
    const [showActions, setShowActions] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    
    // Parse message for URLs
    const { urls } = parseMessageContent(message.content);
    
    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday = date.toDateString() === yesterday.toDateString();
        
        if (isToday) {
            return `Today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
        } else if (isYesterday) {
            return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
        }
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    };
    
    return (
        <div 
            className="group relative py-3 px-5 transition-all duration-200"
            style={{ 
                backgroundColor: showActions ? 'rgba(0, 255, 145, 0.02)' : 'transparent',
            }}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => { setShowActions(false); setShowEmojiPicker(false); }}
        >
            <div className="flex gap-4">
                {/* Avatar - Clickable */}
                <button 
                    className="relative flex-shrink-0 hover:opacity-90 transition-opacity"
                    onClick={(e) => onUserClick(message.userId, message.userName, message.userPhoto, e)}
                >
                    <UserAvatar
                        photoUrl={message.userPhoto || undefined}
                        name={message.userName}
                        size="md"
                    />
                </button>
                
                <div className="flex-1 min-w-0">
                    {/* Header with name and time */}
                    <div className="flex items-baseline gap-2 mb-1">
                        <button
                            onClick={(e) => onUserClick(message.userId, message.userName, message.userPhoto, e)}
                            className={`font-semibold text-[15px] hover:underline transition-colors ${isOwn ? 'text-[#00FF91]' : 'text-white'}`}
                        >
                            {message.userName}
                        </button>
                        {isOwn && <span className="text-xs text-gray-500">(you)</span>}
                        <span className="text-[11px] text-gray-500 font-medium">
                            {formatTime(message.createdAt)}
                        </span>
                    </div>

                    {/* Reply Preview */}
                    {message.replyTo && (
                        <div 
                            className="mb-2 pl-3 py-1.5 pr-3 rounded-lg border-l-2 inline-flex items-start gap-2 max-w-md"
                            style={{ 
                                borderColor: '#00FF91',
                                backgroundColor: 'rgba(0, 255, 145, 0.05)'
                            }}
                        >
                            <Reply className="w-3 h-3 text-[#00FF91] mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                                <span className="text-xs text-[#00FF91] font-medium">@{message.replyTo.userName}</span>
                                <p className="text-gray-400 text-xs truncate">{message.replyTo.content}</p>
                            </div>
                        </div>
                    )}

                    {/* Message Content */}
                    <p className="text-gray-200 whitespace-pre-wrap break-words leading-relaxed text-[15px]">
                        {message.content}
                    </p>

                    {/* Link Previews */}
                    {urls.length > 0 && (
                        <div className="space-y-2">
                            {urls.slice(0, 3).map((url, idx) => (
                                <LinkPreview key={idx} url={url} />
                            ))}
                        </div>
                    )}

                    {/* Reactions & Actions Row - Below message, left-aligned */}
                    <div className={`flex flex-wrap items-center gap-1.5 mt-2 ${showActions || (message.reactions && message.reactions.length > 0) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity duration-200`}>
                        {/* Existing Reactions */}
                        {message.reactions && message.reactions.map((reaction, idx) => {
                            const isReacted = reaction.users.includes(currentUserId);
                            return (
                                <button
                                    key={idx}
                                    onClick={() => onReact(message.id, reaction.emoji)}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 hover:scale-105 ${
                                        isReacted 
                                            ? 'bg-[#00FF91]/15 text-[#00FF91]' 
                                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                    }`}
                                    style={{
                                        border: isReacted ? '1px solid rgba(0, 255, 145, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)'
                                    }}
                                >
                                    <span className="text-sm">{reaction.emoji}</span>
                                    <span>{reaction.count}</span>
                                </button>
                            );
                        })}
                        
                        {/* Action Buttons - Always visible on hover */}
                        <div className="relative">
                            <button
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                className="inline-flex items-center justify-center w-7 h-7 rounded-full text-gray-500 hover:text-[#00FF91] hover:bg-white/10 transition-all"
                                style={{ border: '1px dashed rgba(255, 255, 255, 0.1)' }}
                                title="Add reaction"
                            >
                                <Smile className="w-3.5 h-3.5" />
                            </button>
                            
                            {/* Emoji Picker Dropdown */}
                            {showEmojiPicker && (
                                <div 
                                    className="absolute left-0 top-full mt-2 p-2 rounded-xl shadow-2xl z-[100]"
                                    style={{ 
                                        backgroundColor: 'rgba(8, 20, 35, 0.98)',
                                        border: '1px solid rgba(0, 255, 145, 0.15)',
                                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)'
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="flex gap-1">
                                        {EMOJI_REACTIONS.map(emoji => (
                                            <button
                                                key={emoji}
                                                onClick={() => { onReact(message.id, emoji); setShowEmojiPicker(false); }}
                                                className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 transition-all hover:scale-110 text-xl"
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <button 
                            onClick={() => onReply(message)}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-full text-gray-500 hover:text-[#00FF91] hover:bg-white/10 transition-all"
                            style={{ border: '1px dashed rgba(255, 255, 255, 0.1)' }}
                            title="Reply"
                        >
                            <Reply className="w-3.5 h-3.5" />
                        </button>
                        
                        {canDelete && (
                            <button 
                                onClick={() => onDelete(message.id)}
                                className="inline-flex items-center justify-center w-7 h-7 rounded-full text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                style={{ border: '1px dashed rgba(255, 255, 255, 0.1)' }}
                                title={isOwn ? "Delete" : "Delete (Admin)"}
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Modern Member Sidebar Component with Notification Settings
 */
function MemberSidebar({ 
    onlineUsers, 
    offlineUsers,
    totalUsers,
    isLoading,
    onUserClick,
    notifications,
    onToggleNotification
}: { 
    onlineUsers: CommunityUser[];
    offlineUsers: CommunityUser[];
    totalUsers: number;
    isLoading: boolean;
    onUserClick: (userId: string, userName: string, userPhoto: string | undefined, event: React.MouseEvent) => void;
    notifications: { announcements: boolean; events: boolean };
    onToggleNotification: (type: 'announcements' | 'events') => void;
}) {
    const [showNotificationSettings, setShowNotificationSettings] = useState(false);
    
    return (
        <div 
            className="w-64 flex-shrink-0 h-full overflow-y-auto"
            style={{ 
                backgroundColor: '#0a1520',
                borderLeft: '1px solid rgba(0, 255, 145, 0.06)'
            }}
        >
            <div className="p-4">
                {/* Notification Settings Section */}
                <div className="mb-6">
                    <button
                        onClick={() => setShowNotificationSettings(!showNotificationSettings)}
                        className="w-full flex items-center justify-between px-2 py-2 rounded-lg hover:bg-white/5 transition-colors"
                    >
                        <h3 className="text-xs font-bold text-gray-400 flex items-center gap-2 uppercase tracking-widest">
                            <Bell className="w-4 h-4 text-[#00FF91]" />
                            Notifications
                        </h3>
                        {showNotificationSettings ? (
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                        ) : (
                            <ChevronRight className="w-4 h-4 text-gray-500" />
                        )}
                    </button>
                    
                    {showNotificationSettings && (
                        <div className="mt-2 space-y-2 px-2">
                            {/* Announcements Toggle */}
                            <div 
                                className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5 cursor-pointer hover:bg-white/10 transition-colors"
                                onClick={() => onToggleNotification('announcements')}
                            >
                                <div className="flex items-center gap-2">
                                    <Megaphone className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-300">Announcements</span>
                                </div>
                                <div className={`w-10 h-5 rounded-full p-0.5 transition-colors ${notifications.announcements ? 'bg-[#00FF91]' : 'bg-gray-600'}`}>
                                    <div className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform ${notifications.announcements ? 'translate-x-5' : 'translate-x-0'}`} />
                                </div>
                            </div>
                            
                            {/* Events Toggle */}
                            <div 
                                className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5 cursor-pointer hover:bg-white/10 transition-colors"
                                onClick={() => onToggleNotification('events')}
                            >
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-300">Events</span>
                                </div>
                                <div className={`w-10 h-5 rounded-full p-0.5 transition-colors ${notifications.events ? 'bg-[#00FF91]' : 'bg-gray-600'}`}>
                                    <div className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform ${notifications.events ? 'translate-x-5' : 'translate-x-0'}`} />
                                </div>
                            </div>
                            
                            <p className="text-[10px] text-gray-500 px-1 pt-1">
                                Get notified about new posts in these channels
                            </p>
                        </div>
                    )}
                </div>
                
                {/* Members Section */}
                <h3 className="text-xs font-bold text-gray-400 mb-4 flex items-center gap-2 uppercase tracking-widest px-2">
                    <Users className="w-4 h-4 text-[#00FF91]" />
                    Members
                    {isLoading && <Loader2 className="w-3 h-3 animate-spin text-[#00FF91] ml-auto" />}
                </h3>

                {/* Online Members */}
                {onlineUsers.length > 0 && (
                    <div className="mb-6">
                        <div className="text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-2 px-2 text-[#00FF91]">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00FF91] opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00FF91]"></span>
                            </span>
                            Online — {onlineUsers.length}
                        </div>
                        <div className="space-y-0.5">
                            {onlineUsers.map(user => (
                                <button 
                                    key={user.id}
                                    onClick={(e) => onUserClick(user.id, user.name, user.photoUrl, e)}
                                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 cursor-pointer hover:bg-white/5 group text-left"
                                >
                                    <div className="relative">
                                        <UserAvatar name={user.name} photoUrl={user.photoUrl} size="sm" />
                                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#00FF91] border-2 border-[#0a1520]" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className={`text-sm truncate block font-medium ${user.isCurrentUser ? 'text-[#00FF91]' : 'text-gray-300 group-hover:text-white'}`}>
                                            {user.name}
                                            {user.isCurrentUser && <span className="text-xs opacity-60 ml-1">(you)</span>}
                                        </span>
                                        {user.location && (
                                            <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                                <MapPin className="w-2.5 h-2.5" />
                                                {user.location}
                                            </span>
                                        )}
                                    </div>
                                    {user.isAdmin && (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#00FF91]/10 text-[#00FF91] font-bold">
                                            ADMIN
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Offline Members */}
                {offlineUsers.length > 0 && (
                    <div>
                        <div className="text-[10px] font-bold uppercase tracking-widest mb-2 text-gray-600 px-2">
                            Offline — {offlineUsers.length}
                        </div>
                        <div className="space-y-0.5">
                            {offlineUsers.slice(0, 8).map(user => (
                                <button 
                                    key={user.id}
                                    onClick={(e) => onUserClick(user.id, user.name, user.photoUrl, e)}
                                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 cursor-pointer hover:bg-white/5 opacity-40 hover:opacity-60 text-left"
                                >
                                    <UserAvatar name={user.name} photoUrl={user.photoUrl} size="sm" />
                                    <span className="text-sm text-gray-400 truncate font-medium">{user.name}</span>
                                </button>
                            ))}
                            {offlineUsers.length > 8 && (
                                <p className="text-[10px] text-gray-600 px-3 py-2 font-medium">
                                    +{offlineUsers.length - 8} more members
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {totalUsers === 0 && !isLoading && (
                    <div className="text-center py-10">
                        <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-3">
                            <Users className="w-7 h-7 text-gray-600" />
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
    const { authUser, displayName, profilePicture, isAdmin } = useUserContext();
    const navigate = useNavigate();
    
    const [selectedChannel, setSelectedChannel] = useState('general');
    const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
    const [messageInput, setMessageInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [moderationWarning, setModerationWarning] = useState<string | null>(null);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    
    // Favorites state - loaded from localStorage
    const [favorites, setFavorites] = useState<Set<string>>(() => {
        try {
            const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
            return stored ? new Set(JSON.parse(stored)) : new Set();
        } catch {
            return new Set();
        }
    });
    
    // Notification settings state - loaded from localStorage
    const [notifications, setNotifications] = useState<{ announcements: boolean; events: boolean }>(() => {
        try {
            const stored = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
            return stored ? JSON.parse(stored) : DEFAULT_NOTIFICATIONS;
        } catch {
            return DEFAULT_NOTIFICATIONS;
        }
    });
    
    const [onlineUsers, setOnlineUsers] = useState<CommunityUser[]>([]);
    const [offlineUsers, setOfflineUsers] = useState<CommunityUser[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    
    // Toggle notification setting
    const toggleNotification = useCallback((type: 'announcements' | 'events') => {
        setNotifications(prev => {
            const updated = { ...prev, [type]: !prev[type] };
            localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
            return updated;
        });
    }, []);
    
    // Toggle favorite channel
    const toggleFavorite = useCallback((channelId: string) => {
        setFavorites(prev => {
            const newFavorites = new Set(prev);
            if (newFavorites.has(channelId)) {
                newFavorites.delete(channelId);
            } else {
                newFavorites.add(channelId);
            }
            // Persist to localStorage
            localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...newFavorites]));
            return newFavorites;
        });
    }, []);
    
    // User profile popup state
    const [profilePopup, setProfilePopup] = useState<{
        isOpen: boolean;
        userId: string;
        userName: string;
        userPhoto: string | null;
        position: { x: number; y: number };
    }>({
        isOpen: false,
        userId: '',
        userName: '',
        userPhoto: null,
        position: { x: 0, y: 0 }
    });
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null);
    const hasLoadedOnce = useRef(false);

    const currentUser = {
        id: authUser?.userId || '',
        name: displayName,
        photoUrl: profilePicture
    };

    // Handle user profile click
    const handleUserClick = (userId: string, userName: string, userPhoto: string | null | undefined, event: React.MouseEvent) => {
        const rect = (event.target as HTMLElement).getBoundingClientRect();
        setProfilePopup({
            isOpen: true,
            userId,
            userName,
            userPhoto: userPhoto || null,
            position: { x: rect.left, y: rect.bottom + 10 }
        });
    };

    const closeProfilePopup = () => {
        setProfilePopup(prev => ({ ...prev, isOpen: false }));
    };

    // Fetch messages for selected channel
    const fetchMessages = useCallback(async (options?: { isManualRefresh?: boolean }) => {
        if (!selectedChannel) return;
        
        const isManualRefresh = options?.isManualRefresh ?? false;
        
        if (!hasLoadedOnce.current) {
            setIsInitialLoading(true);
        } else if (isManualRefresh) {
            setIsRefreshing(true);
        }
        
        setError(null);
        
        try {
            const response = await fetch(`/api/community-messages/${selectedChannel}?limit=100`);
            if (!response.ok) {
                const errorText = await response.text();
                console.error('[OnlineCommunity] API Error:', response.status, errorText);
                throw new Error(`Failed to fetch messages: ${response.status}`);
            }
            const json = await response.json();
            const data = json.data || json;
            const fetchedMessages = data.messages || [];
            setMessages(fetchedMessages);
            hasLoadedOnce.current = true;
        } catch (err) {
            console.error('Error fetching messages:', err);
            if (!hasLoadedOnce.current || isManualRefresh) {
                setError('Failed to load messages. Please try again.');
            }
        } finally {
            setIsInitialLoading(false);
            setIsRefreshing(false);
        }
    }, [selectedChannel]);

    const hasLoadedUsersOnce = useRef(false);

    const fetchActiveUsers = useCallback(async () => {
        if (!hasLoadedUsersOnce.current) {
            setIsLoadingUsers(true);
        }
        try {
            const response = await fetch('/api/community/active-users');
            if (!response.ok) {
                throw new Error('Failed to fetch users');
            }
            const json = await response.json();
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

    useEffect(() => {
        fetchMessages();
        fetchActiveUsers();
        
        pollInterval.current = setInterval(() => {
            fetchMessages();
        }, 5000);
        
        const usersPoll = setInterval(() => {
            fetchActiveUsers();
        }, 30000);
        
        return () => {
            if (pollInterval.current) clearInterval(pollInterval.current);
            clearInterval(usersPoll);
        };
    }, [fetchMessages, fetchActiveUsers]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        hasLoadedOnce.current = false;
        setMessages([]);
        fetchMessages();
    }, [selectedChannel, fetchMessages]);

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
            const requestBody: { content: string; replyTo?: { userName: string; content: string } } = {
                content: messageInput.trim()
            };
            
            if (replyingTo) {
                requestBody.replyTo = {
                    userName: replyingTo.userName,
                    content: replyingTo.content.substring(0, 100)
                };
            }
            
            const response = await fetch(`/api/community-messages/${selectedChannel}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });
            
            const json = await response.json();
            
            if (!response.ok) {
                const errorData = json.error || json;
                if (errorData.reason === 'tier1_keyword_match' || 
                    errorData.reason === 'tier2_malicious_link' || 
                    errorData.reason === 'tier3_ai_violation' ||
                    errorData.reason === 'content_moderation') {
                    setModerationWarning(errorData.message || 'Your message was blocked due to content policy violations.');
                    setTimeout(() => setModerationWarning(null), 8000);
                } else {
                    setError('Failed to send message');
                }
                return;
            }
            
            const data = json.data || json;
            setMessages(prev => [...prev, data.message]);
            setMessageInput('');
            setReplyingTo(null);
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
            const data = json.data || json;
            setMessages(prev => prev.map(m => m.id === messageId ? data.message : m));
        } catch (err) {
            console.error('Error adding reaction:', err);
        }
    };

    const getCurrentChannel = () => {
        for (const category of CHANNEL_CATEGORIES) {
            const channel = category.channels.find(c => c.id === selectedChannel);
            if (channel) return channel;
        }
        return CHANNEL_CATEGORIES[1].channels[1]; // Default to general
    };

    const getCurrentChannelName = () => getCurrentChannel().name;
    const getCurrentChannelDescription = () => getCurrentChannel().description;
    const CurrentChannelIcon = getCurrentChannel().icon;

    return (
        <div className="h-[calc(100vh-80px)] flex" style={{ backgroundColor: '#050d15' }}>
            {/* User Profile Popup */}
            <UserProfilePopup
                userId={profilePopup.userId}
                userName={profilePopup.userName}
                userPhoto={profilePopup.userPhoto}
                isOpen={profilePopup.isOpen}
                onClose={closeProfilePopup}
                anchorPosition={profilePopup.position}
            />

            {/* Channel Sidebar */}
            <ChannelSidebar
                selectedChannel={selectedChannel}
                onSelectChannel={setSelectedChannel}
                collapsedCategories={collapsedCategories}
                toggleCategory={toggleCategory}
                currentUser={currentUser}
                onNavigateToProfile={() => navigate('/profile')}
                favorites={favorites}
                onToggleFavorite={toggleFavorite}
            />

            {/* Main Chat Area */}
            <div 
                className="flex-1 flex flex-col min-w-0" 
                style={{ 
                    backgroundColor: '#0c1824',
                    backgroundImage: 'radial-gradient(ellipse at top center, rgba(0, 255, 145, 0.02) 0%, transparent 60%)'
                }}
            >
                {/* Channel Header */}
                <div 
                    className="h-16 px-6 flex items-center justify-between flex-shrink-0"
                    style={{ 
                        borderBottom: '1px solid rgba(0, 255, 145, 0.06)',
                        background: 'linear-gradient(180deg, rgba(0, 255, 145, 0.02) 0%, transparent 100%)'
                    }}
                >
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#00FF91]/15 to-[#00FF91]/5">
                            <CurrentChannelIcon className="w-5 h-5 text-[#00FF91]" />
                        </div>
                        <div>
                            <h2 className="font-bold text-white text-lg">{getCurrentChannelName()}</h2>
                            <p className="text-xs text-gray-500">{getCurrentChannelDescription()}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleManualRefresh}
                            className="p-2.5 rounded-xl hover:bg-white/5 transition-all duration-200"
                            title="Refresh messages"
                            disabled={isRefreshing}
                        >
                            <RefreshCw className={`w-4 h-4 text-gray-500 hover:text-[#00FF91] ${isRefreshing ? 'animate-spin text-[#00FF91]' : ''}`} />
                        </button>
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                            <input
                                type="text"
                                placeholder="Search..."
                                className="w-40 pl-9 pr-3 py-2 text-sm rounded-xl focus:outline-none focus:ring-1 focus:ring-[#00FF91]/30 transition-all"
                                style={{ backgroundColor: 'rgba(5, 13, 21, 0.8)', border: '1px solid rgba(255,255,255,0.06)', color: 'white' }}
                            />
                        </div>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto overflow-x-visible py-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {/* Empty State */}
                    {messages.length === 0 && !isInitialLoading && (
                        <div className="flex flex-col items-center justify-center h-full text-center px-4">
                            <div className="relative mb-6">
                                <div className="absolute inset-0 rounded-full bg-[#00FF91]/20 blur-2xl animate-pulse" />
                                <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-[#00FF91]/20 to-[#00FF91]/5 flex items-center justify-center border border-[#00FF91]/15">
                                    <MessageSquare className="w-12 h-12 text-[#00FF91]" />
                                </div>
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">
                                Welcome to <span className="text-[#00FF91]">#{getCurrentChannelName()}</span>
                            </h3>
                            <p className="text-gray-500 max-w-sm text-sm">
                                This is the beginning of the #{getCurrentChannelName()} channel. Start the conversation!
                            </p>
                        </div>
                    )}

                    {/* Loading State */}
                    {isInitialLoading && messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full gap-4">
                            <div className="relative">
                                <div className="absolute inset-0 rounded-full bg-[#00FF91]/20 blur-lg animate-pulse" />
                                <Loader2 className="w-10 h-10 animate-spin text-[#00FF91] relative" />
                            </div>
                            <p className="text-gray-500 text-sm font-medium">Loading messages...</p>
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div 
                            className="mx-5 mb-4 p-4 rounded-xl flex items-center gap-3"
                            style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.15)' }}
                        >
                            <MessageSquare className="w-4 h-4 text-red-400" />
                            <div className="flex-1">
                                <p className="text-red-400 font-medium text-sm">{error}</p>
                                <button 
                                    onClick={() => fetchMessages({ isManualRefresh: true })}
                                    className="text-red-400/70 text-xs mt-1 hover:text-red-300"
                                >
                                    Click to retry
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Messages List */}
                    <div>
                        {messages.map(message => (
                            <ChatMessageItem 
                                key={message.id} 
                                message={message}
                                currentUserId={currentUser.id}
                                isAdmin={isAdmin}
                                onDelete={handleDeleteMessage}
                                onReact={handleReaction}
                                onReply={handleReply}
                                onUserClick={handleUserClick}
                            />
                        ))}
                    </div>
                    <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-4 flex-shrink-0" style={{ borderTop: '1px solid rgba(0, 255, 145, 0.06)' }}>
                    {/* Reply Preview */}
                    {replyingTo && (
                        <div 
                            className="mb-3 px-4 py-2.5 rounded-xl flex items-center gap-3 animate-in slide-in-from-bottom-2 duration-200"
                            style={{ backgroundColor: 'rgba(0, 255, 145, 0.05)', border: '1px solid rgba(0, 255, 145, 0.1)' }}
                        >
                            <Reply className="w-4 h-4 text-[#00FF91] flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <span className="text-xs text-[#00FF91] font-medium">Replying to {replyingTo.userName}</span>
                                <p className="text-xs text-gray-500 truncate">{replyingTo.content}</p>
                            </div>
                            <button 
                                onClick={cancelReply}
                                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                            >
                                <X className="w-4 h-4 text-gray-500 hover:text-white" />
                            </button>
                        </div>
                    )}
                    
                    <div 
                        className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 focus-within:ring-1 focus-within:ring-[#00FF91]/30"
                        style={{ 
                            backgroundColor: 'rgba(10, 22, 40, 0.8)', 
                            border: moderationWarning ? '1px solid rgba(255, 68, 68, 0.3)' : '1px solid rgba(255,255,255,0.06)' 
                        }}
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
                            className="p-2.5 rounded-xl bg-[#00FF91] hover:bg-[#00FF91]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
                            style={{ boxShadow: messageInput.trim() ? '0 0 20px rgba(0, 255, 145, 0.2)' : 'none' }}
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
                        <div 
                            className="mt-2 px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
                            style={{ backgroundColor: 'rgba(255, 68, 68, 0.1)', border: '1px solid rgba(255, 68, 68, 0.2)' }}
                        >
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
                onUserClick={(id, name, photo, e) => handleUserClick(id, name, photo || null, e)}
                notifications={notifications}
                onToggleNotification={toggleNotification}
            />
        </div>
    );
}
