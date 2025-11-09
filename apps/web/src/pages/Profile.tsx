import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { User, Mail, Shield, LogOut, Calendar } from 'lucide-react';

export default function Profile() {
    const { user, isAuthenticated, isAdmin, isLoading } = useAuth();
    const navigate = useNavigate();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#051323' }}>
                <div style={{ color: '#8394A7' }}>Loading...</div>
            </div>
        );
    }

    if (!isAuthenticated) {
        navigate('/login');
        return null;
    }

    const handleLogout = () => {
        window.location.href = '/.auth/logout';
    };

    // Extract user info from the auth data
    const userEmail = user?.userDetails || 'Not available';
    const provider = user?.identityProvider || 'Unknown';
    const userId = user?.userId || 'Unknown';

    return (
        <div className="min-h-screen py-12" style={{ backgroundColor: '#051323' }}>
            <div className="max-w-4xl mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-8">
                    <div 
                        className="w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: 'rgba(0, 255, 145, 0.2)', boxShadow: '0 0 20px rgba(0, 255, 145, 0.5)' }}
                    >
                        <User className="w-12 h-12" style={{ color: '#00FF91' }} />
                    </div>
                    <h1 className="text-3xl font-bold mb-2" style={{ color: '#FFFFFF' }}>
                        My Profile
                    </h1>
                    <p style={{ color: '#8394A7' }}>
                        Manage your account information
                    </p>
                </div>

                {/* Profile Information */}
                <div className="space-y-6">
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

                            {/* User ID */}
                            <div className="flex items-start gap-3">
                                <User className="w-5 h-5 mt-0.5" style={{ color: '#00FF91' }} />
                                <div className="flex-1">
                                    <div className="text-sm" style={{ color: '#8394A7' }}>User ID</div>
                                    <div className="font-mono text-sm" style={{ color: '#FFFFFF' }}>{userId}</div>
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
                                <Calendar className="w-5 h-5 mt-0.5" style={{ color: '#00FF91' }} />
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
