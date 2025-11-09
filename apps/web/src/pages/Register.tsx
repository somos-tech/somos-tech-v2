import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { UserPlus } from 'lucide-react';

export default function Register() {
    const { isAuthenticated, isLoading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            navigate('/profile');
        }
    }, [isAuthenticated, isLoading, navigate]);

    const handleRegister = () => {
        // Use member provider for user signup/login
        window.location.href = `/.auth/login/member?post_login_redirect_uri=${encodeURIComponent('/profile')}`;
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

                <div className="mb-6 p-4 rounded-xl" style={{ backgroundColor: 'rgba(0, 255, 145, 0.1)', border: '1px solid rgba(0, 255, 145, 0.3)' }}>
                    <h3 className="font-semibold mb-2" style={{ color: '#00FF91' }}>Sign up with:</h3>
                    <ul className="text-sm space-y-1" style={{ color: '#8394A7' }}>
                        <li>• Microsoft Account</li>
                        <li>• Google Account</li>
                    </ul>
                    <p className="text-xs mt-3" style={{ color: '#8394A7' }}>
                        Username/password signup is not available - we use trusted identity providers for security.
                    </p>
                </div>

                <Button
                    onClick={handleRegister}
                    className="w-full rounded-full py-6 text-lg font-semibold transition-all hover:scale-105"
                    style={{ backgroundColor: '#00FF91', color: '#051323' }}
                >
                    <UserPlus className="mr-2 h-5 w-5" />
                    Sign Up with Microsoft
                </Button>

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
