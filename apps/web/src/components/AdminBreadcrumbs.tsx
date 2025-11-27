import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
    label: string;
    path?: string;
}

// Route to breadcrumb mapping
const routeLabels: Record<string, string> = {
    '/admin': 'Admin',
    '/admin/users': 'Users',
    '/admin/groups': 'Groups',
    '/admin/events': 'Events',
    '/admin/settings': 'Settings',
    '/admin/settings/security': 'Security',
    '/admin/settings/moderation': 'Moderation',
    '/admin/settings/media': 'Media Manager',
    '/admin/settings/options': 'Options',
    '/admin/settings/notifications': 'Notifications',
    '/admin/settings/branding': 'Branding',
    '/admin/settings/integrations': 'Integrations',
    '/admin/programs': 'Programs',
    '/admin/analytics': 'Analytics',
    '/admin/reports': 'Reports',
    '/admin/announcements': 'Announcements',
    '/admin/media': 'Media',
    '/admin/health': 'API Health',
    '/admin/notifications': 'Notifications',
};

export default function AdminBreadcrumbs() {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Build breadcrumb items from current path
    const buildBreadcrumbs = (): BreadcrumbItem[] => {
        const pathParts = location.pathname.split('/').filter(Boolean);
        const breadcrumbs: BreadcrumbItem[] = [];
        
        let currentPath = '';
        for (const part of pathParts) {
            currentPath += `/${part}`;
            const label = routeLabels[currentPath] || part.charAt(0).toUpperCase() + part.slice(1);
            breadcrumbs.push({
                label,
                path: currentPath
            });
        }
        
        return breadcrumbs;
    };

    const breadcrumbs = buildBreadcrumbs();
    const isLastItem = (index: number) => index === breadcrumbs.length - 1;

    return (
        <nav className="flex items-center space-x-1 text-sm mb-6">
            {/* Home/Admin link */}
            <button
                onClick={() => navigate('/admin')}
                className="flex items-center gap-1 px-2 py-1 rounded-md transition-colors hover:bg-white/10"
                style={{ color: breadcrumbs.length === 1 ? '#00FF91' : '#8394A7' }}
            >
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">Admin</span>
            </button>

            {/* Breadcrumb items (skip the first 'admin' item since we show Home) */}
            {breadcrumbs.slice(1).map((item, index) => {
                const isLast = isLastItem(index + 1);
                return (
                    <div key={item.path} className="flex items-center">
                        <ChevronRight className="w-4 h-4 mx-1" style={{ color: '#4A5568' }} />
                        {isLast ? (
                            <span 
                                className="px-2 py-1 rounded-md font-medium"
                                style={{ color: '#00FF91' }}
                            >
                                {item.label}
                            </span>
                        ) : (
                            <button
                                onClick={() => item.path && navigate(item.path)}
                                className="px-2 py-1 rounded-md transition-colors hover:bg-white/10"
                                style={{ color: '#8394A7' }}
                            >
                                {item.label}
                            </button>
                        )}
                    </div>
                );
            })}
        </nav>
    );
}
