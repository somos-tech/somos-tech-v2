import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShieldAlert, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState, useRef } from 'react';
import { performLogout } from '@/utils/logout';

/**
 * Collect comprehensive device and browser information for security logging
 */
function collectDeviceInfo() {
    const nav = navigator as any;
    
    return {
        // Screen info
        screenWidth: window.screen?.width,
        screenHeight: window.screen?.height,
        screenAvailWidth: window.screen?.availWidth,
        screenAvailHeight: window.screen?.availHeight,
        colorDepth: window.screen?.colorDepth,
        pixelRatio: window.devicePixelRatio,
        
        // Browser/Device info
        language: navigator.language,
        languages: navigator.languages?.join(', '),
        platform: navigator.platform,
        userAgent: navigator.userAgent,
        cookiesEnabled: navigator.cookieEnabled,
        doNotTrack: navigator.doNotTrack,
        
        // Connection info (if available)
        connectionType: nav.connection?.effectiveType || nav.connection?.type,
        connectionDownlink: nav.connection?.downlink,
        connectionRtt: nav.connection?.rtt,
        
        // Timezone
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timezoneOffset: new Date().getTimezoneOffset(),
        
        // Touch support
        maxTouchPoints: navigator.maxTouchPoints,
        
        // Memory (if available)
        deviceMemory: nav.deviceMemory,
        
        // Hardware concurrency
        hardwareConcurrency: navigator.hardwareConcurrency,
        
        // Referrer
        referrer: document.referrer,
        
        // Current URL info
        currentPath: window.location.pathname,
        currentUrl: window.location.href,
        currentSearch: window.location.search,
    };
}

export default function Unauthorized() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, isAuthenticated, isAdmin } = useAuth();
    const [debugInfo, setDebugInfo] = useState<any>(null);
    const [alertSent, setAlertSent] = useState(false);
    const reportedRef = useRef(false);

    useEffect(() => {
        async function fetchDebugInfoAndReport() {
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

                const debugData = {
                    timestamp: new Date().toISOString(),
                    authenticated: !!authData.clientPrincipal,
                    email: authData.clientPrincipal?.userDetails || 'Not logged in',
                    identityProvider: authData.clientPrincipal?.identityProvider || 'None',
                    isAdmin: isAdmin,
                    adminCheckResponse: adminCheckData,
                };
                
                setDebugInfo(debugData);

                // Report the unauthorized access attempt (only once)
                if (!reportedRef.current && authData.clientPrincipal) {
                    reportedRef.current = true;
                    
                    const deviceInfo = collectDeviceInfo();
                    
                    try {
                        const response = await fetch('/api/security/unauthorized-access', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                // What they tried to access
                                attemptedPath: location.state?.from || document.referrer || window.location.pathname,
                                
                                // When
                                timestamp: new Date().toISOString(),
                                
                                // Device info
                                ...deviceInfo,
                                
                                // Auth context
                                adminCheckResponse: adminCheckData,
                            }),
                        });
                        
                        if (response.ok) {
                            setAlertSent(true);
                            console.log('[Security] Unauthorized access attempt reported');
                        }
                    } catch (reportError) {
                        console.error('[Security] Failed to report unauthorized access:', reportError);
                    }
                }
            } catch (error) {
                setDebugInfo({
                    error: error instanceof Error ? error.message : 'Unknown error',
                    timestamp: new Date().toISOString(),
                });
            }
        }

        fetchDebugInfoAndReport();
    }, [isAdmin, location.state]);

    return (
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#051323' }}>
            <div className="text-center max-w-2xl mx-auto px-4">
                <ShieldAlert className="h-20 w-20 mx-auto mb-6" style={{ color: '#FF4444' }} />
                <h1 className="text-4xl font-bold mb-4" style={{ color: '#FFFFFF' }}>
                    Unauthorized Access
                </h1>
                <p className="text-lg mb-4" style={{ color: '#8394A7' }}>
                    You don't have permission to access this page. Please contact an administrator if you believe this is an error.
                </p>
                
                {/* Security Warning */}
                <div 
                    className="mb-6 p-4 rounded-lg flex items-center gap-3 justify-center"
                    style={{ backgroundColor: 'rgba(255, 68, 68, 0.1)', border: '1px solid rgba(255, 68, 68, 0.3)' }}
                >
                    <AlertTriangle className="h-5 w-5" style={{ color: '#FF4444' }} />
                    <span className="text-sm" style={{ color: '#FF4444' }}>
                        This access attempt has been logged for security review
                    </span>
                </div>
                
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
                        onClick={() => performLogout(user?.identityProvider)}
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
