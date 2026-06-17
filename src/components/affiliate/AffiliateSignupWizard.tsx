import { useState, useEffect } from 'react';
import {
    XMarkIcon,
    CheckIcon,
    UserIcon,
    PhoneIcon,
    TagIcon,
    ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface AffiliateSignupWizardProps {
    isOpen: boolean;
    onSuccess: (code: string) => void;
    onClose?: () => void;
}

export default function AffiliateSignupWizard({ isOpen, onSuccess, onClose }: AffiliateSignupWizardProps) {
    const { user } = useAuth();
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [code, setCode] = useState('');
    const [checking, setChecking] = useState(false);
    const [available, setAvailable] = useState<boolean | null>(null);

    // Enrollment check state
    const [alreadyEnrolled, setAlreadyEnrolled] = useState(false);
    const [enrolledCode, setEnrolledCode] = useState('');
    const [checkingEnrollment, setCheckingEnrollment] = useState(false);

    const totalSteps = 3;

    // Check if user is already enrolled when modal opens
    useEffect(() => {
        if (!isOpen || !user) return;
        setCheckingEnrollment(true);
        supabase
            .from('affiliates')
            .select('id, code')
            .eq('user_id', user.id)
            .maybeSingle()
            .then(({ data }) => {
                if (data) {
                    setAlreadyEnrolled(true);
                    setEnrolledCode(data.code || '');
                }
                setCheckingEnrollment(false);
            });
    }, [isOpen, user]);

    const validateCode = (value: string) => /^[A-Z0-9]{4,12}$/.test(value);

    const handleCodeChange = (value: string) => {
        const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        setCode(cleaned);
        setAvailable(null);
    };

    // Auto-check code availability after user stops typing
    useEffect(() => {
        if (!validateCode(code)) return;
        const timer = setTimeout(() => {
            checkAvailability();
        }, 600);
        return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [code]);

    const checkAvailability = async () => {
        if (!validateCode(code)) return;
        setChecking(true);
        setError('');
        try {
            const response = await fetch(`/api/affiliates/check-code?code=${code}`);
            const data = await response.json();
            setAvailable(data.available);
        } catch {
            setError('Failed to check code availability');
        } finally {
            setChecking(false);
        }
    };

    const canProceed = () => {
        switch (step) {
            case 0: return firstName.trim().length > 0 && lastName.trim().length > 0;
            case 1: return phone.trim().length >= 7;
            case 2: return validateCode(code) && available === true;
            default: return false;
        }
    };

    const handleNext = () => {
        if (step < totalSteps - 1) {
            setStep(step + 1);
        } else {
            handleSubmit();
        }
    };

    const handleBack = () => {
        if (step > 0) setStep(step - 1);
    };

    const handleSubmit = async () => {
        if (!user) return;
        setLoading(true);
        setError('');
        try {
            const response = await fetch('/api/affiliates/setup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user.id,
                    code,
                    first_name: firstName.trim(),
                    last_name: lastName.trim(),
                    phone_number: phone.trim(),
                }),
            });
            const data = await response.json();
            if (data.error) {
                setError(data.error);
                return;
            }
            setSubmitted(true);
            onSuccess(code);
            // Start Stripe Connect onboarding — redirects away if successful
            await startStripeOnboarding(user.id);
        } catch (err: any) {
            setError(err.message || 'Failed to create affiliate account');
        } finally {
            setLoading(false);
        }
    };

    const startStripeOnboarding = async (userId: string) => {
        try {
            const response = await fetch('/api/affiliates/connect-onboarding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    returnPath: '/dashboard?stripe=connected',
                    refreshPath: '/dashboard?stripe=refresh',
                }),
            });
            const data = await response.json();
            if (data.onboarding_url) {
                window.location.href = data.onboarding_url;
            }
        } catch (err) {
            console.error('Stripe onboarding error:', err);
        }
    };

    const handleClose = () => {
        setStep(0);
        setFirstName('');
        setLastName('');
        setPhone('');
        setCode('');
        setAvailable(null);
        setSubmitted(false);
        setError('');
        setAlreadyEnrolled(false);
        setEnrolledCode('');
        setCheckingEnrollment(false);
        onClose?.();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />
            <div className="relative w-full max-w-md bg-black/50 border border-white/10 rounded-none backdrop-blur-md">
                {onClose && !submitted && (
                    <button
                        onClick={handleClose}
                        className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors z-10"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                )}

                <div className="p-6">
                    {/* Checking enrollment state */}
                    {checkingEnrollment && (
                        <div className="text-center py-8">
                            <p className="text-white/60 text-sm">Checking enrollment status...</p>
                        </div>
                    )}

                    {/* Already enrolled state */}
                    {!checkingEnrollment && alreadyEnrolled && (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckIcon className="w-8 h-8 text-white stroke-[2]" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Already Enrolled</h2>
                            <p className="text-white/60 text-sm mb-2">
                                You're already an affiliate with code{' '}
                                <span className="text-white font-mono font-bold">{enrolledCode}</span>.
                            </p>
                            <p className="text-white/40 text-xs mb-6">
                                Manage your account from the Affiliate section of your dashboard.
                            </p>
                            {onClose && (
                                <button
                                    onClick={handleClose}
                                    className="px-6 py-2 bg-white text-black font-semibold hover:bg-white/90 transition"
                                >
                                    Go to Dashboard
                                </button>
                            )}
                        </div>
                    )}

                    {/* Normal wizard flow */}
                    {!checkingEnrollment && !alreadyEnrolled && (
                        <>
                            {!submitted && (
                                <div className="flex items-center gap-2 mb-6 pr-8">
                                    {[0, 1, 2].map((s) => (
                                        <div
                                            key={s}
                                            className={`h-1 flex-1 rounded-full ${step >= s ? 'bg-white' : 'bg-white/20'}`}
                                        />
                                    ))}
                                </div>
                            )}

                            {submitted ? (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <CheckIcon className="w-8 h-8 text-black stroke-[3]" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-white mb-2">You're In!</h2>
                                    <p className="text-white/60 text-sm">
                                        Affiliate code{' '}
                                        <span className="text-white font-mono font-bold">{code}</span>{' '}
                                        created. Redirecting to Stripe to connect your payout method...
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {/* Step 0: Name */}
                                    {step === 0 && (
                                        <div>
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-10 h-10 bg-white/10 flex items-center justify-center">
                                                    <UserIcon className="w-5 h-5 text-white/60" />
                                                </div>
                                                <div>
                                                    <h2 className="text-xl font-bold text-white">What's your name?</h2>
                                                    <p className="text-white/40 text-sm">Let's get to know you</p>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <input
                                                    type="text"
                                                    placeholder="First name"
                                                    value={firstName}
                                                    onChange={(e) => setFirstName(e.target.value)}
                                                    className="w-full px-4 py-3 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:bg-white/10 transition-colors"
                                                    autoFocus
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Last name"
                                                    value={lastName}
                                                    onChange={(e) => setLastName(e.target.value)}
                                                    className="w-full px-4 py-3 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:bg-white/10 transition-colors"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Step 1: Phone */}
                                    {step === 1 && (
                                        <div>
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-10 h-10 bg-white/10 flex items-center justify-center">
                                                    <PhoneIcon className="w-5 h-5 text-white/60" />
                                                </div>
                                                <div>
                                                    <h2 className="text-xl font-bold text-white">Your phone number</h2>
                                                    <p className="text-white/40 text-sm">For account verification</p>
                                                </div>
                                            </div>
                                            <input
                                                type="tel"
                                                placeholder="+1 (555) 000-0000"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                className="w-full px-4 py-3 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:bg-white/10 transition-colors"
                                                autoFocus
                                            />
                                        </div>
                                    )}

                                    {/* Step 2: Affiliate Code */}
                                    {step === 2 && (
                                        <div>
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-10 h-10 bg-white/10 flex items-center justify-center">
                                                    <TagIcon className="w-5 h-5 text-white/60" />
                                                </div>
                                                <div>
                                                    <h2 className="text-xl font-bold text-white">Choose your code</h2>
                                                    <p className="text-white/40 text-sm">4-12 characters, letters & numbers</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 mb-2">
                                                <div className="relative flex-1">
                                                    <input
                                                        type="text"
                                                        placeholder="YOURCODE"
                                                        value={code}
                                                        onChange={(e) => handleCodeChange(e.target.value)}
                                                        maxLength={12}
                                                        className="w-full px-4 py-3 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:bg-white/10 font-mono uppercase transition-colors"
                                                        autoFocus
                                                    />
                                                    {available === true && (
                                                        <CheckIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-400" />
                                                    )}
                                                    {available === false && (
                                                        <ExclamationCircleIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400" />
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={checkAvailability}
                                                    disabled={!validateCode(code) || checking}
                                                    className="px-4 py-3 bg-white/10 text-white text-sm hover:bg-white/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {checking ? '...' : 'Check'}
                                                </button>
                                            </div>
                                            {available === false && (
                                                <p className="text-red-400 text-xs mb-2">That code is taken. Try another.</p>
                                            )}
                                            {available === true && (
                                                <p className="text-green-400 text-xs mb-2">Code is available!</p>
                                            )}
                                            <p className="text-white/30 text-xs">This cannot be changed after creation.</p>
                                        </div>
                                    )}

                                    {error && (
                                        <div className="bg-red-500/10 text-red-400 text-sm p-3 mt-4">
                                            {error}
                                        </div>
                                    )}

                                    <div className="flex gap-3 mt-6">
                                        {step > 0 && (
                                            <button
                                                onClick={handleBack}
                                                className="px-4 py-2 bg-white/5 text-white font-medium hover:bg-white/10 transition-colors"
                                            >
                                                Back
                                            </button>
                                        )}
                                        <button
                                            onClick={handleNext}
                                            disabled={!canProceed() || loading}
                                            className="flex-1 px-4 py-2 bg-white text-black font-semibold hover:bg-white/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {loading
                                                ? 'Creating...'
                                                : step === totalSteps - 1
                                                ? 'Create Account'
                                                : 'Continue'}
                                        </button>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
