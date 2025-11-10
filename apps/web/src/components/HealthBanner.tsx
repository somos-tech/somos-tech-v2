import { useEffect, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { getHealthCheck, type HealthCheckResponse, getCriticalFailures } from '../api/healthService';
import { useAuth } from '../hooks/useAuth';

/**
 * Health Banner Component
 * Displays a red banner at the top of the admin portal when APIs are unhealthy
 */
export function HealthBanner() {
  const { user } = useAuth();
  const [healthData, setHealthData] = useState<HealthCheckResponse | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Only check health if user is an admin
  const isAdmin = user?.userRoles?.includes('admin') || user?.userRoles?.includes('administrator');

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    // Check health on mount and every 60 seconds
    checkHealth();
    const interval = setInterval(checkHealth, 60000);

    return () => clearInterval(interval);
  }, [isAdmin]);

  useEffect(() => {
    // Show banner if system is unhealthy and not dismissed
    if (healthData && healthData.status === 'unhealthy' && !isDismissed) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [healthData, isDismissed]);

  const checkHealth = async () => {
    try {
      const data = await getHealthCheck();
      setHealthData(data);
      
      // Reset dismissed state if system becomes healthy
      if (data.status === 'healthy') {
        setIsDismissed(false);
      }
    } catch (error) {
      console.error('Health check failed:', error);
      // Don't show banner on fetch errors to avoid false alarms
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  if (!isVisible || !healthData) {
    return null;
  }

  const criticalFailures = getCriticalFailures(healthData);
  const failureCount = healthData.summary.unhealthy;

  return (
    <div className="bg-red-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-3 flex items-center justify-between">
          <div className="flex items-center flex-1">
            <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-sm">
                System Health Alert: {failureCount} {failureCount === 1 ? 'service' : 'services'} experiencing issues
              </p>
              {criticalFailures.length > 0 && (
                <p className="text-xs mt-1 opacity-90">
                  Critical: {criticalFailures.map(f => f.name).join(', ')}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3 ml-4">
            <a
              href="/admin/health"
              className="text-xs font-medium underline hover:no-underline whitespace-nowrap"
            >
              View Details
            </a>
            <button
              onClick={handleDismiss}
              className="p-1 rounded hover:bg-red-700 transition-colors"
              aria-label="Dismiss alert"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
