/**
 * Admin Media Management Page
 * 
 * A comprehensive media management interface for administrators to:
 * - Browse and manage all storage containers (profile-photos, site-assets, etc.)
 * - Upload images to any container with optional folder organization
 * - Create new folders within containers
 * - View files in grid or list mode
 * - Bulk select and delete files
 * - Monitor storage usage statistics
 * 
 * File restrictions: JPG, JPEG, PNG only (max 20MB)
 * 
 * @component AdminMedia
 * @author SOMOS.tech
 * @updated 2025-11-26 - Added folder creation, container selection for uploads
 */

import { useEffect, useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Image,
    Upload,
    Trash2,
    RefreshCw,
    FolderOpen,
    FolderPlus,
    HardDrive,
    Search,
    Grid,
    List,
    Download,
    Copy,
    Check,
    AlertCircle,
    Loader2,
    ChevronLeft,
    ExternalLink,
    Filter,
    X,
    FileImage,
    FileCheck,
    FileX
} from 'lucide-react';
import AdminBreadcrumbs from '@/components/AdminBreadcrumbs';
import {
    getContainers,
    listFiles,
    getStorageStats,
    deleteFile,
    uploadSiteAsset,
    formatFileSize,
    validateFile,
    ALLOWED_IMAGE_TYPES,
    ALLOWED_EXTENSIONS,
    SIZE_LIMITS
} from '@/api/mediaService';

// Interface for file validation results
interface FileValidation {
    file: File | null;
    typeCheck: 'pending' | 'pass' | 'fail';
    sizeCheck: 'pending' | 'pass' | 'fail';
    extensionCheck: 'pending' | 'pass' | 'fail';
    typeError?: string;
    sizeError?: string;
    extensionError?: string;
    isValid: boolean;
}

interface Container {
    key: string;
    name: string;
    description: string;
}

interface MediaFile {
    name: string;
    url: string;
    size: number;
    contentType: string;
    lastModified: string;
    metadata: Record<string, string>;
}

interface StorageStats {
    [key: string]: {
        container: string;
        fileCount: number;
        totalSize: number;
        totalSizeMB: string;
        error?: string;
    };
}

type ViewMode = 'grid' | 'list';

