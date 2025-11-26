/**
 * Media Service - Frontend API client for media operations
 */

const API_BASE = '/api';

// Allowed file types and size limits (should match backend)
export const ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
];

export const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];

export const SIZE_LIMITS = {
    PROFILE_PHOTO: 5 * 1024 * 1024,      // 5 MB
    SITE_ASSET: 20 * 1024 * 1024,         // 20 MB
    DEFAULT: 10 * 1024 * 1024             // 10 MB
};

/**
 * Validate file before upload (client-side)
 */
export function validateFile(file: File, category: 'PROFILE_PHOTO' | 'SITE_ASSET' | 'DEFAULT' = 'DEFAULT'): { valid: boolean; error?: string } {
    // Check file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        return {
            valid: false,
            error: `Invalid file type: ${file.type}. Allowed types: JPEG, PNG, GIF, WebP, SVG`
        };
    }

    // Check file extension
    const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return {
            valid: false,
            error: `Invalid file extension: ${ext}`
        };
    }

    // Check file size
    const limit = SIZE_LIMITS[category] || SIZE_LIMITS.DEFAULT;
    if (file.size > limit) {
        return {
            valid: false,
            error: `File size (${(file.size / 1024 / 1024).toFixed(2)} MB) exceeds limit of ${(limit / 1024 / 1024).toFixed(2)} MB`
        };
    }

    return { valid: true };
}

/**
 * Upload profile photo
 */
export async function uploadProfilePhoto(file: File): Promise<{ success: boolean; data?: any; error?: string }> {
    // Client-side validation
    const validation = validateFile(file, 'PROFILE_PHOTO');
    if (!validation.valid) {
        return { success: false, error: validation.error };
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(`${API_BASE}/media/profile-photo`, {
            method: 'POST',
            credentials: 'include',
            body: formData
        });

        const result = await response.json();

        if (!response.ok) {
            return {
                success: false,
                error: result.error || result.message || 'Upload failed'
            };
        }

        return {
            success: true,
            data: result.data || result
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Network error'
        };
    }
}

/**
 * Upload site asset (admin only)
 */
export async function uploadSiteAsset(file: File, category: string = 'general'): Promise<{ success: boolean; data?: any; error?: string }> {
    // Client-side validation
    const validation = validateFile(file, 'SITE_ASSET');
    if (!validation.valid) {
        return { success: false, error: validation.error };
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);

    try {
        const response = await fetch(`${API_BASE}/media/site-asset`, {
            method: 'POST',
            credentials: 'include',
            body: formData
        });

        const result = await response.json();

        if (!response.ok) {
            return {
                success: false,
                error: result.error || result.message || 'Upload failed'
            };
        }

        return {
            success: true,
            data: result.data || result
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Network error'
        };
    }
}

/**
 * Get list of containers (admin only)
 */
export async function getContainers(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
        const response = await fetch(`${API_BASE}/media-admin/list`, {
            credentials: 'include'
        });

        const result = await response.json();

        if (!response.ok) {
            return {
                success: false,
                error: result.error || 'Failed to fetch containers'
            };
        }

        return {
            success: true,
            data: result.data || result
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Network error'
        };
    }
}

/**
 * List files in a container (admin only)
 */
export async function listFiles(container: string, prefix?: string, maxResults?: number): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
        const params = new URLSearchParams();
        if (prefix) params.append('prefix', prefix);
        if (maxResults) params.append('maxResults', maxResults.toString());

        const url = `${API_BASE}/media-admin/list/${container}${params.toString() ? '?' + params.toString() : ''}`;
        
        const response = await fetch(url, {
            credentials: 'include'
        });

        const result = await response.json();

        if (!response.ok) {
            return {
                success: false,
                error: result.error || 'Failed to fetch files'
            };
        }

        return {
            success: true,
            data: result.data || result
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Network error'
        };
    }
}

/**
 * Get storage statistics (admin only)
 */
export async function getStorageStats(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
        const response = await fetch(`${API_BASE}/media-admin/stats`, {
            credentials: 'include'
        });

        const result = await response.json();

        if (!response.ok) {
            return {
                success: false,
                error: result.error || 'Failed to fetch stats'
            };
        }

        return {
            success: true,
            data: result.data || result
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Network error'
        };
    }
}

/**
 * Delete a file (admin only)
 */
export async function deleteFile(container: string, filename: string): Promise<{ success: boolean; error?: string }> {
    try {
        const response = await fetch(`${API_BASE}/media-admin/file/${container}/${encodeURIComponent(filename)}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        const result = await response.json();

        if (!response.ok) {
            return {
                success: false,
                error: result.error || 'Failed to delete file'
            };
        }

        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Network error'
        };
    }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get file icon based on content type
 */
export function getFileIcon(contentType: string): string {
    if (contentType.startsWith('image/')) return '🖼️';
    if (contentType.startsWith('video/')) return '🎥';
    if (contentType.startsWith('audio/')) return '🎵';
    if (contentType.includes('pdf')) return '📄';
    return '📁';
}
