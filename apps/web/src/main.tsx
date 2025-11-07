import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MsalProvider } from '@azure/msal-react'
import { PublicClientApplication, EventType } from '@azure/msal-browser'
import { msalConfig } from '@/config/msalConfig'
import './index.css'
import App from './App'

// Create MSAL instance
const msalInstance = new PublicClientApplication(msalConfig);

// Account selection logic (optional)
msalInstance.initialize().then(() => {
  // Handle redirect promise
  msalInstance.handleRedirectPromise().then((response) => {
    if (response) {
      console.log('Login successful:', response.account);
    }
  }).catch((error) => {
    console.error('Redirect error:', error);
  });

  // Optional: Default account selection logic
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length > 0) {
    msalInstance.setActiveAccount(accounts[0]);
  }

  msalInstance.addEventCallback((event: any) => {
    if (event.eventType === EventType.LOGIN_SUCCESS && event.payload.account) {
      const account = event.payload.account;
      msalInstance.setActiveAccount(account);
    }
  });
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MsalProvider instance={msalInstance}>
      <App />
    </MsalProvider>
  </StrictMode>,
)
