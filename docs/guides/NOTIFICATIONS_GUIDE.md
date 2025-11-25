# Notification System - Implementation Guide

## Overview

A comprehensive notification system has been implemented for the SOMOS.tech admin portal that provides:
- **Real-time in-app notifications** with visual indicators
- **Email notifications** to jcruz@somos.tech for critical events
- **Automatic notifications** for admin role changes and event creation
- **Notification panel** with unread count and mark-as-read functionality

## Architecture

### Backend Components

#### 1. Cosmos DB Container
- **Name:** `notifications`
- **Partition Key:** `/type`
- **Location:** `somostech` database

#### 2. Notification Service (`apps/api/shared/services/notificationService.js`)
Provides centralized notification management:
- `createNotification()` - Store notifications in database
- `sendEmailNotification()` - Send email alerts (logged for now, ready for Azure Communication Services)
- `notifyAdminRoleAssigned()` - Notification for role assignments
- `notifyAdminRoleRemoved()` - Notification for role removals
- `notifyEventCreated()` - Notification for new events
- `getUnreadNotifications()` - Fetch unread notifications
- `getAllNotifications()` - Fetch all notifications
- `markNotificationAsRead()` - Mark single notification as read
- `markAllAsRead()` - Mark all notifications as read

#### 3. Notifications API (`apps/api/functions/notifications.js`)
REST endpoints for notification management:
- `GET /api/notifications/list` - Get all notifications
- `GET /api/notifications/unread` - Get unread notifications only
- `GET /api/notifications/count` - Get unread count
- `PUT /api/notifications/mark-read` - Mark notification as read
- `PUT /api/notifications/mark-all-read` - Mark all as read

### Frontend Components

#### 1. Notification Panel (`apps/web/src/components/NotificationPanel.tsx`)
Interactive notification UI component:
- **Bell icon** with unread count badge
- **Notification dialog** with full list
- **Real-time polling** (30-second intervals)
- **Click to mark as read** and navigate to action URL
- **Severity indicators** (info, success, warning, error)
- **Relative timestamps** (e.g., "5m ago", "2h ago")

#### 2. Notification Service (`apps/web/src/api/notificationsService.ts`)
API client for notification operations:
- Type-safe TypeScript interfaces
- Handles authentication via cookies
- Error handling and response parsing

#### 3. Integration Points
- **Navigation bar** - Bell icon visible on all pages
- **Admin Events page** - Bell icon in header bar
- **Mobile menu** - Notification panel in dropdown

## Notification Types

### 1. Admin Role Assigned
**Trigger:** When an admin user is created or roles are updated

**Email Template:**
```
Subject: 🔐 Admin Role Assigned - SOMOS.tech

Admin Role Assignment Notification

User: [Name]
Email: [Email]
Roles Assigned: admin, authenticated
Assigned By: [Admin Email]
Time: [Timestamp]

You can manage admin users at: /admin/users
```

**In-App Notification:**
- Type: `admin_role_assigned`
- Severity: `success`
- Action URL: `/admin/users`

### 2. Admin Role Removed
**Trigger:** When an admin user is deleted

**Email Template:**
```
Subject: ⚠️ Admin Role Removed - SOMOS.tech

Admin Role Removal Notification

User: [Name]
Email: [Email]
Removed By: [Admin Email]
Time: [Timestamp]

You can manage admin users at: /admin/users
```

**In-App Notification:**
- Type: `admin_role_removed`
- Severity: `warning`
- Action URL: `/admin/users`

### 3. Event Created
**Trigger:** When a new event is created

**Email Template:**
```
Subject: 🎉 New Event Created - SOMOS.tech

New Event Created

Event: [Event Name]
Date: [Event Date]
Location: [Location]
Created By: [Admin Email]
Time: [Timestamp]

You can manage events at: /admin/events
```

**In-App Notification:**
- Type: `event_created`
- Severity: `success`
- Action URL: `/admin/events`

## Email Configuration

