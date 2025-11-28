import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { GoogleOneTap, GoogleSignInButton } from '@/components/GoogleOneTap';

// Check if Google auth is configured
const GOOGLE_ENABLED = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

export default function Login() {
    const { isAuthenticated, isAdmin, isLoading } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    // Default redirect to member dashboard for members, admin for admins
    const returnUrl = searchParams.get('returnUrl') || '/member';

    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            // Redirect admins to admin dashboard, members to member dashboard
            if (isAdmin) {
                navigate('/admin');
            } else {
                navigate(returnUrl);
            }
        }
    }, [isAuthenticated, isAdmin, isLoading, navigate, returnUrl]);

    // SWA requires absolute post-login URLs or it falls back to default hostname
    const buildAbsoluteRedirect = (target: string) => {
        const normalized = target?.startsWith('http')
            ? target
            : `${window.location.origin}${target?.startsWith('/') ? target : `/${target}`}`;

        return encodeURIComponent(normalized);
    };

    const handleLogin = () => {
        // Use Auth0 provider for regular user login - redirect to member dashboard
        const redirect = buildAbsoluteRedirect('/member');
        window.location.href = `/.auth/login/auth0?post_login_redirect_uri=${redirect}`;
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#051323' }}>
                <div style={{ color: '#8394A7' }}>Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#051323' }}>
            {/* Google One Tap - shows popup prompt when configured */}
            {GOOGLE_ENABLED && !isAuthenticated && (
                <GoogleOneTap 
                    autoPrompt={true}
                    context="signin"
                    onSuccess={(credential, email) => {
                        console.log('Google One Tap success:', email);
                    }}
                    onError={(error) => {
                        console.log('Google One Tap error:', error);
                    }}
                />
            )}
            
            <div className="max-w-md w-full mx-auto px-4">
                <div className="text-center mb-8">
                    <img 
                        src="https://static.wixstatic.com/media/0c204d_5f310ee2b2a848ceac8e68b25c0c39eb~mv2.png"
                        alt="SOMOS.tech Logo"
                        className="w-24 h-24 mx-auto mb-4 rounded-full"
                        style={{ boxShadow: '0 0 20px rgba(0, 255, 145, 0.5)' }}
                    />
                    <h1 className="text-3xl font-bold mb-2" style={{ color: '#FFFFFF' }}>
                        Welcome to SOMOS.tech
                    </h1>
                    <p style={{ color: '#8394A7' }}>
                        Sign in to access your account
                    </p>
                </div>

                <div className="space-y-4">
                    {/* Google Sign-In Button - rendered by Google SDK */}
                    {GOOGLE_ENABLED && (
                        <>
                            <div className="flex justify-center">
                                <GoogleSignInButton 
                                    theme="outline"
                                    size="large"
                                    text="continue_with"
                                    shape="pill"
                                    width={320}
                                />
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="flex-1 h-px" style={{ backgroundColor: '#1a3a52' }}></div>
                                <span className="text-sm" style={{ color: '#8394A7' }}>or</span>
                                <div className="flex-1 h-px" style={{ backgroundColor: '#1a3a52' }}></div>
                            </div>
                        </>
                    )}

                    <Button
                        onClick={handleLogin}
                        className="w-full rounded-full py-6 text-lg font-semibold transition-all hover:scale-105"
                        style={{ backgroundColor: '#00FF91', color: '#051323' }}
                    >
                        Sign in with Email
                    </Button>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-sm" style={{ color: '#8394A7' }}>
                        Don't have an account?{' '}
                        <a 
                            href="/register" 
                            style={{ color: '#00FF91', textDecoration: 'underline' }}
                        >
                            Become a member
                        </a>
                    </p>
                </div>

                <div className="mt-6 text-center">
                    <p className="text-xs" style={{ color: '#8394A7' }}>
                        Are you a staff member?{' '}
                        <a 
                            href="/admin/login" 
                            style={{ color: '#00FF91', textDecoration: 'underline' }}
                        >
                            Admin Login
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}
