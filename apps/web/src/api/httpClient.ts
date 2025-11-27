/**
 * HTTP Client Configuration
 * 
 * IMPORTANT: In production, API calls MUST go through the Static Web App proxy
 * to get authentication headers (x-ms-client-principal). 
 * 
 * - Local development: Use VITE_API_URL=http://localhost:7071 for direct Function calls
 * - Production: Leave VITE_API_URL unset so calls use relative paths (/api/...)
 * 
 * Direct calls to the Azure Functions URL will NOT have auth headers and will fail!
 */

// Only use VITE_API_URL in development (localhost)
const isLocalDev = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const rawApiOrigin = isLocalDev ? import.meta.env.VITE_API_URL?.trim() : '';
const normalizedOrigin = rawApiOrigin ? rawApiOrigin.replace(/\/$/, '') : '';
const defaultApiBase = '/api';
const apiBase = normalizedOrigin ? `${normalizedOrigin}${defaultApiBase}` : defaultApiBase;

const stripApiPrefix = (path: string): string => {
  if (!path) {
    return '';
  }

  if (path.startsWith('/api/')) {
    return path.substring(4);
  }

  if (path === '/api') {
    return '';
  }

  return path.startsWith('/') ? path.substring(1) : path;
};

/**
 * Build a URL that targets the Azure Functions API.
 * Accepts either `/foo` or `foo` and automatically ensures the `/api` prefix.
 */
export const apiUrl = (path = ''): string => {
  const suffix = stripApiPrefix(path);
  return suffix ? `${apiBase}/${suffix}` : apiBase;
};
