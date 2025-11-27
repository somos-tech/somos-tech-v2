import { useEffect, useCallback } from 'react';

declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize: (config: GoogleOneTapConfig) => void;
                    prompt: (callback?: (notification: PromptNotification) => void) => void;
                    renderButton: (element: HTMLElement, config: GoogleButtonConfig) => void;
                    cancel: () => void;
                    disableAutoSelect: () => void;
                };
            };
        };
    }
}

interface GoogleOneTapConfig {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    context?: 'signin' | 'signup' | 'use';
    itp_support?: boolean;
    prompt_parent_id?: string;
    use_fedcm_for_prompt?: boolean;
}

interface GoogleCredentialResponse {
    credential: string;
    select_by: string;
    clientId?: string;
}

interface PromptNotification {
    isDisplayed: () => boolean;
    isNotDisplayed: () => boolean;
    isSkippedMoment: () => boolean;
    isDismissedMoment: () => boolean;
    getNotDisplayedReason: () => string;
    getSkippedReason: () => string;
    getDismissedReason: () => string;
}

interface GoogleButtonConfig {
    type?: 'standard' | 'icon';
    theme?: 'outline' | 'filled_blue' | 'filled_black';
    size?: 'large' | 'medium' | 'small';
    text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
    shape?: 'rectangular' | 'pill' | 'circle' | 'square';
    logo_alignment?: 'left' | 'center';
    width?: number;
    locale?: string;
}

interface GoogleOneTapProps {
    onSuccess?: (credential: string, email?: string) => void;
    onError?: (error: string) => void;
    autoPrompt?: boolean;
    context?: 'signin' | 'signup' | 'use';
    promptParentId?: string;
}

// Google Client ID - should be set in environment variables
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export function GoogleOneTap({ 
    onSuccess, 
    onError, 
    autoPrompt = true,
    context = 'signin',
    promptParentId
}: GoogleOneTapProps) {
    
    const handleCredentialResponse = useCallback((response: GoogleCredentialResponse) => {
        try {
            // Decode the JWT to get user info
            const payload = parseJwt(response.credential);
            
            console.log('Google One Tap sign-in successful:', {
                email: payload?.email,
                name: payload?.name,
                selectBy: response.select_by
            });

            // Call success callback with credential
            onSuccess?.(response.credential, payload?.email);
            
            // Redirect to the Google OAuth flow via SWA
            // This uses the credential to complete authentication
            handleGoogleSignIn(response.credential);
            
        } catch (error) {
            console.error('Error processing Google credential:', error);
            onError?.('Failed to process Google sign-in');
        }
    }, [onSuccess, onError]);

    useEffect(() => {
        if (!GOOGLE_CLIENT_ID) {
            console.warn('Google One Tap: VITE_GOOGLE_CLIENT_ID not configured');
            return;
        }

        // Load the Google Identity Services script
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        
        script.onload = () => {
            if (window.google?.accounts?.id) {
                window.google.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback: handleCredentialResponse,
                    auto_select: false, // Don't auto-select, let user choose
                    cancel_on_tap_outside: true,
                    context: context,
                    itp_support: true,
                    prompt_parent_id: promptParentId,
                    use_fedcm_for_prompt: true, // Use FedCM for better privacy
                });

                // Show the One Tap prompt if autoPrompt is enabled
                if (autoPrompt) {
                    window.google.accounts.id.prompt((notification) => {
                        if (notification.isNotDisplayed()) {
                            console.log('Google One Tap not displayed:', notification.getNotDisplayedReason());
                        } else if (notification.isSkippedMoment()) {
                            console.log('Google One Tap skipped:', notification.getSkippedReason());
                        } else if (notification.isDismissedMoment()) {
                            console.log('Google One Tap dismissed:', notification.getDismissedReason());
                        }
                    });
                }
            }
        };

        script.onerror = () => {
            console.error('Failed to load Google Identity Services script');
            onError?.('Failed to load Google sign-in');
        };

        document.head.appendChild(script);

        return () => {
            // Cleanup
            if (window.google?.accounts?.id) {
                window.google.accounts.id.cancel();
            }
            script.remove();
        };
    }, [handleCredentialResponse, autoPrompt, context, promptParentId, onError]);

    return null; // This component doesn't render anything visible
}

interface GoogleSignInButtonProps {
    onSuccess?: (credential: string, email?: string) => void;
    onError?: (error: string) => void;
    type?: 'standard' | 'icon';
    theme?: 'outline' | 'filled_blue' | 'filled_black';
    size?: 'large' | 'medium' | 'small';
    text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
    shape?: 'rectangular' | 'pill';
    width?: number;
    className?: string;
}

export function GoogleSignInButton({
    onSuccess,
    onError,
    type = 'standard',
    theme = 'outline',
    size = 'large',
    text = 'continue_with',
    shape = 'pill',
    width,
    className = ''
}: GoogleSignInButtonProps) {
    const buttonId = 'google-signin-button';

    const handleCredentialResponse = useCallback((response: GoogleCredentialResponse) => {
        try {
            const payload = parseJwt(response.credential);
            onSuccess?.(response.credential, payload?.email);
            handleGoogleSignIn(response.credential);
        } catch (error) {
            console.error('Error processing Google credential:', error);
            onError?.('Failed to process Google sign-in');
        }
    }, [onSuccess, onError]);

    useEffect(() => {
        if (!GOOGLE_CLIENT_ID) {
            console.warn('Google Sign-In: VITE_GOOGLE_CLIENT_ID not configured');
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;

        script.onload = () => {
            if (window.google?.accounts?.id) {
                window.google.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback: handleCredentialResponse,
                    itp_support: true,
                });

                const buttonElement = document.getElementById(buttonId);
                if (buttonElement) {
                    window.google.accounts.id.renderButton(buttonElement, {
                        type,
                        theme,
                        size,
                        text,
                        shape,
                        width,
                    });
                }
            }
        };

        document.head.appendChild(script);

        return () => {
            script.remove();
        };
    }, [handleCredentialResponse, type, theme, size, text, shape, width]);

    if (!GOOGLE_CLIENT_ID) {
        return null;
    }

    return <div id={buttonId} className={className} />;
}

// Helper function to parse JWT
function parseJwt(token: string): { email?: string; name?: string; picture?: string; sub?: string } | null {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch {
        return null;
    }
}

// Handle Google sign-in - redirect to complete auth
function handleGoogleSignIn(credential: string) {
    // Store credential temporarily for the auth flow
    sessionStorage.setItem('google_credential', credential);
    
    // Parse the credential to get user info
    const payload = parseJwt(credential);
    
    if (payload?.email) {
        // Store email for the registration flow
        sessionStorage.setItem('google_email', payload.email);
        sessionStorage.setItem('google_name', payload.name || '');
    }
    
    // Redirect to Google OAuth via SWA if configured
    // Otherwise redirect to member login
    const returnUrl = encodeURIComponent(`${window.location.origin}/member`);
    
    // Check if google provider is configured in SWA
    // If so, use it; otherwise fall back to member provider
    window.location.href = `/.auth/login/google?post_login_redirect_uri=${returnUrl}`;
}

export default GoogleOneTap;
