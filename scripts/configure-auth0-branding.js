/**
 * Auth0 Universal Login Branding Configuration Script
 * 
 * This script updates the Auth0 Universal Login page with SOMOS.tech branding.
 * 
 * Prerequisites:
 * 1. Create a Machine-to-Machine application in Auth0
 * 2. Grant it the `update:branding` scope
 * 3. Set environment variables:
 *    - AUTH0_DOMAIN (e.g., your-tenant.auth0.com)
 *    - AUTH0_M2M_CLIENT_ID
 *    - AUTH0_M2M_CLIENT_SECRET
 * 
 * Usage:
 *   node scripts/configure-auth0-branding.js
 * 
 * @author SOMOS.tech
 * @updated 2024-01-XX
 */

const https = require('https');

// SOMOS.tech Brand Colors
const SOMOS_COLORS = {
    darkBackground: '#051323',
    primaryGreen: '#00FF91',
    lightGray: '#8394A7',
    white: '#FFFFFF',
    panelBackground: '#0a1f35',
    error: '#ef4444',
    borderColor: 'rgba(0, 255, 145, 0.2)',
    inputBorder: 'rgba(0, 255, 145, 0.3)',
    hoverColor: 'rgba(0, 255, 145, 0.3)'
};

// Auth0 Branding Theme Configuration
const brandingTheme = {
    colors: {
        primary_button: SOMOS_COLORS.primaryGreen,
        primary_button_label: SOMOS_COLORS.darkBackground,
        secondary_button_border: SOMOS_COLORS.primaryGreen,
        secondary_button_label: SOMOS_COLORS.primaryGreen,
        base_focus_color: SOMOS_COLORS.primaryGreen,
        base_hover_color: SOMOS_COLORS.hoverColor,
        links_focused_components: SOMOS_COLORS.primaryGreen,
        header: SOMOS_COLORS.darkBackground,
        icons: SOMOS_COLORS.primaryGreen,
        input_labels_placeholders: SOMOS_COLORS.lightGray,
        input_filled_text: SOMOS_COLORS.white,
        input_border: SOMOS_COLORS.inputBorder,
        input_background: SOMOS_COLORS.darkBackground,
        widget_background: SOMOS_COLORS.panelBackground,
        widget_border: SOMOS_COLORS.borderColor,
        body_text: SOMOS_COLORS.white,
        error: SOMOS_COLORS.error,
        success: SOMOS_COLORS.primaryGreen,
        captcha_widget_theme: 'dark'
    },
    fonts: {
        font_url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
        reference_text_size: 16,
        title: {
            bold: true,
            size: 150
        },
        subtitle: {
            bold: false,
            size: 87.5
        },
        body_text: {
            bold: false,
            size: 87.5
        },
        buttons_text: {
            bold: true,
            size: 100
        },
        input_labels: {
            bold: false,
            size: 100
        },
        links: {
            bold: true,
            size: 87.5
        }
    },
    borders: {
        button_border_weight: 1,
        button_border_radius: 50,  // Rounded buttons to match SOMOS style
        input_border_weight: 1,
        input_border_radius: 8,
        widget_corner_radius: 16,
        widget_border_weight: 1,
        show_widget_shadow: true
    },
    widget: {
        logo_position: 'center',
        logo_url: 'https://static.wixstatic.com/media/0c204d_5f310ee2b2a848ceac8e68b25c0c39eb~mv2.png',
        social_buttons_layout: 'bottom'
    },
    page_background: {
        type: 'solid',
        color: SOMOS_COLORS.darkBackground
    }
};

// Custom text for login prompts
const customText = {
    login: {
        login: {
            title: 'Sign in to SOMOS.tech',
            description: 'Access your member dashboard',
            buttonText: 'Continue',
            federatedConnectionButtonText: 'Continue with ${connectionName}',
            signupActionText: 'Become a member',
            signupActionLinkText: 'Join SOMOS'
        }
    },
    signup: {
        signup: {
            title: 'Join SOMOS.tech',
            description: 'Create your account to connect with the community',
            buttonText: 'Create Account',
            loginActionText: 'Already a member?',
            loginActionLinkText: 'Sign in'
        }
    }
};

