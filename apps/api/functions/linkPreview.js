/**
 * Link Preview API - Fetches Open Graph metadata for URL previews
 * 
 * Endpoints:
 * - POST /api/link-preview - Get metadata for a URL
 * 
 * @module linkPreview
 * @author SOMOS.tech
 */

import { app } from '@azure/functions';
import { requireAuth } from '../shared/authMiddleware.js';
import { successResponse, errorResponse } from '../shared/httpResponse.js';

// Cache for link previews (in-memory, resets on function restart)
const previewCache = new Map();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

// Known site metadata (for sites that block bots)
const KNOWN_SITES = {
    'linkedin.com': {
        siteName: 'LinkedIn',
        icon: 'https://static.licdn.com/aero-v1/sc/h/al2o9zrvru7aqj8e1x2rzsrca',
        defaultImage: 'https://static.licdn.com/aero-v1/sc/h/9c8pery4andzj6ohjkjp54ma2'
    },
    'twitter.com': {
        siteName: 'X (Twitter)',
        icon: 'https://abs.twimg.com/favicons/twitter.3.ico'
    },
    'x.com': {
        siteName: 'X',
        icon: 'https://abs.twimg.com/favicons/twitter.3.ico'
    },
    'github.com': {
        siteName: 'GitHub',
        icon: 'https://github.githubassets.com/favicons/favicon.svg'
    },
    'youtube.com': {
        siteName: 'YouTube',
        icon: 'https://www.youtube.com/s/desktop/favicon.ico'
    },
    'spotify.com': {
        siteName: 'Spotify',
        icon: 'https://open.spotifycdn.com/cdn/images/favicon32.b64ecc03.png'
    },
    'open.spotify.com': {
        siteName: 'Spotify',
        icon: 'https://open.spotifycdn.com/cdn/images/favicon32.b64ecc03.png'
    },
    'instagram.com': {
        siteName: 'Instagram',
        icon: 'https://static.cdninstagram.com/rsrc.php/v3/yt/r/30PrGfR3xhB.png'
    },
    'facebook.com': {
        siteName: 'Facebook',
        icon: 'https://static.xx.fbcdn.net/rsrc.php/yb/r/hLRJ1GG_y0J.ico'
    },
    'medium.com': {
        siteName: 'Medium',
        icon: 'https://miro.medium.com/v2/1*m-R_BkNf1Qjr1YbyOIJY2w.png'
    },
    'notion.so': {
        siteName: 'Notion',
        icon: 'https://www.notion.so/images/favicon.ico'
    },
    'figma.com': {
        siteName: 'Figma',
        icon: 'https://static.figma.com/app/icon/1/favicon.png'
    }
};

/**
 * Extract Open Graph and meta tags from HTML
 */
