import { useEffect, useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Image,
    Upload,
    Trash2,
    RefreshCw,
    FolderOpen,
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
    Filter
} from 'lucide-react';
import {
    getContainers,
    listFiles,
    getStorageStats,
    deleteFile,
    uploadSiteAsset,
    formatFileSize,
    validateFile
} from '@/api/mediaService';

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
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
    const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
    const [uploadCategory, setUploadCategory] = useState('general');
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

            if (containersResult.success && containersResult.data?.containers) {
                setContainers(containersResult.data.containers);
            }

            if (statsResult.success && statsResult.data) {
                setStats(statsResult.data);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load data');
        } finally {
            setIsLoading(false);
        }
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

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const validation = validateFile(file, 'SITE_ASSET');
        if (!validation.valid) {
            setError(validation.error || 'Invalid file');
            return;
        }

        setIsUploading(true);
        setError(null);

        try {
            const result = await uploadSiteAsset(file, uploadCategory);
            
            if (result.success) {
                // Refresh the current container if we're viewing site-assets
                if (selectedContainer === 'site-assets') {
                    await loadContainerFiles(selectedContainer);
                }
                // Refresh stats
                const statsResult = await getStorageStats();
                if (statsResult.success) {
                    setStats(statsResult.data);
                }
            } else {
                setError(result.error || 'Upload failed');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
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
                    </div>
                )}

                {/* Quick Upload */}
                <Card 
                    className="p-6 rounded-xl"
                    style={{ backgroundColor: '#0a1f35', border: '1px solid rgba(0, 255, 145, 0.2)' }}
                >
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: '#FFFFFF' }}>
                        <Upload className="w-5 h-5" style={{ color: '#00FF91' }} />
                        Quick Upload
                    </h2>
                    <div className="flex items-center gap-4">
                        <select
                            value={uploadCategory}
                            onChange={(e) => setUploadCategory(e.target.value)}
                            className="px-4 py-2 rounded-lg"
                            style={{ 
                                backgroundColor: '#051323', 
                                color: '#FFFFFF',
                                border: '1px solid rgba(0, 255, 145, 0.3)'
                            }}
                        >
                            <option value="general">General</option>
                            <option value="logos">Logos</option>
                            <option value="banners">Banners</option>
                            <option value="icons">Icons</option>
                            <option value="backgrounds">Backgrounds</option>
                        </select>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                        />
                        <Button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="rounded-full"
                            style={{ backgroundColor: '#00FF91', color: '#051323' }}
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4 mr-2" />
                                    Upload Image
                                </>
                            )}
                        </Button>
                    </div>
                    <p className="text-xs mt-2" style={{ color: '#8394A7' }}>
                        JPG, PNG, GIF, WebP, SVG • Max 20MB
                    </p>
                </Card>

                {/* Storage Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {isLoading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <Card 
                                key={i}
                                className="p-6 rounded-xl animate-pulse"
                                style={{ backgroundColor: '#0a1f35' }}
                            >
                                <div className="h-20"></div>
                            </Card>
                        ))
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
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            {Object.entries(stats).map(([key, stat]) => (
                                <div key={key} className="text-center p-4 rounded-lg" style={{ backgroundColor: 'rgba(0, 255, 145, 0.1)' }}>
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
