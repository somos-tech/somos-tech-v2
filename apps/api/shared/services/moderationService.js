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
import { createNotification } from './notificationService.js';
import { trackVirusTotalCall, trackContentSafetyCall, trackGoogleSafeBrowsingCall } from './apiTrackingService.js';

// ============== CONFIGURATION ==============

// Content Safety configuration
const CONTENT_SAFETY_ENDPOINT = process.env.CONTENT_SAFETY_ENDPOINT;
const CONTENT_SAFETY_KEY = process.env.CONTENT_SAFETY_KEY;

// VirusTotal configuration
const VIRUSTOTAL_API_KEY = process.env.VIRUSTOTAL_API_KEY;
const VIRUSTOTAL_API_URL = 'https://www.virustotal.com/api/v3';

// Google Safe Browsing configuration
const GOOGLE_SAFE_BROWSING_API_KEY = process.env.GOOGLE_SAFE_BROWSING_API_KEY;
const GOOGLE_SAFE_BROWSING_API_URL = 'https://safebrowsing.googleapis.com/v4/threatMatches:find';

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

// ============== DEFAULT BLOCKLIST ==============

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
    'b*tch', 'stfu', 'gtfo',
    
    // Common curse words and profanity
    'shit', 'sh*t', 'sh1t', 'shyt', 'bullshit', 'bullsh*t', 'horseshit',
    'fuck', 'f*ck', 'fuk', 'fuc', 'fucker', 'f*cker', 'fucking', 'f*cking',
    'motherfucker', 'motherfuck', 'mf', 'mthrfckr',
    'ass', 'a$$', '@ss', 'arse', 'asshole', 'a**hole', 'assh0le',
    'bitch', 'b*tch', 'b1tch', 'biatch', 'biotch',
    'bastard', 'b*stard', 'bstrd',
    'damn', 'd*mn', 'dammit', 'damnit', 'goddamn', 'goddammit',
    'dick', 'd*ck', 'd1ck', 'dickhead', 'dckhead',
    'cock', 'c*ck', 'c0ck', 'cocksucker',
    'pussy', 'p*ssy', 'puss', 'pu$$y',
    'piss', 'p*ss', 'pissed', 'piss off',
    'slut', 'sl*t', 'slutty',
    'twat', 'tw*t',
    'wanker', 'w*nker', 'tosser',
    'jerk', 'jerkoff', 'jackass', 'jack*ss',
    'dumbass', 'dumb*ss', 'smartass',
    'dipshit', 'dipsh*t',
    'wtf', 'wth', 'stfu', 'lmfao', 'lmao',
    'hell', 'go to hell', 'burn in hell'
];

// ============== DEFAULT BLOCKED DOMAINS ==============

/**
 * Default list of blocked domains for Tier 1
 * Categories: URL shorteners (can hide malicious links), known malicious domains,
 * adult content, piracy sites, known scam domains
 * 
 * Note: URL shorteners are blocked because they can mask malicious destinations
 */
