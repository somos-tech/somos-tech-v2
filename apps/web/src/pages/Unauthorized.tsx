import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';

export default function Unauthorized() {
    const navigate = useNavigate();
    const { user, isAuthenticated, isAdmin } = useAuth();
    const [debugInfo, setDebugInfo] = useState<any>(null);

    useEffect(() => {
        async function fetchDebugInfo() {
            try {
                // Get auth info
                const authResponse = await fetch('/.auth/me');
                const authData = await authResponse.json();

                // Get admin check info
                let adminCheckData = null;
                if (authData.clientPrincipal) {
                    try {
                        const adminResponse = await fetch('/api/check-admin');
                        adminCheckData = await adminResponse.json();
                    } catch (err) {
                        adminCheckData = { error: err instanceof Error ? err.message : 'Unknown error' };
                    }
                }

                setDebugInfo({
                    timestamp: new Date().toISOString(),
                    authenticated: !!authData.clientPrincipal,
                    email: authData.clientPrincipal?.userDetails || 'Not logged in',
                    identityProvider: authData.clientPrincipal?.identityProvider || 'None',
                    isAdmin: isAdmin,
                    adminCheckResponse: adminCheckData,
                });
            } catch (error) {
                setDebugInfo({
                    error: error instanceof Error ? error.message : 'Unknown error',
                    timestamp: new Date().toISOString(),
                });
            }
        }

        fetchDebugInfo();
    }, [isAdmin]);

    return (
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#051323' }}>
            <div className="text-center max-w-2xl mx-auto px-4">
                <ShieldAlert className="h-20 w-20 mx-auto mb-6" style={{ color: '#00FF91' }} />
                <h1 className="text-4xl font-bold mb-4" style={{ color: '#FFFFFF' }}>
                    Unauthorized Access
                </h1>
                <p className="text-lg mb-8" style={{ color: '#8394A7' }}>
                    You don't have permission to access this page. Please contact an administrator if you believe this is an error.
                </p>
                
                {/* Debug Information */}
                <div className="mb-8 p-4 rounded-lg text-left" style={{ backgroundColor: '#0F2744', borderColor: '#1E3A5F', border: '1px solid' }}>
                    <h2 className="text-sm font-semibold mb-2" style={{ color: '#00FF91' }}>
                        Debug Information:
                    </h2>
                    <pre className="text-xs overflow-auto" style={{ color: '#8394A7' }}>
                        {JSON.stringify(debugInfo, null, 2)}
                    </pre>
                </div>

                <div className="flex gap-4 justify-center">
                    <Button
                        onClick={() => navigate('/')}
                        className="rounded-full px-6"
                        style={{ backgroundColor: '#00FF91', color: '#051323' }}
                    >
                        Go Home
                    </Button>
                    <Button
                        onClick={() => window.location.href = '/.auth/logout'}
                        variant="outline"
                        className="rounded-full px-6"
                        style={{ borderColor: '#00FF91', color: '#00FF91' }}
                    >
                        Logout
                    </Button>
                </div>
            </div>
        </div>
    );
}
