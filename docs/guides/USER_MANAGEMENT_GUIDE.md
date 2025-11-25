# User Management System Documentation

## Overview

The user management system provides comprehensive user profile management with:
- **Automatic user creation** on first login via External ID CIAM
- **User profiles** with displayName, profile picture, bio, location, and website
- **Admin controls** to block/allow users
- **Fast performance** with Cosmos DB and optimized queries
- **Security** following best practices with status checking and validation

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User Management Flow                      │
└─────────────────────────────────────────────────────────────┘

User Signs In (External ID CIAM)
    │
    ├─→ POST /api/users/sync
    │   │
    │   ├─→ Check if user exists in Cosmos DB
    │   │   ├─→ Exists: Update lastLoginAt
    │   │   └─→ New: Create user record
    │   │
    │   └─→ Return user profile
    │
    ├─→ User navigates to /profile
    │   │
    │   └─→ GET /api/users/me
    │       │
    │       └─→ Return full user profile
    │
    ├─→ User updates profile
    │   │
    │   └─→ PUT /api/users/me
    │       │
    │       ├─→ Validate inputs
    │       ├─→ Update Cosmos DB
    │       └─→ Return updated profile
    │
    └─→ User comments/joins groups
        │
        └─→ GET /api/users/:id
            │
            └─→ Return public profile (limited fields)

Admin Management Flow:
    │
    ├─→ Admin views user list
    │   │
    │   └─→ GET /api/admin/users
    │       │
    │       ├─→ Filter by status (active/blocked)
    │       ├─→ Search by email/name
    │       ├─→ Pagination (50 per page)
    │       └─→ Return user list
    │
    ├─→ Admin blocks user
    │   │
    │   └─→ PUT /api/admin/users/:id/status
    │       │
    │       ├─→ Update status to 'blocked'
    │       ├─→ Log admin action
    │       └─→ User gets 403 on next request
    │
    └─→ Admin views statistics
        │
        └─→ GET /api/admin/users/stats
            │
            └─→ Return total, active, blocked counts
