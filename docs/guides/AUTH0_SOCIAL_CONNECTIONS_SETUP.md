# Auth0 Social Connections Setup - Remove Dev Keys Warning

This guide explains how to configure production OAuth credentials for Google and LinkedIn social connections in Auth0 to remove the "Dev Keys" warning.

## Why This Warning Appears

Auth0 provides default "development keys" for quick testing of social logins. However, these have significant limitations:
- Shows Auth0's logo instead of yours on consent screens
- SSO won't work properly
- MFA won't function correctly
- Not suitable for production use

## Fix: Configure Production Keys

### Step 1: Set Up Google OAuth Credentials

#### 1.1 Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Name it something like "SOMOS.tech Production"

#### 1.2 Configure OAuth Consent Screen

1. Navigate to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type
3. Fill in the required fields:
   - **App name**: `SOMOS.tech`
   - **User support email**: Your support email
   - **App logo**: Upload SOMOS.tech logo
   - **Application home page**: `https://somos.tech`
   - **Application privacy policy**: `https://somos.tech/privacy`
   - **Application terms of service**: `https://somos.tech/terms`
   - **Authorized domains**: Add `somos.tech` and `auth0.com`
   - **Developer contact email**: Your email

4. Click **Save and Continue**
5. On Scopes page, add:
   - `email`
   - `profile`
   - `openid`
6. Click **Save and Continue**

#### 1.3 Create OAuth Client ID

1. Navigate to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. Select **Web application**
4. Configure:
   - **Name**: `Auth0 SOMOS.tech`
   - **Authorized JavaScript origins**: 
     - `https://dev-0tp5bbdn7af0lfpv.us.auth0.com`
   - **Authorized redirect URIs**:
     - `https://dev-0tp5bbdn7af0lfpv.us.auth0.com/login/callback`

5. Click **Create**
6. **Copy the Client ID and Client Secret** - you'll need these!

#### 1.4 Update Auth0 Google Connection

1. Log into [Auth0 Dashboard](https://manage.auth0.com/)
2. Navigate to **Authentication** → **Social**
3. Click on **Google**
4. Replace the development keys with your production keys:
   - **Client ID**: Paste your Google Client ID
   - **Client Secret**: Paste your Google Client Secret
5. Click **Save**

---

### Step 2: Set Up LinkedIn OAuth Credentials

#### 2.1 Create LinkedIn App

1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/apps)
2. Click **Create app**
3. Fill in:
   - **App name**: `SOMOS.tech`
   - **LinkedIn Page**: Select or create your company page
   - **App logo**: Upload SOMOS.tech logo
   - **Legal agreement**: Check the box
4. Click **Create app**

#### 2.2 Configure App Settings

1. Go to the **Auth** tab
2. Under **OAuth 2.0 settings**:
   - Add **Authorized redirect URLs**:
     - `https://dev-0tp5bbdn7af0lfpv.us.auth0.com/login/callback`

#### 2.3 Request API Products

1. Go to the **Products** tab
2. Request access to:
   - **Sign In with LinkedIn using OpenID Connect** (required for login)
3. Wait for approval (usually instant for Sign In with LinkedIn)

#### 2.4 Get Credentials

1. Go to the **Auth** tab
2. Copy:
   - **Client ID**
   - **Client Secret** (click the eye icon to reveal)

#### 2.5 Update Auth0 LinkedIn Connection

1. Log into [Auth0 Dashboard](https://manage.auth0.com/)
2. Navigate to **Authentication** → **Social**
3. Click on **LinkedIn**
4. Replace the development keys with your production keys:
   - **API Key**: Paste your LinkedIn Client ID
   - **Secret Key**: Paste your LinkedIn Client Secret
5. Click **Save**

---

## Verify the Fix

After updating both connections:

1. Clear your browser cache or use incognito mode
2. Navigate to `https://dev.somos.tech/.auth/login/auth0`
3. The "Dev Keys" warning should no longer appear
4. Test logging in with both Google and LinkedIn

---

## Quick Reference: Auth0 Callback URLs

Since you're using a custom domain (`auth.somos.tech`), use these callback URLs:

**Primary (Custom Domain):**
```
https://auth.somos.tech/login/callback
```

**Fallback (Default Domain) - keep both configured:**
```
https://dev-0tp5bbdn7af0lfpv.us.auth0.com/login/callback
```

> **Important**: Add BOTH callback URLs to Google and LinkedIn OAuth settings. This ensures login works during the transition and as a fallback.

---

## Auth0 Application Settings

In your Auth0 Application settings, ensure these URLs are configured:

### Allowed Callback URLs
```
https://dev.somos.tech/.auth/login/auth0/callback,
https://somos.tech/.auth/login/auth0/callback
```

### Allowed Logout URLs (CRITICAL - Must Match Exactly)

These URLs must be configured **exactly** with no trailing spaces or slashes:

```
https://dev.somos.tech
https://dev.somos.tech/.auth/logout/complete
https://swa-somos-tech-dev-64qb73pzvgekw.westus2.azurestaticapps.net
https://swa-somos-tech-dev-64qb73pzvgekw.westus2.azurestaticapps.net/.auth/logout/complete
https://somos.tech
https://somos.tech/.auth/logout/complete
```

> **⚠️ IMPORTANT**: If logout shows "Oops! something went wrong", the `post_logout_redirect_uri` isn't in this list. Auth0 requires an EXACT match.

### Allowed Web Origins
```
https://dev.somos.tech,
https://somos.tech
```

---

## Troubleshooting

### Warning Still Appears
- Ensure you saved the changes in Auth0
- Clear browser cache completely
- Wait 1-2 minutes for changes to propagate

### Google Login Fails
- Verify the redirect URI matches exactly
- Check that the OAuth consent screen is configured
- Ensure the Google+ API or People API is enabled

### LinkedIn Login Fails
- Verify you have "Sign In with LinkedIn using OpenID Connect" product
- Check redirect URL matches exactly (no trailing slashes)
- Ensure Client ID and Secret are correct

---

## Security Best Practices

1. **Never commit credentials to git** - Use environment variables or Auth0's secure storage
2. **Restrict authorized domains** - Only add domains you own
3. **Review OAuth consent screen** - Ensure branding matches your app
4. **Monitor usage** - Set up alerts for unusual authentication patterns

---

## Related Documentation

- [Auth0 Google Connection](https://auth0.com/docs/authenticate/identity-providers/social-identity-providers/google)
- [Auth0 LinkedIn Connection](https://auth0.com/docs/authenticate/identity-providers/social-identity-providers/linkedin)
- [Google OAuth Setup](https://developers.google.com/identity/protocols/oauth2)
- [LinkedIn OAuth Setup](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow)
