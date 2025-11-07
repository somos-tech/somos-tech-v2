import { Configuration, LogLevel } from '@azure/msal-browser';

export const msalConfig: Configuration = {
    auth: {
        clientId: import.meta.env.VITE_AZURE_CLIENT_ID || '',
        authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID || 'common'}`,
        redirectUri: import.meta.env.VITE_REDIRECT_URI || window.location.origin,
        postLogoutRedirectUri: window.location.origin,
    },
    cache: {
        cacheLocation: 'localStorage', // Use 'sessionStorage' for more security
        storeAuthStateInCookie: false, // Set to true if you have issues on IE11 or Edge
    },
    system: {
        loggerOptions: {
            loggerCallback: (level, message, containsPii) => {
                if (containsPii) {
                    return;
                }
                switch (level) {
                    case LogLevel.Error:
                        console.error(message);
                        return;
                    case LogLevel.Info:
                        console.info(message);
                        return;
                    case LogLevel.Verbose:
                        console.debug(message);
                        return;
                    case LogLevel.Warning:
                        console.warn(message);
                        return;
                }
            },
        },
    },
};

// Scopes you need for your API
export const loginRequest = {
    scopes: ['User.Read'], // Basic Microsoft Graph scope
};

// Scopes for your backend API (OBO flow)
export const apiRequest = {
    scopes: [
        `api://${import.meta.env.VITE_AZURE_CLIENT_ID}/access_as_user`,
    ],
};

// For admin operations requiring Microsoft Graph
export const graphRequest = {
    scopes: ['User.Read', 'User.ReadBasic.All'],
};