function extractMetadata(html, url) {
    const metadata = {
        title: '',
        description: '',
        image: '',
        siteName: '',
        url: url
    };

    try {
        // Extract Open Graph tags
        const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
                            html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i);
        if (ogTitleMatch) metadata.title = ogTitleMatch[1];

        const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i) ||
                           html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i);
        if (ogDescMatch) metadata.description = ogDescMatch[1];

        const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                            html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
        if (ogImageMatch) metadata.image = ogImageMatch[1];

        const ogSiteMatch = html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i) ||
                           html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:site_name["']/i);
        if (ogSiteMatch) metadata.siteName = ogSiteMatch[1];

        // Fallback to Twitter cards
        if (!metadata.title) {
            const twitterTitleMatch = html.match(/<meta[^>]*name=["']twitter:title["'][^>]*content=["']([^"']+)["']/i);
            if (twitterTitleMatch) metadata.title = twitterTitleMatch[1];
        }

        if (!metadata.description) {
            const twitterDescMatch = html.match(/<meta[^>]*name=["']twitter:description["'][^>]*content=["']([^"']+)["']/i);
            if (twitterDescMatch) metadata.description = twitterDescMatch[1];
        }

        if (!metadata.image) {
            const twitterImageMatch = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i);
            if (twitterImageMatch) metadata.image = twitterImageMatch[1];
        }

        // Fallback to standard meta tags
        if (!metadata.title) {
            const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            if (titleMatch) metadata.title = titleMatch[1].trim();
        }

        if (!metadata.description) {
            const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                             html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
            if (descMatch) metadata.description = descMatch[1];
        }

        // Clean up HTML entities
        metadata.title = decodeHtmlEntities(metadata.title);
        metadata.description = decodeHtmlEntities(metadata.description);
        metadata.siteName = decodeHtmlEntities(metadata.siteName);

        // Ensure image URL is absolute
        if (metadata.image && !metadata.image.startsWith('http')) {
            const urlObj = new URL(url);
            if (metadata.image.startsWith('//')) {
                metadata.image = urlObj.protocol + metadata.image;
            } else if (metadata.image.startsWith('/')) {
                metadata.image = urlObj.origin + metadata.image;
            } else {
                metadata.image = urlObj.origin + '/' + metadata.image;
            }
        }

        // Get domain as fallback site name
        if (!metadata.siteName) {
            const urlObj = new URL(url);
            metadata.siteName = urlObj.hostname.replace('www.', '');
        }

    } catch (error) {
        console.error('[LinkPreview] Error extracting metadata:', error);
    }

    return metadata;
}

/**
 * Decode HTML entities
 */
function decodeHtmlEntities(text) {
    if (!text) return '';
    return text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
}

/**
 * Link Preview Handler
 */
app.http('linkPreview', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'link-preview',
    handler: async (request, context) => {
        try {
            context.log('[LinkPreview] POST /link-preview');

            // Authentication required
            const authResult = await requireAuth(request);
            if (!authResult.authenticated) {
                return errorResponse(401, 'Authentication required');
            }

            const body = await request.json();
            const { url } = body;

            if (!url) {
                return errorResponse(400, 'URL is required');
            }

            // Validate URL
            let urlObj;
            try {
                urlObj = new URL(url);
                if (!['http:', 'https:'].includes(urlObj.protocol)) {
                    return errorResponse(400, 'Invalid URL protocol');
                }
            } catch {
                return errorResponse(400, 'Invalid URL');
            }

            // Check cache
            const cacheKey = url;
            const cached = previewCache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
                context.log('[LinkPreview] Returning cached preview for:', url);
                return successResponse(cached.data);
            }

            // Get known site info
            const hostname = urlObj.hostname.replace('www.', '');
            const knownSite = KNOWN_SITES[hostname] || Object.entries(KNOWN_SITES).find(([domain]) => hostname.endsWith(domain))?.[1];

            // Fetch the URL with a realistic browser user agent
            let html;
            let fetchSucceeded = false;
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 8000); // 8 second timeout

                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        // Use a realistic Chrome user agent
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache',
                        'Sec-Fetch-Dest': 'document',
                        'Sec-Fetch-Mode': 'navigate',
                        'Sec-Fetch-Site': 'none',
                        'Sec-Fetch-User': '?1',
                        'Upgrade-Insecure-Requests': '1'
                    },
                    signal: controller.signal,
                    redirect: 'follow'
                });

                clearTimeout(timeout);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                // Read the response as text (handles encoding automatically)
                html = await response.text();
                // Limit to first 100KB
                if (html.length > 100 * 1024) {
                    html = html.substring(0, 100 * 1024);
                }
                fetchSucceeded = true;
                context.log('[LinkPreview] Successfully fetched:', url, '- HTML length:', html.length);

            } catch (fetchError) {
                context.log('[LinkPreview] Fetch error for', url, ':', fetchError.message);
                
                // If fetch fails, return known site data or basic fallback
                const fallbackData = {
                    title: knownSite?.siteName || hostname,
                    description: url,
                    image: knownSite?.defaultImage || null,
                    icon: knownSite?.icon || null,
                    siteName: knownSite?.siteName || hostname,
                    url: url,
                    fetchError: true
                };
                
                // Cache the fallback too
                previewCache.set(cacheKey, {
                    data: fallbackData,
                    timestamp: Date.now()
                });
                
                return successResponse(fallbackData);
            }

            // Extract metadata
            const metadata = extractMetadata(html, url);
            
            // Enhance with known site data if metadata is missing
            if (knownSite) {
                if (!metadata.siteName) metadata.siteName = knownSite.siteName;
                if (!metadata.image && knownSite.defaultImage) metadata.image = knownSite.defaultImage;
                metadata.icon = knownSite.icon;
            }
            
            context.log('[LinkPreview] Extracted metadata:', {
                title: metadata.title?.substring(0, 50),
                description: metadata.description?.substring(0, 50),
                image: metadata.image ? 'yes' : 'no',
                siteName: metadata.siteName
            });

            // Cache the result
            previewCache.set(cacheKey, {
                data: metadata,
                timestamp: Date.now()
            });

            // Clean old cache entries periodically
            if (previewCache.size > 100) {
                const now = Date.now();
                for (const [key, value] of previewCache.entries()) {
                    if (now - value.timestamp > CACHE_TTL) {
                        previewCache.delete(key);
                    }
                }
            }

            return successResponse(metadata);

        } catch (error) {
            context.error('[LinkPreview] Error:', error);
            return errorResponse(500, 'Failed to fetch link preview', error.message);
        }
    }
});
