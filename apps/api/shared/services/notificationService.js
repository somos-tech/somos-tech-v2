/**
 * Notification Service for SOMOS.tech
 * Handles email notifications and in-app notifications
 */

import { getContainer } from '../db.js';

function getNotificationContainer() {
    return getContainer('notifications');
}

// Email settings
const ADMIN_EMAIL = 'jcruz@somos.tech';

/**
 * Create a notification in the database
 */
export async function createNotification({
    type,
    title,
    message,
    severity = 'info',
    actionUrl,
    metadata = {},
    recipientEmail,
    createdBy
}) {
    try {
        const notification = {
            id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type,
            title,
            message,
            severity,
            read: false,
            actionUrl,
            metadata,
            recipientEmail,
            createdBy,
            createdAt: new Date().toISOString()
        };

        const { resource } = await getNotificationContainer().items.create(notification);
        return resource;
    } catch (error) {
        console.error('Error creating notification:', error);
        throw error;
    }
}

/**
 * Send email notification using Azure Communication Services
 * For now, we'll log the email content and create in-app notification
 * TODO: Integrate with Azure Communication Services Email API
 */
export async function sendEmailNotification({
    to,
    subject,
    body,
    htmlBody
}) {
    try {
        // Check if Azure Communication Services is configured
        const connectionString = process.env.AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING;
        
        if (connectionString) {
            // Use Azure Communication Services for actual email delivery
            try {
                const { EmailClient } = await import('@azure/communication-email');
                const emailClient = new EmailClient(connectionString);
                
                const senderAddress = process.env.EMAIL_SENDER_ADDRESS || 'DO-NOT-REPLY@somos.tech';
                const senderDisplayName = process.env.EMAIL_SENDER_DISPLAY_NAME || 'Member Notification';
                
                const emailMessage = {
                    senderAddress: senderAddress,
                    content: {
                        subject,
                        plainText: body,
                        html: htmlBody || body.replace(/\n/g, '<br>')
                    },
                    recipients: {
                        to: [{ address: to }]
                    },
                    headers: {
                        'Reply-To': 'noreply@somos.tech'
                    }
                };
                
                console.log(`📧 Sending email from "${senderDisplayName}" <${senderAddress}> to ${to}`);

                const poller = await emailClient.beginSend(emailMessage);
                const result = await poller.pollUntilDone();

                console.log(`📧 Email sent to ${to}: ${result.status}`);
                return { success: true, message: 'Email sent successfully', status: result.status };
            } catch (acsError) {
                console.error('Error sending email via ACS:', acsError);
                // Fall through to logging
            }
        }
        
        // Log email for now (will be replaced with actual email service)
        console.log('📧 EMAIL NOTIFICATION (logged - ACS not configured):');
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`Body: ${body}`);

        return { success: true, message: 'Email logged (will be sent when ACS is configured)' };
    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Send broadcast notification to multiple recipients
 * Supports both email and in-app push notifications
 */
export async function sendBroadcastNotification({
    recipients, // array of email addresses
    subject,
    message,
    channel = 'email', // 'email' or 'push'
    senderEmail
}) {
    try {
        console.log(`📢 BROADCAST NOTIFICATION (${channel}):`);
        console.log(`Recipients: ${recipients.length}`);
        console.log(`Subject: ${subject}`);

        let sent = 0;
        let failed = 0;

        if (channel === 'email') {
            const htmlBody = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #051323; padding: 20px; text-align: center;">
                        <img src="https://static.wixstatic.com/media/0c204d_5f310ee2b2a848ceac8e68b25c0c39eb~mv2.png" 
                             alt="SOMOS.tech" style="width: 60px; height: 60px; border-radius: 50%;">
                        <h1 style="color: #00FF91; margin: 10px 0 0 0;">SOMOS.tech</h1>
                    </div>
                    <div style="background: #0A1628; padding: 30px; color: #FFFFFF;">
                        <h2 style="color: #00FF91; margin-top: 0;">${subject}</h2>
                        <div style="color: #8394A7; line-height: 1.6;">
                            ${message.replace(/\n/g, '<br>')}
                        </div>
                    </div>
                    <div style="background: #051323; padding: 20px; text-align: center; color: #8394A7; font-size: 12px;">
                        <p>This message was sent to SOMOS.tech community members.</p>
                        <p><a href="https://somos.tech" style="color: #00D4FF;">Visit SOMOS.tech</a></p>
                    </div>
                </div>
            `;

            // Send to each recipient
            for (const recipientEmail of recipients) {
                try {
                    const result = await sendEmailNotification({
                        to: recipientEmail,
                        subject: `📢 ${subject}`,
                        body: message,
                        htmlBody
                    });
                    if (result.success) {
                        sent++;
                    } else {
                        failed++;
                    }
                } catch (e) {
                    failed++;
                    console.error(`Failed to send email to ${recipientEmail}:`, e.message);
                }
            }
        }

        console.log(`📢 Broadcast complete: ${sent} sent, ${failed} failed`);

        return { sent, failed };
    } catch (error) {
        console.error('Error sending broadcast:', error);
        return { sent: 0, failed: recipients.length, error: error.message };
    }
}

/**
 * Notify admin of role assignment
 */
export async function notifyAdminRoleAssigned({ userEmail, userName, roles, assignedBy }) {
    try {
        const subject = '🔐 Admin Role Assigned - SOMOS.tech';
        const message = `A new admin role has been assigned to ${userName || userEmail}`;
        const body = `
Admin Role Assignment Notification

User: ${userName || userEmail}
Email: ${userEmail}
Roles Assigned: ${roles.join(', ')}
Assigned By: ${assignedBy}
Time: ${new Date().toLocaleString()}

You can manage admin users at: /admin/users
        `.trim();

        // Create in-app notification
        const notification = await createNotification({
            type: 'admin_role_assigned',
            title: 'Admin Role Assigned',
            message,
            severity: 'success',
            actionUrl: '/admin/users',
            metadata: { userEmail, roles, assignedBy },
            recipientEmail: ADMIN_EMAIL,
            createdBy: assignedBy
        });

        // Send email
        await sendEmailNotification({
            to: ADMIN_EMAIL,
            subject,
            body,
            htmlBody: `
                <h2>Admin Role Assignment Notification</h2>
                <p>A new admin role has been assigned:</p>
                <ul>
                    <li><strong>User:</strong> ${userName || userEmail}</li>
                    <li><strong>Email:</strong> ${userEmail}</li>
                    <li><strong>Roles:</strong> ${roles.join(', ')}</li>
                    <li><strong>Assigned By:</strong> ${assignedBy}</li>
                    <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
                </ul>
                <p><a href="/admin/users">Manage Admin Users</a></p>
            `
        });

        return notification;
    } catch (error) {
        console.error('Error notifying admin role assigned:', error);
        throw error;
    }
}

/**
 * Notify admin of role removal
 */
export async function notifyAdminRoleRemoved({ userEmail, userName, removedBy }) {
    try {
        const subject = '⚠️ Admin Role Removed - SOMOS.tech';
        const message = `Admin access has been removed from ${userName || userEmail}`;
        const body = `
Admin Role Removal Notification

User: ${userName || userEmail}
Email: ${userEmail}
Removed By: ${removedBy}
Time: ${new Date().toLocaleString()}

You can manage admin users at: /admin/users
        `.trim();

        // Create in-app notification
        const notification = await createNotification({
            type: 'admin_role_removed',
            title: 'Admin Role Removed',
            message,
            severity: 'warning',
            actionUrl: '/admin/users',
            metadata: { userEmail, removedBy },
            recipientEmail: ADMIN_EMAIL,
            createdBy: removedBy
        });

        // Send email
        await sendEmailNotification({
            to: ADMIN_EMAIL,
            subject,
            body,
            htmlBody: `
                <h2>Admin Role Removal Notification</h2>
                <p>Admin access has been removed:</p>
                <ul>
                    <li><strong>User:</strong> ${userName || userEmail}</li>
                    <li><strong>Email:</strong> ${userEmail}</li>
                    <li><strong>Removed By:</strong> ${removedBy}</li>
                    <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
                </ul>
                <p><a href="/admin/users">Manage Admin Users</a></p>
            `
        });

        return notification;
    } catch (error) {
        console.error('Error notifying admin role removed:', error);
        throw error;
    }
}

/**
 * Notify admin of event creation
 */
export async function notifyEventCreated({ eventName, eventDate, location, createdBy }) {
    try {
        const subject = '🎉 New Event Created - SOMOS.tech';
        const message = `A new event "${eventName}" has been created`;
        const body = `
New Event Created Notification

Event: ${eventName}
Date: ${eventDate}
Location: ${location}
Created By: ${createdBy}
Time: ${new Date().toLocaleString()}

You can manage events at: /admin/events
        `.trim();

        // Create in-app notification
        const notification = await createNotification({
            type: 'event_created',
            title: 'New Event Created',
            message,
            severity: 'success',
            actionUrl: '/admin/events',
            metadata: { eventName, eventDate, location, createdBy },
            recipientEmail: ADMIN_EMAIL,
            createdBy
        });

        // Send email
        await sendEmailNotification({
            to: ADMIN_EMAIL,
            subject,
            body,
            htmlBody: `
                <h2>New Event Created</h2>
                <p>A new event has been created:</p>
                <ul>
                    <li><strong>Event:</strong> ${eventName}</li>
                    <li><strong>Date:</strong> ${eventDate}</li>
                    <li><strong>Location:</strong> ${location}</li>
                    <li><strong>Created By:</strong> ${createdBy}</li>
                    <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
                </ul>
                <p><a href="/admin/events">Manage Events</a></p>
            `
        });

        return notification;
    } catch (error) {
        console.error('Error notifying event created:', error);
        throw error;
    }
}

/**
 * Get unread notifications for a user
 */
export async function getUnreadNotifications(recipientEmail) {
    try {
        const querySpec = {
            query: 'SELECT * FROM c WHERE c.recipientEmail = @email AND c.read = false ORDER BY c.createdAt DESC',
            parameters: [{ name: '@email', value: recipientEmail }]
        };

        const { resources } = await getNotificationContainer().items.query(querySpec).fetchAll();
        return resources;
    } catch (error) {
        console.error('Error getting unread notifications:', error);
        throw error;
    }
}

/**
 * Get all notifications for a user
 */
export async function getAllNotifications(recipientEmail, limit = 50) {
    try {
        const querySpec = {
            query: 'SELECT TOP @limit * FROM c WHERE c.recipientEmail = @email ORDER BY c.createdAt DESC',
            parameters: [
                { name: '@email', value: recipientEmail },
                { name: '@limit', value: limit }
            ]
        };

        const { resources } = await getNotificationContainer().items.query(querySpec).fetchAll();
        return resources;
    } catch (error) {
        console.error('Error getting notifications:', error);
        throw error;
    }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId, type) {
    try {
        const container = getNotificationContainer();
        const { resource: notification } = await container
            .item(notificationId, type)
            .read();
        
        notification.read = true;
        notification.readAt = new Date().toISOString();

        const { resource: updated } = await container
            .item(notificationId, type)
            .replace(notification);

        return updated;
    } catch (error) {
        console.error('Error marking notification as read:', error);
        throw error;
    }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(recipientEmail) {
    try {
        const unreadNotifications = await getUnreadNotifications(recipientEmail);
        
        const promises = unreadNotifications.map(notif => 
            markNotificationAsRead(notif.id, notif.type)
        );

        await Promise.all(promises);
        return { success: true, count: promises.length };
    } catch (error) {
        console.error('Error marking all as read:', error);
        throw error;
    }
}
