/**
 * Announcements API - Create and send announcements to the community
 * 
 * Integrates with:
 * - Azure Communication Services for email
 * - Push notifications for mobile/web
 * - Email subscription preferences
 * 
 * Endpoints:
 * - GET /api/announcements - List announcements (admin)
 * - POST /api/announcements - Create announcement (admin)
 * - GET /api/announcements/:id - Get single announcement (admin)
 * - PUT /api/announcements/:id - Update announcement (admin)
 * - DELETE /api/announcements/:id - Delete announcement (admin)
 * - POST /api/announcements/:id/send - Send announcement (admin)
 * - GET /api/announcements/public - Get published announcements (public)
 * 
 * @module announcements
 * @author SOMOS.tech
 */

import { app } from '@azure/functions';
import { requireAdmin, getClientPrincipal } from '../shared/authMiddleware.js';
import { getContainer } from '../shared/db.js';
import { successResponse, errorResponse } from '../shared/httpResponse.js';
import { sendEmailNotification } from '../shared/services/notificationService.js';
import crypto from 'crypto';

/**
 * Subscription types (duplicated to avoid circular dependency)
 */
const SUBSCRIPTION_TYPES = {
    NEWSLETTER: 'newsletters',
    EVENTS: 'events',
    ANNOUNCEMENTS: 'announcements'
};

const CONTAINERS = {
    ANNOUNCEMENTS: 'announcements',
    EMAIL_CONTACTS: 'email-contacts',
    USERS: 'users'
};

/**
 * Announcement types
 */
const ANNOUNCEMENT_TYPES = {
    GENERAL: 'general',
    EVENT: 'event',
    NEWSLETTER: 'newsletter',
    URGENT: 'urgent'
};

/**
 * Announcement statuses
 */
const ANNOUNCEMENT_STATUS = {
    DRAFT: 'draft',
    SCHEDULED: 'scheduled',
    SENDING: 'sending',
    SENT: 'sent',
    FAILED: 'failed'
};

/**
 * Get eligible recipients based on announcement type and subscription preferences
 */
async function getEligibleRecipients(announcementType, targetAudience = 'all') {
    const contactsContainer = getContainer(CONTAINERS.EMAIL_CONTACTS);
    const usersContainer = getContainer(CONTAINERS.USERS);
    const membershipsContainer = getContainer(CONTAINERS.GROUP_MEMBERSHIPS);
    
    // Map announcement type to subscription type
    const subscriptionType = announcementType === 'event' 
        ? SUBSCRIPTION_TYPES.EVENTS 
        : announcementType === 'newsletter'
            ? SUBSCRIPTION_TYPES.NEWSLETTER
            : SUBSCRIPTION_TYPES.ANNOUNCEMENTS;
    
    // Get all active contacts with the relevant subscription enabled
    const { resources: contacts } = await contactsContainer.items
        .query({
            query: `SELECT c.email, c.name, c.linkedUserId, c.unsubscribeToken 
                    FROM c 
                    WHERE c.status = "active" 
                    AND c.subscriptions.${subscriptionType} = true`
        })
        .fetchAll();
    
    // If targeting a specific group, filter to group members
    if (targetAudience && targetAudience !== 'all' && targetAudience.startsWith('group-')) {
        const groupId = targetAudience;
        
        // Get all user IDs that are members of this group
        const { resources: memberships } = await membershipsContainer.items
            .query({
                query: `SELECT m.userId FROM m WHERE m.groupId = @groupId AND m.status = "active"`,
                parameters: [{ name: '@groupId', value: groupId }]
            })
            .fetchAll();
        
        const groupMemberUserIds = new Set(memberships.map(m => m.userId));
        
        // Filter contacts to only those linked to group members
        const filteredContacts = contacts.filter(c => 
            c.linkedUserId && groupMemberUserIds.has(c.linkedUserId)
        );
        
        return filteredContacts.map(c => ({
            email: c.email,
            name: c.name || c.email.split('@')[0],
            unsubscribeToken: c.unsubscribeToken,
            linkedUserId: c.linkedUserId
        }));
    }
    
    return contacts.map(c => ({
        email: c.email,
        name: c.name || c.email.split('@')[0],
        unsubscribeToken: c.unsubscribeToken,
        linkedUserId: c.linkedUserId
    }));
}

/**
 * Generate beautiful HTML email template
 */
