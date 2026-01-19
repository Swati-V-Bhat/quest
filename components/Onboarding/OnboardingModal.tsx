'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { IoClose, IoPersonOutline } from 'react-icons/io5';
import { FcGoogle } from 'react-icons/fc';
import { MdFamilyRestroom, MdOutlineAttachMoney } from 'react-icons/md';
import { RiVipCrownLine } from 'react-icons/ri';
import { FaCamera } from 'react-icons/fa';
import { signUpWithEmail, signInWithGoogle, signInWithEmail, sendEmailVerificationCode, verifyEmailCode, getCurrentUserData } from '@/lib/authService';

// Types
interface OnboardingData {
    travelerType: string | null;
    destinationInterests: string[];
    travelBio: string;
}

interface OnboardingModalProps {
    onClose: () => void;
    isSignIn?: boolean;
}

// Avatar options
const AVATAR_OPTIONS = [
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=100&h=100&fit=crop',
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=100&h=100&fit=crop',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=100&h=100&fit=crop',
    'https://images.unsplash.com/photo-1518173946687-a4c036bc6c9e?w=100&h=100&fit=crop',
];

// Traveler type options
const TRAVELER_TYPES = [
    { id: 'solo', label: 'Solo Explorer', icon: IoPersonOutline },
    { id: 'family', label: 'Family Traveler', icon: MdFamilyRestroom },
    { id: 'luxury', label: 'Luxury Seeker', icon: RiVipCrownLine },
    { id: 'budget', label: 'Budget Smart', icon: MdOutlineAttachMoney },
];

