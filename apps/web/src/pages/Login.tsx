import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

export default function Login() {
    const { isAuthenticated, isLoading } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const returnUrl = searchParams.get('returnUrl') || '/';

    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            navigate(returnUrl);
        }
    }, [isAuthenticated, isLoading, navigate, returnUrl]);

    const handleLogin = () => {
        // Redirect to admin login (External ID disabled for now)
        navigate('/admin/login');
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
                        Welcome to SOMOS.tech
                    </h1>
                    <p style={{ color: '#8394A7' }}>
                        Sign in to access your account
                    </p>
                </div>

                <div className="space-y-4">
                    <Button
                        onClick={handleLogin}
                        className="w-full rounded-full py-6 text-lg font-semibold transition-all hover:scale-105"
                        style={{ backgroundColor: '#00FF91', color: '#051323' }}
                    >
                        Sign in with Microsoft (@somos.tech)
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
