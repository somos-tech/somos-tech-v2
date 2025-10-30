import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2, MapPin, Eye } from 'lucide-react';

interface Group {
    id: string;
    name: string;
    city: string;
    state: string;
    visibility: 'Public' | 'Hidden';
    imageUrl: string;
    description?: string;
    createdAt: string;
}

export default function AdminGroups() {
    const [groups, setGroups] = useState<Group[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<Group | null>(null);

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
            const response = await fetch('/api/groups');
            if (response.ok) {
                const data = await response.json();
                setGroups(data);
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
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-4xl font-bold mb-2" style={{ color: '#FFFFFF' }}>
                            Groups Management
                        </h1>
                        <p style={{ color: '#8394A7' }}>
                            Manage city chapters and event groups
                        </p>
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
                                        style={{ backgroundColor: '#8394A7', color: '#051323' }}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Groups Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {groups.map((group) => (
                        <Card
                            key={group.id}
                            className="overflow-hidden"
                            style={{ backgroundColor: '#051323', borderColor: '#00FF91' }}
                        >
                            <div className="relative h-32">
                                <img
                                    src={group.imageUrl}
                                    alt={group.name || `${group.city}, ${group.state}`}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute top-2 right-2">
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
                                    style={{ backgroundColor: '#00D4FF', color: '#051323' }}
                                >
                                    <Edit2 className="h-3 w-3" />
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => handleDelete(group.id)}
                                    className="flex-1"
                                    style={{ backgroundColor: '#FF4444', color: '#FFFFFF' }}
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                                <Button
                                    size="sm"
                                    className="flex-1"
                                    style={{ backgroundColor: '#8394A7', color: '#051323' }}
                                >
                                    <Eye className="h-3 w-3" />
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>

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
