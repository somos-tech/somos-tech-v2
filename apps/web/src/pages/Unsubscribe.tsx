/**
 * Unsubscribe Page - Public page for email unsubscribe
 * 
 * Allows users to manage their email preferences via a link from emails
 * Does not require authentication
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    Mail, 
    Check, 
    AlertCircle, 
    Loader2,
    ArrowLeft,
    Newspaper,
    Calendar,
    Megaphone,
    Bell
} from 'lucide-react';

interface SubscriptionPrefs {
    newsletters: boolean;
    events: boolean;
    announcements: boolean;
}

export default function Unsubscribe() {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [email, setEmail] = useState<string | null>(null);
    const [prefs, setPrefs] = useState<SubscriptionPrefs>({
        newsletters: true,
        events: true,
        announcements: true
    });

    useEffect(() => {
        loadPreferences();
    }, [token]);

    const loadPreferences = async () => {
        if (!token) {
            setError('Invalid unsubscribe link');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const response = await fetch(`/api/email/manage/${token}`);
            
            if (!response.ok) {
                throw new Error('Invalid or expired unsubscribe link');
            }
            
            const data = await response.json();
            setEmail(data.email);
            setPrefs(data.subscriptions || {
                newsletters: true,
                events: true,
                announcements: true
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load preferences');
        } finally {
            setLoading(false);
        }
    };

    const handleUnsubscribe = async (type: keyof SubscriptionPrefs) => {
        if (!token) return;

        try {
            setSaving(true);
            const newPrefs = { ...prefs, [type]: false };
            
            const response = await fetch(`/api/email/manage/${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subscriptions: newPrefs })
            });
            
            if (!response.ok) {
                throw new Error('Failed to update preferences');
            }
            
            setPrefs(newPrefs);
            setSuccess(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update preferences');
        } finally {
            setSaving(false);
        }
    };

    const handleUnsubscribeAll = async () => {
        if (!token) return;

        try {
            setSaving(true);
            const response = await fetch(`/api/email/manage/${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ unsubscribeAll: true })
            });
            
            if (!response.ok) {
                throw new Error('Failed to unsubscribe');
            }
            
            setPrefs({ newsletters: false, events: false, announcements: false });
            setSuccess(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to unsubscribe');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#051323' }}>
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#00FF91' }} />
            </div>
        );
    }

    return (
        <div className="min-h-screen py-12" style={{ backgroundColor: '#051323' }}>
            <div className="max-w-lg mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-8">
                    <div 
                        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                        style={{ backgroundColor: 'rgba(0, 255, 145, 0.2)' }}
                    >
                        <Mail className="w-8 h-8" style={{ color: '#00FF91' }} />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Email Preferences</h1>
                    {email && (
                        <p style={{ color: '#8394A7' }}>
                            Managing preferences for <span className="text-white">{email}</span>
                        </p>
                    )}
                </div>

                {/* Error State */}
                {error && (
                    <div 
                        className="p-4 rounded-xl flex items-center gap-3 mb-6"
                        style={{ backgroundColor: 'rgba(255, 99, 99, 0.1)', border: '1px solid rgba(255, 99, 99, 0.3)' }}
                    >
                        <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#FF6363' }} />
                        <span style={{ color: '#FF6363' }}>{error}</span>
                    </div>
                )}

                {/* Success State */}
                {success && (
                    <div 
                        className="p-4 rounded-xl flex items-center gap-3 mb-6"
                        style={{ backgroundColor: 'rgba(0, 255, 145, 0.1)', border: '1px solid rgba(0, 255, 145, 0.3)' }}
                    >
                        <Check className="w-5 h-5 flex-shrink-0" style={{ color: '#00FF91' }} />
                        <span style={{ color: '#00FF91' }}>Your preferences have been updated!</span>
                    </div>
                )}

                {/* Preferences Card */}
                {!error && (
                    <div 
                        className="rounded-xl p-6 mb-6"
                        style={{ backgroundColor: '#0a1f35', border: '1px solid rgba(0, 255, 145, 0.2)' }}
                    >
                        <h2 className="text-lg font-semibold text-white mb-4">Choose what emails to receive:</h2>
                        
                        <div className="space-y-3">
                            {/* Newsletters */}
                            <div 
                                className="flex items-center justify-between p-4 rounded-lg"
                                style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                            >
                                <div className="flex items-center gap-3">
                                    <Newspaper className="w-5 h-5" style={{ color: '#FF6B9D' }} />
                                    <div>
                                        <div className="text-white font-medium">Newsletters</div>
                                        <div className="text-xs" style={{ color: '#8394A7' }}>Monthly updates and community news</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleUnsubscribe('newsletters')}
                                    disabled={!prefs.newsletters || saving}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                        prefs.newsletters 
                                            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                                            : 'bg-gray-500/20 text-gray-500 cursor-not-allowed'
                                    }`}
                                >
                                    {prefs.newsletters ? 'Unsubscribe' : 'Unsubscribed'}
                                </button>
                            </div>

                            {/* Events */}
                            <div 
                                className="flex items-center justify-between p-4 rounded-lg"
                                style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                            >
                                <div className="flex items-center gap-3">
                                    <Calendar className="w-5 h-5" style={{ color: '#00D4FF' }} />
                                    <div>
                                        <div className="text-white font-medium">Event Notifications</div>
                                        <div className="text-xs" style={{ color: '#8394A7' }}>Upcoming events and meetups</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleUnsubscribe('events')}
                                    disabled={!prefs.events || saving}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                        prefs.events 
                                            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                                            : 'bg-gray-500/20 text-gray-500 cursor-not-allowed'
                                    }`}
                                >
                                    {prefs.events ? 'Unsubscribe' : 'Unsubscribed'}
                                </button>
                            </div>

                            {/* Announcements */}
                            <div 
                                className="flex items-center justify-between p-4 rounded-lg"
                                style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                            >
                                <div className="flex items-center gap-3">
                                    <Megaphone className="w-5 h-5" style={{ color: '#FFC107' }} />
                                    <div>
                                        <div className="text-white font-medium">Announcements</div>
                                        <div className="text-xs" style={{ color: '#8394A7' }}>Important organizational updates</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleUnsubscribe('announcements')}
                                    disabled={!prefs.announcements || saving}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                        prefs.announcements 
                                            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                                            : 'bg-gray-500/20 text-gray-500 cursor-not-allowed'
                                    }`}
                                >
                                    {prefs.announcements ? 'Unsubscribe' : 'Unsubscribed'}
                                </button>
                            </div>
                        </div>

                        {/* Unsubscribe All */}
                        <div className="mt-6 pt-6 border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                            <button
                                onClick={handleUnsubscribeAll}
                                disabled={saving || (!prefs.newsletters && !prefs.events && !prefs.announcements)}
                                className="w-full py-3 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ 
                                    backgroundColor: 'rgba(255, 68, 68, 0.1)', 
                                    border: '1px solid rgba(255, 68, 68, 0.3)',
                                    color: '#FF4444' 
                                }}
                            >
                                {saving ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Updating...
                                    </span>
                                ) : (
                                    'Unsubscribe from all emails'
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* Back Link */}
                <div className="text-center">
                    <button
                        onClick={() => navigate('/')}
                        className="inline-flex items-center gap-2 text-sm hover:underline"
                        style={{ color: '#00FF91' }}
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to SOMOS.tech
                    </button>
                </div>
            </div>
        </div>
    );
}