// Destination options with Unsplash images
const DESTINATIONS = [
    { id: 'beach', label: 'Beach', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&q=80' },
    { id: 'mountains', label: 'Mountains', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=300&q=80' },
    { id: 'urban', label: 'Urban', image: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=300&q=80' },
    { id: 'cultural', label: 'Cultural', image: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=300&q=80' },
    { id: 'adventure', label: 'Adventure', image: 'https://images.unsplash.com/photo-1533130061792-64b345e4a833?w=300&q=80' },
    { id: 'nature', label: 'Nature', image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=300&q=80' },
];

// Sample bio prompts
const BIO_PROMPTS = [
    'Exploring the world, one destination at a time',
    'Capturing unforgettable moments from every corner of the globe',
    'Experiencing the best of travel while creating the best...',
];

const OnboardingModal: React.FC<OnboardingModalProps> = ({ onClose, isSignIn = false }) => {
    const router = useRouter();

    // Step management
    const [currentStep, setCurrentStep] = useState(1);
    const [isSignInMode, setIsSignInMode] = useState(isSignIn);
    const [showVerification, setShowVerification] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const [verificationSent, setVerificationSent] = useState(false);

    // Step 1: Auth state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);

    // Step 2 & 3: Onboarding data
    const [onboardingData, setOnboardingData] = useState<OnboardingData>({
        travelerType: null,
        destinationInterests: [],
        travelBio: '',
    });

    // UI state
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [uploadedAvatar, setUploadedAvatar] = useState<string | null>(null);

    // Handle Google sign-in
    const handleGoogleSignIn = async () => {
        try {
            setError('');
            setIsLoading(true);
            const user = await signInWithGoogle();
            if (user) {
                // Check if user has already completed onboarding
                const userData = await getCurrentUserData() as any;
                if (userData?.onboardingCompleted) {
                    onClose();
                    router.push('/feed');
                } else {
                    setCurrentStep(2);
                }
            }
        } catch (err: any) {
            setError(err.message || 'Google sign-in failed');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle email sign-up/sign-in
    const handleEmailAuth = async () => {
        if (!email || !password) {
            setError('Please fill all fields');
            return;
        }

        if (!isSignInMode && !displayName) {
            setError('Please enter your name');
            return;
        }

        try {
            setError('');
            setIsLoading(true);

            if (isSignInMode) {
                await signInWithEmail(email, password);
                onClose();
                router.push('/feed');
            } else {
                // Send verification code before creating account
                await sendEmailVerificationCode(email);
                setVerificationSent(true);
                setShowVerification(true);
            }
        } catch (err: any) {
            setError(err.message || 'Authentication failed');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle verification code submission
    const handleVerifyCode = async () => {
        if (!verificationCode || verificationCode.length !== 6) {
            setError('Please enter the 6-digit code');
            return;
        }

        try {
            setError('');
            setIsLoading(true);

            // Verify the code
            await verifyEmailCode(email, verificationCode);

            // Code verified, now create the account
            const avatar = selectedAvatar || AVATAR_OPTIONS[Math.floor(Math.random() * AVATAR_OPTIONS.length)];
            const user = await signUpWithEmail(email, password, displayName, avatar);
            if (user) {
                setShowVerification(false);
                setCurrentStep(2);
            }
        } catch (err: any) {
            setError(err.message || 'Verification failed');
        } finally {
            setIsLoading(false);
        }
    };

    // Resend verification code
    const handleResendCode = async () => {
        try {
            setError('');
            setIsLoading(true);
            await sendEmailVerificationCode(email);
            setError('');
            setVerificationCode('');
        } catch (err: any) {
            setError(err.message || 'Failed to resend code');
        } finally {
            setIsLoading(false);
        }
    };

    // Toggle destination selection
    const toggleDestination = (destId: string) => {
        setOnboardingData(prev => ({
            ...prev,
            destinationInterests: prev.destinationInterests.includes(destId)
                ? prev.destinationInterests.filter(d => d !== destId)
                : [...prev.destinationInterests, destId]
        }));
    };

    // Handle avatar file upload
    const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setUploadedAvatar(reader.result as string);
                setSelectedAvatar(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    // Complete onboarding
    const completeOnboarding = async (skip = false) => {
        try {
            setIsLoading(true);

            if (!skip) {
                const { updateOnboardingProfile } = await import('@/lib/authService');
                await updateOnboardingProfile(onboardingData);
            }

            onClose();
            router.push('/feed');
        } catch (err: any) {
            setError(err.message || 'Failed to save profile');
        } finally {
            setIsLoading(false);
        }
    };

    // Render step indicator
    const renderStepIndicator = () => (
        <div className="flex items-center justify-center gap-2 mb-4">
            {[1, 2, 3].map((step) => (
                <div
                    key={step}
                    className={`flex items-center justify-center w-7 h-7 rounded-full border-2 text-sm font-medium transition-all ${currentStep === step
                        ? 'border-[#EA6100] bg-[#EA6100] text-white'
                        : currentStep > step
                            ? 'border-green-500 bg-green-500 text-white'
                            : 'border-gray-300 text-gray-400'
                        }`}
                >
                    {currentStep > step ? '✓' : step}
                </div>
            ))}
        </div>
    );

    // Render Step 1: Create Account (with Google + Avatar)
    const renderStep1 = () => {
        // Show verification code input if code was sent
        if (showVerification) {
            return (
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-gray-900">Verify Your Email</h2>
                    <p className="text-gray-600 text-sm">
                        We've sent a 6-digit code to <strong>{email}</strong>
                    </p>

                    {/* OTP Input */}
                    <div className="flex justify-center gap-2">
                        <input
                            type="text"
                            maxLength={6}
                            className="w-full h-14 border-2 border-gray-300 rounded-lg px-4 text-center text-2xl font-bold tracking-[0.5em] focus:ring-2 focus:ring-[#EA6100] focus:border-transparent outline-none"
                            placeholder="000000"
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        />
                    </div>

                    {/* Verify Button */}
                    <button
                        onClick={handleVerifyCode}
                        disabled={isLoading || verificationCode.length !== 6}
                        className={`w-full h-11 rounded-lg font-medium transition-all text-sm ${verificationCode.length === 6
                            ? 'bg-[#EA6100] hover:bg-[#d55800] text-white'
                            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            }`}
                    >
                        {isLoading ? 'Verifying...' : 'Verify & Continue'}
                    </button>

                    {/* Resend Code */}
                    <p className="text-center text-sm text-gray-500">
                        Didn't receive the code?{' '}
                        <button
                            onClick={handleResendCode}
                            disabled={isLoading}
                            className="text-[#EA6100] font-medium hover:underline"
                        >
                            Resend Code
                        </button>
                    </p>

                    {/* Back Button */}
                    <button
                        onClick={() => {
                            setShowVerification(false);
                            setVerificationCode('');
                            setError('');
                        }}
                        className="w-full text-gray-500 text-sm hover:text-gray-700"
                    >
                        ← Back to signup
                    </button>
                </div>
            );
        }

        // Show normal signup/signin form
        return (
            <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900">
                    {isSignInMode ? 'Log in to OnQuest' : 'Create Account'}
                </h2>

                {/* Google Button - First option */}
                <button
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-lg h-12 hover:bg-gray-50 transition-colors shadow-sm"
                >
                    {isLoading ? 'Signing in...' : (
                        <>
                            <FcGoogle size={22} />
                            <span className="font-medium text-gray-700">
                                Continue with Google
                            </span>
                        </>
                    )}
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-gray-200"></div>
                    <span className="text-gray-400 text-sm">or</span>
                    <div className="flex-1 h-px bg-gray-200"></div>
                </div>

                {/* Name input (signup only) */}
                {!isSignInMode && (
                    <input
                        type="text"
                        className="w-full h-11 border border-gray-300 rounded-lg px-4 focus:ring-2 focus:ring-[#EA6100] focus:border-transparent outline-none text-sm"
                        placeholder="Full Name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                    />
                )}

                {/* Avatar selector (signup only) */}
                {!isSignInMode && (
                    <div>
                        <p className="text-gray-600 text-sm mb-2">Choose your avatar:</p>
                        <div className="flex gap-2 items-center flex-wrap">
                            {AVATAR_OPTIONS.map((avatar, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => { setSelectedAvatar(avatar); setUploadedAvatar(null); }}
                                    className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-all ${selectedAvatar === avatar && !uploadedAvatar
                                        ? 'border-[#EA6100] ring-2 ring-[#EA6100]'
                                        : 'border-gray-200 hover:border-gray-400'
                                        }`}
                                >
                                    <img src={avatar} alt={`Avatar ${idx + 1}`} className="w-full h-full object-cover" />
                                </button>
                            ))}
                            {/* Custom upload */}
                            <label className="w-10 h-10 rounded-full border-2 border-dashed border-gray-300 hover:border-[#EA6100] flex items-center justify-center cursor-pointer transition-colors">
                                {uploadedAvatar ? (
                                    <img src={uploadedAvatar} alt="Custom" className="w-full h-full object-cover rounded-full" />
                                ) : (
                                    <FaCamera size={14} className="text-gray-400" />
                                )}
                                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                            </label>
                        </div>
                    </div>
                )}

                {/* Email input */}
                <input
                    type="email"
                    className="w-full h-11 border border-gray-300 rounded-lg px-4 focus:ring-2 focus:ring-[#EA6100] focus:border-transparent outline-none text-sm"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />

                {/* Password input */}
                <input
                    type="password"
                    className="w-full h-11 border border-gray-300 rounded-lg px-4 focus:ring-2 focus:ring-[#EA6100] focus:border-transparent outline-none text-sm"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                {/* Submit button */}
                <button
                    onClick={handleEmailAuth}
                    disabled={isLoading || !email || !password || (!isSignInMode && !displayName)}
                    className={`w-full h-11 rounded-lg font-medium transition-all text-sm ${email && password && (isSignInMode || displayName)
                        ? 'bg-[#EA6100] hover:bg-[#d55800] text-white'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        }`}
                >
                    {isLoading ? 'Processing...' : isSignInMode ? 'Sign In' : 'Sign Up'}
                </button>

                {/* Toggle sign in/up */}
                <p className="text-center text-sm">
                    {isSignInMode ? "Don't have an account? " : 'Already have an account? '}
                    <button
                        onClick={() => { setIsSignInMode(!isSignInMode); setError(''); }}
                        className="text-[#EA6100] font-medium hover:underline"
                    >
                        {isSignInMode ? 'Sign Up' : 'Sign In'}
                    </button>
                </p>

                {/* Terms */}
                <p className="text-center text-xs text-gray-500">
                    By proceeding, you agree to our{' '}
                    <span className="text-[#EA6100] cursor-pointer hover:underline">T&C</span> and{' '}
                    <span className="text-[#EA6100] cursor-pointer hover:underline">Privacy policy</span>
                </p>
            </div>
        );
    };

    // Render Step 2: Personalize Experience
    const renderStep2 = () => (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Personalize Your Experience</h2>

            {/* Traveler Type */}
            <div>
                <p className="text-gray-600 text-sm mb-2">What kind of traveler are you?</p>
                <div className="grid grid-cols-2 gap-2">
                    {TRAVELER_TYPES.map((type) => {
                        const Icon = type.icon;
                        const isSelected = onboardingData.travelerType === type.id;
                        return (
                            <button
                                key={type.id}
                                onClick={() => setOnboardingData(prev => ({ ...prev, travelerType: type.id }))}
                                className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${isSelected
                                    ? 'border-[#EA6100] bg-orange-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <Icon size={24} className={isSelected ? 'text-[#EA6100]' : 'text-gray-500'} />
                                <span className={`text-xs mt-1 text-center ${isSelected ? 'text-[#EA6100] font-medium' : 'text-gray-600'}`}>
                                    {type.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Destination Interests */}
            <div>
                <p className="text-gray-600 text-sm mb-2">Which destinations interest you?</p>
                <div className="grid grid-cols-3 gap-2">
                    {DESTINATIONS.map((dest) => {
                        const isSelected = onboardingData.destinationInterests.includes(dest.id);
                        return (
                            <button
                                key={dest.id}
                                onClick={() => toggleDestination(dest.id)}
                                className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${isSelected ? 'border-[#EA6100] ring-1 ring-[#EA6100]' : 'border-transparent'
                                    }`}
                            >
                                <img src={dest.image} alt={dest.label} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 flex items-end justify-center pb-1 bg-gradient-to-t from-black/60 to-transparent">
                                    <span className="text-white text-xs font-medium">{dest.label}</span>
                                </div>
                                {isSelected && (
                                    <div className="absolute top-1 right-1 w-4 h-4 bg-[#EA6100] rounded-full flex items-center justify-center">
                                        <span className="text-white text-xs">✓</span>
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col gap-2 pt-2">
                <button
                    onClick={() => setCurrentStep(3)}
                    className="w-full h-11 bg-[#EA6100] hover:bg-[#d55800] text-white rounded-lg font-medium transition-colors text-sm"
                >
                    Continue
                </button>
                <button
                    onClick={() => setCurrentStep(3)}
                    className="w-full text-gray-500 text-sm hover:text-gray-700"
                >
                    Skip for now
                </button>
            </div>
        </div>
    );

    // Render Step 3: Complete Profile
    const renderStep3 = () => (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Complete Your Profile</h2>

            {/* Avatar Upload */}
            <div className="flex justify-center">
                <label className="relative cursor-pointer group">
                    <div className="w-20 h-20 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden group-hover:border-[#EA6100] transition-colors">
                        {uploadedAvatar || selectedAvatar ? (
                            <img src={uploadedAvatar || selectedAvatar || ''} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <FaCamera size={24} className="text-gray-400 group-hover:text-[#EA6100] transition-colors" />
                        )}
                    </div>
                    <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs text-gray-500 whitespace-nowrap">
                        Upload Photo
                    </span>
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                </label>
            </div>

            {/* Travel Bio */}
            <div className="mt-6">
                <p className="text-gray-600 text-sm mb-2">Your Travel Bio</p>
                <textarea
                    className="w-full h-20 border border-gray-300 rounded-lg p-3 resize-none focus:ring-2 focus:ring-[#EA6100] focus:border-transparent outline-none text-sm"
                    placeholder="Tell us about your travel style..."
                    value={onboardingData.travelBio}
                    onChange={(e) => setOnboardingData(prev => ({ ...prev, travelBio: e.target.value }))}
                />
            </div>

            {/* Bio Suggestions */}
            <div>
                <p className="text-gray-500 text-xs mb-2">Suggested prompts:</p>
                <div className="space-y-1">
                    {BIO_PROMPTS.map((prompt, idx) => (
                        <button
                            key={idx}
                            onClick={() => setOnboardingData(prev => ({ ...prev, travelBio: prompt }))}
                            className="w-full text-left text-xs text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg px-3 py-2 transition-colors border border-gray-200"
                        >
                            {prompt}
                        </button>
                    ))}
                </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col gap-2 pt-2">
                <button
                    onClick={() => completeOnboarding(false)}
                    disabled={isLoading}
                    className="w-full h-11 bg-[#EA6100] hover:bg-[#d55800] text-white rounded-lg font-medium transition-colors text-sm disabled:bg-gray-400"
                >
                    {isLoading ? 'Saving...' : 'Complete'}
                </button>
                <button
                    onClick={() => completeOnboarding(true)}
                    className="w-full text-gray-500 text-sm hover:text-gray-700"
                >
                    Skip for now
                </button>
            </div>
        </div>
    );

    return (
        <div
            className="fixed inset-0 bg-black/50 flex justify-center items-center z-[100] p-4"
            onClick={onClose}
        >
            <div
                className="flex w-full max-w-2xl h-auto max-h-[90vh] bg-white rounded-xl overflow-hidden shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Left Image Section - Hidden on mobile */}
                <div className="hidden md:block relative w-2/5 min-h-[500px]">
                    <img
                        className="w-full h-full object-cover"
                        src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&q=80"
                        alt="Travel"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
                    <div className="absolute bottom-8 left-4 text-white">
                        <span className="text-3xl italic font-bold">Travel</span>
                        <span className="text-3xl italic"> with us</span>
                    </div>
                </div>

                {/* Right Form Section */}
                <div className="w-full md:w-3/5 p-6 flex flex-col overflow-y-auto">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                        <div className="text-sm text-gray-500">Step {currentStep} of 3</div>
                        <button
                            onClick={onClose}
                            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors -mt-1 -mr-1"
                        >
                            <IoClose size={20} className="text-gray-500" />
                        </button>
                    </div>

                    {renderStepIndicator()}

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {currentStep === 1 && renderStep1()}
                    {currentStep === 2 && renderStep2()}
                    {currentStep === 3 && renderStep3()}
                </div>
            </div>
        </div>
    );
};

export default OnboardingModal;
