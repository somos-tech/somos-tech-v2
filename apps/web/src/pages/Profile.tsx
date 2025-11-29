import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserContext } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
    User, Mail, Shield, LogOut, MapPin, Globe, FileText,
    Edit2, Save, X, Loader2, Check, Trash2, AlertTriangle
} from 'lucide-react';
import { performLogout } from '@/utils/logout';
import ProfilePhotoUpload from '@/components/ProfilePhotoUpload';
import { deleteOwnAuth0Account } from '@/api/auth0Service';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export default function Profile() {
    const { 
        authUser, 
        isAuthenticated, 
        isAdmin, 
        isLoading: authLoading,
        profile,
        profileLoading,
        updateProfile,
        refreshProfile,
        displayName: contextDisplayName,
        profilePicture,
        email
    } = useUserContext();
    const navigate = useNavigate();
    
    // UI state
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

    // Account deletion state
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    // Initialize edit form when profile loads
    useEffect(() => {
        if (profile) {
            setEditForm({
                displayName: profile.displayName || '',
                bio: profile.bio || '',
                location: profile.location || '',
                website: profile.website || ''
            });
        }
    }, [profile]);

    const handleSaveProfile = async () => {
        try {
            setIsSaving(true);
            setError(null);
            
            await updateProfile({
                displayName: editForm.displayName.trim() || undefined,
                bio: editForm.bio.trim() || null,
                location: editForm.location.trim() || null,
                website: editForm.website.trim() || null
            });
            
            setIsEditing(false);
            setSuccessMessage('Profile updated successfully!');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            console.error('Error saving profile:', err);
            setError(err instanceof Error ? err.message : 'Failed to save profile');
        } finally {
            setIsSaving(false);
        }
    };

    const handlePhotoUploadSuccess = async (url: string) => {
        try {
            // Update profile with new photo URL via context
            await updateProfile({ profilePicture: url });
            setSuccessMessage('Profile photo updated!');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            console.error('Error updating profile photo:', err);
            setError('Failed to update profile photo');
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
        // Smart logout: detects identity provider (Auth0 vs Entra ID) and routes appropriately
        performLogout(authUser?.identityProvider);
    };

    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== 'DELETE') {
            return;
        }

        try {
            setIsDeleting(true);
            setError(null);
            
            const result = await deleteOwnAuth0Account();
            
            // Close dialog and show success
            setShowDeleteDialog(false);
            setSuccessMessage('Your account has been deleted. You will be logged out shortly.');
            
            // Redirect to logout after a short delay
            setTimeout(() => {
                if (result.redirect) {
                    window.location.href = result.redirect;
                } else {
                    performLogout(authUser?.identityProvider);
                }
            }, 2000);
        } catch (err) {
            console.error('Error deleting account:', err);
            setError(err instanceof Error ? err.message : 'Failed to delete account');
            setIsDeleting(false);
        }
    };

    // Check if user is Auth0 user (can delete their account)
    const isAuth0User = authUser?.identityProvider === 'auth0';

    if (authLoading || profileLoading) {
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

    // Get display info from context
    const userEmail = email || 'Not available';
    const provider = authUser?.identityProvider || 'Unknown';
    const displayName = contextDisplayName;

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
                        currentPhotoUrl={profilePicture || undefined}
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

                    {/* Danger Zone - Account Deletion (Auth0 users only) */}
                    {isAuth0User && (
                        <Card className="p-6 rounded-xl" style={{ backgroundColor: 'rgba(255, 68, 68, 0.1)', border: '1px solid rgba(255, 68, 68, 0.3)' }}>
                            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2" style={{ color: '#FF4444' }}>
                                <AlertTriangle className="w-5 h-5" />
                                Danger Zone
                            </h2>
                            <p className="mb-4" style={{ color: '#8394A7' }}>
                                Once you delete your account, there is no going back. All your data will be permanently removed.
                            </p>
                            <Button
                                onClick={() => setShowDeleteDialog(true)}
                                className="rounded-full"
                                style={{ backgroundColor: 'transparent', border: '1px solid #FF4444', color: '#FF4444' }}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete My Account
                            </Button>
                        </Card>
                    )}

                    {/* Security Notice */}
                    <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(131, 148, 167, 0.1)', border: '1px solid rgba(131, 148, 167, 0.2)' }}>
                        <p className="text-xs" style={{ color: '#8394A7' }}>
                            <strong style={{ color: '#FFFFFF' }}>Security Notice:</strong> Your account is secured through{' '}
                            {provider === 'aad' ? 'Microsoft Azure Active Directory' : 'Auth0'}.
                            We never store your password - authentication is handled by your identity provider.
                        </p>
                    </div>
                </div>
            </div>

            {/* Delete Account Confirmation Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent style={{ backgroundColor: '#0A1929', borderColor: '#1E3A5F' }} className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2" style={{ color: '#FF4444' }}>
                            <AlertTriangle className="h-5 w-5" />
                            Delete Your Account
                        </DialogTitle>
                        <DialogDescription style={{ color: '#8394A7' }}>
                            This action is <strong style={{ color: '#FF4444' }}>permanent and cannot be undone</strong>. 
                            All your data, including your profile, community posts, and event registrations will be permanently deleted.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4 space-y-4">
                        <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(255, 68, 68, 0.1)', border: '1px solid rgba(255, 68, 68, 0.3)' }}>
                            <p className="text-sm" style={{ color: '#FFFFFF' }}>
                                Please type <strong style={{ color: '#FF4444' }}>DELETE</strong> to confirm:
                            </p>
                        </div>
                        <Input
                            type="text"
                            placeholder="Type DELETE to confirm"
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            style={{ backgroundColor: '#051323', borderColor: '#1E3A5F', color: '#FFFFFF' }}
                            disabled={isDeleting}
                        />
                    </div>

                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowDeleteDialog(false);
                                setDeleteConfirmText('');
                            }}
                            disabled={isDeleting}
                            style={{ borderColor: '#1E3A5F', color: '#8394A7' }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleDeleteAccount}
                            disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                            style={{ 
                                backgroundColor: deleteConfirmText === 'DELETE' ? '#FF4444' : '#3A3A3A',
                                color: '#FFFFFF'
                            }}
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Account
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
