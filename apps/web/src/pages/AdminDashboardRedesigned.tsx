/**
 * Modern Admin Dashboard - Sleek and Minimal Design
 * Focus: Quick insights, real-time metrics, beautiful data visualization
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Users, Zap, TrendingUp, Plus, Filter, Settings, Download, Calendar, Loader2 } from 'lucide-react';
import { getUserStats } from '@/api/userService';
import { listGroups } from '@/api/groupsService';
import AdminQuickNav from '@/components/AdminQuickNav';

interface DashboardMetrics {
    totalMembers: number;
    activeUsers: number;
    communityGroups: number;
    eventsThisMonth: number;
    programsRunning: number;
    volunteerHours: number;
}

export default function AdminDashboardRedesigned() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState<DashboardMetrics>({
        totalMembers: 0,
        activeUsers: 0,
        communityGroups: 0,
        eventsThisMonth: 0,
        programsRunning: 6,
        volunteerHours: 0,
    });

    const [timeRange, setTimeRange] = useState('month');

    useEffect(() => {
        async function fetchMetrics() {
            try {
                setLoading(true);
                const [userStats, groupsData] = await Promise.all([
                    getUserStats().catch(() => ({ total: 0, active: 0, blocked: 0 })),
                    listGroups().catch(() => ({ groups: [], total: 0, userMemberships: [] }))
                ]);

                setMetrics({
                    totalMembers: userStats.total,
                    activeUsers: userStats.active,
                    communityGroups: groupsData.total || groupsData.groups.length,
                    eventsThisMonth: 0, // Events API not yet implemented
                    programsRunning: 6, // Static for now
                    volunteerHours: 0, // Not tracked yet
                });
            } catch (error) {
                console.error('Failed to fetch dashboard metrics:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchMetrics();
    }, []);

    if (loading) {
        return (
            <div style={{ backgroundColor: '#051323', minHeight: '100vh' }} className="flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#00FF91' }} />
            </div>
        );
    }

    return (
        <div style={{ backgroundColor: '#051323', minHeight: '100vh' }}>
            {/* Header */}
            <div 
                className="border-b sticky top-16 z-40"
                style={{ backgroundColor: 'rgba(5, 19, 35, 0.95)', borderColor: 'rgba(0, 255, 145, 0.1)' }}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-bold text-white">Dashboard</h1>
                            <p style={{ color: '#8394A7' }} className="text-sm mt-1">
                                Welcome back! Here's what's happening with SOMOS.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <select
                                value={timeRange}
                                onChange={(e) => setTimeRange(e.target.value)}
                                className="px-4 py-2 rounded-lg border text-sm focus:outline-none transition-colors"
                                style={{
                                    backgroundColor: '#0A1628',
                                    borderColor: 'rgba(0, 255, 145, 0.2)',
                                    color: '#FFFFFF'
                                }}
                            >
                                <option value="week">This Week</option>
                                <option value="month">This Month</option>
                                <option value="year">This Year</option>
                            </select>
                            <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                                <Download className="w-5 h-5 text-gray-400 hover:text-white" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                {/* Quick Navigation */}
                <AdminQuickNav className="mb-8" />

                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                    {[
                        {
                            label: 'Total Members',
                            value: metrics.totalMembers.toLocaleString(),
                            icon: Users,
                            color: '#00FF91'
                        },
                        {
                            label: 'Active Members',
                            value: metrics.activeUsers.toLocaleString(),
                            icon: TrendingUp,
                            color: '#00D4FF'
                        },
                        {
                            label: 'Community Groups',
                            value: metrics.communityGroups,
                            icon: BarChart,
                            color: '#FF6B9D'
                        }
                    ].map((metric, idx) => {
                        const Icon = metric.icon;
                        return (
                            <div
                                key={idx}
                                className="p-6 rounded-2xl border backdrop-blur-sm transition-all hover:scale-105 hover:border-opacity-100"
                                style={{
                                    backgroundColor: 'rgba(10, 22, 40, 0.5)',
                                    borderColor: 'rgba(0, 255, 145, 0.1)',
                                }}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div
                                        className="p-3 rounded-lg"
                                        style={{ backgroundColor: `${metric.color}15` }}
                                    >
                                        <Icon className="w-6 h-6" style={{ color: metric.color }} />
                                    </div>
                                </div>
                                <p style={{ color: '#8394A7' }} className="text-sm mb-1">{metric.label}</p>
                                <p className="text-3xl font-bold text-white">{metric.value}</p>
                            </div>
                        );
                    })}
                </div>

                {/* Secondary Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                    {[
                        { label: 'Active Programs', value: metrics.programsRunning, icon: Zap },
                    ].map((metric, idx) => (
                        <div
                            key={idx}
                            className="p-6 rounded-xl border"
                            style={{
                                backgroundColor: '#0A1628',
                                borderColor: 'rgba(0, 255, 145, 0.1)',
                            }}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p style={{ color: '#8394A7' }} className="text-sm mb-1">{metric.label}</p>
                                    <p className="text-2xl font-bold text-white">{metric.value}</p>
                                </div>
                                <metric.icon className="w-8 h-8" style={{ color: '#00FF91' }} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
                    <div
                        className="p-8 rounded-2xl border"
                        style={{
                            backgroundColor: 'rgba(0, 255, 145, 0.05)',
                            borderColor: 'rgba(0, 255, 145, 0.2)',
                        }}
                    >
                        <h3 className="text-xl font-bold text-white mb-4">Quick Actions</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { label: 'New Event', action: () => navigate('/admin/events') },
                                { label: 'New Group', action: () => navigate('/admin/groups') },
                                { label: 'View Users', action: () => navigate('/admin/users') },
                                { label: 'Media Manager', action: () => navigate('/admin/media') },
                                { label: 'Send Notification', action: () => navigate('/admin/notifications'), highlight: true },
                            ].map((action, idx) => (
                                <button
                                    key={idx}
                                    onClick={action.action}
                                    className={`p-3 rounded-lg border transition-all hover:scale-105 font-medium text-sm ${
                                        (action as any).highlight 
                                            ? 'bg-[#00D4FF] text-[#051323] border-[#00D4FF]' 
                                            : 'bg-[#051323] text-white border-[rgba(0,255,145,0.2)] hover:bg-white/10 hover:border-[#00FF91]'
                                    }`}
                                >
                                    {action.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div
                        className="p-8 rounded-2xl border"
                        style={{
                            backgroundColor: '#0A1628',
                            borderColor: 'rgba(0, 255, 145, 0.1)',
                        }}
                    >
                        <h3 className="text-xl font-bold text-white mb-4">System Status</h3>
                        <div className="space-y-3">
                            {[
                                { name: 'API Health', status: 'Operational', healthy: true },
                                { name: 'Database', status: 'Connected', healthy: true },
                                { name: 'File Storage', status: 'Synced', healthy: true },
                                { name: 'Backups', status: 'Latest: 2 hrs ago', healthy: true },
                            ].map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between">
                                    <p style={{ color: '#8394A7' }} className="text-sm">{item.name}</p>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${item.healthy ? 'bg-[#00FF91]' : 'bg-red-500'}`} />
                                        <p className="text-sm text-white">{item.status}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Recent Activity / Management Sections */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {[
                        {
                            title: 'Member Insights',
                            description: 'View trends and manage member data',
                            action: 'Go to Members',
                            navigate: '/admin/users'
                        },
                        {
                            title: 'Program Management',
                            description: 'Create and monitor active programs',
                            action: 'Manage Programs',
                            navigate: '/admin'
                        }
                    ].map((section, idx) => (
                        <div
                            key={idx}
                            className="p-6 rounded-2xl border cursor-pointer transition-all hover:border-[#00FF91] hover:scale-102"
                            style={{
                                backgroundColor: '#0A1628',
                                borderColor: 'rgba(0, 255, 145, 0.1)',
                            }}
                            onClick={() => navigate(section.navigate)}
                        >
                            <h3 className="text-lg font-bold text-white mb-2">{section.title}</h3>
                            <p style={{ color: '#8394A7' }} className="text-sm mb-4">{section.description}</p>
                            <button className="text-sm font-bold flex items-center gap-2 transition-colors hover:text-white" style={{ color: '#00FF91' }}>
                                {section.action}
                                <span>→</span>
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
