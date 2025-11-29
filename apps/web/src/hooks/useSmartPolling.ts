import { useEffect, useRef, useCallback, useState } from 'react';

interface SmartPollingConfig {
    /** Polling interval when user is active and tab is visible (ms) */
    activeInterval: number;
    /** Polling interval when user is idle (ms) */
    idleInterval: number;
    /** Polling interval when tab is hidden/backgrounded (ms) - set to 0 to stop polling */
    hiddenInterval: number;
    /** Time of inactivity before user is considered idle (ms) */
    idleTimeout: number;
    /** Whether to use exponential backoff when idle */
    useExponentialBackoff?: boolean;
    /** Maximum interval when using exponential backoff (ms) */
    maxInterval?: number;
    /** Whether to immediately fetch when tab becomes visible again */
    fetchOnVisible?: boolean;
    /** Whether to immediately fetch when user becomes active again */
    fetchOnActive?: boolean;
}

interface SmartPollingState {
    isVisible: boolean;
    isActive: boolean;
    currentInterval: number;
    lastActivity: number;
}

const DEFAULT_CONFIG: SmartPollingConfig = {
    activeInterval: 10000,      // 10 seconds when active
    idleInterval: 30000,        // 30 seconds when idle
    hiddenInterval: 0,          // Stop polling when hidden
    idleTimeout: 60000,         // 1 minute to be considered idle
    useExponentialBackoff: true,
    maxInterval: 120000,        // 2 minutes max
    fetchOnVisible: true,
    fetchOnActive: true,
};

/**
 * Smart polling hook that adapts polling frequency based on:
 * - Tab visibility (Page Visibility API)
 * - User activity (mouse, keyboard, scroll, touch)
 * - Exponential backoff when idle
 * 
 * This reduces API calls significantly when:
 * - User switches to another tab
 * - User stops interacting with the page
 * - User is AFK
 */
