/**
 * Modern Groups/Community Directory Page
 * Showcase all 26 SOMOS.tech local groups with discovery and filtering
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Users, Calendar, MessageCircle, Search, Filter, ArrowRight } from 'lucide-react';

interface Group {
    id: string;
    name: string;
    city: string;
    state: string;
    members: number;
    nextEvent?: string;
    description: string;
    meetingFrequency: string;
    focus: string[];
    image?: string;
}

export default function GroupsDirectoryRedesigned() {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFocus, setSelectedFocus] = useState('all');
    const [sortBy, setSortBy] = useState('members');

    // 26 SOMOS.tech local groups across US
    const groups: Group[] = [
        { id: 'sf-bay', name: 'SF Bay Area', city: 'San Francisco', state: 'CA', members: 842, meetingFrequency: 'Weekly', description: 'Tech professionals in the Bay Area connecting, learning, and growing together.', focus: ['AI', 'Web Dev', 'Cloud'] },
        { id: 'la', name: 'Los Angeles', city: 'Los Angeles', state: 'CA', members: 654, meetingFrequency: 'Bi-weekly', description: 'LA tech community focused on career growth and mentorship.', focus: ['Mobile', 'Data Science', 'Startups'] },
        { id: 'nyc', name: 'New York City', city: 'New York', state: 'NY', members: 721, meetingFrequency: 'Weekly', description: 'The largest SOMOS chapter with diverse tech opportunities.', focus: ['Finance Tech', 'AI', 'Web Dev'] },
        { id: 'chicago', name: 'Chicago', city: 'Chicago', state: 'IL', members: 456, meetingFrequency: 'Bi-weekly', description: 'Chicago tech community building careers and networks.', focus: ['Cloud', 'DevOps', 'Full Stack'] },
        { id: 'denver', name: 'Denver', city: 'Denver', state: 'CO', members: 312, meetingFrequency: 'Monthly', description: 'Rocky Mountain tech professionals connecting and collaborating.', focus: ['AI', 'Web Dev', 'Startups'] },
        { id: 'austin', name: 'Austin', city: 'Austin', state: 'TX', members: 528, meetingFrequency: 'Weekly', description: 'Austin tech scene with focus on innovation and mentorship.', focus: ['Full Stack', 'Data Science', 'Startups'] },
        { id: 'dallas', name: 'Dallas', city: 'Dallas', state: 'TX', members: 389, meetingFrequency: 'Bi-weekly', description: 'Dallas tech professionals advancing their careers.', focus: ['Cloud', 'Security', 'Enterprise'] },
        { id: 'houston', name: 'Houston', city: 'Houston', state: 'TX', members: 267, meetingFrequency: 'Monthly', description: 'Houston community focused on tech careers and networking.', focus: ['Data Science', 'Mobile', 'AI'] },
        { id: 'miami', name: 'Miami', city: 'Miami', state: 'FL', members: 198, meetingFrequency: 'Monthly', description: 'South Florida tech community and professional network.', focus: ['Startups', 'Mobile', 'Web Dev'] },
        { id: 'seattle', name: 'Seattle', city: 'Seattle', state: 'WA', members: 434, meetingFrequency: 'Weekly', description: 'Seattle tech professionals in the Pacific Northwest.', focus: ['Cloud', 'AI', 'Data Science'] },
        { id: 'pdx', name: 'Portland', city: 'Portland', state: 'OR', members: 287, meetingFrequency: 'Bi-weekly', description: 'Portland tech community with emphasis on open source and innovation.', focus: ['Open Source', 'Web Dev', 'DevOps'] },
        { id: 'phoenix', name: 'Phoenix', city: 'Phoenix', state: 'AZ', members: 245, meetingFrequency: 'Monthly', description: 'Arizona tech professionals building careers.', focus: ['Full Stack', 'Mobile', 'Cloud'] },
        { id: 'denver-springs', name: 'Colorado Springs', city: 'Colorado Springs', state: 'CO', members: 156, meetingFrequency: 'Monthly', description: 'Colorado Springs tech community and learning hub.', focus: ['Web Dev', 'Data Science', 'Cloud'] },
        { id: 'raleigh', name: 'Raleigh', city: 'Raleigh', state: 'NC', members: 234, meetingFrequency: 'Bi-weekly', description: 'Research Triangle tech professionals.', focus: ['AI', 'Cloud', 'Full Stack'] },
        { id: 'boston', name: 'Boston', city: 'Boston', state: 'MA', members: 512, meetingFrequency: 'Weekly', description: 'Boston tech scene with strong emphasis on education and growth.', focus: ['Startups', 'AI', 'Security'] },
        { id: 'atlanta', name: 'Atlanta', city: 'Atlanta', state: 'GA', members: 398, meetingFrequency: 'Bi-weekly', description: 'Atlanta tech community for career advancement.', focus: ['Cloud', 'Data Science', 'Mobile'] },
        { id: 'dc', name: 'Washington DC', city: 'Washington', state: 'DC', members: 467, meetingFrequency: 'Weekly', description: 'DC tech professionals in government and enterprise.', focus: ['Security', 'Enterprise', 'Cloud'] },
        { id: 'philadelphia', name: 'Philadelphia', city: 'Philadelphia', state: 'PA', members: 321, meetingFrequency: 'Bi-weekly', description: 'Philadelphia tech community and professional network.', focus: ['Full Stack', 'Web Dev', 'Startups'] },
        { id: 'san-diego', name: 'San Diego', city: 'San Diego', state: 'CA', members: 289, meetingFrequency: 'Monthly', description: 'Southern California tech professionals and innovators.', focus: ['Mobile', 'AI', 'Data Science'] },
        { id: 'phoenix-az', name: 'Tempe', city: 'Tempe', state: 'AZ', members: 198, meetingFrequency: 'Monthly', description: 'Arizona State area tech professionals.', focus: ['Web Dev', 'Cloud', 'DevOps'] },
        { id: 'vegas', name: 'Las Vegas', city: 'Las Vegas', state: 'NV', members: 145, meetingFrequency: 'Monthly', description: 'Nevada tech community and networking hub.', focus: ['Full Stack', 'Data Science', 'Cloud'] },
        { id: 'minneapolis', name: 'Minneapolis', city: 'Minneapolis', state: 'MN', members: 267, meetingFrequency: 'Bi-weekly', description: 'Twin Cities tech professionals.', focus: ['Cloud', 'AI', 'Web Dev'] },
        { id: 'kansas-city', name: 'Kansas City', city: 'Kansas City', state: 'MO', members: 189, meetingFrequency: 'Monthly', description: 'Midwest tech community for professionals.', focus: ['Startups', 'Full Stack', 'Data Science'] },
        { id: 'columbus', name: 'Columbus', city: 'Columbus', state: 'OH', members: 212, meetingFrequency: 'Monthly', description: 'Ohio tech professionals and innovators.', focus: ['Web Dev', 'Cloud', 'Mobile'] },
        { id: 'detroit', name: 'Detroit', city: 'Detroit', state: 'MI', members: 178, meetingFrequency: 'Monthly', description: 'Michigan tech community and professional network.', focus: ['AI', 'Data Science', 'Enterprise'] },
        { id: 'indigo', name: 'Indianapolis', city: 'Indianapolis', state: 'IN', members: 154, meetingFrequency: 'Monthly', description: 'Indianapolis tech professionals and learners.', focus: ['Full Stack', 'Web Dev', 'Cloud'] },
    ];

    const allFocusAreas = Array.from(new Set(groups.flatMap(g => g.focus))).sort();

    const filteredGroups = groups
        .filter(group => {
            const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                group.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                group.state.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesFocus = selectedFocus === 'all' || group.focus.includes(selectedFocus);
            return matchesSearch && matchesFocus;
        })
        .sort((a, b) => {
            if (sortBy === 'members') return b.members - a.members;
            if (sortBy === 'name') return a.name.localeCompare(b.name);
            return a.members - b.members;
        });

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
                            26 Local Groups
                        </h1>
                        <p style={{ color: '#8394A7' }} className="text-lg mb-4">
                            Connect with tech professionals in your area. Find your local SOMOS.tech chapter.
                        </p>
                        <p className="text-sm" style={{ color: '#00FF91' }}>
                            <Users className="w-4 h-4 inline mr-1" />
                            {groups.reduce((sum, g) => sum + g.members, 0).toLocaleString()} members across 26 chapters
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
                                className="w-full pl-12 pr-4 py-3 rounded-lg border text-white placeholder-gray-400 transition-all focus:outline-none focus:ring-2"
                                style={{
                                    backgroundColor: '#0A1628',
                                    borderColor: 'rgba(0, 255, 145, 0.2)',
                                    focusRingColor: 'rgba(0, 255, 145, 0.5)'
                                }}
                            />
                        </div>

                        {/* Focus Areas and Sort */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            <select
                                value={selectedFocus}
                                onChange={(e) => setSelectedFocus(e.target.value)}
                                className="px-4 py-2 rounded-lg border text-sm focus:outline-none transition-colors"
                                style={{
                                    backgroundColor: '#0A1628',
                                    borderColor: 'rgba(0, 255, 145, 0.2)',
                                    color: '#FFFFFF'
                                }}
                            >
                                <option value="all">All Focus Areas</option>
                                {allFocusAreas.map(focus => (
                                    <option key={focus} value={focus}>{focus}</option>
                                ))}
                            </select>

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
                                <option value="members">Most Members</option>
                                <option value="name">Alphabetical</option>
                                <option value="small">Smallest Groups</option>
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
                {filteredGroups.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredGroups.map((group) => (
                            <div
                                key={group.id}
                                className="group rounded-2xl border overflow-hidden transition-all hover:scale-105 hover:shadow-2xl cursor-pointer"
                                style={{
                                    backgroundColor: '#0A1628',
                                    borderColor: 'rgba(0, 255, 145, 0.1)',
                                    boxShadow: 'hover: 0 20px 50px rgba(0, 255, 145, 0.1)'
                                }}
                                onClick={() => navigate(`/groups/${group.id}`)}
                            >
                                {/* Header */}
                                <div 
                                    className="p-6 border-b relative overflow-hidden"
                                    style={{ borderColor: 'rgba(0, 255, 145, 0.1)' }}
                                >
                                    <div className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity" style={{ backgroundColor: '#00FF91' }} />
                                    
                                    <h3 className="text-xl font-bold text-white mb-1 relative z-10">{group.name}</h3>
                                    <div className="flex items-center gap-2 text-sm relative z-10" style={{ color: '#8394A7' }}>
                                        <MapPin className="w-4 h-4" />
                                        {group.city}, {group.state}
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-6 space-y-4">
                                    <p style={{ color: '#8394A7' }} className="text-sm">{group.description}</p>

                                    {/* Stats */}
                                    <div className="grid grid-cols-2 gap-4 pb-4 border-b" style={{ borderColor: 'rgba(0, 255, 145, 0.1)' }}>
                                        <div>
                                            <p style={{ color: '#8394A7' }} className="text-xs mb-1 flex items-center gap-1">
                                                <Users className="w-3 h-3" />
                                                Members
                                            </p>
                                            <p className="text-lg font-bold text-white">{group.members}</p>
                                        </div>
                                        <div>
                                            <p style={{ color: '#8394A7' }} className="text-xs mb-1 flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                Meets
                                            </p>
                                            <p className="text-sm font-bold text-white">{group.meetingFrequency}</p>
                                        </div>
                                    </div>

                                    {/* Focus Areas */}
                                    <div className="space-y-2">
                                        <p style={{ color: '#8394A7' }} className="text-xs">Focus Areas</p>
                                        <div className="flex flex-wrap gap-2">
                                            {group.focus.map((focus) => (
                                                <span
                                                    key={focus}
                                                    className="px-3 py-1 rounded-full text-xs font-medium"
                                                    style={{
                                                        backgroundColor: 'rgba(0, 255, 145, 0.1)',
                                                        color: '#00FF91',
                                                        border: '1px solid rgba(0, 255, 145, 0.3)'
                                                    }}
                                                >
                                                    {focus}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* CTA */}
                                    <button 
                                        className="w-full mt-4 py-2.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 text-sm group/btn"
                                        style={{
                                            backgroundColor: '#00FF91',
                                            color: '#051323',
                                        }}
                                    >
                                        Join Group
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
                        <p style={{ color: '#8394A7' }}>Try adjusting your search or filters to find more groups.</p>
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