```

## Data Model

### User Profile Schema (Cosmos DB)

```javascript
{
  id: string,                    // Partition key, unique user ID
  email: string,                 // Unique, lowercase
  displayName: string,           // User's display name
  profilePicture: string | null, // URL to profile image
  bio: string | null,            // User bio (max 500 chars)
  location: string | null,       // User location
  website: string | null,        // User website URL
  authProvider: string,          // 'external-id', 'azure-ad', 'microsoft', 'google'
  status: string,                // 'active', 'blocked', 'pending'
  createdAt: string,             // ISO 8601 timestamp
  updatedAt: string,             // ISO 8601 timestamp
  lastLoginAt: string,           // ISO 8601 timestamp
  metadata: {
    signupIp: string | null,
    emailVerified: boolean,
    firstLogin: boolean
  },
  statusChangedBy: string,       // Admin who changed status (if applicable)
  statusChangedAt: string        // When status was changed
}
```

### Indexes

- **Partition Key**: `/id` (for optimal single-user lookups)
- **Unique Key**: `/email` (prevents duplicate accounts)
- **Composite Indexes**:
  - `/status` + `/createdAt` (for filtered user lists)
  - `/email` (for login lookups)
  - `/lastLoginAt` (for activity tracking)

## API Endpoints

### User Endpoints (Authenticated)

#### GET /api/users/me
Get current user's profile. Creates profile automatically on first call.

**Authentication**: Required  
**Response**:
```json
{
  "success": true,
  "data": {
    "id": "user-id",
    "email": "user@example.com",
    "displayName": "John Doe",
    "profilePicture": "https://...",
    "bio": "Hello world",
    "location": "New York, NY",
    "website": "https://example.com",
    "authProvider": "external-id",
    "status": "active",
    "createdAt": "2025-11-09T...",
    "updatedAt": "2025-11-09T...",
    "lastLoginAt": "2025-11-09T..."
  }
}
```

#### PUT /api/users/me
Update current user's profile.

**Authentication**: Required  
**Request Body**:
```json
{
  "displayName": "New Name",
  "profilePicture": "https://...",
  "bio": "My bio",
  "location": "City, Country",
  "website": "https://..."
}
```

**Validation**:
- `displayName`: Required, 1-100 characters
- `profilePicture`: Optional, must be valid URL
- `bio`: Optional, max 500 characters
- `location`: Optional
- `website`: Optional, must be valid URL

**Response**: Updated user profile

#### GET /api/users/:id
Get public user profile by ID (for displaying in comments, groups).

**Authentication**: Optional  
**Response**: Public fields only (id, displayName, profilePicture, bio, location, website, createdAt)

#### POST /api/users/sync
Sync user profile with auth provider (called automatically on login).

**Authentication**: Required  
**Response**:
```json
{
  "success": true,
  "data": {
    "user": { /* full user profile */ },
    "isNewUser": false
  }
}
```

### Admin Endpoints (Admin Only)

#### GET /api/admin/users
List all users with pagination and filtering.

**Authentication**: Admin required  
**Query Parameters**:
- `limit`: Number of users to return (1-100, default: 50)
- `continuationToken`: Token for next page
- `status`: Filter by status ('active', 'blocked', or null for all)
- `search`: Search by email or display name

**Response**:
```json
{
  "success": true,
  "data": {
    "users": [ /* array of user profiles */ ],
    "continuationToken": "token" | null,
    "hasMore": true | false
  }
}
```

#### GET /api/admin/users/:id
Get full user profile by ID (admin only, returns all fields).

**Authentication**: Admin required  
**Response**: Full user profile including sensitive fields

#### PUT /api/admin/users/:id/status
Update user status (block or activate).

**Authentication**: Admin required  
**Request Body**:
```json
{
  "status": "active" | "blocked",
  "reason": "Optional reason for status change"
}
```

**Response**: Updated user profile

**Security**:
- Admins cannot change their own status
- Action is logged with admin ID and timestamp

#### GET /api/admin/users/stats
Get user statistics.

**Authentication**: Admin required  
**Response**:
```json
{
  "success": true,
  "data": {
    "total": 150,
    "active": 145,
    "blocked": 5
  }
}
```

#### DELETE /api/admin/users/:id
Soft delete user (blocks the user).

**Authentication**: Admin required  
**Response**: Confirmation message

**Security**: Admins cannot delete themselves

## Frontend Components

### useUser Hook

React hook for managing current user profile.

```typescript
import { useUser } from '../hooks/useUser';

function MyComponent() {
  const { 
    user,           // UserProfile | null
    loading,        // boolean
    error,          // string | null
    isBlocked,      // boolean
    updateProfile,  // (updates) => Promise<void>
    refreshProfile, // () => Promise<void>
    syncProfile     // () => Promise<void>
  } = useUser();

  // user is automatically loaded and synced on mount
  // updates are optimistic for fast UI
}
```

### UserProfile Page

Located at `/profile`, allows users to:
- View account information (email, auth provider, join date)
- Edit display name, profile picture, bio, location, website
- See live character counts
- Preview profile picture
- Optimistic updates for fast UX

### AdminUserManagement Page

Located at `/admin/users`, allows admins to:
- View all users with statistics cards
- Search by email or name
- Filter by status (all/active/blocked)
- Block or activate users with one click
- See user details (email, provider, join date, last login)
- Load more users with pagination

## Setup Instructions

### 1. Create Cosmos DB Container

```powershell
# Set environment variables
$env:COSMOS_ENDPOINT="https://your-cosmos-account.documents.azure.com:443/"
$env:COSMOS_KEY="your-cosmos-key"
$env:COSMOS_DATABASE_NAME="somostech"

# Run creation script
node scripts/create-users-container.js
```

### 2. Deploy API Functions

The user management functions are in:
- `apps/api/functions/users.js` - User endpoints
- `apps/api/functions/adminUserManagement.js` - Admin endpoints
- `apps/api/shared/services/userService.js` - Business logic

Deploy via GitHub Actions or manually:
```powershell
cd apps/api
npm install
func azure functionapp publish your-function-app-name
```

### 3. Add Routes to Frontend

Update `App.tsx`:
```typescript
import { UserProfile } from './pages/UserProfile';
import { AdminUserManagement } from './pages/AdminUserManagement';