async function getAccessToken() {
    const domain = process.env.AUTH0_DOMAIN;
    const clientId = process.env.AUTH0_M2M_CLIENT_ID;
    const clientSecret = process.env.AUTH0_M2M_CLIENT_SECRET;

    if (!domain || !clientId || !clientSecret) {
        throw new Error('Missing required environment variables: AUTH0_DOMAIN, AUTH0_M2M_CLIENT_ID, AUTH0_M2M_CLIENT_SECRET');
    }

    const data = JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        audience: `https://${domain}/api/v2/`,
        grant_type: 'client_credentials'
    });

    return new Promise((resolve, reject) => {
        const options = {
            hostname: domain,
            port: 443,
            path: '/oauth/token',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(body);
                    if (response.access_token) {
                        resolve(response.access_token);
                    } else {
                        reject(new Error('Failed to get access token: ' + body));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function updateBrandingTheme(accessToken) {
    const domain = process.env.AUTH0_DOMAIN;
    const data = JSON.stringify(brandingTheme);

    return new Promise((resolve, reject) => {
        const options = {
            hostname: domain,
            port: 443,
            path: '/api/v2/branding/themes/default',
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                if (res.statusCode === 200 || res.statusCode === 201) {
                    console.log('✅ Branding theme updated successfully');
                    resolve(JSON.parse(body));
                } else {
                    console.error('❌ Failed to update branding theme:', res.statusCode, body);
                    reject(new Error(`Failed to update branding: ${res.statusCode}`));
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function updateCustomText(accessToken, prompt, language, body) {
    const domain = process.env.AUTH0_DOMAIN;
    const data = JSON.stringify(body);

    return new Promise((resolve, reject) => {
        const options = {
            hostname: domain,
            port: 443,
            path: `/api/v2/prompts/${prompt}/custom-text/${language}`,
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                if (res.statusCode === 200 || res.statusCode === 201) {
                    console.log(`✅ Custom text for "${prompt}" updated successfully`);
                    resolve(JSON.parse(body));
                } else {
                    console.warn(`⚠️ Failed to update custom text for "${prompt}": ${res.statusCode}`);
                    resolve(null); // Don't fail the whole script
                }
            });
        });

        req.on('error', (err) => {
            console.warn(`⚠️ Error updating custom text for "${prompt}":`, err.message);
            resolve(null);
        });
        req.write(data);
        req.end();
    });
}

async function main() {
    console.log('🎨 SOMOS.tech Auth0 Branding Configuration');
    console.log('==========================================\n');

    try {
        // Get access token
        console.log('🔑 Getting access token...');
        const accessToken = await getAccessToken();
        console.log('✅ Access token obtained\n');

        // Update branding theme
        console.log('🎨 Updating branding theme...');
        await updateBrandingTheme(accessToken);
        console.log('');

        // Update custom text
        console.log('📝 Updating custom text...');
        for (const [prompt, textConfig] of Object.entries(customText)) {
            await updateCustomText(accessToken, prompt, 'en', textConfig);
        }
        console.log('');

        console.log('==========================================');
        console.log('🎉 Auth0 branding configuration complete!');
        console.log('\n📋 Next steps:');
        console.log('1. Visit your Auth0 Dashboard to verify changes');
        console.log('2. Test the login flow at: https://dev.somos.tech/.auth/login/auth0');
        console.log('3. Clear browser cache if changes don\'t appear immediately');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.log('\n📋 Troubleshooting:');
        console.log('1. Ensure environment variables are set:');
        console.log('   - AUTH0_DOMAIN');
        console.log('   - AUTH0_M2M_CLIENT_ID');
        console.log('   - AUTH0_M2M_CLIENT_SECRET');
        console.log('2. Verify M2M app has "update:branding" scope');
        console.log('3. Check Auth0 Dashboard for any service issues');
        process.exit(1);
    }
}

main();
