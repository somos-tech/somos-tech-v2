/**
 * Media API - Azure Functions endpoints for media management
 * 
 * Endpoints:
 * - POST /api/media/profile-photo - Upload profile photo (authenticated users)
 * - POST /api/media/site-asset - Upload to any container (admin only)
 * - GET /api/media-admin/list - List all containers
 * - GET /api/media-admin/list/{container} - List files in a container
 * - GET /api/media-admin/stats - Get storage statistics
 * - DELETE /api/media-admin/file/{container}/{filename} - Delete a file
 * 
 * File restrictions: JPG, JPEG, PNG only
 * 
 * @module media
 * @author SOMOS.tech
 * @updated 2025-11-26 - Added container/folder selection for site-asset uploads
 */

import { app } from '@azure/functions';
import { requireAuth, requireAdmin, getClientPrincipal } from '../shared/authMiddleware.js';
import { successResponse, errorResponse } from '../shared/httpResponse.js';
import {
    uploadProfilePhoto,
    uploadSiteAsset,
    listFiles,
    getFileDetails,
    deleteFile,
    getStorageStats,
    CONTAINERS
} from '../shared/services/mediaService.js';

/**
 * Media Upload API - Handles file uploads with validation
 * POST /api/media/profile-photo - Upload profile photo (authenticated users)
 * POST /api/media/site-asset - Upload to any container with folder support (admin only)
 */
app.http('mediaUpload', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'media/{action}',
    handler: async (request, context) => {
        try {
            const action = request.params.action;
            context.log(`[Media] Upload action: ${action}`);

            // Profile photo upload - requires authentication
            if (action === 'profile-photo') {
                const authResult = await requireAuth(request);
                if (!authResult.authenticated) {
                    return errorResponse(401, 'Authentication required');
                }

                const principal = getClientPrincipal(request);
                const userId = principal?.userId || principal?.userDetails;

                if (!userId) {
                    return errorResponse(400, 'User ID not found');
                }

                // Parse multipart form data
                let formData;
                try {
                    formData = await request.formData();
                } catch (formError) {
                    context.error(`[Media] Form data parse error: ${formError.message}`);
                    return errorResponse(400, 'Invalid form data. Please try again.');
                }
                
                const file = formData.get('file');

                if (!file) {
                    return errorResponse(400, 'No file provided');
                }

                // Get file details
                let arrayBuffer, buffer, contentType, originalFilename;
                try {
                    arrayBuffer = await file.arrayBuffer();
                    buffer = Buffer.from(arrayBuffer);
                    contentType = file.type;
                    originalFilename = file.name;
                } catch (fileError) {
                    context.error(`[Media] File processing error: ${fileError.message}`);
                    return errorResponse(400, 'Failed to process file');
                }

                context.log(`[Media] Uploading profile photo for ${userId}: ${originalFilename} (${contentType}, ${buffer.length} bytes)`);

                try {
                    const result = await uploadProfilePhoto(userId, buffer, contentType, originalFilename);
                    
                    context.log(`[Media] Profile photo uploaded successfully: ${result.url}`);
                    
                    return successResponse({
                        message: 'Profile photo uploaded successfully',
                        ...result
                    });
                } catch (uploadError) {
                    context.error(`[Media] Upload error: ${uploadError.message}`);
                    return errorResponse(400, uploadError.message);
                }
            }

            // Site asset upload - requires admin
            if (action === 'site-asset') {
                // Debug: Log auth info
                const debugPrincipal = getClientPrincipal(request);
                context.log(`[Media] site-asset auth debug - Principal:`, JSON.stringify(debugPrincipal));
                context.log(`[Media] site-asset auth debug - userRoles:`, debugPrincipal?.userRoles);
                
                const authResult = await requireAdmin(request);
                context.log(`[Media] site-asset auth debug - authResult:`, JSON.stringify(authResult));
                
                if (!authResult.authenticated || !authResult.isAdmin) {
                    context.log(`[Media] site-asset auth FAILED - authenticated: ${authResult.authenticated}, isAdmin: ${authResult.isAdmin}`);
                    return errorResponse(403, 'Admin access required', { 
                        debug: {
                            authenticated: authResult.authenticated,
                            isAdmin: authResult.isAdmin,
                            userRoles: debugPrincipal?.userRoles || [],
                            userDetails: debugPrincipal?.userDetails
                        }
                    });
                }

                const principal = getClientPrincipal(request);
                const adminUserId = principal?.userDetails;

                // Parse multipart form data
                const formData = await request.formData();
                const file = formData.get('file');
                const category = formData.get('category') || 'general';
                const container = formData.get('container') || null; // Allow specifying target container

                if (!file) {
                    return errorResponse(400, 'No file provided');
                }

                const arrayBuffer = await file.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                const contentType = file.type;
                const originalFilename = file.name;

                context.log(`[Media] Uploading site asset by ${adminUserId}: ${originalFilename} to ${container || 'site-assets'}/${category}`);

                try {
                    const result = await uploadSiteAsset(adminUserId, buffer, contentType, originalFilename, category, container);
                    
                    return successResponse({
                        message: 'File uploaded successfully',
                        ...result
                    });
                } catch (uploadError) {
                    context.error(`[Media] Upload error: ${uploadError.message}`);
                    return errorResponse(400, uploadError.message);
                }
            }

            return errorResponse(400, `Invalid action: ${action}`);

        } catch (error) {
            context.error('[Media] Error:', error);
            return errorResponse(500, 'Internal server error', error.message);
        }
    }
});

