import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Shield } from 'lucide-react';

export default function AdminLogin() {
    const { isAuthenticated, isAdmin, isLoading } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const returnUrl = searchParams.get('returnUrl') || '/admin';

    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            if (isAdmin) {
                navigate(returnUrl);
            } else {
                navigate('/unauthorized');
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

    const handleAdminLogin = () => {
        // Login with AAD for somos.tech accounts only
        // Add domain_hint to ensure only somos.tech accounts can sign in
        const redirect = buildAbsoluteRedirect(returnUrl);
        window.location.href = `/.auth/login/aad?post_login_redirect_uri=${redirect}&domain_hint=somos.tech`;
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
                    <div 
                        className="w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: 'rgba(0, 255, 145, 0.2)', boxShadow: '0 0 20px rgba(0, 255, 145, 0.5)' }}
                    >
                        <Shield className="w-12 h-12" style={{ color: '#00FF91' }} />
                    </div>
                    <h1 className="text-3xl font-bold mb-2" style={{ color: '#FFFFFF' }}>
                        Admin Access
                    </h1>
                    <p style={{ color: '#8394A7' }}>
                        Sign in with your @somos.tech account
                    </p>
                </div>

                <div className="space-y-4">
                    <Button
                        onClick={handleAdminLogin}
                        className="w-full rounded-full py-6 text-lg font-semibold transition-all hover:scale-105"
                        style={{ backgroundColor: '#00FF91', color: '#051323' }}
                    >
                        <Shield className="mr-2 h-5 w-5" />
                        Sign in with Microsoft (somos.tech)
                    </Button>
                </div>

                <div className="mt-8 p-4 rounded-xl" style={{ backgroundColor: 'rgba(131, 148, 167, 0.1)', border: '1px solid rgba(131, 148, 167, 0.2)' }}>
                    <p className="text-sm" style={{ color: '#8394A7' }}>
                        <strong style={{ color: '#FFFFFF' }}>Admin access is restricted</strong><br />
                        Only @somos.tech email addresses are authorized for admin access. If you're a regular user, please{' '}
                        <a 
                            href="/login" 
                            style={{ color: '#00FF91', textDecoration: 'underline' }}
                        >
                            use the member login
                        </a>.
                    </p>
                </div>
            </div>
        </div>
    );
}
