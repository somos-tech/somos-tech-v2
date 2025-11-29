/**
 * Email Subscriptions API - Manage email contacts and subscription preferences
 * 
 * Features:
 * - Email contact management (add, import, link to users)
 * - Subscription preferences (Newsletter, Events, Announcements)
 * - Unsubscribe functionality via token
 * - Auto-link contacts to users on signup
 * 
 * Endpoints:
 * - GET /api/subscriptions/contacts - List all email contacts (admin)
 * - POST /api/subscriptions/contacts - Add single contact (admin)
 * - POST /api/subscriptions/import - Bulk import contacts (admin)
 * - GET /api/subscriptions/preferences - Get current user's preferences
 * - PUT /api/subscriptions/preferences - Update user's preferences
 * - GET /api/subscriptions/manage/:token - Get preferences via token (public)
 * - POST /api/subscriptions/manage/:token - Update preferences via token (public)
 * - GET /api/subscriptions/stats - Get subscription statistics (admin)
 * 
 * @module emailSubscriptions
 * @author SOMOS.tech
 */

import { app } from '@azure/functions';
import { requireAdmin, requireAuth, getClientPrincipal } from '../shared/authMiddleware.js';
import { getContainer } from '../shared/db.js';
import { successResponse, errorResponse } from '../shared/httpResponse.js';
import crypto from 'crypto';

const CONTAINERS = {
    EMAIL_CONTACTS: 'email-contacts',
    USERS: 'users'
};

/**
 * Subscription categories available for users
 */
const SUBSCRIPTION_TYPES = {
    NEWSLETTER: 'newsletter',
    EVENTS: 'events',
    ANNOUNCEMENTS: 'announcements'
};

/**
 * Generate a secure unsubscribe token for an email
 */
function generateUnsubscribeToken(email) {
    const secret = process.env.UNSUBSCRIBE_SECRET || 'somos-unsubscribe-secret-2024';
    const hash = crypto.createHmac('sha256', secret)
        .update(email.toLowerCase())
        .digest('hex');
    return hash.substring(0, 32);
}

/**
 * Verify an unsubscribe token matches an email
 */
function verifyUnsubscribeToken(email, token) {
    const expectedToken = generateUnsubscribeToken(email);
    return token === expectedToken;
}

/**
 * Get the email contacts container
 */
function getEmailContactsContainer() {
    return getContainer(CONTAINERS.EMAIL_CONTACTS);
}

/**
 * Get or create an email contact
 */
async function getOrCreateContact(email, source = 'manual') {
    const container = getEmailContactsContainer();
    const normalizedEmail = email.toLowerCase().trim();
    
    try {
        // Try to find existing contact
        const { resources } = await container.items
            .query({
                query: 'SELECT * FROM c WHERE c.email = @email',
                parameters: [{ name: '@email', value: normalizedEmail }]
            })
            .fetchAll();
        
        if (resources.length > 0) {
            return { contact: resources[0], created: false };
        }
        
        // Create new contact with default subscriptions (all enabled)
        const now = new Date().toISOString();
        const newContact = {
            id: `contact-${crypto.randomUUID()}`,
            email: normalizedEmail,
            name: null,
            source: source, // 'manual', 'import', 'signup', 'auth0'
            linkedUserId: null, // Will be set when user signs up with this email
            subscriptions: {
                [SUBSCRIPTION_TYPES.NEWSLETTER]: true,
                [SUBSCRIPTION_TYPES.EVENTS]: true,
                [SUBSCRIPTION_TYPES.ANNOUNCEMENTS]: true
            },
            unsubscribeToken: generateUnsubscribeToken(normalizedEmail),
            status: 'active', // 'active', 'unsubscribed', 'bounced'
            createdAt: now,
            updatedAt: now,
            lastEmailSentAt: null,
            emailCount: 0,
            metadata: {}
        };
        
        const { resource } = await container.items.create(newContact);
        return { contact: resource, created: true };
    } catch (error) {
        console.error('Error getting/creating contact:', error);
        throw error;
    }
}

/**
 * Link an email contact to a user (called during signup)
 */
