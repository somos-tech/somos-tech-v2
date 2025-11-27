/**
 * Modern Programs Page - Showcase all SOMOS.tech Programs
 * Focus: Enrollment, progress tracking, and program discovery
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Users, Briefcase, Lightbulb, BookOpen, Award, ArrowRight, Star } from 'lucide-react';

interface Program {
    id: string;
    title: string;
    description: string;
    icon: any;
    color: string;
    featured: boolean;
    benefits: string[];
    cta: string;
}

export default function ProgramsPageRedesigned() {
    const navigate = useNavigate();
    const [selectedCategory, setSelectedCategory] = useState('all');

    const programs: Program[] = [
        {
            id: 'ai-roadmap',
            title: 'AI Career Roadmap',
            description: 'Personalized guidance through the AI landscape. Get a customized roadmap based on your skills and goals.',
            icon: Lightbulb,
            color: '#00FF91',
            featured: true,
            benefits: [
                'Personalized learning path',
                'Expert mentorship',
                'Industry certifications',
                'Job placement support'
            ],
            cta: 'Start Your Roadmap'
        },
        {
            id: 'mentorship',
            title: 'Mentorship Program',
            description: 'Connect with experienced professionals in your field. Get guidance, advice, and career support.',
            icon: Users,
            color: '#00D4FF',
            featured: true,
            benefits: [
                '1-on-1 mentorship',
                'Monthly check-ins',
                'Career planning',
                'Network access'
            ],
            cta: 'Find a Mentor'
        },
        {
            id: 'labs',
            title: 'Labs - Hands-On Projects',
            description: 'Build real-world projects with peers. Apply your skills in collaborative environments.',
            icon: Zap,
            color: '#FF6B9D',
            featured: true,
            benefits: [
                'Team projects',
                'Real-world applications',
                'Code reviews',
                'Portfolio building'
            ],
            cta: 'Join a Lab'
        },
        {
            id: 'career-resources',
            title: 'Career Resources Hub',
            description: 'Access resume reviews, interview prep, and job opportunities.',
            icon: Briefcase,
            color: '#FFB81C',
            featured: false,
            benefits: [
                'Resume reviews',
                'Interview coaching',
                'Job board access',
                'Salary guidance'
            ],
            cta: 'Explore Resources'
        },
        {
            id: 'bootcamp',
            title: 'Tech Bootcamp',
            description: 'Intensive learning program for rapid skill development in emerging technologies.',
            icon: BookOpen,
            color: '#9D4EDD',
            featured: false,
            benefits: [
                '12-week intensive',
                'Live instruction',
                'Peer learning',
                'Certificate included'
            ],
            cta: 'Apply Now'
        },
        {
            id: 'leadership',
            title: 'Leadership Development',
            description: 'Build leadership skills for tech roles. Learn management, communication, and strategy.',
            icon: Award,
            color: '#00FF91',
            featured: false,
            benefits: [
                'Leadership training',
                'Executive coaching',
                'Networking events',
                'Community building'
            ],
            cta: 'Learn More'
        }
    ];

    const filteredPrograms = selectedCategory === 'all' 
        ? programs 
        : programs.filter(p => selectedCategory === 'featured' ? p.featured : true);

    const featuredPrograms = programs.filter(p => p.featured);

    return (
        <div style={{ backgroundColor: '#051323', minHeight: '100vh' }}>
            {/* Hero Section */}
            <div 
                className="relative overflow-hidden"
                style={{
                    background: 'linear-gradient(135deg, #051323 0%, #0A1628 50%, rgba(0, 255, 145, 0.05) 100%)',
                    borderBottom: '1px solid rgba(0, 255, 145, 0.1)'
                }}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
                    <div className="text-center max-w-3xl mx-auto">
                        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
                            Our Programs
                        </h1>
                        <p style={{ color: '#8394A7' }} className="text-lg mb-8">
                            Choose your learning path. From personalized mentorship to hands-on projects, 
                            we have programs designed for every stage of your tech career.
                        </p>
                        <div className="flex flex-wrap justify-center gap-3">
                            <button
                                onClick={() => setSelectedCategory('all')}
                                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                                    selectedCategory === 'all' 
                                        ? 'bg-[#00FF91] text-[#051323]' 
                                        : 'border border-[#00FF91]/30 text-white hover:border-[#00FF91]'
                                }`}
                            >
                                All Programs
                            </button>
                            <button
                                onClick={() => setSelectedCategory('featured')}
                                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                                    selectedCategory === 'featured' 
                                        ? 'bg-[#00D4FF] text-[#051323]' 
                                        : 'border border-[#00D4FF]/30 text-white hover:border-[#00D4FF]'
                                }`}
                            >
                                <Star className="w-4 h-4 inline mr-2" />
                                Featured
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Featured Programs Carousel */}
            {selectedCategory === 'all' && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
                    <h2 className="text-2xl font-bold text-white mb-8">Popular Programs</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
                        {featuredPrograms.map((program) => {
                            const Icon = program.icon;
                            return (
                                <div
                                    key={program.id}
                                    className="group relative rounded-2xl overflow-hidden border transition-all hover:scale-105 hover:border-opacity-100 cursor-pointer"
                                    style={{
                                        backgroundColor: '#0A1628',
                                        borderColor: `${program.color}30`,
                                    }}
                                    onClick={() => navigate(`/programs/${program.id}`)}
                                >
                                    {/* Gradient overlay */}
                                    <div 
                                        className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity"
                                        style={{ backgroundColor: program.color }}
                                    />

                                    <div className="p-6 relative z-10">
                                        <div
                                            className="inline-flex p-3 rounded-lg mb-4"
                                            style={{ backgroundColor: `${program.color}15` }}
                                        >
                                            <Icon className="w-6 h-6" style={{ color: program.color }} />
                                        </div>

                                        <h3 className="text-xl font-bold text-white mb-2">{program.title}</h3>
                                        <p style={{ color: '#8394A7' }} className="text-sm mb-6">{program.description}</p>

                                        <button 
                                            className="w-full py-2 rounded-lg font-semibold transition-all text-sm flex items-center justify-between px-4 group/btn"
                                            style={{
                                                backgroundColor: `${program.color}20`,
                                                color: program.color,
                                                border: `1px solid ${program.color}40`
                                            }}
                                        >
                                            {program.cta}
                                            <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* All Programs Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
                <h2 className="text-2xl font-bold text-white mb-8">
                    {selectedCategory === 'featured' ? 'Featured' : 'All'} Programs
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredPrograms.map((program) => {
                        const Icon = program.icon;
                        return (
                            <div
                                key={program.id}
                                className="group rounded-2xl border overflow-hidden transition-all hover:scale-102"
                                style={{
                                    backgroundColor: '#0A1628',
                                    borderColor: `${program.color}30`,
                                }}
                            >
                                <div className="p-6">
                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div
                                            className="inline-flex p-3 rounded-lg"
                                            style={{ backgroundColor: `${program.color}15` }}
                                        >
                                            <Icon className="w-6 h-6" style={{ color: program.color }} />
                                        </div>
                                        {program.featured && (
                                            <div className="flex items-center gap-1 px-2 py-1 rounded-full" style={{ backgroundColor: `${program.color}20` }}>
                                                <Star className="w-3 h-3" style={{ color: program.color }} />
                                                <span className="text-xs font-bold" style={{ color: program.color }}>Featured</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Title and Description */}
                                    <h3 className="text-lg font-bold text-white mb-2">{program.title}</h3>
                                    <p style={{ color: '#8394A7' }} className="text-sm mb-4">{program.description}</p>

                                    {/* Benefits */}
                                    <div className="mb-6 space-y-2">
                                        {program.benefits.slice(0, 3).map((benefit, idx) => (
                                            <div key={idx} className="flex items-center gap-2 text-sm">
                                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: program.color }} />
                                                <span style={{ color: '#8394A7' }}>{benefit}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* CTA */}
                                    <button 
                                        onClick={() => navigate(`/programs/${program.id}`)}
                                        className="w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                                        style={{
                                            backgroundColor: program.color,
                                            color: '#051323',
                                        }}
                                    >
                                        {program.cta}
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* CTA Section */}
            <div 
                className="max-w-7xl mx-auto px-4 sm:px-6 py-16 my-12 rounded-2xl border"
                style={{
                    backgroundColor: 'rgba(0, 255, 145, 0.05)',
                    borderColor: 'rgba(0, 255, 145, 0.2)',
                }}
            >
                <div className="text-center max-w-2xl mx-auto">
                    <h2 className="text-3xl font-bold text-white mb-4">
                        Ready to Transform Your Career?
                    </h2>
                    <p style={{ color: '#8394A7' }} className="text-lg mb-8">
                        Join our growing community of tech professionals building their futures with SOMOS.tech
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button 
                            onClick={() => navigate('/register')}
                            className="px-8 py-3 rounded-full font-bold transition-all hover:scale-105"
                            style={{ backgroundColor: '#00FF91', color: '#051323' }}
                        >
                            Get Started
                        </button>
                        <button 
                            onClick={() => navigate('/online')}
                            className="px-8 py-3 rounded-full font-bold transition-all border"
                            style={{ borderColor: '#00FF91', color: '#00FF91' }}
                        >
                            Join Community
                        </button>
                    </div>
                </div>
            </div>

            {/* FAQ Section */}
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
                <h2 className="text-2xl font-bold text-white mb-8">Frequently Asked Questions</h2>
                <div className="space-y-4">
                    {[
                        {
                            q: 'How much does it cost to join a program?',
                            a: 'All SOMOS.tech programs are completely free. We are a 100% volunteer-run nonprofit committed to making tech education accessible.'
                        },
                        {
                            q: 'Can I join multiple programs?',
                            a: 'Absolutely! Many members are part of multiple programs. You can choose whichever programs align with your goals.'
                        },
                        {
                            q: 'Do I need prior experience?',
                            a: 'No prior experience required. Our programs are designed for all skill levels, from beginners to experienced professionals.'
                        },
                        {
                            q: 'What support is available?',
                            a: 'You\'ll have access to mentors, community members, resources, and dedicated program coordinators to support your journey.'
                        }
                    ].map((faq, idx) => (
                        <details 
                            key={idx}
                            className="group p-4 rounded-lg border cursor-pointer transition-all"
                            style={{
                                backgroundColor: '#0A1628',
                                borderColor: 'rgba(0, 255, 145, 0.1)',
                            }}
                        >
                            <summary className="font-bold text-white flex items-center justify-between">
                                {faq.q}
                                <span className="text-[#00FF91]">+</span>
                            </summary>
                            <p style={{ color: '#8394A7' }} className="mt-3 text-sm">{faq.a}</p>
                        </details>
                    ))}
                </div>
            </div>
        </div>
    );
}
