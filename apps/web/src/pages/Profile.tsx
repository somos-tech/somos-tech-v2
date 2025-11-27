import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
    User, Mail, Shield, LogOut, MapPin, Globe, FileText,
    Edit2, Save, X, Loader2, Check
} from 'lucide-react';
import ProfilePhotoUpload from '@/components/ProfilePhotoUpload';

interface UserProfile {
    id: string;
    email: string;
    displayName: string;
    profilePicture: string | null;
    bio: string | null;
    location: string | null;
    website: string | null;
    status: string;
    createdAt: string;
    lastLoginAt: string;
}

export default function Profile() {
    const { user, isAuthenticated, isAdmin, isLoading: authLoading } = useAuth();
    const navigate = useNavigate();
    
    // Profile state
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    
    // Edit mode state
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        displayName: '',
        bio: '',
        location: '',
        website: ''
    });

    // Fetch user profile from Cosmos DB
    useEffect(() => {
        async function fetchProfile() {
            if (!isAuthenticated) return;
            
            try {
                setIsLoading(true);
                setError(null);
                
                // First, sync/create user profile
                try {
                    const syncResponse = await fetch('/api/users/sync', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                    });
                    
                    if (!syncResponse.ok) {
                        console.warn('User sync failed, status:', syncResponse.status);
                    }
                } catch (syncErr) {
                    console.warn('User sync error:', syncErr);
                }
                
                // Then get full profile
                const response = await fetch('/api/users/me');
                
                if (response.ok) {
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        const data = await response.json();
                        setProfile(data);
                        setEditForm({
                            displayName: data.displayName || '',
                            bio: data.bio || '',
                            location: data.location || '',
                            website: data.website || ''
                        });
                    } else {
                        // Non-JSON response, use defaults
                        console.warn('Profile API returned non-JSON response');
                        setProfile(null);
                    }
                } else if (response.status === 404) {
                    // Profile doesn't exist yet, use auth data
                    setProfile(null);
                    setEditForm({
                        displayName: user?.userDetails?.split('@')[0] || '',
                        bio: '',
                        location: '',
                        website: ''
                    });
                } else {
                    console.warn('Profile fetch failed with status:', response.status);
                    // Don't throw error, just use defaults
                    setProfile(null);
                }
            } catch (err) {
                console.error('Error fetching profile:', err);
                // Don't show error to user for profile fetch, just use defaults
                setProfile(null);
            } finally {
                setIsLoading(false);
            }
        }
        
        if (isAuthenticated && !authLoading) {
            fetchProfile();
        }
    }, [isAuthenticated, authLoading, user]);

    const handleSaveProfile = async () => {
        try {
            setIsSaving(true);
            setError(null);
            
            const response = await fetch('/api/users/me', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    displayName: editForm.displayName.trim() || undefined,
                    bio: editForm.bio.trim() || null,
                    location: editForm.location.trim() || null,
                    website: editForm.website.trim() || null
                })
            });
            
            if (response.ok) {
                const updatedProfile = await response.json();
                setProfile(updatedProfile);
                setIsEditing(false);
                setSuccessMessage('Profile updated successfully!');
                setTimeout(() => setSuccessMessage(null), 3000);
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update profile');
            }
        } catch (err) {
            console.error('Error saving profile:', err);
            setError(err instanceof Error ? err.message : 'Failed to save profile');
        } finally {
            setIsSaving(false);
        }
    };

    const handlePhotoUploadSuccess = async (url: string) => {
        try {
            // Update profile with new photo URL
            const response = await fetch('/api/users/me', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profilePicture: url })
            });
            
            if (response.ok) {
                const updatedProfile = await response.json();
                setProfile(updatedProfile);
                setSuccessMessage('Profile photo updated!');
                setTimeout(() => setSuccessMessage(null), 3000);
            }
        } catch (err) {
            console.error('Error updating profile photo:', err);
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditForm({
            displayName: profile?.displayName || '',
            bio: profile?.bio || '',
            location: profile?.location || '',
            website: profile?.website || ''
        });
    };

    const handleLogout = () => {
        window.location.href = '/.auth/logout';
    };

    if (authLoading || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#051323' }}>
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#00FF91' }} />
            </div>
        );
    }

    if (!isAuthenticated) {
        navigate('/login');
        return null;
    }

    // Get display info
    const userEmail = user?.userDetails || profile?.email || 'Not available';
    const provider = user?.identityProvider || 'Unknown';
    const userId = user?.userId || profile?.id || 'Unknown';
    const displayName = profile?.displayName || userEmail.split('@')[0];

    return (
        <div className="min-h-screen py-12" style={{ backgroundColor: '#051323' }}>
            <div className="max-w-4xl mx-auto px-4">
                {/* Success Message */}
                {successMessage && (
                    <div 
                        className="mb-6 p-4 rounded-xl flex items-center gap-3"
                        style={{ backgroundColor: 'rgba(0, 255, 145, 0.1)', border: '1px solid rgba(0, 255, 145, 0.3)' }}
                    >
                        <Check className="w-5 h-5" style={{ color: '#00FF91' }} />
                        <span style={{ color: '#00FF91' }}>{successMessage}</span>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div 
                        className="mb-6 p-4 rounded-xl flex items-center gap-3"
                        style={{ backgroundColor: 'rgba(255, 99, 99, 0.1)', border: '1px solid rgba(255, 99, 99, 0.3)' }}
                    >
                        <X className="w-5 h-5" style={{ color: '#FF6363' }} />
                        <span style={{ color: '#FF6363' }}>{error}</span>
                    </div>
                )}

                {/* Header with Profile Photo */}
                <div className="text-center mb-8">
                    <ProfilePhotoUpload
                        currentPhotoUrl={profile?.profilePicture || undefined}
                        userName={displayName}
                        onUploadSuccess={handlePhotoUploadSuccess}
                        onUploadError={(err) => setError(err)}
                        size="lg"
                    />
                    
                    <h1 className="text-3xl font-bold mb-2 mt-4" style={{ color: '#FFFFFF' }}>
                        {displayName}
                    </h1>
                    <p style={{ color: '#8394A7' }}>
                        {profile?.bio || 'Click the photo above to add a profile picture'}
                    </p>
                </div>

                {/* Profile Information */}
                <div className="space-y-6">
                    {/* Profile Details Card - Editable */}
                    <Card className="p-6 rounded-xl" style={{ backgroundColor: '#0a1f35', border: '1px solid rgba(0, 255, 145, 0.2)' }}>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-semibold" style={{ color: '#FFFFFF' }}>
                                Profile Details
                            </h2>
                            {!isEditing ? (
                                <Button
                                    onClick={() => setIsEditing(true)}
                                    className="rounded-full"
                                    style={{ backgroundColor: 'rgba(0, 255, 145, 0.2)', color: '#00FF91' }}
                                >
                                    <Edit2 className="w-4 h-4 mr-2" />
                                    Edit Profile
                                </Button>
                            ) : (
                                <div className="flex gap-2">
                                    <Button
                                        onClick={handleCancelEdit}
                                        className="rounded-full"
                                        style={{ backgroundColor: 'rgba(131, 148, 167, 0.2)', color: '#8394A7' }}
                                    >
                                        <X className="w-4 h-4 mr-2" />
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleSaveProfile}
                                        disabled={isSaving}
                                        className="rounded-full"
                                        style={{ backgroundColor: '#00FF91', color: '#051323' }}
                                    >
                                        {isSaving ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                            <Save className="w-4 h-4 mr-2" />
                                        )}
                                        Save Changes
                                    </Button>
                                </div>
                            )}
                        </div>
                        
                        <div className="space-y-4">
                            {/* Display Name */}
                            <div className="flex items-start gap-3">
                                <User className="w-5 h-5 mt-2" style={{ color: '#00FF91' }} />
                                <div className="flex-1">
                                    <div className="text-sm mb-1" style={{ color: '#8394A7' }}>Display Name</div>
                                    {isEditing ? (
                                        <Input
                                            value={editForm.displayName}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, displayName: e.target.value }))}
                                            placeholder="Enter your display name"
                                            className="rounded-lg"
                                            style={{ 
                                                backgroundColor: 'rgba(255, 255, 255, 0.05)', 
                                                border: '1px solid rgba(0, 255, 145, 0.3)',
                                                color: '#FFFFFF'
                                            }}
                                        />
                                    ) : (
                                        <div style={{ color: '#FFFFFF' }}>{displayName}</div>
                                    )}
                                </div>
                            </div>

                            {/* Bio */}
                            <div className="flex items-start gap-3">
                                <FileText className="w-5 h-5 mt-2" style={{ color: '#00FF91' }} />
                                <div className="flex-1">
                                    <div className="text-sm mb-1" style={{ color: '#8394A7' }}>Bio</div>
                                    {isEditing ? (
                                        <textarea
                                            value={editForm.bio}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                                            placeholder="Tell us about yourself..."
                                            rows={3}
                                            maxLength={500}
                                            className="w-full rounded-lg p-3 resize-none"
                                            style={{ 
                                                backgroundColor: 'rgba(255, 255, 255, 0.05)', 
                                                border: '1px solid rgba(0, 255, 145, 0.3)',
                                                color: '#FFFFFF'
                                            }}
                                        />
                                    ) : (
                                        <div style={{ color: profile?.bio ? '#FFFFFF' : '#8394A7' }}>
                                            {profile?.bio || 'No bio added yet'}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Location */}
                            <div className="flex items-start gap-3">
                                <MapPin className="w-5 h-5 mt-2" style={{ color: '#00FF91' }} />
                                <div className="flex-1">
                                    <div className="text-sm mb-1" style={{ color: '#8394A7' }}>Location</div>
                                    {isEditing ? (
                                        <Input
                                            value={editForm.location}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                                            placeholder="City, State or Country"
                                            className="rounded-lg"
                                            style={{ 
                                                backgroundColor: 'rgba(255, 255, 255, 0.05)', 
                                                border: '1px solid rgba(0, 255, 145, 0.3)',
                                                color: '#FFFFFF'
                                            }}
                                        />
                                    ) : (
                                        <div style={{ color: profile?.location ? '#FFFFFF' : '#8394A7' }}>
                                            {profile?.location || 'No location added'}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Website */}
                            <div className="flex items-start gap-3">
                                <Globe className="w-5 h-5 mt-2" style={{ color: '#00FF91' }} />
                                <div className="flex-1">
                                    <div className="text-sm mb-1" style={{ color: '#8394A7' }}>Website</div>
                                    {isEditing ? (
                                        <Input
                                            value={editForm.website}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, website: e.target.value }))}
                                            placeholder="https://yourwebsite.com"
                                            className="rounded-lg"
                                            style={{ 
                                                backgroundColor: 'rgba(255, 255, 255, 0.05)', 
                                                border: '1px solid rgba(0, 255, 145, 0.3)',
                                                color: '#FFFFFF'
                                            }}
                                        />
                                    ) : (
                                        <div style={{ color: profile?.website ? '#FFFFFF' : '#8394A7' }}>
                                            {profile?.website ? (
                                                <a 
                                                    href={profile.website} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="hover:underline"
                                                    style={{ color: '#00FF91' }}
                                                >
                                                    {profile.website}
                                                </a>
                                            ) : (
                                                'No website added'
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Account Details Card */}
                    <Card className="p-6 rounded-xl" style={{ backgroundColor: '#0a1f35', border: '1px solid rgba(0, 255, 145, 0.2)' }}>
                        <h2 className="text-xl font-semibold mb-4" style={{ color: '#FFFFFF' }}>
                            Account Details
                        </h2>
                        
                        <div className="space-y-4">
                            {/* Email */}
                            <div className="flex items-start gap-3">
                                <Mail className="w-5 h-5 mt-0.5" style={{ color: '#00FF91' }} />
                                <div className="flex-1">
                                    <div className="text-sm" style={{ color: '#8394A7' }}>Email</div>
                                    <div style={{ color: '#FFFFFF' }}>{userEmail}</div>
                                </div>
                            </div>

                            {/* Identity Provider */}
                            <div className="flex items-start gap-3">
                                <Shield className="w-5 h-5 mt-0.5" style={{ color: '#00FF91' }} />
                                <div className="flex-1">
                                    <div className="text-sm" style={{ color: '#8394A7' }}>Identity Provider</div>
                                    <div style={{ color: '#FFFFFF' }}>
                                        {provider === 'aad' ? 'Microsoft (somos.tech)' : 
                                         provider === 'externalId' ? 'Microsoft External ID' : 
                                         provider}
                                    </div>
                                </div>
                            </div>

                            {/* Account Type */}
                            <div className="flex items-start gap-3">
                                <Shield className="w-5 h-5 mt-0.5" style={{ color: '#00FF91' }} />
                                <div className="flex-1">
                                    <div className="text-sm" style={{ color: '#8394A7' }}>Account Type</div>
                                    <div className="flex items-center gap-2">
                                        <span style={{ color: '#FFFFFF' }}>
                                            {isAdmin ? 'Administrator' : 'Member'}
                                        </span>
                                        {isAdmin && (
                                            <span 
                                                className="text-xs px-2 py-1 rounded-full"
                                                style={{ backgroundColor: 'rgba(0, 255, 145, 0.2)', color: '#00FF91' }}
                                            >
                                                Admin
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Admin Access Card */}
                    {isAdmin && (
                        <Card className="p-6 rounded-xl" style={{ backgroundColor: 'rgba(0, 255, 145, 0.1)', border: '1px solid rgba(0, 255, 145, 0.3)' }}>
                            <h2 className="text-xl font-semibold mb-4" style={{ color: '#00FF91' }}>
                                Admin Access
                            </h2>
                            <p className="mb-4" style={{ color: '#8394A7' }}>
                                You have administrative privileges. Access the admin dashboard to manage events, groups, and users.
                            </p>
                            <Button
                                onClick={() => navigate('/admin')}
                                className="rounded-full"
                                style={{ backgroundColor: '#00FF91', color: '#051323' }}
                            >
                                <Shield className="mr-2 h-4 w-4" />
                                Go to Admin Dashboard
                            </Button>
                        </Card>
                    )}

                    {/* Actions */}
                    <div className="flex gap-4">
                        <Button
                            onClick={handleLogout}
                            className="flex-1 rounded-full py-6 text-lg font-semibold"
                            style={{ backgroundColor: '#8394A7', color: '#051323' }}
                        >
                            <LogOut className="mr-2 h-5 w-5" />
                            Sign Out
                        </Button>
                    </div>

                    {/* Security Notice */}
                    <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(131, 148, 167, 0.1)', border: '1px solid rgba(131, 148, 167, 0.2)' }}>
                        <p className="text-xs" style={{ color: '#8394A7' }}>
                            <strong style={{ color: '#FFFFFF' }}>Security Notice:</strong> Your account is secured through{' '}
                            {provider === 'aad' ? 'Microsoft Azure Active Directory' : 'Microsoft External Identities'}.
                            We never store your password - authentication is handled by your identity provider.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