export default function AdminMedia() {
    const [containers, setContainers] = useState<Container[]>([]);
    const [selectedContainer, setSelectedContainer] = useState<string | null>(null);
    const [files, setFiles] = useState<MediaFile[]>([]);
    const [stats, setStats] = useState<StorageStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
    const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
    const [uploadContainer, setUploadContainer] = useState('site-assets');
    const [uploadFolder, setUploadFolder] = useState('');
    const [showNewFolderInput, setShowNewFolderInput] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [fileValidation, setFileValidation] = useState<FileValidation>({
        file: null,
        typeCheck: 'pending',
        sizeCheck: 'pending',
        extensionCheck: 'pending',
        isValid: false
    });
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load containers and stats on mount
    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            const [containersResult, statsResult] = await Promise.all([
                getContainers(),
                getStorageStats()
            ]);

            console.log('[AdminMedia] Containers result:', containersResult);
            console.log('[AdminMedia] Stats result:', statsResult);

            if (containersResult.success && containersResult.data?.containers) {
                setContainers(containersResult.data.containers);
                // Set default upload container to site-assets if available
                const siteAssetsContainer = containersResult.data.containers.find((c: Container) => c.name === 'site-assets');
                if (siteAssetsContainer) {
                    setUploadContainer('site-assets');
                } else if (containersResult.data.containers.length > 0) {
                    setUploadContainer(containersResult.data.containers[0].name);
                }
                console.log('[AdminMedia] Set containers:', containersResult.data.containers);
            } else {
                console.warn('[AdminMedia] Failed to load containers:', containersResult.error || 'No containers in response');
                // If API call failed but stats loaded, create containers from stats
                if (statsResult.success && statsResult.data) {
                    const containersFromStats = Object.entries(statsResult.data).map(([key, stat]: [string, any]) => ({
                        key,
                        name: stat.container,
                        description: getContainerDescriptionFallback(key)
                    }));
                    setContainers(containersFromStats);
                    // Set default upload container
                    const siteAssetsFromStats = containersFromStats.find((c: Container) => c.name === 'site-assets');
                    if (siteAssetsFromStats) {
                        setUploadContainer('site-assets');
                    } else if (containersFromStats.length > 0) {
                        setUploadContainer(containersFromStats[0].name);
                    }
                    console.log('[AdminMedia] Created containers from stats:', containersFromStats);
                }
            }

            if (statsResult.success && statsResult.data) {
                setStats(statsResult.data);
            }
        } catch (err) {
            console.error('[AdminMedia] Error loading data:', err);
            setError(err instanceof Error ? err.message : 'Failed to load data');
        } finally {
            setIsLoading(false);
        }
    };

    // Fallback descriptions if API doesn't return them
    const getContainerDescriptionFallback = (key: string): string => {
        const descriptions: Record<string, string> = {
            PROFILE_PHOTOS: 'User profile photos uploaded by members',
            SITE_ASSETS: 'Public site assets (logos, banners, etc.)',
            EVENT_IMAGES: 'Event promotional images and photos',
            GROUP_IMAGES: 'Community group logos and cover images',
            PROGRAMS: 'Program-related images and assets',
            UPLOADS: 'General file uploads'
        };
        return descriptions[key] || 'Storage container';
    };

    const loadContainerFiles = async (containerName: string) => {
        setIsLoading(true);
        setError(null);
        setSelectedContainer(containerName);
        setSelectedFiles(new Set());

        try {
            const result = await listFiles(containerName);
            
            if (result.success && result.data?.files) {
                setFiles(result.data.files);
            } else {
                setError(result.error || 'Failed to load files');
                setFiles([]);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load files');
            setFiles([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Validate file and show real-time feedback
    const validateSelectedFile = (file: File): FileValidation => {
        const validation: FileValidation = {
            file,
            typeCheck: 'pending',
            sizeCheck: 'pending',
            extensionCheck: 'pending',
            isValid: false
        };

        // Check file type (MIME type)
        if (ALLOWED_IMAGE_TYPES.includes(file.type)) {
            validation.typeCheck = 'pass';
        } else {
            validation.typeCheck = 'fail';
            validation.typeError = `File type "${file.type || 'unknown'}" is not allowed`;
        }

        // Check file extension
        const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        if (ALLOWED_EXTENSIONS.includes(ext)) {
            validation.extensionCheck = 'pass';
        } else {
            validation.extensionCheck = 'fail';
            validation.extensionError = `Extension "${ext}" is not allowed`;
        }

        // Check file size (for site assets: 20MB limit)
        const sizeLimit = SIZE_LIMITS.SITE_ASSET;
        if (file.size <= sizeLimit) {
            validation.sizeCheck = 'pass';
        } else {
            validation.sizeCheck = 'fail';
            validation.sizeError = `File size ${formatFileSize(file.size)} exceeds ${formatFileSize(sizeLimit)} limit`;
        }

        // Overall validation
        validation.isValid = 
            validation.typeCheck === 'pass' && 
            validation.extensionCheck === 'pass' && 
            validation.sizeCheck === 'pass';

        return validation;
    };

    // Handle drag events
    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        
        const file = e.dataTransfer.files?.[0];
        if (file) {
            const validation = validateSelectedFile(file);
            setFileValidation(validation);
            
            // Don't auto-upload on drop - let user review validation first
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const validation = validateSelectedFile(file);
            setFileValidation(validation);
        }
    };

    const clearFileSelection = () => {
        setFileValidation({
            file: null,
            typeCheck: 'pending',
            sizeCheck: 'pending',
            extensionCheck: 'pending',
            isValid: false
        });
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleFileUpload = async () => {
        const file = fileValidation.file;
        if (!file || !fileValidation.isValid) {
            setError('Please select a valid file first');
            return;
        }

        setIsUploading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            // Use the selected folder or 'root' if no folder selected
            const folder = uploadFolder || 'root';
            const result = await uploadSiteAsset(file, folder, uploadContainer);
            
            if (result.success) {
                // Show success message
                const folderPath = folder === 'root' ? '' : `${folder}/`;
                setSuccessMessage(`File uploaded successfully to ${uploadContainer}/${folderPath}`);
                setTimeout(() => setSuccessMessage(null), 5000);
                
                // Clear file selection
                clearFileSelection();
                
                // Refresh the current container if we're viewing the upload target
                if (selectedContainer === uploadContainer) {
                    await loadContainerFiles(selectedContainer);
                }
                // Refresh stats
                const statsResult = await getStorageStats();
                if (statsResult.success) {
                    setStats(statsResult.data);
                }
                // Reset folder input after successful upload
                setUploadFolder('');
            } else {
                setError(result.error || 'Upload failed');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
            setIsUploading(false);
        }
    };

    // Handle creating a new folder (by setting it as the upload destination)
    // Note: In Azure Blob Storage, folders are virtual - they only exist when files are uploaded to them
    const handleCreateFolder = () => {
        if (!newFolderName.trim()) {
            setError('Please enter a folder name');
            return;
        }
        // Validate folder name - only allow alphanumeric, hyphens, underscores
        const folderNameRegex = /^[a-zA-Z0-9_-]+$/;
        if (!folderNameRegex.test(newFolderName.trim())) {
            setError('Folder name can only contain letters, numbers, hyphens, and underscores');
            return;
        }
        setUploadFolder(newFolderName.trim());
        setNewFolderName('');
        setShowNewFolderInput(false);
        // Show info message that folder will be created on upload
        setError(null);
        setSuccessMessage(`Folder "${newFolderName.trim()}" set as upload destination. Upload a file to create it.`);
        setTimeout(() => setSuccessMessage(null), 5000);
    };

    const handleDeleteFile = async (filename: string) => {
        if (!selectedContainer) return;
        
        if (!confirm(`Are you sure you want to delete ${filename}?`)) {
            return;
        }

        try {
            const result = await deleteFile(selectedContainer, filename);
            
            if (result.success) {
                setFiles(files.filter(f => f.name !== filename));
                setSelectedFiles(prev => {
                    const next = new Set(prev);
                    next.delete(filename);
                    return next;
                });
                // Refresh stats
                const statsResult = await getStorageStats();
                if (statsResult.success) {
                    setStats(statsResult.data);
                }
            } else {
                setError(result.error || 'Delete failed');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Delete failed');
        }
    };

    const handleBulkDelete = async () => {
        if (selectedFiles.size === 0 || !selectedContainer) return;
        
        if (!confirm(`Are you sure you want to delete ${selectedFiles.size} files?`)) {
            return;
        }

        for (const filename of selectedFiles) {
            await deleteFile(selectedContainer, filename);
        }

        await loadContainerFiles(selectedContainer);
        setSelectedFiles(new Set());
    };

    const copyToClipboard = (url: string) => {
        navigator.clipboard.writeText(url);
        setCopiedUrl(url);
        setTimeout(() => setCopiedUrl(null), 2000);
    };

    const toggleFileSelection = (filename: string) => {
        setSelectedFiles(prev => {
            const next = new Set(prev);
            if (next.has(filename)) {
                next.delete(filename);
            } else {
                next.add(filename);
            }
            return next;
        });
    };

    const filteredFiles = files.filter(file =>
        file.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getContainerStats = (containerName: string) => {
        if (!stats) return null;
        const key = Object.keys(stats).find(k => stats[k].container === containerName);
        return key ? stats[key] : null;
    };

    // Container list view
    if (!selectedContainer) {
        return (
            <div className="space-y-6">
                {/* Breadcrumbs */}
                <AdminBreadcrumbs />
                
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>
                            Media Management
                        </h1>
                        <p style={{ color: '#8394A7' }}>
                            Manage uploaded images and site assets
                        </p>
                    </div>
                    <Button
                        onClick={loadInitialData}
                        variant="outline"
                        className="rounded-full"
                        style={{ borderColor: '#00FF91', color: '#00FF91' }}
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                </div>

                {/* Error Alert */}
                {error && (
                    <div 
                        className="flex items-center gap-2 p-4 rounded-lg"
                        style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}
                    >
                        <AlertCircle className="w-5 h-5" />
                        {error}
                        <button 
                            onClick={() => setError(null)} 
                            className="ml-auto"
                            style={{ color: '#ef4444' }}
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Success Message */}
                {successMessage && (
                    <div 
                        className="flex items-center gap-2 p-4 rounded-lg"
                        style={{ backgroundColor: 'rgba(0, 255, 145, 0.2)', color: '#00FF91' }}
                    >
                        <Check className="w-5 h-5" />
                        {successMessage}
                        <button 
                            onClick={() => setSuccessMessage(null)} 
                            className="ml-auto"
                            style={{ color: '#00FF91' }}
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Quick Upload */}
                <Card 
                    className={`p-6 rounded-xl transition-all ${dragActive ? 'scale-[1.02]' : ''}`}
                    style={{ 
                        backgroundColor: '#0a1f35', 
                        border: dragActive 
                            ? '2px dashed #00FF91' 
                            : '1px solid rgba(0, 255, 145, 0.2)',
                        boxShadow: dragActive ? '0 0 30px rgba(0, 255, 145, 0.3)' : 'none'
                    }}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                >
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: '#FFFFFF' }}>
                        <Upload className="w-5 h-5" style={{ color: '#00FF91' }} />
                        Quick Upload
                        {dragActive && (
                            <span className="text-sm font-normal ml-2" style={{ color: '#00FF91' }}>
                                Drop file here!
                            </span>
                        )}
                    </h2>
                    <div className="flex flex-wrap items-start gap-4">
                        {/* Container Selection */}
                        <div className="flex flex-col gap-1">
                            <label className="text-xs" style={{ color: '#8394A7' }}>Container</label>
                            <select
                                value={uploadContainer}
                                onChange={(e) => setUploadContainer(e.target.value)}
                                className="px-4 py-2 rounded-lg min-w-[160px]"
                                style={{ 
                                    backgroundColor: '#051323', 
                                    color: '#FFFFFF',
                                    border: '1px solid rgba(0, 255, 145, 0.3)'
                                }}
                            >
                                {containers.map((container) => (
                                    <option key={container.key} value={container.name}>
                                        {container.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Folder Selection / Creation */}
                        <div className="flex flex-col gap-1">
                            <label className="text-xs" style={{ color: '#8394A7' }}>Folder (optional)</label>
                            <div className="flex items-center gap-2">
                                {showNewFolderInput ? (
                                    <>
                                        <input
                                            type="text"
                                            value={newFolderName}
                                            onChange={(e) => setNewFolderName(e.target.value)}
                                            placeholder="folder-name"
                                            className="px-4 py-2 rounded-lg min-w-[160px]"
                                            style={{ 
                                                backgroundColor: '#051323', 
                                                color: '#FFFFFF',
                                                border: '1px solid rgba(0, 255, 145, 0.3)'
                                            }}
                                            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                                        />
                                        <Button
                                            onClick={handleCreateFolder}
                                            size="sm"
                                            className="rounded-lg"
                                            style={{ backgroundColor: '#00FF91', color: '#051323' }}
                                        >
                                            <Check className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            onClick={() => {
                                                setShowNewFolderInput(false);
                                                setNewFolderName('');
                                            }}
                                            size="sm"
                                            variant="ghost"
                                            className="rounded-lg"
                                            style={{ color: '#8394A7' }}
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <input
                                            type="text"
                                            value={uploadFolder}
                                            onChange={(e) => setUploadFolder(e.target.value)}
                                            placeholder="root (no folder)"
                                            className="px-4 py-2 rounded-lg min-w-[160px]"
                                            style={{ 
                                                backgroundColor: '#051323', 
                                                color: '#FFFFFF',
                                                border: '1px solid rgba(0, 255, 145, 0.3)'
                                            }}
                                        />
                                        <Button
                                            onClick={() => setShowNewFolderInput(true)}
                                            size="sm"
                                            variant="outline"
                                            className="rounded-lg"
                                            style={{ borderColor: '#00FF91', color: '#00FF91' }}
                                            title="Create new folder"
                                        >
                                            <FolderPlus className="w-4 h-4" />
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* File Selection */}
                        <div className="flex flex-col gap-1">
                            <label className="text-xs" style={{ color: '#8394A7' }}>Select File</label>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".jpg,.jpeg,.png"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                            <Button
                                onClick={() => fileInputRef.current?.click()}
                                variant="outline"
                                className="rounded-lg min-w-[160px]"
                                style={{ borderColor: '#00FF91', color: '#00FF91' }}
                            >
                                <FileImage className="w-4 h-4 mr-2" />
                                {fileValidation.file ? 'Change File' : 'Choose File'}
                            </Button>
                        </div>

                        {/* Upload Button */}
                        <div className="flex flex-col gap-1">
                            <label className="text-xs" style={{ color: '#8394A7' }}>&nbsp;</label>
                            <Button
                                onClick={handleFileUpload}
                                disabled={isUploading || !fileValidation.isValid}
                                className="rounded-full min-w-[140px]"
                                style={{ 
                                    backgroundColor: fileValidation.isValid ? '#00FF91' : '#4a5568', 
                                    color: fileValidation.isValid ? '#051323' : '#8394A7',
                                    cursor: (!fileValidation.isValid && !isUploading) ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {isUploading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Uploading...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-4 h-4 mr-2" />
                                        Upload
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* File Validation Feedback */}
                    {fileValidation.file && (
                        <div 
                            className="mt-4 p-4 rounded-lg"
                            style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <FileImage className="w-5 h-5" style={{ color: '#00FF91' }} />
                                    <span className="font-medium" style={{ color: '#FFFFFF' }}>
                                        {fileValidation.file.name}
                                    </span>
                                    <span className="text-sm" style={{ color: '#8394A7' }}>
                                        ({formatFileSize(fileValidation.file.size)})
                                    </span>
                                </div>
                                <button
                                    onClick={clearFileSelection}
                                    className="p-1 rounded hover:bg-opacity-20 hover:bg-white transition-colors"
                                    style={{ color: '#8394A7' }}
                                    title="Clear selection"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            
                            {/* Validation Checklist */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {/* File Type Check */}
                                <div 
                                    className="flex items-center gap-2 p-2 rounded-lg"
                                    style={{ 
                                        backgroundColor: fileValidation.typeCheck === 'pass' 
                                            ? 'rgba(0, 255, 145, 0.15)' 
                                            : fileValidation.typeCheck === 'fail' 
                                                ? 'rgba(239, 68, 68, 0.15)'
                                                : 'rgba(107, 114, 128, 0.15)'
                                    }}
                                >
                                    {fileValidation.typeCheck === 'pass' ? (
                                        <FileCheck className="w-5 h-5 flex-shrink-0" style={{ color: '#00FF91' }} />
                                    ) : fileValidation.typeCheck === 'fail' ? (
                                        <FileX className="w-5 h-5 flex-shrink-0" style={{ color: '#ef4444' }} />
                                    ) : (
                                        <div className="w-5 h-5 rounded-full border-2 flex-shrink-0" style={{ borderColor: '#6B7280' }} />
                                    )}
                                    <div className="flex flex-col">
                                        <span 
                                            className="text-sm font-medium"
                                            style={{ 
                                                color: fileValidation.typeCheck === 'pass' 
                                                    ? '#00FF91' 
                                                    : fileValidation.typeCheck === 'fail' 
                                                        ? '#ef4444' 
                                                        : '#8394A7'
                                            }}
                                        >
                                            Media Type
                                        </span>
                                        <span className="text-xs" style={{ color: '#8394A7' }}>
                                            {fileValidation.typeCheck === 'pass' 
                                                ? `✓ ${fileValidation.file?.type || 'image'}`
                                                : fileValidation.typeError || 'JPG, PNG only'}
                                        </span>
                                    </div>
                                </div>

                                {/* File Extension Check */}
                                <div 
                                    className="flex items-center gap-2 p-2 rounded-lg"
                                    style={{ 
                                        backgroundColor: fileValidation.extensionCheck === 'pass' 
                                            ? 'rgba(0, 255, 145, 0.15)' 
                                            : fileValidation.extensionCheck === 'fail' 
                                                ? 'rgba(239, 68, 68, 0.15)'
                                                : 'rgba(107, 114, 128, 0.15)'
                                    }}
                                >
                                    {fileValidation.extensionCheck === 'pass' ? (
                                        <FileCheck className="w-5 h-5 flex-shrink-0" style={{ color: '#00FF91' }} />
                                    ) : fileValidation.extensionCheck === 'fail' ? (
                                        <FileX className="w-5 h-5 flex-shrink-0" style={{ color: '#ef4444' }} />
                                    ) : (
                                        <div className="w-5 h-5 rounded-full border-2 flex-shrink-0" style={{ borderColor: '#6B7280' }} />
                                    )}
                                    <div className="flex flex-col">
                                        <span 
                                            className="text-sm font-medium"
                                            style={{ 
                                                color: fileValidation.extensionCheck === 'pass' 
                                                    ? '#00FF91' 
                                                    : fileValidation.extensionCheck === 'fail' 
                                                        ? '#ef4444' 
                                                        : '#8394A7'
                                            }}
                                        >
                                            File Extension
                                        </span>
                                        <span className="text-xs" style={{ color: '#8394A7' }}>
                                            {fileValidation.extensionCheck === 'pass' 
                                                ? `✓ ${fileValidation.file?.name.split('.').pop()?.toUpperCase()}`
                                                : fileValidation.extensionError || '.jpg, .jpeg, .png'}
                                        </span>
                                    </div>
                                </div>

                                {/* File Size Check */}
                                <div 
                                    className="flex items-center gap-2 p-2 rounded-lg"
                                    style={{ 
                                        backgroundColor: fileValidation.sizeCheck === 'pass' 
                                            ? 'rgba(0, 255, 145, 0.15)' 
                                            : fileValidation.sizeCheck === 'fail' 
                                                ? 'rgba(239, 68, 68, 0.15)'
                                                : 'rgba(107, 114, 128, 0.15)'
                                    }}
                                >
                                    {fileValidation.sizeCheck === 'pass' ? (
                                        <FileCheck className="w-5 h-5 flex-shrink-0" style={{ color: '#00FF91' }} />
                                    ) : fileValidation.sizeCheck === 'fail' ? (
                                        <FileX className="w-5 h-5 flex-shrink-0" style={{ color: '#ef4444' }} />
                                    ) : (
                                        <div className="w-5 h-5 rounded-full border-2 flex-shrink-0" style={{ borderColor: '#6B7280' }} />
                                    )}
                                    <div className="flex flex-col">
                                        <span 
                                            className="text-sm font-medium"
                                            style={{ 
                                                color: fileValidation.sizeCheck === 'pass' 
                                                    ? '#00FF91' 
                                                    : fileValidation.sizeCheck === 'fail' 
                                                        ? '#ef4444' 
                                                        : '#8394A7'
                                            }}
                                        >
                                            File Size
                                        </span>
                                        <span className="text-xs" style={{ color: '#8394A7' }}>
                                            {fileValidation.sizeCheck === 'pass' 
                                                ? `✓ ${formatFileSize(fileValidation.file?.size || 0)} (max 20MB)`
                                                : fileValidation.sizeError || 'Max 20MB'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Overall Status */}
                            <div 
                                className="mt-3 p-2 rounded-lg flex items-center gap-2"
                                style={{ 
                                    backgroundColor: fileValidation.isValid 
                                        ? 'rgba(0, 255, 145, 0.2)' 
                                        : 'rgba(239, 68, 68, 0.2)'
                                }}
                            >
                                {fileValidation.isValid ? (
                                    <>
                                        <Check className="w-5 h-5" style={{ color: '#00FF91' }} />
                                        <span style={{ color: '#00FF91' }}>
                                            All checks passed! Ready to upload to <strong>{uploadContainer}/{uploadFolder || 'root'}</strong>
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <AlertCircle className="w-5 h-5" style={{ color: '#ef4444' }} />
                                        <span style={{ color: '#ef4444' }}>
                                            Please fix the validation errors above before uploading
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Default upload hints when no file selected */}
                    {!fileValidation.file && (
                        <>
                            <p className="text-xs mt-3" style={{ color: '#8394A7' }}>
                                Drag & drop a file here, or click "Choose File" • Upload to: <span style={{ color: '#00FF91' }}>{uploadContainer}/{uploadFolder || 'root'}</span>
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: '#6B7280' }}>
                                <span className="flex items-center gap-1">
                                    <FileCheck className="w-3 h-3" style={{ color: '#00FF91' }} />
                                    JPG, JPEG, PNG only
                                </span>
                                <span className="flex items-center gap-1">
                                    <FileCheck className="w-3 h-3" style={{ color: '#00FF91' }} />
                                    Max 20MB
                                </span>
                                <span className="flex items-center gap-1">
                                    💡 Folders are created on upload
                                </span>
                            </div>
                        </>
                    )}
                </Card>

                {/* Container Folders */}
                <div>
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: '#FFFFFF' }}>
                        <FolderOpen className="w-5 h-5" style={{ color: '#00FF91' }} />
                        Browse Containers
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {isLoading ? (
                            Array.from({ length: 6 }).map((_, i) => (
                                <Card 
                                    key={i}
                                    className="p-6 rounded-xl animate-pulse"
                                    style={{ backgroundColor: '#0a1f35' }}
                                >
                                    <div className="h-24"></div>
                                </Card>
                            ))
                        ) : containers.length === 0 ? (
                            <Card 
                                className="p-6 rounded-xl col-span-full"
                                style={{ backgroundColor: '#0a1f35', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                            >
                                <div className="flex items-center gap-2" style={{ color: '#ef4444' }}>
                                    <AlertCircle className="w-5 h-5" />
                                    <span>No containers found. Unable to load storage containers.</span>
                                </div>
                            </Card>
                        ) : (
                            containers.map((container) => {
                            const containerStats = getContainerStats(container.name);
                            return (
                                <Card
                                    key={container.key}
                                    className="p-6 rounded-xl cursor-pointer transition-all hover:scale-[1.02]"
                                    style={{ 
                                        backgroundColor: '#0a1f35', 
                                        border: '1px solid rgba(0, 255, 145, 0.2)' 
                                    }}
                                    onClick={() => loadContainerFiles(container.name)}
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div 
                                            className="w-12 h-12 rounded-lg flex items-center justify-center"
                                            style={{ backgroundColor: 'rgba(0, 255, 145, 0.2)' }}
                                        >
                                            <FolderOpen className="w-6 h-6" style={{ color: '#00FF91' }} />
                                        </div>
                                        <ChevronLeft className="w-5 h-5 rotate-180" style={{ color: '#8394A7' }} />
                                    </div>
                                    <h3 className="font-semibold mb-1" style={{ color: '#FFFFFF' }}>
                                        {container.name}
                                    </h3>
                                    <p className="text-sm mb-2" style={{ color: '#8394A7' }}>
                                        {container.description}
                                    </p>
                                    {containerStats && !containerStats.error && (
                                        <div className="flex items-center gap-4 text-xs" style={{ color: '#00FF91' }}>
                                            <span>{containerStats.fileCount} files</span>
                                            <span>{containerStats.totalSizeMB} MB</span>
                                        </div>
                                    )}
                                </Card>
                            );
                        })
                    )}
                    </div>
                </div>

                {/* Total Storage Stats */}
                {stats && (
                    <Card 
                        className="p-6 rounded-xl"
                        style={{ backgroundColor: '#0a1f35', border: '1px solid rgba(0, 255, 145, 0.2)' }}
                    >
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: '#FFFFFF' }}>
                            <HardDrive className="w-5 h-5" style={{ color: '#00FF91' }} />
                            Storage Overview
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                            {Object.entries(stats).map(([key, stat]) => (
                                <div 
                                    key={key} 
                                    className="text-center p-4 rounded-lg cursor-pointer transition-all hover:scale-[1.02]" 
                                    style={{ backgroundColor: 'rgba(0, 255, 145, 0.1)' }}
                                    onClick={() => loadContainerFiles(stat.container)}
                                    title={`Click to browse ${stat.container}`}
                                >
                                    <div className="text-2xl font-bold" style={{ color: '#00FF91' }}>
                                        {stat.fileCount || 0}
                                    </div>
                                    <div className="text-xs" style={{ color: '#8394A7' }}>
                                        {stat.container}
                                    </div>
                                    <div className="text-xs" style={{ color: '#FFFFFF' }}>
                                        {stat.totalSizeMB || '0'} MB
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}
            </div>
        );
    }

    // File browser view
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                    <Button
                        onClick={() => setSelectedContainer(null)}
                        variant="ghost"
                        className="rounded-full"
                        style={{ color: '#8394A7' }}
                    >
                        <ChevronLeft className="w-5 h-5 mr-1" />
                        Back
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>
                            {selectedContainer}
                        </h1>
                        <p style={{ color: '#8394A7' }}>
                            {files.length} files
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {selectedFiles.size > 0 && (
                        <Button
                            onClick={handleBulkDelete}
                            variant="outline"
                            className="rounded-full"
                            style={{ borderColor: '#ef4444', color: '#ef4444' }}
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete ({selectedFiles.size})
                        </Button>
                    )}
                    <Button
                        onClick={() => loadContainerFiles(selectedContainer)}
                        variant="outline"
                        className="rounded-full"
                        style={{ borderColor: '#00FF91', color: '#00FF91' }}
                    >
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Search and View Controls */}
            <div className="flex items-center gap-4 flex-wrap">
                <div 
                    className="flex-1 min-w-[200px] flex items-center gap-2 px-4 py-2 rounded-lg"
                    style={{ backgroundColor: '#0a1f35', border: '1px solid rgba(0, 255, 145, 0.2)' }}
                >
                    <Search className="w-5 h-5" style={{ color: '#8394A7' }} />
                    <input
                        type="text"
                        placeholder="Search files..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 bg-transparent outline-none"
                        style={{ color: '#FFFFFF' }}
                    />
                </div>
                <div className="flex items-center gap-1 p-1 rounded-lg" style={{ backgroundColor: '#0a1f35' }}>
                    <button
                        onClick={() => setViewMode('grid')}
                        className="p-2 rounded"
                        style={{ 
                            backgroundColor: viewMode === 'grid' ? 'rgba(0, 255, 145, 0.2)' : 'transparent',
                            color: viewMode === 'grid' ? '#00FF91' : '#8394A7'
                        }}
                    >
                        <Grid className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className="p-2 rounded"
                        style={{ 
                            backgroundColor: viewMode === 'list' ? 'rgba(0, 255, 145, 0.2)' : 'transparent',
                            color: viewMode === 'list' ? '#00FF91' : '#8394A7'
                        }}
                    >
                        <List className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Error Alert */}
            {error && (
                <div 
                    className="flex items-center gap-2 p-4 rounded-lg"
                    style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}
                >
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}

            {/* Loading State */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#00FF91' }} />
                </div>
            ) : filteredFiles.length === 0 ? (
                <div className="text-center py-12">
                    <Image className="w-16 h-16 mx-auto mb-4" style={{ color: '#8394A7' }} />
                    <p style={{ color: '#8394A7' }}>No files found</p>
                </div>
            ) : viewMode === 'grid' ? (
                /* Grid View */
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredFiles.map((file) => (
                        <Card
                            key={file.name}
                            className="rounded-xl overflow-hidden group relative"
                            style={{ 
                                backgroundColor: '#0a1f35',
                                border: selectedFiles.has(file.name) 
                                    ? '2px solid #00FF91' 
                                    : '1px solid rgba(0, 255, 145, 0.2)'
                            }}
                        >
                            {/* Checkbox */}
                            <div className="absolute top-2 left-2 z-10">
                                <input
                                    type="checkbox"
                                    checked={selectedFiles.has(file.name)}
                                    onChange={() => toggleFileSelection(file.name)}
                                    className="w-5 h-5 rounded"
                                    style={{ accentColor: '#00FF91' }}
                                />
                            </div>
                            
                            {/* Image Preview */}
                            <div 
                                className="aspect-square overflow-hidden"
                                style={{ backgroundColor: 'rgba(0, 255, 145, 0.1)' }}
                            >
                                <img
                                    src={file.url}
                                    alt={file.name}
                                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%230a1f35" width="100" height="100"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%2300FF91" font-size="40">?</text></svg>';
                                    }}
                                />
                            </div>
                            
                            {/* File Info */}
                            <div className="p-3">
                                <p 
                                    className="text-sm truncate mb-1" 
                                    style={{ color: '#FFFFFF' }}
                                    title={file.name}
                                >
                                    {file.name.split('/').pop()}
                                </p>
                                <p className="text-xs" style={{ color: '#8394A7' }}>
                                    {formatFileSize(file.size)}
                                </p>
                            </div>

                            {/* Hover Actions */}
                            <div 
                                className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                style={{ backgroundColor: 'rgba(5, 19, 35, 0.8)' }}
                            >
                                <button
                                    onClick={() => copyToClipboard(file.url)}
                                    className="p-2 rounded-full"
                                    style={{ backgroundColor: 'rgba(0, 255, 145, 0.2)' }}
                                    title="Copy URL"
                                >
                                    {copiedUrl === file.url ? (
                                        <Check className="w-5 h-5" style={{ color: '#00FF91' }} />
                                    ) : (
                                        <Copy className="w-5 h-5" style={{ color: '#00FF91' }} />
                                    )}
                                </button>
                                <a
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 rounded-full"
                                    style={{ backgroundColor: 'rgba(0, 255, 145, 0.2)' }}
                                    title="Open in new tab"
                                >
                                    <ExternalLink className="w-5 h-5" style={{ color: '#00FF91' }} />
                                </a>
                                <button
                                    onClick={() => handleDeleteFile(file.name)}
                                    className="p-2 rounded-full"
                                    style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)' }}
                                    title="Delete"
                                >
                                    <Trash2 className="w-5 h-5" style={{ color: '#ef4444' }} />
                                </button>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                /* List View */
                <Card 
                    className="rounded-xl overflow-hidden"
                    style={{ backgroundColor: '#0a1f35', border: '1px solid rgba(0, 255, 145, 0.2)' }}
                >
                    <table className="w-full">
                        <thead>
                            <tr style={{ backgroundColor: 'rgba(0, 255, 145, 0.1)' }}>
                                <th className="p-3 text-left" style={{ color: '#8394A7' }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedFiles.size === filteredFiles.length && filteredFiles.length > 0}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedFiles(new Set(filteredFiles.map(f => f.name)));
                                            } else {
                                                setSelectedFiles(new Set());
                                            }
                                        }}
                                        style={{ accentColor: '#00FF91' }}
                                    />
                                </th>
                                <th className="p-3 text-left" style={{ color: '#8394A7' }}>Preview</th>
                                <th className="p-3 text-left" style={{ color: '#8394A7' }}>Name</th>
                                <th className="p-3 text-left" style={{ color: '#8394A7' }}>Size</th>
                                <th className="p-3 text-left" style={{ color: '#8394A7' }}>Type</th>
                                <th className="p-3 text-left" style={{ color: '#8394A7' }}>Modified</th>
                                <th className="p-3 text-left" style={{ color: '#8394A7' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredFiles.map((file) => (
                                <tr 
                                    key={file.name}
                                    className="border-t"
                                    style={{ borderColor: 'rgba(0, 255, 145, 0.1)' }}
                                >
                                    <td className="p-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedFiles.has(file.name)}
                                            onChange={() => toggleFileSelection(file.name)}
                                            style={{ accentColor: '#00FF91' }}
                                        />
                                    </td>
                                    <td className="p-3">
                                        <img
                                            src={file.url}
                                            alt=""
                                            className="w-12 h-12 object-cover rounded"
                                        />
                                    </td>
                                    <td className="p-3">
                                        <span 
                                            className="max-w-[200px] truncate block" 
                                            style={{ color: '#FFFFFF' }}
                                            title={file.name}
                                        >
                                            {file.name.split('/').pop()}
                                        </span>
                                    </td>
                                    <td className="p-3" style={{ color: '#8394A7' }}>
                                        {formatFileSize(file.size)}
                                    </td>
                                    <td className="p-3" style={{ color: '#8394A7' }}>
                                        {file.contentType}
                                    </td>
                                    <td className="p-3" style={{ color: '#8394A7' }}>
                                        {new Date(file.lastModified).toLocaleDateString()}
                                    </td>
                                    <td className="p-3">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => copyToClipboard(file.url)}
                                                className="p-1.5 rounded"
                                                style={{ backgroundColor: 'rgba(0, 255, 145, 0.1)' }}
                                                title="Copy URL"
                                            >
                                                {copiedUrl === file.url ? (
                                                    <Check className="w-4 h-4" style={{ color: '#00FF91' }} />
                                                ) : (
                                                    <Copy className="w-4 h-4" style={{ color: '#00FF91' }} />
                                                )}
                                            </button>
                                            <a
                                                href={file.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-1.5 rounded"
                                                style={{ backgroundColor: 'rgba(0, 255, 145, 0.1)' }}
                                                title="Open"
                                            >
                                                <ExternalLink className="w-4 h-4" style={{ color: '#00FF91' }} />
                                            </a>
                                            <button
                                                onClick={() => handleDeleteFile(file.name)}
                                                className="p-1.5 rounded"
                                                style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" style={{ color: '#ef4444' }} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            )}
        </div>
    );
}
