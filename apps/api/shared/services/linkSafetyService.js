/**
 * Link Safety Service - Tier 2 Moderation
 * 
 * Checks URLs for malicious content using multiple threat intelligence sources.
 * Defangs suspicious links for safe display in admin review.
 * 
 * @module linkSafetyService
 * @author SOMOS.tech
 */

// Known malicious URL patterns (extensible)
const MALICIOUS_PATTERNS = [
    // Phishing indicators
    /login\.(secure|verify|update)-?[a-z]+\.(com|net|org)/i,
    /[a-z]+-?(login|signin|verify|secure|account|update)\.(com|net|org|co)/i,
    /(paypal|apple|google|microsoft|amazon|facebook|instagram|twitter).*\.(tk|ml|ga|cf|gq)/i,
    
    // URL shorteners often used for malicious purposes (flag for review)
    /^https?:\/\/(bit\.ly|tinyurl\.com|t\.co|goo\.gl|ow\.ly|is\.gd|buff\.ly)/i,
    
    // IP address URLs (suspicious)
    /^https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/,
    
    // Data URLs (can contain malicious content)
    /^data:/i,
    
    // JavaScript URLs
    /^javascript:/i,
    
    // Known malicious TLDs (higher risk)
    /\.(tk|ml|ga|cf|gq|pw|cc|ws|top|xyz|click|link|work|date|racing|download|stream|cricket|science|party|win|bid|trade|webcam|review|accountant|faith|loan|men|pro)$/i
];

// Known safe domains (whitelist)
const SAFE_DOMAINS = [
    'google.com', 'youtube.com', 'facebook.com', 'twitter.com', 'instagram.com',
    'linkedin.com', 'github.com', 'microsoft.com', 'apple.com', 'amazon.com',
    'wikipedia.org', 'somos.tech', 'azure.com', 'azurewebsites.net',
    'googleapis.com', 'gstatic.com', 'cloudflare.com', 'akamai.com',
    'zoom.us', 'slack.com', 'discord.com', 'twitch.tv', 'reddit.com',
    'stackoverflow.com', 'medium.com', 'dev.to', 'notion.so'
];

// Suspicious keywords in URLs
const SUSPICIOUS_KEYWORDS = [
    'password', 'passwd', 'credential', 'login', 'signin', 'verify', 
    'confirm', 'update', 'secure', 'account', 'bank', 'wallet',
    'crypto', 'bitcoin', 'prize', 'winner', 'lottery', 'free',
    'urgent', 'suspended', 'limited', 'expire', 'alert'
];

/**
 * Extract all URLs from text
 * @param {string} text - Text to scan
 * @returns {Array} Array of extracted URLs
 */
export function extractUrls(text) {
    if (!text) return [];
    
    // URL regex pattern
    const urlPattern = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
    const matches = text.match(urlPattern) || [];
    
    // Clean up URLs (remove trailing punctuation)
    return matches.map(url => url.replace(/[.,;:!?)\]]+$/, ''));
}

/**
 * Extract domain from URL
 * @param {string} url - URL to parse
 * @returns {string|null} Domain or null
 */
function extractDomain(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.toLowerCase();
    } catch {
        return null;
    }
}

/**
 * Check if domain is in safe list
 * @param {string} domain - Domain to check
 * @returns {boolean} True if safe
 */
function isSafeDomain(domain) {
    if (!domain) return false;
    
    return SAFE_DOMAINS.some(safe => 
        domain === safe || domain.endsWith('.' + safe)
    );
}

/**
 * Defang a URL for safe display
 * Converts http://evil.com to hxxp://evil[.]com
 * @param {string} url - URL to defang
 * @returns {string} Defanged URL
 */
