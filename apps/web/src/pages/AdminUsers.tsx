import { useState, useEffect } from 'react';
import { Shield, Plus, Trash2, Edit2, UserCheck, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import type { AdminUser } from '@/shared/types';
import { adminUsersService } from '@/api/adminUsersService';
import { useAuth } from '@/hooks/useAuth';

export default function AdminUsers() {
    const { user } = useAuth();
    const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
    const [formData, setFormData] = useState({
        email: '',
        name: '',
        roles: ['admin', 'authenticated'],
        status: 'active' as 'active' | 'inactive' | 'suspended',
    });

    useEffect(() => {
        loadAdminUsers();
    }, []);

    const loadAdminUsers = async () => {
        try {
            setLoading(true);
            setError(null);
            const users = await adminUsersService.listAdminUsers();
            setAdminUsers(users);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load admin users');
            console.error('Error loading admin users:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddUser = async () => {
        try {
            setError(null);
            await adminUsersService.createAdminUser(formData);
            setShowAddDialog(false);
            setFormData({ email: '', name: '', roles: ['admin', 'authenticated'], status: 'active' });
            await loadAdminUsers();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create admin user');
            console.error('Error creating admin user:', err);
        }
    };

    const handleUpdateUser = async () => {
        if (!selectedUser) return;

        try {
            setError(null);
            await adminUsersService.updateAdminUser({
                email: selectedUser.email,
                name: formData.name,
                roles: formData.roles,
                status: formData.status,
            });
            setShowEditDialog(false);
            setSelectedUser(null);
            setFormData({ email: '', name: '', roles: ['admin', 'authenticated'], status: 'active' });
            await loadAdminUsers();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update admin user');
            console.error('Error updating admin user:', err);
        }
    };

    const handleDeleteUser = async (email: string) => {
        if (!confirm(`Are you sure you want to remove admin access for ${email}?`)) {
            return;
        }

        try {
            setError(null);
            await adminUsersService.deleteAdminUser(email);
            await loadAdminUsers();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete admin user');
            console.error('Error deleting admin user:', err);
        }
    };

    const openEditDialog = (adminUser: AdminUser) => {
        setSelectedUser(adminUser);
        setFormData({
            email: adminUser.email,
            name: adminUser.name,
            roles: adminUser.roles,
            status: adminUser.status,
        });
        setShowEditDialog(true);
    };

    const toggleRole = (role: string) => {
        setFormData(prev => ({
            ...prev,
            roles: prev.roles.includes(role)
                ? prev.roles.filter(r => r !== role)
                : [...prev.roles, role],
        }));
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-green-500/20 text-green-400 border-green-500/50';
            case 'inactive':
                return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
            case 'suspended':
                return 'bg-red-500/20 text-red-400 border-red-500/50';
            default:
                return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen p-8" style={{ backgroundColor: '#051323' }}>
                <div className="text-center">
                    <p style={{ color: '#8394A7' }}>Loading admin users...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-8" style={{ backgroundColor: '#051323' }}>
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <Shield className="h-8 w-8" style={{ color: '#00FF91' }} />
                        <h1 className="text-3xl font-bold" style={{ color: '#FFFFFF' }}>
                            Admin Users
                        </h1>
                    </div>
                    <Button
                        onClick={() => setShowAddDialog(true)}
                        className="gap-2"
                        style={{
                            backgroundColor: '#00FF91',
                            color: '#051323',
                        }}
                    >
                        <Plus className="h-4 w-4" />
                        Add Admin User
                    </Button>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: '#FF4444', color: '#FFFFFF' }}>
                        {error}
                    </div>
                )}

                {/* Admin Users List */}
                <Card style={{ backgroundColor: '#0A1929', borderColor: '#1E3A5F' }}>
                    <div className="p-6">
                        {adminUsers.length === 0 ? (
                            <div className="text-center py-12">
                                <Shield className="h-12 w-12 mx-auto mb-4" style={{ color: '#8394A7' }} />
                                <p style={{ color: '#8394A7' }}>No admin users found.</p>
                                <p className="text-sm mt-2" style={{ color: '#8394A7' }}>
                                    Click "Add Admin User" to grant admin access to a user.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {adminUsers.map((adminUser) => (
                                    <div
                                        key={adminUser.id}
                                        className="flex items-center justify-between p-4 rounded-lg border"
                                        style={{ backgroundColor: '#0F2744', borderColor: '#1E3A5F' }}
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-lg font-semibold" style={{ color: '#FFFFFF' }}>
                                                    {adminUser.name}
                                                </h3>
                                                <Badge className={getStatusColor(adminUser.status)}>
                                                    {adminUser.status === 'active' ? (
                                                        <UserCheck className="h-3 w-3 mr-1" />
                                                    ) : (
                                                        <UserX className="h-3 w-3 mr-1" />
                                                    )}
                                                    {adminUser.status}
                                                </Badge>
                                            </div>
                                            <p className="text-sm mb-2" style={{ color: '#8394A7' }}>
                                                {adminUser.email}
                                            </p>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs" style={{ color: '#8394A7' }}>
                                                    Roles:
                                                </span>
                                                {adminUser.roles.map((role) => (
                                                    <Badge
                                                        key={role}
                                                        variant="outline"
                                                        className="text-xs"
                                                        style={{
                                                            borderColor: '#00FF91',
                                                            color: '#00FF91',
                                                            backgroundColor: 'rgba(0, 255, 145, 0.1)',
                                                        }}
                                                    >
                                                        {role}
                                                    </Badge>
                                                ))}
                                            </div>
                                            <div className="mt-2 text-xs" style={{ color: '#8394A7' }}>
                                                Created: {new Date(adminUser.createdAt).toLocaleDateString()}
                                                {adminUser.lastLogin && (
                                                    <> • Last login: {new Date(adminUser.lastLogin).toLocaleDateString()}</>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => openEditDialog(adminUser)}
                                                style={{ borderColor: '#1E3A5F', color: '#00FF91' }}
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleDeleteUser(adminUser.email)}
                                                disabled={adminUser.email === user?.userDetails}
                                                style={{
                                                    borderColor: '#1E3A5F',
                                                    color: '#FF4444',
                                                    opacity: adminUser.email === user?.userDetails ? 0.5 : 1,
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Card>

                {/* Add Admin User Dialog */}
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                    <DialogContent style={{ backgroundColor: '#0A1929', borderColor: '#1E3A5F' }}>
                        <DialogHeader>
                            <DialogTitle style={{ color: '#FFFFFF' }}>Add Admin User</DialogTitle>
                            <DialogDescription style={{ color: '#8394A7' }}>
                                Grant admin access to a user by adding their email address.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="email" style={{ color: '#FFFFFF' }}>
                                    Email *
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="user@somos.tech"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    style={{
                                        backgroundColor: '#0F2744',
                                        borderColor: '#1E3A5F',
                                        color: '#FFFFFF',
                                    }}
                                />
                            </div>
                            <div>
                                <Label htmlFor="name" style={{ color: '#FFFFFF' }}>
                                    Name
                                </Label>
                                <Input
                                    id="name"
                                    type="text"
                                    placeholder="Full Name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    style={{
                                        backgroundColor: '#0F2744',
                                        borderColor: '#1E3A5F',
                                        color: '#FFFFFF',
                                    }}
                                />
                            </div>
                            <div>
                                <Label style={{ color: '#FFFFFF' }}>Roles</Label>
                                <div className="flex gap-2 flex-wrap mt-2">
                                    {['admin', 'authenticated', 'moderator', 'editor'].map((role) => (
                                        <Badge
                                            key={role}
                                            variant={formData.roles.includes(role) ? 'default' : 'outline'}
                                            className="cursor-pointer"
                                            onClick={() => toggleRole(role)}
                                            style={{
                                                backgroundColor: formData.roles.includes(role)
                                                    ? '#00FF91'
                                                    : 'transparent',
                                                borderColor: '#00FF91',
                                                color: formData.roles.includes(role) ? '#051323' : '#00FF91',
                                            }}
                                        >
                                            {role}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowAddDialog(false);
                                    setFormData({ email: '', name: '', roles: ['admin', 'authenticated'], status: 'active' });
                                }}
                                style={{ borderColor: '#1E3A5F', color: '#FFFFFF' }}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleAddUser}
                                disabled={!formData.email}
                                style={{
                                    backgroundColor: '#00FF91',
                                    color: '#051323',
                                }}
                            >
                                Add User
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Edit Admin User Dialog */}
                <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                    <DialogContent style={{ backgroundColor: '#0A1929', borderColor: '#1E3A5F' }}>
                        <DialogHeader>
                            <DialogTitle style={{ color: '#FFFFFF' }}>Edit Admin User</DialogTitle>
                            <DialogDescription style={{ color: '#8394A7' }}>
                                Update user roles and status.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label style={{ color: '#FFFFFF' }}>Email</Label>
                                <Input
                                    type="email"
                                    value={formData.email}
                                    disabled
                                    style={{
                                        backgroundColor: '#0F2744',
                                        borderColor: '#1E3A5F',
                                        color: '#8394A7',
                                    }}
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit-name" style={{ color: '#FFFFFF' }}>
                                    Name
                                </Label>
                                <Input
                                    id="edit-name"
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    style={{
                                        backgroundColor: '#0F2744',
                                        borderColor: '#1E3A5F',
                                        color: '#FFFFFF',
                                    }}
                                />
                            </div>
                            <div>
                                <Label style={{ color: '#FFFFFF' }}>Roles</Label>
                                <div className="flex gap-2 flex-wrap mt-2">
                                    {['admin', 'authenticated', 'moderator', 'editor'].map((role) => (
                                        <Badge
                                            key={role}
                                            variant={formData.roles.includes(role) ? 'default' : 'outline'}
                                            className="cursor-pointer"
                                            onClick={() => toggleRole(role)}
                                            style={{
                                                backgroundColor: formData.roles.includes(role)
                                                    ? '#00FF91'
                                                    : 'transparent',
                                                borderColor: '#00FF91',
                                                color: formData.roles.includes(role) ? '#051323' : '#00FF91',
                                            }}
                                        >
                                            {role}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <Label style={{ color: '#FFFFFF' }}>Status</Label>
                                <div className="flex gap-2 mt-2">
                                    {(['active', 'inactive', 'suspended'] as const).map((status) => (
                                        <Badge
                                            key={status}
                                            variant={formData.status === status ? 'default' : 'outline'}
                                            className="cursor-pointer"
                                            onClick={() => setFormData({ ...formData, status })}
                                            style={{
                                                backgroundColor: formData.status === status ? '#00FF91' : 'transparent',
                                                borderColor: '#00FF91',
                                                color: formData.status === status ? '#051323' : '#00FF91',
                                            }}
                                        >
                                            {status}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowEditDialog(false);
                                    setSelectedUser(null);
                                    setFormData({ email: '', name: '', roles: ['admin', 'authenticated'], status: 'active' });
                                }}
                                style={{ borderColor: '#1E3A5F', color: '#FFFFFF' }}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleUpdateUser}
                                style={{
                                    backgroundColor: '#00FF91',
                                    color: '#051323',
                                }}
                            >
                                Update User
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
