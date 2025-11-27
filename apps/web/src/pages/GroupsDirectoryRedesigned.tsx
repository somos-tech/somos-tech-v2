/**
 * Modern Groups/Community Directory Page
 * Showcase all SOMOS.tech local groups with discovery and filtering
 * Uses actual group IDs from database (group-{cityname} format)
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Users, Calendar, MessageCircle, Search, ArrowRight, Lock, Loader2 } from 'lucide-react';
import { listGroups } from '@/api/groupsService';
import type { CommunityGroup } from '@/types/groups';

// Royalty-free Unsplash skyline images for each city
const cityImages: Record<string, string> = {
    'Seattle': 'https://images.unsplash.com/photo-1502175353174-a7a70e73b362?w=800&q=80',
    'New York': 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&q=80',
    'Boston': 'https://images.unsplash.com/photo-1617440168937-e6b5e8a4b28f?w=800&q=80',
    'Denver': 'https://images.unsplash.com/photo-1619856699906-09e1f58c98b1?w=800&q=80',
    'Washington': 'https://images.unsplash.com/photo-1617581629397-a72507c3de9e?w=800&q=80',
    'Atlanta': 'https://images.unsplash.com/photo-1575917649705-5b59aaa12e6b?w=800&q=80',
    'San Francisco': 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&q=80',
    'Chicago': 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=80',
    'Austin': 'https://images.unsplash.com/photo-1531218150217-54595bc2b934?w=800&q=80',
    'Houston': 'https://images.unsplash.com/photo-1558525107-b9b347fe9da5?w=800&q=80',
    'Los Angeles': 'https://images.unsplash.com/photo-1534190239940-9ba8944ea261?w=800&q=80',
    'Miami': 'https://images.unsplash.com/photo-1506966953602-c20cc11f75e3?w=800&q=80',
    'Dallas': 'https://images.unsplash.com/photo-1558522195-e1201b090344?w=800&q=80',
    'Phoenix': 'https://images.unsplash.com/photo-1515862515700-77e5b8faab81?w=800&q=80',
    'San Diego': 'https://images.unsplash.com/photo-1538964173425-93884ed51948?w=800&q=80',
    'Philadelphia': 'https://images.unsplash.com/photo-1569761316261-9a8696fa2ca3?w=800&q=80',
    'Sacramento': 'https://images.unsplash.com/photo-1590859808308-3d2d9c515b1a?w=800&q=80',
    'Dallas/Ft. Worth': 'https://images.unsplash.com/photo-1552057426-c4d3f5f6d1f6?w=800&q=80',
};

// Default skyline for cities without specific images
const defaultSkyline = 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&q=80';

export default function GroupsDirectoryRedesigned() {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFocus, setSelectedFocus] = useState('all');
    const [sortBy, setSortBy] = useState('name');
    const [groups, setGroups] = useState<CommunityGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch groups from API on mount
    useEffect(() => {
        fetchGroups();
    }, []);

    const fetchGroups = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await listGroups();
            // Filter to only show Public groups
            const publicGroups = data.groups.filter(g => g.visibility === 'Public');
            setGroups(publicGroups);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load groups');
            console.error('Error fetching groups:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredGroups = groups
        .filter(group => {
            const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                group.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                group.state.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesSearch;
        })
        .sort((a, b) => {
            if (sortBy === 'name') return a.name.localeCompare(b.name);
            if (sortBy === 'city') return a.city.localeCompare(b.city);
            return a.name.localeCompare(b.name);
        });

    const handleJoinGroup = (e: React.MouseEvent, groupId: string) => {
        e.stopPropagation();
        navigate(`/groups/${groupId}`);
    };

    const getGroupImage = (group: CommunityGroup) => {
        return cityImages[group.city] || group.imageUrl || defaultSkyline;
    };

    return (
        <div style={{ backgroundColor: '#051323', minHeight: '100vh' }}>
            {/* Hero Section */}
            <div 
                className="relative overflow-hidden"
                style={{
                    background: 'linear-gradient(135deg, #051323 0%, #0A1628 50%, rgba(0, 255, 145, 0.05) 100%)',
                    borderBottom: '1px solid rgba(0, 255, 145, 0.1)'
                }}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
                    <div className="text-center max-w-3xl mx-auto mb-12">
                        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
                            Find Your Community
                        </h1>
                        <p style={{ color: '#8394A7' }} className="text-lg mb-4">
                            Connect with tech professionals in your area. Find your local SOMOS.tech chapter.
                        </p>
                        <p className="text-sm" style={{ color: '#00FF91' }}>
                            <Users className="w-4 h-4 inline mr-1" />
                            {groups.length} chapters across the United States
                        </p>
                    </div>

                    {/* Search and Filters */}
                    <div className="space-y-4">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by city, state, or group name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 rounded-lg border text-white placeholder-gray-400 transition-all focus:outline-none focus:ring-2 focus:ring-[#00FF91]/50"
                                style={{
                                    backgroundColor: '#0A1628',
                                    borderColor: 'rgba(0, 255, 145, 0.2)'
                                }}
                            />
                        </div>

                        {/* Sort */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="px-4 py-2 rounded-lg border text-sm focus:outline-none transition-colors"
                                style={{
                                    backgroundColor: '#0A1628',
                                    borderColor: 'rgba(0, 255, 145, 0.2)',
                                    color: '#FFFFFF'
                                }}
                            >
                                <option value="name">Alphabetical</option>
                                <option value="city">By City</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Results Count */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 border-b" style={{ borderColor: 'rgba(0, 255, 145, 0.1)' }}>
                <p style={{ color: '#8394A7' }} className="text-sm">
                    Showing <span className="text-white font-bold">{filteredGroups.length}</span> of <span className="text-white font-bold">{groups.length}</span> groups
                </p>
            </div>

            {/* Groups Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#00FF91' }} />
                        <span className="ml-3 text-white">Loading groups...</span>
                    </div>
                ) : error ? (
                    <div className="text-center py-16">
                        <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-30" style={{ color: '#8394A7' }} />
                        <p className="text-xl font-bold text-white mb-2">Error loading groups</p>
                        <p style={{ color: '#8394A7' }}>{error}</p>
                        <button
                            onClick={fetchGroups}
                            className="mt-4 px-6 py-2 rounded-lg font-bold"
                            style={{ backgroundColor: '#00FF91', color: '#051323' }}
                        >
                            Try Again
                        </button>
                    </div>
                ) : filteredGroups.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredGroups.map((group) => (
                            <div
                                key={group.id}
                                className="group rounded-2xl border overflow-hidden transition-all hover:scale-105 hover:shadow-2xl cursor-pointer"
                                style={{
                                    backgroundColor: '#0A1628',
                                    borderColor: 'rgba(0, 255, 145, 0.1)',
                                }}
                                onClick={() => navigate(`/groups/${group.id}`)}
                            >
                                {/* City Skyline Image */}
                                <div className="relative h-40 overflow-hidden">
                                    <img 
                                        src={getGroupImage(group)}
                                        alt={`${group.city} skyline`}
                                        className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = defaultSkyline;
                                        }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A1628] to-transparent" />
                                    <div className="absolute bottom-4 left-4">
                                        <h3 className="text-xl font-bold text-white">{group.name}</h3>
                                        <div className="flex items-center gap-2 text-sm" style={{ color: '#8394A7' }}>
                                            <MapPin className="w-4 h-4" />
                                            {group.city}, {group.state}
                                        </div>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-6 space-y-4">
                                    <p style={{ color: '#8394A7' }} className="text-sm line-clamp-2">
                                        {group.description || `Join the ${group.city} tech community chapter.`}
                                    </p>

                                    {/* Stats */}
                                    <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'rgba(0, 255, 145, 0.1)' }}>
                                        <div className="flex items-center gap-2">
                                            <Users className="w-4 h-4" style={{ color: '#00D4FF' }} />
                                            <span className="text-sm" style={{ color: '#8394A7' }}>
                                                {group.memberCount && group.memberCount > 0 
                                                    ? `${group.memberCount} members` 
                                                    : 'Join to connect'}
                                            </span>
                                        </div>
                                        <span 
                                            className="px-2 py-1 rounded-full text-xs font-medium"
                                            style={{
                                                backgroundColor: 'rgba(0, 255, 145, 0.1)',
                                                color: '#00FF91',
                                            }}
                                        >
                                            {group.visibility}
                                        </span>
                                    </div>

                                    {/* CTA */}
                                    <button 
                                        onClick={(e) => handleJoinGroup(e, group.id)}
                                        className="w-full py-2.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 text-sm group/btn hover:scale-105"
                                        style={{
                                            backgroundColor: '#00FF91',
                                            color: '#051323',
                                        }}
                                    >
                                        View Group
                                        <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-30" style={{ color: '#8394A7' }} />
                        <p className="text-xl font-bold text-white mb-2">No groups found</p>
                        <p style={{ color: '#8394A7' }}>Try adjusting your search to find more groups.</p>
                    </div>
                )}
            </div>

            {/* CTA Section */}
            <div 
                className="max-w-7xl mx-auto px-4 sm:px-6 py-16 my-12 rounded-2xl border"
                style={{
                    backgroundColor: 'rgba(0, 255, 145, 0.05)',
                    borderColor: 'rgba(0, 255, 145, 0.2)',
                }}
            >
                <div className="text-center max-w-2xl mx-auto">
                    <h2 className="text-3xl font-bold text-white mb-4">
                        Don't see your city?
                    </h2>
                    <p style={{ color: '#8394A7' }} className="text-lg mb-8">
                        Help us expand! Start a new chapter in your area and connect with local tech professionals.
                    </p>
                    <button 
                        onClick={() => window.open('https://somos.tech/contact', '_blank')}
                        className="px-8 py-3 rounded-full font-bold transition-all hover:scale-105"
                        style={{ backgroundColor: '#00FF91', color: '#051323' }}
                    >
                        Start a Chapter
                    </button>
                </div>
            </div>
        </div>
    );
}
