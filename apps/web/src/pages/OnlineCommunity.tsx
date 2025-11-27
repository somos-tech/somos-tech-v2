/**
 * Online Community Page
 * 
 * Discord-like online community with channels, chat, and member sidebar.
 * This is the main hub for online interaction across all SOMOS.tech members.
 * 
 * @module pages/OnlineCommunity
 * @author SOMOS.tech
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Hash,
    Volume2,
    ChevronDown,
    ChevronRight,
    Plus,
    Settings,
    Users,
    Bell,
    Pin,
    Search,
    Send,
    Heart,
    MessageCircle,
    Smile,
    Gift,
    Image,
    MoreVertical,
    Loader2,
    Globe,
    Sparkles,
    Briefcase,
    GraduationCap,
    Instagram,
    Rocket,
    Coffee,
    Trophy,
    Star,
    Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/DefaultAvatar';
import { useAuth } from '@/hooks/useAuth';

// Channel categories and channels
const CHANNEL_CATEGORIES = [
    {
        name: 'Information',
        icon: '📢',
        channels: [
            { id: 'welcome-and-rules', name: 'welcome-and-rules', icon: Hash, description: 'Community guidelines' },
            { id: 'auditing', name: 'auditing', icon: Hash, description: 'Audit log' },
        ]
    },
    {
        name: 'General',
        icon: '💬',
        channels: [
            { id: 'intros', name: 'intros', icon: Hash, description: 'Introduce yourself!' },
            { id: 'general', name: 'general', icon: Hash, description: 'General discussion' },
            { id: 'events', name: 'events', icon: Hash, description: 'Community events' },
            { id: 'opportunities', name: 'opportunities', icon: Hash, description: 'Job & opportunities' },
            { id: 'virtual-stage', name: 'virtual-stage', icon: Volume2, description: 'Voice channel' },
        ]
    },
    {
        name: 'Chapters',
        icon: '🗺️',
        channels: [
            { id: 'seattle-wa', name: 'seattle-wa', icon: Hash, description: 'Seattle chapter' },
            { id: 'houston-tx', name: 'houston-tx', icon: Hash, description: 'Houston chapter' },
            { id: 'newyork-ny', name: 'newyork-ny', icon: Hash, description: 'New York chapter' },
            { id: 'losangeles-ca', name: 'losangeles-ca', icon: Hash, description: 'Los Angeles chapter' },
            { id: 'sanfrancisco-ca', name: 'sanfrancisco-ca', icon: Hash, description: 'San Francisco chapter' },
            { id: 'miami-fl', name: 'miami-fl', icon: Hash, description: 'Miami chapter' },
            { id: 'chicago-il', name: 'chicago-il', icon: Hash, description: 'Chicago chapter' },
        ]
    },
    {
        name: 'Programs',
        icon: '🚀',
        channels: [
            { id: 'labs', name: 'labs', icon: Hash, description: 'SOMOS Labs program' },
            { id: 'mentorship', name: 'mentorship', icon: Hash, description: 'Mentorship program' },
            { id: 'starting-in-tech', name: 'starting-in-tech', icon: Hash, description: 'Getting started' },
        ]
    },
    {
        name: 'Socials',
        icon: '🎉',
        channels: [
            { id: 'instagram', name: 'instagram', icon: Instagram, description: 'Social media' },
        ]
    },
];

// Sample messages for demonstration
const SAMPLE_MESSAGES = [
    {
        id: '1',
        userId: 'user1',
        userName: 'Luzy King',
        userPhoto: null,
        content: 'Chic@s do you have any ski plans?',
        createdAt: new Date('2025-11-05T16:45:00').toISOString(),
        reactions: [{ emoji: '🎿', count: 1, users: ['user2'] }],
    },
    {
        id: '2',
        userId: 'user2',
        userName: 'Joey Cruz',
        userPhoto: null,
        content: 'No skis 🎿 but karaoke coming soon 🎤',
        createdAt: new Date('2025-11-05T17:20:00').toISOString(),
        replyTo: { userName: 'Luzy King', content: 'Chic@s do you have any ski plans?' },
    },
    {
        id: '3',
        userId: 'app',
        userName: 'SOMOS.tech',
        userPhoto: '/logo.png',
        isApp: true,
        content: '@everyone don\'t forget to join us on Monday. You do not have to be a veteran to join us. Use code SOMOSTECH25 for free tickets',
        createdAt: new Date('2025-11-07T09:40:00').toISOString(),
        reactions: [{ emoji: '❤️', count: 2, users: ['user1', 'user2'] }],
    },
    {
        id: '4',
        userId: 'user1',
        userName: 'Luzy King',
        userPhoto: null,
        content: 'I am going to be a Latina in tech for three months! 🎉 I was able to secure a dream paid internship with my dream tech company and since my business is 90% automated, I have the time freedom to do this. At the end of the internship I might have a full time offer. I am also finishing my book Cash I Libre!\n\nWish me luck!',
        createdAt: new Date('2025-11-18T19:07:00').toISOString(),
        reactions: [{ emoji: '🙌', count: 1, users: ['user2'] }],
    },
];

// Sample online members
const SAMPLE_MEMBERS = [
    { id: 'owner', name: 'Joey Cruz', role: 'owner', status: 'online', statusText: 'updating to goals' },
    { id: 'm1', name: 'AaronG01', status: 'online', statusText: 'Es tu pley, ye pley' },
    { id: 'm2', name: 'Abraham Nieto', status: 'online' },
    { id: 'm3', name: 'alexm509', status: 'online' },
    { id: 'm4', name: 'ANA', status: 'online' },
    { id: 'm5', name: 'Ariogni', status: 'online' },
    { id: 'm6', name: 'Bella', status: 'online', badge: 'NG' },
    { id: 'm7', name: 'Brock Obamna', status: 'online' },
    { id: 'm8', name: 'ChrisTapi', status: 'online' },
    { id: 'm9', name: 'Erika', status: 'online' },
    { id: 'm10', name: 'Monica Gordillo', status: 'online', statusText: 'Houston' },
];

/**
 * Channel Sidebar Component
 */
