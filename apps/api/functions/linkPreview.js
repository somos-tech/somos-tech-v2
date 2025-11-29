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

            // Fetch the URL
            let html;
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout

                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (compatible; SOMOSTechBot/1.0; +https://somos.tech)',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.5'
                    },
                    signal: controller.signal
                });

                clearTimeout(timeout);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                // Only read first 50KB to avoid large payloads
                const reader = response.body.getReader();
                const chunks = [];
                let totalSize = 0;
                const maxSize = 50 * 1024; // 50KB

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    chunks.push(value);
                    totalSize += value.length;
                    
                    if (totalSize >= maxSize) {
                        reader.cancel();
                        break;
                    }
                }

                const decoder = new TextDecoder();
                html = chunks.map(chunk => decoder.decode(chunk, { stream: true })).join('');

            } catch (fetchError) {
                context.log('[LinkPreview] Fetch error for', url, ':', fetchError.message);
                
                // Return basic info even if fetch fails
                const fallbackData = {
                    title: urlObj.hostname.replace('www.', ''),
                    description: url,
                    image: null,
                    siteName: urlObj.hostname.replace('www.', ''),
                    url: url,
                    fetchError: true
                };
                
                return successResponse(fallbackData);
            }

            // Extract metadata
            const metadata = extractMetadata(html, url);

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
