/**
 * Admin Security Service
 * 
 * Monitors admin access patterns, detects anomalies, and provides
 * security alerts for the admin dashboard.
 * 
 * Security checks include:
 * - New admin user creation alerts
 * - Missing audit trail detection
 * - Unauthorized domain access attempts
 * - Potential bypass account detection
 */

export interface SecurityAnomaly {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  details?: Array<Record<string, unknown>>;
  recommendation: string;
}

export interface AdminSecuritySummary {
  totalAdmins: number;
  activeAdmins: number;
  addedLast24Hours: number;
  addedLastWeek: number;
  addedLastMonth: number;
  withAuditTrail: number;
  withoutAuditTrail: number;
  somostechDomain: number;
  otherDomains: number;
  admins: AdminRecord[];
}

export interface AdminRecord {
  email: string;
  status: string;
  createdAt: string;
  createdBy: string;
  lastLogin?: string;
  roles: string[];
}

export interface SecurityAnomalyReport {
  checked: string;
  anomalyCount: number;
  hasHighSeverity: boolean;
  anomalies: SecurityAnomaly[];
}

export interface SecurityReport {
  generatedAt: string;
  summary: AdminSecuritySummary;
  anomalies: {
    count: number;
    hasHighSeverity: boolean;
    items: SecurityAnomaly[];
  };
  recentEvents: SecurityEvent[];
}

export interface SecurityEvent {
  id: string;
  type: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

export interface SecurityAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  source: string;
  actionUrl?: string;
  actionLabel?: string;
  details?: unknown;
}

/**
 * Fetch admin security summary
 */
export async function getSecuritySummary(): Promise<AdminSecuritySummary> {
  const response = await fetch('/api/security-admin/summary', {
    credentials: 'include',
    headers: { 'Accept': 'application/json' }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch security summary: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Check for security anomalies
 */
export async function checkAnomalies(): Promise<SecurityAnomalyReport> {
  const response = await fetch('/api/security-admin/anomalies', {
    credentials: 'include',
    headers: { 'Accept': 'application/json' }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to check anomalies: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Get full security report
 */
export async function getSecurityReport(): Promise<SecurityReport> {
  const response = await fetch('/api/security-admin/report', {
    credentials: 'include',
    headers: { 'Accept': 'application/json' }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get security report: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Get recent security events
 */
export async function getSecurityEvents(hours: number = 24): Promise<SecurityEvent[]> {
  const response = await fetch(`/api/security-admin/events?hours=${hours}`, {
    credentials: 'include',
    headers: { 'Accept': 'application/json' }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get security events: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Verify if an email has authorized admin access
 */
export async function verifyAdminAccess(email: string): Promise<{
  email: string;
  isAuthorized: boolean;
  reason: string;
  userRecord?: AdminRecord;
}> {
  const response = await fetch('/api/security-admin/verify-admin', {
    method: 'POST',
    credentials: 'include',
    headers: { 
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to verify admin: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Log a security event
 */
export async function logSecurityEvent(eventType: string, details: Record<string, unknown>): Promise<void> {
  await fetch('/api/security-admin/log', {
    method: 'POST',
    credentials: 'include',
    headers: { 
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ eventType, details })
  });
}

/**
 * Convert security anomalies to dashboard alerts
 */
export function anomaliesToAlerts(anomalies: SecurityAnomaly[]): SecurityAlert[] {
  return anomalies.map((anomaly, index) => ({
    id: `security-${anomaly.type}-${index}`,
    severity: anomaly.severity,
    title: anomaly.title,
    message: anomaly.message,
    timestamp: new Date(),
    source: 'Security Audit',
    actionUrl: '/admin/security',
    actionLabel: 'View Details',
    details: anomaly.details
  }));
}

/**
 * Run a quick security check - suitable for periodic polling
 */
export async function quickSecurityCheck(): Promise<{
  ok: boolean;
  alerts: SecurityAlert[];
}> {
  try {
    const report = await checkAnomalies();
    
    if (report.anomalyCount === 0) {
      return { ok: true, alerts: [] };
    }
    
    const alerts = anomaliesToAlerts(report.anomalies);
    
    return {
      ok: !report.hasHighSeverity,
      alerts
    };
  } catch (error) {
    console.error('Security check failed:', error);
    return {
      ok: false,
      alerts: [{
        id: 'security-check-failed',
        severity: 'high',
        title: 'Security Check Failed',
        message: error instanceof Error ? error.message : 'Could not complete security audit',
        timestamp: new Date(),
        source: 'Security Service'
      }]
    };
  }
}

/**
 * Get severity color for UI display
 */
export function getSeverityColor(severity: SecurityAnomaly['severity']): string {
  switch (severity) {
    case 'critical': return '#ef4444'; // red-500
    case 'high': return '#f97316'; // orange-500
    case 'medium': return '#eab308'; // yellow-500
    case 'low': return '#3b82f6'; // blue-500
    default: return '#6b7280'; // gray-500
  }
}

/**
 * Get severity background for UI display
 */
export function getSeverityBg(severity: SecurityAnomaly['severity']): string {
  switch (severity) {
    case 'critical': return 'rgba(239, 68, 68, 0.1)';
    case 'high': return 'rgba(249, 115, 22, 0.1)';
    case 'medium': return 'rgba(234, 179, 8, 0.1)';
    case 'low': return 'rgba(59, 130, 246, 0.1)';
    default: return 'rgba(107, 114, 128, 0.1)';
  }
}

export default {
  getSecuritySummary,
  checkAnomalies,
  getSecurityReport,
  getSecurityEvents,
  verifyAdminAccess,
  logSecurityEvent,
  anomaliesToAlerts,
  quickSecurityCheck,
  getSeverityColor,
  getSeverityBg
};
