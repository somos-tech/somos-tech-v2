import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, RefreshCw, Twitter, Instagram, Linkedin, Facebook, Clock, Tag, ExternalLink, AlertCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import type { SocialMediaPosts, SocialMediaPost } from "@shared/types";
import eventService from "@/api/eventService";

interface SocialMediaPostsProps {
    eventId: string;
    socialMediaPosts?: SocialMediaPosts;
    socialMediaPostsStatus?: 'idle' | 'in-progress' | 'completed' | 'failed';
    socialMediaAgentError?: string;
    onRegenerate?: () => void;
    onStatusUpdate?: () => void;
}

const PLATFORM_CONFIG = {
    x: {
        name: 'X (Twitter)',
        icon: Twitter,
        color: '#1DA1F2',
        bgColor: 'rgba(0, 0, 0, 0.1)'
    },
    instagram: {
        name: 'Instagram',
        icon: Instagram,
        color: '#E4405F',
        bgColor: 'rgba(228, 64, 95, 0.1)'
    },
    linkedin: {
        name: 'LinkedIn',
        icon: Linkedin,
        color: '#0A66C2',
        bgColor: 'rgba(10, 102, 194, 0.1)'
    },
    facebook: {
        name: 'Facebook',
        icon: Facebook,
        color: '#1877F2',
        bgColor: 'rgba(24, 119, 242, 0.1)'
    }
};

