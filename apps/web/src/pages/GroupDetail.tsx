/**
 * Group Detail Page
 * 
 * Individual group page with Discord-like chat, events calendar,
 * and member information.
 * 
 * @module pages/GroupDetail
 * @author SOMOS.tech
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Send,
    Heart,
    MessageCircle,
    Calendar,
    Users,
    Settings,
    MoreVertical,
    Reply,
    Trash2,
    Edit2,
    Loader2,
    MapPin,
    Link as LinkIcon,
    Instagram,
    ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/DefaultAvatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    getGroup,
    joinGroup,
    leaveGroup,
    getGroupMessages,
    sendMessage,
    toggleLike,
    deleteMessage,
    getGroupEvents,
    getGroupMembers
} from '@/api/groupsService';
import type { CommunityGroup, GroupMessage, GroupEvent, GroupMembership } from '@/types/groups';
import { useUserContext } from '@/contexts/UserContext';

/**
 * Chat Message Component
 */
function ChatMessage({
    message,
    currentUserId,
    onLike,
    onDelete,
    onReply
}: {
    message: GroupMessage;
    currentUserId?: string;
    onLike: () => void;
    onDelete: () => void;
    onReply: () => void;
}) {
    const isOwn = message.userId === currentUserId;
    const hasLiked = message.likes?.includes(currentUserId || '');

    return (
        <div className={`group flex gap-3 py-3 px-4 hover:bg-[#0F2744]/50 transition-colors ${message.isDeleted ? 'opacity-50' : ''}`}>
            <UserAvatar
                photoUrl={message.userPhoto}
                name={message.userName}
                size="md"
            />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-white">{message.userName}</span>
                    <span className="text-xs" style={{ color: '#8394A7' }}>
                        {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {message.isEdited && (
                        <span className="text-xs" style={{ color: '#8394A7' }}>(edited)</span>
                    )}
                </div>

                {/* Reply Preview */}
                {message.replyToContent && (
                    <div 
                        className="text-xs mb-1 pl-3 border-l-2 truncate"
                        style={{ borderColor: '#00FF91', color: '#8394A7' }}
                    >
                        {message.replyToContent}
                    </div>
                )}

                {/* Message Content */}
                <p className="text-white break-words">{message.content}</p>

                {/* Image if present */}
                {message.imageUrl && (
                    <img
                        src={message.imageUrl}
                        alt="Shared image"
                        className="mt-2 rounded-lg max-w-sm max-h-64 object-cover"
                    />
                )}

                {/* Actions */}
                <div className="flex items-center gap-4 mt-2">
                    <button
                        onClick={onLike}
                        className={`flex items-center gap-1 text-sm transition-colors ${hasLiked ? 'text-red-500' : 'text-[#8394A7] hover:text-red-400'}`}
                    >
                        <Heart className={`w-4 h-4 ${hasLiked ? 'fill-current' : ''}`} />
                        {message.likeCount > 0 && message.likeCount}
                    </button>
                    <button
                        onClick={onReply}
                        className="flex items-center gap-1 text-sm text-[#8394A7] hover:text-[#00FF91] transition-colors"
                    >
                        <Reply className="w-4 h-4" />
                        Reply
                    </button>
                    {isOwn && !message.isDeleted && (
                        <button
                            onClick={onDelete}
                            className="flex items-center gap-1 text-sm text-[#8394A7] hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

/**
 * Event Card Component
 */
function EventCard({ event }: { event: GroupEvent }) {
    const eventDate = new Date(event.startDate);
    const isPast = eventDate < new Date();

    return (
        <div
            className={`p-4 rounded-lg border transition-all ${isPast ? 'opacity-60' : 'hover:border-[#00FF91]/50'}`}
            style={{ backgroundColor: '#0A1929', borderColor: '#1E3A5F' }}
        >
            <div className="flex gap-4">
                {/* Date Badge */}
                <div 
                    className="flex flex-col items-center justify-center w-14 h-14 rounded-lg flex-shrink-0"
                    style={{ backgroundColor: '#00FF91', color: '#051323' }}
                >
                    <span className="text-xs font-bold uppercase">
                        {eventDate.toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                    <span className="text-xl font-bold">
                        {eventDate.getDate()}
                    </span>
                </div>

                {/* Event Info */}
                <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-white truncate">{event.title}</h4>
                    <p className="text-sm mt-1 line-clamp-2" style={{ color: '#8394A7' }}>
                        {event.description}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: '#8394A7' }}>
                        <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {event.location}
                        </span>
                        {event.attendeeCount > 0 && (
                            <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {event.attendeeCount} going
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Main Group Detail Component
 */
export default function GroupDetail() {
    const { id: groupId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { isAuthenticated, authUser, displayName, profilePicture } = useUserContext();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // State
    const [group, setGroup] = useState<CommunityGroup | null>(null);
    const [isMember, setIsMember] = useState(false);
    const [messages, setMessages] = useState<GroupMessage[]>([]);
    const [events, setEvents] = useState<GroupEvent[]>([]);
    const [members, setMembers] = useState<GroupMembership[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [moderationWarning, setModerationWarning] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('chat');
    const [messageInput, setMessageInput] = useState('');
    const [sending, setSending] = useState(false);
    const [replyTo, setReplyTo] = useState<GroupMessage | null>(null);
    const [joiningLeaving, setJoiningLeaving] = useState(false);

    // Fetch group data
    useEffect(() => {
        if (groupId) {
            fetchGroupData();
        }
    }, [groupId]);

    // Scroll to bottom when messages change
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchGroupData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch group details
            const groupData = await getGroup(groupId!);
            setGroup(groupData);
            setIsMember(groupData.isMember);

            // If member, fetch messages
            if (groupData.isMember) {
                fetchMessages();
            }

            // Fetch events
            const eventsData = await getGroupEvents(groupId!);
            setEvents(eventsData.events);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load group');
            console.error('Error fetching group:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async () => {
        try {
            setLoadingMessages(true);
            const data = await getGroupMessages(groupId!);
            setMessages(data.messages);
        } catch (err) {
            console.error('Error fetching messages:', err);
        } finally {
            setLoadingMessages(false);
        }
    };

    const fetchMembers = async () => {
        try {
            const data = await getGroupMembers(groupId!);
            setMembers(data.members);
        } catch (err) {
            console.error('Error fetching members:', err);
        }
    };

    // Handle join/leave
    const handleJoinLeave = async () => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        try {
            setJoiningLeaving(true);
            if (isMember) {
                await leaveGroup(groupId!);
                setIsMember(false);
                setMessages([]);
            } else {
                await joinGroup(groupId!);
                setIsMember(true);
                fetchMessages();
            }
            // Update member count
            if (group) {
                setGroup({
                    ...group,
                    memberCount: isMember 
                        ? Math.max(0, (group.memberCount || 1) - 1)
                        : (group.memberCount || 0) + 1
                });
            }
        } catch (err) {
            console.error('Error joining/leaving group:', err);
        } finally {
            setJoiningLeaving(false);
        }
    };

    // Handle send message
    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageInput.trim() || sending) return;

        try {
            setSending(true);
            setModerationWarning(null);
            const newMessage = await sendMessage(groupId!, {
                content: messageInput.trim(),
                replyToId: replyTo?.id
            });
            setMessages(prev => [...prev, newMessage]);
            setMessageInput('');
            setReplyTo(null);
            inputRef.current?.focus();
        } catch (err: any) {
            console.error('Error sending message:', err);
            // Check if it's a moderation block
            if (err.reason === 'tier1_keyword_match' || 
                err.reason === 'tier2_malicious_link' || 
                err.reason === 'tier3_ai_violation' ||
                err.message?.includes('violates') ||
                err.message?.includes('prohibited') ||
                err.message?.includes('blocked')) {
                setModerationWarning(err.message || 'Your message was blocked due to content policy violations.');
                // Auto-clear warning after 8 seconds
                setTimeout(() => setModerationWarning(null), 8000);
            }
        } finally {
            setSending(false);
        }
    };

    // Handle like
    const handleLike = async (messageId: string) => {
        try {
            const result = await toggleLike(groupId!, messageId);
            setMessages(prev => prev.map(m => 
                m.id === messageId
                    ? {
                        ...m,
                        likeCount: result.likeCount,
                        likes: result.liked
                            ? [...(m.likes || []), authUser?.userId || '']
                            : (m.likes || []).filter(id => id !== authUser?.userId)
                    }
                    : m
            ));
        } catch (err) {
            console.error('Error toggling like:', err);
        }
    };

    // Handle delete
    const handleDelete = async (messageId: string) => {
        if (!confirm('Delete this message?')) return;
        try {
            await deleteMessage(groupId!, messageId);
            setMessages(prev => prev.map(m =>
                m.id === messageId
                    ? { ...m, isDeleted: true, content: '[Message deleted]' }
                    : m
            ));
        } catch (err) {
            console.error('Error deleting message:', err);
        }
    };

    // Tab change handler
    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        if (tab === 'members' && members.length === 0) {
            fetchMembers();
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#051323' }}>
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#00FF91' }} />
            </div>
        );
    }

    if (error || !group) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor: '#051323' }}>
                <p className="text-white mb-4">{error || 'Group not found'}</p>
                <Button onClick={() => navigate('/groups')} style={{ backgroundColor: '#00FF91', color: '#051323' }}>
                    Back to Groups
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#051323' }}>
            {/* Cover Image */}
            <div className="relative h-48 md:h-64">
                <img
                    src={group.imageUrl}
                    alt={group.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1200&h=400&fit=crop';
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#051323] via-transparent to-transparent" />
                
                {/* Back Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-4 left-4 rounded-full bg-black/30 hover:bg-black/50"
                    onClick={() => navigate('/groups')}
                >
                    <ArrowLeft className="w-5 h-5 text-white" />
                </Button>
            </div>

            {/* Group Header */}
            <div className="px-4 -mt-8 relative z-10">
                <div className="flex items-end justify-between">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white">{group.name}</h1>
                        <div className="flex items-center gap-3 mt-2" style={{ color: '#8394A7' }}>
                            <Badge
                                variant="outline"
                                style={{
                                    borderColor: '#00FF91',
                                    color: '#00FF91',
                                    backgroundColor: 'rgba(0, 255, 145, 0.1)'
                                }}
                            >
                                {group.visibility}
                            </Badge>
                            <span className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                {group.memberCount || 0} members
                            </span>
                        </div>
                    </div>
                    <Button
                        disabled={joiningLeaving}
                        onClick={handleJoinLeave}
                        className="rounded-full"
                        style={{
                            backgroundColor: isMember ? 'transparent' : '#00FF91',
                            color: isMember ? '#00FF91' : '#051323',
                            border: isMember ? '1px solid #00FF91' : 'none'
                        }}
                    >
                        {joiningLeaving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : isMember ? (
                            'Leave Group'
                        ) : (
                            'Join Group'
                        )}
                    </Button>
                </div>

                {/* Description */}
                {group.description && (
                    <p className="mt-4 text-sm" style={{ color: '#8394A7' }}>
                        {group.description}
                    </p>
                )}

                {/* Social Links */}
                {(group.discordUrl || group.instagramUrl || group.linkedinUrl) && (
                    <div className="flex items-center gap-3 mt-3">
                        {group.discordUrl && (
                            <a href={group.discordUrl} target="_blank" rel="noopener noreferrer" className="text-[#8394A7] hover:text-[#00FF91]">
                                <LinkIcon className="w-5 h-5" />
                            </a>
                        )}
                        {group.instagramUrl && (
                            <a href={group.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-[#8394A7] hover:text-[#00FF91]">
                                <Instagram className="w-5 h-5" />
                            </a>
                        )}
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="mt-6 flex-1 flex flex-col">
                <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col">
                    <TabsList 
                        className="mx-4 justify-start gap-4 bg-transparent border-b rounded-none h-auto p-0"
                        style={{ borderColor: '#1E3A5F' }}
                    >
                        <TabsTrigger
                            value="chat"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#00FF91] data-[state=active]:bg-transparent bg-transparent px-0 pb-3 flex items-center gap-2"
                            style={{ color: activeTab === 'chat' ? '#FFFFFF' : '#8394A7' }}
                        >
                            <MessageCircle className="w-4 h-4" />
                            Chat
                        </TabsTrigger>
                        <TabsTrigger
                            value="events"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#00FF91] data-[state=active]:bg-transparent bg-transparent px-0 pb-3 flex items-center gap-2"
                            style={{ color: activeTab === 'events' ? '#FFFFFF' : '#8394A7' }}
                        >
                            <Calendar className="w-4 h-4" />
                            Events
                        </TabsTrigger>
                        <TabsTrigger
                            value="members"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#00FF91] data-[state=active]:bg-transparent bg-transparent px-0 pb-3 flex items-center gap-2"
                            style={{ color: activeTab === 'members' ? '#FFFFFF' : '#8394A7' }}
                        >
                            <Users className="w-4 h-4" />
                            Members
                        </TabsTrigger>
                    </TabsList>

                    {/* Chat Tab */}
                    <TabsContent value="chat" className="flex-1 flex flex-col mt-0 data-[state=inactive]:hidden">
                        {!isMember ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-8">
                                <MessageCircle className="w-12 h-12 mb-4" style={{ color: '#8394A7' }} />
                                <p className="text-center" style={{ color: '#8394A7' }}>
                                    Join this group to participate in the chat
                                </p>
                                <Button
                                    onClick={handleJoinLeave}
                                    className="mt-4 rounded-full"
                                    style={{ backgroundColor: '#00FF91', color: '#051323' }}
                                >
                                    Join Group
                                </Button>
                            </div>
                        ) : (
                            <>
                                {/* Messages */}
                                <div className="flex-1 overflow-y-auto">
                                    {loadingMessages ? (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#00FF91' }} />
                                        </div>
                                    ) : messages.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12">
                                            <MessageCircle className="w-12 h-12 mb-4" style={{ color: '#8394A7' }} />
                                            <p style={{ color: '#8394A7' }}>No messages yet. Start the conversation!</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y" style={{ borderColor: '#1E3A5F' }}>
                                            {messages.map(message => (
                                                <ChatMessage
                                                    key={message.id}
                                                    message={message}
                                                    currentUserId={authUser?.userId}
                                                    onLike={() => handleLike(message.id)}
                                                    onDelete={() => handleDelete(message.id)}
                                                    onReply={() => setReplyTo(message)}
                                                />
                                            ))}
                                            <div ref={messagesEndRef} />
                                        </div>
                                    )}
                                </div>

                                {/* Reply Preview */}
                                {replyTo && (
                                    <div 
                                        className="px-4 py-2 flex items-center justify-between border-t"
                                        style={{ backgroundColor: '#0A1929', borderColor: '#1E3A5F' }}
                                    >
                                        <div className="flex items-center gap-2 text-sm">
                                            <Reply className="w-4 h-4" style={{ color: '#00FF91' }} />
                                            <span style={{ color: '#8394A7' }}>Replying to</span>
                                            <span className="text-white">{replyTo.userName}</span>
                                        </div>
                                        <button onClick={() => setReplyTo(null)} className="text-[#8394A7] hover:text-white">
                                            ×
                                        </button>
                                    </div>
                                )}

                                {/* Message Input */}
                                <form 
                                    onSubmit={handleSendMessage}
                                    className="p-4 border-t"
                                    style={{ borderColor: '#1E3A5F' }}
                                >
                                    <div className="flex gap-2">
                                        <Input
                                            ref={inputRef}
                                            placeholder="Type a message..."
                                            value={messageInput}
                                            onChange={(e) => {
                                                setMessageInput(e.target.value);
                                                if (moderationWarning) setModerationWarning(null);
                                            }}
                                            disabled={sending}
                                            className="flex-1"
                                            style={{
                                                backgroundColor: '#0A1929',
                                                borderColor: moderationWarning ? '#FF4444' : '#1E3A5F',
                                                color: '#FFFFFF'
                                            }}
                                        />
                                        <Button
                                            type="submit"
                                            disabled={!messageInput.trim() || sending}
                                            className="rounded-full"
                                            style={{ backgroundColor: '#00FF91', color: '#051323' }}
                                        >
                                            {sending ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Send className="w-4 h-4" />
                                            )}
                                        </Button>
                                    </div>
                                    
                                    {/* Moderation Warning */}
                                    {moderationWarning && (
                                        <div className="mt-2 px-3 py-2 rounded-lg flex items-center gap-2 text-sm animate-pulse" 
                                             style={{ backgroundColor: 'rgba(255, 68, 68, 0.15)', border: '1px solid rgba(255, 68, 68, 0.3)' }}>
                                            <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                            <span className="text-red-400">{moderationWarning}</span>
                                            <button 
                                                type="button"
                                                onClick={() => setModerationWarning(null)}
                                                className="ml-auto text-red-400 hover:text-red-300"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    )}
                                </form>
                            </>
                        )}
                    </TabsContent>

                    {/* Events Tab */}
                    <TabsContent value="events" className="flex-1 overflow-y-auto p-4 mt-0">
                        {events.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <Calendar className="w-12 h-12 mb-4" style={{ color: '#8394A7' }} />
                                <p style={{ color: '#8394A7' }}>No upcoming events</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {events.map(event => (
                                    <EventCard key={event.id} event={event} />
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    {/* Members Tab */}
                    <TabsContent value="members" className="flex-1 overflow-y-auto p-4 mt-0">
                        {members.length === 0 ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#00FF91' }} />
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {members.map(member => (
                                    <div
                                        key={member.id}
                                        className="flex items-center gap-3 p-3 rounded-lg"
                                        style={{ backgroundColor: '#0A1929' }}
                                    >
                                        <UserAvatar
                                            photoUrl={member.userPhoto}
                                            name={member.userName}
                                            size="md"
                                        />
                                        <div className="flex-1">
                                            <span className="text-white">{member.userName}</span>
                                            {member.role !== 'member' && (
                                                <Badge 
                                                    className="ml-2 text-xs"
                                                    style={{
                                                        backgroundColor: '#00FF91',
                                                        color: '#051323'
                                                    }}
                                                >
                                                    {member.role}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