function generateEmailHtml(announcement, unsubscribeUrl) {
    const { title, content, type, ctaText, ctaUrl } = announcement;
    
    const typeColors = {
        general: '#00FF91',
        event: '#00D4FF',
        newsletter: '#FF6B9D',
        urgent: '#FF4444'
    };
    
    const accentColor = typeColors[type] || typeColors.general;
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #051323; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #051323;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%;">
                    <!-- Logo -->
                    <tr>
                        <td align="center" style="padding-bottom: 30px;">
                            <img src="https://dev.somos.tech/somos-logo.png" alt="SOMOS.tech" width="150" style="display: block;">
                        </td>
                    </tr>
                    
                    <!-- Main Content Card -->
                    <tr>
                        <td style="background-color: #0A1628; border-radius: 16px; border: 1px solid ${accentColor}40; overflow: hidden;">
                            <!-- Header Bar -->
                            <div style="background: linear-gradient(90deg, ${accentColor}20, transparent); padding: 20px 30px; border-bottom: 1px solid ${accentColor}30;">
                                <span style="color: ${accentColor}; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                                    ${type === 'urgent' ? '🚨 URGENT' : type === 'event' ? '📅 EVENT' : type === 'newsletter' ? '📰 NEWSLETTER' : '📢 ANNOUNCEMENT'}
                                </span>
                            </div>
                            
                            <!-- Content -->
                            <div style="padding: 30px;">
                                <h1 style="color: #FFFFFF; font-size: 24px; font-weight: 700; margin: 0 0 20px 0; line-height: 1.3;">
                                    ${title}
                                </h1>
                                
                                <div style="color: #8394A7; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                                    ${content.replace(/\n/g, '<br>')}
                                </div>
                                
                                ${ctaUrl ? `
                                <div style="text-align: center; margin: 30px 0;">
                                    <a href="${ctaUrl}" style="display: inline-block; background-color: ${accentColor}; color: #051323; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                                        ${ctaText || 'Learn More'}
                                    </a>
                                </div>
                                ` : ''}
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 20px; text-align: center;">
                            <p style="color: #5A6F82; font-size: 14px; margin: 0 0 10px 0;">
                                SOMOS.tech - Empowering the Latino tech community
                            </p>
                            <p style="color: #3D4F61; font-size: 12px; margin: 0;">
                                <a href="${unsubscribeUrl}" style="color: #5A6F82; text-decoration: underline;">Manage email preferences</a>
                                &nbsp;|&nbsp;
                                <a href="https://dev.somos.tech" style="color: #5A6F82; text-decoration: underline;">Visit SOMOS.tech</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

/**
 * Generate plain text version
 */
function generatePlainText(announcement, unsubscribeUrl) {
    const { title, content, ctaText, ctaUrl } = announcement;
    
    let text = `${title}\n${'='.repeat(title.length)}\n\n`;
    text += `${content}\n\n`;
    
    if (ctaUrl) {
        text += `${ctaText || 'Learn More'}: ${ctaUrl}\n\n`;
    }
    
    text += `---\n`;
    text += `SOMOS.tech - Empowering the Latino tech community\n`;
    text += `Manage preferences: ${unsubscribeUrl}\n`;
    
    return text;
}

/**
 * Send announcement to all eligible recipients
 */
async function sendAnnouncement(announcement, context) {
    const announcementsContainer = getContainer(CONTAINERS.ANNOUNCEMENTS);
    const contactsContainer = getContainer(CONTAINERS.EMAIL_CONTACTS);
    
    // Update status to sending
    announcement.status = ANNOUNCEMENT_STATUS.SENDING;
    announcement.sendStartedAt = new Date().toISOString();
    await announcementsContainer.item(announcement.id, announcement.id).replace(announcement);
    
    const recipients = await getEligibleRecipients(announcement.type, announcement.targetAudience);
    
    context.log(`[Announcements] Sending to ${recipients.length} recipients`);
    
    const results = {
        sent: 0,
        failed: 0,
        errors: []
    };
    
    const frontendUrl = process.env.FRONTEND_URL || 'https://dev.somos.tech';
    
    // Send emails in batches to avoid rate limiting
    const batchSize = 10;
    for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);
        
        const promises = batch.map(async (recipient) => {
            const unsubscribeUrl = `${frontendUrl}/unsubscribe/${recipient.unsubscribeToken}`;
            
            try {
                const htmlBody = generateEmailHtml(announcement, unsubscribeUrl);
                const plainText = generatePlainText(announcement, unsubscribeUrl);
                
                const result = await sendEmailNotification({
                    to: recipient.email,
                    subject: announcement.title,
                    body: plainText,
                    htmlBody: htmlBody
                });
                
                if (result.success) {
                    results.sent++;
                    
                    // Update contact's last email sent timestamp
                    try {
                        const { resources } = await contactsContainer.items
                            .query({
                                query: 'SELECT * FROM c WHERE c.email = @email',
                                parameters: [{ name: '@email', value: recipient.email }]
                            })
                            .fetchAll();
                        
                        if (resources.length > 0) {
                            const contact = resources[0];
                            contact.lastEmailSentAt = new Date().toISOString();
                            contact.emailCount = (contact.emailCount || 0) + 1;
                            await contactsContainer.item(contact.id, contact.id).replace(contact);
                        }
                    } catch (e) {
                        // Non-critical, continue
                    }
                } else {
                    results.failed++;
                    results.errors.push({ email: recipient.email, error: result.error });
                }
            } catch (error) {
                results.failed++;
                results.errors.push({ email: recipient.email, error: error.message });
            }
        });
        
        await Promise.all(promises);
        
        // Small delay between batches
        if (i + batchSize < recipients.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
    
    // Update announcement with results
    announcement.status = results.failed === recipients.length 
        ? ANNOUNCEMENT_STATUS.FAILED 
        : ANNOUNCEMENT_STATUS.SENT;
    announcement.sentAt = new Date().toISOString();
    announcement.sendResults = {
        totalRecipients: recipients.length,
        sent: results.sent,
        failed: results.failed,
        errors: results.errors.slice(0, 10) // Keep first 10 errors
    };
    
    await announcementsContainer.item(announcement.id, announcement.id).replace(announcement);
    
    return results;
}

/**
 * Main Announcements Handler
 */
app.http('announcements', {
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    authLevel: 'anonymous',
    route: 'announcements/{id?}/{action?}',
    handler: async (request, context) => {
        try {
            const method = request.method;
            const id = request.params.id;
            const action = request.params.action;

            context.log(`[Announcements] ${method} /${id || ''}/${action || ''}`);

            // Public endpoint - get published announcements
            if (method === 'GET' && id === 'public') {
                const container = getContainer(CONTAINERS.ANNOUNCEMENTS);
                
                const { resources: announcements } = await container.items
                    .query(`SELECT c.id, c.title, c.content, c.type, c.ctaText, c.ctaUrl, c.sentAt 
                            FROM c 
                            WHERE c.status = "sent" AND c.isPublic = true
                            ORDER BY c.sentAt DESC
                            OFFSET 0 LIMIT 10`)
                    .fetchAll();
                
                return successResponse({ announcements });
            }

            // All other endpoints require admin
            const authResult = await requireAdmin(request);
            if (!authResult.authenticated || !authResult.isAdmin) {
                return errorResponse(403, 'Admin access required');
            }

            const principal = getClientPrincipal(request);
            const container = getContainer(CONTAINERS.ANNOUNCEMENTS);

            // GET /api/announcements - List all announcements
            if (method === 'GET' && !id) {
                const url = new URL(request.url);
                const status = url.searchParams.get('status');
                const limit = parseInt(url.searchParams.get('limit') || '50');
                
                let query = 'SELECT * FROM c';
                const parameters = [];
                
                if (status) {
                    query += ' WHERE c.status = @status';
                    parameters.push({ name: '@status', value: status });
                }
                
                query += ' ORDER BY c.createdAt DESC';
                query += ` OFFSET 0 LIMIT ${limit}`;
                
                const { resources: announcements } = await container.items
                    .query({ query, parameters })
                    .fetchAll();
                
                return successResponse({ announcements });
            }

            // GET /api/announcements/:id - Get single announcement
            if (method === 'GET' && id && !action) {
                try {
                    const { resource: announcement } = await container.item(id, id).read();
                    return successResponse({ announcement });
                } catch (error) {
                    if (error.code === 404) {
                        return errorResponse(404, 'Announcement not found');
                    }
                    throw error;
                }
            }

            // POST /api/announcements - Create announcement
            if (method === 'POST' && !id) {
                const body = await request.json();
                const { title, content, type, ctaText, ctaUrl, isPublic, targetAudience } = body;
                
                if (!title || !content) {
                    return errorResponse(400, 'Title and content are required');
                }
                
                const now = new Date().toISOString();
                const announcement = {
                    id: `ann-${crypto.randomUUID()}`,
                    title: title.trim(),
                    content: content.trim(),
                    type: type || ANNOUNCEMENT_TYPES.GENERAL,
                    status: ANNOUNCEMENT_STATUS.DRAFT,
                    ctaText: ctaText || null,
                    ctaUrl: ctaUrl || null,
                    isPublic: isPublic !== false, // Default to public
                    targetAudience: targetAudience || 'all',
                    createdBy: {
                        userId: principal?.userId,
                        email: principal?.userDetails
                    },
                    createdAt: now,
                    updatedAt: now,
                    sentAt: null,
                    sendResults: null
                };
                
                const { resource } = await container.items.create(announcement);
                
                return successResponse({ 
                    announcement: resource, 
                    message: 'Announcement created as draft' 
                });
            }

            // PUT /api/announcements/:id - Update announcement
            if (method === 'PUT' && id && !action) {
                const body = await request.json();
                
                try {
                    const { resource: existing } = await container.item(id, id).read();
                    
                    // Can only edit drafts
                    if (existing.status !== ANNOUNCEMENT_STATUS.DRAFT) {
                        return errorResponse(400, 'Can only edit draft announcements');
                    }
                    
                    const updated = {
                        ...existing,
                        title: body.title || existing.title,
                        content: body.content || existing.content,
                        type: body.type || existing.type,
                        ctaText: body.ctaText !== undefined ? body.ctaText : existing.ctaText,
                        ctaUrl: body.ctaUrl !== undefined ? body.ctaUrl : existing.ctaUrl,
                        isPublic: body.isPublic !== undefined ? body.isPublic : existing.isPublic,
                        targetAudience: body.targetAudience || existing.targetAudience,
                        updatedAt: new Date().toISOString()
                    };
                    
                    const { resource } = await container.item(id, id).replace(updated);
                    
                    return successResponse({ announcement: resource });
                } catch (error) {
                    if (error.code === 404) {
                        return errorResponse(404, 'Announcement not found');
                    }
                    throw error;
                }
            }

            // POST /api/announcements/:id/send - Send announcement
            if (method === 'POST' && id && action === 'send') {
                try {
                    const { resource: announcement } = await container.item(id, id).read();
                    
                    if (announcement.status === ANNOUNCEMENT_STATUS.SENT) {
                        return errorResponse(400, 'Announcement has already been sent');
                    }
                    
                    if (announcement.status === ANNOUNCEMENT_STATUS.SENDING) {
                        return errorResponse(400, 'Announcement is currently being sent');
                    }
                    
                    // Get recipient count preview
                    const recipients = await getEligibleRecipients(announcement.type, announcement.targetAudience);
                    
                    const body = await request.json().catch(() => ({}));
                    
                    // If just previewing, return count
                    if (body.preview) {
                        return successResponse({
                            recipientCount: recipients.length,
                            announcement: announcement
                        });
                    }
                    
                    if (recipients.length === 0) {
                        return errorResponse(400, 'No eligible recipients found');
                    }
                    
                    // Send the announcement
                    const results = await sendAnnouncement(announcement, context);
                    
                    return successResponse({
                        message: `Announcement sent to ${results.sent} recipients`,
                        results
                    });
                } catch (error) {
                    if (error.code === 404) {
                        return errorResponse(404, 'Announcement not found');
                    }
                    throw error;
                }
            }

            // DELETE /api/announcements/:id - Delete announcement
            if (method === 'DELETE' && id) {
                try {
                    const { resource: existing } = await container.item(id, id).read();
                    
                    // Can only delete drafts
                    if (existing.status !== ANNOUNCEMENT_STATUS.DRAFT) {
                        return errorResponse(400, 'Can only delete draft announcements');
                    }
                    
                    await container.item(id, id).delete();
                    
                    return successResponse({ message: 'Announcement deleted' });
                } catch (error) {
                    if (error.code === 404) {
                        return errorResponse(404, 'Announcement not found');
                    }
                    throw error;
                }
            }

            return errorResponse(404, 'Endpoint not found');

        } catch (error) {
            context.error('[Announcements] Error:', error);
            return errorResponse(500, 'Internal server error', error.message);
        }
    }
});

export { ANNOUNCEMENT_TYPES, ANNOUNCEMENT_STATUS };
