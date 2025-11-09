import { Heart, DollarSign, Users, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function Donate() {
    return (
        <div className="min-h-screen" style={{ backgroundColor: '#051323' }}>
            {/* Hero Section */}
            <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#00FF91]/10 to-transparent" />
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative">
                    <div className="text-center">
                        <div className="flex justify-center mb-6">
                            <Heart className="h-16 w-16" style={{ color: '#00FF91' }} />
                        </div>
                        <h1 className="text-4xl md:text-6xl font-bold mb-6" style={{ color: '#FFFFFF' }}>
                            Support SOMOS.tech
                        </h1>
                        <p className="text-xl md:text-2xl max-w-3xl mx-auto" style={{ color: '#8394A7' }}>
                            Help us empower the Latino tech community through education, networking, and innovation
                        </p>
                    </div>
                </div>
            </div>

            {/* Impact Section */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="grid md:grid-cols-3 gap-8 mb-16">
                    <Card className="p-6 text-center" style={{ backgroundColor: '#0A1929', borderColor: '#1E3A5F' }}>
                        <div className="flex justify-center mb-4">
                            <Users className="h-12 w-12" style={{ color: '#00FF91' }} />
                        </div>
                        <h3 className="text-xl font-semibold mb-2" style={{ color: '#FFFFFF' }}>
                            Community Building
                        </h3>
                        <p style={{ color: '#8394A7' }}>
                            Connect Latino tech professionals and create opportunities for collaboration
                        </p>
                    </Card>

                    <Card className="p-6 text-center" style={{ backgroundColor: '#0A1929', borderColor: '#1E3A5F' }}>
                        <div className="flex justify-center mb-4">
                            <Sparkles className="h-12 w-12" style={{ color: '#00FF91' }} />
                        </div>
                        <h3 className="text-xl font-semibold mb-2" style={{ color: '#FFFFFF' }}>
                            Events & Workshops
                        </h3>
                        <p style={{ color: '#8394A7' }}>
                            Host educational events, hackathons, and networking opportunities
                        </p>
                    </Card>

                    <Card className="p-6 text-center" style={{ backgroundColor: '#0A1929', borderColor: '#1E3A5F' }}>
                        <div className="flex justify-center mb-4">
                            <DollarSign className="h-12 w-12" style={{ color: '#00FF91' }} />
                        </div>
                        <h3 className="text-xl font-semibold mb-2" style={{ color: '#FFFFFF' }}>
                            Resource Development
                        </h3>
                        <p style={{ color: '#8394A7' }}>
                            Create educational content, tools, and resources for the community
                        </p>
                    </Card>
                </div>

                {/* Donation Widget */}
                <div className="max-w-2xl mx-auto">
                    <Card className="p-8" style={{ backgroundColor: '#0A1929', borderColor: '#1E3A5F' }}>
                        <h2 className="text-2xl font-bold text-center mb-6" style={{ color: '#FFFFFF' }}>
                            Make a Donation
                        </h2>
                        <p className="text-center mb-8" style={{ color: '#8394A7' }}>
                            Your contribution helps us continue our mission to support and grow the Latino tech community.
                            Every donation makes a difference!
                        </p>
                        
                        {/* Givebutter Widget */}
                        <div className="bg-[#0F2744] rounded-lg p-8 text-center" style={{ borderColor: '#1E3A5F', border: '1px solid' }}>
                            <givebutter-widget id="g8zA2j"></givebutter-widget>
                            
                            {/* Fallback if widget doesn't load */}
                            <noscript>
                                <a 
                                    href="https://givebutter.com/somos-tech" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-block px-8 py-4 rounded-lg font-semibold text-lg"
                                    style={{ backgroundColor: '#00FF91', color: '#051323' }}
                                >
                                    Donate Now
                                </a>
                            </noscript>
                        </div>
                        
                        <p className="text-sm text-center mt-6" style={{ color: '#8394A7' }}>
                            SOMOS.tech is a registered 501(c)(3) nonprofit organization.
                            <br />
                            Your donation may be tax-deductible.
                        </p>
                    </Card>
                </div>

                {/* Additional Info */}
                <div className="max-w-2xl mx-auto mt-12 text-center">
                    <h3 className="text-xl font-semibold mb-4" style={{ color: '#FFFFFF' }}>
                        Other Ways to Support
                    </h3>
                    <p className="mb-6" style={{ color: '#8394A7' }}>
                        Besides monetary donations, you can support SOMOS.tech by:
                    </p>
                    <div className="grid md:grid-cols-2 gap-4 text-left">
                        <div className="p-4 rounded-lg" style={{ backgroundColor: '#0F2744' }}>
                            <h4 className="font-semibold mb-2" style={{ color: '#00FF91' }}>Volunteer</h4>
                            <p className="text-sm" style={{ color: '#8394A7' }}>
                                Share your expertise and mentor community members
                            </p>
                        </div>
                        <div className="p-4 rounded-lg" style={{ backgroundColor: '#0F2744' }}>
                            <h4 className="font-semibold mb-2" style={{ color: '#00FF91' }}>Spread the Word</h4>
                            <p className="text-sm" style={{ color: '#8394A7' }}>
                                Tell others about our mission and invite them to join
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
