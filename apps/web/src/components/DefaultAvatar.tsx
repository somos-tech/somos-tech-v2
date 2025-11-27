/**
 * DefaultAvatar Component
 * 
 * Displays a default avatar with user initials or a generic user icon
 * when no profile photo is available. Uses consistent branding colors.
 * 
 * @component DefaultAvatar
 * @author SOMOS.tech
 * @created 2025-11-26
 */

import { User } from 'lucide-react';

interface DefaultAvatarProps {
    /** User's display name for generating initials */
    name?: string;
    /** User's email as fallback for generating initials */
    email?: string;
    /** Size of the avatar */
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    /** Optional additional CSS classes */
    className?: string;
    /** Whether to show a border */
    showBorder?: boolean;
}

/**
 * Size configurations for the avatar
 */
const sizeConfig = {
    xs: {
        container: 'w-8 h-8',
        text: 'text-xs',
        icon: 'w-4 h-4'
    },
    sm: {
        container: 'w-10 h-10',
        text: 'text-sm',
        icon: 'w-5 h-5'
    },
    md: {
        container: 'w-12 h-12',
        text: 'text-base',
        icon: 'w-6 h-6'
    },
    lg: {
        container: 'w-16 h-16',
        text: 'text-xl',
        icon: 'w-8 h-8'
    },
    xl: {
        container: 'w-24 h-24',
        text: 'text-3xl',
        icon: 'w-12 h-12'
    }
};

/**
 * Generate initials from a name or email
 */
function getInitials(name?: string, email?: string): string {
    if (name && name.trim()) {
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return parts[0].substring(0, 2).toUpperCase();
    }
    
    if (email) {
        // Use first two characters of email before @
        const localPart = email.split('@')[0];
        return localPart.substring(0, 2).toUpperCase();
    }
    
    return '';
}

/**
 * Generate a consistent background color based on the name/email
 * This ensures the same user always gets the same color
 */
function getAvatarColor(name?: string, email?: string): string {
    const str = name || email || 'default';
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Generate HSL color with consistent saturation and lightness
    // Hue varies based on hash, but we keep it in the green/teal family for brand consistency
    const hue = 140 + (hash % 40); // Range: 140-180 (green to cyan)
    return `hsl(${hue}, 70%, 35%)`;
}

export default function DefaultAvatar({
    name,
    email,
    size = 'md',
    className = '',
    showBorder = true
}: DefaultAvatarProps) {
    const initials = getInitials(name, email);
    const config = sizeConfig[size];
    const bgColor = getAvatarColor(name, email);
    
    const borderStyle = showBorder 
        ? { border: '2px solid #00FF91', boxShadow: '0 0 10px rgba(0, 255, 145, 0.2)' }
        : {};

    return (
        <div
            className={`${config.container} rounded-full flex items-center justify-center font-semibold ${className}`}
            style={{
                backgroundColor: initials ? bgColor : 'rgba(0, 255, 145, 0.2)',
                color: '#FFFFFF',
                ...borderStyle
            }}
            title={name || email || 'User'}
        >
            {initials ? (
                <span className={config.text}>{initials}</span>
            ) : (
                <User className={config.icon} style={{ color: '#00FF91' }} />
            )}
        </div>
    );
}

/**
 * UserAvatar Component
 * 
 * Smart avatar component that displays the user's profile photo if available,
 * otherwise falls back to the default avatar with initials.
 */
interface UserAvatarProps extends DefaultAvatarProps {
    /** URL of the user's profile photo */
    photoUrl?: string;
    /** Alt text for the image */
    alt?: string;
}

export function UserAvatar({
    photoUrl,
    name,
    email,
    size = 'md',
    className = '',
    showBorder = true,
    alt
}: UserAvatarProps) {
    const config = sizeConfig[size];
    
    const borderStyle = showBorder 
        ? { border: '2px solid #00FF91', boxShadow: '0 0 10px rgba(0, 255, 145, 0.2)' }
        : {};

    if (photoUrl) {
        return (
            <img
                src={photoUrl}
                alt={alt || name || 'User avatar'}
                className={`${config.container} rounded-full object-cover ${className}`}
                style={borderStyle}
                onError={(e) => {
                    // If image fails to load, hide it and show default avatar
                    (e.target as HTMLImageElement).style.display = 'none';
                }}
            />
        );
    }

    return (
        <DefaultAvatar
            name={name}
            email={email}
            size={size}
            className={className}
            showBorder={showBorder}
        />
    );
}
