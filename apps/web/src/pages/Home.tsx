import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

export default function Home() {
    const [memberCount, setMemberCount] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Simulate fetching member count (replace with actual API call)
        const targetCount = 8000; // This should come from your API
        setIsVisible(true);
        
        // Animate counter
        const duration = 4000; // 4 seconds
        const intervalMs = 30;
        const steps = Math.max(1, Math.floor(duration / intervalMs));
        let currentStep = 0;

        const timer = setInterval(() => {
            currentStep++;
            const progress = Math.min(1, currentStep / steps);
            const eased = 1 - Math.pow(1 - progress, 3);
            const value = Math.round(0 + (targetCount - 0) * eased);
            
            setMemberCount(value);
            
            if (currentStep >= steps) {
                clearInterval(timer);
                setMemberCount(targetCount);
            }
        }, intervalMs);

        return () => clearInterval(timer);
    }, []);

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#051323' }}>
            {/* Hero Section */}
            <section className="relative overflow-hidden">
                <div className="container mx-auto px-4 py-16 md:py-24">
                    {/* Animated Background */}
                    <div className="absolute inset-0 opacity-20">
                        <div className="absolute top-20 right-10 w-64 h-64 rounded-full blur-3xl" 
                             style={{ backgroundColor: '#00FF91' }}></div>
                        <div className="absolute bottom-20 left-10 w-96 h-96 rounded-full blur-3xl" 
                             style={{ backgroundColor: '#02DBFF' }}></div>
                    </div>

                    {/* Hero Content */}
                    <div className="relative z-10 text-center max-w-5xl mx-auto">
                        <h1 className="text-5xl md:text-7xl font-bold mb-8 tracking-tight"
                            style={{ 
                                color: '#00FF91',
                                fontFamily: 'monospace',
                                letterSpacing: '0.05em'
                            }}>
                            Beyond the clouds 🚀
                        </h1>
                        
                        <div className="my-12">
                            <img 
                                src="https://static.wixstatic.com/media/0c204d_614c9617b93145e5a73a6b447aa10950~mv2.gif" 
                                alt="Astronaut animation"
                                className="mx-auto max-w-md w-full"
                            />
                        </div>

                        <p className="text-xl md:text-2xl mb-8 leading-relaxed" style={{ color: '#FFFFFF' }}>
                            Uniting <span style={{ color: '#00FF91' }}>Hispanic, Latinx,</span> and{' '}
                            <span style={{ color: '#02DBFF' }}>allied</span> professionals with aspiring innovators in an inclusive community to thrive in tech.
                        </p>

                        <Button 
                            size="lg"
                            className="text-lg px-8 py-6 rounded-full font-semibold transition-all hover:scale-105"
                            style={{ 
                                backgroundColor: '#00FF91',
                                color: '#051323'
                            }}
                        >
                            Learn more
                        </Button>
                    </div>
                </div>
            </section>

            {/* Community Categories */}
            <section className="py-12" style={{ backgroundColor: '#0a1f35' }}>
                <div className="container mx-auto px-4">
                    <h2 className="text-center text-3xl md:text-4xl font-bold mb-12" 
                        style={{ color: '#FFFFFF' }}>
                        Uniting and helping each other
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        <div className="text-center p-6 rounded-lg transition-transform hover:scale-105" 
                             style={{ backgroundColor: 'rgba(0, 255, 145, 0.1)', border: '2px solid #00FF91' }}>
                            <img 
                                src="https://static.wixstatic.com/media/0c204d_791834f5f35d4e6cb30fca9f44c966ab~mv2.jpg/v1/crop/x_891,y_0,w_4581,h_3648/fill/w_123,h_98,al_c,q_80,usm_0.66_1.00_0.01,blur_2,enc_avif,quality_auto/6P1A6005_JPG.jpg"
                                alt="Aspiring Tech Pros"
                                className="w-32 h-32 object-cover rounded-full mx-auto mb-4"
                            />
                            <h3 className="text-xl font-bold" style={{ color: '#00FF91' }}>
                                ASPIRING TECH PROS
                            </h3>
                        </div>

                        <div className="text-center p-6 rounded-lg transition-transform hover:scale-105" 
                             style={{ backgroundColor: 'rgba(2, 219, 255, 0.1)', border: '2px solid #02DBFF' }}>
                            <img 
                                src="https://static.wixstatic.com/media/0c204d_d5bbdfa900e9471b8bbc74e76624c1de~mv2.jpeg/v1/crop/x_380,y_511,w_1251,h_996/fill/w_138,h_110,al_c,q_80,usm_0.66_1.00_0.01,blur_2,enc_avif,quality_auto/IMG_3960_JPEG.jpeg"
                                alt="Tech Pros"
                                className="w-32 h-32 object-cover rounded-full mx-auto mb-4"
                            />
                            <h3 className="text-xl font-bold" style={{ color: '#02DBFF' }}>
                                TECH PROS
                            </h3>
                        </div>

                        <div className="text-center p-6 rounded-lg transition-transform hover:scale-105" 
                             style={{ backgroundColor: 'rgba(252, 254, 32, 0.1)', border: '2px solid #FCFE20' }}>
                            <img 
                                src="https://static.wixstatic.com/media/0c204d_8b064006d81e45fdb2db171ef3645e84~mv2.jpg/v1/fill/w_147,h_98,al_c,q_80,usm_0.66_1.00_0.01,blur_2,enc_avif,quality_auto/6P1A5468_JPG.jpg"
                                alt="Allies"
                                className="w-32 h-32 object-cover rounded-full mx-auto mb-4"
                            />
                            <h3 className="text-xl font-bold" style={{ color: '#FCFE20' }}>
                                ALLIES
                            </h3>
                        </div>
                    </div>
                </div>
            </section>

            {/* Welcome Section */}
            <section className="py-16" style={{ backgroundColor: '#051323' }}>
                <div className="container mx-auto px-4 max-w-4xl text-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: '#00FF91' }}>
                        welcome_
                    </h2>
                    <p className="text-lg md:text-xl leading-relaxed" style={{ color: '#8394A7' }}>
                        SOMOS.tech is a 100% volunteer‑run 501(c)(3) nonprofit creating an inclusive space for Hispanic and Latinx technologists with our allies by offering free workshops, mentorship, networking and AI‑powered career tools
                    </p>
                </div>
            </section>

            {/* Community Stats */}
            <section className="py-16" style={{ backgroundColor: '#0a1f35' }}>
                <div className="container mx-auto px-4">
                    <h2 className="text-center text-3xl md:text-4xl font-bold mb-12" 
                        style={{ color: '#FFFFFF' }}>
                        Join your community of:
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
                        <div className="text-center p-6 rounded-lg" 
                             style={{ backgroundColor: 'rgba(0, 255, 145, 0.1)' }}>
                            <div className="text-5xl font-bold mb-2" style={{ color: '#00FF91' }}>
                                {memberCount.toLocaleString()}
                            </div>
                            <div className="text-sm uppercase tracking-wider" style={{ color: '#8394A7' }}>
                                MEMBERS
                            </div>
                            <Button 
                                size="sm"
                                className="mt-4 rounded-full"
                                style={{ 
                                    backgroundColor: '#00FF91',
                                    color: '#051323'
                                }}
                            >
                                Join
                            </Button>
                        </div>

                        <div className="text-center p-6 rounded-lg" 
                             style={{ backgroundColor: 'rgba(2, 219, 255, 0.1)' }}>
                            <div className="text-5xl font-bold mb-2" style={{ color: '#02DBFF' }}>
                                26
                            </div>
                            <div className="text-sm uppercase tracking-wider" style={{ color: '#8394A7' }}>
                                GROUPS
                            </div>
                            <Button 
                                size="sm"
                                className="mt-4 rounded-full"
                                style={{ 
                                    backgroundColor: '#02DBFF',
                                    color: '#051323'
                                }}
                            >
                                Connect
                            </Button>
                        </div>

                        <div className="text-center p-6 rounded-lg" 
                             style={{ backgroundColor: 'rgba(252, 254, 32, 0.1)' }}>
                            <div className="text-5xl font-bold mb-2" style={{ color: '#FCFE20' }}>
                                6
                            </div>
                            <div className="text-sm uppercase tracking-wider" style={{ color: '#8394A7' }}>
                                CHAPTERS
                            </div>
                            <Button 
                                size="sm"
                                className="mt-4 rounded-full"
                                style={{ 
                                    backgroundColor: '#FCFE20',
                                    color: '#051323'
                                }}
                            >
                                Grow
                            </Button>
                        </div>

                        <div className="text-center p-6 rounded-lg" 
                             style={{ backgroundColor: 'rgba(131, 148, 167, 0.1)' }}>
                            <div className="text-5xl font-bold mb-2" style={{ color: '#8394A7' }}>
                                0
                            </div>
                            <div className="text-sm uppercase tracking-wider" style={{ color: '#8394A7' }}>
                                EMPLOYEES
                            </div>
                            <Button 
                                size="sm"
                                className="mt-4 rounded-full"
                                style={{ 
                                    backgroundColor: '#8394A7',
                                    color: '#051323'
                                }}
                            >
                                Support
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Power of Community */}
            <section className="py-16" style={{ backgroundColor: '#051323' }}>
                <div className="container mx-auto px-4 max-w-4xl text-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: '#00FF91' }}>
                        powerOfCommunity_
                    </h2>
                    <p className="text-lg md:text-xl leading-relaxed mb-8" style={{ color: '#8394A7' }}>
                        We believe in the power of community to bring tech pros and aspiring innovators together, building professional networks, sharing knowledge, and inspiring the next generation of tech leaders.
                    </p>
                </div>
            </section>

            {/* Programs Section */}
            <section className="py-16" style={{ backgroundColor: '#0a1f35' }}>
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        {/* AI Powered Programs */}
                        <div className="rounded-lg overflow-hidden transition-transform hover:scale-105" 
                             style={{ backgroundColor: '#051323', border: '1px solid #00FF91' }}>
                            <img 
                                src="https://static.wixstatic.com/media/0c204d_c1aca7116ed34c7bad8462baf5bdde0e~mv2.webp"
                                alt="AI Programs"
                                className="w-full h-48 object-cover"
                            />
                            <div className="p-6">
                                <h3 className="text-xl font-bold mb-3" style={{ color: '#00FF91' }}>
                                    Personalized guidance
                                </h3>
                                <p className="text-sm mb-4" style={{ color: '#8394A7' }}>
                                    From resume reviews to career roadmaps, our AI-powered tools adapt to your needs and help you take the next step in tech with confidence.
                                </p>
                                <Button 
                                    size="sm"
                                    className="rounded-full w-full"
                                    style={{ 
                                        backgroundColor: '#00FF91',
                                        color: '#051323'
                                    }}
                                >
                                    Start Now
                                </Button>
                            </div>
                        </div>

                        {/* Mentorship */}
                        <div className="rounded-lg overflow-hidden transition-transform hover:scale-105" 
                             style={{ backgroundColor: '#051323', border: '1px solid #02DBFF' }}>
                            <img 
                                src="https://static.wixstatic.com/media/0c204d_c30e645c29c5404eb9d968fefbdaf528~mv2.jpg"
                                alt="Mentorship"
                                className="w-full h-48 object-cover"
                            />
                            <div className="p-6">
                                <h3 className="text-xl font-bold mb-3" style={{ color: '#02DBFF' }}>
                                    Learn from those who've been there
                                </h3>
                                <p className="text-sm mb-4" style={{ color: '#8394A7' }}>
                                    Get matched with experienced tech professionals who share their insights, guidance, and encouragement as you grow in your career.
                                </p>
                                <Button 
                                    size="sm"
                                    className="rounded-full w-full"
                                    style={{ 
                                        backgroundColor: '#02DBFF',
                                        color: '#051323'
                                    }}
                                >
                                    Join
                                </Button>
                            </div>
                        </div>

                        {/* Meet Your Community */}
                        <div className="rounded-lg overflow-hidden transition-transform hover:scale-105" 
                             style={{ backgroundColor: '#051323', border: '1px solid #FCFE20' }}>
                            <img 
                                src="https://static.wixstatic.com/media/0c204d_d5bbdfa900e9471b8bbc74e76624c1de~mv2.jpeg"
                                alt="Meet Community"
                                className="w-full h-48 object-cover"
                            />
                            <div className="p-6">
                                <h3 className="text-xl font-bold mb-3" style={{ color: '#FCFE20' }}>
                                    Listen to the stories of tech pros
                                </h3>
                                <p className="text-sm mb-4" style={{ color: '#8394A7' }}>
                                    Connect with fellow aspiring and established tech professionals through live sessions, networking events, and local chapters.
                                </p>
                                <Button 
                                    size="sm"
                                    className="rounded-full w-full"
                                    style={{ 
                                        backgroundColor: '#FCFE20',
                                        color: '#051323'
                                    }}
                                >
                                    Connect
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer CTA */}
            <section className="py-16" style={{ backgroundColor: '#051323' }}>
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: '#FFFFFF' }}>
                        Build your community
                    </h2>
                    <p className="text-lg mb-8" style={{ color: '#8394A7' }}>
                        Come connect and grow your community and give back.
                    </p>
                    <Button 
                        size="lg"
                        className="text-lg px-8 py-6 rounded-full font-semibold transition-all hover:scale-105"
                        style={{ 
                            backgroundColor: '#00FF91',
                            color: '#051323'
                        }}
                    >
                        Join your community
                    </Button>
                </div>
            </section>
        </div>
    );
}