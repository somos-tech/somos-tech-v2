import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft } from 'lucide-react';

// Official SOMOS.tech logo URL
const SOMOS_LOGO_URL = 'https://stsomostechdev64qb73pzvg.blob.core.windows.net/site-branding/shortcircle.png';

/**
 * Astronaut-themed Error Page
 * 
 * Displays a friendly error message with an astronaut floating in space.
 * Supports optional error details via query params:
 * - ?code=500 - Error code
 * - ?message=Something went wrong - Custom message
 * - ?from=/previous/path - Where the user came from
 */
export default function ErrorPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    
    const errorCode = searchParams.get('code') || '404';
    const errorMessage = searchParams.get('message') || 'Houston, we have a problem!';
    const fromPath = searchParams.get('from');

    // Star field animation - generate random stars
    const stars = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        size: Math.random() * 3 + 1,
        animationDelay: `${Math.random() * 3}s`,
        animationDuration: `${Math.random() * 2 + 2}s`,
    }));

    return (
        <div 
            className="min-h-screen flex items-center justify-center overflow-hidden relative"
            style={{ backgroundColor: '#051323' }}
        >
            {/* Animated star field */}
            <div className="absolute inset-0 overflow-hidden">
                {stars.map((star) => (
                    <div
                        key={star.id}
                        className="absolute rounded-full animate-pulse"
                        style={{
                            left: star.left,
                            top: star.top,
                            width: `${star.size}px`,
                            height: `${star.size}px`,
                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                            animationDelay: star.animationDelay,
                            animationDuration: star.animationDuration,
                        }}
                    />
                ))}
            </div>

            {/* Floating planet decoration */}
            <div 
                className="absolute w-32 h-32 rounded-full opacity-20 animate-pulse"
                style={{
                    background: 'radial-gradient(circle at 30% 30%, #00FF91, #0a1f35)',
                    top: '10%',
                    right: '15%',
                    animationDuration: '4s',
                }}
            />
            <div 
                className="absolute w-20 h-20 rounded-full opacity-15"
                style={{
                    background: 'radial-gradient(circle at 30% 30%, #8394A7, #051323)',
                    bottom: '20%',
                    left: '10%',
                }}
            />

            {/* Main content */}
            <div className="relative z-10 text-center max-w-2xl mx-auto px-4">
                {/* Astronaut SVG */}
                <div className="relative mb-8 animate-bounce" style={{ animationDuration: '3s' }}>
                    <svg
                        viewBox="0 0 200 240"
                        className="w-48 h-56 mx-auto"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        {/* Helmet */}
                        <ellipse cx="100" cy="80" rx="45" ry="50" fill="#E8E8E8" stroke="#CCCCCC" strokeWidth="3"/>
                        <ellipse cx="100" cy="80" rx="35" ry="40" fill="#0a1f35"/>
                        {/* Visor reflection */}
                        <ellipse cx="90" cy="70" rx="15" ry="20" fill="rgba(0, 255, 145, 0.3)"/>
                        
                        {/* Body */}
                        <rect x="60" y="125" width="80" height="50" rx="10" fill="#E8E8E8" stroke="#CCCCCC" strokeWidth="2"/>
                        
                        {/* Backpack */}
                        <rect x="45" y="130" width="20" height="40" rx="5" fill="#8394A7"/>
                        <rect x="135" y="130" width="20" height="40" rx="5" fill="#8394A7"/>
                        
                        {/* Arms floating */}
                        <ellipse cx="35" cy="140" rx="15" ry="10" fill="#E8E8E8" transform="rotate(-20 35 140)"/>
                        <ellipse cx="165" cy="145" rx="15" ry="10" fill="#E8E8E8" transform="rotate(25 165 145)"/>
                        
                        {/* Gloves */}
                        <circle cx="20" cy="135" r="8" fill="#E8E8E8"/>
                        <circle cx="180" cy="150" r="8" fill="#E8E8E8"/>
                        
                        {/* Legs */}
                        <ellipse cx="80" cy="185" rx="12" ry="15" fill="#E8E8E8"/>
                        <ellipse cx="120" cy="190" rx="12" ry="15" fill="#E8E8E8"/>
                        
                        {/* Boots */}
                        <ellipse cx="80" cy="198" rx="10" ry="6" fill="#444444"/>
                        <ellipse cx="120" cy="203" rx="10" ry="6" fill="#444444"/>
                        
                        {/* SOMOS logo on chest - using official logo */}
                        <defs>
                            <clipPath id="chestClip">
                                <circle cx="100" cy="148" r="18"/>
                            </clipPath>
                        </defs>
                        <image 
                            href={SOMOS_LOGO_URL}
                            x="82" 
                            y="130" 
                            width="36" 
                            height="36" 
                            clipPath="url(#chestClip)"
                        />
                        
                        {/* Floating cable */}
                        <path
                            d="M 45 150 Q 30 180 50 200 Q 70 220 40 230"
                            stroke="#8394A7"
                            strokeWidth="3"
                            fill="none"
                            strokeLinecap="round"
                        />
                        <circle cx="40" cy="230" r="5" fill="#8394A7"/>
                    </svg>
                    
                    {/* Floating particles around astronaut */}
                    <div 
                        className="absolute w-3 h-3 rounded-full animate-ping"
                        style={{ 
                            backgroundColor: '#00FF91', 
                            top: '20%', 
                            left: '20%',
                            animationDuration: '2s' 
                        }}
                    />
                    <div 
                        className="absolute w-2 h-2 rounded-full animate-ping"
                        style={{ 
                            backgroundColor: '#00FF91', 
                            top: '60%', 
                            right: '25%',
                            animationDuration: '2.5s',
                            animationDelay: '0.5s'
                        }}
                    />
                </div>

                {/* Error code */}
                <div 
                    className="text-8xl font-bold mb-4 animate-pulse"
                    style={{ 
                        color: '#00FF91',
                        textShadow: '0 0 30px rgba(0, 255, 145, 0.5)',
                        animationDuration: '2s'
                    }}
                >
                    {errorCode}
                </div>

                {/* Error message */}
                <h1 className="text-3xl font-bold mb-4" style={{ color: '#FFFFFF' }}>
                    {errorMessage}
                </h1>

                <p className="text-lg mb-2" style={{ color: '#8394A7' }}>
                    Looks like you've drifted into uncharted space.
                </p>
                <p className="text-base mb-8" style={{ color: '#8394A7' }}>
                    Don't worry, our team has been notified and is working on bringing you back to safety.
                </p>

                {/* Mission Control Panel */}
                <div 
                    className="rounded-xl p-6 mb-8 border"
                    style={{ 
                        backgroundColor: 'rgba(10, 31, 53, 0.8)', 
                        borderColor: 'rgba(0, 255, 145, 0.3)',
                        backdropFilter: 'blur(10px)'
                    }}
                >
                    <h2 className="text-sm font-semibold mb-4 uppercase tracking-wider" style={{ color: '#00FF91' }}>
                        🛸 Mission Control Options
                    </h2>
                    
                    <div className="flex flex-wrap gap-4 justify-center">
                        <Button
                            onClick={() => navigate('/')}
                            className="rounded-full px-8 py-3 flex items-center gap-2 transition-all hover:scale-105 text-lg font-semibold"
                            style={{ backgroundColor: '#00FF91', color: '#051323' }}
                        >
                            <Home className="w-5 h-5" />
                            Return to Base
                        </Button>
                        
                        {fromPath && (
                            <Button
                                onClick={() => navigate(fromPath)}
                                variant="outline"
                                className="rounded-full px-6 py-2 flex items-center gap-2 transition-all hover:scale-105"
                                style={{ borderColor: '#00FF91', color: '#00FF91' }}
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Go Back
                            </Button>
                        )}
                    </div>
                </div>

                {/* Fun space facts */}
                <p className="text-xs" style={{ color: '#8394A7' }}>
                    🌟 Fun fact: In space, no one can hear your 404 errors.
                </p>
            </div>

            {/* Shooting star animation */}
            <div 
                className="absolute w-1 h-20 opacity-50"
                style={{
                    background: 'linear-gradient(to bottom, transparent, #00FF91, transparent)',
                    top: '5%',
                    left: '80%',
                    transform: 'rotate(45deg)',
                    animation: 'shootingStar 4s linear infinite',
                }}
            />

            <style>{`
                @keyframes shootingStar {
                    0% {
                        transform: translate(0, 0) rotate(45deg);
                        opacity: 0;
                    }
                    10% {
                        opacity: 0.7;
                    }
                    100% {
                        transform: translate(-300px, 300px) rotate(45deg);
                        opacity: 0;
                    }
                }
            `}</style>
        </div>
    );
}