async function linkContactToUser(email, userId, userName) {
    const container = getEmailContactsContainer();
    const normalizedEmail = email.toLowerCase().trim();
    
    try {
        const { resources } = await container.items
            .query({
                query: 'SELECT * FROM c WHERE c.email = @email',
                parameters: [{ name: '@email', value: normalizedEmail }]
            })
            .fetchAll();
        
        if (resources.length > 0) {
            const contact = resources[0];
            contact.linkedUserId = userId;
            contact.name = userName || contact.name;
            contact.updatedAt = new Date().toISOString();
            contact.source = contact.source === 'import' ? 'import-linked' : contact.source;
            
            await container.item(contact.id, contact.id).replace(contact);
            console.log(`[EmailSubscriptions] Linked contact ${normalizedEmail} to user ${userId}`);
            return contact;
        }
        
        // No existing contact, create one
        const { contact } = await getOrCreateContact(normalizedEmail, 'signup');
        contact.linkedUserId = userId;
        contact.name = userName;
        await container.item(contact.id, contact.id).replace(contact);
        return contact;
    } catch (error) {
        console.error('Error linking contact to user:', error);
        // Don't throw - this is a non-critical operation
        return null;
    }
}

/**
 * Get contact by email
 */
async function getContactByEmail(email) {
    const container = getEmailContactsContainer();
    const normalizedEmail = email.toLowerCase().trim();
    
    const { resources } = await container.items
        .query({
            query: 'SELECT * FROM c WHERE c.email = @email',
            parameters: [{ name: '@email', value: normalizedEmail }]
        })
        .fetchAll();
    
    return resources.length > 0 ? resources[0] : null;
}

/**
 * Get contact by unsubscribe token
 */
async function getContactByToken(token) {
    const container = getEmailContactsContainer();
    
    const { resources } = await container.items
        .query({
            query: 'SELECT * FROM c WHERE c.unsubscribeToken = @token',
            parameters: [{ name: '@token', value: token }]
        })
        .fetchAll();
    
    return resources.length > 0 ? resources[0] : null;
}

/**
 * Update contact subscriptions
 */
async function updateContactSubscriptions(contactId, subscriptions) {
    const container = getEmailContactsContainer();
    
    try {
        const { resource: contact } = await container.item(contactId, contactId).read();
        
        if (!contact) {
            throw new Error('Contact not found');
        }
        
        contact.subscriptions = {
            ...contact.subscriptions,
            ...subscriptions
        };
        contact.updatedAt = new Date().toISOString();
        
        // Check if all subscriptions are disabled
        const allUnsubscribed = Object.values(contact.subscriptions).every(v => !v);
        if (allUnsubscribed) {
            contact.status = 'unsubscribed';
        } else if (contact.status === 'unsubscribed') {
            contact.status = 'active';
        }
        
        const { resource: updated } = await container.item(contactId, contactId).replace(contact);
        return updated;
    } catch (error) {
        console.error('Error updating subscriptions:', error);
        throw error;
    }
}

/**
 * Main Email Subscriptions Handler
 */