// In routes:
<Route path="/profile" element={
  <ProtectedRoute>
    <UserProfile />
  </ProtectedRoute>
} />
<Route path="/admin/users" element={
  <ProtectedRoute requireAdmin>
    <AdminUserManagement />
  </ProtectedRoute>
} />
```

### 4. Test the System

1. **Sign in** with External ID CIAM
2. **Visit** `/profile` - profile is created automatically
3. **Update** your profile information
4. **Admin**: Visit `/admin/users` to manage users
5. **Test blocking**: Block a user and verify they get 403 error

## Security Features

### 1. Authentication & Authorization
- All endpoints require authentication
- Admin endpoints verify admin role
- Users can only update their own profile
- Admins cannot modify their own status

### 2. Input Validation
- Display name: 1-100 characters, trimmed
- Bio: Max 500 characters
- URLs: Validated before saving
- Email: Lowercase, unique constraint in DB

### 3. Status Checking
- Blocked users get 403 on all requests
- Status is checked on every API call
- Frontend shows blocked message

### 4. Data Privacy
- Public endpoints return limited fields only
- Email and sensitive data not exposed publicly
- Admin actions are logged with timestamps

### 5. SQL Injection Prevention
- Parameterized queries in Cosmos DB
- No string concatenation in queries

### 6. Rate Limiting
- Rate limiter can be added to authMiddleware
- Recommended: 100 requests/minute per user

## Performance Optimizations

### 1. Database
- Partition key on `/id` for fast single-user lookups
- Composite indexes for filtered queries
- Unique constraint for email prevents duplicates

### 2. Frontend
- useUser hook caches profile in memory
- Optimistic updates for instant UI feedback
- Pagination for large user lists (50 per page)
- Profile picture preview before save

### 3. API
- Auto-create user on first login (no extra round trip)
- Return only necessary fields for public profiles
- Batch statistics queries with Promise.all

## Best Practices

### For Users
1. **Profile Picture**: Use a square image (recommended: 400x400px)
2. **Display Name**: Use your real name or preferred handle
3. **Bio**: Keep it concise and professional
4. **Privacy**: Don't include sensitive information in public fields

### For Admins
1. **Blocking Users**: Provide a reason when blocking
2. **Status Changes**: Document reasons in admin notes
3. **Review Regularly**: Check blocked users periodically
4. **Communication**: Inform users before blocking if possible

### For Developers
1. **Validation**: Always validate on both frontend and backend
2. **Error Handling**: Provide user-friendly error messages
3. **Logging**: Log admin actions for audit trail
4. **Testing**: Test with different auth providers
5. **Monitoring**: Watch for unusual patterns in user creation

## Troubleshooting

### User profile not created
**Symptom**: GET /api/users/me returns 404  
**Solution**: Call POST /api/users/sync to create profile

### Blocked user still accessing
**Symptom**: Blocked user can still use the app  
**Solution**: Status check may be missing in some endpoints. Verify all protected endpoints check user status.

### Duplicate email error
**Symptom**: Error creating user with existing email  
**Solution**: This is expected. The unique constraint prevents duplicate accounts. User should use existing account.

### Profile picture not displaying
**Symptom**: Image doesn't load  
**Solution**: Verify URL is accessible, uses HTTPS, and allows CORS

### Admin can't update user status
**Symptom**: PUT /api/admin/users/:id/status returns 403  
**Solution**: Verify user has admin role in Azure AD

## Future Enhancements

- [ ] Profile picture upload to Azure Blob Storage (currently URLs only)
- [ ] Email verification workflow
- [ ] Password reset for email/password users
- [ ] User activity log (comments, group joins)
- [ ] Bulk user actions (export, bulk block)
- [ ] User tags/labels for organization
- [ ] Advanced search (by join date, activity)
- [ ] User impersonation for support
- [ ] Two-factor authentication
- [ ] Account deletion (hard delete with confirmation)

## Support

For issues or questions:
- Check Application Insights for error logs
- Review Cosmos DB metrics for performance
- Contact development team

---

**Last Updated**: November 9, 2025  
**Version**: 1.0.0
