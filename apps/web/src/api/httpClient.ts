const rawApiOrigin = import.meta.env.VITE_API_URL?.trim();
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
