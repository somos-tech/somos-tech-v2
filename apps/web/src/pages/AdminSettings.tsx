import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
    Image, 
    Shield, 
    Bell, 
    Palette, 
    Database,
    Globe,
    Mail,
    Key,
    ArrowLeft
} from 'lucide-react';

export default function AdminSettings() {
    const navigate = useNavigate();

    const settingsSections = [
        {
            title: 'Media Management',
            description: 'Upload and manage site images, logos, and assets',
            icon: Image,
            path: '/admin/media',
            color: '#00FF91',
            status: 'active'
        },
        {
            title: 'Security & Access',
            description: 'Configure authentication, roles, and permissions',
            icon: Shield,
            path: '/admin/settings/security',
            color: '#FF00F5',
            status: 'coming-soon'
        },
        {
            title: 'Notifications',
            description: 'Manage email templates and notification settings',
            icon: Bell,
            path: '/admin/settings/notifications',
            color: '#00D4FF',
            status: 'coming-soon'
        },
        {
            title: 'Branding',
            description: 'Customize colors, logos, and site appearance',
            icon: Palette,
            path: '/admin/settings/branding',
            color: '#FFB800',
            status: 'coming-soon'
        },
        {
            title: 'Database',
            description: 'View database stats and manage data',
            icon: Database,
            path: '/admin/settings/database',
            color: '#9D4EDD',
            status: 'coming-soon'
        },
        {
            title: 'API & Integrations',
            description: 'Manage API keys and third-party integrations',
            icon: Key,
            path: '/admin/settings/integrations',
            color: '#F72585',
            status: 'coming-soon'
        },
        {
            title: 'Email Settings',
            description: 'Configure SMTP, email providers, and templates',
            icon: Mail,
            path: '/admin/settings/email',
            color: '#4CC9F0',
            status: 'coming-soon'
        },
        {
            title: 'Domain & SEO',
            description: 'Manage domains, redirects, and SEO settings',
            icon: Globe,
            path: '/admin/settings/domain',
            color: '#80ED99',
            status: 'coming-soon'
        }
    ];

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#0a1f35' }}>
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <Button 
                        variant="ghost" 
                        className="mb-4 text-gray-400 hover:text-white"
                        onClick={() => navigate('/admin')}
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Dashboard
                    </Button>
                    <h1 className="text-4xl font-bold mb-2" style={{ color: '#FFFFFF' }}>
                        Settings
                    </h1>
                    <p style={{ color: '#8394A7' }}>
                        Configure platform settings and preferences
                    </p>
                </div>

                {/* Settings Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {settingsSections.map((section) => {
                        const Icon = section.icon;
                        const isActive = section.status === 'active';
                        
                        return (
                            <Card 
                                key={section.path}
                                className={`transition-all ${isActive ? 'cursor-pointer hover:scale-105 hover:shadow-xl' : 'opacity-60'}`}
                                style={{ 
                                    backgroundColor: '#051323',
                                    borderColor: isActive ? section.color : '#2a3f55',
                                    borderWidth: '2px'
                                }}
                                onClick={() => isActive && navigate(section.path)}
                            >
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div 
                                                className="p-3 rounded-lg"
                                                style={{ 
                                                    backgroundColor: `${section.color}20`,
                                                }}
                                            >
                                                <Icon 
                                                    className="h-6 w-6" 
                                                    style={{ color: isActive ? section.color : '#5a6b7c' }}
                                                />
                                            </div>
                                            <div>
                                                <CardTitle 
                                                    className="text-lg"
                                                    style={{ color: isActive ? '#FFFFFF' : '#8394A7' }}
                                                >
                                                    {section.title}
                                                </CardTitle>
                                            </div>
                                        </div>
                                        {!isActive && (
                                            <span 
                                                className="text-xs px-2 py-1 rounded-full"
                                                style={{ 
                                                    backgroundColor: '#2a3f55',
                                                    color: '#8394A7'
                                                }}
                                            >
                                                Coming Soon
                                            </span>
                                        )}
                                    </div>
                                    <CardDescription 
                                        className="mt-2"
                                        style={{ color: '#8394A7' }}
                                    >
                                        {section.description}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Button
                                        className="w-full"
                                        disabled={!isActive}
                                        style={{
                                            backgroundColor: isActive ? section.color : '#2a3f55',
                                            color: isActive ? '#051323' : '#5a6b7c'
                                        }}
                                    >
                                        {isActive ? 'Open' : 'Coming Soon'}
                                    </Button>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* System Info */}
                <div className="mt-12">
                    <h2 className="text-2xl font-bold mb-4" style={{ color: '#FFFFFF' }}>
                        System Information
                    </h2>
                    <Card style={{ backgroundColor: '#051323', borderColor: '#2a3f55' }}>
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <p className="text-sm" style={{ color: '#8394A7' }}>Environment</p>
                                    <p className="text-lg font-medium" style={{ color: '#00FF91' }}>
                                        Development
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm" style={{ color: '#8394A7' }}>API Status</p>
                                    <p className="text-lg font-medium" style={{ color: '#00FF91' }}>
                                        Online
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm" style={{ color: '#8394A7' }}>Version</p>
                                    <p className="text-lg font-medium" style={{ color: '#FFFFFF' }}>
                                        2.0.0
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