export function defangUrl(url) {
    if (!url) return '';
    
    return url
        .replace(/^http/i, 'hxxp')
        .replace(/^https/i, 'hxxps')
        .replace(/\./g, '[.]')
        .replace(/:\/\//g, '[://]');
}

/**
 * Re-fang a URL (restore from defanged state)
 * Converts hxxp://evil[.]com back to http://evil.com
 * @param {string} defangedUrl - Defanged URL
 * @returns {string} Original URL
 */
export function refangUrl(defangedUrl) {
    if (!defangedUrl) return '';
    
    return defangedUrl
        .replace(/^hxxp/i, 'http')
        .replace(/^hxxps/i, 'https')
        .replace(/\[\.\]/g, '.')
        .replace(/\[:\/\/\]/g, '://');
}

/**
 * Analyze a single URL for threats
 * @param {string} url - URL to analyze
 * @returns {Object} Analysis result
 */
export function analyzeUrl(url) {
    const result = {
        url: url,
        defangedUrl: defangUrl(url),
        safe: true,
        riskLevel: 'low',
        threats: [],
        checks: []
    };
    
    const domain = extractDomain(url);
    
    // Check 1: Safe domain whitelist
    if (isSafeDomain(domain)) {
        result.checks.push({
            name: 'domain_whitelist',
            passed: true,
            message: 'Domain is in trusted whitelist'
        });
        return result;
    }
    
    result.checks.push({
        name: 'domain_whitelist',
        passed: false,
        message: 'Domain not in trusted whitelist'
    });
    
    // Check 2: Malicious patterns
    for (const pattern of MALICIOUS_PATTERNS) {
        if (pattern.test(url)) {
            result.safe = false;
            result.riskLevel = 'high';
            result.threats.push({
                type: 'pattern_match',
                pattern: pattern.toString(),
                message: 'URL matches known malicious pattern'
            });
            result.checks.push({
                name: 'malicious_pattern',
                passed: false,
                message: 'Matches suspicious pattern: ' + pattern.toString().substring(0, 50)
            });
            break;
        }
    }
    
    if (result.threats.length === 0) {
        result.checks.push({
            name: 'malicious_pattern',
            passed: true,
            message: 'No malicious patterns detected'
        });
    }
    
    // Check 3: Suspicious keywords
    const urlLower = url.toLowerCase();
    const foundKeywords = SUSPICIOUS_KEYWORDS.filter(kw => urlLower.includes(kw));
    
    if (foundKeywords.length > 0) {
        if (foundKeywords.length >= 2) {
            result.safe = false;
            result.riskLevel = result.riskLevel === 'high' ? 'critical' : 'high';
        } else {
            result.riskLevel = result.riskLevel === 'low' ? 'medium' : result.riskLevel;
        }
        
        result.threats.push({
            type: 'suspicious_keywords',
            keywords: foundKeywords,
            message: `Contains suspicious keywords: ${foundKeywords.join(', ')}`
        });
        result.checks.push({
            name: 'suspicious_keywords',
            passed: false,
            message: `Contains: ${foundKeywords.join(', ')}`
        });
    } else {
        result.checks.push({
            name: 'suspicious_keywords',
            passed: true,
            message: 'No suspicious keywords found'
        });
    }
    
    // Check 4: IP address URL
    if (/^https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(url)) {
        result.riskLevel = result.riskLevel === 'low' ? 'medium' : result.riskLevel;
        result.threats.push({
            type: 'ip_address_url',
            message: 'URL uses IP address instead of domain'
        });
        result.checks.push({
            name: 'ip_address',
            passed: false,
            message: 'Uses IP address instead of domain name'
        });
    } else {
        result.checks.push({
            name: 'ip_address',
            passed: true,
            message: 'Uses proper domain name'
        });
    }
    
    // Check 5: URL length (very long URLs can be suspicious)
    if (url.length > 200) {
        result.riskLevel = result.riskLevel === 'low' ? 'medium' : result.riskLevel;
        result.checks.push({
            name: 'url_length',
            passed: false,
            message: `URL is unusually long (${url.length} characters)`
        });
    } else {
        result.checks.push({
            name: 'url_length',
            passed: true,
            message: 'URL length is normal'
        });
    }
    
    // Check 6: Homograph attack detection (mixed character sets in domain)
    if (domain && /[^\x00-\x7F]/.test(domain)) {
        result.safe = false;
        result.riskLevel = 'high';
        result.threats.push({
            type: 'homograph_attack',
            message: 'Domain contains non-ASCII characters (possible homograph attack)'
        });
        result.checks.push({
            name: 'homograph',
            passed: false,
            message: 'Contains non-ASCII characters in domain'
        });
    } else {
        result.checks.push({
            name: 'homograph',
            passed: true,
            message: 'No homograph attack indicators'
        });
    }
    
    // Determine if manual review is needed
    if (result.riskLevel === 'medium' || (result.riskLevel === 'low' && domain && !isSafeDomain(domain))) {
        result.needsReview = true;
    }
    
    return result;
}

/**
 * Analyze all URLs in text content
 * @param {string} text - Text content to analyze
 * @returns {Object} Analysis results
 */
export function analyzeTextForLinks(text) {
    const urls = extractUrls(text);
    
    if (urls.length === 0) {
        return {
            hasLinks: false,
            urls: [],
            overallSafe: true,
            riskLevel: 'none',
            needsReview: false,
            tier: 2,
            tierResult: 'passed',
            summary: 'No links detected'
        };
    }
    
    const analyzedUrls = urls.map(url => analyzeUrl(url));
    const unsafeUrls = analyzedUrls.filter(u => !u.safe);
    const highRiskUrls = analyzedUrls.filter(u => ['high', 'critical'].includes(u.riskLevel));
    const needsReviewUrls = analyzedUrls.filter(u => u.needsReview);
    
    let overallRiskLevel = 'low';
    if (highRiskUrls.length > 0) {
        overallRiskLevel = 'high';
    } else if (analyzedUrls.some(u => u.riskLevel === 'medium')) {
        overallRiskLevel = 'medium';
    }
    
    // Determine tier result
    let tierResult = 'passed';
    if (unsafeUrls.length > 0) {
        tierResult = 'blocked';
    } else if (needsReviewUrls.length > 0 || overallRiskLevel === 'medium') {
        tierResult = 'review';
    }
    
    return {
        hasLinks: true,
        urls: analyzedUrls,
        overallSafe: unsafeUrls.length === 0,
        riskLevel: overallRiskLevel,
        needsReview: needsReviewUrls.length > 0 || overallRiskLevel === 'medium',
        blockedCount: unsafeUrls.length,
        tier: 2,
        tierResult: tierResult,
        summary: unsafeUrls.length > 0 
            ? `${unsafeUrls.length} potentially malicious link(s) detected`
            : needsReviewUrls.length > 0
                ? `${needsReviewUrls.length} link(s) flagged for review`
                : `${urls.length} link(s) analyzed, all appear safe`
    };
}

/**
 * Replace URLs in text with defanged versions
 * @param {string} text - Original text
 * @param {Array} urls - URLs to defang (from analyzeTextForLinks)
 * @returns {string} Text with defanged URLs
 */
export function defangTextUrls(text, urls) {
    if (!text || !urls || urls.length === 0) return text;
    
    let defangedText = text;
    for (const urlInfo of urls) {
        if (urlInfo.url && urlInfo.defangedUrl) {
            defangedText = defangedText.replace(
                new RegExp(escapeRegex(urlInfo.url), 'g'),
                urlInfo.defangedUrl
            );
        }
    }
    return defangedText;
}

/**
 * Escape special regex characters
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default {
    extractUrls,
    defangUrl,
    refangUrl,
    analyzeUrl,
    analyzeTextForLinks,
    defangTextUrls
};