/**
 * Media Management API - List, get details, delete files
 * GET /api/media-admin/list/{container} - List files in container
 * GET /api/media-admin/stats - Get storage statistics
 * GET /api/media-admin/file/{container}/{filename} - Get file details
 * DELETE /api/media-admin/file/{container}/{filename} - Delete file
 */
app.http('mediaAdmin', {
    methods: ['GET', 'DELETE'],
    authLevel: 'anonymous',
    route: 'media-admin/{action}/{container?}/{*filename}',
    handler: async (request, context) => {
        try {
            // All media admin operations require admin role
            const authResult = await requireAdmin(request);
            if (!authResult.authenticated || !authResult.isAdmin) {
                return errorResponse(403, 'Admin access required');
            }

            const action = request.params.action;
            const container = request.params.container;
            const filename = request.params.filename;
            const method = request.method;

            context.log(`[MediaAdmin] ${method} ${action} container=${container} filename=${filename}`);

            // List files in a container
            if (action === 'list' && method === 'GET') {
                if (!container) {
                    // Return list of all containers
                    return successResponse({
                        containers: Object.entries(CONTAINERS).map(([key, name]) => ({
                            key,
                            name,
                            description: getContainerDescription(key)
                        }))
                    });
                }

                // Validate container name
                const validContainers = Object.values(CONTAINERS);
                if (!validContainers.includes(container)) {
                    return errorResponse(400, `Invalid container: ${container}. Valid containers: ${validContainers.join(', ')}`);
                }

                const url = new URL(request.url);
                const prefix = url.searchParams.get('prefix') || '';
                const maxResults = parseInt(url.searchParams.get('maxResults') || '100', 10);

                const files = await listFiles(container, prefix, maxResults);
                
                return successResponse({
                    container,
                    count: files.length,
                    files
                });
            }

            // Get storage statistics
            if (action === 'stats' && method === 'GET') {
                const stats = await getStorageStats();
                return successResponse(stats);
            }

            // Get file details
            if (action === 'file' && method === 'GET' && container && filename) {
                const details = await getFileDetails(container, filename);
                
                if (!details.exists) {
                    return errorResponse(404, 'File not found');
                }
                
                return successResponse(details);
            }

            // Delete file
            if (action === 'file' && method === 'DELETE' && container && filename) {
                const principal = getClientPrincipal(request);
                context.log(`[MediaAdmin] Delete file ${container}/${filename} by ${principal?.userDetails}`);
                
                const result = await deleteFile(container, filename);
                return successResponse({
                    message: 'File deleted successfully',
                    ...result
                });
            }

            return errorResponse(400, 'Invalid action or missing parameters');

        } catch (error) {
            context.error('[MediaAdmin] Error:', error);
            return errorResponse(500, 'Internal server error', error.message);
        }
    }
});

/**
 * Debug endpoint to check auth status
 * GET /api/media-admin/auth-debug
 */
app.http('mediaAuthDebug', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'media-admin/auth-debug',
    handler: async (request, context) => {
        try {
            const principal = getClientPrincipal(request);
            const authResult = await requireAdmin(request);
            
            return successResponse({
                principal: principal ? {
                    userId: principal.userId,
                    userDetails: principal.userDetails,
                    identityProvider: principal.identityProvider,
                    userRoles: principal.userRoles || []
                } : null,
                authResult: {
                    authenticated: authResult.authenticated,
                    isAdmin: authResult.isAdmin
                },
                headers: {
                    hasClientPrincipal: !!request.headers.get('x-ms-client-principal')
                }
            });
        } catch (error) {
            return errorResponse(500, 'Debug error', error.message);
        }
    }
});

/**
 * Get container description for UI
 */
function getContainerDescription(key) {
    const descriptions = {
        PROFILE_PHOTOS: 'User profile photos uploaded by members',
        SITE_ASSETS: 'Public site assets (logos, banners, etc.)',
        EVENT_IMAGES: 'Event promotional images and photos',
        GROUP_IMAGES: 'Community group logos and cover images',
        PROGRAMS: 'Program-related images and assets',
        UPLOADS: 'General file uploads'
    };
    return descriptions[key] || 'Storage container';
}
