/**
 * Admin API Integrations Page
 * 
 * Shows all 3rd party API dependencies with:
 * - Configuration status
 * - Rate limits
 * - Health indicators
 * - Recommendations
 */

import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Key, Zap } from 'lucide-react';
import AdminQuickNav from '@/components/AdminQuickNav';
import APITracker from '@/components/APITracker';

export default function AdminIntegrations() {
    const navigate = useNavigate();

    return (
        <div style={{ backgroundColor: '#051323', minHeight: '100vh' }}>
            {/* Quick Navigation */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4">
                <AdminQuickNav />
            </div>
            
            {/* Header */}
            <div 
                className="border-b sticky top-16 z-40"
                style={{ backgroundColor: 'rgba(5, 19, 35, 0.95)', borderColor: 'rgba(0, 255, 145, 0.1)' }}
            >
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/admin/settings')}
                            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-white" />
                        </button>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
                                <Key className="w-8 h-8" style={{ color: '#00FF91' }} />
                                API & Integrations
                            </h1>
                            <p style={{ color: '#8394A7' }} className="text-sm mt-1">
                                Monitor 3rd party API dependencies, rate limits, and configuration status
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
                <APITracker />
            </div>
        </div>
    );
}
