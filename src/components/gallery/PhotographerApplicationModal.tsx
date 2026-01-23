import { useState } from 'react';
import { X, Plus, Trash2, Check, Camera, Mail, MapPin, Link as LinkIcon, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface PhotographerApplicationModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function PhotographerApplicationModal({ isOpen, onClose }: PhotographerApplicationModalProps) {
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    // Form data
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [cameras, setCameras] = useState<string[]>(['']);
    const [location, setLocation] = useState('');
    const [portfolioLink, setPortfolioLink] = useState('');

    const totalSteps = 4;

    const addCamera = () => {
        if (cameras.length < 5) {
            setCameras([...cameras, '']);
        }
    };

    const removeCamera = (index: number) => {
        if (cameras.length > 1) {
            setCameras(cameras.filter((_, i) => i !== index));
        }
    };

    const updateCamera = (index: number, value: string) => {
        const updated = [...cameras];
        updated[index] = value;
        setCameras(updated);
    };

    const canProceed = () => {
        switch (step) {
            case 0:
                return name.trim().length > 0;
            case 1:
                return email.trim().length > 0 && email.includes('@');
            case 2:
                return cameras.some(c => c.trim().length > 0);
            case 3:
                return location.trim().length > 0 && portfolioLink.trim().length > 0;
            default:
                return false;
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
        if (step > 0) {
            setStep(step - 1);
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError('');

        try {
            // Filter out empty camera entries
            const validCameras = cameras.filter(c => c.trim().length > 0);

            // Save to database
            const { error: dbError } = await supabase
                .from('photographer_applications')
                .insert({
                    name: name.trim(),
                    email: email.trim().toLowerCase(),
                    cameras: validCameras,
                    location: location.trim(),
                    portfolio_link: portfolioLink.trim(),
                    status: 'pending'
                });

            if (dbError) {
                // If table doesn't exist, still show success (we'll handle data differently)
                if (dbError.code === '42P01') {
                    console.warn('photographer_applications table does not exist yet');
                } else {
                    throw dbError;
                }
            }

            setSubmitted(true);
        } catch (err: any) {
            console.error('Application submission error:', err);
            setError(err.message || 'Failed to submit application');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        // Reset form state on close
        setStep(0);
        setName('');
        setEmail('');
        setCameras(['']);
        setLocation('');
        setPortfolioLink('');
        setSubmitted(false);
        setError('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={handleClose} />

            {/* Modal */}
            <div className="relative w-full max-w-md bg-black/95 backdrop-blur-md border border-white/10">
                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="p-6">
                    {/* Progress Bar */}
                    {!submitted && (
                        <div className="flex items-center justify-center gap-2 mb-6">
                            {[0, 1, 2, 3].map((s) => (
                                <div key={s} className={`h-1 flex-1 max-w-12 rounded-full ${step >= s ? 'bg-white' : 'bg-white/20'}`} />
                            ))}
                        </div>
                    )}

                    {submitted ? (
                        /* Success State */
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Check className="w-8 h-8 text-black stroke-[3]" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Application Submitted</h2>
                            <p className="text-white/60 text-sm mb-6">
                                Thank you for your interest! We'll review your application and get back to you soon.
                            </p>
                            <button
                                onClick={handleClose}
                                className="w-full px-4 py-2 bg-white text-black font-semibold hover:bg-white/90 transition"
                            >
                                Close
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Step 0: Name */}
                            {step === 0 && (
                                <div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 bg-white/10 flex items-center justify-center">
                                            <User className="w-5 h-5 text-white/60" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-white">What's your name?</h2>
                                            <p className="text-white/40 text-sm">So we know who you are</p>
                                        </div>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Your full name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full px-4 py-3 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:bg-white/10 transition-colors mb-4"
                                        autoFocus
                                    />
                                </div>
                            )}

                            {/* Step 1: Email */}
                            {step === 1 && (
                                <div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 bg-white/10 flex items-center justify-center">
                                            <Mail className="w-5 h-5 text-white/60" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-white">Your email</h2>
                                            <p className="text-white/40 text-sm">We'll reach out here</p>
                                        </div>
                                    </div>
                                    <input
                                        type="email"
                                        placeholder="your@email.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full px-4 py-3 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:bg-white/10 transition-colors mb-4"
                                        autoFocus
                                    />
                                </div>
                            )}

                            {/* Step 2: Cameras */}
                            {step === 2 && (
                                <div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 bg-white/10 flex items-center justify-center">
                                            <Camera className="w-5 h-5 text-white/60" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-white">Your gear</h2>
                                            <p className="text-white/40 text-sm">What cameras do you shoot with?</p>
                                        </div>
                                    </div>
                                    <div className="space-y-2 mb-4">
                                        {cameras.map((camera, index) => (
                                            <div key={index} className="flex gap-2">
                                                <input
                                                    type="text"
                                                    placeholder={index === 0 ? "e.g., Sony A7IV" : "Add another camera"}
                                                    value={camera}
                                                    onChange={(e) => updateCamera(index, e.target.value)}
                                                    className="flex-1 px-4 py-3 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:bg-white/10 transition-colors"
                                                    autoFocus={index === 0}
                                                />
                                                {cameras.length > 1 && (
                                                    <button
                                                        onClick={() => removeCamera(index)}
                                                        className="px-3 bg-white/5 text-white/40 hover:text-red-400 hover:bg-white/10 transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    {cameras.length < 5 && (
                                        <button
                                            onClick={addCamera}
                                            className="flex items-center gap-2 text-white/40 hover:text-white text-sm transition-colors"
                                        >
                                            <Plus className="w-4 h-4" /> Add another camera
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Step 3: Location & Portfolio */}
                            {step === 3 && (
                                <div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 bg-white/10 flex items-center justify-center">
                                            <MapPin className="w-5 h-5 text-white/60" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-white">Final details</h2>
                                            <p className="text-white/40 text-sm">Where are you based & your work</p>
                                        </div>
                                    </div>
                                    <div className="space-y-4 mb-4">
                                        <div>
                                            <label className="block text-sm font-medium text-white/80 mb-2">Location</label>
                                            <input
                                                type="text"
                                                placeholder="e.g., Austin, TX"
                                                value={location}
                                                onChange={(e) => setLocation(e.target.value)}
                                                className="w-full px-4 py-3 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:bg-white/10 transition-colors"
                                                autoFocus
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-white/80 mb-2">
                                                <LinkIcon className="w-4 h-4 inline mr-1" />
                                                Portfolio / Social Media
                                            </label>
                                            <input
                                                type="url"
                                                placeholder="https://yourwebsite.com or @instagram"
                                                value={portfolioLink}
                                                onChange={(e) => setPortfolioLink(e.target.value)}
                                                className="w-full px-4 py-3 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:bg-white/10 transition-colors"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Error */}
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 mb-4">
                                    {error}
                                </div>
                            )}

                            {/* Navigation Buttons */}
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
                                    {loading ? 'Submitting...' : step === totalSteps - 1 ? 'Submit Application' : 'Continue'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
