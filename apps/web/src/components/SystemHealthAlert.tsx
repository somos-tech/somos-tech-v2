import { useState, useEffect } from 'react';
import { AlertTriangle, XCircle, AlertCircle, CheckCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { runHealthChecks, healthToAlerts, quickHealthCheck, type SystemHealth, type HealthAlert } from '@/api/systemHealthService';

interface SystemHealthAlertProps {
  /** How often to run quick checks (ms) - default 30 seconds */
  pollInterval?: number;
  /** Whether to show the full health panel or just alerts */
  showFullPanel?: boolean;
  /** Callback when health status changes */
  onHealthChange?: (health: SystemHealth) => void;
}

export default function SystemHealthAlert({ 
  pollInterval = 30000, 
  showFullPanel = false,
  onHealthChange 
}: SystemHealthAlertProps) {
  const navigate = useNavigate();
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [alerts, setAlerts] = useState<HealthAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Run full health check on mount and periodically
  useEffect(() => {
    let mounted = true;
    
    const runCheck = async () => {
      try {
        const result = await runHealthChecks();
        if (mounted) {
          setHealth(result);
          setAlerts(healthToAlerts(result));
          setLastCheck(new Date());
          setLoading(false);
          onHealthChange?.(result);
        }
      } catch (error) {
        console.error('Health check failed:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Initial check
    runCheck();

    // Quick checks at interval
    const interval = setInterval(async () => {
      const quick = await quickHealthCheck();
      if (!quick.ok && mounted) {
        // If quick check finds issues, run full check
        runCheck();
      }
    }, pollInterval);

    // Full check every 5 minutes
    const fullCheckInterval = setInterval(runCheck, 5 * 60 * 1000);

    return () => {
      mounted = false;
      clearInterval(interval);
      clearInterval(fullCheckInterval);
    };
  }, [pollInterval, onHealthChange]);

  const handleRefresh = async () => {
    setLoading(true);
    const result = await runHealthChecks();
    setHealth(result);
    setAlerts(healthToAlerts(result));
    setLastCheck(new Date());
    setLoading(false);
    onHealthChange?.(result);
  };

  const dismissAlert = (alertId: string) => {
    setDismissed(prev => new Set([...prev, alertId]));
  };

  const activeAlerts = alerts.filter(a => !dismissed.has(a.id));

  // Don't show anything if everything is healthy and not showing full panel
  if (!showFullPanel && activeAlerts.length === 0 && !loading) {
    return null;
  }

  const getSeverityStyles = (severity: HealthAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return {
          bg: 'bg-red-500/10 border-red-500/30',
          icon: XCircle,
          iconColor: 'text-red-500',
          textColor: 'text-red-400'
        };
      case 'error':
        return {
          bg: 'bg-orange-500/10 border-orange-500/30',
          icon: AlertCircle,
          iconColor: 'text-orange-500',
          textColor: 'text-orange-400'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-500/10 border-yellow-500/30',
          icon: AlertTriangle,
          iconColor: 'text-yellow-500',
          textColor: 'text-yellow-400'
        };
    }
  };

  const getStatusColor = (status: 'healthy' | 'degraded' | 'critical') => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'degraded': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
    }
  };

  const getStatusIcon = (status: 'healthy' | 'degraded' | 'critical') => {
    switch (status) {
      case 'healthy': return CheckCircle;
      case 'degraded': return AlertTriangle;
      case 'critical': return XCircle;
    }
  };

  if (loading && !health) {
    return (
      <div className="flex items-center gap-2 text-gray-400 text-sm">
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span>Checking system health...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Critical/Warning Alerts Banner */}
      {activeAlerts.length > 0 && (
        <div className="space-y-2">
          {activeAlerts.map(alert => {
            const styles = getSeverityStyles(alert.severity);
            const Icon = styles.icon;
            
            return (
              <div
                key={alert.id}
                className={`${styles.bg} border rounded-lg p-4 flex items-start gap-3`}
              >
                <Icon className={`w-5 h-5 ${styles.iconColor} flex-shrink-0 mt-0.5`} />
                <div className="flex-1 min-w-0">
                  <h4 className={`font-medium ${styles.textColor}`}>{alert.title}</h4>
                  <p className="text-sm text-gray-400 mt-1">{alert.message}</p>
                  {alert.actionUrl && (
                    <button
                      onClick={() => navigate(alert.actionUrl!)}
                      className={`mt-2 text-sm ${styles.textColor} hover:underline inline-flex items-center gap-1`}
                    >
                      {alert.actionLabel || 'View Details'}
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => dismissAlert(alert.id)}
                  className="text-gray-500 hover:text-gray-300 transition-colors"
                  title="Dismiss alert"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Full Health Panel */}
      {showFullPanel && health && (
        <div className="bg-[#0D1520] border border-[#1E2D3D] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-white">System Health</h3>
              {(() => {
                const StatusIcon = getStatusIcon(health.overall);
                return (
                  <div className={`flex items-center gap-1.5 ${getStatusColor(health.overall)}`}>
                    <StatusIcon className="w-4 h-4" />
                    <span className="text-sm font-medium capitalize">{health.overall}</span>
                  </div>
                );
              })()}
            </div>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          <div className="space-y-3">
            {health.checks.map(check => {
              const StatusIcon = getStatusIcon(check.status);
              return (
                <div
                  key={check.name}
                  className="flex items-center justify-between py-2 border-b border-[#1E2D3D] last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <StatusIcon className={`w-4 h-4 ${getStatusColor(check.status)}`} />
                    <span className="text-gray-300">{check.name}</span>
                  </div>
                  <span className="text-sm text-gray-500">{check.message}</span>
                </div>
              );
            })}
          </div>

          {lastCheck && (
            <p className="text-xs text-gray-600 mt-4">
              Last checked: {lastCheck.toLocaleTimeString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
