/**
 * Tiered Content Moderation Service
 * 
 * Provides comprehensive content moderation with three tiers:
 * 
 * TIER 1: Custom Keyword Filter
 * - Customizable blocklist of words/phrases
 * - Pattern matching with wildcards
 * - Instant blocking of known bad content
 * 
 * TIER 2: Link Safety Analysis (VirusTotal + Pattern Analysis)
 * - Send URLs to VirusTotal for malware/phishing detection
 * - Pattern-based threat detection
 * - URL defanging for safe admin review
 * 
 * TIER 3: Azure AI Content Safety
 * - Advanced AI analysis for hate, violence, sexual, self-harm
 * - Configurable severity thresholds
 * - Nuanced content understanding
 * 
 * WORKFLOW SCOPES: Configure which features use moderation
 * - Online Community (chat channels)
 * - Group Messages (private group chats)
 * - Event Agent Messages (AI-generated content)
 * - Notifications (system/admin notifications)
 * 
 * @module moderationService
 * @author SOMOS.tech
 */

import ContentSafetyClient, { isUnexpected } from '@azure-rest/ai-content-safety';
import { AzureKeyCredential } from '@azure/core-auth';
import { getContainer } from '../db.js';
import {
    extractUrls,
    defangUrl,
    analyzeUrl,
    defangTextUrls
} from './linkSafetyService.js';

// ============== CONFIGURATION ==============

// Content Safety configuration
const CONTENT_SAFETY_ENDPOINT = process.env.CONTENT_SAFETY_ENDPOINT;
const CONTENT_SAFETY_KEY = process.env.CONTENT_SAFETY_KEY;

// VirusTotal configuration
const VIRUSTOTAL_API_KEY = process.env.VIRUSTOTAL_API_KEY;
const VIRUSTOTAL_API_URL = 'https://www.virustotal.com/api/v3';

// Default moderation thresholds for Tier 3 (0=Safe, 2=Low, 4=Medium, 6=High)
const DEFAULT_THRESHOLDS = {
    hate: 2,
    sexual: 2,
    violence: 4,
    selfHarm: 2
};

// Container names for moderation data
const CONTAINERS = {
    MODERATION_CONFIG: 'moderation-config',
    MODERATION_QUEUE: 'moderation-queue',
    USERS: 'users'
};

let contentSafetyClient = null;

// ============== TIER 3: AZURE AI CONTENT SAFETY ==============

/**
 * Initialize the Content Safety client
 * @returns {Object} Content Safety client instance
 */
function getContentSafetyClient() {
    if (!contentSafetyClient) {
        if (!CONTENT_SAFETY_ENDPOINT || !CONTENT_SAFETY_KEY) {
            console.warn('[ModerationService] Content Safety not configured - Tier 3 moderation disabled');
            return null;
        }

        try {
            const credential = new AzureKeyCredential(CONTENT_SAFETY_KEY);
            contentSafetyClient = ContentSafetyClient(CONTENT_SAFETY_ENDPOINT, credential);
            console.log('[ModerationService] Content Safety client initialized');
        } catch (error) {
            console.error('[ModerationService] Failed to initialize Content Safety client:', error);
            return null;
        }
    }
    return contentSafetyClient;
}

// ============== CONFIGURATION MANAGEMENT ==============

/**
 * Get moderation configuration from Cosmos DB
 * @returns {Promise<Object>} Moderation configuration
 */
export async function getModerationConfig() {
    try {
        const container = getContainer(CONTAINERS.MODERATION_CONFIG);
        const { resources } = await container.items
            .query({
                query: 'SELECT * FROM c WHERE c.id = @id',
                parameters: [{ name: '@id', value: 'config' }]
            })
            .fetchAll();

        if (resources.length > 0) {
            return resources[0];
        }

        // Return default config if none exists
        return getDefaultConfig();
    } catch (error) {
        console.error('[ModerationService] Error getting moderation config:', error);
        return getDefaultConfig();
    }
}

/**
 * Default blocklist of known harmful terms for Tier 1
 * Categories: hate speech, slurs, violent threats, self-harm, explicit content
 * This is a starting point - admins should customize based on community needs
 */
