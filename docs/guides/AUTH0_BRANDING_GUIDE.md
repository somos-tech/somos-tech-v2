# Auth0 Universal Login Branding Guide for SOMOS.tech

This guide explains how to customize the Auth0 Universal Login page to match the SOMOS.tech brand.

## SOMOS.tech Brand Colors

| Color Name | Hex Code | Usage |
|------------|----------|-------|
| Dark Background | `#051323` | Page background, dark surfaces |
| Neon Green (Primary) | `#00FF91` | Primary buttons, accents, highlights |
| Light Gray | `#8394A7` | Secondary text, subtle elements |
| White | `#FFFFFF` | Primary text, headings |
| Dark Blue | `#0a1f35` | Cards, panels, input backgrounds |

## Method 1: Auth0 Dashboard (Recommended)

### Step 1: Access Universal Login Settings

1. Log into [Auth0 Dashboard](https://manage.auth0.com/)
2. Navigate to **Branding** → **Universal Login** → **Customization Options**

### Step 2: Configure Colors

In the **Colors** section, set:

| Element | Color |
|---------|-------|
| Primary Button Color | `#00FF91` |
| Primary Button Text | `#051323` |
| Page Background Color | `#051323` |
| Widget Background Color | `#0a1f35` |
| Widget Border Color | `rgba(0, 255, 145, 0.2)` |
| Base Focus Color | `#00FF91` |
| Base Hover Color | `rgba(0, 255, 145, 0.3)` |
| Input Background Color | `#051323` |
| Input Border Color | `rgba(0, 255, 145, 0.3)` |
| Input Text Color | `#FFFFFF` |
| Link Color | `#00FF91` |
| Body Text Color | `#FFFFFF` |
| Secondary Text | `#8394A7` |
| Error Color | `#ef4444` |
| Success Color | `#00FF91` |

### Step 3: Configure Fonts

Recommended font settings:
- **Font URL**: `https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap`
- **Font Family**: `'Inter', sans-serif`
- **Heading Font Weight**: `700`
- **Body Font Weight**: `400`

### Step 4: Configure Logo and Favicon

Upload the following assets:
- **Logo**: SOMOS.tech logo (max 150x150px)
- **Favicon**: SOMOS.tech favicon (32x32px)

Logo URL for reference:
```
https://stsomostechdev64qb73pzvg.blob.core.windows.net/site-branding/shortcircle.png
```

### Step 5: Configure Page Layout

- **Template**: Use "Center" or "Left Aligned" template
- **Widget Position**: Center
- **Widget Corner Radius**: `12px`
- **Widget Shadow**: Medium shadow for glassmorphism effect

### Step 6: Custom Text

Navigate to **Branding** → **Universal Login** → **Text Customization**

Set custom text:

| Key | Value |
|-----|-------|
| Page Title | Sign in to SOMOS.tech |
| Logo Alt Text | SOMOS.tech |
| Sign Up Link Text | Become a member |
| Sign Up Action Text | Create your account to join the SOMOS community |

### Step 7: Save and Publish

Click **Save and Publish** to apply changes.

---

## Method 2: Management API

You can also update Auth0 branding programmatically using the Management API.

### Prerequisites

1. Create a Machine-to-Machine application in Auth0
2. Grant it the `update:branding` scope
3. Get the Client ID and Client Secret

### API Endpoints

**Update Branding Theme:**
```bash
PATCH https://YOUR_DOMAIN.auth0.com/api/v2/branding/themes/default
```

**Request Body:**
```json
{
  "colors": {
    "primary_button": "#00FF91",
    "primary_button_label": "#051323",
    "page_background": {
      "type": "solid",
      "color": "#051323"
    },
    "widget": {
      "background": "#0a1f35",
      "border": "rgba(0, 255, 145, 0.2)"
    }
  },
  "fonts": {
    "font_url": "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
    "body_text": {
      "bold": false,
      "size": 14
    },
    "title": {
      "bold": true,
      "size": 24
    }
  },
  "widget": {
    "border_radius": 12,
    "shadow": "medium"
  }
}
```

---

## Method 3: Using the Auth0 MCP Server (CLI)

If you have the Auth0 MCP server installed, you can use it to update branding:

```bash
# Install if not already installed
npx @auth0/auth0-mcp-server init --client cursor

# The MCP server can be used to manage Auth0 configuration
# Refer to Auth0 MCP documentation for specific commands
```

---

## Testing Your Changes

After making changes:

1. Navigate to your login URL: `https://dev.somos.tech/.auth/login/auth0`
2. Verify users see `auth.somos.tech` in the URL (not `dev-0tp5bbdn7af0lfpv.us.auth0.com`)
3. Verify the branding appears correctly
4. Test on mobile devices for responsiveness
5. Check that error states use correct colors

---

## Troubleshooting

### Changes Not Appearing

1. Clear browser cache
2. Use incognito/private browsing
3. Wait 1-2 minutes for changes to propagate
4. Ensure you clicked "Save and Publish"

### Logo Not Loading

1. Verify logo URL is publicly accessible
2. Check logo file size (max 100KB recommended)
3. Use PNG format with transparency

### Colors Look Different

1. Some browsers render colors differently
2. Test in Chrome, Firefox, Safari, and Edge
3. Use sRGB color space for consistency

---

## Related Documentation

- [Auth0 Universal Login Customization](https://auth0.com/docs/customize/login-pages/universal-login)
- [Auth0 Branding API Reference](https://auth0.com/docs/api/management/v2/branding)
- [SOMOS.tech Authentication Setup](./AUTHENTICATION_SETUP.md)
