import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserContext } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import ProfilePhotoUpload from '@/components/ProfilePhotoUpload';
import { 
    User, 
    Mail, 
    Calendar, 
    Users, 
    Heart, 
    LogOut, 
    Settings,
    ChevronRight,
    Sparkles
} from 'lucide-react';
import { performLogout } from '@/utils/logout';

export default function MemberDashboard() {
    const { 
        authUser, 
        isAuthenticated, 
        isAdmin, 
        isLoading,
        profile,
        profileLoading,
        displayName,
        profilePicture,
        email,
        updateProfile
    } = useUserContext();
    const navigate = useNavigate();

    const handlePhotoUploadSuccess = async (url: string) => {
        try {
            await updateProfile({ profilePicture: url });
        } catch (error) {
            console.error('Failed to update profile image:', error);
        }
    };

    if (isLoading || profileLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#051323' }}>
                <div className="flex flex-col items-center gap-4">
                    <div 
                        className="w-16 h-16 rounded-full animate-pulse"
                        style={{ backgroundColor: 'rgba(0, 255, 145, 0.3)' }}
                    />
                    <div style={{ color: '#8394A7' }}>Loading your dashboard...</div>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        navigate('/login');
        return null;
    }

    // If admin, redirect to admin dashboard
    if (isAdmin) {
        navigate('/admin');
        return null;
    }

    const handleLogout = () => {
        // Smart logout: detects identity provider (Auth0 vs Entra ID) and routes appropriately
        performLogout(authUser?.identityProvider);
    };

    // Extract user info from context
    const userEmail = email || 'Member';
    const provider = authUser?.identityProvider || 'member';
    const joinDate = profile?.createdAt 
        ? new Date(profile.createdAt).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })
        : 'Recently joined';

    // Get initials for avatar fallback
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <div className="min-h-screen py-8" style={{ backgroundColor: '#051323' }}>
            <div className="max-w-4xl mx-auto px-4">
                {/* Welcome Header */}
                <div className="text-center mb-8">
                    {/* Profile Photo Upload */}
                    <div className="mb-4">
                        <ProfilePhotoUpload
                            currentPhotoUrl={profilePicture || undefined}
                            userName={displayName}
                            onUploadSuccess={handlePhotoUploadSuccess}
                            size="lg"
                        />
                    </div>
                    
                    <h1 className="text-3xl font-bold mb-2" style={{ color: '#FFFFFF' }}>
                        Welcome back, {displayName}!
                    </h1>
                    <p style={{ color: '#8394A7' }}>
                        {userEmail}
                    </p>
                    <p className="text-sm mt-1" style={{ color: '#00FF91' }}>
                        Member since {joinDate}
                    </p>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <Card 
                        className="p-6 rounded-xl cursor-pointer transition-all hover:scale-[1.02]"
                        style={{ 
                            backgroundColor: '#0a1f35', 
                            border: '1px solid rgba(0, 255, 145, 0.2)' 
                        }}
                        onClick={() => navigate('/')}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div 
                                    className="w-12 h-12 rounded-full flex items-center justify-center"
                                    style={{ backgroundColor: 'rgba(0, 255, 145, 0.2)' }}
                                >
                                    <Calendar className="w-6 h-6" style={{ color: '#00FF91' }} />
                                </div>
                                <div>
                                    <h3 className="font-semibold" style={{ color: '#FFFFFF' }}>
                                        Upcoming Events
                                    </h3>
                                    <p className="text-sm" style={{ color: '#8394A7' }}>
                                        See what's happening
                                    </p>
                                </div>
                            </div>
                            <ChevronRight style={{ color: '#8394A7' }} />
                        </div>
                    </Card>

                    <Card 
                        className="p-6 rounded-xl cursor-pointer transition-all hover:scale-[1.02]"
                        style={{ 
                            backgroundColor: '#0a1f35', 
                            border: '1px solid rgba(0, 255, 145, 0.2)' 
                        }}
                        onClick={() => navigate('/')}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div 
                                    className="w-12 h-12 rounded-full flex items-center justify-center"
                                    style={{ backgroundColor: 'rgba(0, 255, 145, 0.2)' }}
                                >
                                    <Users className="w-6 h-6" style={{ color: '#00FF91' }} />
                                </div>
                                <div>
                                    <h3 className="font-semibold" style={{ color: '#FFFFFF' }}>
                                        Our Groups
                                    </h3>
                                    <p className="text-sm" style={{ color: '#8394A7' }}>
                                        Connect with communities
                                    </p>
                                </div>
                            </div>
                            <ChevronRight style={{ color: '#8394A7' }} />
                        </div>
                    </Card>
                </div>

                {/* Member Benefits Card */}
                <Card 
                    className="p-6 rounded-xl mb-6"
                    style={{ 
                        backgroundColor: 'rgba(0, 255, 145, 0.1)', 
                        border: '1px solid rgba(0, 255, 145, 0.3)' 
                    }}
                >
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2" style={{ color: '#00FF91' }}>
                        <Heart className="w-5 h-5" />
                        Member Benefits
                    </h2>
                    <ul className="space-y-3">
                        <li className="flex items-center gap-3" style={{ color: '#FFFFFF' }}>
                            <span style={{ color: '#00FF91' }}>✓</span>
                            Access to exclusive community events
                        </li>
                        <li className="flex items-center gap-3" style={{ color: '#FFFFFF' }}>
                            <span style={{ color: '#00FF91' }}>✓</span>
                            Connect with tech professionals
                        </li>
                        <li className="flex items-center gap-3" style={{ color: '#FFFFFF' }}>
                            <span style={{ color: '#00FF91' }}>✓</span>
                            Early access to workshops and programs
                        </li>
                        <li className="flex items-center gap-3" style={{ color: '#FFFFFF' }}>
                            <span style={{ color: '#00FF91' }}>✓</span>
                            Newsletter and community updates
                        </li>
                    </ul>
                </Card>

                {/* Account Details */}
                <Card 
                    className="p-6 rounded-xl mb-6"
                    style={{ 
                        backgroundColor: '#0a1f35', 
                        border: '1px solid rgba(0, 255, 145, 0.2)' 
                    }}
                >
                    <h2 className="text-xl font-semibold mb-4" style={{ color: '#FFFFFF' }}>
                        Account Details
                    </h2>
                    
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <Mail className="w-5 h-5 mt-0.5" style={{ color: '#00FF91' }} />
                            <div className="flex-1">
                                <div className="text-sm" style={{ color: '#8394A7' }}>Email</div>
                                <div style={{ color: '#FFFFFF' }}>{userEmail}</div>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <User className="w-5 h-5 mt-0.5" style={{ color: '#00FF91' }} />
                            <div className="flex-1">
                                <div className="text-sm" style={{ color: '#8394A7' }}>Account Type</div>
                                <div style={{ color: '#FFFFFF' }}>
                                    Community Member
                                </div>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <Settings className="w-5 h-5 mt-0.5" style={{ color: '#00FF91' }} />
                            <div className="flex-1">
                                <div className="text-sm" style={{ color: '#8394A7' }}>Login Provider</div>
                                <div style={{ color: '#FFFFFF' }}>
                                    {provider === 'member' ? 'Microsoft External ID' : 
                                     provider === 'aad' ? 'Microsoft Azure AD' : 
                                     provider}
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-4">
                    <Button
                        onClick={() => navigate('/profile')}
                        className="flex-1 rounded-full py-6 text-lg font-semibold"
                        style={{ backgroundColor: '#0a1f35', color: '#00FF91', border: '1px solid #00FF91' }}
                    >
                        <Settings className="mr-2 h-5 w-5" />
                        Edit Profile
                    </Button>
                    <Button
                        onClick={handleLogout}
                        className="flex-1 rounded-full py-6 text-lg font-semibold"
                        style={{ backgroundColor: '#8394A7', color: '#051323' }}
                    >
                        <LogOut className="mr-2 h-5 w-5" />
                        Sign Out
                    </Button>
                </div>

                {/* Support Link */}
                <div className="mt-8 text-center">
                    <p className="text-sm" style={{ color: '#8394A7' }}>
                        Need help?{' '}
                        <a 
                            href="mailto:support@somos.tech" 
                            style={{ color: '#00FF91', textDecoration: 'underline' }}
                        >
                            Contact Support
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}