app.http('emailSubscriptions', {
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    authLevel: 'anonymous',
    route: 'email/{action?}/{param?}',
    handler: async (request, context) => {
        try {
            const method = request.method;
            const action = request.params.action;
            const param = request.params.param;
            const url = new URL(request.url);

            context.log(`[EmailSubscriptions] ${method} /${action || ''}/${param || ''}`);

            // ================================================================
            // PUBLIC ENDPOINTS (no auth required)
            // ================================================================

            // GET /api/subscriptions/manage/:token - Get preferences via unsubscribe token
            if (method === 'GET' && action === 'manage' && param) {
                const contact = await getContactByToken(param);
                
                if (!contact) {
                    return errorResponse(404, 'Invalid or expired unsubscribe link');
                }
                
                return successResponse({
                    email: contact.email,
                    subscriptions: contact.subscriptions,
                    status: contact.status
                });
            }

            // POST /api/subscriptions/manage/:token - Update preferences via token
            if (method === 'POST' && action === 'manage' && param) {
                const contact = await getContactByToken(param);
                
                if (!contact) {
                    return errorResponse(404, 'Invalid or expired unsubscribe link');
                }
                
                const body = await request.json();
                const { subscriptions, unsubscribeAll } = body;
                
                let newSubscriptions = contact.subscriptions;
                
                if (unsubscribeAll) {
                    newSubscriptions = {
                        [SUBSCRIPTION_TYPES.NEWSLETTER]: false,
                        [SUBSCRIPTION_TYPES.EVENTS]: false,
                        [SUBSCRIPTION_TYPES.ANNOUNCEMENTS]: false
                    };
                } else if (subscriptions) {
                    newSubscriptions = {
                        ...contact.subscriptions,
                        ...subscriptions
                    };
                }
                
                const updated = await updateContactSubscriptions(contact.id, newSubscriptions);
                
                return successResponse({
                    message: 'Preferences updated successfully',
                    email: updated.email,
                    subscriptions: updated.subscriptions,
                    status: updated.status
                });
            }

            // ================================================================
            // AUTHENTICATED USER ENDPOINTS
            // ================================================================

            // GET /api/subscriptions/preferences - Get current user's preferences
            if (method === 'GET' && action === 'preferences') {
                const authResult = await requireAuth(request);
                if (!authResult.authenticated) {
                    return errorResponse(401, 'Authentication required');
                }
                
                const principal = getClientPrincipal(request);
                const email = principal?.userDetails;
                
                if (!email) {
                    return errorResponse(400, 'User email not found');
                }
                
                let contact = await getContactByEmail(email);
                
                // If no contact exists, create one
                if (!contact) {
                    const { contact: newContact } = await getOrCreateContact(email, 'auth0');
                    newContact.linkedUserId = principal?.userId;
                    const container = getEmailContactsContainer();
                    await container.item(newContact.id, newContact.id).replace(newContact);
                    contact = newContact;
                }
                
                return successResponse({
                    email: contact.email,
                    subscriptions: contact.subscriptions,
                    unsubscribeUrl: `${process.env.FRONTEND_URL || 'https://dev.somos.tech'}/unsubscribe/${contact.unsubscribeToken}`
                });
            }

            // PUT /api/subscriptions/preferences - Update user's own preferences
            if (method === 'PUT' && action === 'preferences') {
                const authResult = await requireAuth(request);
                if (!authResult.authenticated) {
                    return errorResponse(401, 'Authentication required');
                }
                
                const principal = getClientPrincipal(request);
                const email = principal?.userDetails;
                
                if (!email) {
                    return errorResponse(400, 'User email not found');
                }
                
                const body = await request.json();
                const { subscriptions } = body;
                
                let contact = await getContactByEmail(email);
                
                if (!contact) {
                    const { contact: newContact } = await getOrCreateContact(email, 'auth0');
                    contact = newContact;
                }
                
                const updated = await updateContactSubscriptions(contact.id, subscriptions);
                
                return successResponse({
                    message: 'Preferences updated',
                    subscriptions: updated.subscriptions
                });
            }

            // ================================================================
            // ADMIN ENDPOINTS
            // ================================================================

            // All remaining endpoints require admin
            const adminAuth = await requireAdmin(request);
            if (!adminAuth.authenticated || !adminAuth.isAdmin) {
                return errorResponse(403, 'Admin access required');
            }

            // GET /api/subscriptions/contacts - List all contacts
            if (method === 'GET' && action === 'contacts') {
                const limit = parseInt(url.searchParams.get('limit') || '100');
                const offset = parseInt(url.searchParams.get('offset') || '0');
                const status = url.searchParams.get('status'); // 'active', 'unsubscribed', 'all'
                const search = url.searchParams.get('search');
                
                const container = getEmailContactsContainer();
                
                let query = 'SELECT * FROM c';
                const conditions = [];
                const parameters = [];
                
                if (status && status !== 'all') {
                    conditions.push('c.status = @status');
                    parameters.push({ name: '@status', value: status });
                }
                
                if (search) {
                    conditions.push('(CONTAINS(LOWER(c.email), @search) OR CONTAINS(LOWER(c.name), @search))');
                    parameters.push({ name: '@search', value: search.toLowerCase() });
                }
                
                if (conditions.length > 0) {
                    query += ' WHERE ' + conditions.join(' AND ');
                }
                
                query += ' ORDER BY c.createdAt DESC';
                query += ` OFFSET ${offset} LIMIT ${limit}`;
                
                const { resources: contacts } = await container.items
                    .query({ query, parameters })
                    .fetchAll();
                
                // Get total count
                const countQuery = conditions.length > 0
                    ? `SELECT VALUE COUNT(1) FROM c WHERE ${conditions.join(' AND ')}`
                    : 'SELECT VALUE COUNT(1) FROM c';
                
                const { resources: countResult } = await container.items
                    .query({ query: countQuery, parameters })
                    .fetchAll();
                
                return successResponse({
                    contacts,
                    total: countResult[0] || 0,
                    limit,
                    offset
                });
            }

            // POST /api/subscriptions/contacts - Add single contact
            if (method === 'POST' && action === 'contacts') {
                const body = await request.json();
                const { email, name, subscriptions } = body;
                
                if (!email || !email.includes('@')) {
                    return errorResponse(400, 'Valid email is required');
                }
                
                const { contact, created } = await getOrCreateContact(email, 'manual');
                
                if (name) {
                    contact.name = name;
                }
                
                if (subscriptions) {
                    contact.subscriptions = {
                        ...contact.subscriptions,
                        ...subscriptions
                    };
                }
                
                if (!created) {
                    contact.updatedAt = new Date().toISOString();
                    const container = getEmailContactsContainer();
                    await container.item(contact.id, contact.id).replace(contact);
                }
                
                return successResponse({
                    contact,
                    created,
                    message: created ? 'Contact created' : 'Contact already exists, updated'
                });
            }

            // POST /api/subscriptions/import - Bulk import contacts
            if (method === 'POST' && action === 'import') {
                const body = await request.json();
                const { emails, defaultSubscriptions } = body;
                
                if (!Array.isArray(emails) || emails.length === 0) {
                    return errorResponse(400, 'emails array is required');
                }
                
                if (emails.length > 1000) {
                    return errorResponse(400, 'Maximum 1000 emails per import');
                }
                
                const results = {
                    created: 0,
                    existing: 0,
                    invalid: 0,
                    errors: []
                };
                
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                const container = getEmailContactsContainer();
                
                for (const emailEntry of emails) {
                    const email = typeof emailEntry === 'string' 
                        ? emailEntry.trim().toLowerCase()
                        : emailEntry.email?.trim().toLowerCase();
                    const name = typeof emailEntry === 'object' ? emailEntry.name : null;
                    
                    if (!email || !emailRegex.test(email)) {
                        results.invalid++;
                        continue;
                    }
                    
                    try {
                        const { contact, created } = await getOrCreateContact(email, 'import');
                        
                        if (created) {
                            results.created++;
                            
                            // Apply default subscriptions if provided
                            if (defaultSubscriptions) {
                                contact.subscriptions = {
                                    ...contact.subscriptions,
                                    ...defaultSubscriptions
                                };
                            }
                            
                            if (name) {
                                contact.name = name;
                            }
                            
                            await container.item(contact.id, contact.id).replace(contact);
                        } else {
                            results.existing++;
                        }
                    } catch (err) {
                        results.errors.push({ email, error: err.message });
                    }
                }
                
                return successResponse({
                    message: `Import completed: ${results.created} created, ${results.existing} existing, ${results.invalid} invalid`,
                    results
                });
            }

            // GET /api/subscriptions/stats - Get subscription statistics
            if (method === 'GET' && action === 'stats') {
                const container = getEmailContactsContainer();
                
                // Get counts by status
                const { resources: statusCounts } = await container.items
                    .query('SELECT c.status, COUNT(1) as count FROM c GROUP BY c.status')
                    .fetchAll();
                
                // Get subscription counts
                const { resources: allContacts } = await container.items
                    .query('SELECT c.subscriptions FROM c WHERE c.status = "active"')
                    .fetchAll();
                
                const subscriptionCounts = {
                    newsletter: 0,
                    events: 0,
                    announcements: 0
                };
                
                allContacts.forEach(c => {
                    if (c.subscriptions?.newsletter) subscriptionCounts.newsletter++;
                    if (c.subscriptions?.events) subscriptionCounts.events++;
                    if (c.subscriptions?.announcements) subscriptionCounts.announcements++;
                });
                
                // Get linked vs unlinked
                const { resources: linkedCount } = await container.items
                    .query('SELECT VALUE COUNT(1) FROM c WHERE c.linkedUserId != null')
                    .fetchAll();
                
                const { resources: totalCount } = await container.items
                    .query('SELECT VALUE COUNT(1) FROM c')
                    .fetchAll();
                
                return successResponse({
                    total: totalCount[0] || 0,
                    byStatus: statusCounts.reduce((acc, s) => {
                        acc[s.status] = s.count;
                        return acc;
                    }, {}),
                    subscriptions: subscriptionCounts,
                    linkedUsers: linkedCount[0] || 0,
                    unlinkedContacts: (totalCount[0] || 0) - (linkedCount[0] || 0)
                });
            }

            // DELETE /api/subscriptions/contacts/:id - Delete a contact
            if (method === 'DELETE' && action === 'contacts' && param) {
                const container = getEmailContactsContainer();
                
                try {
                    await container.item(param, param).delete();
                    return successResponse({ message: 'Contact deleted' });
                } catch (error) {
                    if (error.code === 404) {
                        return errorResponse(404, 'Contact not found');
                    }
                    throw error;
                }
            }

            return errorResponse(404, 'Endpoint not found');

        } catch (error) {
            context.error('[EmailSubscriptions] Error:', error);
            return errorResponse(500, 'Internal server error', error.message);
        }
    }
});

// Export functions for use in other modules
export { 
    getOrCreateContact, 
    linkContactToUser, 
    getContactByEmail,
    updateContactSubscriptions,
    generateUnsubscribeToken,
    SUBSCRIPTION_TYPES 
};
