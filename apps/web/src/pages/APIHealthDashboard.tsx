import { useEffect, useState } from 'react';
import type React from 'react';
import { Activity, AlertCircle, CheckCircle, AlertTriangle, RefreshCw, Clock, Server, Database, Settings, Zap } from 'lucide-react';
import { 
  getHealthCheck, 
  type HealthCheckResponse, 
  type HealthCheck,
  getStatusColor,
  getStatusBgColor,
  getStatusBadgeColor,
  formatLastChecked
} from '../api/healthService';
import { Alert } from '../components/ui/alert';

/**
 * API Health Dashboard Page
 * Comprehensive view of all API health checks with status, timestamps, and error details
 */
export default function APIHealthDashboard() {
  const [healthData, setHealthData] = useState<HealthCheckResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    fetchHealth();
    
    if (autoRefresh) {
      const interval = setInterval(fetchHealth, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getHealthCheck();
      setHealthData(data);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch health data');
      console.error('Failed to fetch health check:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualRefresh = () => {
    fetchHealth();
  };

  const getServiceIcon = (service: string) => {
    switch (service) {
      case 'database':
        return <Database className="h-5 w-5" />;
      case 'api':
        return <Zap className="h-5 w-5" />;
      case 'configuration':
        return <Settings className="h-5 w-5" />;
      case 'external':
        return <Server className="h-5 w-5" />;
      default:
        return <Activity className="h-5 w-5" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'unhealthy':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Activity className="h-5 w-5 text-gray-600" />;
    }
  };

  if (loading && !healthData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading health data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Activity className="h-8 w-8 text-blue-600" />
                API Health Dashboard
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Monitor the health and status of all API endpoints and services
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
              </div>
              
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Auto-refresh
              </label>
              
              <button
                onClick={handleManualRefresh}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </Alert>
        )}

        {healthData && (
          <>
            {/* Overall Status Card */}
            <div className={`rounded-lg shadow-lg p-6 mb-8 ${
              healthData.status === 'healthy' ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {healthData.status === 'healthy' ? (
                    <CheckCircle className="h-12 w-12 text-green-600" />
                  ) : (
                    <AlertCircle className="h-12 w-12 text-red-600" />
                  )}
                  <div>
                    <h2 className={`text-2xl font-bold ${
                      healthData.status === 'healthy' ? 'text-green-900' : 'text-red-900'
                    }`}>
                      System Status: {healthData.status === 'healthy' ? 'Healthy' : 'Unhealthy'}
                    </h2>
                    <p className={`text-sm ${
                      healthData.status === 'healthy' ? 'text-green-700' : 'text-red-700'
                    }`}>
                      All systems are {healthData.status === 'healthy' ? 'operational' : 'experiencing issues'}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-sm text-gray-600 mb-1">Response Time</div>
                  <div className="text-2xl font-bold text-gray-900">{healthData.responseTime}</div>
                </div>
              </div>
              
              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-4 mt-6">
                <div className="bg-white rounded-lg p-4 shadow">
                  <div className="text-sm text-gray-600">Total Checks</div>
                  <div className="text-2xl font-bold text-gray-900">{healthData.summary.total}</div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow">
                  <div className="text-sm text-gray-600">Healthy</div>
                  <div className="text-2xl font-bold text-green-600">{healthData.summary.healthy}</div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow">
                  <div className="text-sm text-gray-600">Warnings</div>
                  <div className="text-2xl font-bold text-yellow-600">{healthData.summary.warning}</div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow">
                  <div className="text-sm text-gray-600">Unhealthy</div>
                  <div className="text-2xl font-bold text-red-600">{healthData.summary.unhealthy}</div>
                </div>
              </div>
            </div>

            {/* Service Checks */}
            <div className="space-y-6">
              {/* Group checks by service type */}
              {['database', 'configuration', 'api'].map((serviceType) => {
                const serviceChecks = healthData.checks.filter(c => c.service === serviceType);
                if (serviceChecks.length === 0) return null;

                return (
                  <div key={serviceType} className="bg-white rounded-lg shadow-lg overflow-hidden">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        {getServiceIcon(serviceType)}
                        {serviceType.charAt(0).toUpperCase() + serviceType.slice(1)} Services
                      </h3>
                    </div>
                    
                    <div className="divide-y divide-gray-200">
                      {serviceChecks.map((check, index) => (
                        <HealthCheckCard key={index} check={check} getStatusIcon={getStatusIcon} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Individual Health Check Card Component
 */
function HealthCheckCard({ 
  check, 
  getStatusIcon 
}: { 
  check: HealthCheck; 
  getStatusIcon: (status: string) => React.ReactElement;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`p-6 ${getStatusBgColor(check.status)} hover:bg-opacity-50 transition-colors`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4 flex-1">
          <div className="mt-0.5">{getStatusIcon(check.status)}</div>
          
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h4 className="text-lg font-semibold text-gray-900">{check.name}</h4>
              <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusBadgeColor(check.status)}`}>
                {check.status.toUpperCase()}
              </span>
              {check.critical && (
                <span className="px-2 py-1 text-xs font-medium rounded bg-purple-100 text-purple-800">
                  CRITICAL
                </span>
              )}
            </div>
            
            <p className={`text-sm ${getStatusColor(check.status)} mb-2`}>
              {check.message}
            </p>
            
            <div className="flex items-center gap-4 text-xs text-gray-600">
              {check.path && (
                <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                  {check.method} {check.path}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatLastChecked(check.lastChecked)}
              </span>
            </div>
            
            {/* Details Section */}
            {check.details && Object.keys(check.details).length > 0 && (
              <div className="mt-3">
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  {expanded ? 'Hide Details' : 'Show Details'}
                </button>
                
                {expanded && (
                  <div className="mt-2 bg-white rounded p-3 text-xs">
                    <pre className="overflow-x-auto text-gray-700">
                      {JSON.stringify(check.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
