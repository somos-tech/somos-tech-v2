import { useState, useEffect, useCallback } from 'react';
import { Shield, Plus, Trash2, Edit2, UserCheck, UserX, Users, MapPin, Clock, Camera, Loader2, Ban, CheckCircle, Globe, Monitor, AlertTriangle, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AdminNav } from '@/components/AdminNav';
import AdminBreadcrumbs from '@/components/AdminBreadcrumbs';
import { UserAvatar } from '@/components/DefaultAvatar';
import type { AdminUser } from '@/shared/types';
import type { UserProfile } from '@/types/user';
import { adminUsersService } from '@/api/adminUsersService';
import { listUsers, getUserStats, updateUserStatus } from '@/api/userService';
import { uploadProfilePhoto, validateFile, ALLOWED_EXTENSIONS } from '@/api/mediaService';
import { useAuth } from '@/hooks/useAuth';
import type { LoginHistoryEntry } from '@/types/user';

export default function AdminUsers() {
    const { user } = useAuth();
    const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [userStats, setUserStats] = useState({ total: 0, active: 0, blocked: 0 });
    const [loading, setLoading] = useState(true);
    const [loadingAllUsers, setLoadingAllUsers] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showStatusDialog, setShowStatusDialog] = useState(false);
    const [showLoginHistoryDialog, setShowLoginHistoryDialog] = useState(false);
    const [selectedUserForHistory, setSelectedUserForHistory] = useState<UserProfile | null>(null);
    const [selectedUserForStatus, setSelectedUserForStatus] = useState<UserProfile | null>(null);
    const [statusAction, setStatusAction] = useState<'block' | 'activate'>('block');
    const [statusReason, setStatusReason] = useState('');
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [formData, setFormData] = useState({
        email: '',
        name: '',
        roles: ['admin', 'authenticated'],
        status: 'active' as 'active' | 'inactive' | 'suspended',
        profilePhotoUrl: '' as string | undefined,
    });

    useEffect(() => {
        loadAdminUsers();
        loadAllUsers();
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

    const loadAllUsers = useCallback(async () => {
        try {
            setLoadingAllUsers(true);
            const [usersResult, stats] = await Promise.all([
                listUsers({ limit: 100, status: null, search: null, continuationToken: null }),
                getUserStats()
            ]);
            setAllUsers(usersResult.users);
            setUserStats(stats);
        } catch (err) {
            console.error('Error loading all users:', err);
        } finally {
            setLoadingAllUsers(false);
        }
    }, []);

    const handleAddUser = async () => {
        try {
            setError(null);
            await adminUsersService.createAdminUser(formData);
            setShowAddDialog(false);
            setFormData({ email: '', name: '', roles: ['admin', 'authenticated'], status: 'active', profilePhotoUrl: '' });
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
                profilePhotoUrl: formData.profilePhotoUrl,
            });
            setShowEditDialog(false);
            setSelectedUser(null);
            setPhotoPreview(null);
            setFormData({ email: '', name: '', roles: ['admin', 'authenticated'], status: 'active', profilePhotoUrl: '' });
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
            profilePhotoUrl: adminUser.profilePhotoUrl || '',
        });
        setPhotoPreview(null);
        setShowEditDialog(true);
    };

    // Handle profile photo upload for admin user
    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file
        const validation = validateFile(file, 'PROFILE_PHOTO');
        if (!validation.valid) {
            setError(validation.error || 'Invalid file');
            return;
        }

        // Create preview
        const reader = new FileReader();
        reader.onload = (event) => {
            setPhotoPreview(event.target?.result as string);
        };
        reader.readAsDataURL(file);

        // Upload file
        setUploadingPhoto(true);
        setError(null);
        try {
            const result = await uploadProfilePhoto(file);
            if (result.success && result.data?.url) {
                setFormData(prev => ({ ...prev, profilePhotoUrl: result.data.url }));
            } else {
                setError(result.error || 'Failed to upload photo');
                setPhotoPreview(null);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to upload photo');
            setPhotoPreview(null);
        } finally {
            setUploadingPhoto(false);
        }
    };

    const toggleRole = (role: string) => {
        setFormData(prev => ({
            ...prev,
            roles: prev.roles.includes(role)
                ? prev.roles.filter(r => r !== role)
                : [...prev.roles, role],
        }));
    };

    // Handle user status change (block/activate)
    const openStatusDialog = (userProfile: UserProfile, action: 'block' | 'activate') => {
        setSelectedUserForStatus(userProfile);
        setStatusAction(action);
        setStatusReason('');
        setShowStatusDialog(true);
    };

    const handleStatusChange = async () => {
        if (!selectedUserForStatus) return;

        try {
            setUpdatingStatus(true);
            setError(null);
            
            const newStatus = statusAction === 'block' ? 'blocked' : 'active';
            await updateUserStatus(selectedUserForStatus.id, { 
                status: newStatus as any, 
                reason: statusReason || undefined 
            });
            
            setShowStatusDialog(false);
            setSelectedUserForStatus(null);
            setStatusReason('');
            
            // Reload users
            await loadAllUsers();
        } catch (err) {
            setError(err instanceof Error ? err.message : `Failed to ${statusAction} user`);
            console.error('Error changing user status:', err);
        } finally {
            setUpdatingStatus(false);
        }
    };

    // Format location for display
    const formatLocation = (userProfile: UserProfile) => {
        if (userProfile.lastLoginLocation) {
            const { city, region, country } = userProfile.lastLoginLocation;
            const parts = [city, region, country].filter(Boolean);
            if (parts.length > 0) return parts.join(', ');
        }
        if (userProfile.lastLoginIp && userProfile.lastLoginIp !== 'unknown') {
            return `IP: ${userProfile.lastLoginIp}`;
        }
        return 'Unknown';
    };

    // Format location source badge
    const getLocationSourceBadge = (source?: string | null) => {
        if (source === 'entra') {
            return <Badge variant="outline" className="ml-2 text-xs bg-blue-500/10 text-blue-400 border-blue-500/30">Entra ID</Badge>;
        } else if (source === 'ip-api') {
            return <Badge variant="outline" className="ml-2 text-xs bg-gray-500/10 text-gray-400 border-gray-500/30">IP Lookup</Badge>;
        }
        return null;
    };

    // Open login history dialog
    const handleViewLoginHistory = (userProfile: UserProfile) => {
        setSelectedUserForHistory(userProfile);
        setShowLoginHistoryDialog(true);
    };

    // Filter users by search query
    const filteredUsers = allUsers.filter(u => 
        searchQuery === '' || 
        u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-green-500/20 text-green-400 border-green-500/50';
            case 'inactive':
                return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
            case 'suspended':
            case 'blocked':
                return 'bg-red-500/20 text-red-400 border-red-500/50';
            default:
                return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
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
                {/* Admin Navigation */}
                <AdminNav />
                
                {/* Breadcrumbs */}
                <AdminBreadcrumbs />
                
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
                                        <div className="flex items-center gap-4 flex-1">
                                            {/* Profile Photo */}
                                            <UserAvatar
                                                photoUrl={adminUser.profilePhotoUrl}
                                                name={adminUser.name}
                                                size="lg"
                                            />
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
                                    setFormData({ email: '', name: '', roles: ['admin', 'authenticated'], status: 'active', profilePhotoUrl: '' });
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
                    <DialogContent style={{ backgroundColor: '#0A1929', borderColor: '#1E3A5F' }} className="max-w-md">
                        <DialogHeader>
                            <DialogTitle style={{ color: '#FFFFFF' }}>Edit Admin User</DialogTitle>
                            <DialogDescription style={{ color: '#8394A7' }}>
                                Update profile photo, roles and status.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            {/* Profile Photo Upload */}
                            <div className="flex flex-col items-center gap-3">
                                <Label style={{ color: '#FFFFFF' }} className="self-start">Profile Photo</Label>
                                <div className="relative">
                                    <div
                                        className="w-24 h-24 rounded-full overflow-hidden border-2 cursor-pointer hover:opacity-80 transition-opacity"
                                        style={{ borderColor: '#00FF91' }}
                                        onClick={() => document.getElementById('admin-photo-input')?.click()}
                                    >
                                        {photoPreview || formData.profilePhotoUrl ? (
                                            <img
                                                src={photoPreview || formData.profilePhotoUrl}
                                                alt={formData.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <UserAvatar
                                                name={formData.name || formData.email}
                                                size="xl"
                                            />
                                        )}
                                    </div>
                                    {uploadingPhoto && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                                            <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#00FF91' }} />
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => document.getElementById('admin-photo-input')?.click()}
                                        className="absolute bottom-0 right-0 p-2 rounded-full"
                                        style={{ backgroundColor: '#00FF91' }}
                                        disabled={uploadingPhoto}
                                    >
                                        <Camera className="w-4 h-4" style={{ color: '#051323' }} />
                                    </button>
                                </div>
                                <input
                                    id="admin-photo-input"
                                    type="file"
                                    accept={ALLOWED_EXTENSIONS.join(',')}
                                    onChange={handlePhotoUpload}
                                    className="hidden"
                                />
                                <p className="text-xs" style={{ color: '#8394A7' }}>
                                    JPG, JPEG, PNG only • Max 5MB
                                </p>
                            </div>

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
                                    setPhotoPreview(null);
                                    setFormData({ email: '', name: '', roles: ['admin', 'authenticated'], status: 'active', profilePhotoUrl: '' });
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

                {/* All Users Section */}
                <div className="mt-12">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <Users className="h-8 w-8" style={{ color: '#00D4FF' }} />
                            <h2 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>
                                All Users
                            </h2>
                        </div>
                        <div className="w-64">
                            <Input
                                placeholder="Search users..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    backgroundColor: '#0F2744',
                                    borderColor: '#1E3A5F',
                                    color: '#FFFFFF',
                                }}
                            />
                        </div>
                    </div>

                    {/* User Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <Card style={{ backgroundColor: '#0A1929', borderColor: '#1E3A5F' }}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm" style={{ color: '#8394A7' }}>Total Users</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>
                                    {userStats.total}
                                </div>
                            </CardContent>
                        </Card>
                        <Card style={{ backgroundColor: '#0A1929', borderColor: '#1E3A5F' }}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm" style={{ color: '#8394A7' }}>Active</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold" style={{ color: '#00FF91' }}>
                                    {userStats.active}
                                </div>
                            </CardContent>
                        </Card>
                        <Card style={{ backgroundColor: '#0A1929', borderColor: '#1E3A5F' }}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm" style={{ color: '#8394A7' }}>Blocked</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold" style={{ color: '#FF4444' }}>
                                    {userStats.blocked}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Users Table */}
                    <Card style={{ backgroundColor: '#0A1929', borderColor: '#1E3A5F' }}>
                        <div className="p-6">
                            {loadingAllUsers ? (
                                <div className="text-center py-8">
                                    <p style={{ color: '#8394A7' }}>Loading users...</p>
                                </div>
                            ) : allUsers.length === 0 ? (
                                <div className="text-center py-12">
                                    <Users className="h-12 w-12 mx-auto mb-4" style={{ color: '#8394A7' }} />
                                    <p style={{ color: '#8394A7' }}>No users found.</p>
                                    <p className="text-sm mt-2" style={{ color: '#8394A7' }}>
                                        Users will appear here after they sign in.
                                    </p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow style={{ borderColor: '#1E3A5F' }}>
                                            <TableHead style={{ color: '#8394A7' }}>User</TableHead>
                                            <TableHead style={{ color: '#8394A7' }}>Email</TableHead>
                                            <TableHead style={{ color: '#8394A7' }}>Provider</TableHead>
                                            <TableHead style={{ color: '#8394A7' }}>Status</TableHead>
                                            <TableHead style={{ color: '#8394A7' }}>Last Login</TableHead>
                                            <TableHead style={{ color: '#8394A7' }}>Location</TableHead>
                                            <TableHead style={{ color: '#8394A7' }}>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredUsers.map((userProfile) => (
                                            <TableRow key={userProfile.id} style={{ borderColor: '#1E3A5F' }}>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        {userProfile.profilePicture ? (
                                                            <img
                                                                src={userProfile.profilePicture}
                                                                alt={userProfile.displayName}
                                                                className="w-8 h-8 rounded-full"
                                                            />
                                                        ) : (
                                                            <div
                                                                className="w-8 h-8 rounded-full flex items-center justify-center"
                                                                style={{ backgroundColor: '#1E3A5F' }}
                                                            >
                                                                <span style={{ color: '#00FF91' }}>
                                                                    {userProfile.displayName.charAt(0).toUpperCase()}
                                                                </span>
                                                            </div>
                                                        )}
                                                        <div>
                                                            <span style={{ color: '#FFFFFF' }}>
                                                                {userProfile.displayName}
                                                            </span>
                                                            {userProfile.metadata?.loginCount && userProfile.metadata.loginCount > 1 && (
                                                                <div className="text-xs" style={{ color: '#8394A7' }}>
                                                                    {userProfile.metadata.loginCount} logins
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell style={{ color: '#8394A7' }}>
                                                    {userProfile.email}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant="outline"
                                                        style={{
                                                            borderColor: '#00D4FF',
                                                            color: '#00D4FF',
                                                            backgroundColor: 'rgba(0, 212, 255, 0.1)',
                                                        }}
                                                    >
                                                        {userProfile.authProvider}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={getStatusColor(userProfile.status)}>
                                                        {userProfile.status === 'blocked' && <Ban className="h-3 w-3 mr-1" />}
                                                        {userProfile.status === 'active' && <CheckCircle className="h-3 w-3 mr-1" />}
                                                        {userProfile.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2" style={{ color: '#8394A7' }}>
                                                        <Clock className="h-4 w-4" />
                                                        <span className="text-sm">
                                                            {new Date(userProfile.lastLoginAt).toLocaleDateString()} {new Date(userProfile.lastLoginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2" style={{ color: '#8394A7' }}>
                                                        <Globe className="h-4 w-4" style={{ color: userProfile.lastLoginLocation ? '#00FF91' : '#8394A7' }} />
                                                        <div>
                                                            <span className="text-sm">
                                                                {formatLocation(userProfile)}
                                                            </span>
                                                            {userProfile.lastLoginIp && userProfile.lastLoginIp !== 'unknown' && userProfile.lastLoginLocation && (
                                                                <div className="text-xs" style={{ color: '#5a6f82' }}>
                                                                    {userProfile.lastLoginIp}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleViewLoginHistory(userProfile)}
                                                            className="text-xs"
                                                            style={{ borderColor: '#00D4FF', color: '#00D4FF' }}
                                                            title="View login history"
                                                        >
                                                            <History className="h-3 w-3" />
                                                        </Button>
                                                        {userProfile.status === 'active' ? (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => openStatusDialog(userProfile, 'block')}
                                                                className="text-xs"
                                                                style={{ borderColor: '#FF4444', color: '#FF4444' }}
                                                            >
                                                                <Ban className="h-3 w-3 mr-1" />
                                                                Disable
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => openStatusDialog(userProfile, 'activate')}
                                                                className="text-xs"
                                                                style={{ borderColor: '#00FF91', color: '#00FF91' }}
                                                            >
                                                                <CheckCircle className="h-3 w-3 mr-1" />
                                                                Enable
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                    </Card>
                </div>

                {/* User Status Change Dialog */}
                <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
                    <DialogContent style={{ backgroundColor: '#0A1929', borderColor: '#1E3A5F' }} className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2" style={{ color: statusAction === 'block' ? '#FF4444' : '#00FF91' }}>
                                {statusAction === 'block' ? (
                                    <>
                                        <AlertTriangle className="h-5 w-5" />
                                        Disable User Account
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="h-5 w-5" />
                                        Enable User Account
                                    </>
                                )}
                            </DialogTitle>
                            <DialogDescription style={{ color: '#8394A7' }}>
                                {statusAction === 'block' 
                                    ? 'This will prevent the user from accessing the platform. They will see a blocked message when trying to sign in.'
                                    : 'This will restore the user\'s access to the platform.'}
                            </DialogDescription>
                        </DialogHeader>
                        
                        {selectedUserForStatus && (
                            <div className="py-4">
                                <div className="flex items-center gap-4 p-4 rounded-lg" style={{ backgroundColor: '#0F2744' }}>
                                    {selectedUserForStatus.profilePicture ? (
                                        <img
                                            src={selectedUserForStatus.profilePicture}
                                            alt={selectedUserForStatus.displayName}
                                            className="w-12 h-12 rounded-full"
                                        />
                                    ) : (
                                        <div
                                            className="w-12 h-12 rounded-full flex items-center justify-center"
                                            style={{ backgroundColor: '#1E3A5F' }}
                                        >
                                            <span className="text-lg" style={{ color: '#00FF91' }}>
                                                {selectedUserForStatus.displayName.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                    )}
                                    <div>
                                        <div className="font-medium" style={{ color: '#FFFFFF' }}>
                                            {selectedUserForStatus.displayName}
                                        </div>
                                        <div className="text-sm" style={{ color: '#8394A7' }}>
                                            {selectedUserForStatus.email}
                                        </div>
                                        {selectedUserForStatus.lastLoginLocation && (
                                            <div className="text-xs flex items-center gap-1 mt-1" style={{ color: '#5a6f82' }}>
                                                <Globe className="h-3 w-3" />
                                                {formatLocation(selectedUserForStatus)}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <Label htmlFor="reason" style={{ color: '#FFFFFF' }}>
                                        Reason {statusAction === 'block' ? '(recommended)' : '(optional)'}
                                    </Label>
                                    <Input
                                        id="reason"
                                        placeholder={statusAction === 'block' ? 'e.g., Violated terms of service' : 'e.g., Account review complete'}
                                        value={statusReason}
                                        onChange={(e) => setStatusReason(e.target.value)}
                                        className="mt-2"
                                        style={{
                                            backgroundColor: '#0F2744',
                                            borderColor: '#1E3A5F',
                                            color: '#FFFFFF',
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowStatusDialog(false);
                                    setSelectedUserForStatus(null);
                                    setStatusReason('');
                                }}
                                disabled={updatingStatus}
                                style={{ borderColor: '#1E3A5F', color: '#FFFFFF' }}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleStatusChange}
                                disabled={updatingStatus}
                                style={{
                                    backgroundColor: statusAction === 'block' ? '#FF4444' : '#00FF91',
                                    color: statusAction === 'block' ? '#FFFFFF' : '#051323',
                                }}
                            >
                                {updatingStatus ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : statusAction === 'block' ? (
                                    <Ban className="h-4 w-4 mr-2" />
                                ) : (
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                )}
                                {statusAction === 'block' ? 'Disable Account' : 'Enable Account'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Login History Dialog */}
                <Dialog open={showLoginHistoryDialog} onOpenChange={setShowLoginHistoryDialog}>
                    <DialogContent style={{ backgroundColor: '#0A1929', borderColor: '#1E3A5F' }} className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2" style={{ color: '#00D4FF' }}>
                                <History className="h-5 w-5" />
                                Login History
                            </DialogTitle>
                            <DialogDescription style={{ color: '#8394A7' }}>
                                {selectedUserForHistory && (
                                    <span>
                                        Showing recent login activity for <strong style={{ color: '#FFFFFF' }}>{selectedUserForHistory.displayName}</strong> ({selectedUserForHistory.email})
                                    </span>
                                )}
                            </DialogDescription>
                        </DialogHeader>

                        {selectedUserForHistory && (
                            <div className="space-y-4">
                                {/* Current Session Info */}
                                <div className="p-4 rounded-lg" style={{ backgroundColor: '#051323', border: '1px solid #1E3A5F' }}>
                                    <h4 className="text-sm font-medium mb-3" style={{ color: '#00FF91' }}>Latest Login</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <span className="text-xs" style={{ color: '#8394A7' }}>Time</span>
                                            <p className="text-sm" style={{ color: '#FFFFFF' }}>
                                                {new Date(selectedUserForHistory.lastLoginAt).toLocaleString()}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-xs" style={{ color: '#8394A7' }}>IP Address</span>
                                            <p className="text-sm" style={{ color: '#FFFFFF' }}>
                                                {selectedUserForHistory.lastLoginIp || 'Unknown'}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-xs" style={{ color: '#8394A7' }}>Location</span>
                                            <p className="text-sm flex items-center" style={{ color: '#FFFFFF' }}>
                                                {formatLocation(selectedUserForHistory)}
                                                {getLocationSourceBadge(selectedUserForHistory.lastLoginLocationSource)}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-xs" style={{ color: '#8394A7' }}>Total Logins</span>
                                            <p className="text-sm" style={{ color: '#FFFFFF' }}>
                                                {selectedUserForHistory.metadata?.loginCount || 1}
                                            </p>
                                        </div>
                                    </div>
                                    {selectedUserForHistory.lastLoginUserAgent && (
                                        <div className="mt-3">
                                            <span className="text-xs" style={{ color: '#8394A7' }}>Device / Browser</span>
                                            <p className="text-xs mt-1" style={{ color: '#5a6f82' }}>
                                                {selectedUserForHistory.lastLoginUserAgent}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Login History Table */}
                                {selectedUserForHistory.loginHistory && selectedUserForHistory.loginHistory.length > 0 ? (
                                    <div>
                                        <h4 className="text-sm font-medium mb-3" style={{ color: '#FFFFFF' }}>Login History (Last 10)</h4>
                                        <Table>
                                            <TableHeader>
                                                <TableRow style={{ borderColor: '#1E3A5F' }}>
                                                    <TableHead style={{ color: '#8394A7' }}>Time</TableHead>
                                                    <TableHead style={{ color: '#8394A7' }}>IP Address</TableHead>
                                                    <TableHead style={{ color: '#8394A7' }}>Location</TableHead>
                                                    <TableHead style={{ color: '#8394A7' }}>Source</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {selectedUserForHistory.loginHistory.map((entry, index) => (
                                                    <TableRow key={index} style={{ borderColor: '#1E3A5F' }}>
                                                        <TableCell style={{ color: '#FFFFFF' }}>
                                                            {new Date(entry.timestamp).toLocaleString()}
                                                        </TableCell>
                                                        <TableCell style={{ color: '#8394A7' }}>
                                                            {entry.ip || 'Unknown'}
                                                        </TableCell>
                                                        <TableCell style={{ color: '#8394A7' }}>
                                                            {entry.location ? (
                                                                [entry.location.city, entry.location.region, entry.location.country].filter(Boolean).join(', ') || 'Unknown'
                                                            ) : 'Unknown'}
                                                        </TableCell>
                                                        <TableCell>
                                                            {getLocationSourceBadge(entry.locationSource)}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ) : (
                                    <div className="text-center py-6" style={{ color: '#8394A7' }}>
                                        <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                        <p>No detailed login history available yet.</p>
                                        <p className="text-xs mt-1">History will be recorded for future logins.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowLoginHistoryDialog(false);
                                    setSelectedUserForHistory(null);
                                }}
                                style={{ borderColor: '#1E3A5F', color: '#FFFFFF' }}
                            >
                                Close
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
