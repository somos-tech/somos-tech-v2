import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X, Settings, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import NotificationPanel from '@/components/NotificationPanel';

export default function Navigation() {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, user } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Extract first name from email or use full email
    const getDisplayName = () => {
        if (!user?.userDetails) return 'User';
        const email = user.userDetails;
        const name = email.split('@')[0];
        // Capitalize first letter
        return name.charAt(0).toUpperCase() + name.slice(1);
    };

    const menuItems = [
        { label: 'Home', path: '/' },
        { label: 'About', path: '/about' },
        { label: 'Programs', path: '/programs' },
        { label: 'Community', path: '/community' },
        { label: 'Career', path: '/career' },
        { label: 'Events', path: '/events' },
    ];

    const isActive = (path: string) => location.pathname === path;

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
                            src="https://static.wixstatic.com/media/0c204d_5f310ee2b2a848ceac8e68b25c0c39eb~mv2.png"
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
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                className="px-4 py-2 rounded-lg transition-all duration-200"
                                style={{
                                    color: isActive(item.path) ? '#00FF91' : '#FFFFFF',
                                    backgroundColor: isActive(item.path) ? 'rgba(0, 255, 145, 0.1)' : 'transparent',
                                    border: isActive(item.path) ? '2px solid #00FF91' : '2px solid transparent',
                                }}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>

                    {/* Right Section: Welcome/Signup + Donate + Admin + Mobile Menu Toggle */}
                    <div className="flex items-center gap-4">
                        {isAuthenticated ? (
                            <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full" style={{
                                backgroundColor: 'rgba(0, 255, 145, 0.1)',
                                border: '1px solid rgba(0, 255, 145, 0.3)',
                            }}>
                                <User size={16} style={{ color: '#00FF91' }} />
                                <span style={{ color: '#FFFFFF', fontSize: '14px' }}>
                                    Welcome, <span style={{ color: '#00FF91', fontWeight: '600' }}>{getDisplayName()}</span>
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
                            </>
                        )}
                        <Button
                            className="hidden md:flex rounded-full px-6 transition-all hover:scale-105"
                            style={{
                                backgroundColor: '#00FF91',
                                color: '#051323',
                            }}
                            onClick={() => navigate('/donate')}
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
                                <div className="px-4 py-3 rounded-lg mb-2" style={{
                                    backgroundColor: 'rgba(0, 255, 145, 0.1)',
                                    border: '1px solid rgba(0, 255, 145, 0.3)',
                                }}>
                                    <div className="flex items-center gap-2">
                                        <User size={16} style={{ color: '#00FF91' }} />
                                        <span style={{ color: '#FFFFFF', fontSize: '14px' }}>
                                            Welcome, <span style={{ color: '#00FF91', fontWeight: '600' }}>{getDisplayName()}</span>
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
                                <button
                                    key={item.path}
                                    onClick={() => {
                                        navigate(item.path);
                                        setIsMobileMenuOpen(false);
                                    }}
                                    className="px-4 py-3 rounded-lg text-left transition-all"
                                    style={{
                                        color: isActive(item.path) ? '#00FF91' : '#FFFFFF',
                                        backgroundColor: isActive(item.path) ? 'rgba(0, 255, 145, 0.1)' : 'transparent',
                                        border: isActive(item.path) ? '1px solid #00FF91' : '1px solid transparent',
                                    }}
                                >
                                    {item.label}
                                </button>
                            ))}
                            {isAuthenticated && (
                                <>
                                    <div className="px-4 py-2">
                                        <NotificationPanel />
                                    </div>
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
                                </>
                            )}
                            <Button
                                className="w-full rounded-full mt-4"
                                style={{
                                    backgroundColor: '#00FF91',
                                    color: '#051323',
                                }}
                                onClick={() => {
                                    navigate('/donate');
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
