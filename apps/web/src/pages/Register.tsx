import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { UserPlus } from 'lucide-react';
import { GoogleOneTap, GoogleSignInButton } from '@/components/GoogleOneTap';

// Check if Google auth is configured
const GOOGLE_ENABLED = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

export default function Register() {
    const { isAuthenticated, isAdmin, isLoading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            // Redirect to appropriate dashboard based on role
            navigate(isAdmin ? '/admin' : '/member');
        }
    }, [isAuthenticated, isAdmin, isLoading, navigate]);

    // SWA requires absolute post-login URLs or it falls back to default hostname
    const buildAbsoluteRedirect = (target: string) => {
        const normalized = target?.startsWith('http')
            ? target
            : `${window.location.origin}${target?.startsWith('/') ? target : `/${target}`}`;

        return encodeURIComponent(normalized);
    };

    const handleRegister = () => {
        // Use Auth0 provider for user signup/login - redirect to member dashboard
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
            {/* Google One Tap - shows popup prompt for quick signup */}
            {GOOGLE_ENABLED && !isAuthenticated && (
                <GoogleOneTap 
                    autoPrompt={true}
                    context="signup"
                    onSuccess={(credential, email) => {
                        console.log('Google One Tap signup success:', email);
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
                        Become a Member
                    </h1>
                    <p style={{ color: '#8394A7' }}>
                        Join our community of tech professionals
                    </p>
                </div>

                <div className="space-y-4">
                    {/* Google Sign-In Button - quick signup with Google */}
                    {GOOGLE_ENABLED && (
                        <>
                            <div className="flex justify-center">
                                <GoogleSignInButton 
                                    theme="outline"
                                    size="large"
                                    text="signup_with"
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
                        onClick={handleRegister}
                        className="w-full rounded-full py-6 text-lg font-semibold transition-all hover:scale-105"
                        style={{ backgroundColor: '#00FF91', color: '#051323' }}
                    >
                        <UserPlus className="mr-2 h-5 w-5" />
                        Sign Up with Email
                    </Button>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-sm" style={{ color: '#8394A7' }}>
                        Already have an account?{' '}
                        <a 
                            href="/login" 
                            style={{ color: '#00FF91', textDecoration: 'underline' }}
                        >
                            Sign in
                        </a>
                    </p>
                </div>

                <div className="mt-6 p-4 rounded-xl" style={{ backgroundColor: 'rgba(131, 148, 167, 0.1)', border: '1px solid rgba(131, 148, 167, 0.2)' }}>
                    <p className="text-xs" style={{ color: '#8394A7' }}>
                        By signing up, you agree to our{' '}
                        <a href="/terms" style={{ color: '#00FF91', textDecoration: 'underline' }}>
                            Terms of Service
                        </a>{' '}
                        and{' '}
                        <a href="/privacy" style={{ color: '#00FF91', textDecoration: 'underline' }}>
                            Privacy Policy
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}