const DEFAULT_BLOCKLIST = [
    // Hate speech and slurs (racial, ethnic, religious)
    'n*gger', 'n1gger', 'nigga', 'nig', 'sp*c', 'spic', 'w*tback', 'wetback',
    'ch*nk', 'chink', 'g**k', 'gook', 'k*ke', 'kike', 'f*ggot', 'faggot', 'fag',
    'tr*nny', 'tranny', 'ret*rd', 'retard', 'tard', 'cripple', 'spaz',
    'white power', 'heil hitler', 'nazi', 'sieg heil', '1488', '14/88',
    'gas the', 'kill all', 'death to', 'race war',
    
    // Violent threats
    'i will kill you', 'gonna kill you', 'kill yourself', 'kys', 'go die',
    'hope you die', 'shoot you', 'stab you', 'murder you', 'bomb threat',
    'mass shooting', 'school shooting', 'terrorist attack',
    
    // Self-harm encouragement
    'cut yourself', 'hang yourself', 'drink bleach', 'jump off',
    'end your life', 'slit your wrists', 'overdose', 'suicide method',
    
    // Sexual exploitation
    'child porn', 'cp links', 'jailbait', 'lolita', 'underage',
    'rape you', 'rapist', 'molest', 'pedo', 'pedophile',
    
    // Harassment
    'doxx', 'dox', 'swat', 'swatting', 'your address', 'found your house',
    'i know where you live', 'post your nudes',
    
    // Common spam patterns
    'free bitcoin', 'crypto giveaway', 'double your', 'send btc',
    'nigerian prince', 'lottery winner', 'click here to claim',
    
    // Extreme profanity (context-dependent, admins can adjust)
    'f*ck you', 'go f*ck yourself', 'c*nt', 'cunt', 'wh*re', 'whore',
    'b*tch', 'stfu', 'gtfo'
];

/**
 * Get default moderation configuration
 * @returns {Object} Default configuration
 */
