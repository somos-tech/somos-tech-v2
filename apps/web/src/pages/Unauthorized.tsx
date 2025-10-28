import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';

export default function Unauthorized() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#051323' }}>
            <div className="text-center max-w-md mx-auto px-4">
                <ShieldAlert className="h-20 w-20 mx-auto mb-6" style={{ color: '#00FF91' }} />
                <h1 className="text-4xl font-bold mb-4" style={{ color: '#FFFFFF' }}>
                    Unauthorized Access
                </h1>
                <p className="text-lg mb-8" style={{ color: '#8394A7' }}>
                    You don't have permission to access this page. Please contact an administrator if you believe this is an error.
                </p>
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
