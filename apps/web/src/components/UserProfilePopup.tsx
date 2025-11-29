/**
 * User Profile Popup Component
 * 
 * A sleek popup that shows user profile information when clicking on a user.
 * Displays avatar, name, location, and other profile details.
 */

import { useState, useEffect, useRef } from 'react';
import { MapPin, Mail, Globe, X, MessageSquare, Shield, Loader2 } from 'lucide-react';
import { UserAvatar } from '@/components/DefaultAvatar';

interface UserProfile {
    id: string;
    name: string;
    email?: string;
    photoUrl?: string;
    location?: string;
    lastLoginLocation?: {
        city?: string;
        region?: string;
        country?: string;
    };
    bio?: string;
    website?: string;
    isAdmin?: boolean;
    joinedAt?: string;
}

interface UserProfilePopupProps {
    userId: string;
    userName: string;
    userPhoto?: string | null;
    isOpen: boolean;
    onClose: () => void;
    anchorPosition?: { x: number; y: number };
}

export default function UserProfilePopup({
    userId,
    userName,
    userPhoto,
    isOpen,
    onClose,
    anchorPosition
}: UserProfilePopupProps) {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const popupRef = useRef<HTMLDivElement>(null);

    // Fetch user profile when popup opens
    useEffect(() => {
        if (!isOpen || !userId) return;

        const fetchProfile = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // Call the correct API endpoint (without /profile suffix)
                const response = await fetch(`/api/users/${userId}`);
                if (response.ok) {
                    const json = await response.json();
                    const data = json.data || json;
                    const profileData = data.profile || data;
                    
                    // Map API response to our profile interface
                    setProfile({
                        id: profileData.id || userId,
                        name: profileData.displayName || profileData.name || userName,
                        email: profileData.email,
                        photoUrl: profileData.profilePicture || profileData.photoUrl,
                        location: profileData.location,
                        lastLoginLocation: profileData.lastLoginLocation,
                        bio: profileData.bio,
                        website: profileData.website,
                        isAdmin: profileData.isAdmin,
                        joinedAt: profileData.createdAt || profileData.joinedAt
                    });
                } else {
                    // Use fallback data if API fails
                    setProfile({
                        id: userId,
                        name: userName,
                        photoUrl: userPhoto || undefined
                    });
                }
            } catch (err) {
                console.error('Error fetching profile:', err);
                // Use fallback data
                setProfile({
                    id: userId,
                    name: userName,
                    photoUrl: userPhoto || undefined
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, [isOpen, userId, userName, userPhoto]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen, onClose]);

    // Close on escape key
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            return () => document.removeEventListener('keydown', handleEscape);
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const displayProfile = profile || { id: userId, name: userName, photoUrl: userPhoto };

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" />
            
            {/* Popup */}
            <div
                ref={popupRef}
                className="fixed z-50 w-80 rounded-2xl border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                style={{
                    backgroundColor: 'rgba(10, 22, 40, 0.98)',
                    borderColor: 'rgba(0, 255, 145, 0.15)',
                    backdropFilter: 'blur(20px)',
                    left: anchorPosition ? `${Math.min(anchorPosition.x, window.innerWidth - 340)}px` : '50%',
                    top: anchorPosition ? `${Math.min(anchorPosition.y, window.innerHeight - 400)}px` : '50%',
                    transform: anchorPosition ? 'none' : 'translate(-50%, -50%)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 30px rgba(0, 255, 145, 0.1)'
                }}
            >
                {/* Header Banner */}
                <div 
                    className="h-20 relative"
                    style={{
                        background: 'linear-gradient(135deg, rgba(0, 255, 145, 0.2) 0%, rgba(0, 255, 145, 0.05) 50%, rgba(10, 31, 53, 0.8) 100%)'
                    }}
                >
                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/20 hover:bg-black/40 transition-colors"
                    >
                        <X className="w-4 h-4 text-white/70" />
                    </button>
                </div>

                {/* Avatar - overlapping banner */}
                <div className="relative -mt-12 px-6">
                    <div className="relative inline-block">
                        <div className="absolute inset-0 rounded-full bg-[#00FF91]/30 blur-lg" />
                        <div className="relative ring-4 ring-[#0a1628] rounded-full">
                            <UserAvatar
                                name={displayProfile.name}
                                photoUrl={displayProfile.photoUrl || undefined}
                                size="xl"
                            />
                        </div>
                        {displayProfile.isAdmin && (
                            <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-[#00FF91] shadow-lg">
                                <Shield className="w-3 h-3 text-[#051323]" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Profile Content */}
                <div className="px-6 pb-6 pt-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-[#00FF91]" />
                        </div>
                    ) : (
                        <>
                            {/* Name */}
                            <h3 className="text-xl font-bold text-white mb-1">
                                {displayProfile.name}
                            </h3>
                            
                            {/* Admin badge */}
                            {displayProfile.isAdmin && (
                                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[#00FF91]/15 text-[#00FF91] font-semibold mb-3">
                                    <Shield className="w-3 h-3" />
                                    Admin
                                </span>
                            )}

                            {/* Bio */}
                            {displayProfile.bio && (
                                <p className="text-sm text-gray-400 mt-2 leading-relaxed">
                                    {displayProfile.bio}
                                </p>
                            )}

                            {/* Info Items */}
                            <div className="mt-4 space-y-2.5">
                                {/* Show user-set location, or fall back to auto-detected location */}
                                {(displayProfile.location || displayProfile.lastLoginLocation) && (
                                    <div className="flex items-center gap-3 text-sm">
                                        <div className="p-1.5 rounded-lg bg-[#00FF91]/10">
                                            <MapPin className="w-4 h-4 text-[#00FF91]" />
                                        </div>
                                        <span className="text-gray-300">
                                            {displayProfile.location || 
                                             (displayProfile.lastLoginLocation && 
                                              [displayProfile.lastLoginLocation.city, displayProfile.lastLoginLocation.region]
                                                .filter(Boolean).join(', ')
                                             )
                                            }
                                        </span>
                                    </div>
                                )}
                                
                                {displayProfile.email && (
                                    <div className="flex items-center gap-3 text-sm">
                                        <div className="p-1.5 rounded-lg bg-[#00FF91]/10">
                                            <Mail className="w-4 h-4 text-[#00FF91]" />
                                        </div>
                                        <span className="text-gray-300">{displayProfile.email}</span>
                                    </div>
                                )}
                                
                                {displayProfile.website && (
                                    <div className="flex items-center gap-3 text-sm">
                                        <div className="p-1.5 rounded-lg bg-[#00FF91]/10">
                                            <Globe className="w-4 h-4 text-[#00FF91]" />
                                        </div>
                                        <a 
                                            href={displayProfile.website.startsWith('http') ? displayProfile.website : `https://${displayProfile.website}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[#00FF91] hover:underline"
                                        >
                                            {displayProfile.website.replace(/^https?:\/\//, '')}
                                        </a>
                                    </div>
                                )}

                                {/* Joined date */}
                                {displayProfile.joinedAt && (
                                    <div className="flex items-center gap-3 text-sm text-gray-500 pt-2 border-t border-white/5">
                                        <MessageSquare className="w-4 h-4" />
                                        <span>
                                            Joined {new Date(displayProfile.joinedAt).toLocaleDateString('en-US', { 
                                                month: 'long', 
                                                year: 'numeric' 
                                            })}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* No location placeholder */}
                            {!displayProfile.location && !displayProfile.bio && !displayProfile.website && (
                                <p className="text-sm text-gray-500 italic mt-4">
                                    This user hasn't added profile details yet.
                                </p>
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
