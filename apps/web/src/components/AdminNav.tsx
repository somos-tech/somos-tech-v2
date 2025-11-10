import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Calendar, Shield, Activity } from 'lucide-react';

/**
 * Admin Navigation Component
 * Provides navigation tabs for admin pages
 */
export function AdminNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const adminPages = [
    { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/events', label: 'Events', icon: Calendar },
    { path: '/admin/users', label: 'Users', icon: Shield },
    { path: '/admin/health', label: 'API Health', icon: Activity },
  ];

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="border-b border-gray-700 mb-6">
      <nav className="flex gap-1 -mb-px overflow-x-auto">
        {adminPages.map((page) => {
          const Icon = page.icon;
          const active = isActive(page.path);
          
          return (
            <button
              key={page.path}
              onClick={() => navigate(page.path)}
              className={`
                flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm
                transition-colors whitespace-nowrap
                ${active
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600'
                }
              `}
            >
              <Icon className="h-4 w-4" />
              {page.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
