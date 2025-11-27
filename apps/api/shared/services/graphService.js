/**
 * Microsoft Graph Service
 * Provides access to Microsoft Graph API for Entra ID sign-in logs and user data
 */

import { ConfidentialClientApplication } from '@azure/msal-node';

// Cache for the MSAL client
let msalClient = null;

/**
 * Get or create MSAL client for app-only authentication
 */
function getMsalClient() {
  if (msalClient) {
    return msalClient;
  }

  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;
  const tenantId = process.env.AZURE_TENANT_ID;

  if (!clientId || !clientSecret || !tenantId) {
    console.log('[GraphService] Missing Azure AD credentials - Graph API disabled');
    return null;
  }

  const msalConfig = {
    auth: {
      clientId,
      clientSecret,
      authority: `https://login.microsoftonline.com/${tenantId}`
    }
  };

  msalClient = new ConfidentialClientApplication(msalConfig);
  return msalClient;
}

/**
 * Get access token for Microsoft Graph API
 */
async function getAccessToken() {
  const client = getMsalClient();
  if (!client) {
    return null;
  }

  try {
    const result = await client.acquireTokenByClientCredential({
      scopes: ['https://graph.microsoft.com/.default']
    });
    return result?.accessToken;
  } catch (error) {
    console.error('[GraphService] Failed to acquire token:', error.message);
    return null;
  }
}

/**
 * Make a request to Microsoft Graph API
 * @param {string} endpoint - Graph API endpoint
 * @param {Object} options - Fetch options
 */
async function graphRequest(endpoint, options = {}) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return null;
  }

  const url = endpoint.startsWith('https://') 
    ? endpoint 
    : `https://graph.microsoft.com/v1.0${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[GraphService] API error:', response.status, errorText);
    return null;
  }

  return response.json();
}

/**
 * Get the latest sign-in for a user by their User Principal Name (email)
 * @param {string} userPrincipalName - User's email/UPN
 * @returns {Promise<Object|null>} Latest sign-in with location data
 */
async function getLatestSignIn(userPrincipalName) {
  try {
    // Query sign-in logs for the user, get the most recent one
    const endpoint = `/auditLogs/signIns?$filter=userPrincipalName eq '${encodeURIComponent(userPrincipalName)}'&$top=1&$orderby=createdDateTime desc&$select=id,createdDateTime,ipAddress,location,deviceDetail,clientAppUsed,status`;
    
    const result = await graphRequest(endpoint);
    
    if (!result?.value?.length) {
      console.log('[GraphService] No sign-in logs found for:', userPrincipalName);
      return null;
    }

    const signIn = result.value[0];
    
    return {
      signInId: signIn.id,
      signInTime: signIn.createdDateTime,
      ipAddress: signIn.ipAddress,
      location: signIn.location ? {
        city: signIn.location.city || null,
        state: signIn.location.state || null,
        country: signIn.location.countryOrRegion || null,
        latitude: signIn.location.geoCoordinates?.latitude || null,
        longitude: signIn.location.geoCoordinates?.longitude || null
      } : null,
      device: signIn.deviceDetail ? {
        browser: signIn.deviceDetail.browser || null,
        operatingSystem: signIn.deviceDetail.operatingSystem || null,
        deviceId: signIn.deviceDetail.deviceId || null
      } : null,
      clientApp: signIn.clientAppUsed || null,
      status: signIn.status?.errorCode === 0 ? 'success' : 'failed'
    };
  } catch (error) {
    console.error('[GraphService] Error fetching sign-in:', error.message);
    return null;
  }
}

/**
 * Get sign-in history for a user
 * @param {string} userPrincipalName - User's email/UPN
 * @param {number} limit - Number of records to fetch (default 10)
 * @returns {Promise<Array>} Sign-in history
 */
async function getSignInHistory(userPrincipalName, limit = 10) {
  try {
    const endpoint = `/auditLogs/signIns?$filter=userPrincipalName eq '${encodeURIComponent(userPrincipalName)}'&$top=${limit}&$orderby=createdDateTime desc&$select=id,createdDateTime,ipAddress,location,deviceDetail,status`;
    
    const result = await graphRequest(endpoint);
    
    if (!result?.value?.length) {
      return [];
    }

    return result.value.map(signIn => ({
      signInId: signIn.id,
      signInTime: signIn.createdDateTime,
      ipAddress: signIn.ipAddress,
      location: signIn.location ? {
        city: signIn.location.city || null,
        state: signIn.location.state || null,
        country: signIn.location.countryOrRegion || null
      } : null,
      device: signIn.deviceDetail ? {
        browser: signIn.deviceDetail.browser || null,
        operatingSystem: signIn.deviceDetail.operatingSystem || null
      } : null,
      status: signIn.status?.errorCode === 0 ? 'success' : 'failed'
    }));
  } catch (error) {
    console.error('[GraphService] Error fetching sign-in history:', error.message);
    return [];
  }
}

/**
 * Get user by ID from Entra ID
 * @param {string} userId - User ID (object ID in Entra)
 * @returns {Promise<Object|null>} User data
 */
async function getEntraUser(userId) {
  try {
    const result = await graphRequest(`/users/${userId}?$select=id,displayName,mail,userPrincipalName,accountEnabled,createdDateTime`);
    return result;
  } catch (error) {
    console.error('[GraphService] Error fetching user:', error.message);
    return null;
  }
}

/**
 * Check if Graph API is configured and available
 */
function isGraphEnabled() {
  return !!(process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET && process.env.AZURE_TENANT_ID);
}

export {
  getLatestSignIn,
  getSignInHistory,
  getEntraUser,
  isGraphEnabled
};
