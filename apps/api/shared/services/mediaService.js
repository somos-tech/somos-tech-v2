/**
 * Media Service - Handles file uploads, validation, and storage management
 * Uses Azure Blob Storage for media assets
 * 
 * Features:
 * - Upload images to any storage container with optional folder organization
 * - File type validation (restricted to JPG, JPEG, PNG only)
 * - File size validation with configurable limits per category
 * - Magic bytes validation for security
 * - Secure filename generation with timestamps and random hashes
 * - Storage statistics for monitoring usage
 * 
 * @module mediaService
 * @author SOMOS.tech
 * @updated 2025-11-26 - Added container selection and folder support for uploads
 */

import { BlobServiceClient } from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';
import crypto from 'crypto';

// Configuration
const STORAGE_ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT_NAME || 'stsomostechdev64qb73pzvg';
const STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;

/**
 * Storage container names - each container serves a specific purpose
 * Admins can upload to any container, users can only upload profile photos
 */
const CONTAINERS = {
    PROFILE_PHOTOS: 'profile-photos',
    SITE_ASSETS: 'site-assets',
    EVENT_IMAGES: 'event-images',
    GROUP_IMAGES: 'group-images',
    PROGRAMS: 'programs',
    UPLOADS: 'uploads'
};

/**
 * Security constraints - Restricted to JPG, JPEG, PNG only
 * This restriction improves security by limiting attack vectors
 * and ensures consistent image handling across the platform
 */
const ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/png'
];

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png'];

// Size limits (in bytes)
const SIZE_LIMITS = {
    PROFILE_PHOTO: 5 * 1024 * 1024,      // 5 MB
    EVENT_IMAGE: 10 * 1024 * 1024,        // 10 MB
    SITE_ASSET: 20 * 1024 * 1024,         // 20 MB
    DEFAULT: 10 * 1024 * 1024             // 10 MB
};

// Image dimension limits
const DIMENSION_LIMITS = {
    PROFILE_PHOTO: { maxWidth: 2048, maxHeight: 2048 },
    EVENT_IMAGE: { maxWidth: 4096, maxHeight: 4096 },
    DEFAULT: { maxWidth: 4096, maxHeight: 4096 }
};

/**
 * Get blob service client
 */
function getBlobServiceClient() {
    if (STORAGE_CONNECTION_STRING && STORAGE_CONNECTION_STRING !== 'UseDevelopmentStorage=true') {
        return BlobServiceClient.fromConnectionString(STORAGE_CONNECTION_STRING);
    }
    
    // Use managed identity in production
    const credential = new DefaultAzureCredential();
    return new BlobServiceClient(
        `https://${STORAGE_ACCOUNT_NAME}.blob.core.windows.net`,
        credential
    );
}

/**
 * Ensure container exists
 */
async function ensureContainer(containerName) {
    const blobServiceClient = getBlobServiceClient();
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    try {
        await containerClient.createIfNotExists({
            access: containerName === CONTAINERS.SITE_ASSETS ? 'blob' : undefined // Public read for site assets
        });
        return containerClient;
    } catch (error) {
        console.error(`Error creating container ${containerName}:`, error);
        throw error;
    }
}

/**
 * Validate file type and content
 */
function validateFileType(contentType, filename) {
    // Check MIME type
    if (!ALLOWED_IMAGE_TYPES.includes(contentType?.toLowerCase())) {
        return {
            valid: false,
            error: `Invalid file type: ${contentType}. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`
        };
    }
    
    // Check file extension
    const ext = filename?.toLowerCase().substring(filename.lastIndexOf('.'));
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return {
            valid: false,
            error: `Invalid file extension: ${ext}. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`
        };
    }
    
    return { valid: true };
}

/**
 * Validate file size
 */
function validateFileSize(size, category = 'DEFAULT') {
    const limit = SIZE_LIMITS[category] || SIZE_LIMITS.DEFAULT;
    
    if (size > limit) {
        return {
            valid: false,
            error: `File size (${(size / 1024 / 1024).toFixed(2)} MB) exceeds limit of ${(limit / 1024 / 1024).toFixed(2)} MB`
        };
    }
    
    return { valid: true };
}

