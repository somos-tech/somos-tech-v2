import { useEffect } from 'react';

export default function Donate() {
    useEffect(() => {
        // Redirect to Givebutter page
        window.location.href = 'https://givebutter.com/somostech';
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#051323' }}>
            <div className="text-center">
                <p className="text-xl" style={{ color: '#8394A7' }}>Redirecting to donation page...</p>
                <p className="text-sm mt-4" style={{ color: '#8394A7' }}>
                    If you are not redirected, <a href="https://givebutter.com/somostech" target="_blank" rel="noopener noreferrer" style={{ color: '#00FF91', textDecoration: 'underline' }}>click here</a>.
                </p>
            </div>
        </div>
    );
}

