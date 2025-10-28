import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';

export default function Register() {
    const [formData, setFormData] = useState({
        email: '',
        firstName: '',
        lastName: '',
        agreedToTerms: false,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        
        if (!formData.agreedToTerms) {
            setError('Please agree to the terms and conditions');
            return;
        }

        setIsSubmitting(true);

        try {
            // This would call your Azure Function API to register the user
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                throw new Error('Registration failed');
            }

            setSuccess(true);
        } catch (err) {
            setError('Failed to register. Please try again.');
            console.error('Registration error:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#051323' }}>
                <div className="max-w-md w-full mx-auto px-4 text-center">
                    <div className="mb-6">
                        <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center" 
                             style={{ backgroundColor: 'rgba(0, 255, 145, 0.2)' }}>
                            <svg className="w-10 h-10" style={{ color: '#00FF91' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold mb-4" style={{ color: '#FFFFFF' }}>
                        Registration Successful!
                    </h1>
                    <p className="mb-8" style={{ color: '#8394A7' }}>
                        Thank you for joining SOMOS.tech! Please check your email for a verification link to complete your registration.
                    </p>
                    <Button
                        onClick={() => window.location.href = '/'}
                        className="rounded-full px-8"
                        style={{ backgroundColor: '#00FF91', color: '#051323' }}
                    >
                        Go to Home
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center py-12" style={{ backgroundColor: '#051323' }}>
            <div className="max-w-md w-full mx-auto px-4">
                <div className="text-center mb-8">
                    <img 
                        src="https://static.wixstatic.com/media/0c204d_5f310ee2b2a848ceac8e68b25c0c39eb~mv2.png"
                        alt="SOMOS.tech Logo"
                        className="w-24 h-24 mx-auto mb-4 rounded-full"
                        style={{ boxShadow: '0 0 20px rgba(0, 255, 145, 0.5)' }}
                    />
                    <h1 className="text-3xl font-bold mb-2" style={{ color: '#FFFFFF' }}>
                        Become a Member
                    </h1>
                    <p style={{ color: '#8394A7' }}>
                        Join our community of tech professionals
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                            <p className="text-sm" style={{ color: '#fca5a5' }}>{error}</p>
                        </div>
                    )}

                    <div>
                        <Label style={{ color: '#FFFFFF' }}>Email *</Label>
                        <Input
                            type="email"
                            required
                            className="rounded-xl mt-2"
                            style={{ backgroundColor: '#0a1f35', border: '1px solid rgba(0, 255, 145, 0.2)', color: '#FFFFFF' }}
                            placeholder="you@example.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label style={{ color: '#FFFFFF' }}>First Name *</Label>
                            <Input
                                type="text"
                                required
                                className="rounded-xl mt-2"
                                style={{ backgroundColor: '#0a1f35', border: '1px solid rgba(0, 255, 145, 0.2)', color: '#FFFFFF' }}
                                value={formData.firstName}
                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label style={{ color: '#FFFFFF' }}>Last Name *</Label>
                            <Input
                                type="text"
                                required
                                className="rounded-xl mt-2"
                                style={{ backgroundColor: '#0a1f35', border: '1px solid rgba(0, 255, 145, 0.2)', color: '#FFFFFF' }}
                                value={formData.lastName}
                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <Checkbox
                            checked={formData.agreedToTerms}
                            onCheckedChange={(checked) => setFormData({ ...formData, agreedToTerms: checked as boolean })}
                        />
                        <label className="text-sm" style={{ color: '#8394A7' }}>
                            I agree to the{' '}
                            <a href="/terms" style={{ color: '#00FF91', textDecoration: 'underline' }}>
                                Terms of Service
                            </a>{' '}
                            and{' '}
                            <a href="/privacy" style={{ color: '#00FF91', textDecoration: 'underline' }}>
                                Privacy Policy
                            </a>
                        </label>
                    </div>

                    <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full rounded-full py-6 text-lg font-semibold transition-all hover:scale-105"
                        style={{ backgroundColor: '#00FF91', color: '#051323' }}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Registering...
                            </>
                        ) : (
                            'Create Account'
                        )}
                    </Button>

                    <div className="text-center">
                        <p className="text-sm" style={{ color: '#8394A7' }}>
                            Already have an account?{' '}
                            <a href="/login" style={{ color: '#00FF91', textDecoration: 'underline' }}>
                                Sign in
                            </a>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
}