/**
 * Validate image magic bytes (file signature)
 * Only allows JPG/JPEG and PNG for security
 */
function validateMagicBytes(buffer) {
    if (!buffer || buffer.length < 8) {
        return { valid: false, error: 'File too small to validate' };
    }
    
    // Only allow JPEG and PNG signatures for security
    const signatures = {
        jpeg: [0xFF, 0xD8, 0xFF],
        png: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]
    };
    
    const bytes = new Uint8Array(buffer.slice(0, 8));
    
    // Check each signature
    const matchesSignature = (sig) => sig.every((byte, i) => bytes[i] === byte);
    
    if (matchesSignature(signatures.jpeg) ||
        matchesSignature(signatures.png)) {
        return { valid: true };
    }
    
    return { valid: false, error: 'Invalid file format. Only JPG, JPEG, and PNG files are allowed.' };
}

/**
 * Generate secure filename
 */
function generateSecureFilename(originalFilename, userId) {
    const ext = originalFilename.toLowerCase().substring(originalFilename.lastIndexOf('.'));
    const timestamp = Date.now();
    const randomId = crypto.randomBytes(8).toString('hex');
    const userHash = crypto.createHash('md5').update(userId || 'anonymous').digest('hex').substring(0, 8);
    
    return `${userHash}-${timestamp}-${randomId}${ext}`;
}

/**
 * Upload file to blob storage
 */
