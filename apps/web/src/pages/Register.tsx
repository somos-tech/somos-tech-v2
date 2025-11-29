import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export default function Register() {
    const { isAuthenticated, isAdmin, isLoading } = useAuth();
    const navigate = useNavigate();

    // SWA requires absolute post-login URLs or it falls back to default hostname
    const buildAbsoluteRedirect = (target: string) => {
        const normalized = target?.startsWith('http')
            ? target
            : `${window.location.origin}${target?.startsWith('/') ? target : `/${target}`}`;

        return encodeURIComponent(normalized);
    };

    useEffect(() => {
        if (isLoading) return;

        if (isAuthenticated) {
            // Already logged in - redirect to appropriate dashboard
            navigate(isAdmin ? '/admin' : '/member');
        } else {
            // Not authenticated - redirect directly to Auth0
            const redirect = buildAbsoluteRedirect('/member');
            window.location.href = `/.auth/login/auth0?post_login_redirect_uri=${redirect}`;
        }
    }, [isAuthenticated, isAdmin, isLoading, navigate]);

    // Show loading state while checking auth or redirecting
    return (
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#051323' }}>
            <div className="text-center">
                <img 
                    src="https://static.wixstatic.com/media/0c204d_5f310ee2b2a848ceac8e68b25c0c39eb~mv2.png"
                    alt="SOMOS.tech Logo"
                    className="w-16 h-16 mx-auto mb-4 rounded-full animate-pulse"
                    style={{ boxShadow: '0 0 20px rgba(0, 255, 145, 0.5)' }}
                />
                <p style={{ color: '#8394A7' }}>Redirecting to sign up...</p>
            </div>
        </div>
    );
}
