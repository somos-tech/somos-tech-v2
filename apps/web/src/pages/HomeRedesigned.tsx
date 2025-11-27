/**
 * Modern Home Page - SOMOS.tech Redesign
 * Focus: Community, Programs, and Growth
 */

import { useNavigate } from 'react-router-dom';
import { ArrowRight, Users, Zap, Award, BookOpen, Rocket, Heart, Code } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function HomeRedesigned() {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();

    return (
        <div style={{ backgroundColor: '#051323', minHeight: '100vh' }}>
            {/* Hero Section */}
            <section className="relative overflow-hidden">
                <div 
                    className="absolute inset-0 opacity-10"
                    style={{
                        backgroundImage: 'radial-gradient(circle at 20% 50%, #00FF91, transparent 50%), radial-gradient(circle at 80% 80%, #00D4FF, transparent 50%)',
                    }}
                />
                
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-24 sm:py-32">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        {/* Left Content */}
                        <div className="space-y-8">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-1 h-8 bg-gradient-to-b from-[#00FF91] to-[#00D4FF]" />
                                    <p style={{ color: '#00FF91' }} className="text-sm font-bold uppercase tracking-wider">
                                        Welcome to SOMOS
                                    </p>
                                </div>
                                <h1 className="text-5xl sm:text-6xl font-bold text-white leading-tight">
                                    Empower Your <span style={{ color: '#00FF91' }}>Tech Journey</span>
                                </h1>
                                <p className="text-xl text-gray-300 max-w-lg">
                                    Join a vibrant community of Hispanic and Latinx tech professionals. Learn, grow, and thrive together with mentorship, programs, and endless opportunities.
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4">
                                <button
                                    onClick={() => isAuthenticated ? navigate('/online') : navigate('/register')}
                                    className="px-8 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95"
                                    style={{
                                        backgroundColor: '#00FF91',
                                        color: '#051323',
                                    }}
                                >
                                    <Zap className="w-5 h-5" />
                                    {isAuthenticated ? 'Join Community' : 'Get Started'}
                                    <ArrowRight className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => navigate('/groups')}
                                    className="px-8 py-3 rounded-lg font-bold border-2 transition-all hover:bg-white/5"
                                    style={{
                                        borderColor: '#00FF91',
                                        color: '#00FF91',
                                    }}
                                >
                                    Explore Groups
                                </button>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-8 pt-8 border-t" style={{ borderColor: 'rgba(0, 255, 145, 0.1)' }}>
                                <div>
                                    <p className="text-3xl font-bold text-white">8K+</p>
                                    <p style={{ color: '#8394A7' }}>Community Members</p>
                                </div>
                                <div>
                                    <p className="text-3xl font-bold text-white">26</p>
                                    <p style={{ color: '#8394A7' }}>Local Groups</p>
                                </div>
                                <div>
                                    <p className="text-3xl font-bold text-white">100%</p>
                                    <p style={{ color: '#8394A7' }}>Volunteer-Run</p>
                                </div>
                            </div>
                        </div>

                        {/* Right Visual */}
                        <div className="relative h-96 sm:h-full">
                            <div className="absolute inset-0 bg-gradient-to-br from-[#00FF91]/10 to-[#00D4FF]/10 rounded-3xl" />
                            <div className="absolute inset-4 bg-gradient-to-br from-[#00FF91]/5 to-transparent rounded-2xl backdrop-blur" />
                            <div className="flex items-center justify-center h-full">
                                <div className="text-center">
                                    <div className="text-6xl mb-4">🚀</div>
                                    <p className="text-lg text-gray-300">Your career in tech starts here</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Programs Section */}
            <section style={{ backgroundColor: '#0D1F2D' }} className="py-20 sm:py-32">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="text-center mb-16">
                        <p style={{ color: '#00FF91' }} className="text-sm font-bold uppercase tracking-wider mb-2">
                            What We Offer
                        </p>
                        <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
                            Programs Built for Your Success
                        </h2>
                        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                            From AI-powered career guidance to mentorship and hands-on labs, we've got everything you need to accelerate your growth.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            {
                                icon: <Rocket className="w-8 h-8" />,
                                title: 'AI Career Roadmap',
                                description: 'Personalized guidance for your tech journey with AI-powered insights'
                            },
                            {
                                icon: <Heart className="w-8 h-8" />,
                                title: 'Mentorship',
                                description: 'Get matched with experienced professionals who guide your growth'
                            },
                            {
                                icon: <Code className="w-8 h-8" />,
                                title: 'Hands-On Labs',
                                description: 'Learn by doing with practical AI and tech projects'
                            },
                            {
                                icon: <BookOpen className="w-8 h-8" />,
                                title: 'Career Resources',
                                description: 'Everything from resume templates to job search strategies'
                            },
                        ].map((program, idx) => (
                            <div
                                key={idx}
                                className="p-6 rounded-2xl border transition-all hover:scale-105 hover:border-[#00FF91] cursor-pointer"
                                style={{
                                    backgroundColor: '#0A1628',
                                    borderColor: 'rgba(0, 255, 145, 0.2)',
                                }}
                                onClick={() => navigate('/programs')}
                            >
                                <div style={{ color: '#00FF91' }} className="mb-4">
                                    {program.icon}
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">{program.title}</h3>
                                <p style={{ color: '#8394A7' }}>{program.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Community Section */}
            <section className="py-20 sm:py-32">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div className="space-y-6">
                            <div>
                                <p style={{ color: '#00FF91' }} className="text-sm font-bold uppercase tracking-wider mb-2">
                                    Join Us
                                </p>
                                <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
                                    Be Part of Something Special
                                </h2>
                            </div>
                            <p className="text-gray-400 text-lg">
                                Whether you're just starting your tech journey or you're an experienced professional, there's a place for you in the SOMOS community. Connect with peers, share knowledge, and grow together.
                            </p>

                            <div className="space-y-4">
                                {[
                                    'Access exclusive programs and workshops',
                                    'Connect with 8K+ community members',
                                    'Join local chapters and online groups',
                                    'Earn recognition badges for your achievements'
                                ].map((feature, idx) => (
                                    <div key={idx} className="flex items-center gap-3">
                                        <Users className="w-5 h-5" style={{ color: '#00FF91' }} />
                                        <span className="text-white">{feature}</span>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => navigate('/groups')}
                                className="px-8 py-3 rounded-lg font-bold flex items-center gap-2 transition-all hover:scale-105 w-fit"
                                style={{
                                    backgroundColor: 'rgba(0, 255, 145, 0.1)',
                                    color: '#00FF91',
                                    border: '1px solid rgba(0, 255, 145, 0.3)'
                                }}
                            >
                                Explore Our Community
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { emoji: '🎓', title: 'Learn' },
                                { emoji: '🤝', title: 'Connect' },
                                { emoji: '🚀', title: 'Grow' },
                                { emoji: '💪', title: 'Thrive' }
                            ].map((item, idx) => (
                                <div
                                    key={idx}
                                    className="p-8 rounded-2xl border text-center hover:scale-105 transition-all"
                                    style={{
                                        backgroundColor: '#0A1628',
                                        borderColor: 'rgba(0, 255, 145, 0.2)',
                                    }}
                                >
                                    <p className="text-4xl mb-2">{item.emoji}</p>
                                    <p className="font-bold text-white">{item.title}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section style={{ backgroundColor: '#0D1F2D' }} className="py-20 sm:py-32">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
                    <Award className="w-16 h-16 mx-auto mb-6" style={{ color: '#00FF91' }} />
                    <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
                        Ready to Transform Your Career?
                    </h2>
                    <p className="text-gray-400 text-lg mb-8">
                        Join thousands of tech professionals who have already started their journey with SOMOS.tech.
                    </p>
                    <button
                        onClick={() => isAuthenticated ? navigate('/online') : navigate('/register')}
                        className="px-10 py-4 rounded-lg font-bold text-lg inline-flex items-center gap-3 transition-all hover:scale-105 active:scale-95"
                        style={{
                            backgroundColor: '#00FF91',
                            color: '#051323',
                        }}
                    >
                        <Zap className="w-6 h-6" />
                        {isAuthenticated ? 'Go to Community' : 'Start Your Journey'}
                        <ArrowRight className="w-6 h-6" />
                    </button>
                </div>
            </section>

            {/* Footer CTA */}
            <section className="py-16 border-t" style={{ borderColor: 'rgba(0, 255, 145, 0.1)' }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            {
                                title: 'Want to Mentor?',
                                description: 'Share your knowledge and guide the next generation',
                                action: 'Become a Mentor',
                                onClick: () => window.open('https://somos.tech/mentor', '_blank')
                            },
                            {
                                title: 'Support the Mission',
                                description: 'Help us reach and empower more tech professionals',
                                action: 'Donate',
                                onClick: () => window.open('https://givebutter.com/somostech', '_blank')
                            },
                            {
                                title: 'Looking to Volunteer?',
                                description: 'Contribute your skills to our thriving community',
                                action: 'Explore Roles',
                                onClick: () => window.open('https://somos.tech/volunteer', '_blank')
                            }
                        ].map((item, idx) => (
                            <div key={idx} className="p-6 text-center">
                                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                                <p style={{ color: '#8394A7' }} className="mb-4">{item.description}</p>
                                <button
                                    onClick={item.onClick}
                                    className="text-sm font-bold inline-flex items-center gap-2 transition-colors hover:text-white cursor-pointer"
                                    style={{ color: '#00FF91' }}
                                >
                                    {item.action}
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
