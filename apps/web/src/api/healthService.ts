/**
 * API Health Monitoring Service
 * Provides health check functionality and monitoring for all API endpoints
 */

export interface HealthCheck {
  name: string;
  service: 'database' | 'api' | 'configuration' | 'external';
  status: 'healthy' | 'unhealthy' | 'warning';
  message: string;
  lastChecked: string;
  path?: string;
  method?: string;
  critical?: boolean;
  details?: Record<string, any>;
}

export interface HealthSummary {
  total: number;
  healthy: number;
  unhealthy: number;
  warning: number;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  responseTime: string;
  checks: HealthCheck[];
  summary: HealthSummary;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
}

const API_BASE = '/api';

/**
 * Get comprehensive health check (admin only)
 */
export async function getHealthCheck(): Promise<HealthCheckResponse> {
  try {
    const response = await fetch(`${API_BASE}/health/check`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch health check:', error);
    throw error;
  }
}

/**
 * Get quick health status (public)
 */
export async function getHealthStatus(): Promise<HealthStatus> {
  try {
    const response = await fetch(`${API_BASE}/health/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Health status failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch health status:', error);
    throw error;
  }
}

/**
 * Health monitoring hook state
 */
export interface HealthMonitorState {
  isHealthy: boolean;
  lastCheck: string | null;
  failedChecks: string[];
  loading: boolean;
  error: string | null;
}

/**
 * Check if system is healthy
 */
export function isSystemHealthy(healthData: HealthCheckResponse): boolean {
  return healthData.status === 'healthy' && healthData.summary.unhealthy === 0;
}

/**
 * Get failed critical checks
 */
export function getCriticalFailures(healthData: HealthCheckResponse): HealthCheck[] {
  return healthData.checks.filter(
    check => check.critical && check.status === 'unhealthy'
  );
}

/**
 * Format response time
 */
export function formatResponseTime(responseTime: string): string {
  return responseTime;
}

/**
 * Get status color
 */
export function getStatusColor(status: 'healthy' | 'unhealthy' | 'warning'): string {
  switch (status) {
    case 'healthy':
      return 'text-green-600';
    case 'warning':
      return 'text-yellow-600';
    case 'unhealthy':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
}

/**
 * Get status background color
 */
export function getStatusBgColor(status: 'healthy' | 'unhealthy' | 'warning'): string {
  switch (status) {
    case 'healthy':
      return 'bg-green-50';
    case 'warning':
      return 'bg-yellow-50';
    case 'unhealthy':
      return 'bg-red-50';
    default:
      return 'bg-gray-50';
  }
}

/**
 * Get status badge color
 */
export function getStatusBadgeColor(status: 'healthy' | 'unhealthy' | 'warning'): string {
  switch (status) {
    case 'healthy':
      return 'bg-green-100 text-green-800';
    case 'warning':
      return 'bg-yellow-100 text-yellow-800';
    case 'unhealthy':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Format timestamp to relative time
 */
export function formatLastChecked(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
}
