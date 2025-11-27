import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserContext } from '@/contexts/UserContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
    children: ReactNode;
    requireAdmin?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
    const { isAuthenticated, isAdmin, isLoading } = useUserContext();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            // Redirect to appropriate login page
            const currentPath = `${window.location.pathname}${window.location.search || ''}${window.location.hash || ''}`;
            if (requireAdmin) {
                // Admin routes -> admin login
                navigate(`/admin/login?returnUrl=${encodeURIComponent(currentPath)}`, { replace: true });
            } else {
                // Regular routes -> regular login
                navigate(`/login?returnUrl=${encodeURIComponent(currentPath)}`, { replace: true });
            }
        }

        if (!isLoading && isAuthenticated && requireAdmin && !isAdmin) {
            // User is authenticated but not an admin
            navigate('/unauthorized', { replace: true });
        }
    }, [isAuthenticated, isAdmin, isLoading, requireAdmin, navigate]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#051323' }}>
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" style={{ color: '#00FF91' }} />
                    <p style={{ color: '#8394A7' }}>Authenticating...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated || (requireAdmin && !isAdmin)) {
        return null;
    }

    return <>{children}</>;
}
