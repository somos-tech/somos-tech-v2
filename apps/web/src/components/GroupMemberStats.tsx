import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
    ChevronDown, 
    ChevronUp, 
    ChevronRight,
    Users, 
    MapPin, 
    TrendingUp,
    Search,
    BarChart3,
    List
} from 'lucide-react';

interface GroupData {
    id: string;
    name: string;
    city: string;
    memberCount: number;
}

interface StateData {
    state: string;
    stateName: string;
    lat: number;
    lon: number;
    groups: GroupData[];
    totalMembers: number;
}

interface GroupMemberStatsProps {
    stateStats: StateData[];
    onGroupClick?: (groupId: string) => void;
}

type SortField = 'state' | 'members' | 'groups';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'bars' | 'list';

export default function GroupMemberStats({ stateStats, onGroupClick }: GroupMemberStatsProps) {
    const [expandedStates, setExpandedStates] = useState<Set<string>>(new Set());
    const [sortField, setSortField] = useState<SortField>('members');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<ViewMode>('bars');

    // Calculate totals
    const totals = useMemo(() => {
        const totalMembers = stateStats.reduce((sum, s) => sum + s.totalMembers, 0);
        const totalGroups = stateStats.reduce((sum, s) => sum + s.groups.length, 0);
        const activeStates = stateStats.filter(s => s.totalMembers > 0).length;
        return { totalMembers, totalGroups, activeStates };
    }, [stateStats]);

    // Filter and sort states
    const filteredAndSortedStats = useMemo(() => {
        let filtered = stateStats.filter(s => s.totalMembers > 0);
        
        // Apply search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(s => 
                s.stateName.toLowerCase().includes(query) ||
                s.state.toLowerCase().includes(query) ||
                s.groups.some(g => 
                    g.city.toLowerCase().includes(query) ||
                    g.name.toLowerCase().includes(query)
                )
            );
        }

        // Sort
        return [...filtered].sort((a, b) => {
            let comparison = 0;
            switch (sortField) {
                case 'state':
                    comparison = a.stateName.localeCompare(b.stateName);
                    break;
                case 'members':
                    comparison = a.totalMembers - b.totalMembers;
                    break;
                case 'groups':
                    comparison = a.groups.length - b.groups.length;
                    break;
            }
            return sortDirection === 'desc' ? -comparison : comparison;
        });
    }, [stateStats, sortField, sortDirection, searchQuery]);

    // Max members for progress bar scaling
    const maxMembers = useMemo(() => {
        return Math.max(...stateStats.map(s => s.totalMembers), 1);
    }, [stateStats]);

    const toggleExpand = (state: string) => {
        const newExpanded = new Set(expandedStates);
        if (newExpanded.has(state)) {
            newExpanded.delete(state);
        } else {
            newExpanded.add(state);
        }
        setExpandedStates(newExpanded);
    };

    const toggleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return null;
        return sortDirection === 'desc' 
            ? <ChevronDown className="h-3 w-3" /> 
            : <ChevronUp className="h-3 w-3" />;
    };

    if (stateStats.length === 0 || totals.totalMembers === 0) {
        return (
            <Card style={{ backgroundColor: '#051323', borderColor: 'rgba(0, 255, 145, 0.3)' }}>
                <CardContent className="py-12 text-center">
                    <Users className="h-12 w-12 mx-auto mb-4" style={{ color: '#8394A7' }} />
                    <p style={{ color: '#8394A7' }}>No member data available yet</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card style={{ backgroundColor: '#051323', borderColor: 'rgba(0, 255, 145, 0.3)' }}>
            <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" style={{ color: '#00FF91' }} />
                        <CardTitle style={{ color: '#FFFFFF' }}>Member Distribution by Location</CardTitle>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {/* View Mode Toggle */}
                        <div className="flex rounded-lg overflow-hidden" style={{ backgroundColor: '#0a1f35' }}>
                            <button
                                onClick={() => setViewMode('bars')}
                                className={`p-2 transition-colors ${viewMode === 'bars' ? 'bg-[#00FF91] text-[#051323]' : 'text-[#8394A7] hover:text-white'}`}
                                title="Bar chart view"
                            >
                                <BarChart3 className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-[#00FF91] text-[#051323]' : 'text-[#8394A7] hover:text-white'}`}
                                title="List view"
                            >
                                <List className="h-4 w-4" />
                            </button>
                        </div>
                        
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8394A7]" />
                            <Input
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 w-40 h-9"
                                style={{ backgroundColor: '#0a1f35', borderColor: '#8394A7', color: '#FFFFFF' }}
                            />
                        </div>
                    </div>
                </div>

                {/* Summary Stats */}
                <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t" style={{ borderColor: 'rgba(0, 255, 145, 0.2)' }}>
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(0, 255, 145, 0.1)' }}>
                            <Users className="h-4 w-4" style={{ color: '#00FF91' }} />
                        </div>
                        <div>
                            <p className="text-xs" style={{ color: '#8394A7' }}>Total Members</p>
                            <p className="font-bold text-white">{totals.totalMembers.toLocaleString()}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(2, 219, 255, 0.1)' }}>
                            <MapPin className="h-4 w-4" style={{ color: '#02dbff' }} />
                        </div>
                        <div>
                            <p className="text-xs" style={{ color: '#8394A7' }}>Active States</p>
                            <p className="font-bold text-white">{totals.activeStates}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(255, 184, 0, 0.1)' }}>
                            <TrendingUp className="h-4 w-4" style={{ color: '#FFB800' }} />
                        </div>
                        <div>
                            <p className="text-xs" style={{ color: '#8394A7' }}>Total Groups</p>
                            <p className="font-bold text-white">{totals.totalGroups}</p>
                        </div>
                    </div>
                </div>
            </CardHeader>

            <CardContent>
                {/* Sort Controls */}
                <div className="flex gap-2 mb-4 text-xs">
                    <span style={{ color: '#8394A7' }}>Sort by:</span>
                    <button
                        onClick={() => toggleSort('members')}
                        className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                            sortField === 'members' ? 'bg-[#00FF91]/20 text-[#00FF91]' : 'text-[#8394A7] hover:text-white'
                        }`}
                    >
                        Members <SortIcon field="members" />
                    </button>
                    <button
                        onClick={() => toggleSort('groups')}
                        className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                            sortField === 'groups' ? 'bg-[#00FF91]/20 text-[#00FF91]' : 'text-[#8394A7] hover:text-white'
                        }`}
                    >
                        Groups <SortIcon field="groups" />
                    </button>
                    <button
                        onClick={() => toggleSort('state')}
                        className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                            sortField === 'state' ? 'bg-[#00FF91]/20 text-[#00FF91]' : 'text-[#8394A7] hover:text-white'
                        }`}
                    >
                        Name <SortIcon field="state" />
                    </button>
                </div>

                {/* State List */}
                <div className="space-y-2">
                    {filteredAndSortedStats.length === 0 ? (
                        <div className="text-center py-8" style={{ color: '#8394A7' }}>
                            No states match your search
                        </div>
                    ) : (
                        filteredAndSortedStats.map((state) => {
                            const isExpanded = expandedStates.has(state.state);
                            const percentage = (state.totalMembers / maxMembers) * 100;
                            
                            return (
                                <div 
                                    key={state.state}
                                    className="rounded-lg overflow-hidden"
                                    style={{ backgroundColor: 'rgba(10, 31, 53, 0.5)' }}
                                >
                                    {/* State Row */}
                                    <button
                                        onClick={() => toggleExpand(state.state)}
                                        className="w-full p-3 flex items-center gap-3 hover:bg-white/5 transition-colors text-left"
                                    >
                                        <div className="flex-shrink-0">
                                            {isExpanded ? (
                                                <ChevronDown className="h-4 w-4 text-[#00FF91]" />
                                            ) : (
                                                <ChevronRight className="h-4 w-4 text-[#8394A7]" />
                                            )}
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-white">{state.stateName}</span>
                                                    <Badge 
                                                        variant="outline" 
                                                        className="text-xs"
                                                        style={{ borderColor: '#8394A7', color: '#8394A7' }}
                                                    >
                                                        {state.state}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-3 text-sm">
                                                    <span style={{ color: '#8394A7' }}>
                                                        {state.groups.length} group{state.groups.length !== 1 ? 's' : ''}
                                                    </span>
                                                    <span className="font-bold" style={{ color: '#00FF91' }}>
                                                        {state.totalMembers} member{state.totalMembers !== 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            {viewMode === 'bars' && (
                                                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(131, 148, 167, 0.2)' }}>
                                                    <div 
                                                        className="h-full rounded-full transition-all duration-500"
                                                        style={{ 
                                                            width: `${percentage}%`,
                                                            backgroundColor: '#00FF91'
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </button>

                                    {/* Expanded Group Details */}
                                    {isExpanded && (
                                        <div 
                                            className="px-3 pb-3 ml-7 border-l-2 space-y-2"
                                            style={{ borderColor: 'rgba(0, 255, 145, 0.3)' }}
                                        >
                                            {state.groups
                                                .sort((a, b) => b.memberCount - a.memberCount)
                                                .map((group) => {
                                                    const groupPercentage = state.totalMembers > 0 
                                                        ? (group.memberCount / state.totalMembers) * 100 
                                                        : 0;
                                                    
                                                    return (
                                                        <div 
                                                            key={group.id}
                                                            className="p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                                                            onClick={() => onGroupClick?.(group.id)}
                                                        >
                                                            <div className="flex items-center justify-between mb-1">
                                                                <div className="flex items-center gap-2">
                                                                    <MapPin className="h-3 w-3" style={{ color: '#02dbff' }} />
                                                                    <span className="text-sm text-white">{group.city}</span>
                                                                    {group.name !== `${group.city}, ${state.state}` && (
                                                                        <span className="text-xs" style={{ color: '#8394A7' }}>
                                                                            ({group.name})
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <Users className="h-3 w-3" style={{ color: '#00FF91' }} />
                                                                    <span className="text-sm font-medium" style={{ color: '#00FF91' }}>
                                                                        {group.memberCount}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            
                                                            {viewMode === 'bars' && (
                                                                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(131, 148, 167, 0.15)' }}>
                                                                    <div 
                                                                        className="h-full rounded-full transition-all duration-300"
                                                                        style={{ 
                                                                            width: `${groupPercentage}%`,
                                                                            backgroundColor: '#02dbff'
                                                                        }}
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
