'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import OnboardingModal from '@/components/Onboarding/OnboardingModal';

const LandingNavbar = () => {
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [showAuthModal, setShowAuthModal] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
        });
        return () => unsubscribe();
    }, []);

    const handleGetStarted = () => {
        if (currentUser) {
            router.push('/feed');
        } else {
            setShowAuthModal(true);
        }
    };

    return (
        <>
            <nav className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 py-2 md:px-12 backdrop-blur-md bg-black/10 border-b border-white/10">
                {/* Left Side: Logo */}
                <div className="flex items-center">
                    <img
                        src="/OQ_LOGO_MAIN.svg"
                        alt="OnQuest Logo"
                        className="h-12 md:h-16 w-auto"
                    />
                </div>

                {/* Right Side: Get Started Button */}
                <div>
                    <button
                        onClick={handleGetStarted}
                        className="bg-[#EA6100] hover:bg-[#d95a00] text-white font-bold py-2 px-6 rounded-full transition-colors duration-300 shadow-lg"
                    >
                        Login
                    </button>
                </div>
            </nav>

            {showAuthModal && <OnboardingModal onClose={() => setShowAuthModal(false)} isSignIn={true} />}
        </>
    );
};

export default LandingNavbar;
