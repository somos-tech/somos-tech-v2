/**
 * Notification Service for SOMOS.tech
 * Handles email notifications and in-app notifications
 */

import { CosmosClient } from '@azure/cosmos';
import { DefaultAzureCredential, ManagedIdentityCredential } from '@azure/identity';

// Initialize Cosmos DB client
const databaseId = process.env.COSMOS_DATABASE_NAME || 'somostech';

let client = null;
let notificationContainer = null;

function getNotificationContainer() {
    if (!notificationContainer) {
        const endpoint = process.env.COSMOS_ENDPOINT;
        if (!endpoint) {
            throw new Error('COSMOS_ENDPOINT environment variable is required');
        }

        const isLocal = process.env.AZURE_FUNCTIONS_ENVIRONMENT === 'Development' ||
            process.env.NODE_ENV === 'development';
        const credential = isLocal
            ? new DefaultAzureCredential()
            : new ManagedIdentityCredential();

        client = new CosmosClient({ endpoint, aadCredentials: credential });
        notificationContainer = client.database(databaseId).container('notifications');
    }
    return notificationContainer;
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
        // Log email for now (will be replaced with actual email service)
        console.log('📧 EMAIL NOTIFICATION:');
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`Body: ${body}`);
        
        // TODO: Implement actual email sending with Azure Communication Services
        // const emailClient = new EmailClient(connectionString);
        // await emailClient.send({
        //     senderAddress: 'noreply@somos.tech',
        //     recipients: { to: [{ address: to }] },
        //     content: { subject, plainText: body, html: htmlBody }
        // });

        return { success: true, message: 'Email logged (will be sent when ACS is configured)' };
    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, error: error.message };
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