function getDefaultConfig() {
    return {
        id: 'config',
        enabled: true,
        
        // Tier 1: Custom Keyword Filter
        tier1: {
            enabled: true,
            name: 'Keyword Filter',
            description: 'Custom blocklist of words and phrases',
            blocklist: [...DEFAULT_BLOCKLIST],
            caseSensitive: false,
            matchWholeWord: false,
            action: 'block' // 'block' | 'review' | 'flag'
        },
        
        // Tier 2: Link Safety (VirusTotal + Pattern)
        tier2: {
            enabled: true,
            name: 'Link Safety',
            description: 'VirusTotal + pattern-based URL analysis',
            useVirusTotal: true,
            usePatternAnalysis: true,
            blockMalicious: true,
            flagSuspicious: true,
            safeDomains: [
                'google.com', 'youtube.com', 'facebook.com', 'twitter.com', 
                'instagram.com', 'linkedin.com', 'github.com', 'microsoft.com',
                'somos.tech', 'azure.com', 'zoom.us', 'slack.com'
            ],
            action: 'block' // 'block' | 'review'
        },
        
        // Tier 3: Azure AI Content Safety
        tier3: {
            enabled: true,
            name: 'AI Content Safety',
            description: 'Azure AI analysis for harmful content',
            thresholds: DEFAULT_THRESHOLDS,
            autoBlock: true,
            notifyAdmins: true,
            action: 'review' // 'block' | 'review'
        },
        
        // Workflow Scopes - which features use moderation
        workflows: {
            community: {
                enabled: true,
                name: 'Online Community',
                description: 'Public community chat channels',
                tier1: true,
                tier2: true,
                tier3: true
            },
            groups: {
                enabled: true,
                name: 'Group Messages',
                description: 'Private group chats and messages',
                tier1: true,
                tier2: true,
                tier3: false
            },
            events: {
                enabled: true,
                name: 'Event Agent',
                description: 'AI event assistant messages',
                tier1: true,
                tier2: false,
                tier3: false
            },
            notifications: {
                enabled: false,
                name: 'Notifications',
                description: 'System and admin notifications',
                tier1: false,
                tier2: false,
                tier3: false
            }
        },
        
        // User notification settings
        showPendingMessage: true,
        pendingMessageText: 'Your message is being reviewed before posting.',
        
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
}

/**
 * Save moderation configuration to Cosmos DB
 * @param {Object} config - The configuration to save
 * @returns {Promise<Object>} Saved configuration
 */
export async function saveModerationConfig(config) {
    try {
        const container = getContainer(CONTAINERS.MODERATION_CONFIG);
        const configToSave = {
            ...config,
            id: 'config',
            updatedAt: new Date().toISOString()
        };
        const { resource } = await container.items.upsert(configToSave);
        console.log('[ModerationService] Config saved successfully');
        return resource;
    } catch (error) {
        console.error('[ModerationService] Error saving moderation config:', error);
        throw error;
    }
}

// ============== TIER 1: KEYWORD FILTER ==============

/**
 * TIER 1: Check text against custom blocklist
 * @param {string} text - Text to check
 * @param {Object} tier1Config - Tier 1 configuration
 * @returns {Object} Tier 1 result
 */
function runTier1KeywordFilter(text, tier1Config) {
    const result = {
        tier: 1,
        name: 'Keyword Filter',
        passed: true,
        action: 'allow',
        matches: [],
        checks: []
    };

    if (!tier1Config?.enabled) {
        result.checks.push({
            name: 'tier1_enabled',
            passed: true,
            message: 'Tier 1 keyword filter is disabled'
        });
        return result;
    }

    const blocklist = tier1Config.blocklist || [];
    if (blocklist.length === 0) {
        result.checks.push({
            name: 'blocklist_check',
            passed: true,
            message: 'Blocklist is empty - no filtering applied'
        });
        return result;
    }

    const textToCheck = tier1Config.caseSensitive ? text : text.toLowerCase();
    
    for (const term of blocklist) {
        const termToMatch = tier1Config.caseSensitive ? term : term.toLowerCase();
        let matched = false;
        
        if (tier1Config.matchWholeWord) {
            // Match whole word only
            const wordBoundaryRegex = new RegExp(`\\b${escapeRegex(termToMatch)}\\b`, 'gi');
            matched = wordBoundaryRegex.test(textToCheck);
        } else {
            // Match anywhere
            matched = textToCheck.includes(termToMatch);
        }
        
        if (matched) {
            result.matches.push({
                term: term,
                type: 'blocklist'
            });
        }
    }

    if (result.matches.length > 0) {
        result.passed = false;
        result.action = tier1Config.action || 'block';
        result.checks.push({
            name: 'blocklist_check',
            passed: false,
            message: `Found ${result.matches.length} blocked term(s): ${result.matches.map(m => m.term).join(', ')}`
        });
    } else {
        result.checks.push({
            name: 'blocklist_check',
            passed: true,
            message: `Checked against ${blocklist.length} terms - no matches`
        });
    }

    return result;
}

/**
 * Escape special regex characters
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============== TIER 2: LINK SAFETY (VIRUSTOTAL) ==============

/**
 * Check URL with VirusTotal API
 * @param {string} url - URL to check
 * @returns {Promise<Object>} VirusTotal result
 */
async function checkVirusTotal(url) {
    if (!VIRUSTOTAL_API_KEY) {
        return {
            checked: false,
            error: 'VirusTotal API key not configured',
            malicious: false,
            suspicious: false,
            score: null
        };
    }

    try {
        // First, get the URL ID (base64 encoded without padding)
        const urlId = Buffer.from(url).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
        
        // Check if URL has been analyzed before
        const response = await fetch(`${VIRUSTOTAL_API_URL}/urls/${urlId}`, {
            method: 'GET',
            headers: {
                'x-apikey': VIRUSTOTAL_API_KEY
            }
        });

        if (response.status === 404) {
            // URL not in database, submit for analysis
            const submitResponse = await fetch(`${VIRUSTOTAL_API_URL}/urls`, {
                method: 'POST',
                headers: {
                    'x-apikey': VIRUSTOTAL_API_KEY,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: `url=${encodeURIComponent(url)}`
            });

            if (!submitResponse.ok) {
                throw new Error(`VirusTotal submission failed: ${submitResponse.status}`);
            }

            // URL submitted - will need to check later
            return {
                checked: true,
                status: 'submitted',
                malicious: false,
                suspicious: true, // Flag for review since we don't have results yet
                score: null,
                message: 'URL submitted for analysis - pending results'
            };
        }

        if (!response.ok) {
            throw new Error(`VirusTotal API error: ${response.status}`);
        }

        const data = await response.json();
        const stats = data.data?.attributes?.last_analysis_stats || {};
        
        const maliciousCount = stats.malicious || 0;
        const suspiciousCount = stats.suspicious || 0;
        const harmlessCount = stats.harmless || 0;
        const totalEngines = maliciousCount + suspiciousCount + harmlessCount + (stats.undetected || 0);
        
        // Calculate threat score
        const threatScore = totalEngines > 0 
            ? ((maliciousCount * 2 + suspiciousCount) / totalEngines) * 100 
            : 0;

        return {
            checked: true,
            status: 'analyzed',
            malicious: maliciousCount > 2, // More than 2 engines flagged as malicious
            suspicious: suspiciousCount > 3 || maliciousCount > 0,
            score: threatScore,
            details: {
                malicious: maliciousCount,
                suspicious: suspiciousCount,
                harmless: harmlessCount,
                totalEngines: totalEngines
            },
            message: maliciousCount > 0 
                ? `${maliciousCount} engines detected malicious content`
                : suspiciousCount > 0
                    ? `${suspiciousCount} engines flagged as suspicious`
                    : 'No threats detected'
        };

    } catch (error) {
        console.error('[ModerationService] VirusTotal error:', error);
        return {
            checked: false,
            error: error.message,
            malicious: false,
            suspicious: false,
            score: null
        };
    }
}

/**
 * TIER 2: Analyze links with VirusTotal and pattern analysis
 * @param {string} text - Text containing links
 * @param {Object} tier2Config - Tier 2 configuration
 * @returns {Promise<Object>} Tier 2 result
 */
async function runTier2LinkSafety(text, tier2Config) {
    const result = {
        tier: 2,
        name: 'Link Safety',
        passed: true,
        action: 'allow',
        hasLinks: false,
        urls: [],
        checks: []
    };

    if (!tier2Config?.enabled) {
        result.checks.push({
            name: 'tier2_enabled',
            passed: true,
            message: 'Tier 2 link safety is disabled'
        });
        return result;
    }

    // Extract URLs from text
    const urls = extractUrls(text);
    
    if (urls.length === 0) {
        result.checks.push({
            name: 'link_detection',
            passed: true,
            message: 'No links detected in content'
        });
        return result;
    }

    result.hasLinks = true;
    result.checks.push({
        name: 'link_detection',
        passed: true,
        message: `Found ${urls.length} link(s) to analyze`
    });

    // Analyze each URL
    for (const url of urls) {
        const urlResult = {
            url: url,
            defangedUrl: defangUrl(url),
            safe: true,
            riskLevel: 'low',
            threats: [],
            virusTotal: null,
            patternAnalysis: null
        };

        // Check against safe domains whitelist
        const domain = extractDomainFromUrl(url);
        if (tier2Config.safeDomains?.some(safe => domain?.endsWith(safe))) {
            urlResult.safe = true;
            urlResult.riskLevel = 'safe';
            result.checks.push({
                name: `url_whitelist_${domain}`,
                passed: true,
                message: `${domain} is in trusted domains list`
            });
            result.urls.push(urlResult);
            continue;
        }

        // Run VirusTotal check if enabled
        if (tier2Config.useVirusTotal) {
            const vtResult = await checkVirusTotal(url);
            urlResult.virusTotal = vtResult;
            
            if (vtResult.checked) {
                if (vtResult.malicious) {
                    urlResult.safe = false;
                    urlResult.riskLevel = 'critical';
                    urlResult.threats.push({
                        type: 'virustotal',
                        severity: 'critical',
                        message: vtResult.message
                    });
                    result.checks.push({
                        name: 'virustotal_scan',
                        passed: false,
                        url: urlResult.defangedUrl,
                        message: `MALICIOUS: ${vtResult.message}`
                    });
                } else if (vtResult.suspicious) {
                    urlResult.riskLevel = 'high';
                    urlResult.threats.push({
                        type: 'virustotal',
                        severity: 'high',
                        message: vtResult.message
                    });
                    result.checks.push({
                        name: 'virustotal_scan',
                        passed: false,
                        url: urlResult.defangedUrl,
                        message: `SUSPICIOUS: ${vtResult.message}`
                    });
                } else {
                    result.checks.push({
                        name: 'virustotal_scan',
                        passed: true,
                        url: urlResult.defangedUrl,
                        message: 'VirusTotal: No threats detected'
                    });
                }
            } else {
                result.checks.push({
                    name: 'virustotal_scan',
                    passed: true,
                    url: urlResult.defangedUrl,
                    message: `VirusTotal: ${vtResult.error || 'Not checked'}`
                });
            }
        }

        // Run pattern analysis if enabled
        if (tier2Config.usePatternAnalysis) {
            const patternResult = analyzeUrl(url);
            urlResult.patternAnalysis = patternResult;
            
            if (!patternResult.safe) {
                urlResult.safe = false;
                if (patternResult.riskLevel === 'critical' || patternResult.riskLevel === 'high') {
                    urlResult.riskLevel = urlResult.riskLevel === 'critical' ? 'critical' : patternResult.riskLevel;
                }
                urlResult.threats.push(...patternResult.threats.map(t => ({
                    type: 'pattern',
                    severity: patternResult.riskLevel,
                    message: t.message
                })));
            }
            
            for (const check of patternResult.checks) {
                result.checks.push({
                    name: `pattern_${check.name}`,
                    passed: check.passed,
                    url: urlResult.defangedUrl,
                    message: check.message
                });
            }
        }

        result.urls.push(urlResult);
    }

    // Determine overall result
    const maliciousUrls = result.urls.filter(u => !u.safe || u.riskLevel === 'critical');
    const suspiciousUrls = result.urls.filter(u => u.riskLevel === 'high');

    if (maliciousUrls.length > 0 && tier2Config.blockMalicious) {
        result.passed = false;
        result.action = 'block';
    } else if (suspiciousUrls.length > 0 && tier2Config.flagSuspicious) {
        result.action = 'review';
    }

    return result;
}

/**
 * Extract domain from URL
 */
function extractDomainFromUrl(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.toLowerCase();
    } catch {
        return null;
    }
}

// ============== TIER 3: AZURE AI CONTENT SAFETY ==============

/**
 * TIER 3: Analyze text with Azure AI Content Safety
 * @param {string} text - Text to analyze
 * @param {Object} tier3Config - Tier 3 configuration
 * @returns {Promise<Object>} Tier 3 result
 */
async function runTier3AzureAI(text, tier3Config) {
    const result = {
        tier: 3,
        name: 'AI Content Safety',
        passed: true,
        action: 'allow',
        categories: [],
        checks: []
    };

    if (!tier3Config?.enabled) {
        result.checks.push({
            name: 'tier3_enabled',
            passed: true,
            message: 'Tier 3 AI analysis is disabled'
        });
        return result;
    }

    const client = getContentSafetyClient();
    
    if (!client) {
        result.checks.push({
            name: 'content_safety_api',
            passed: true,
            message: 'Azure Content Safety not configured - skipped'
        });
        return result;
    }

    try {
        const analyzeTextOption = {
            text: text,
            outputType: 'FourSeverityLevels'
        };

        const response = await client.path('/text:analyze').post({ body: analyzeTextOption });

        if (isUnexpected(response)) {
            console.error('[ModerationService] Unexpected API response:', response);
            throw new Error('Content Safety API error');
        }

        const categories = response.body.categoriesAnalysis || [];
        const thresholds = tier3Config.thresholds || DEFAULT_THRESHOLDS;

        for (const category of categories) {
            const categoryName = category.category?.toLowerCase() || '';
            const severity = category.severity || 0;
            
            // Map category names to config keys
            const categoryMap = {
                'hate': 'hate',
                'sexual': 'sexual',
                'violence': 'violence',
                'selfharm': 'selfHarm',
                'self-harm': 'selfHarm'
            };

            const configKey = categoryMap[categoryName];
            const threshold = thresholds[configKey] ?? DEFAULT_THRESHOLDS[configKey] ?? 2;

            const passed = severity < threshold;
            
            result.checks.push({
                name: `ai_${categoryName}`,
                category: category.category,
                severity: severity,
                threshold: threshold,
                passed: passed,
                message: passed 
                    ? `${category.category}: Safe (${severity} < ${threshold})`
                    : `${category.category}: Violation (${severity} >= ${threshold})`
            });

            if (!passed) {
                result.categories.push({
                    category: category.category,
                    severity: severity,
                    threshold: threshold
                });
                result.passed = false;
                result.action = tier3Config.autoBlock ? 'block' : 'review';
            }
        }

        if (result.passed) {
            result.checks.push({
                name: 'ai_overall',
                passed: true,
                message: 'Content passed Azure AI safety analysis'
            });
        }

        return result;

    } catch (error) {
        console.error('[ModerationService] Tier 3 error:', error);
        result.checks.push({
            name: 'ai_error',
            passed: true,
            message: `Analysis error: ${error.message} - allowing content`
        });
        result.error = error.message;
        return result;
    }
}

/**
 * Analyze image content with Azure AI
 */
export async function analyzeImage(base64Image, tier3Config = {}) {
    const client = getContentSafetyClient();
    
    if (!client) {
        return {
            tier: 3,
            name: 'Image Safety',
            passed: true,
            action: 'allow',
            categories: [],
            checks: [{ name: 'api', passed: true, message: 'Content Safety not configured' }]
        };
    }

    try {
        const response = await client.path('/image:analyze').post({
            body: { image: { content: base64Image } }
        });

        if (isUnexpected(response)) {
            throw new Error('Image analysis API error');
        }

        const categories = response.body.categoriesAnalysis || [];
        const thresholds = tier3Config.thresholds || DEFAULT_THRESHOLDS;
        const violations = [];
        const checks = [];
        let passed = true;

        for (const category of categories) {
            const categoryName = category.category?.toLowerCase() || '';
            const severity = category.severity || 0;
            const configKey = categoryName === 'selfharm' ? 'selfHarm' : categoryName;
            const threshold = thresholds[configKey] ?? 2;
            
            const checkPassed = severity < threshold;
            
            checks.push({
                name: `image_${categoryName}`,
                severity,
                threshold,
                passed: checkPassed,
                message: checkPassed 
                    ? `${category.category}: Safe (${severity} < ${threshold})`
                    : `${category.category}: Violation (${severity} >= ${threshold})`
            });

            if (!checkPassed) {
                violations.push({ category: category.category, severity, threshold });
                passed = false;
            }
        }

        return {
            tier: 3,
            name: 'Image Safety',
            passed,
            action: passed ? 'allow' : 'block',
            categories: violations,
            checks
        };

    } catch (error) {
        console.error('[ModerationService] Image analysis error:', error);
        return {
            tier: 3,
            name: 'Image Safety',
            passed: true,
            action: 'allow',
            categories: [],
            checks: [{ name: 'error', passed: true, message: error.message }],
            error: error.message
        };
    }
}

// ============== MODERATION QUEUE ==============

/**
 * Add item to moderation queue
 */
export async function addToModerationQueue(violation) {
    try {
        const container = getContainer(CONTAINERS.MODERATION_QUEUE);
        
        let safeContent = violation.content;
        if (violation.tier2Result?.urls) {
            safeContent = defangTextUrls(violation.content, violation.tier2Result.urls);
        }
        
        const queueItem = {
            id: `mod-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: violation.type || 'content',
            contentType: violation.contentType || 'text',
            content: violation.content,
            safeContent: safeContent,
            contentId: violation.contentId,
            userId: violation.userId,
            userEmail: violation.userEmail,
            channelId: violation.channelId,
            groupId: violation.groupId,
            workflow: violation.workflow,
            tier1Result: violation.tier1Result || null,
            tier2Result: violation.tier2Result || null,
            tier3Result: violation.tier3Result || null,
            tierFlow: violation.tierFlow || [],
            overallAction: violation.overallAction || 'review',
            status: 'pending',
            priority: calculatePriority(violation),
            createdAt: new Date().toISOString(),
            reviewedAt: null,
            reviewedBy: null,
            notes: null
        };

        const { resource } = await container.items.create(queueItem);
        console.log('[ModerationService] Added to queue:', resource.id);
        return resource;
    } catch (error) {
        console.error('[ModerationService] Queue error:', error);
        throw error;
    }
}

/**
 * Calculate priority based on violations
 */
function calculatePriority(violation) {
    // Tier 2 critical = critical priority
    if (violation.tier2Result?.urls?.some(u => u.riskLevel === 'critical')) {
        return 'critical';
    }
    // Tier 3 high severity = high priority
    if (violation.tier3Result?.categories?.some(c => c.severity >= 4)) {
        return 'high';
    }
    // Tier 1 blocklist match = high
    if (violation.tier1Result?.matches?.length > 0) {
        return 'high';
    }
    // Tier 2 malicious = high
    if (violation.tier2Result?.urls?.some(u => !u.safe)) {
        return 'high';
    }
    return 'medium';
}

/**
 * Get moderation queue
 */
export async function getModerationQueue(options = {}) {
    try {
        const container = getContainer(CONTAINERS.MODERATION_QUEUE);
        const { status = 'pending', limit = 50, workflow = null } = options;

        let query = 'SELECT * FROM c WHERE 1=1';
        const parameters = [];

        if (status !== 'all') {
            query += ' AND c.status = @status';
            parameters.push({ name: '@status', value: status });
        }

        if (workflow) {
            query += ' AND c.workflow = @workflow';
            parameters.push({ name: '@workflow', value: workflow });
        }

        query += ' ORDER BY c.createdAt DESC OFFSET 0 LIMIT @limit';
        parameters.push({ name: '@limit', value: limit });

        const { resources } = await container.items.query({ query, parameters }).fetchAll();
        return resources;
    } catch (error) {
        console.error('[ModerationService] Queue fetch error:', error);
        return [];
    }
}

/**
 * Update queue item
 */
export async function updateQueueItem(itemId, update) {
    try {
        const container = getContainer(CONTAINERS.MODERATION_QUEUE);
        
        const { resources } = await container.items
            .query({
                query: 'SELECT * FROM c WHERE c.id = @id',
                parameters: [{ name: '@id', value: itemId }]
            })
            .fetchAll();

        if (resources.length === 0) {
            throw new Error('Queue item not found');
        }

        const updatedItem = {
            ...resources[0],
            ...update,
            reviewedAt: new Date().toISOString()
        };

        const { resource } = await container.items.upsert(updatedItem);
        return resource;
    } catch (error) {
        console.error('[ModerationService] Queue update error:', error);
        throw error;
    }
}

/**
 * Get moderation statistics
 */
export async function getModerationStats() {
    try {
        const container = getContainer(CONTAINERS.MODERATION_QUEUE);

        const queries = {
            pending: 'SELECT VALUE COUNT(1) FROM c WHERE c.status = "pending"',
            approved: 'SELECT VALUE COUNT(1) FROM c WHERE c.status = "approved"',
            rejected: 'SELECT VALUE COUNT(1) FROM c WHERE c.status = "rejected"'
        };

        const results = {};
        for (const [key, query] of Object.entries(queries)) {
            const { resources } = await container.items.query({ query }).fetchAll();
            results[key] = resources[0] || 0;
        }

        // Today's count
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { resources: todayItems } = await container.items
            .query({
                query: 'SELECT VALUE COUNT(1) FROM c WHERE c.createdAt >= @today',
                parameters: [{ name: '@today', value: today.toISOString() }]
            })
            .fetchAll();

        return {
            pending: results.pending,
            approved: results.approved,
            rejected: results.rejected,
            todayTotal: todayItems[0] || 0
        };
    } catch (error) {
        console.error('[ModerationService] Stats error:', error);
        return { pending: 0, approved: 0, rejected: 0, todayTotal: 0 };
    }
}

// ============== USER MANAGEMENT ==============

/**
 * Record user violation
 */
export async function recordUserViolation(userId, violation) {
    try {
        const usersContainer = getContainer(CONTAINERS.USERS);
        
        const { resources } = await usersContainer.items
            .query({
                query: 'SELECT * FROM c WHERE c.id = @id',
                parameters: [{ name: '@id', value: userId }]
            })
            .fetchAll();

        if (resources.length === 0) {
            console.warn('[ModerationService] User not found:', userId);
            return null;
        }

        const user = resources[0];
        const violations = user.violations || [];
        
        violations.push({
            id: `v-${Date.now()}`,
            ...violation,
            timestamp: new Date().toISOString()
        });

        const updatedUser = {
            ...user,
            violations,
            violationCount: violations.length,
            lastViolationAt: new Date().toISOString()
        };

        const { resource } = await usersContainer.items.upsert(updatedUser);
        return resource;
    } catch (error) {
        console.error('[ModerationService] Violation record error:', error);
        throw error;
    }
}

/**
 * Set user block status
 */
export async function setUserBlockStatus(userId, blocked, reason, adminEmail) {
    try {
        const usersContainer = getContainer(CONTAINERS.USERS);
        
        const { resources } = await usersContainer.items
            .query({
                query: 'SELECT * FROM c WHERE c.id = @id',
                parameters: [{ name: '@id', value: userId }]
            })
            .fetchAll();

        if (resources.length === 0) {
            throw new Error('User not found');
        }

        const user = resources[0];
        const blockHistory = user.blockHistory || [];
        
        blockHistory.push({
            action: blocked ? 'blocked' : 'unblocked',
            reason,
            by: adminEmail,
            timestamp: new Date().toISOString()
        });

        const updatedUser = {
            ...user,
            blocked,
            blockedAt: blocked ? new Date().toISOString() : null,
            blockedBy: blocked ? adminEmail : null,
            blockReason: blocked ? reason : null,
            blockHistory
        };

        const { resource } = await usersContainer.items.upsert(updatedUser);
        return resource;
    } catch (error) {
        console.error('[ModerationService] Block status error:', error);
        throw error;
    }
}

/**
 * Update blocklist (Tier 1)
 */
export async function updateBlocklist(terms) {
    try {
        const config = await getModerationConfig();
        config.tier1 = config.tier1 || { enabled: true, blocklist: [] };
        config.tier1.blocklist = terms;
        await saveModerationConfig(config);
        
        return { 
            success: true, 
            itemCount: terms.length 
        };
    } catch (error) {
        console.error('[ModerationService] Blocklist update error:', error);
        return { success: false, error: error.message };
    }
}

// ============== MAIN MODERATION ENTRY POINT ==============

/**
 * MAIN ENTRY POINT: Tiered Content Moderation
 * 
 * Processes content through configured tiers based on workflow:
 * - Tier 1: Custom keyword filter
 * - Tier 2: Link safety (VirusTotal + patterns)
 * - Tier 3: Azure AI Content Safety
 * 
 * @param {Object} content - Content to moderate
 * @returns {Promise<Object>} Complete moderation result
 */
export async function moderateContent(content) {
    const { 
        type, 
        text, 
        image, 
        userId, 
        userEmail, 
        contentId, 
        channelId, 
        groupId,
        workflow = 'community' // Default workflow
    } = content;

    const result = {
        allowed: true,
        action: 'allow',
        needsReview: false,
        showPendingMessage: false,
        pendingMessageText: null,
        tierFlow: [],
        tier1Result: null,
        tier2Result: null,
        tier3Result: null,
        queueItem: null,
        workflow: workflow,
        reason: null
    };

    try {
        const config = await getModerationConfig();
        
        if (!config.enabled) {
            result.reason = 'moderation_disabled';
            result.tierFlow.push({
                tier: 0,
                name: 'Moderation Check',
                action: 'skip',
                message: 'Moderation is disabled'
            });
            return result;
        }

        // Check if workflow is enabled
        const workflowConfig = config.workflows?.[workflow];
        if (!workflowConfig?.enabled) {
            result.reason = 'workflow_disabled';
            result.tierFlow.push({
                tier: 0,
                name: 'Workflow Check',
                action: 'skip',
                message: `Moderation disabled for ${workflow}`
            });
            return result;
        }

        // ========== TIER 1: KEYWORD FILTER ==========
        if (text && workflowConfig.tier1 && config.tier1?.enabled) {
            const tier1 = runTier1KeywordFilter(text, config.tier1);
            result.tier1Result = tier1;
            result.tierFlow.push({
                tier: 1,
                name: tier1.name,
                action: tier1.action,
                passed: tier1.passed,
                checks: tier1.checks,
                matches: tier1.matches
            });

            if (!tier1.passed && tier1.action === 'block') {
                result.allowed = false;
                result.action = 'block';
                result.reason = 'tier1_keyword_match';
                
                await addToModerationQueue({
                    type: type || 'message',
                    contentType: 'text',
                    content: text.substring(0, 1000),
                    contentId,
                    userId,
                    userEmail,
                    channelId,
                    groupId,
                    workflow,
                    tier1Result: tier1,
                    tierFlow: result.tierFlow,
                    overallAction: 'blocked'
                });

                return result;
            }

            if (tier1.action === 'review') {
                result.needsReview = true;
            }
        }

        // ========== TIER 2: LINK SAFETY (VIRUSTOTAL) ==========
        if (text && workflowConfig.tier2 && config.tier2?.enabled) {
            const tier2 = await runTier2LinkSafety(text, config.tier2);
            result.tier2Result = tier2;
            result.tierFlow.push({
                tier: 2,
                name: tier2.name,
                action: tier2.action,
                passed: tier2.passed,
                hasLinks: tier2.hasLinks,
                checks: tier2.checks,
                urls: tier2.urls?.map(u => ({
                    defangedUrl: u.defangedUrl,
                    safe: u.safe,
                    riskLevel: u.riskLevel,
                    threats: u.threats,
                    virusTotal: u.virusTotal
                }))
            });

            if (!tier2.passed && tier2.action === 'block') {
                result.allowed = false;
                result.action = 'block';
                result.reason = 'tier2_malicious_link';

                await addToModerationQueue({
                    type: type || 'message',
                    contentType: 'text',
                    content: text.substring(0, 1000),
                    contentId,
                    userId,
                    userEmail,
                    channelId,
                    groupId,
                    workflow,
                    tier1Result: result.tier1Result,
                    tier2Result: tier2,
                    tierFlow: result.tierFlow,
                    overallAction: 'blocked'
                });

                return result;
            }

            if (tier2.action === 'review') {
                result.needsReview = true;
            }
        }

        // ========== TIER 3: AZURE AI CONTENT SAFETY ==========
        if (text && workflowConfig.tier3 && config.tier3?.enabled) {
            const tier3 = await runTier3AzureAI(text, config.tier3);
            result.tier3Result = tier3;
            result.tierFlow.push({
                tier: 3,
                name: tier3.name,
                action: tier3.action,
                passed: tier3.passed,
                checks: tier3.checks,
                categories: tier3.categories
            });

            if (!tier3.passed) {
                if (tier3.action === 'block') {
                    result.allowed = false;
                    result.action = 'block';
                    result.reason = 'tier3_ai_violation';
                } else {
                    result.needsReview = true;
                }
            }
        }

        // Analyze image if present and Tier 3 is enabled
        if (image && workflowConfig.tier3 && config.tier3?.enabled) {
            const imageResult = await analyzeImage(image, config.tier3);
            result.tierFlow.push({
                tier: 3,
                name: imageResult.name,
                action: imageResult.action,
                passed: imageResult.passed,
                checks: imageResult.checks,
                categories: imageResult.categories
            });

            if (!imageResult.passed) {
                result.allowed = false;
                result.action = 'block';
                result.reason = 'tier3_image_violation';
            }
        }

        // ========== QUEUE FOR REVIEW IF NEEDED ==========
        if (result.needsReview || !result.allowed) {
            if (result.allowed && result.needsReview) {
                result.tierFlow.push({
                    tier: 4,
                    name: 'Manual Review',
                    action: 'review',
                    passed: null,
                    message: 'Content queued for admin review'
                });

                const queueItem = await addToModerationQueue({
                    type: type || 'message',
                    contentType: text && image ? 'mixed' : (text ? 'text' : 'image'),
                    content: text ? text.substring(0, 1000) : '[image]',
                    contentId,
                    userId,
                    userEmail,
                    channelId,
                    groupId,
                    workflow,
                    tier1Result: result.tier1Result,
                    tier2Result: result.tier2Result,
                    tier3Result: result.tier3Result,
                    tierFlow: result.tierFlow,
                    overallAction: 'pending_review'
                });

                result.queueItem = queueItem;
                result.action = 'pending';
                result.reason = 'pending_review';

                if (config.showPendingMessage) {
                    result.showPendingMessage = true;
                    result.pendingMessageText = config.pendingMessageText || 
                        'Your message is being reviewed before posting.';
                }
            }
        } else {
            result.tierFlow.push({
                tier: 4,
                name: 'Final Check',
                action: 'allow',
                passed: true,
                message: 'Content passed all moderation tiers'
            });
            result.reason = 'passed';
        }

        return result;

    } catch (error) {
        console.error('[ModerationService] Moderation error:', error);
        
        result.tierFlow.push({
            tier: 0,
            name: 'Error',
            action: 'allow',
            message: `Moderation error: ${error.message}`
        });
        result.reason = 'moderation_error';
        result.error = error.message;
        return result;
    }
}

// Legacy exports for compatibility
export const analyzeText = runTier3AzureAI;
export const analyzeLinks = runTier2LinkSafety;

export default {
    getModerationConfig,
    saveModerationConfig,
    moderateContent,
    analyzeImage,
    addToModerationQueue,
    getModerationQueue,
    updateQueueItem,
    getModerationStats,
    recordUserViolation,
    setUserBlockStatus,
    updateBlocklist
};
