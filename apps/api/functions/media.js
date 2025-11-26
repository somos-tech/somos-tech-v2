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
 * POST /api/media/upload - Upload a file
 * POST /api/media/profile-photo - Upload profile photo (authenticated users)
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
                const formData = await request.formData();
                const file = formData.get('file');

                if (!file) {
                    return errorResponse(400, 'No file provided');
                }

                // Get file details
                const arrayBuffer = await file.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                const contentType = file.type;
                const originalFilename = file.name;

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
                const authResult = await requireAdmin(request);
                if (!authResult.authenticated || !authResult.isAdmin) {
                    return errorResponse(403, 'Admin access required');
                }

                const principal = getClientPrincipal(request);
                const adminUserId = principal?.userDetails;

                // Parse multipart form data
                const formData = await request.formData();
                const file = formData.get('file');
                const category = formData.get('category') || 'general';

                if (!file) {
                    return errorResponse(400, 'No file provided');
                }

                const arrayBuffer = await file.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                const contentType = file.type;
                const originalFilename = file.name;

                context.log(`[Media] Uploading site asset by ${adminUserId}: ${originalFilename} (${category})`);

                try {
                    const result = await uploadSiteAsset(adminUserId, buffer, contentType, originalFilename, category);
                    
                    return successResponse({
                        message: 'Site asset uploaded successfully',
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
 * Get container description for UI
 */
function getContainerDescription(key) {
    const descriptions = {
        PROFILE_PHOTOS: 'User profile photos uploaded by members',
        SITE_ASSETS: 'Public site assets (logos, banners, etc.)',
        EVENT_IMAGES: 'Event promotional images and photos',
        GROUP_IMAGES: 'Community group logos and cover images',
        UPLOADS: 'General file uploads'
    };
    return descriptions[key] || 'Storage container';
}
