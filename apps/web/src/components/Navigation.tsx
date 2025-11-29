import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X, Settings, User, ChevronDown } from 'lucide-react';
import { useUserContext } from '@/contexts/UserContext';
import { UserAvatar } from '@/components/DefaultAvatar';
import NotificationPanel from '@/components/NotificationPanel';

export default function Navigation() {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, isAdmin, displayName, profilePicture, email } = useUserContext();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);

    // Main navigation items with discovery focus
    const menuItems = [
        { label: 'Home', path: '/' },
        { 
            label: 'Programs', 
            path: '/programs',
            submenu: [
                { label: 'All Programs', path: '/programs' },
                { label: 'AI Career Roadmap', path: '/programs/ai-roadmap' },
                { label: 'Mentorship', path: '/programs/mentorship' },
                { label: 'Labs', path: '/programs/labs' },
                { label: 'Career Resources', path: '/programs/career-resources' },
            ]
        },
        { 
            label: 'Community', 
            path: '/online',
            submenu: [
                { label: 'Online Community', path: '/online' },
                { label: 'Chapters', path: '/chapters' },
                { label: 'Find Events', path: '/events' },
            ]
        },
    ];

    const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

    return (
        <nav className="w-full sticky top-0" style={{ backgroundColor: '#051323', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', zIndex: 100 }}>
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between h-20">
                    {/* Logo */}
                    <div 
                        className="flex items-center cursor-pointer"
                        onClick={() => navigate('/')}
                    >
                        <img 
                            src="https://stsomostechdev64qb73pzvg.blob.core.windows.net/site-branding/shortcircle.png"
                            alt="SOMOS.tech Logo"
                            className="w-12 h-12 rounded-full"
                            style={{ 
                                boxShadow: '0 0 10px rgba(0, 255, 145, 0.5)'
                            }}
                        />
                    </div>

                    {/* Desktop Menu */}
                    <div className="hidden lg:flex items-center space-x-1">
                        {menuItems.map((item) => (
                            <div 
                                key={item.path} 
                                className="relative"
                                onMouseEnter={() => item.submenu && setOpenSubmenu(item.label)}
                                onMouseLeave={() => setOpenSubmenu(null)}
                            >
                                <button
                                    onClick={() => !item.submenu && navigate(item.path)}
                                    className="px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-1"
                                    style={{
                                        color: isActive(item.path) ? '#00FF91' : '#FFFFFF',
                                        backgroundColor: isActive(item.path) ? 'rgba(0, 255, 145, 0.1)' : 'transparent',
                                        border: isActive(item.path) ? '2px solid #00FF91' : '2px solid transparent',
                                    }}
                                >
                                    {item.label}
                                    {item.submenu && <ChevronDown size={16} />}
                                </button>
                                
                                {/* Dropdown Menu */}
                                {item.submenu && openSubmenu === item.label && (
                                    <div 
                                        className="absolute top-full left-0 pt-2"
                                        style={{ paddingTop: '0' }}
                                    >
                                        {/* Invisible bridge to prevent hover gap */}
                                        <div className="h-2 w-full" />
                                        <div 
                                            className="py-4 px-2 rounded-xl shadow-2xl min-w-[240px] backdrop-blur-sm"
                                            style={{
                                                backgroundColor: 'rgba(10, 22, 40, 0.95)',
                                                border: '1px solid rgba(0, 255, 145, 0.3)',
                                                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)'
                                            }}
                                        >
                                            {item.submenu.map((subItem, subIdx) => (
                                                <button
                                                    key={subItem.path}
                                                    onClick={() => {
                                                        navigate(subItem.path);
                                                        setOpenSubmenu(null);
                                                    }}
                                                    className="w-full text-left px-4 py-2.5 rounded-lg transition-all duration-200 flex items-center gap-2 group"
                                                    style={{
                                                        color: isActive(subItem.path) ? '#00FF91' : '#FFFFFF',
                                                        backgroundColor: isActive(subItem.path) ? 'rgba(0, 255, 145, 0.15)' : 'transparent',
                                                    }}
                                                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0, 255, 145, 0.1)')}
                                                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = isActive(subItem.path) ? 'rgba(0, 255, 145, 0.15)' : 'transparent')}
                                                >
                                                    <span className="w-1.5 h-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all" style={{ backgroundColor: isActive(subItem.path) ? '#00FF91' : '#00D4FF' }} />
                                                    {subItem.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Right Section: Welcome/Signup + Donate + Profile/Admin + Mobile Menu Toggle */}
                    <div className="flex items-center gap-4">
                        {isAuthenticated ? (
                            <div 
                                className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full cursor-pointer hover:opacity-80 transition-opacity" 
                                style={{
                                    backgroundColor: 'rgba(0, 255, 145, 0.1)',
                                    border: '1px solid rgba(0, 255, 145, 0.3)',
                                }}
                                onClick={() => navigate('/profile')}
                            >
                                <UserAvatar 
                                    photoUrl={profilePicture} 
                                    name={displayName} 
                                    email={email}
                                    size="xs" 
                                    showBorder={false}
                                />
                                <span style={{ color: '#FFFFFF', fontSize: '14px' }}>
                                    <span style={{ color: '#00FF91', fontWeight: '600' }}>{displayName}</span>
                                </span>
                            </div>
                        ) : (
                            <Button
                                className="hidden md:flex items-center gap-2 rounded-full px-6 transition-all hover:scale-105"
                                style={{
                                    backgroundColor: 'transparent',
                                    color: '#00FF91',
                                    border: '2px solid #00FF91',
                                }}
                                onClick={() => navigate('/register')}
                            >
                                <User size={16} />
                                Sign Up
                            </Button>
                        )}
                        {isAuthenticated && (
                            <>
                                <NotificationPanel />
                                {isAdmin && (
                                    <Button
                                        className="hidden md:flex items-center gap-2 rounded-full px-6 transition-all hover:scale-105"
                                        style={{
                                            backgroundColor: '#00D4FF',
                                            color: '#051323',
                                        }}
                                        onClick={() => navigate('/admin')}
                                    >
                                        <Settings size={16} />
                                        Admin
                                    </Button>
                                )}
                            </>
                        )}
                        <Button
                            className="hidden md:flex rounded-full px-6 transition-all hover:scale-105"
                            style={{
                                backgroundColor: '#00FF91',
                                color: '#051323',
                            }}
                            onClick={() => window.open('https://givebutter.com/somostech', '_blank')}
                        >
                            Donate
                        </Button>

                        {/* Mobile Menu Button */}
                        <button
                            className="lg:hidden p-2"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            style={{ color: '#FFFFFF' }}
                        >
                            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {isMobileMenuOpen && (
                    <div 
                        className="lg:hidden py-4 border-t"
                        style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
                    >
                        <div className="flex flex-col space-y-2">
                            {isAuthenticated ? (
                                <div 
                                    className="px-4 py-3 rounded-lg mb-2 cursor-pointer hover:opacity-80 transition-opacity" 
                                    style={{
                                        backgroundColor: 'rgba(0, 255, 145, 0.1)',
                                        border: '1px solid rgba(0, 255, 145, 0.3)',
                                    }}
                                    onClick={() => {
                                        navigate('/profile');
                                        setIsMobileMenuOpen(false);
                                    }}
                                >
                                    <div className="flex items-center gap-3">
                                        <UserAvatar 
                                            photoUrl={profilePicture} 
                                            name={displayName} 
                                            email={email}
                                            size="sm" 
                                            showBorder={false}
                                        />
                                        <span style={{ color: '#FFFFFF', fontSize: '14px' }}>
                                            <span style={{ color: '#00FF91', fontWeight: '600' }}>{displayName}</span>
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <Button
                                    className="w-full rounded-full flex items-center justify-center gap-2 mb-2"
                                    style={{
                                        backgroundColor: 'transparent',
                                        color: '#00FF91',
                                        border: '2px solid #00FF91',
                                    }}
                                    onClick={() => {
                                        navigate('/register');
                                        setIsMobileMenuOpen(false);
                                    }}
                                >
                                    <User size={16} />
                                    Sign Up
                                </Button>
                            )}
                            {menuItems.map((item) => (
                                <div key={item.path}>
                                    <button
                                        onClick={() => {
                                            if (item.submenu) {
                                                setOpenSubmenu(openSubmenu === item.label ? null : item.label);
                                            } else {
                                                navigate(item.path);
                                                setIsMobileMenuOpen(false);
                                            }
                                        }}
                                        className="px-4 py-3 rounded-lg text-left transition-all w-full flex items-center justify-between font-medium"
                                        style={{
                                            color: isActive(item.path) ? '#00FF91' : '#FFFFFF',
                                            backgroundColor: isActive(item.path) ? 'rgba(0, 255, 145, 0.1)' : 'transparent',
                                            border: isActive(item.path) ? '1px solid rgba(0, 255, 145, 0.5)' : '1px solid transparent',
                                        }}
                                    >
                                        {item.label}
                                        {item.submenu && (
                                            <ChevronDown 
                                                size={16} 
                                                style={{
                                                    transform: openSubmenu === item.label ? 'rotate(180deg)' : 'rotate(0deg)',
                                                    transition: 'transform 0.2s'
                                                }}
                                            />
                                        )}
                                    </button>
                                    {/* Mobile Submenu */}
                                    {item.submenu && openSubmenu === item.label && (
                                        <div className="ml-4 mt-2 space-y-2 bg-black/20 rounded-lg p-2">
                                            {item.submenu.map((subItem) => (
                                                <button
                                                    key={subItem.path}
                                                    onClick={() => {
                                                        navigate(subItem.path);
                                                        setIsMobileMenuOpen(false);
                                                        setOpenSubmenu(null);
                                                    }}
                                                    className="px-4 py-2 rounded-lg text-left transition-all w-full flex items-center gap-2"
                                                    style={{
                                                        color: isActive(subItem.path) ? '#00FF91' : '#8394A7',
                                                        backgroundColor: isActive(subItem.path) ? 'rgba(0, 255, 145, 0.1)' : 'transparent',
                                                    }}
                                                >
                                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isActive(subItem.path) ? '#00FF91' : '#00D4FF' }} />
                                                    {subItem.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {isAuthenticated && (
                                <>
                                    <div className="px-4 py-2">
                                        <NotificationPanel />
                                    </div>
                                    {isAdmin && (
                                        <Button
                                            className="w-full rounded-full flex items-center justify-center gap-2"
                                            style={{
                                                backgroundColor: '#00D4FF',
                                                color: '#051323',
                                            }}
                                            onClick={() => {
                                                navigate('/admin');
                                                setIsMobileMenuOpen(false);
                                            }}
                                        >
                                            <Settings size={16} />
                                            Admin
                                        </Button>
                                    )}
                                </>
                            )}
                            <Button
                                className="w-full rounded-full mt-4"
                                style={{
                                    backgroundColor: '#00FF91',
                                    color: '#051323',
                                }}
                                onClick={() => {
                                    window.open('https://givebutter.com/somostech', '_blank');
                                    setIsMobileMenuOpen(false);
                                }}
                            >
                                Donate
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
}