### Current State
Email notifications are currently **logged to console** and stored as in-app notifications. The email content is prepared and ready for delivery.

### Future: Azure Communication Services Integration
To enable actual email delivery, configure Azure Communication Services:

1. **Create Email Communication Service:**
   ```powershell
   az communication email create \
     --resource-group rg-somos-tech-dev \
     --name somos-tech-email \
     --data-location "United States"
   ```

2. **Configure email domain:**
   - Set up verified domain (e.g., noreply@somos.tech)
   - Configure SPF/DKIM records

3. **Update notificationService.js:**
   ```javascript
   import { EmailClient } from '@azure/communication-email';
   
   const connectionString = process.env.COMMUNICATION_SERVICES_CONNECTION_STRING;
   const emailClient = new EmailClient(connectionString);
   
   // In sendEmailNotification function:
   await emailClient.send({
       senderAddress: 'noreply@somos.tech',
       recipients: { to: [{ address: to }] },
       content: { subject, plainText: body, html: htmlBody }
   });
   ```

4. **Add connection string to Function App settings:**
   ```powershell
   az functionapp config appsettings set \
     --resource-group rg-somos-tech-dev \
     --name func-somos-tech-dev-64qb73pzvgekw \
     --settings COMMUNICATION_SERVICES_CONNECTION_STRING="<connection-string>"
   ```

## User Interface

### Notification Panel Features

1. **Bell Icon with Badge**
   - Shows unread count (e.g., "3")
   - Displays "9+" for counts > 9
   - Red background for visibility

2. **Notification List**
   - Newest first (ordered by createdAt DESC)
   - Unread notifications highlighted
   - Visual indicators for severity
   - Relative timestamps
   - Creator information

3. **Interactions**
   - Click notification to mark as read
   - Navigate to action URL automatically
   - "Mark all read" button for bulk action
   - Auto-refresh every 30 seconds

4. **Severity Icons & Colors**
   - **Success** (green) - CheckCircle icon
   - **Warning** (orange) - AlertCircle icon
   - **Error** (red) - XCircle icon
   - **Info** (blue) - Info icon

## Database Schema

### Notification Document
```javascript
{
  id: "notif-1762624848262-abc123",
  type: "admin_role_assigned" | "admin_role_removed" | "event_created" | "event_updated" | "event_deleted" | "system",
  title: "Admin Role Assigned",
  message: "A new admin role has been assigned to John Doe",
  severity: "info" | "warning" | "success" | "error",
  read: false,
  readAt: "2025-11-08T18:30:00.000Z", // Set when marked as read
  actionUrl: "/admin/users",
  metadata: {
    userEmail: "john@somos.tech",
    roles: ["admin", "authenticated"]
  },
  recipientEmail: "jcruz@somos.tech",
  createdBy: "admin@somos.tech",
  createdAt: "2025-11-08T18:00:00.000Z"
}
```

## API Endpoints

### Get All Notifications
```http
GET /api/notifications/list
Authorization: Cookie-based (Azure SWA)
```

**Response:**
```json
[
  {
    "id": "notif-123",
    "type": "admin_role_assigned",
    "title": "Admin Role Assigned",
    "message": "A new admin role has been assigned to John Doe",
    "severity": "success",
    "read": false,
    "actionUrl": "/admin/users",
    "createdAt": "2025-11-08T18:00:00.000Z"
  }
]
```

### Get Unread Count
```http
GET /api/notifications/count
Authorization: Cookie-based (Azure SWA)
```

**Response:**
```json
{
  "count": 3
}
```

### Mark as Read
```http
PUT /api/notifications/mark-read
Content-Type: application/json
Authorization: Cookie-based (Azure SWA)

{
  "notificationId": "notif-123",
  "type": "admin_role_assigned"
}
```

### Mark All as Read
```http
PUT /api/notifications/mark-all-read
Authorization: Cookie-based (Azure SWA)
```

## Testing