async function uploadFile(containerName, filename, buffer, contentType, metadata = {}) {
    const containerClient = await ensureContainer(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(filename);
    
    await blockBlobClient.uploadData(buffer, {
        blobHTTPHeaders: {
            blobContentType: contentType,
            blobCacheControl: 'public, max-age=31536000' // 1 year cache for images
        },
        metadata: {
            ...metadata,
            uploadedAt: new Date().toISOString()
        }
    });
    
    return {
        url: blockBlobClient.url,
        filename,
        container: containerName,
        size: buffer.length,
        contentType
    };
}

/**
 * Upload profile photo with full validation
 */
export async function uploadProfilePhoto(userId, fileBuffer, contentType, originalFilename) {
    // Validate file type
    const typeValidation = validateFileType(contentType, originalFilename);
    if (!typeValidation.valid) {
        throw new Error(typeValidation.error);
    }
    
    // Validate file size
    const sizeValidation = validateFileSize(fileBuffer.length, 'PROFILE_PHOTO');
    if (!sizeValidation.valid) {
        throw new Error(sizeValidation.error);
    }
    
    // Validate magic bytes
    const magicValidation = validateMagicBytes(fileBuffer);
    if (!magicValidation.valid) {
        throw new Error(magicValidation.error);
    }
    
    // Generate secure filename
    const secureFilename = generateSecureFilename(originalFilename, userId);
    
    // Upload to storage
    const result = await uploadFile(
        CONTAINERS.PROFILE_PHOTOS,
        secureFilename,
        fileBuffer,
        contentType,
        {
            userId,
            originalFilename,
            category: 'profile-photo'
        }
    );
    
    return result;
}

/**
 * Upload site asset (admin only) - supports uploading to any container with optional folder
 */
export async function uploadSiteAsset(adminUserId, fileBuffer, contentType, originalFilename, category = 'general', containerName = null) {
    // Validate file type
    const typeValidation = validateFileType(contentType, originalFilename);
    if (!typeValidation.valid) {
        throw new Error(typeValidation.error);
    }
    
    // Validate file size
    const sizeValidation = validateFileSize(fileBuffer.length, 'SITE_ASSET');
    if (!sizeValidation.valid) {
        throw new Error(sizeValidation.error);
    }
    
    // Validate magic bytes
    const magicValidation = validateMagicBytes(fileBuffer);
    if (!magicValidation.valid) {
        throw new Error(magicValidation.error);
    }
    
    // Determine target container - default to SITE_ASSETS if not specified
    const targetContainer = containerName || CONTAINERS.SITE_ASSETS;
    
    // Validate container name
    const validContainers = Object.values(CONTAINERS);
    if (!validContainers.includes(targetContainer)) {
        throw new Error(`Invalid container: ${targetContainer}. Valid containers: ${validContainers.join(', ')}`);
    }
    
    // Generate secure filename
    const secureFilename = generateSecureFilename(originalFilename, adminUserId);
    
    // Build the blob path - include folder/category if provided
    const blobPath = category && category !== 'root' 
        ? `${category}/${secureFilename}` 
        : secureFilename;
    
    // Upload to storage
    const result = await uploadFile(
        targetContainer,
        blobPath,
        fileBuffer,
        contentType,
        {
            uploadedBy: adminUserId,
            originalFilename,
            category: category || 'root',
            container: targetContainer
        }
    );
    
    return result;
}

/**
 * List files in a container
 */
export async function listFiles(containerName, prefix = '', maxResults = 100) {
    const containerClient = await ensureContainer(containerName);
    const files = [];
    
    const options = {
        prefix,
        includeMetadata: true
    };
    
    let count = 0;
    for await (const blob of containerClient.listBlobsFlat(options)) {
        if (count >= maxResults) break;
        
        files.push({
            name: blob.name,
            url: `${containerClient.url}/${blob.name}`,
            size: blob.properties.contentLength,
            contentType: blob.properties.contentType,
            lastModified: blob.properties.lastModified,
            metadata: blob.metadata || {}
        });
        
        count++;
    }
    
    return files;
}

/**
 * Get file details
 */
export async function getFileDetails(containerName, filename) {
    const containerClient = await ensureContainer(containerName);
    const blobClient = containerClient.getBlobClient(filename);
    
    try {
        const properties = await blobClient.getProperties();
        
        return {
            name: filename,
            url: blobClient.url,
            size: properties.contentLength,
            contentType: properties.contentType,
            lastModified: properties.lastModified,
            metadata: properties.metadata || {},
            exists: true
        };
    } catch (error) {
        if (error.statusCode === 404) {
            return { exists: false };
        }
        throw error;
    }
}

/**
 * Delete file from storage
 */
export async function deleteFile(containerName, filename) {
    const containerClient = await ensureContainer(containerName);
    const blobClient = containerClient.getBlobClient(filename);
    
    try {
        await blobClient.deleteIfExists();
        return { success: true, filename };
    } catch (error) {
        console.error(`Error deleting file ${filename}:`, error);
        throw error;
    }
}

/**
 * Get storage statistics
 */
export async function getStorageStats() {
    const stats = {};
    
    for (const [key, containerName] of Object.entries(CONTAINERS)) {
        try {
            const files = await listFiles(containerName, '', 1000);
            const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);
            
            stats[key] = {
                container: containerName,
                fileCount: files.length,
                totalSize,
                totalSizeMB: (totalSize / 1024 / 1024).toFixed(2)
            };
        } catch (error) {
            stats[key] = {
                container: containerName,
                error: error.message
            };
        }
    }
    
    return stats;
}

/**
 * Generate a default avatar URL using UI Avatars service
 * This provides a consistent, professional-looking default avatar
 * based on the user's name or email
 */
export function getDefaultAvatarUrl(name, email, options = {}) {
    const {
        size = 128,
        background = '00FF91',
        color = '051323',
        bold = true,
        rounded = true
    } = options;
    
    // Get initials from name or email
    let initials = '';
    if (name && name.trim()) {
        const parts = name.trim().split(/\s+/);
        initials = parts.length >= 2 
            ? parts[0][0] + parts[parts.length - 1][0]
            : parts[0].substring(0, 2);
    } else if (email) {
        initials = email.split('@')[0].substring(0, 2);
    } else {
        initials = 'U';
    }
    
    // Use UI Avatars service for consistent default avatars
    const params = new URLSearchParams({
        name: initials.toUpperCase(),
        size: size.toString(),
        background,
        color,
        bold: bold.toString(),
        rounded: rounded.toString(),
        format: 'png'
    });
    
    return `https://ui-avatars.com/api/?${params.toString()}`;
}

// Export containers for reference
export { CONTAINERS, ALLOWED_IMAGE_TYPES, SIZE_LIMITS };