function PostCard({ post }: { post: SocialMediaPost }) {
    const [copied, setCopied] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);
    const platformConfig = PLATFORM_CONFIG[post?.platform?.toLowerCase()] ?? PLATFORM_CONFIG['x'];
    const Icon = platformConfig.icon;

    const copyToClipboard = async (text: string, type: 'copy' | 'link') => {
        try {
            await navigator.clipboard.writeText(text);
            if (type === 'copy') {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } else {
                setCopiedLink(true);
                setTimeout(() => setCopiedLink(false), 2000);
            }
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <Card className="rounded-2xl" style={{ borderColor: platformConfig.color, borderWidth: '1px' }}>
            <CardContent className="p-5 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg" style={{ backgroundColor: platformConfig.bgColor }}>
                            <Icon className="h-5 w-5" style={{ color: platformConfig.color }} />
                        </div>
                        <div>
                            <div className="font-medium text-sm" style={{ color: '#FFFFFF' }}>
                                {platformConfig.name}
                            </div>
                            <Badge className="text-xs" style={{ backgroundColor: platformConfig.bgColor, color: platformConfig.color }}>
                                Variant {post.variant}
                            </Badge>
                        </div>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(post.text ?? post.copy, 'copy')}
                        className="rounded-xl"
                        style={{ borderColor: platformConfig.color, color: platformConfig.color }}
                    >
                        {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                        {copied ? 'Copied!' : 'Copy'}
                    </Button>
                </div>

                {/* Post Copy */}
                <div
                    className="p-4 rounded-xl text-sm whitespace-pre-wrap font-mono"
                    style={{ backgroundColor: '#051323', color: '#FFFFFF', border: '1px solid rgba(131, 148, 167, 0.2)' }}
                >
                    {post.text ?? post.copy}
                </div>

                {/* Alt Text */}
                <div className="space-y-1">
                    <div className="text-xs font-medium" style={{ color: '#8394A7' }}>Alt Text</div>
                    <div className="text-sm p-3 rounded-lg" style={{ backgroundColor: '#051323', color: '#FFFFFF' }}>
                        {post.altText ?? post.imageAltText}
                    </div>
                </div>

                {/* Meta Information */}
                <div className="grid grid-cols-2 gap-3">
                    {/* Suggested Time */}
                    <div className="space-y-1">
                        <div className="text-xs font-medium flex items-center gap-1" style={{ color: '#8394A7' }}>
                            <Clock className="h-3 w-3" />
                            Suggested Post Time
                        </div>
                        {/* <div className="text-xs" style={{ color: '#FFFFFF' }}>
                            {format(new Date(post.suggestedTime), "MMM d, yyyy · h:mm a")}
                        </div> */}
                    </div>

                    {/* UTM Link */}
                    <div className="space-y-1">
                        <div className="text-xs font-medium flex items-center gap-1" style={{ color: '#8394A7' }}>
                            <ExternalLink className="h-3 w-3" />
                            UTM Link
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="text-xs truncate flex-1" style={{ color: '#FFFFFF' }}>
                                {post.utmLink}
                            </div>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyToClipboard(post.utmLink, 'link')}
                                className="h-6 w-6 p-0"
                            >
                                {copiedLink ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Hashtags & Mentions */}
                <div className="space-y-2">
                    {post?.suggestedHashtags?.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                            <Tag className="h-3 w-3" style={{ color: '#8394A7' }} />
                            {post.suggestedHashtags.map((tag, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs" style={{ color: '#00FF91', borderColor: '#00FF91' }}>
                                    {tag}
                                </Badge>
                            ))}
                        </div>
                    )}
                    {post?.suggestedMentions?.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                            <div className="text-xs" style={{ color: '#8394A7' }}>@</div>
                            {post.suggestedMentions.map((mention, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs" style={{ color: '#00FF91', borderColor: '#00FF91' }}>
                                    {mention}
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>

                {/* Suggested Media */}
                {post?.suggestedMedia?.length > 0 && (
                    <div className="space-y-1">
                        <div className="text-xs font-medium" style={{ color: '#8394A7' }}>Suggested Media</div>
                        <ul className="text-xs space-y-1 list-disc list-inside" style={{ color: '#FFFFFF' }}>
                            {post.suggestedMedia.map((media, idx) => (
                                <li key={idx}>{media}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Notes */}
                {post?.notes && (
                    <div className="space-y-1">
                        <div className="text-xs font-medium" style={{ color: '#8394A7' }}>Notes</div>
                        <div className="text-xs" style={{ color: '#FFFFFF' }}>{post.notes}</div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function SocialMediaPosts({
    eventId,
    socialMediaPosts,
    socialMediaPostsStatus = 'idle',
    socialMediaAgentError,
    onRegenerate,
    onStatusUpdate
}: SocialMediaPostsProps) {
    const [selectedPlatform, setSelectedPlatform] = useState<'all' | 'x' | 'instagram' | 'linkedin'>('all');
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Automatic polling when status is in-progress
    useEffect(() => {
        if (socialMediaPostsStatus === 'in-progress') {
            const pollInterval = setInterval(async () => {
                try {
                    await checkStatus();
                } catch (error) {
                    console.error('Error polling status:', error);
                }
            }, 30000); // Poll every 30 seconds

            return () => clearInterval(pollInterval);
        }
    }, [socialMediaPostsStatus, eventId]);

    const checkStatus = async () => {
        try {
            const statusData = await eventService.checkSocialMediaPostsStatus(eventId);

            // If status changed or posts are available, notify parent to reload event
            if (statusData.status !== socialMediaPostsStatus || (statusData.posts && !socialMediaPosts)) {
                onStatusUpdate?.();
            }
        } catch (error) {
            console.error('Failed to check status:', error);
        }
    };

    const handleManualRefresh = async () => {
        setIsRefreshing(true);
        try {
            await checkStatus();
        } finally {
            setIsRefreshing(false);
        }
    };

    // Show loading state when in progress
    if (socialMediaPostsStatus === 'in-progress') {
        return (
            <Card className="rounded-2xl border-slate-200">
                <CardContent className="p-8 flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin" style={{ color: '#00FF91' }} />
                    <div className="text-center space-y-2">
                        <div className="font-medium text-lg" style={{ color: '#FFFFFF' }}>Generating Social Media Posts</div>
                        <div className="text-sm" style={{ color: '#8394A7' }}>
                            The AI agent is creating customized posts for your event. This usually takes 30-60 seconds.
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            onClick={handleManualRefresh}
                            disabled={isRefreshing}
                            variant="outline"
                            className="rounded-xl"
                            style={{ borderColor: '#00FF91', color: '#00FF91' }}
                        >
                            {isRefreshing ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Checking...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Check Status
                                </>
                            )}
                        </Button>
                    </div>
                    <div className="text-xs" style={{ color: '#8394A7' }}>
                        💡 Status updates automatically every 30 seconds
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Show error state if failed
    if (socialMediaPostsStatus === 'failed') {
        return (
            <Card className="rounded-2xl" style={{ borderColor: 'rgba(239, 68, 68, 0.5)' }}>
                <CardContent className="p-8 flex flex-col items-center justify-center space-y-3">
                    <AlertCircle className="h-8 w-8" style={{ color: '#ef4444' }} />
                    <div className="text-center space-y-2">
                        <div className="font-medium" style={{ color: '#FFFFFF' }}>Failed to Generate Posts</div>
                        <div className="text-sm" style={{ color: '#8394A7' }}>
                            {socialMediaAgentError || 'An error occurred while generating social media posts.'}
                        </div>
                    </div>
                    {onRegenerate && (
                        <Button
                            onClick={onRegenerate}
                            className="rounded-xl mt-2"
                            style={{ backgroundColor: '#00FF91', color: '#000000' }}
                        >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Try Again
                        </Button>
                    )}
                </CardContent>
            </Card>
        );
    }

    if (!socialMediaPosts) {
        return (
            <Card className="rounded-2xl border-slate-200">
                <CardContent className="p-8 flex flex-col items-center justify-center space-y-3">
                    <AlertCircle className="h-8 w-8" style={{ color: '#8394A7' }} />
                    <div className="text-center space-y-2">
                        <div className="font-medium" style={{ color: '#FFFFFF' }}>No Social Media Posts Yet</div>
                        <div className="text-sm" style={{ color: '#8394A7' }}>
                            Social media posts are being generated for this event. Check back in a moment.
                        </div>
                    </div>
                    {onRegenerate && (
                        <Button
                            onClick={onRegenerate}
                            className="rounded-xl mt-2"
                            style={{ backgroundColor: '#00FF91', color: '#000000' }}
                        >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Regenerate Posts
                        </Button>
                    )}
                </CardContent>
            </Card>
        );
    }

    const filteredPosts = selectedPlatform === 'all'
        ? socialMediaPosts.posts
        : socialMediaPosts.posts.filter(p => p.platform === selectedPlatform);

    return (
        <div className="space-y-5">
            {/* Summary Section */}
            <Card className="rounded-2xl" style={{ backgroundColor: '#051323', borderColor: 'rgba(0, 255, 145, 0.2)' }}>
                <CardContent className="p-5 space-y-3">
                    <div className="font-medium" style={{ color: '#00FF91' }}>Campaign Summary</div>
                    <div className="text-sm" style={{ color: '#FFFFFF' }}>{socialMediaPosts.summary}</div>

                    {socialMediaPosts.recommendedWindow && socialMediaPosts.recommendedWindow.length === 2 && (
                        <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4" style={{ color: '#8394A7' }} />
                            <span style={{ color: '#8394A7' }}>Recommended posting window:</span>
                            <span style={{ color: '#FFFFFF' }}>
                                {format(new Date(socialMediaPosts.recommendedWindow[0]), "MMM d")} - {format(new Date(socialMediaPosts.recommendedWindow[1]), "MMM d, yyyy")}
                            </span>
                        </div>
                    )}

                    {/* Compliance Checklist */}
                    {/* <div className="flex items-center gap-2 flex-wrap pt-2">
                        {Object.entries(socialMediaPosts.complianceChecklist).map(([key, value]) => (
                            <Badge
                                key={key}
                                variant={value ? "default" : "destructive"}
                                className="text-xs"
                                style={value ? { backgroundColor: 'rgba(0, 255, 145, 0.1)', color: '#00FF91' } : {}}
                            >
                                {value ? <Check className="h-3 w-3 mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
                                {key.replace(/_/g, ' ')}
                            </Badge>
                        ))}
                    </div> */}
                </CardContent>
            </Card>

            {/* Filter & Regenerate */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant={selectedPlatform === 'all' ? 'default' : 'outline'}
                        onClick={() => setSelectedPlatform('all')}
                        className="rounded-xl"
                        style={selectedPlatform === 'all' ? { backgroundColor: '#00FF91', color: '#000000' } : { borderColor: '#8394A7', color: '#8394A7' }}
                    >
                        All Platforms
                    </Button>
                    {Object.entries(PLATFORM_CONFIG).map(([platform, config]) => {
                        const Icon = config.icon;
                        return (
                            <Button
                                key={platform}
                                size="sm"
                                variant={selectedPlatform === platform ? 'default' : 'outline'}
                                onClick={() => setSelectedPlatform(platform as any)}
                                className="rounded-xl"
                                style={selectedPlatform === platform
                                    ? { backgroundColor: config.color, color: '#FFFFFF' }
                                    : { borderColor: config.color, color: config.color }
                                }
                            >
                                <Icon className="h-4 w-4 mr-1" />
                                {config.name}
                            </Button>
                        );
                    })}
                </div>

                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleManualRefresh}
                        disabled={isRefreshing}
                        className="rounded-xl"
                        style={{ borderColor: '#8394A7', color: '#8394A7' }}
                    >
                        {isRefreshing ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Refresh
                    </Button>
                    {onRegenerate && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={onRegenerate}
                            className="rounded-xl"
                            style={{ borderColor: '#00FF91', color: '#00FF91' }}
                        >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Regenerate
                        </Button>
                    )}
                </div>
            </div>

            {/* Posts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredPosts?.map((post, idx) => (
                    <PostCard key={idx} post={post} />
                ))}
            </div>

            {filteredPosts?.length === 0 && (
                <Card className="rounded-2xl border-slate-200">
                    <CardContent className="p-8 text-center text-sm" style={{ color: '#8394A7' }}>
                        No posts available for the selected platform.
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
