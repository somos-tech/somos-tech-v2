/**
 * Simple in-memory rate limiter for Azure Functions
 * Note: For production with multiple instances, consider using Redis or Azure Cache
 */

// Store rate limit data in memory (cleared on function restart)
const rateLimitStore = new Map();

// Clean up old entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, data] of rateLimitStore.entries()) {
        if (now - data.resetTime > 60000) { // Clean up entries older than 1 minute
            rateLimitStore.delete(key);
        }
    }
}, 60000); // Run every minute

/**
 * Check if request should be rate limited
 * @param {string} identifier - Unique identifier for rate limiting (e.g., IP address or email)
 * @param {number} maxRequests - Maximum requests allowed in the window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Object} { allowed: boolean, remaining: number, resetTime: number }
 */
export function checkRateLimit(identifier, maxRequests = 5, windowMs = 60000) {
    const now = Date.now();
    const key = `ratelimit:${identifier}`;
    
    let data = rateLimitStore.get(key);
    
    if (!data || now > data.resetTime) {
        // Create new rate limit window
        data = {
            count: 1,
            resetTime: now + windowMs
        };
        rateLimitStore.set(key, data);
        
        return {
            allowed: true,
            remaining: maxRequests - 1,
            resetTime: data.resetTime
        };
    }
    
    if (data.count >= maxRequests) {
        // Rate limit exceeded
        return {
            allowed: false,
            remaining: 0,
            resetTime: data.resetTime
        };
    }
    
    // Increment count
    data.count++;
    rateLimitStore.set(key, data);
    
    return {
        allowed: true,
        remaining: maxRequests - data.count,
        resetTime: data.resetTime
    };
}

/**
 * Get client identifier from request (IP address)
 * @param {import('@azure/functions').HttpRequest} request - The HTTP request
 * @returns {string} Client identifier
 */
export function getClientIdentifier(request) {
    // Try to get real IP from various headers
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
        // x-forwarded-for can contain multiple IPs, take the first one
        return forwardedFor.split(',')[0].trim();
    }
    
    const realIp = request.headers.get('x-real-ip');
    if (realIp) {
        return realIp;
    }
    
    // Fallback to a generic identifier
    return 'unknown';
}

/**
 * Rate limit middleware for Azure Functions
 * @param {import('@azure/functions').HttpRequest} request - The HTTP request
 * @param {number} maxRequests - Maximum requests allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Object|null} Error response or null if allowed
 */
export function rateLimitMiddleware(request, maxRequests = 5, windowMs = 60000) {
    const identifier = getClientIdentifier(request);
    const result = checkRateLimit(identifier, maxRequests, windowMs);
    
    if (!result.allowed) {
        const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
        
        return {
            status: 429,
            headers: {
                'Retry-After': retryAfter.toString(),
                'X-RateLimit-Limit': maxRequests.toString(),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': result.resetTime.toString()
            },
            jsonBody: {
                error: 'Too many requests',
                message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
                retryAfter
            }
        };
    }
    
    return null;
}
