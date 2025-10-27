import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';

export default function Navigation() {
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
        <nav className="w-full" style={{ backgroundColor: '#051323', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
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
                        <span 
                            className="ml-3 text-lg font-semibold tracking-tight hidden md:block"
                            style={{ color: '#FFFFFF' }}
                        >
                            SOMOS.tech
                        </span>
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

                    {/* Right Section: Donate Button + Mobile Menu Toggle */}
                    <div className="flex items-center gap-4">
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
