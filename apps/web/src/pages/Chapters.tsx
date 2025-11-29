/**
 * Chapters Page
 * 
 * Displays official SOMOS chapters with their details, leaders, and upcoming events.
 * 
 * @module pages/Chapters
 * @author SOMOS.tech
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    MapPin, 
    Users, 
    Calendar, 
    Star,
    ChevronRight,
    Building2,
    Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Official chapters data
const OFFICIAL_CHAPTERS = [
    {
        id: 'group-seattle',
        city: 'Seattle',
        state: 'WA',
        name: 'Seattle, WA',
        description: 'The Seattle chapter is one of the founding SOMOS communities, bringing together Latinx tech professionals in the Pacific Northwest.',
        imageUrl: 'https://images.unsplash.com/photo-1502175353174-a7a70e73b362?w=800&q=80',
        founded: '2023',
        highlights: ['Monthly meetups', 'Tech workshops', 'Career mentorship']
    },
    {
        id: 'group-chicago',
        city: 'Chicago',
        state: 'IL',
        name: 'Chicago, IL',
        description: 'The Chicago chapter connects the vibrant Latinx tech community in the Midwest with networking events and professional development.',
        imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=80',
        founded: '2023',
        highlights: ['Networking events', 'Panel discussions', 'Community outreach']
    },
    {
        id: 'group-newyork',
        city: 'New York',
        state: 'NY',
        name: 'New York, NY',
        description: 'The New York chapter is the largest SOMOS community, representing the diverse Latinx tech talent in the NYC metro area.',
        imageUrl: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&q=80',
        founded: '2023',
        highlights: ['Large-scale events', 'Startup support', 'Industry partnerships']
    },
    {
        id: 'group-losangeles',
        city: 'Los Angeles',
        state: 'CA',
        name: 'Los Angeles, CA',
        description: 'The Los Angeles chapter serves Southern California\'s thriving Latinx tech and entertainment tech community.',
        imageUrl: 'https://images.unsplash.com/photo-1534190239940-9ba8944ea261?w=800&q=80',
        founded: '2023',
        highlights: ['Entertainment tech focus', 'Startup ecosystem', 'Creative tech events']
    },
    {
        id: 'group-sanfrancisco',
        city: 'San Francisco',
        state: 'CA',
        name: 'San Francisco, CA',
        description: 'The San Francisco chapter is at the heart of Silicon Valley, connecting Latinx professionals in the world\'s tech capital.',
        imageUrl: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&q=80',
        founded: '2023',
        highlights: ['VC connections', 'Tech giants networking', 'Founder support']
    },
    {
        id: 'group-miami',
        city: 'Miami',
        state: 'FL',
        name: 'Miami, FL',
        description: 'The Miami chapter bridges Latin America and the US tech ecosystem, making it a unique hub for cross-border innovation.',
        imageUrl: 'https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?w=800&q=80',
        founded: '2024',
        highlights: ['LATAM connections', 'Fintech focus', 'Bilingual events']
    }
];

interface ChapterStats {
    [key: string]: {
        memberCount: number;
        upcomingEvents: number;
    };
}

export default function Chapters() {
    const navigate = useNavigate();
    const [chapterStats, setChapterStats] = useState<ChapterStats>({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Fetch chapter stats from API
        const fetchStats = async () => {
            try {
                const response = await fetch('/api/group-stats');
                if (response.ok) {
                    const data = await response.json();
                    const stats: ChapterStats = {};
                    
                    // Map groups to stats
                    if (data.groups) {
                        for (const group of data.groups) {
                            stats[group.id] = {
                                memberCount: group.memberCount || 0,
                                upcomingEvents: 0 // Could be fetched from events API
                            };
                        }
                    }
                    setChapterStats(stats);
                }
            } catch (error) {
                console.error('Error fetching chapter stats:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
    }, []);

    const handleJoinChapter = (chapterId: string) => {
        navigate(`/groups/${chapterId.replace('group-', '')}`);
    };

    const handleViewOnline = (chapterId: string) => {
        navigate('/online');
    };

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#051323' }}>
            {/* Hero Section */}
            <div 
                className="relative py-20 px-4"
                style={{
                    background: 'linear-gradient(180deg, rgba(0, 255, 145, 0.1) 0%, rgba(5, 19, 35, 0) 100%)'
                }}
            >
                <div className="max-w-6xl mx-auto text-center">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <Star className="w-6 h-6 text-[#FFD700] fill-current" />
                        <span className="text-[#FFD700] font-semibold text-lg">Official Chapters</span>
                    </div>
                    <h1 className="text-5xl font-bold text-white mb-4">
                        SOMOS Chapters
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        Join one of our official city chapters to connect with Latinx tech professionals in your area. 
                        Each chapter hosts regular events, workshops, and networking opportunities.
                    </p>
                </div>
            </div>

            {/* Stats Bar */}
            <div className="border-y" style={{ borderColor: 'rgba(0, 255, 145, 0.1)', backgroundColor: 'rgba(10, 31, 53, 0.5)' }}>
                <div className="max-w-6xl mx-auto py-6 px-4">
                    <div className="grid grid-cols-3 gap-8 text-center">
                        <div>
                            <p className="text-3xl font-bold text-[#00FF91]">6</p>
                            <p className="text-gray-400">Official Chapters</p>
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-[#00FF91]">
                                {isLoading ? '...' : Object.values(chapterStats).reduce((sum, s) => sum + s.memberCount, 0)}
                            </p>
                            <p className="text-gray-400">Total Members</p>
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-[#00FF91]">5</p>
                            <p className="text-gray-400">States Represented</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chapters Grid */}
            <div className="max-w-6xl mx-auto py-12 px-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {OFFICIAL_CHAPTERS.map((chapter) => {
                        const stats = chapterStats[chapter.id] || { memberCount: 0, upcomingEvents: 0 };
                        
                        return (
                            <Card 
                                key={chapter.id}
                                className="overflow-hidden hover:shadow-lg transition-all duration-300 group"
                                style={{ 
                                    backgroundColor: '#0a1f35', 
                                    borderColor: 'rgba(0, 255, 145, 0.2)',
                                    cursor: 'pointer'
                                }}
                                onClick={() => handleJoinChapter(chapter.id)}
                            >
                                {/* Chapter Image */}
                                <div className="relative h-48 overflow-hidden">
                                    <img 
                                        src={chapter.imageUrl} 
                                        alt={chapter.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a1f35] via-transparent to-transparent" />
                                    
                                    {/* Official Badge */}
                                    <div className="absolute top-3 left-3">
                                        <Badge 
                                            className="flex items-center gap-1"
                                            style={{ backgroundColor: '#FFD700', color: '#051323' }}
                                        >
                                            <Star className="w-3 h-3 fill-current" />
                                            Official
                                        </Badge>
                                    </div>
                                    
                                    {/* Member Count */}
                                    <div className="absolute bottom-3 right-3">
                                        <Badge 
                                            variant="outline"
                                            className="flex items-center gap-1"
                                            style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', borderColor: '#00FF91', color: '#00FF91' }}
                                        >
                                            <Users className="w-3 h-3" />
                                            {isLoading ? '...' : stats.memberCount} members
                                        </Badge>
                                    </div>
                                </div>
                                
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <CardTitle className="text-xl text-white flex items-center gap-2">
                                                <MapPin className="w-5 h-5 text-[#00FF91]" />
                                                {chapter.name}
                                            </CardTitle>
                                            <CardDescription className="text-gray-400 mt-1">
                                                Founded {chapter.founded}
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                
                                <CardContent>
                                    <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                                        {chapter.description}
                                    </p>
                                    
                                    {/* Highlights */}
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {chapter.highlights.map((highlight, idx) => (
                                            <span 
                                                key={idx}
                                                className="text-xs px-2 py-1 rounded-full"
                                                style={{ backgroundColor: 'rgba(0, 255, 145, 0.1)', color: '#00FF91' }}
                                            >
                                                {highlight}
                                            </span>
                                        ))}
                                    </div>
                                    
                                    {/* Action Button */}
                                    <Button 
                                        className="w-full flex items-center justify-center gap-2 group-hover:bg-[#00FF91] transition-colors"
                                        style={{ backgroundColor: 'rgba(0, 255, 145, 0.2)', color: '#00FF91' }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleJoinChapter(chapter.id);
                                        }}
                                    >
                                        View Chapter
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>

            {/* Call to Action */}
            <div 
                className="py-16 px-4"
                style={{ backgroundColor: 'rgba(10, 31, 53, 0.5)' }}
            >
                <div className="max-w-3xl mx-auto text-center">
                    <Building2 className="w-12 h-12 text-[#02dbff] mx-auto mb-4" />
                    <h2 className="text-3xl font-bold text-white mb-4">
                        Want to Start a Chapter in Your City?
                    </h2>
                    <p className="text-gray-400 mb-6">
                        If you're passionate about building the Latinx tech community in your area, 
                        we'd love to hear from you. Start a new chapter and help us grow the SOMOS network.
                    </p>
                    <Button 
                        size="lg"
                        style={{ backgroundColor: '#02dbff', color: '#051323' }}
                        onClick={() => navigate('/online')}
                    >
                        Join Online Community
                    </Button>
                </div>
            </div>
        </div>
    );
}