### Test Admin Role Assignment Notification
1. Log in to admin portal
2. Navigate to `/admin/users`
3. Click "Add Admin User"
4. Enter email: `test@somos.tech`
5. Enter name: `Test User`
6. Click "Add User"
7. **Expected Results:**
   - Bell icon shows unread count (1)
   - Notification appears in panel
   - Email logged to console (check Application Insights)

### Test Event Creation Notification
1. Log in to admin portal
2. Navigate to `/admin/events`
3. Click "New event"
4. Fill in event details
5. Click "Create Event"
6. **Expected Results:**
   - Bell icon shows unread count
   - Notification appears with event details
   - Email logged to console

### Test Mark as Read
1. Click bell icon to open notification panel
2. Click on an unread notification
3. **Expected Results:**
   - Notification marked as read (checkmark appears)
   - Unread count decreases
   - Navigate to action URL

## Security

### Authentication
- All notification endpoints require authentication
- Uses Azure Static Web Apps authentication
- User email automatically captured from auth context

### Authorization
- Notifications are scoped to recipient email
- Users can only see their own notifications
- Admin-only actions (create/delete admin users) trigger notifications

### Data Privacy
- Notification metadata contains only necessary information
- Sensitive data (passwords, secrets) never included
- Email addresses only visible to admins

## Monitoring

### Application Insights Queries

**Check notification emails logged:**
```kusto
traces
| where message contains "EMAIL NOTIFICATION"
| project timestamp, message
| order by timestamp desc
```

**Count notifications by type:**
```kusto
customEvents
| where name == "NotificationCreated"
| summarize count() by tostring(customDimensions.type)
```

**Recent notification errors:**
```kusto
exceptions
| where outerMessage contains "notification"
| project timestamp, outerMessage, problemId
| order by timestamp desc
```

## Future Enhancements

1. **Email Service Integration**
   - Connect Azure Communication Services
   - Template management system
   - Email delivery tracking

2. **Notification Preferences**
   - User settings for notification types
   - Email vs. in-app preferences
   - Frequency controls (immediate, digest, etc.)

3. **Additional Triggers**
   - Member registrations
   - Event updates/cancellations
   - System health alerts
   - Security events

4. **Advanced Features**
   - Push notifications (web push API)
   - Notification categories/filters
   - Search functionality
   - Export notification history

5. **Analytics**
   - Notification open rates
   - Action completion tracking
   - User engagement metrics

## Troubleshooting

### No notifications appearing
1. Check browser console for errors
2. Verify API endpoint is accessible: `/api/notifications/count`
3. Check Application Insights for function errors
4. Verify Cosmos DB container exists: `notifications`

### Email not being sent
- Currently expected! Emails are logged only
- Check Application Insights traces for email content
- Requires Azure Communication Services setup

### Unread count not updating
1. Check if polling is working (Network tab, every 30s)
2. Clear browser cache
3. Hard refresh (Ctrl+Shift+R)
4. Check for JavaScript errors in console

### Notifications not triggering
1. Verify the action was completed successfully
2. Check Application Insights for notification service errors
3. Ensure function app has Cosmos DB permissions
4. Check notification service logs

## Deployment Checklist

✅ Infrastructure
- [x] Notifications container in Cosmos DB
- [x] Function app permissions updated

✅ Backend
- [x] notificationService.js deployed
- [x] notifications.js function deployed
- [x] adminUsers.js updated with notifications
- [x] events.js updated with notifications

✅ Frontend
- [x] NotificationPanel component created
- [x] notificationsService.ts API client
- [x] Integrated into Navigation
- [x] Integrated into Admin Events header

✅ Testing
- [x] Infrastructure deployment verified
- [x] API functions deployed successfully
- [ ] Web app deployment complete (in progress)
- [ ] End-to-end notification flow tested
- [ ] Email logging verified in App Insights

## Support

For issues or questions:
1. Check Application Insights logs
2. Review Cosmos DB for notification records
3. Test API endpoints directly
4. Contact: jcruz@somos.tech

---

**Last Updated:** November 8, 2025
**Version:** 1.0.0
**Status:** ✅ Deployed to Development
