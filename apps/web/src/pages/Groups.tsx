/**
 * Community Groups Page
 * 
 * Displays all community groups with tabs for All, My Groups, and Suggested.
 * Members can browse and join local community groups.
 * 
 * @module pages/Groups
 * @author SOMOS.tech
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, MapPin, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/DefaultAvatar';
import { listGroups, joinGroup, leaveGroup } from '@/api/groupsService';
import type { CommunityGroup } from '@/types/groups';
import { useAuth } from '@/hooks/useAuth';

/**
 * Group Card Component
 */
function GroupCard({
    group,
    isMember,
    onJoin,
    onLeave,
    isLoading
}: {
    group: CommunityGroup;
    isMember: boolean;
    onJoin: () => void;
    onLeave: () => void;
    isLoading: boolean;
}) {
    const navigate = useNavigate();

    return (
        <div
            className="flex items-center justify-between p-3 rounded-lg border transition-all hover:border-[#00FF91]/50 cursor-pointer"
            style={{ backgroundColor: '#0A1929', borderColor: '#1E3A5F' }}
            onClick={() => navigate(`/groups/${group.id}`)}
        >
            <div className="flex items-center gap-4 flex-1 min-w-0">
                {/* Group Image */}
                <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                        src={group.thumbnailUrl || group.imageUrl}
                        alt={group.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=200&h=200&fit=crop';
                        }}
                    />
                </div>

                {/* Group Info */}
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">
                        {group.name}
                    </h3>
                    <div className="flex items-center gap-2 text-sm" style={{ color: '#8394A7' }}>
                        <Badge
                            variant="outline"
                            className="text-xs"
                            style={{
                                borderColor: '#00FF91',
                                color: '#00FF91',
                                backgroundColor: 'rgba(0, 255, 145, 0.1)'
                            }}
                        >
                            {group.visibility}
                        </Badge>
                        {group.memberCount > 0 && (
                            <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {group.memberCount}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Join/Leave Button */}
            <Button
                size="sm"
                disabled={isLoading}
                onClick={(e) => {
                    e.stopPropagation();
                    isMember ? onLeave() : onJoin();
                }}
                className="ml-4 rounded-full"
                style={{
                    backgroundColor: isMember ? 'transparent' : '#00FF91',
                    color: isMember ? '#00FF91' : '#051323',
                    borderColor: '#00FF91',
                    border: isMember ? '1px solid #00FF91' : 'none'
                }}
            >
                {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : isMember ? (
                    'Joined'
                ) : (
                    'Join'
                )}
            </Button>
        </div>
    );
}

/**
 * Main Groups Page Component
 */
