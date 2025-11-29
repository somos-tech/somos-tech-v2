import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2, MapPin, Eye, Users, Map, LayoutGrid, Table } from 'lucide-react';
import AdminBreadcrumbs from '@/components/AdminBreadcrumbs';
import USHeatMap from '@/components/USHeatMap';

interface Group {
    id: string;
    name: string;
    city: string;
    state: string;
    stateAbbr?: string;
    visibility: 'Public' | 'Hidden';
    imageUrl: string;
    description?: string;
    memberCount?: number;
    createdAt: string;
}

interface StateStats {
    state: string;
    stateName: string;
    lat: number;
    lon: number;
    groups: Array<{ id: string; name: string; city: string; memberCount: number }>;
    totalMembers: number;
}

interface GroupStats {
    groups: Group[];
    stateStats: StateStats[];
    summary: {
        totalGroups: number;
        totalMembers: number;
        statesWithMembers: number;
    };
}

export default function AdminGroups() {
    const [groups, setGroups] = useState<Group[]>([]);
    const [stateStats, setStateStats] = useState<StateStats[]>([]);
    const [summary, setSummary] = useState({ totalGroups: 0, totalMembers: 0, statesWithMembers: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<Group | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        city: '',
        state: '',
        visibility: 'Public' as 'Public' | 'Hidden',
        imageUrl: '',
        description: ''
    });

    useEffect(() => {
        fetchGroups();
    }, []);

    const fetchGroups = async () => {
        try {
            // Try to fetch from the stats endpoint first (includes member counts)
            const statsResponse = await fetch('/api/group-stats');
            if (statsResponse.ok) {
                const data: GroupStats = await statsResponse.json();
                setGroups(data.groups);
                setStateStats(data.stateStats);
                setSummary(data.summary);
            } else {
                // Fallback to regular groups endpoint
                const response = await fetch('/api/groups');
                if (response.ok) {
                    const data = await response.json();
                    setGroups(data);
                }
            }
        } catch (error) {
            console.error('Error fetching groups:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        try {
            const url = editingGroup ? `/api/groups/${editingGroup.id}` : '/api/groups';
            const method = editingGroup ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                await fetchGroups();
                handleCloseDialog();
            }
        } catch (error) {
            console.error('Error saving group:', error);
        }
    };

    const handleDelete = async (groupId: string) => {
        if (!confirm('Are you sure you want to delete this group?')) return;

        try {
            const response = await fetch(`/api/groups/${groupId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                await fetchGroups();
            }
        } catch (error) {
            console.error('Error deleting group:', error);
        }
    };

    const handleEdit = (group: Group) => {
        setEditingGroup(group);
        setFormData({
            name: group.name,
            city: group.city,
            state: group.state,
            visibility: group.visibility,
            imageUrl: group.imageUrl,
            description: group.description || ''
        });
        setIsDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setEditingGroup(null);
        setFormData({
            name: '',
            city: '',
            state: '',
            visibility: 'Public',
            imageUrl: '',
            description: ''
        });
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0a1f35' }}>
                <div style={{ color: '#8394A7' }}>Loading groups...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#0a1f35' }}>
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Breadcrumbs */}
                <AdminBreadcrumbs />
                
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-4xl font-bold mb-2" style={{ color: '#FFFFFF' }}>
                            Groups Management
                        </h1>
                        <p style={{ color: '#8394A7' }}>
                            Manage location-based community chapters • {summary.totalGroups} groups • {summary.totalMembers} members
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        {/* View Toggle */}
                        <div className="flex rounded-lg overflow-hidden" style={{ backgroundColor: '#051323' }}>
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-[#00FF91] text-[#051323]' : 'text-[#8394A7] hover:text-white'}`}
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('table')}
                                className={`p-2 transition-colors ${viewMode === 'table' ? 'bg-[#00FF91] text-[#051323]' : 'text-[#8394A7] hover:text-white'}`}
                            >
                                <Table className="h-4 w-4" />
                            </button>
                        </div>
                        
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    className="flex items-center gap-2"
                                    style={{ backgroundColor: '#00FF91', color: '#051323' }}
                                >
                                    <Plus className="h-4 w-4" />
                                    Add Group
                                </Button>
                            </DialogTrigger>
                        <DialogContent style={{ backgroundColor: '#051323', borderColor: '#00FF91' }}>
                            <DialogHeader>
                                <DialogTitle style={{ color: '#FFFFFF' }}>
                                    {editingGroup ? 'Edit Group' : 'Create New Group'}
                                </DialogTitle>
                                <DialogDescription style={{ color: '#8394A7' }}>
                                    {editingGroup ? 'Update group information' : 'Add a new city chapter or event group'}
                                </DialogDescription>
                            </DialogHeader>
                            
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <Label htmlFor="city" style={{ color: '#8394A7' }}>City</Label>
                                    <Input
                                        id="city"
                                        value={formData.city}
                                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                        placeholder="e.g., Seattle"
                                        required
                                        style={{ backgroundColor: '#0a1f35', borderColor: '#8394A7', color: '#FFFFFF' }}
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="state" style={{ color: '#8394A7' }}>State/Region</Label>
                                    <Input
                                        id="state"
                                        value={formData.state}
                                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                        placeholder="e.g., WA"
                                        required
                                        style={{ backgroundColor: '#0a1f35', borderColor: '#8394A7', color: '#FFFFFF' }}
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="name" style={{ color: '#8394A7' }}>Group Name (optional)</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Will default to 'City, State'"
                                        style={{ backgroundColor: '#0a1f35', borderColor: '#8394A7', color: '#FFFFFF' }}
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="visibility" style={{ color: '#8394A7' }}>Visibility</Label>
                                    <Select
                                        value={formData.visibility}
                                        onValueChange={(value: 'Public' | 'Hidden') => setFormData({ ...formData, visibility: value })}
                                    >
                                        <SelectTrigger style={{ backgroundColor: '#0a1f35', borderColor: '#8394A7', color: '#FFFFFF' }}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent style={{ backgroundColor: '#051323', borderColor: '#8394A7' }}>
                                            <SelectItem value="Public" style={{ color: '#FFFFFF' }}>Public</SelectItem>
                                            <SelectItem value="Hidden" style={{ color: '#FFFFFF' }}>Hidden</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label htmlFor="imageUrl" style={{ color: '#8394A7' }}>Image URL</Label>
                                    <Input
                                        id="imageUrl"
                                        value={formData.imageUrl}
                                        onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                                        placeholder="https://example.com/image.jpg"
                                        required
                                        style={{ backgroundColor: '#0a1f35', borderColor: '#8394A7', color: '#FFFFFF' }}
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="description" style={{ color: '#8394A7' }}>Description (optional)</Label>
                                    <Input
                                        id="description"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Group description"
                                        style={{ backgroundColor: '#0a1f35', borderColor: '#8394A7', color: '#FFFFFF' }}
                                    />
                                </div>

                                <div className="flex gap-2 pt-4">
                                    <Button
                                        type="submit"
                                        className="flex-1"
                                        style={{ backgroundColor: '#00FF91', color: '#051323' }}
                                    >
                                        {editingGroup ? 'Update' : 'Create'} Group
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={handleCloseDialog}
                                        style={{ backgroundColor: '#02dbff', color: '#051323' }}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                    </div>
                </div>

                {/* Heat Map Section */}
                {stateStats.length > 0 && (
                    <Card className="mb-8" style={{ backgroundColor: '#051323', borderColor: 'rgba(0, 255, 145, 0.3)' }}>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Map className="h-5 w-5" style={{ color: '#00FF91' }} />
                                <CardTitle style={{ color: '#FFFFFF' }}>US Member Heat Map</CardTitle>
                            </div>
                            <CardDescription style={{ color: '#8394A7' }}>
                                Geographic distribution of community members across the United States
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <USHeatMap stateStats={stateStats} />
                        </CardContent>
                    </Card>
                )}

                {/* Stats Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <Card style={{ backgroundColor: '#051323', borderColor: 'rgba(0, 255, 145, 0.3)' }}>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm" style={{ color: '#8394A7' }}>Total Groups</p>
                                    <p className="text-3xl font-bold" style={{ color: '#00FF91' }}>{summary.totalGroups}</p>
                                </div>
                                <MapPin className="h-10 w-10" style={{ color: 'rgba(0, 255, 145, 0.3)' }} />
                            </div>
                        </CardContent>
                    </Card>
                    <Card style={{ backgroundColor: '#051323', borderColor: 'rgba(0, 255, 145, 0.3)' }}>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm" style={{ color: '#8394A7' }}>Total Members</p>
                                    <p className="text-3xl font-bold" style={{ color: '#00FF91' }}>{summary.totalMembers}</p>
                                </div>
                                <Users className="h-10 w-10" style={{ color: 'rgba(0, 255, 145, 0.3)' }} />
                            </div>
                        </CardContent>
                    </Card>
                    <Card style={{ backgroundColor: '#051323', borderColor: 'rgba(0, 255, 145, 0.3)' }}>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm" style={{ color: '#8394A7' }}>States Covered</p>
                                    <p className="text-3xl font-bold" style={{ color: '#00FF91' }}>{summary.statesWithMembers}</p>
                                </div>
                                <Map className="h-10 w-10" style={{ color: 'rgba(0, 255, 145, 0.3)' }} />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Table View */}
                {viewMode === 'table' && (
                    <Card style={{ backgroundColor: '#051323', borderColor: 'rgba(0, 255, 145, 0.3)' }}>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b" style={{ borderColor: 'rgba(0, 255, 145, 0.2)' }}>
                                            <th className="text-left p-4 text-sm font-medium" style={{ color: '#8394A7' }}>Group</th>
                                            <th className="text-left p-4 text-sm font-medium" style={{ color: '#8394A7' }}>Location</th>
                                            <th className="text-center p-4 text-sm font-medium" style={{ color: '#8394A7' }}>Members</th>
                                            <th className="text-center p-4 text-sm font-medium" style={{ color: '#8394A7' }}>Status</th>
                                            <th className="text-right p-4 text-sm font-medium" style={{ color: '#8394A7' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {groups.map((group) => (
                                            <tr 
                                                key={group.id}
                                                className="border-b hover:bg-white/5 transition-colors"
                                                style={{ borderColor: 'rgba(0, 255, 145, 0.1)' }}
                                            >
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <img
                                                            src={group.imageUrl}
                                                            alt={group.name}
                                                            className="w-10 h-10 rounded-lg object-cover"
                                                        />
                                                        <span className="font-medium text-white">
                                                            {group.name || `${group.city}, ${group.state}`}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-1" style={{ color: '#8394A7' }}>
                                                        <MapPin className="h-3 w-3" />
                                                        {group.city}, {group.state}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <Badge style={{ backgroundColor: 'rgba(0, 255, 145, 0.15)', color: '#00FF91' }}>
                                                        <Users className="h-3 w-3 mr-1" />
                                                        {group.memberCount || 0}
                                                    </Badge>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <Badge
                                                        style={{
                                                            backgroundColor: group.visibility === 'Public' ? 'rgba(0, 255, 145, 0.15)' : 'rgba(131, 148, 167, 0.15)',
                                                            color: group.visibility === 'Public' ? '#00FF91' : '#8394A7'
                                                        }}
                                                    >
                                                        {group.visibility}
                                                    </Badge>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleEdit(group)}
                                                            className="h-8 w-8 p-0"
                                                            style={{ color: '#02dbff' }}
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleDelete(group.id)}
                                                            className="h-8 w-8 p-0"
                                                            style={{ color: '#FF4444' }}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Grid View */}
                {viewMode === 'grid' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {groups.map((group) => (
                            <Card
                                key={group.id}
                                className="overflow-hidden"
                                style={{ backgroundColor: '#051323', borderColor: 'rgba(0, 255, 145, 0.3)' }}
                            >
                                <div className="relative h-32">
                                    <img
                                        src={group.imageUrl}
                                        alt={group.name || `${group.city}, ${group.state}`}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute top-2 right-2 flex gap-1">
                                        <Badge
                                            style={{
                                                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                                                color: '#00FF91'
                                            }}
                                        >
                                            <Users className="h-3 w-3 mr-1" />
                                            {group.memberCount || 0}
                                        </Badge>
                                        <Badge
                                            style={{
                                                backgroundColor: group.visibility === 'Public' ? '#00FF91' : '#8394A7',
                                                color: '#051323'
                                            }}
                                        >
                                            {group.visibility}
                                        </Badge>
                                    </div>
                                </div>
                                
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg" style={{ color: '#FFFFFF' }}>
                                        {group.name || `${group.city}, ${group.state}`}
                                    </CardTitle>
                                    <CardDescription className="flex items-center gap-1" style={{ color: '#8394A7' }}>
                                        <MapPin className="h-3 w-3" />
                                        {group.city}, {group.state}
                                    </CardDescription>
                                </CardHeader>
                                
                                <CardContent className="flex gap-2">
                                    <Button
                                        size="sm"
                                        onClick={() => handleEdit(group)}
                                        className="flex-1"
                                        style={{ backgroundColor: '#02dbff', color: '#051323' }}
                                    >
                                        <Edit2 className="h-3 w-3 mr-1" />
                                        Edit
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={() => handleDelete(group.id)}
                                        className="flex-1"
                                        style={{ backgroundColor: '#FF4444', color: '#FFFFFF' }}
                                    >
                                        <Trash2 className="h-3 w-3 mr-1" />
                                        Delete
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {groups.length === 0 && (
                    <div className="text-center py-12">
                        <MapPin className="h-16 w-16 mx-auto mb-4" style={{ color: '#8394A7' }} />
                        <h3 className="text-xl font-semibold mb-2" style={{ color: '#FFFFFF' }}>
                            No groups yet
                        </h3>
                        <p style={{ color: '#8394A7' }}>
                            Create your first group to get started
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
