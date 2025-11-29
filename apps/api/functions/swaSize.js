/**
 * SWA Size API - Azure Static Web App Size Tracker
 * 
 * Provides information about the deployed app size and Azure SWA limits.
 * 
 * Endpoints:
 * - GET /api/swa-size - Get current app size and limit info
 * 
 * Azure SWA Limits:
 * - Free tier: 250 MB max app size
 * - Standard tier: 500 MB max app size
 */

import { app } from '@azure/functions';

// Azure SWA size limits in bytes
const SWA_LIMITS = {
    free: 250 * 1024 * 1024, // 250 MB
    standard: 500 * 1024 * 1024, // 500 MB
};

// Estimated sizes based on typical build output
// In production, this could be populated by a build script that measures actual sizes
const ESTIMATED_SIZES = {
    javascript: 28 * 1024 * 1024, // ~28 MB (compressed JS bundles)
    css: 5 * 1024 * 1024, // ~5 MB (stylesheets)
    images: 8 * 1024 * 1024, // ~8 MB (optimized images)
    fonts: 2 * 1024 * 1024, // ~2 MB (web fonts)
    html: 512 * 1024, // ~512 KB (HTML files)
    other: 1 * 1024 * 1024, // ~1 MB (other assets)
};

/**
 * Calculate total size from breakdown
 */
function calculateTotalSize() {
    return Object.values(ESTIMATED_SIZES).reduce((sum, size) => sum + size, 0);
}

/**
 * Get size breakdown with percentages
 */
function getSizeBreakdown(totalSize) {
    const breakdown = [
        { name: 'JavaScript', size: ESTIMATED_SIZES.javascript },
        { name: 'CSS', size: ESTIMATED_SIZES.css },
        { name: 'Images', size: ESTIMATED_SIZES.images },
        { name: 'Fonts', size: ESTIMATED_SIZES.fonts },
        { name: 'HTML', size: ESTIMATED_SIZES.html },
        { name: 'Other', size: ESTIMATED_SIZES.other },
    ];

    return breakdown
        .map(item => ({
            ...item,
            percentage: Math.round((item.size / totalSize) * 100)
        }))
        .filter(item => item.percentage > 0)
        .sort((a, b) => b.size - a.size);
}

/**
 * Determine the tier based on environment or configuration
 */
function getCurrentTier() {
    // Check if we're on standard tier (could be set via environment variable)
    // Default to 'standard' since SOMOS.tech uses Standard tier
    const tier = process.env.SWA_TIER || process.env.AZURE_SWA_TIER || 'standard';
    return tier.toLowerCase() === 'free' ? 'free' : 'standard';
}

/**
 * GET /api/swa-size - Get SWA size information
 */
app.http('swaSize', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'swa-size',
    handler: async (request, context) => {
        context.log('SWA Size API called');

        try {
            const tier = getCurrentTier();
            const limit = SWA_LIMITS[tier];
            const totalSize = calculateTotalSize();
            const percentage = (totalSize / limit) * 100;
            const breakdown = getSizeBreakdown(totalSize);

            const sizeData = {
                totalSize,
                limit,
                tier,
                percentage: Math.round(percentage * 10) / 10, // Round to 1 decimal
                remaining: limit - totalSize,
                breakdown,
                thresholds: {
                    healthy: 50, // Below 50% is healthy
                    warning: 75, // Above 75% is warning
                    critical: 90, // Above 90% is critical
                },
                status: percentage >= 90 ? 'critical' 
                      : percentage >= 75 ? 'warning' 
                      : percentage >= 50 ? 'moderate' 
                      : 'healthy',
                recommendations: getRecommendations(percentage, tier),
                lastUpdated: new Date().toISOString(),
                note: 'These are estimated sizes. Actual deployment size may vary.'
            };

            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
                },
                body: JSON.stringify({
                    success: true,
                    data: sizeData
                })
            };
        } catch (error) {
            context.log.error('Error getting SWA size:', error);
            
            return {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    success: false,
                    error: 'Failed to get SWA size information',
                    message: error.message
                })
            };
        }
    }
});

/**
 * Generate recommendations based on usage percentage and tier
 */
function getRecommendations(percentage, tier) {
    const recommendations = [];

    if (percentage >= 90) {
        recommendations.push({
            priority: 'critical',
            message: 'App is near the size limit. Immediate action required.',
            actions: [
                'Remove unused dependencies and assets',
                'Enable code splitting and lazy loading',
                'Compress images and use modern formats (WebP, AVIF)',
                tier === 'free' ? 'Consider upgrading to Standard tier (500 MB limit)' : 'Review large assets for optimization'
            ]
        });
    } else if (percentage >= 75) {
        recommendations.push({
            priority: 'warning',
            message: 'App size is approaching the limit.',
            actions: [
                'Audit bundle size with tools like source-map-explorer',
                'Remove dead code and unused imports',
                'Optimize and compress assets'
            ]
        });
    } else if (percentage >= 50) {
        recommendations.push({
            priority: 'moderate',
            message: 'App size is moderate. Good time to review optimization opportunities.',
            actions: [
                'Implement lazy loading for routes',
                'Use dynamic imports for large libraries',
                'Consider CDN for large static assets'
            ]
        });
    } else {
        recommendations.push({
            priority: 'healthy',
            message: 'App size is within healthy limits.',
            actions: [
                'Continue monitoring as you add features',
                'Set up automated size tracking in CI/CD'
            ]
        });
    }

    return recommendations;
}

/**
 * POST /api/swa-size/update - Update size estimates (admin only)
 * This could be called by a build script to update actual sizes
 */
app.http('swaSizeUpdate', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'swa-size/update',
    handler: async (request, context) => {
        // Check for admin authorization
        const clientPrincipal = request.headers.get('x-ms-client-principal');
        if (!clientPrincipal) {
            return {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Unauthorized' })
            };
        }

        try {
            const principal = JSON.parse(Buffer.from(clientPrincipal, 'base64').toString());
            const isAdmin = principal.userRoles?.includes('admin');
            
            if (!isAdmin) {
                return {
                    status: 403,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ error: 'Admin access required' })
                };
            }

            const body = await request.json();
            
            // In a production environment, you would store these values
            // in a database or configuration store
            context.log('Received size update:', body);

            return {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    success: true,
                    message: 'Size data updated (note: changes are not persisted in this version)'
                })
            };
        } catch (error) {
            return {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Invalid request body' })
            };
        }
    }
});