export default function Groups() {
    const { isAuthenticated, user } = useAuth();
    const navigate = useNavigate();
    
    const [groups, setGroups] = useState<CommunityGroup[]>([]);
    const [userMemberships, setUserMemberships] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [loadingGroupId, setLoadingGroupId] = useState<string | null>(null);

    // Fetch groups on mount
    useEffect(() => {
        fetchGroups();
    }, []);

    const fetchGroups = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await listGroups();
            setGroups(data.groups);
            setUserMemberships(data.userMemberships || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load groups');
            console.error('Error fetching groups:', err);
        } finally {
            setLoading(false);
        }
    };

    // Handle join group
    const handleJoin = async (groupId: string) => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        try {
            setLoadingGroupId(groupId);
            await joinGroup(groupId);
            setUserMemberships(prev => [...prev, groupId]);
            // Update member count locally
            setGroups(prev => prev.map(g => 
                g.id === groupId ? { ...g, memberCount: (g.memberCount || 0) + 1 } : g
            ));
        } catch (err) {
            console.error('Error joining group:', err);
        } finally {
            setLoadingGroupId(null);
        }
    };

    // Handle leave group
    const handleLeave = async (groupId: string) => {
        try {
            setLoadingGroupId(groupId);
            await leaveGroup(groupId);
            setUserMemberships(prev => prev.filter(id => id !== groupId));
            // Update member count locally
            setGroups(prev => prev.map(g => 
                g.id === groupId ? { ...g, memberCount: Math.max(0, (g.memberCount || 1) - 1) } : g
            ));
        } catch (err) {
            console.error('Error leaving group:', err);
        } finally {
            setLoadingGroupId(null);
        }
    };

    // Filter groups based on search and tab
    const filteredGroups = useMemo(() => {
        let result = groups;

        // Filter by search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(g =>
                g.name.toLowerCase().includes(query) ||
                g.city.toLowerCase().includes(query) ||
                g.state.toLowerCase().includes(query)
            );
        }

        // Filter by tab
        if (activeTab === 'my-groups') {
            result = result.filter(g => userMemberships.includes(g.id));
        } else if (activeTab === 'suggested') {
            // Show groups user hasn't joined yet
            result = result.filter(g => !userMemberships.includes(g.id));
        }

        return result;
    }, [groups, searchQuery, activeTab, userMemberships]);

    // Count for tabs
    const myGroupsCount = groups.filter(g => userMemberships.includes(g.id)).length;
    const suggestedCount = groups.filter(g => !userMemberships.includes(g.id)).length;

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#051323' }}>
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center gap-2 text-sm mb-2" style={{ color: '#8394A7' }}>
                        <span>Sort by: Recent Activity</span>
                        <ChevronRight className="w-4 h-4" />
                    </div>

                    {/* Tabs */}
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList 
                            className="w-full justify-start gap-4 bg-transparent border-b rounded-none h-auto p-0"
                            style={{ borderColor: '#1E3A5F' }}
                        >
                            <TabsTrigger
                                value="all"
                                className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#00FF91] data-[state=active]:bg-transparent bg-transparent px-0 pb-3"
                                style={{ color: activeTab === 'all' ? '#FFFFFF' : '#8394A7' }}
                            >
                                All ({groups.length})
                            </TabsTrigger>
                            <TabsTrigger
                                value="my-groups"
                                className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#00FF91] data-[state=active]:bg-transparent bg-transparent px-0 pb-3"
                                style={{ color: activeTab === 'my-groups' ? '#FFFFFF' : '#8394A7' }}
                            >
                                My Groups{myGroupsCount > 0 && ` (${myGroupsCount})`}
                            </TabsTrigger>
                            <TabsTrigger
                                value="suggested"
                                className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#00FF91] data-[state=active]:bg-transparent bg-transparent px-0 pb-3"
                                style={{ color: activeTab === 'suggested' ? '#FFFFFF' : '#8394A7' }}
                            >
                                Suggested Groups
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {/* Search (optional, can add later)
                <div className="mb-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#8394A7' }} />
                        <Input
                            placeholder="Search groups..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                            style={{
                                backgroundColor: '#0A1929',
                                borderColor: '#1E3A5F',
                                color: '#FFFFFF'
                            }}
                        />
                    </div>
                </div>
                */}

                {/* Loading State */}
                {loading && (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#00FF91' }} />
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="text-center py-12">
                        <p style={{ color: '#FF4444' }}>{error}</p>
                        <Button
                            onClick={fetchGroups}
                            className="mt-4"
                            style={{ backgroundColor: '#00FF91', color: '#051323' }}
                        >
                            Retry
                        </Button>
                    </div>
                )}

                {/* Groups List */}
                {!loading && !error && (
                    <div className="space-y-3">
                        {filteredGroups.length === 0 ? (
                            <div className="text-center py-12">
                                <Users className="w-12 h-12 mx-auto mb-4" style={{ color: '#8394A7' }} />
                                <p style={{ color: '#8394A7' }}>
                                    {activeTab === 'my-groups'
                                        ? "You haven't joined any groups yet."
                                        : 'No groups found.'}
                                </p>
                            </div>
                        ) : (
                            filteredGroups.map(group => (
                                <GroupCard
                                    key={group.id}
                                    group={group}
                                    isMember={userMemberships.includes(group.id)}
                                    onJoin={() => handleJoin(group.id)}
                                    onLeave={() => handleLeave(group.id)}
                                    isLoading={loadingGroupId === group.id}
                                />
                            ))
                        )}
                    </div>
                )}

                {/* Introduce Yourself CTA */}
                {isAuthenticated && (
                    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2">
                        <Button
                            className="rounded-full px-6 shadow-lg"
                            style={{
                                backgroundColor: '#0A1929',
                                color: '#FFFFFF',
                                border: '1px solid #1E3A5F'
                            }}
                        >
                            Introduce yourself
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
