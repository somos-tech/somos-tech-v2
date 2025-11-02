/**
 * Input validation utilities for API endpoints
 * Helps prevent injection attacks and data corruption
 */

/**
 * Validate email address format
 * @param {string} email - Email address to validate
 * @returns {boolean} True if valid
 */
export function isValidEmail(email) {
    if (!email || typeof email !== 'string') {
        return false;
    }
    
    // RFC 5322 compliant email regex (simplified)
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email) && email.length <= 254;
}

/**
 * Sanitize string input
 * @param {string} input - String to sanitize
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Sanitized string
 */
export function sanitizeString(input, maxLength = 255) {
    if (!input || typeof input !== 'string') {
        return '';
    }
    
    return input.trim().substring(0, maxLength);
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid
 */
export function isValidUrl(url) {
    if (!url || typeof url !== 'string') {
        return false;
    }
    
    try {
        const urlObj = new URL(url);
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
        return false;
    }
}

/**
 * Validate date string
 * @param {string} dateStr - Date string to validate
 * @returns {boolean} True if valid
 */
export function isValidDate(dateStr) {
    if (!dateStr) {
        return false;
    }
    
    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Sanitize object by removing potentially dangerous fields
 * @param {Object} obj - Object to sanitize
 * @param {string[]} allowedFields - List of allowed field names
 * @returns {Object} Sanitized object
 */
export function sanitizeObject(obj, allowedFields) {
    if (!obj || typeof obj !== 'object') {
        return {};
    }
    
    const sanitized = {};
    for (const field of allowedFields) {
        if (Object.hasOwn(obj, field)) {
            sanitized[field] = obj[field];
        }
    }
    
    return sanitized;
}

/**
 * Validate name field (for first/last names)
 * @param {string} name - Name to validate
 * @returns {boolean} True if valid
 */
export function isValidName(name) {
    if (!name || typeof name !== 'string') {
        return false;
    }
    
    // Allow letters, spaces, hyphens, and apostrophes
    const nameRegex = /^[a-zA-Z\s'-]+$/;
    return nameRegex.test(name) && name.length > 0 && name.length <= 50;
}

/**
 * Prevent NoSQL injection in query parameters
 * @param {string} value - Value to validate
 * @returns {boolean} True if safe
 */
export function isSafeQueryValue(value) {
    if (!value || typeof value !== 'string') {
        return false;
    }
    
    // Check for common NoSQL injection patterns
    const dangerousPatterns = [
        /\$where/i,
        /\$ne/i,
        /\$gt/i,
        /\$lt/i,
        /\$or/i,
        /\$and/i,
        /\$regex/i,
        /javascript:/i,
        /<script/i,
        /eval\(/i
    ];
    
    return !dangerousPatterns.some(pattern => pattern.test(value));
}

/**
 * Validate and sanitize event data
 * @param {Object} eventData - Event data to validate
 * @returns {Object} { valid: boolean, errors: string[], sanitized: Object }
 */
export function validateEventData(eventData) {
    const errors = [];
    const sanitized = {};
    
    // Name is required
    if (!eventData.name || typeof eventData.name !== 'string') {
        errors.push('Event name is required');
    } else {
        sanitized.name = sanitizeString(eventData.name, 200);
    }
    
    // Date is required and must be valid
    if (!eventData.date) {
        errors.push('Event date is required');
    } else if (!isValidDate(eventData.date)) {
        errors.push('Invalid event date');
    } else {
        sanitized.date = eventData.date;
    }
    
    // Optional fields
    if (eventData.description) {
        sanitized.description = sanitizeString(eventData.description, 2000);
    }
    
    if (eventData.location) {
        sanitized.location = sanitizeString(eventData.location, 200);
    }
    
    if (eventData.imageUrl) {
        if (isValidUrl(eventData.imageUrl)) {
            sanitized.imageUrl = eventData.imageUrl;
        } else {
            errors.push('Invalid image URL');
        }
    }
    
    return {
        valid: errors.length === 0,
        errors,
        sanitized
    };
}

/**
 * Validate and sanitize group data
 * @param {Object} groupData - Group data to validate
 * @returns {Object} { valid: boolean, errors: string[], sanitized: Object }
 */
export function validateGroupData(groupData) {
    const errors = [];
    const sanitized = {};
    
    // City is required
    if (!groupData.city || typeof groupData.city !== 'string') {
        errors.push('City is required');
    } else {
        sanitized.city = sanitizeString(groupData.city, 100);
    }
    
    // State is required
    if (!groupData.state || typeof groupData.state !== 'string') {
        errors.push('State is required');
    } else {
        sanitized.state = sanitizeString(groupData.state, 50);
    }
    
    // Image URL is required
    if (!groupData.imageUrl) {
        errors.push('Image URL is required');
    } else if (!isValidUrl(groupData.imageUrl)) {
        errors.push('Invalid image URL');
    } else {
        sanitized.imageUrl = groupData.imageUrl;
    }
    
    // Optional fields
    if (groupData.name) {
        sanitized.name = sanitizeString(groupData.name, 200);
    }
    
    if (groupData.description) {
        sanitized.description = sanitizeString(groupData.description, 1000);
    }
    
    if (groupData.visibility) {
        const validVisibilities = ['Public', 'Private'];
        if (validVisibilities.includes(groupData.visibility)) {
            sanitized.visibility = groupData.visibility;
        } else {
            errors.push('Invalid visibility value');
        }
    }
    
    return {
        valid: errors.length === 0,
        errors,
        sanitized
    };
}
