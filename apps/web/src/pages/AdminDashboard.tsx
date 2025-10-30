import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, MapPin, Calendar, Settings } from 'lucide-react';

export default function AdminDashboard() {
    const navigate = useNavigate();

    const adminSections = [
        {
            title: 'Groups Management',
            description: 'Manage city chapters and event groups',
            icon: MapPin,
            path: '/admin/groups',
            color: '#00FF91'
        },
        {
            title: 'Events Management',
            description: 'Create and manage events across all chapters',
            icon: Calendar,
            path: '/admin/events',
            color: '#00D4FF'
        },
        {
            title: 'User Management',
            description: 'Manage users, roles, and permissions',
            icon: Users,
            path: '/admin/users',
            color: '#FF00F5'
        },
        {
            title: 'Settings',
            description: 'Configure platform settings and preferences',
            icon: Settings,
            path: '/admin/settings',
            color: '#FFB800'
        }
    ];

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#0a1f35' }}>
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-2" style={{ color: '#FFFFFF' }}>
                        Admin Dashboard
                    </h1>
                    <p style={{ color: '#8394A7' }}>
                        Manage your SOMOS.tech platform
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                    {adminSections.map((section) => {
                        const Icon = section.icon;
                        return (
                            <Card 
                                key={section.path}
                                className="cursor-pointer transition-all hover:scale-105 hover:shadow-xl"
                                style={{ 
                                    backgroundColor: '#051323',
                                    borderColor: section.color,
                                    borderWidth: '2px'
                                }}
                                onClick={() => navigate(section.path)}
                            >
                                <CardHeader>
                                    <div className="flex items-center gap-4">
                                        <div 
                                            className="p-3 rounded-lg"
                                            style={{ 
                                                backgroundColor: `${section.color}20`,
                                            }}
                                        >
                                            <Icon 
                                                className="h-8 w-8" 
                                                style={{ color: section.color }}
                                            />
                                        </div>
                                        <div>
                                            <CardTitle style={{ color: '#FFFFFF' }}>
                                                {section.title}
                                            </CardTitle>
                                            <CardDescription style={{ color: '#8394A7' }}>
                                                {section.description}
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <Button
                                        className="w-full"
                                        style={{
                                            backgroundColor: section.color,
                                            color: '#051323'
                                        }}
                                    >
                                        Manage
                                    </Button>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Quick Stats */}
                <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card style={{ backgroundColor: '#051323', borderColor: '#00FF91' }}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm" style={{ color: '#8394A7' }}>
                                Total Groups
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold" style={{ color: '#00FF91' }}>
                                24
                            </div>
                        </CardContent>
                    </Card>

                    <Card style={{ backgroundColor: '#051323', borderColor: '#00D4FF' }}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm" style={{ color: '#8394A7' }}>
                                Active Events
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold" style={{ color: '#00D4FF' }}>
                                15
                            </div>
                        </CardContent>
                    </Card>

                    <Card style={{ backgroundColor: '#051323', borderColor: '#FF00F5' }}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm" style={{ color: '#8394A7' }}>
                                Total Users
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold" style={{ color: '#FF00F5' }}>
                                1,247
                            </div>
                        </CardContent>
                    </Card>

                    <Card style={{ backgroundColor: '#051323', borderColor: '#FFB800' }}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm" style={{ color: '#8394A7' }}>
                                Pending Approvals
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold" style={{ color: '#FFB800' }}>
                                8
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
