/**
 * Media Service - Handles file uploads, validation, and storage management
 * Uses Azure Blob Storage for media assets
 */

import { BlobServiceClient } from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';
import crypto from 'crypto';

// Configuration
const STORAGE_ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT_NAME || 'stsomostechdev64qb73pzvg';
const STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;

// Container names
const CONTAINERS = {
    PROFILE_PHOTOS: 'profile-photos',
    SITE_ASSETS: 'site-assets',
    EVENT_IMAGES: 'event-images',
    GROUP_IMAGES: 'group-images',
    PROGRAMS: 'programs',
    UPLOADS: 'uploads'
};

// Security constraints
const ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
];

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];

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
 */
function validateMagicBytes(buffer) {
    if (!buffer || buffer.length < 8) {
        return { valid: false, error: 'File too small to validate' };
    }
    
    const signatures = {
        jpeg: [0xFF, 0xD8, 0xFF],
        png: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
        gif87a: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
        gif89a: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
        webp: [0x52, 0x49, 0x46, 0x46], // RIFF header (WebP starts with RIFF)
        svg: [0x3C, 0x3F, 0x78, 0x6D, 0x6C], // <?xml or <svg
        svgDirect: [0x3C, 0x73, 0x76, 0x67] // <svg
    };
    
    const bytes = new Uint8Array(buffer.slice(0, 8));
    
    // Check each signature
    const matchesSignature = (sig) => sig.every((byte, i) => bytes[i] === byte);
    
    if (matchesSignature(signatures.jpeg) ||
        matchesSignature(signatures.png) ||
        matchesSignature(signatures.gif87a) ||
        matchesSignature(signatures.gif89a) ||
        matchesSignature(signatures.webp) ||
        matchesSignature(signatures.svg) ||
        matchesSignature(signatures.svgDirect)) {
        return { valid: true };
    }
    
    return { valid: false, error: 'File signature does not match allowed image types' };
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
 * Upload site asset (admin only)
 */
export async function uploadSiteAsset(adminUserId, fileBuffer, contentType, originalFilename, category = 'general') {
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
    
    // Generate secure filename
    const secureFilename = generateSecureFilename(originalFilename, adminUserId);
    
    // Upload to storage
    const result = await uploadFile(
        CONTAINERS.SITE_ASSETS,
        `${category}/${secureFilename}`,
        fileBuffer,
        contentType,
        {
            uploadedBy: adminUserId,
            originalFilename,
            category
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

// Export containers for reference
export { CONTAINERS, ALLOWED_IMAGE_TYPES, SIZE_LIMITS };