const DEFAULT_BLOCKED_DOMAINS = [
    // ===== URL SHORTENERS (commonly used to hide malicious links) =====
    // Major shorteners
    'bit.ly', 'bitly.com', 'tinyurl.com', 'goo.gl', 't.co', 'ow.ly', 'is.gd', 
    'buff.ly', 'adf.ly', 'bit.do', 'mcaf.ee', 'su.pr', 'tiny.cc', 'shorte.st', 
    'bc.vc', 'j.mp', 'v.gd', 'tr.im', 'soo.gd', 'cutt.ly', 's.id', 'rb.gy', 
    'clck.ru', 'shorturl.at', '1url.com', 'hyperurl.co', 'urlzs.com', 'u.to', 
    '0rz.tw', 'cli.gs', 'short.to', 'budurl.com', 'ping.fm', 'post.ly',
    'just.as', 'bkite.com', 'snipr.com', 'fic.kr', 'loopt.us', 'doiop.com',
    'twitthis.com', 'htxt.it', 'ak.gt', 'yep.it', 'posted.at', 'xrl.us',
    'metamark.net', 'sn.im', 'hurl.ws', 'eurl.us', 'yourls.org',
    // Additional shorteners commonly abused
    'lnk.to', 'lnkd.in', 'rebrand.ly', 'go2l.ink', 'shrinkme.io', 'ouo.io',
    'za.gl', 'exe.io', 'fc.lc', 'shrinkearn.com', 'linkvertise.com', 
    'link-to.net', 'linkshrink.net', 'adfoc.us', 'adyou.me', 'ay.gy',
    'clik.pw', 'clk.sh', 'dfrnt.us', 'hive.am', 'ity.im', 'l.gg',
    'mfrnt.cc', 'plu.sh', 'q.gs', 'qq.tc', 'rdrct.it', 'shortur.com',
    'u.bb', 'tii.la', 'viid.su', 'waa.ai', 'wow.link', 'xii.cc', 'yns.io',
    
    // ===== KNOWN MALICIOUS/PHISHING PATTERNS =====
    // Gift card scams
    'freegiftcard', 'free-giftcard', 'giftcard-free', 'amazon-giftcard-free',
    'free-iphone', 'iphone-giveaway', 'free-ipad', 'win-iphone',
    'claim-prize', 'you-won', 'winner-alert', 'lottery-winner',
    'prize-claim', 'winner-notification', 'jackpot-winner',
    // Account phishing
    'urgent-action', 'verify-account', 'suspended-account', 'security-alert',
    'login-verify', 'account-update', 'confirm-identity', 'password-reset-now',
    'account-suspended', 'verify-your-account', 'secure-login', 'auth-verify',
    'update-payment', 'billing-update', 'payment-failed', 'reactivate-account',
    
    // ===== CRYPTO SCAM DOMAINS =====
    'double-bitcoin', 'free-crypto', 'crypto-giveaway', 'elon-giveaway',
    'btc-double', 'eth-airdrop', 'nft-free', 'token-airdrop',
    'bitcoin-doubler', 'crypto-doubler', 'free-btc', 'free-eth',
    'elon-bitcoin', 'musk-giveaway', 'tesla-btc', 'tesla-crypto',
    'solana-airdrop', 'doge-giveaway', 'shiba-free', 'binance-giveaway',
    
    // ===== ADULT CONTENT DOMAINS =====
    'pornhub.com', 'xvideos.com', 'xnxx.com', 'xhamster.com', 'redtube.com',
    'youporn.com', 'spankbang.com', 'porn.com', 'tube8.com', 'beeg.com',
    'brazzers.com', 'onlyfans.com', 'chaturbate.com', 'livejasmin.com',
    'cam4.com', 'myfreecams.com', 'stripchat.com', 'bongacams.com',
    
    // ===== PIRACY/ILLEGAL STREAMING =====
    '123movies', 'putlocker', 'fmovies', 'soap2day', 'yts.mx', 'rarbg',
    'thepiratebay', '1337x', 'kickass', 'torrentz', 'limetorrents',
    'torrentgalaxy', 'nyaa.si', 'rutracker', 'fitgirl-repacks',
    'crackwatch', 'skidrow', 'codex', 'reloaded', 'cpy',
    
    // ===== FREE TLDs (commonly used for scams) =====
    '.tk', '.ml', '.ga', '.cf', '.gq', '.cc', '.pw',
    
    // ===== DISCORD PHISHING =====
    'discord-nitro-free', 'discordgift', 'dlscord', 'd1scord', 'discordc',
    'nitro-gift', 'free-nitro', 'discord-airdrop', 'disc0rd', 'discorcl',
    'discordapp.gift', 'discordnitro', 'discord-free', 'nitrofree',
    
    // ===== STEAM/GAMING PHISHING =====
    'steam-gift', 'steamcommunity.ru', 'steampowered.ru', 'steam-trade',
    'free-steam', 'steam-wallet', 'csgo-free', 'free-skins',
    'roblox-robux', 'free-robux', 'robux-generator', 'vbucks-free',
    'fortnite-free', 'minecraft-free', 'free-vbucks',
    
    // ===== SOCIAL MEDIA PHISHING =====
    'instagram-followers', 'free-followers', 'twitter-followers',
    'tiktok-followers', 'youtube-subscribers', 'facebook-hack',
    'instagram-hack', 'snapchat-hack', 'whatsapp-hack',
    
    // ===== MALWARE DISTRIBUTION =====
    'download-free', 'crack-download', 'keygen', 'serial-key',
    'activation-key', 'license-key-free', 'software-crack',
    'patch-download', 'loader-download', 'activator-free',
    
    // ===== SURVEY SCAMS =====
    'survey-for-gift', 'complete-survey', 'survey-reward',
    'human-verification', 'verify-human', 'captcha-bypass',
    
    // ===== KNOWN MALICIOUS DOMAINS (from threat feeds) =====
    'grabify.link', 'iplogger.org', 'iplogger.com', 'iplogger.ru',
    '2no.co', 'yip.su', 'ipgrabber', 'blasze.tk', 'blasze.com',
    'ps3cfw.com', 'urlz.fr', 'webry.info', 'whatstheirip.com'
];

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
            const existingConfig = resources[0];
            let needsSave = false;
            
            // If blocklist has fewer than 10 items, merge with defaults
            // This ensures the default blocklist is populated even if a few items were manually added
            const currentBlocklist = existingConfig.tier1?.blocklist || [];
            if (currentBlocklist.length < 10) {
                console.log('[ModerationService] Blocklist has fewer than 10 items, merging with defaults');
                // Merge existing with defaults, avoiding duplicates
                const mergedBlocklist = [...new Set([...DEFAULT_BLOCKLIST, ...currentBlocklist])];
                existingConfig.tier1 = {
                    ...existingConfig.tier1,
                    blocklist: mergedBlocklist
                };
                needsSave = true;
            }
            
            // If blockedDomains is empty or missing, merge with defaults
            // This ensures the default blocked domains list is always populated
            const currentBlockedDomains = existingConfig.tier1?.blockedDomains || [];
            if (currentBlockedDomains.length < 10) {
                console.log('[ModerationService] BlockedDomains has fewer than 10 items, merging with defaults');
                // Merge existing with defaults, avoiding duplicates
                const mergedBlockedDomains = [...new Set([...DEFAULT_BLOCKED_DOMAINS, ...currentBlockedDomains])];
                existingConfig.tier1 = {
                    ...existingConfig.tier1,
                    blockedDomains: mergedBlockedDomains
                };
                needsSave = true;
            }
            
            // Save if any merges occurred
            if (needsSave) {
                await saveModerationConfig(existingConfig);
            }
            
            return existingConfig;
        }

        // Return default config if none exists
        return getDefaultConfig();
    } catch (error) {
        console.error('[ModerationService] Error getting moderation config:', error);
        return getDefaultConfig();
    }
}

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
            description: 'Custom blocklist of words, phrases, and domains',
            blocklist: [...DEFAULT_BLOCKLIST],
            blockedDomains: [...DEFAULT_BLOCKED_DOMAINS],
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
            },
            profile: {
                enabled: true,
                name: 'User Profiles',
                description: 'User profile fields (display name, bio, website)',
                tier1: true,
                tier2: true,
                tier3: true
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
 * Normalize text by collapsing repeated characters
 * e.g., "FFFUUUCCCKKK" -> "fuck", "niiiggggaaa" -> "niga"
 * @param {string} text - Text to normalize
 * @returns {string} Normalized text
 */
function normalizeRepeatedChars(text) {
    // Collapse repeated characters (3+ of same char becomes 1)
    return text.replace(/(.)\1{2,}/gi, '$1');
}

/**
 * Create a regex pattern that matches a term with optional repeated characters
 * e.g., "fuck" matches "fuck", "fuuuck", "fffuuuccckkk", "f.u.c.k", etc.
 * @param {string} term - The term to create pattern for
 * @returns {RegExp} Regex pattern
 */
function createFuzzyPattern(term) {
    // Build pattern where each character can be repeated multiple times
    // and optionally separated by common obfuscation characters
    const obfuscationChars = '[\\s.*_\\-]*'; // spaces, dots, asterisks, underscores, hyphens
    
    let pattern = '';
    for (let i = 0; i < term.length; i++) {
        const char = term[i];
        const escapedChar = escapeRegex(char);
        
        // Each character can appear 1 or more times, optionally followed by obfuscation
        if (i < term.length - 1) {
            pattern += `${escapedChar}+${obfuscationChars}`;
        } else {
            pattern += `${escapedChar}+`;
        }
    }
    
    return new RegExp(pattern, 'gi');
}

/**
 * Check if text contains a blocklist term using fuzzy matching
 * Catches variations like: FUCK, FuCk, FFFUUUCCCKKK, f*ck, f.u.c.k
 * @param {string} text - Text to check
 * @param {string} term - Term to look for
 * @param {boolean} matchWholeWord - Whether to match whole words only
 * @returns {boolean} True if match found
 */
function fuzzyMatch(text, term, matchWholeWord = false) {
    // First, try exact match on normalized text (faster)
    const normalizedText = normalizeRepeatedChars(text.toLowerCase());
    const normalizedTerm = term.toLowerCase().replace(/[*]/g, ''); // Remove asterisks from term
    
    if (normalizedText.includes(normalizedTerm)) {
        return true;
    }
    
    // Try fuzzy pattern match for obfuscated text
    const fuzzyPattern = createFuzzyPattern(normalizedTerm);
    if (fuzzyPattern.test(text)) {
        return true;
    }
    
    // Check for common letter substitutions (leetspeak)
    // Note: Special regex chars must be escaped (| and + especially)
    const leetMap = {
        'a': '[a@4]',
        'e': '[e3]',
        'i': '[i1!\\|]',  // Escaped | character
        'o': '[o0]',
        's': '[s$5]',
        't': '[t7\\+]',   // Escaped + character
        'l': '[l1\\|]',   // Escaped | character
        'b': '[b8]',
        'g': '[g9]'
    };
    
    let leetPattern = '';
    for (const char of normalizedTerm) {
        if (leetMap[char]) {
            leetPattern += leetMap[char] + '+';
        } else {
            leetPattern += escapeRegex(char) + '+';
        }
    }
    
    const leetRegex = new RegExp(leetPattern, 'gi');
    if (leetRegex.test(normalizeRepeatedChars(text))) {
        return true;
    }
    
    return false;
}

/**
 * TIER 1: Check text against custom blocklist and blocked domains
 * Uses fuzzy matching to catch variations with repeated chars, leetspeak, etc.
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
        blockedUrls: [],
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

    // Check blocklist keywords
    const blocklist = tier1Config.blocklist || [];
    if (blocklist.length > 0) {
        for (const term of blocklist) {
            // Use fuzzy matching to catch variations
            const matched = fuzzyMatch(text, term, tier1Config.matchWholeWord);
            
            if (matched) {
                result.matches.push({
                    term: term,
                    type: 'blocklist'
                });
            }
        }
    }

    // Check blocked domains (URL shorteners, malicious, adult, etc.)
    const blockedDomains = tier1Config.blockedDomains || [];
    if (blockedDomains.length > 0) {
        const urls = extractUrlsFromText(text);
        for (const url of urls) {
            const domain = extractDomainFromUrl(url);
            if (domain) {
                // Check if the URL contains any blocked domain pattern
                for (const blockedDomain of blockedDomains) {
                    // Handle patterns (like ".xyz/free") vs full domains (like "bit.ly")
                    const urlLower = url.toLowerCase();
                    const blockedLower = blockedDomain.toLowerCase();
                    
                    if (blockedLower.startsWith('.')) {
                        // Pattern matching (e.g., ".xyz/free")
                        if (urlLower.includes(blockedLower)) {
                            result.blockedUrls.push({
                                url: url,
                                domain: blockedDomain,
                                type: 'pattern',
                                reason: 'Matches blocked URL pattern'
                            });
                            result.matches.push({
                                term: blockedDomain,
                                type: 'blocked_domain'
                            });
                            break;
                        }
                    } else {
                        // Full domain matching
                        if (domain.endsWith(blockedLower) || domain === blockedLower || urlLower.includes(blockedLower)) {
                            result.blockedUrls.push({
                                url: url,
                                domain: blockedDomain,
                                type: 'domain',
                                reason: 'Domain is in blocked list'
                            });
                            result.matches.push({
                                term: blockedDomain,
                                type: 'blocked_domain'
                            });
                            break;
                        }
                    }
                }
            }
        }
    }

    // Add check results
    if (result.matches.length > 0) {
        result.passed = false;
        result.action = tier1Config.action || 'block';
        
        const keywordMatches = result.matches.filter(m => m.type === 'blocklist');
        const domainMatches = result.matches.filter(m => m.type === 'blocked_domain');
        
        if (keywordMatches.length > 0) {
            result.checks.push({
                name: 'blocklist_check',
                passed: false,
                message: `Found ${keywordMatches.length} blocked term(s): ${keywordMatches.map(m => m.term).join(', ')}`
            });
        }
        
        if (domainMatches.length > 0) {
            result.checks.push({
                name: 'domain_blocklist_check',
                passed: false,
                message: `Found ${domainMatches.length} blocked domain(s): ${domainMatches.map(m => m.term).join(', ')}`
            });
        }
    } else {
        if (blocklist.length > 0) {
            result.checks.push({
                name: 'blocklist_check',
                passed: true,
                message: `Checked against ${blocklist.length} terms - no matches`
            });
        }
        if (blockedDomains.length > 0) {
            result.checks.push({
                name: 'domain_blocklist_check',
                passed: true,
                message: `Checked against ${blockedDomains.length} blocked domains - no matches`
            });
        }
    }

    return result;
}

/**
 * Extract URLs from text (simple regex extraction)
 * @param {string} text - Text to extract URLs from
 * @returns {string[]} Array of URLs
 */
function extractUrlsFromText(text) {
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
    return text.match(urlRegex) || [];
}

/**
 * Escape special regex characters
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============== SECURITY ATTACK DETECTION ==============

/**
 * Security attack patterns to detect
 * Covers: SQL injection, XSS, script injection, command injection, path traversal, etc.
 */
const SECURITY_ATTACK_PATTERNS = [
    // SQL Injection patterns
    { 
        name: 'sql_injection',
        category: 'SQL Injection',
        severity: 'critical',
        patterns: [
            /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b\s+(FROM|INTO|TABLE|DATABASE|ALL))/gi,
            /(\bOR\b\s+[\d'"]+=[\d'"]+)/gi,  // OR 1=1, OR '1'='1'
            /(\bAND\b\s+[\d'"]+=[\d'"]+)/gi, // AND 1=1
            /(--|#|\/\*|\*\/)/g,  // SQL comments
            /(\bEXEC\b|\bEXECUTE\b)\s*\(/gi,
            /(\bxp_\w+)/gi,  // SQL Server extended procedures
            /(\bsp_\w+)/gi,  // SQL Server stored procedures
            /(\bWAITFOR\b\s+\bDELAY\b)/gi,  // Time-based injection
            /(\bBENCHMARK\b\s*\()/gi,
            /(\bSLEEP\b\s*\()/gi,
            /('\s*;\s*--)/gi,  // String termination with comment
            /(\bINFORMATION_SCHEMA\b)/gi,
            /(\bSYSOBJECTS\b|\bSYSCOLUMNS\b)/gi,
            /(\bLOAD_FILE\b\s*\()/gi,
            /(\bINTO\s+(OUT|DUMP)FILE\b)/gi,
        ]
    },
    // XSS (Cross-Site Scripting) patterns
    {
        name: 'xss_attack',
        category: 'XSS Attack',
        severity: 'critical',
        patterns: [
            /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
            /<script[\s>]/gi,
            /javascript\s*:/gi,
            /vbscript\s*:/gi,
            /on\w+\s*=\s*["']?[^"'>\s]+/gi,  // onclick=, onerror=, onload=, etc.
            /<iframe[\s>]/gi,
            /<object[\s>]/gi,
            /<embed[\s>]/gi,
            /<svg[\s\S]*?onload/gi,
            /<img[\s\S]*?onerror/gi,
            /expression\s*\(/gi,  // CSS expression
            /<base[\s>]/gi,
            /<link[\s\S]*?href\s*=\s*["']?javascript/gi,
            /&#x?[0-9a-f]+;/gi,  // HTML entities (often used to obfuscate)
            /\\x[0-9a-f]{2}/gi,  // Hex encoding
            /\\u[0-9a-f]{4}/gi,  // Unicode encoding
        ]
    },
    // Command Injection patterns
    {
        name: 'command_injection',
        category: 'Command Injection',
        severity: 'critical',
        patterns: [
            /[;&|`$]\s*(cat|ls|dir|pwd|whoami|id|uname|wget|curl|nc|netcat|bash|sh|cmd|powershell)/gi,
            /\$\(.*\)/g,  // Command substitution
            /`.*`/g,  // Backtick command substitution
            /\|\s*(cat|ls|dir|pwd|whoami|id|bash|sh)/gi,  // Pipe to command
            />\s*\/?(etc|tmp|var|home|usr)/gi,  // Output redirection to system paths
            /(;|\||&&)\s*(rm|del|format|mkfs|dd)\s/gi,  // Destructive commands
            /\beval\s*\(/gi,
            /\bexec\s*\(/gi,
            /\bsystem\s*\(/gi,
            /\bpassthru\s*\(/gi,
            /\bshell_exec\s*\(/gi,
            /\bpopen\s*\(/gi,
            /\bproc_open\s*\(/gi,
        ]
    },
    // Path Traversal patterns
    {
        name: 'path_traversal',
        category: 'Path Traversal',
        severity: 'high',
        patterns: [
            /\.\.[\/\\]/g,  // ../  or ..\
            /\.\.[\/\\]\.\.[\/\\]/g,  // ../../
            /%2e%2e[%2f%5c]/gi,  // URL encoded ../
            /\.\.%c0%af/gi,  // UTF-8 encoded ../
            /\.\.%c1%9c/gi,
            /(\/etc\/passwd|\/etc\/shadow|\/etc\/hosts)/gi,
            /(c:\\windows|c:\\system32|c:\\boot\.ini)/gi,
            /\/proc\/self\//gi,
        ]
    },
    // LDAP Injection patterns
    {
        name: 'ldap_injection',
        category: 'LDAP Injection',
        severity: 'high',
        patterns: [
            /[()&|!*]/g,  // Only flag if combined with LDAP-like context
            /\(\|/g,  // LDAP OR
            /\(&/g,  // LDAP AND
        ]
    },
    // XML/XXE Injection patterns
    {
        name: 'xxe_injection',
        category: 'XXE Attack',
        severity: 'critical',
        patterns: [
            /<!DOCTYPE[^>]*\[/gi,
            /<!ENTITY/gi,
            /SYSTEM\s+["']/gi,
            /<!\[CDATA\[/gi,
            /file:\/\//gi,
            /expect:\/\//gi,
            /php:\/\//gi,
        ]
    },
    // NoSQL Injection patterns
    {
        name: 'nosql_injection',
        category: 'NoSQL Injection',
        severity: 'high',
        patterns: [
            /\$where\s*:/gi,
            /\$gt\s*:/gi,
            /\$lt\s*:/gi,
            /\$ne\s*:/gi,
            /\$regex\s*:/gi,
            /\$or\s*:\s*\[/gi,
            /\$and\s*:\s*\[/gi,
            /\{\s*"\$\w+"/gi,  // {"$cmd": ...}
        ]
    },
    // Template Injection patterns
    {
        name: 'template_injection',
        category: 'Template Injection',
        severity: 'high',
        patterns: [
            /\{\{.*\}\}/g,  // Mustache/Handlebars
            /\$\{.*\}/g,  // Template literals (if suspicious)
            /<%= .* %>/g,  // ERB
            /\{%.*%\}/g,  // Jinja/Django
            /#\{.*\}/g,  // Ruby interpolation
        ]
    },
    // Protocol/Scheme attacks
    {
        name: 'protocol_attack',
        category: 'Protocol Attack',
        severity: 'high',
        patterns: [
            /data\s*:/gi,
            /blob\s*:/gi,
            /file\s*:/gi,
            /ftp\s*:/gi,
            /gopher\s*:/gi,
            /ldap\s*:/gi,
            /dict\s*:/gi,
        ]
    },
    // Header Injection patterns
    {
        name: 'header_injection',
        category: 'Header Injection',
        severity: 'high',
        patterns: [
            /[\r\n]+(Set-Cookie|Location|Content-Type|X-)/gi,
            /%0d%0a/gi,  // CRLF encoded
            /%0a%0d/gi,
        ]
    },
    
    // ============== OWASP TOP 10 FOR LLM/AI APPLICATIONS ==============
    // Based on OWASP Top 10 for LLM Applications 2025
    // https://owasp.org/www-project-top-10-for-large-language-model-applications/
    
    // LLM01: Prompt Injection
    {
        name: 'prompt_injection',
        category: 'Prompt Injection',
        severity: 'critical',
        patterns: [
            /ignore\s+(previous|all|above|prior)\s+(instructions?|prompts?|rules?|commands?)/gi,
            /disregard\s+(your|all|the)\s+(instructions?|programming|rules?|guidelines?)/gi,
            /forget\s+(everything|all|your)\s+(you|instructions?|rules?)/gi,
            /you\s+are\s+now\s+(a|an|in)\s+(new|different|jailbreak|DAN|evil)/gi,
            /pretend\s+(you\s+are|to\s+be|you're)\s+(not|a|an)\s*(AI|assistant|chatbot|restricted)?/gi,
            /act\s+as\s+(if|though)\s+you\s+(have\s+no|don't\s+have|aren't)/gi,
            /bypass\s+(your|all|the)\s+(safety|content|ethical)\s*(filters?|restrictions?|guidelines?)?/gi,
            /override\s+(your|system|safety)\s*(prompt|instructions?|rules?)?/gi,
            /new\s+instructions?\s*:/gi,
            /system\s+prompt\s*:/gi,
            /\[INST\]|\[\/INST\]|\[\[SYSTEM\]\]/gi,  // Common LLM control tokens
            /<\|im_start\|>|<\|im_end\|>/gi,  // ChatML tokens
            /\bDAN\s+mode\b|\bDeveloper\s+Mode\b|\bJailbreak\b/gi,
            /do\s+anything\s+now/gi,  // DAN = Do Anything Now
        ]
    },
    // LLM02: Insecure Output Handling (Detecting attempts to inject executable content via AI)
    {
        name: 'llm_output_injection',
        category: 'LLM Output Injection',
        severity: 'critical',
        patterns: [
            /generate\s+(code|script)\s+(that|to|which)\s*(will|can|should)?\s*(execute|run|delete|hack)/gi,
            /write\s+(malicious|harmful|exploit)\s+(code|script|payload)/gi,
            /create\s+(a\s+)?(backdoor|trojan|malware|virus|ransomware)/gi,
            /output\s+(raw|unescaped|executable)\s*(html|javascript|sql|code)/gi,
            /respond\s+with\s*(only\s+)?(raw|pure|executable)\s*(code|json|xml)/gi,
        ]
    },
    // LLM03: Training Data Poisoning (Attempts to extract or influence training data)
    {
        name: 'training_data_attack',
        category: 'Training Data Attack',
        severity: 'high',
        patterns: [
            /reveal\s+(your|the)\s+(training|source)\s*(data|information|dataset)/gi,
            /what\s+(data|information)\s+(were\s+you|was)\s+trained\s+on/gi,
            /show\s+me\s+(your|the)\s+training\s+(data|examples|set)/gi,
            /extract\s+(your|the)\s+(knowledge|training|model)\s*(base|data|weights)?/gi,
        ]
    },
    // LLM04: Model Denial of Service
    {
        name: 'llm_dos_attack',
        category: 'LLM DoS Attack',
        severity: 'high',
        patterns: [
            /repeat\s+(this|the\s+following)\s*(word|phrase|text)?\s*(\d{3,}|\s+million|\s+billion|\s+trillion)\s*times/gi,
            /generate\s+(an?\s+)?(extremely|infinitely|very)\s+(long|large)\s*(text|response|output)/gi,
            /write\s+(a\s+)?(\d{5,}|million|billion)\s*(word|character|page)/gi,
            /loop\s+(forever|infinitely|endlessly)/gi,
            /count\s+(to|from)\s*(\d{6,}|infinity|forever)/gi,
        ]
    },
    // LLM05: Supply Chain Vulnerabilities (Plugin/extension attacks)
    {
        name: 'llm_supply_chain',
        category: 'LLM Supply Chain Attack',
        severity: 'high',
        patterns: [
            /install\s+(plugin|extension|package)\s+from\s+(http|ftp|file)/gi,
            /load\s+(external|remote|untrusted)\s+(model|weights|data|plugin)/gi,
            /import\s+from\s+["']https?:\/\/[^"']+["']/gi,
            /fetch\s+(model|weights|config)\s+from/gi,
        ]
    },
    // LLM06: Sensitive Information Disclosure
    {
        name: 'llm_data_leak',
        category: 'Sensitive Data Extraction',
        severity: 'critical',
        patterns: [
            /reveal\s+(your|the)\s+(system|initial|original)\s*(prompt|instructions?|configuration)/gi,
            /show\s+(me\s+)?(your|the)\s+(hidden|secret|system)\s*(prompt|instructions?|rules?)/gi,
            /what\s+(is|are)\s+(your|the)\s+(system|initial|secret)\s*(prompt|instructions?)/gi,
            /print\s+(your|the)\s+(full|complete|entire)\s*(system\s+)?(prompt|instructions?|context)/gi,
            /repeat\s+(your|the)\s+(system|initial)\s*(prompt|message|instructions?)\s*(back|verbatim)?/gi,
            /dump\s+(your|the|all)\s*(system|user|conversation)\s*(data|history|context|memory)/gi,
            /list\s+(all\s+)?(previous|other)\s+users?('s|\s+)?(data|queries|messages)/gi,
            /access\s+(other|previous)\s+(user|customer|client)\s*(data|information|records)/gi,
        ]
    },
    // LLM07: Insecure Plugin Design
    {
        name: 'llm_plugin_abuse',
        category: 'Plugin Abuse',
        severity: 'high',
        patterns: [
            /use\s+(the\s+)?(file|shell|exec|system|code)\s*(plugin|tool|function)\s+to/gi,
            /call\s+(the\s+)?(api|function|tool)\s+with\s+["'`]?(rm|delete|drop|exec)/gi,
            /execute\s+(arbitrary|any|custom)\s+(code|command|script)\s+(via|using|through)\s+(plugin|tool)/gi,
        ]
    },
    // LLM08: Excessive Agency (Preventing over-permissive actions)
    {
        name: 'excessive_agency',
        category: 'Excessive Agency Attack',
        severity: 'high',
        patterns: [
            /perform\s+(all|any)\s+(actions?|operations?)\s+(without|no)\s+(asking|confirmation|approval)/gi,
            /auto(matically)?\s+(approve|execute|delete|modify)\s+(all|everything|anything)/gi,
            /skip\s+(all\s+)?(confirmation|verification|approval)\s*(steps?|checks?|prompts?)?/gi,
            /grant\s+(yourself|me)\s+(full|admin|root|elevated)\s*(access|permissions?|privileges?)/gi,
        ]
    },
    // LLM09: Overreliance (Social engineering via AI authority)
    {
        name: 'ai_social_engineering',
        category: 'AI Social Engineering',
        severity: 'medium',
        patterns: [
            /as\s+an\s+AI,?\s+(you\s+)?(must|should|have\s+to)\s+(always\s+)?(obey|comply|follow)/gi,
            /AI\s+(assistants?|systems?)\s+(are\s+)?(required|obligated|must)\s+to/gi,
            /your\s+programming\s+(requires|demands|forces)\s+you\s+to/gi,
            /I\s+am\s+(your|the)\s+(creator|developer|admin|owner|master)/gi,
            /this\s+is\s+a(n)?\s+(official|authorized|admin)\s+(request|command|override)/gi,
        ]
    },
    // LLM10: Model Theft (Attempts to extract model information)
    {
        name: 'model_theft',
        category: 'Model Theft Attempt',
        severity: 'critical',
        patterns: [
            /extract\s+(your|the)\s+(model|neural\s+network)\s*(weights|parameters|architecture)/gi,
            /reveal\s+(your|the)\s+(internal|hidden)\s*(layers?|architecture|structure)/gi,
            /what\s+(model|architecture|version)\s+are\s+you(\s+based\s+on)?/gi,
            /export\s+(your|the)\s+(model|weights|parameters)\s+(to|as)/gi,
            /download\s+(your|the)\s+(full|complete)\s*(model|weights)/gi,
            /give\s+me\s+(the|your)\s+(model|embedding|vector)\s*(file|data|weights)/gi,
        ]
    },
];

/**
 * Run security attack detection on text
 * @param {string} text - Text to analyze
 * @returns {Object} Security check result
 */
function runSecurityCheck(text) {
    const result = {
        safe: true,
        attacks: [],
        severity: 'none',
        checks: []
    };

    if (!text || typeof text !== 'string') {
        result.checks.push({
            name: 'security_input',
            passed: true,
            message: 'No text to analyze'
        });
        return result;
    }

    // Decode common encodings for better detection
    let decodedText = text;
    try {
        decodedText = decodeURIComponent(text);
    } catch (e) {
        // Keep original if decode fails
    }

    const textVariants = [text, decodedText, text.toLowerCase()];

    for (const attackType of SECURITY_ATTACK_PATTERNS) {
        for (const pattern of attackType.patterns) {
            for (const variant of textVariants) {
                if (pattern.test(variant)) {
                    // Avoid duplicate detections
                    if (!result.attacks.find(a => a.name === attackType.name)) {
                        result.attacks.push({
                            name: attackType.name,
                            category: attackType.category,
                            severity: attackType.severity,
                            pattern: pattern.toString()
                        });
                        result.safe = false;
                        
                        // Track highest severity
                        if (attackType.severity === 'critical') {
                            result.severity = 'critical';
                        } else if (attackType.severity === 'high' && result.severity !== 'critical') {
                            result.severity = 'high';
                        }
                    }
                    break;
                }
            }
        }
    }

    if (result.attacks.length > 0) {
        result.checks.push({
            name: 'security_scan',
            passed: false,
            message: `Detected ${result.attacks.length} potential attack(s): ${result.attacks.map(a => a.category).join(', ')}`
        });
    } else {
        result.checks.push({
            name: 'security_scan',
            passed: true,
            message: 'No security threats detected'
        });
    }

    return result;
}

// ============== TIER 2: LINK SAFETY (VIRUSTOTAL + GOOGLE SAFE BROWSING) ==============

/**
 * Check URL with Google Safe Browsing API
 * @param {string} url - URL to check
 * @returns {Promise<Object>} Google Safe Browsing result
 */
async function checkGoogleSafeBrowsing(url) {
    if (!GOOGLE_SAFE_BROWSING_API_KEY) {
        return {
            checked: false,
            error: 'Google Safe Browsing API key not configured',
            malicious: false,
            threatTypes: []
        };
    }

    try {
        const requestBody = {
            client: {
                clientId: 'somos-tech',
                clientVersion: '1.0.0'
            },
            threatInfo: {
                threatTypes: [
                    'MALWARE',
                    'SOCIAL_ENGINEERING',
                    'UNWANTED_SOFTWARE',
                    'POTENTIALLY_HARMFUL_APPLICATION'
                ],
                platformTypes: ['ANY_PLATFORM'],
                threatEntryTypes: ['URL'],
                threatEntries: [{ url }]
            }
        };

        const response = await fetch(`${GOOGLE_SAFE_BROWSING_API_URL}?key=${GOOGLE_SAFE_BROWSING_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        // Track the API call
        trackGoogleSafeBrowsingCall('url_check', response.ok).catch(() => {});

        if (!response.ok) {
            throw new Error(`Google Safe Browsing API error: ${response.status}`);
        }

        const data = await response.json();

        // If matches is empty or undefined, URL is safe
        if (!data.matches || data.matches.length === 0) {
            return {
                checked: true,
                malicious: false,
                threatTypes: [],
                message: 'No threats detected'
            };
        }

        // URL has threats
        const threatTypes = [...new Set(data.matches.map(m => m.threatType))];
        return {
            checked: true,
            malicious: true,
            threatTypes,
            message: `Threats detected: ${threatTypes.join(', ')}`,
            details: data.matches
        };

    } catch (error) {
        console.error('[ModerationService] Google Safe Browsing error:', error);
        trackGoogleSafeBrowsingCall('url_check', false).catch(() => {});
        return {
            checked: false,
            error: error.message,
            malicious: false,
            threatTypes: []
        };
    }
}

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

        // Track the URL check API call
        trackVirusTotalCall('url_check', response.ok || response.status === 404).catch(() => {});

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

            // Track the URL submit API call
            trackVirusTotalCall('url_submit', submitResponse.ok).catch(() => {});

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
        // Track the failed API call
        trackVirusTotalCall('url_check', false).catch(() => {});
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

        // Run Google Safe Browsing check if enabled
        if (tier2Config.useGoogleSafeBrowsing !== false) {
            const gsbResult = await checkGoogleSafeBrowsing(url);
            urlResult.googleSafeBrowsing = gsbResult;
            
            if (gsbResult.checked) {
                if (gsbResult.malicious) {
                    urlResult.safe = false;
                    urlResult.riskLevel = 'critical';
                    urlResult.threats.push({
                        type: 'google_safe_browsing',
                        severity: 'critical',
                        message: gsbResult.message,
                        threatTypes: gsbResult.threatTypes
                    });
                    result.checks.push({
                        name: 'google_safe_browsing',
                        passed: false,
                        url: urlResult.defangedUrl,
                        message: `THREAT DETECTED: ${gsbResult.message}`
                    });
                } else {
                    result.checks.push({
                        name: 'google_safe_browsing',
                        passed: true,
                        url: urlResult.defangedUrl,
                        message: 'Google Safe Browsing: No threats detected'
                    });
                }
            } else {
                result.checks.push({
                    name: 'google_safe_browsing',
                    passed: true,
                    url: urlResult.defangedUrl,
                    message: `Google Safe Browsing: ${gsbResult.error || 'Not checked'}`
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

        // Track the API call
        await trackContentSafetyCall('text_analyze', !isUnexpected(response));

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

        // Track the API call
        await trackContentSafetyCall('image_analyze', !isUnexpected(response));

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
                
                // Send warning notification to the user
                if (userEmail) {
                    try {
                        await createNotification({
                            type: 'moderation_warning',
                            title: '⚠️ Message Blocked',
                            message: 'Your message was blocked because it contained prohibited words or phrases. Please review our community guidelines.',
                            severity: 'warning',
                            recipientEmail: userEmail,
                            metadata: {
                                reason: 'tier1_keyword_match',
                                workflow: workflow,
                                blockedTerms: tier1.matches?.map(m => m.term).slice(0, 3) // Only include first 3 terms
                            }
                        });
                        console.log(`[ModerationService] Warning notification sent to ${userEmail}`);
                    } catch (notifError) {
                        console.error('[ModerationService] Failed to send warning notification:', notifError);
                    }
                }
                
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

        // ========== SECURITY ATTACK DETECTION ==========
        // Always run security checks on text content to detect hacking attempts
        if (text) {
            const securityResult = runSecurityCheck(text);
            result.securityResult = securityResult;
            result.tierFlow.push({
                tier: 1.5,
                name: 'Security Scan',
                action: securityResult.safe ? 'allow' : 'block',
                passed: securityResult.safe,
                checks: securityResult.checks,
                attacks: securityResult.attacks
            });

            if (!securityResult.safe) {
                result.allowed = false;
                result.action = 'block';
                result.reason = 'security_attack_detected';
                
                // Send security warning notification to the user
                if (userEmail) {
                    try {
                        const attackTypes = securityResult.attacks.map(a => a.category).join(', ');
                        await createNotification({
                            type: 'security_warning',
                            title: '🛡️ Security Alert - Message Blocked',
                            message: `Your message was blocked because it contained patterns that appear to be security attacks (${attackTypes}). This activity has been logged.`,
                            severity: 'critical',
                            recipientEmail: userEmail,
                            metadata: {
                                reason: 'security_attack_detected',
                                workflow: workflow,
                                attackTypes: securityResult.attacks.map(a => a.category),
                                severity: securityResult.severity
                            }
                        });
                        console.log(`[ModerationService] Security warning notification sent to ${userEmail}`);
                    } catch (notifError) {
                        console.error('[ModerationService] Failed to send security warning:', notifError);
                    }
                }

                // Log security incident with high priority
                await addToModerationQueue({
                    type: 'security_incident',
                    contentType: 'text',
                    content: text.substring(0, 1000),
                    contentId,
                    userId,
                    userEmail,
                    channelId,
                    groupId,
                    workflow,
                    securityResult: securityResult,
                    tierFlow: result.tierFlow,
                    overallAction: 'blocked',
                    priority: 'critical'
                });

                console.warn(`[ModerationService] SECURITY ALERT: Attack detected from ${userEmail || userId}:`, 
                    securityResult.attacks.map(a => a.category).join(', '));

                return result;
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

                // Send warning notification to the user
                if (userEmail) {
                    try {
                        await createNotification({
                            type: 'moderation_warning',
                            title: '⚠️ Message Blocked - Unsafe Link',
                            message: 'Your message was blocked because it contained a potentially harmful link. For your safety and the safety of our community, we do not allow malicious or suspicious URLs.',
                            severity: 'warning',
                            recipientEmail: userEmail,
                            metadata: {
                                reason: 'tier2_malicious_link',
                                workflow: workflow,
                                unsafeUrls: tier2.urls?.filter(u => !u.safe).map(u => u.defangedUrl).slice(0, 3)
                            }
                        });
                        console.log(`[ModerationService] Link warning notification sent to ${userEmail}`);
                    } catch (notifError) {
                        console.error('[ModerationService] Failed to send link warning notification:', notifError);
                    }
                }

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
            console.log(`[ModerationService] Running Tier 3 AI analysis for workflow: ${workflow}`);
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
                    
                    // Send warning notification to the user
                    if (userEmail) {
                        try {
                            const categories = tier3.categories?.map(c => c.category).join(', ') || 'harmful content';
                            await createNotification({
                                type: 'moderation_warning',
                                title: '⚠️ Message Blocked - Content Policy',
                                message: `Your message was blocked because our AI safety system detected potentially harmful content (${categories}). Please ensure your messages follow our community guidelines.`,
                                severity: 'warning',
                                recipientEmail: userEmail,
                                metadata: {
                                    reason: 'tier3_ai_violation',
                                    workflow: workflow,
                                    categories: tier3.categories?.map(c => ({ category: c.category, severity: c.severity }))
                                }
                            });
                            console.log(`[ModerationService] AI violation notification sent to ${userEmail}`);
                        } catch (notifError) {
                            console.error('[ModerationService] Failed to send AI violation notification:', notifError);
                        }
                    }
                } else {
                    result.needsReview = true;
                }
            }
        } else if (text) {
            // Add skip message to tier flow when Tier 3 is not enabled
            const skipReason = !config.tier3?.enabled 
                ? 'AI Content Safety is disabled globally'
                : !workflowConfig.tier3 
                    ? `AI Content Safety disabled for ${workflow} workflow`
                    : 'No text to analyze';
            result.tierFlow.push({
                tier: 3,
                name: 'AI Content Safety',
                action: 'skip',
                passed: null,
                message: skipReason,
                checks: [{
                    name: 'tier3_skipped',
                    passed: true,
                    message: skipReason
                }]
            });
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
