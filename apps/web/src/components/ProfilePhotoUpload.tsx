import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Upload, X, Loader2, Check, AlertCircle, FileCheck, FileX, FileImage } from 'lucide-react';
import { uploadProfilePhoto, validateFile, ALLOWED_EXTENSIONS, ALLOWED_IMAGE_TYPES, SIZE_LIMITS, formatFileSize } from '@/api/mediaService';

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

interface ProfilePhotoUploadProps {
    currentPhotoUrl?: string;
    userName?: string;
    onUploadSuccess?: (url: string) => void;
    onUploadError?: (error: string) => void;
    size?: 'sm' | 'md' | 'lg';
    showValidation?: boolean; // New prop to show/hide validation details
}

export default function ProfilePhotoUpload({
    currentPhotoUrl,
    userName = 'User',
    onUploadSuccess,
    onUploadError,
    size = 'lg',
    showValidation = true
}: ProfilePhotoUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [fileValidation, setFileValidation] = useState<FileValidation>({
        file: null,
        typeCheck: 'pending',
        sizeCheck: 'pending',
        extensionCheck: 'pending',
        isValid: false
    });
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

    // Validate file and update state with detailed feedback
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
            validation.typeError = `"${file.type || 'unknown'}" not allowed`;
        }

        // Check file extension
        const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        if (ALLOWED_EXTENSIONS.includes(ext)) {
            validation.extensionCheck = 'pass';
        } else {
            validation.extensionCheck = 'fail';
            validation.extensionError = `"${ext}" not allowed`;
        }

        // Check file size (profile photos: 5MB limit)
        const sizeLimit = SIZE_LIMITS.PROFILE_PHOTO;
        if (file.size <= sizeLimit) {
            validation.sizeCheck = 'pass';
        } else {
            validation.sizeCheck = 'fail';
            validation.sizeError = `${formatFileSize(file.size)} exceeds ${formatFileSize(sizeLimit)}`;
        }

        // Overall validation
        validation.isValid = 
            validation.typeCheck === 'pass' && 
            validation.extensionCheck === 'pass' && 
            validation.sizeCheck === 'pass';

        return validation;
    };

    const handleFileSelect = useCallback(async (file: File) => {
        setUploadError(null);
        setUploadSuccess(false);

        // Validate file with detailed feedback
        const validation = validateSelectedFile(file);
        setFileValidation(validation);

        if (!validation.isValid) {
            // Build error message from all failed checks
            const errors = [];
            if (validation.typeError) errors.push(validation.typeError);
            if (validation.extensionError) errors.push(validation.extensionError);
            if (validation.sizeError) errors.push(validation.sizeError);
            const errorMessage = errors.join(', ');
            setUploadError(errorMessage);
            onUploadError?.(errorMessage);
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
                
                // Clear validation state after successful upload
                setTimeout(() => {
                    setUploadSuccess(false);
                    setFileValidation({
                        file: null,
                        typeCheck: 'pending',
                        sizeCheck: 'pending',
                        extensionCheck: 'pending',
                        isValid: false
                    });
                }, 3000);
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

    const displayUrl = previewUrl || currentPhotoUrl;

    // Validation check indicator component
    const ValidationCheck = ({ 
        status, 
        label, 
        detail 
    }: { 
        status: 'pending' | 'pass' | 'fail'; 
        label: string; 
        detail: string;
    }) => (
        <div 
            className="flex items-center gap-1.5 text-xs"
            style={{ 
                color: status === 'pass' ? '#00FF91' : status === 'fail' ? '#ef4444' : '#8394A7'
            }}
        >
            {status === 'pass' ? (
                <FileCheck className="w-3.5 h-3.5" />
            ) : status === 'fail' ? (
                <FileX className="w-3.5 h-3.5" />
            ) : (
                <div className="w-3.5 h-3.5 rounded-full border" style={{ borderColor: '#6B7280' }} />
            )}
            <span className="font-medium">{label}:</span>
            <span className="opacity-80">{detail}</span>
        </div>
    );

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

            {/* Validation Feedback - shown when file is selected */}
            {showValidation && fileValidation.file && (
                <div 
                    className="w-full max-w-xs p-3 rounded-lg space-y-2"
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
                >
                    {/* File name */}
                    <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5" style={{ color: '#FFFFFF' }}>
                            <FileImage className="w-3.5 h-3.5" style={{ color: '#00FF91' }} />
                            <span className="truncate max-w-[180px]">{fileValidation.file.name}</span>
                        </div>
                        <button 
                            onClick={clearPreview}
                            className="p-0.5 hover:opacity-70"
                            style={{ color: '#8394A7' }}
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                    
                    {/* Validation checks */}
                    <div className="space-y-1.5">
                        <ValidationCheck 
                            status={fileValidation.typeCheck}
                            label="Type"
                            detail={fileValidation.typeCheck === 'pass' 
                                ? fileValidation.file?.type.split('/')[1]?.toUpperCase() || 'OK'
                                : fileValidation.typeError || 'JPG, PNG'}
                        />
                        <ValidationCheck 
                            status={fileValidation.extensionCheck}
                            label="Extension"
                            detail={fileValidation.extensionCheck === 'pass' 
                                ? `.${fileValidation.file?.name.split('.').pop()}`
                                : fileValidation.extensionError || '.jpg, .png'}
                        />
                        <ValidationCheck 
                            status={fileValidation.sizeCheck}
                            label="Size"
                            detail={fileValidation.sizeCheck === 'pass' 
                                ? `${formatFileSize(fileValidation.file?.size || 0)} ✓`
                                : fileValidation.sizeError || 'Max 5MB'}
                        />
                    </div>

                    {/* Overall status */}
                    <div 
                        className="text-xs text-center pt-1 border-t"
                        style={{ 
                            borderColor: 'rgba(255,255,255,0.1)',
                            color: fileValidation.isValid ? '#00FF91' : '#ef4444'
                        }}
                    >
                        {fileValidation.isValid ? (
                            <span className="flex items-center justify-center gap-1">
                                <Check className="w-3 h-3" /> Ready to upload
                            </span>
                        ) : (
                            <span className="flex items-center justify-center gap-1">
                                <AlertCircle className="w-3 h-3" /> Fix errors above
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Error Message */}
            {uploadError && !fileValidation.file && (
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

            {/* Upload Hints - shown when no file selected */}
            {!fileValidation.file && (
                <p className="text-xs text-center" style={{ color: '#8394A7' }}>
                    Drag & drop or click to upload<br />
                    <span className="flex items-center justify-center gap-2 mt-1">
                        <span className="flex items-center gap-0.5">
                            <FileCheck className="w-3 h-3" style={{ color: '#00FF91' }} /> JPG, PNG
                        </span>
                        <span className="flex items-center gap-0.5">
                            <FileCheck className="w-3 h-3" style={{ color: '#00FF91' }} /> Max 5MB
                        </span>
                    </span>
                </p>
            )}
        </div>
    );
}
