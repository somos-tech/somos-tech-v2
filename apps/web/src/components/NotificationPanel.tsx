import { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, X, AlertCircle, Info, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { Notification } from '@/shared/types';
import { notificationsService } from '@/api/notificationsService';
import { useNavigate } from 'react-router-dom';

export default function NotificationPanel() {
    const navigate = useNavigate();
    const [showPanel, setShowPanel] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadUnreadCount();
        // Poll for new notifications every 30 seconds
        const interval = setInterval(loadUnreadCount, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (showPanel) {
            loadNotifications();
        }
    }, [showPanel]);

    const loadUnreadCount = async () => {
        try {
            const count = await notificationsService.getUnreadCount();
            setUnreadCount(count);
        } catch (error) {
            console.error('Error loading unread count:', error);
        }
    };

    const loadNotifications = async () => {
        try {
            setLoading(true);
            const data = await notificationsService.getNotifications();
            setNotifications(data);
        } catch (error) {
            console.error('Error loading notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsRead = async (notification: Notification) => {
        try {
            await notificationsService.markAsRead(notification.id, notification.type);
            await loadNotifications();
            await loadUnreadCount();
            
            if (notification.actionUrl) {
                navigate(notification.actionUrl);
                setShowPanel(false);
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await notificationsService.markAllAsRead();
            await loadNotifications();
            await loadUnreadCount();
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case 'success':
                return <CheckCircle className="h-5 w-5" style={{ color: '#00FF91' }} />;
            case 'warning':
                return <AlertCircle className="h-5 w-5" style={{ color: '#FFA500' }} />;
            case 'error':
                return <XCircle className="h-5 w-5" style={{ color: '#FF4444' }} />;
            default:
                return <Info className="h-5 w-5" style={{ color: '#00D4FF' }} />;
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'success':
                return 'bg-green-500/20 border-green-500/50';
            case 'warning':
                return 'bg-orange-500/20 border-orange-500/50';
            case 'error':
                return 'bg-red-500/20 border-red-500/50';
            default:
                return 'bg-blue-500/20 border-blue-500/50';
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <>
            {/* Notification Bell Button */}
            <div className="relative">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPanel(true)}
                    className="relative"
                    style={{
                        borderColor: '#1E3A5F',
                        backgroundColor: 'transparent',
                        color: '#FFFFFF',
                    }}
                >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <Badge
                            className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                            style={{
                                backgroundColor: '#FF4444',
                                color: '#FFFFFF',
                                borderRadius: '50%',
                            }}
                        >
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </Badge>
                    )}
                </Button>
            </div>

            {/* Notification Panel Dialog */}
            <Dialog open={showPanel} onOpenChange={setShowPanel}>
                <DialogContent 
                    className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
                    style={{ backgroundColor: '#0A1929', borderColor: '#1E3A5F' }}
                >
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Bell className="h-6 w-6" style={{ color: '#00FF91' }} />
                                <DialogTitle style={{ color: '#FFFFFF' }}>
                                    Notifications
                                </DialogTitle>
                                {unreadCount > 0 && (
                                    <Badge
                                        style={{
                                            backgroundColor: '#FF4444',
                                            color: '#FFFFFF',
                                        }}
                                    >
                                        {unreadCount} unread
                                    </Badge>
                                )}
                            </div>
                            {unreadCount > 0 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleMarkAllAsRead}
                                    style={{
                                        borderColor: '#1E3A5F',
                                        color: '#00FF91',
                                    }}
                                >
                                    <CheckCheck className="h-4 w-4 mr-2" />
                                    Mark all read
                                </Button>
                            )}
                        </div>
                        <DialogDescription style={{ color: '#8394A7' }}>
                            Stay updated on admin activities and system changes
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                        {loading ? (
                            <div className="text-center py-8" style={{ color: '#8394A7' }}>
                                Loading notifications...
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="text-center py-8">
                                <Bell className="h-12 w-12 mx-auto mb-4" style={{ color: '#8394A7' }} />
                                <p style={{ color: '#8394A7' }}>No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`p-4 rounded-lg border ${
                                        notification.read ? 'opacity-60' : ''
                                    } cursor-pointer hover:bg-opacity-80 transition-all`}
                                    style={{
                                        backgroundColor: '#0F2744',
                                        borderColor: '#1E3A5F',
                                    }}
                                    onClick={() => !notification.read && handleMarkAsRead(notification)}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`p-2 rounded-lg border ${getSeverityColor(notification.severity)}`}>
                                            {getSeverityIcon(notification.severity)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <h4
                                                    className="font-semibold text-sm"
                                                    style={{ color: '#FFFFFF' }}
                                                >
                                                    {notification.title}
                                                </h4>
                                                {!notification.read && (
                                                    <div
                                                        className="h-2 w-2 rounded-full flex-shrink-0 mt-1"
                                                        style={{ backgroundColor: '#00FF91' }}
                                                    />
                                                )}
                                            </div>
                                            <p
                                                className="text-sm mb-2"
                                                style={{ color: '#8394A7' }}
                                            >
                                                {notification.message}
                                            </p>
                                            <div className="flex items-center gap-2 text-xs" style={{ color: '#8394A7' }}>
                                                <span>{formatDate(notification.createdAt)}</span>
                                                {notification.createdBy && (
                                                    <>
                                                        <span>•</span>
                                                        <span>by {notification.createdBy}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        {notification.read && (
                                            <Check className="h-4 w-4 flex-shrink-0" style={{ color: '#00FF91' }} />
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