export function useSmartPolling(
    fetchFn: () => void | Promise<void>,
    config: Partial<SmartPollingConfig> = {}
) {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    const {
        activeInterval,
        idleInterval,
        hiddenInterval,
        idleTimeout,
        useExponentialBackoff,
        maxInterval,
        fetchOnVisible,
        fetchOnActive,
    } = mergedConfig;

    const [state, setState] = useState<SmartPollingState>({
        isVisible: typeof document !== 'undefined' ? !document.hidden : true,
        isActive: true,
        currentInterval: activeInterval,
        lastActivity: Date.now(),
    });

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const backoffMultiplierRef = useRef(1);
    const stateRef = useRef(state);

    // Keep ref in sync with state for use in callbacks
    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    // Calculate the appropriate interval based on current state
    const calculateInterval = useCallback(() => {
        const { isVisible, isActive } = stateRef.current;

        if (!isVisible) {
            return hiddenInterval;
        }

        if (!isActive) {
            if (useExponentialBackoff) {
                const backoffInterval = idleInterval * backoffMultiplierRef.current;
                return Math.min(backoffInterval, maxInterval || idleInterval * 8);
            }
            return idleInterval;
        }

        // Reset backoff when active
        backoffMultiplierRef.current = 1;
        return activeInterval;
    }, [activeInterval, idleInterval, hiddenInterval, useExponentialBackoff, maxInterval]);

    // Reset activity state and restart with active interval
    const resetActivity = useCallback(() => {
        const wasIdle = !stateRef.current.isActive;
        backoffMultiplierRef.current = 1;

        setState(prev => ({
            ...prev,
            isActive: true,
            lastActivity: Date.now(),
            currentInterval: activeInterval,
        }));

        // Clear existing idle timeout
        if (idleTimeoutRef.current) {
            clearTimeout(idleTimeoutRef.current);
        }

        // Set new idle timeout
        idleTimeoutRef.current = setTimeout(() => {
            setState(prev => ({ ...prev, isActive: false }));
        }, idleTimeout);

        // Fetch immediately if transitioning from idle to active
        if (wasIdle && fetchOnActive) {
            fetchFn();
        }
    }, [activeInterval, idleTimeout, fetchOnActive, fetchFn]);

    // Handle visibility change
    const handleVisibilityChange = useCallback(() => {
        const isNowVisible = !document.hidden;
        const wasHidden = !stateRef.current.isVisible;

        setState(prev => ({
            ...prev,
            isVisible: isNowVisible,
            currentInterval: isNowVisible ? calculateInterval() : hiddenInterval,
        }));

        // Fetch immediately when tab becomes visible again
        if (isNowVisible && wasHidden && fetchOnVisible) {
            fetchFn();
            resetActivity(); // Also reset activity timer
        }
    }, [calculateInterval, hiddenInterval, fetchOnVisible, fetchFn, resetActivity]);

    // Set up activity listeners
    useEffect(() => {
        const activityEvents = [
            'mousedown',
            'mousemove',
            'keydown',
            'scroll',
            'touchstart',
            'wheel',
            'click',
        ];

        // Debounce activity reset to avoid excessive calls
        let activityDebounceTimer: ReturnType<typeof setTimeout> | null = null;
        const debouncedResetActivity = () => {
            if (activityDebounceTimer) return;
            activityDebounceTimer = setTimeout(() => {
                activityDebounceTimer = null;
                resetActivity();
            }, 100);
        };

        // Add activity listeners
        activityEvents.forEach(event => {
            window.addEventListener(event, debouncedResetActivity, { passive: true });
        });

        // Add visibility listener
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Set initial idle timeout
        idleTimeoutRef.current = setTimeout(() => {
            setState(prev => ({ ...prev, isActive: false }));
        }, idleTimeout);

        return () => {
            activityEvents.forEach(event => {
                window.removeEventListener(event, debouncedResetActivity);
            });
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (activityDebounceTimer) clearTimeout(activityDebounceTimer);
            if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
        };
    }, [resetActivity, handleVisibilityChange, idleTimeout]);

    // Update interval when state changes
    useEffect(() => {
        const newInterval = calculateInterval();
        setState(prev => ({ ...prev, currentInterval: newInterval }));
    }, [state.isActive, state.isVisible, calculateInterval]);

    // Set up the polling interval
    useEffect(() => {
        // Clear existing interval
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        const currentInterval = calculateInterval();

        // Don't poll if interval is 0 (tab hidden with hiddenInterval: 0)
        if (currentInterval <= 0) {
            console.log('[SmartPolling] Polling paused (tab hidden or interval <= 0)');
            return;
        }

        console.log(`[SmartPolling] Setting interval to ${currentInterval}ms (visible: ${state.isVisible}, active: ${state.isActive})`);

        intervalRef.current = setInterval(() => {
            fetchFn();

            // Increase backoff multiplier when idle
            if (!stateRef.current.isActive && useExponentialBackoff) {
                backoffMultiplierRef.current = Math.min(backoffMultiplierRef.current * 1.5, 8);
            }
        }, currentInterval);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [state.isActive, state.isVisible, calculateInterval, fetchFn, useExponentialBackoff]);

    // Return state for debugging/UI purposes
    return {
        isVisible: state.isVisible,
        isActive: state.isActive,
        currentInterval: state.currentInterval,
        forceRefresh: fetchFn,
    };
}

/**
 * Simplified hook for message polling with sensible defaults for chat
 */
export function useMessagePolling(
    fetchMessages: () => void | Promise<void>,
    options?: {
        /** Fast interval when active (default: 8 seconds) */
        fastInterval?: number;
        /** Slow interval when idle (default: 30 seconds) */
        slowInterval?: number;
    }
) {
    return useSmartPolling(fetchMessages, {
        activeInterval: options?.fastInterval ?? 8000,   // 8 seconds when active
        idleInterval: options?.slowInterval ?? 30000,    // 30 seconds when idle
        hiddenInterval: 0,                                // Stop when hidden
        idleTimeout: 60000,                               // Idle after 1 minute
        useExponentialBackoff: true,
        maxInterval: 60000,                               // Max 1 minute
        fetchOnVisible: true,
        fetchOnActive: true,
    });
}

/**
 * Simplified hook for user presence polling with sensible defaults
 */
export function usePresencePolling(
    fetchUsers: () => void | Promise<void>,
    options?: {
        /** Fast interval when active (default: 30 seconds) */
        fastInterval?: number;
        /** Slow interval when idle (default: 2 minutes) */
        slowInterval?: number;
    }
) {
    return useSmartPolling(fetchUsers, {
        activeInterval: options?.fastInterval ?? 30000,  // 30 seconds when active
        idleInterval: options?.slowInterval ?? 120000,   // 2 minutes when idle
        hiddenInterval: 0,                                // Stop when hidden
        idleTimeout: 120000,                              // Idle after 2 minutes
        useExponentialBackoff: false,                     // Fixed slow interval
        fetchOnVisible: true,
        fetchOnActive: false,                             // Don't refetch users on every activity
    });
}

export default useSmartPolling;