function ChannelSidebar({ 
    selectedChannel, 
    onSelectChannel,
    collapsedCategories,
    toggleCategory
}: {
    selectedChannel: string;
    onSelectChannel: (id: string) => void;
    collapsedCategories: Set<string>;
    toggleCategory: (name: string) => void;
}) {
    return (
        <div 
            className="w-60 flex-shrink-0 flex flex-col h-full"
            style={{ backgroundColor: '#0A1929' }}
        >
            {/* Server Header */}
            <div 
                className="h-12 px-4 flex items-center justify-between border-b cursor-pointer hover:bg-[#0F2744]"
                style={{ borderColor: '#1E3A5F' }}
            >
                <div className="flex items-center gap-2">
                    <span className="text-lg">🌟</span>
                    <span className="font-semibold text-white">SOMOS.tech</span>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>

            {/* Boost Progress */}
            <div className="px-3 py-2 border-b" style={{ borderColor: '#1E3A5F' }}>
                <div className="flex items-center gap-2 text-xs" style={{ color: '#8394A7' }}>
                    <Sparkles className="w-3 h-3 text-pink-400" />
                    <span>Boost Goal</span>
                    <Badge className="text-[10px] px-1" style={{ backgroundColor: 'rgba(236, 72, 153, 0.2)', color: '#EC4899' }}>
                        2/28 Boosts
                    </Badge>
                </div>
            </div>

            {/* Quick Links */}
            <div className="px-2 py-2 space-y-1 border-b" style={{ borderColor: '#1E3A5F' }}>
                <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-[#0F2744] transition-colors">
                    <Calendar className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-gray-300">Events</span>
                </button>
                <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-[#0F2744] transition-colors">
                    <Hash className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-300">Browse Channels</span>
                </button>
                <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-[#0F2744] transition-colors">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-300">Members</span>
                </button>
            </div>

            {/* Channel Categories */}
            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-4">
                {CHANNEL_CATEGORIES.map(category => (
                    <div key={category.name}>
                        <button
                            onClick={() => toggleCategory(category.name)}
                            className="w-full flex items-center gap-1 px-0.5 text-xs font-semibold uppercase tracking-wider hover:text-white transition-colors"
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
                            <div className="mt-1 space-y-0.5">
                                {category.channels.map(channel => (
                                    <button
                                        key={channel.id}
                                        onClick={() => onSelectChannel(channel.id)}
                                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors ${
                                            selectedChannel === channel.id 
                                                ? 'bg-[#1E3A5F] text-white' 
                                                : 'hover:bg-[#0F2744] text-gray-400 hover:text-gray-200'
                                        }`}
                                    >
                                        <channel.icon className="w-4 h-4" />
                                        <span className="text-sm truncate">{channel.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* User Panel */}
            <div 
                className="h-14 px-2 flex items-center gap-2 border-t"
                style={{ backgroundColor: '#071520', borderColor: '#1E3A5F' }}
            >
                <UserAvatar name="You" size="sm" />
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">You</div>
                    <div className="text-xs text-green-400">Online</div>
                </div>
                <Settings className="w-4 h-4 text-gray-400 cursor-pointer hover:text-white" />
            </div>
        </div>
    );
}

/**
 * Chat Message Component
 */
function ChatMessageItem({ message }: { message: typeof SAMPLE_MESSAGES[0] }) {
    return (
        <div className="group flex gap-3 py-3 px-4 hover:bg-[#0F2744]/50 transition-colors">
            <UserAvatar
                photoUrl={message.userPhoto || undefined}
                name={message.userName}
                size="md"
            />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    {message.isApp && (
                        <Badge className="text-[10px] px-1" style={{ backgroundColor: '#5865F2', color: 'white' }}>
                            APP
                        </Badge>
                    )}
                    <span className="font-semibold text-white">{message.userName}</span>
                    <span className="text-xs" style={{ color: '#8394A7' }}>
                        {new Date(message.createdAt).toLocaleDateString('en-US', { 
                            month: 'long', 
                            day: 'numeric', 
                            year: 'numeric' 
                        })}
                    </span>
                </div>

                {/* Reply Preview */}
                {message.replyTo && (
                    <div 
                        className="text-xs mb-1 pl-3 border-l-2 truncate flex items-center gap-1"
                        style={{ borderColor: '#00FF91', color: '#8394A7' }}
                    >
                        <span>@{message.replyTo.userName}</span>
                        <span className="truncate">{message.replyTo.content}</span>
                    </div>
                )}

                {/* Message Content */}
                <p className="text-gray-200 whitespace-pre-wrap break-words">
                    {message.content}
                </p>

                {/* Reactions */}
                {message.reactions && message.reactions.length > 0 && (
                    <div className="flex gap-1 mt-2">
                        {message.reactions.map((reaction, idx) => (
                            <button
                                key={idx}
                                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors"
                                style={{ 
                                    backgroundColor: 'rgba(0, 255, 145, 0.1)', 
                                    border: '1px solid rgba(0, 255, 145, 0.3)' 
                                }}
                            >
                                <span>{reaction.emoji}</span>
                                <span style={{ color: '#00FF91' }}>{reaction.count}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Message Actions (shown on hover) */}
            <div className="opacity-0 group-hover:opacity-100 flex items-start gap-1 transition-opacity">
                <button className="p-1 rounded hover:bg-[#1E3A5F]">
                    <Smile className="w-4 h-4 text-gray-400" />
                </button>
                <button className="p-1 rounded hover:bg-[#1E3A5F]">
                    <MessageCircle className="w-4 h-4 text-gray-400" />
                </button>
            </div>
        </div>
    );
}

/**
 * Member Sidebar Component
 */
function MemberSidebar() {
    const onlineMembers = SAMPLE_MEMBERS.filter(m => m.status === 'online');
    const owner = SAMPLE_MEMBERS.find(m => m.role === 'owner');

    return (
        <div 
            className="w-60 flex-shrink-0 h-full overflow-y-auto p-3"
            style={{ backgroundColor: '#0A1929' }}
        >
            {/* Owner */}
            {owner && (
                <div className="mb-4">
                    <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#8394A7' }}>
                        Our team — 1
                    </div>
                    <div className="flex items-center gap-2 p-1 rounded hover:bg-[#0F2744] cursor-pointer">
                        <div className="relative">
                            <UserAvatar name={owner.name} size="sm" />
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-[#0A1929]" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                                <span className="text-sm font-medium text-yellow-400 truncate">{owner.name}</span>
                                <span className="text-yellow-400">👑</span>
                            </div>
                            {owner.statusText && (
                                <div className="text-xs truncate" style={{ color: '#8394A7' }}>{owner.statusText}</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Online Members */}
            <div>
                <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#8394A7' }}>
                    Online — {onlineMembers.length}
                </div>
                <div className="space-y-0.5">
                    {onlineMembers.filter(m => m.role !== 'owner').map(member => (
                        <div 
                            key={member.id}
                            className="flex items-center gap-2 p-1 rounded hover:bg-[#0F2744] cursor-pointer"
                        >
                            <div className="relative">
                                <UserAvatar name={member.name} size="sm" />
                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-[#0A1929]" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                    <span className="text-sm text-gray-200 truncate">{member.name}</span>
                                    {member.badge && (
                                        <Badge className="text-[10px] px-1" style={{ backgroundColor: '#00FF91', color: '#051323' }}>
                                            {member.badge}
                                        </Badge>
                                    )}
                                </div>
                                {member.statusText && (
                                    <div className="text-xs truncate" style={{ color: '#8394A7' }}>{member.statusText}</div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Offline count */}
            <div className="mt-4">
                <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#8394A7' }}>
                    Offline — 458
                </div>
            </div>
        </div>
    );
}

/**
 * Main Online Community Page
 */
export default function OnlineCommunity() {
    const { isAuthenticated, user } = useAuth();
    const navigate = useNavigate();
    
    const [selectedChannel, setSelectedChannel] = useState('general');
    const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
    const [messageInput, setMessageInput] = useState('');
    const [messages, setMessages] = useState(SAMPLE_MESSAGES);
    const messagesEndRef = useRef<HTMLDivElement>(null);

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

    const handleSendMessage = () => {
        if (!messageInput.trim()) return;
        
        const newMessage = {
            id: Date.now().toString(),
            userId: user?.userId || 'current',
            userName: user?.userDetails?.split('@')[0] || 'You',
            userPhoto: null as any,
            content: messageInput,
            createdAt: new Date().toISOString(),
            reactions: [] as { emoji: string; count: number; users: string[] }[],
        };
        
        setMessages(prev => [...prev, newMessage]);
        setMessageInput('');
    };

    const getCurrentChannelName = () => {
        for (const category of CHANNEL_CATEGORIES) {
            const channel = category.channels.find(c => c.id === selectedChannel);
            if (channel) return channel.name;
        }
        return 'general';
    };

    return (
        <div className="h-[calc(100vh-80px)] flex" style={{ backgroundColor: '#051323' }}>
            {/* Channel Sidebar */}
            <ChannelSidebar
                selectedChannel={selectedChannel}
                onSelectChannel={setSelectedChannel}
                collapsedCategories={collapsedCategories}
                toggleCategory={toggleCategory}
            />

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col min-w-0" style={{ backgroundColor: '#0D2137' }}>
                {/* Channel Header */}
                <div 
                    className="h-12 px-4 flex items-center justify-between border-b flex-shrink-0"
                    style={{ borderColor: '#1E3A5F' }}
                >
                    <div className="flex items-center gap-2">
                        <Hash className="w-5 h-5 text-gray-400" />
                        <span className="font-semibold text-white">{getCurrentChannelName()}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Bell className="w-5 h-5 text-gray-400 cursor-pointer hover:text-white" />
                        <Pin className="w-5 h-5 text-gray-400 cursor-pointer hover:text-white" />
                        <Users className="w-5 h-5 text-gray-400 cursor-pointer hover:text-white" />
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search"
                                className="w-36 pl-8 pr-2 py-1 text-sm rounded"
                                style={{ backgroundColor: '#051323', color: 'white' }}
                            />
                        </div>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto">
                    {/* Welcome Banner */}
                    {selectedChannel === 'general' && (
                        <div className="p-4 m-4 rounded-lg" style={{ backgroundColor: '#0A1929', border: '1px solid #1E3A5F' }}>
                            <p className="text-sm text-gray-300">
                                Each event is <strong className="text-white">confirmed to be in November 2025</strong> and{' '}
                                <strong className="text-white">located in the Seattle area</strong>. For the most up-to-date pricing 
                                and registration options, visit the respective event URLs.
                            </p>
                            <div className="mt-3 flex items-start gap-2 text-xs" style={{ color: '#F59E0B' }}>
                                <span>⚠️</span>
                                <span>
                                    These events are not sponsored, endorsed, or associated with SOMOS.tech unless stated otherwise. 
                                    We are sharing this information solely to provide visibility and support for local community activities.
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Messages List */}
                    <div className="divide-y" style={{ borderColor: '#1E3A5F' }}>
                        {messages.map(message => (
                            <ChatMessageItem key={message.id} message={message} />
                        ))}
                    </div>
                    <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-4 flex-shrink-0">
                    <div 
                        className="flex items-center gap-2 px-4 py-2 rounded-lg"
                        style={{ backgroundColor: '#0F2744' }}
                    >
                        <Plus className="w-5 h-5 text-gray-400 cursor-pointer hover:text-white" />
                        <input
                            type="text"
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder="Introduce yourself!"
                            className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-500"
                        />
                        <Gift className="w-5 h-5 text-gray-400 cursor-pointer hover:text-white" />
                        <Image className="w-5 h-5 text-gray-400 cursor-pointer hover:text-white" />
                        <Smile className="w-5 h-5 text-gray-400 cursor-pointer hover:text-white" />
                    </div>
                </div>
            </div>

            {/* Member Sidebar */}
            <MemberSidebar />
        </div>
    );
}
