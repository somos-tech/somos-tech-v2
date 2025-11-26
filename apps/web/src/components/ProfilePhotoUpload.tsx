import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Upload, X, Loader2, Check, AlertCircle } from 'lucide-react';
import { uploadProfilePhoto, validateFile, ALLOWED_EXTENSIONS } from '@/api/mediaService';

interface ProfilePhotoUploadProps {
    currentPhotoUrl?: string;
    userName?: string;
    onUploadSuccess?: (url: string) => void;
    onUploadError?: (error: string) => void;
    size?: 'sm' | 'md' | 'lg';
}

export default function ProfilePhotoUpload({
    currentPhotoUrl,
    userName = 'User',
    onUploadSuccess,
    onUploadError,
    size = 'lg'
}: ProfilePhotoUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const sizeClasses = {
        sm: 'w-16 h-16',
        md: 'w-24 h-24',
        lg: 'w-32 h-32'
    };

    const iconSizes = {
        sm: 'w-4 h-4',
        md: 'w-6 h-6',
        lg: 'w-8 h-8'
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const handleFileSelect = useCallback(async (file: File) => {
        setUploadError(null);
        setUploadSuccess(false);

        // Validate file
        const validation = validateFile(file, 'PROFILE_PHOTO');
        if (!validation.valid) {
            setUploadError(validation.error || 'Invalid file');
            onUploadError?.(validation.error || 'Invalid file');
            return;
        }

        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
            setPreviewUrl(e.target?.result as string);
        };
        reader.readAsDataURL(file);

        // Upload file
        setIsUploading(true);
        try {
            const result = await uploadProfilePhoto(file);
            
            if (result.success && result.data) {
                setUploadSuccess(true);
                onUploadSuccess?.(result.data.url);
                
                // Clear success after 3 seconds
                setTimeout(() => setUploadSuccess(false), 3000);
            } else {
                setUploadError(result.error || 'Upload failed');
                setPreviewUrl(null);
                onUploadError?.(result.error || 'Upload failed');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Upload failed';
            setUploadError(errorMessage);
            setPreviewUrl(null);
            onUploadError?.(errorMessage);
        } finally {
            setIsUploading(false);
        }
    }, [onUploadSuccess, onUploadError]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

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
            handleFileSelect(file);
        }
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const clearPreview = () => {
        setPreviewUrl(null);
        setUploadError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const displayUrl = previewUrl || currentPhotoUrl;

    return (
        <div className="flex flex-col items-center gap-4">
            {/* Photo Display / Upload Zone */}
            <div
                className={`relative ${sizeClasses[size]} rounded-full cursor-pointer transition-all ${
                    dragActive ? 'scale-105' : ''
                }`}
                onClick={handleClick}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                style={{
                    border: dragActive ? '3px dashed #00FF91' : '3px solid #00FF91',
                    boxShadow: dragActive 
                        ? '0 0 30px rgba(0, 255, 145, 0.6)' 
                        : '0 0 20px rgba(0, 255, 145, 0.3)'
                }}
            >
                {displayUrl ? (
                    <img
                        src={displayUrl}
                        alt={userName}
                        className={`${sizeClasses[size]} rounded-full object-cover`}
                    />
                ) : (
                    <div
                        className={`${sizeClasses[size]} rounded-full flex items-center justify-center text-2xl font-bold`}
                        style={{ backgroundColor: 'rgba(0, 255, 145, 0.2)', color: '#00FF91' }}
                    >
                        {getInitials(userName)}
                    </div>
                )}

                {/* Overlay */}
                <div
                    className={`absolute inset-0 rounded-full flex items-center justify-center transition-opacity ${
                        isUploading ? 'opacity-100' : 'opacity-0 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: 'rgba(5, 19, 35, 0.7)' }}
                >
                    {isUploading ? (
                        <Loader2 className={`${iconSizes[size]} animate-spin`} style={{ color: '#00FF91' }} />
                    ) : uploadSuccess ? (
                        <Check className={iconSizes[size]} style={{ color: '#00FF91' }} />
                    ) : (
                        <Camera className={iconSizes[size]} style={{ color: '#00FF91' }} />
                    )}
                </div>

                {/* Success indicator */}
                {uploadSuccess && (
                    <div
                        className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: '#00FF91' }}
                    >
                        <Check className="w-5 h-5" style={{ color: '#051323' }} />
                    </div>
                )}
            </div>

            {/* Hidden File Input */}
            <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_EXTENSIONS.join(',')}
                onChange={handleInputChange}
                className="hidden"
            />

            {/* Upload Button */}
            <Button
                onClick={handleClick}
                disabled={isUploading}
                variant="outline"
                size="sm"
                className="rounded-full"
                style={{ 
                    borderColor: '#00FF91', 
                    color: '#00FF91',
                    backgroundColor: 'transparent'
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
                        Change Photo
                    </>
                )}
            </Button>

            {/* Error Message */}
            {uploadError && (
                <div 
                    className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg"
                    style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}
                >
                    <AlertCircle className="w-4 h-4" />
                    {uploadError}
                    <button onClick={clearPreview} className="ml-2">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Upload Hints */}
            <p className="text-xs text-center" style={{ color: '#8394A7' }}>
                Drag & drop or click to upload<br />
                JPG, PNG, GIF, WebP • Max 5MB
            </p>
        </div>
    );
}
