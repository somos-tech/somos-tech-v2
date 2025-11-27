import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { UserPlus } from 'lucide-react';
import { GoogleOneTap } from '@/components/GoogleOneTap';

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
        // Use member provider for user signup/login - redirect to member dashboard
        const redirect = buildAbsoluteRedirect('/member');
        window.location.href = `/.auth/login/member?post_login_redirect_uri=${redirect}`;
    };

    const handleGoogleRegister = () => {
        const redirect = buildAbsoluteRedirect('/member');
        window.location.href = `/.auth/login/google?post_login_redirect_uri=${redirect}`;
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
            {/* Google One Tap - shows automatically in corner */}
            <GoogleOneTap 
                autoPrompt={!isAuthenticated}
                context="signup"
            />
            
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
                    {/* Google Sign-Up Button */}
                    <Button
                        onClick={handleGoogleRegister}
                        className="w-full rounded-full py-6 text-lg font-semibold transition-all hover:scale-105 flex items-center justify-center gap-3"
                        style={{ backgroundColor: '#FFFFFF', color: '#1f2937' }}
                    >
                        <svg className="w-6 h-6" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        <UserPlus className="w-5 h-5" />
                        Sign up with Google
                    </Button>

                    <div className="flex items-center gap-4">
                        <div className="flex-1 h-px" style={{ backgroundColor: '#1a3a52' }}></div>
                        <span className="text-sm" style={{ color: '#8394A7' }}>or</span>
                        <div className="flex-1 h-px" style={{ backgroundColor: '#1a3a52' }}></div>
                    </div>

                    <Button
                        onClick={handleRegister}
                        className="w-full rounded-full py-6 text-lg font-semibold transition-all hover:scale-105"
                        style={{ backgroundColor: '#00FF91', color: '#051323' }}
                    >
                        <UserPlus className="mr-2 h-5 w-5" />
                        Sign Up with Microsoft
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
