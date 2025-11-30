/**
 * Admin API Integrations Page
 * 
 * Redirects to the unified API Health Dashboard which now includes
 * all 3rd party API integrations monitoring.
 * 
 * This page is kept for backward compatibility with existing bookmarks.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export default function AdminIntegrations() {
    const navigate = useNavigate();

    useEffect(() => {
        // Redirect to the unified API Health Dashboard
        navigate('/admin/health', { replace: true });
    }, [navigate]);

    return (
        <div 
            style={{ backgroundColor: '#051323', minHeight: '100vh' }}
            className="flex items-center justify-center"
        >
            <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: '#00FF91' }} />
                <p style={{ color: '#8394A7' }}>Redirecting to API Health Dashboard...</p>
            </div>
        </div>
    );
}
