'use client'
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import OnboardingModal from '@/components/Onboarding/OnboardingModal';

// Hero Component
const Hero = () => {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleActionClick = () => {
    if (currentUser) {
      router.push('/feed');
    } else {
      setShowAuthModal(true);
    }
  };

  const handleScrollToIntroduction = () => {
    const introducingQuestsSection = document.getElementById('introducing-quests');
    if (introducingQuestsSection) {
      introducingQuestsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <>
      <div className="relative w-full min-h-screen overflow-hidden bg-black">
        {/* Background Image with Gradient Fade */}
        <div
          className="absolute inset-0 bg-[url('/walloq1.svg')] bg-cover bg-center bg-no-repeat opacity-60"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
        </div>

        {/* Content Container */}
        <div className='relative z-10 max-w-7xl mx-auto px-4 h-screen flex flex-col md:flex-row items-center justify-center md:justify-between gap-12 pt-20'>

          {/* Left: Text Content */}
          <div className='flex-1 text-center md:text-left space-y-8 animate-slide-up'>
            <h1 className='text-5xl md:text-7xl font-bold text-white leading-[1.1] tracking-tight font-mont'>
              Turn your trips into <br />
              <span className='text-transparent bg-clip-text bg-gradient-to-r from-[#F7CEB0] to-[#EA6100]'>Quests</span>
            </h1>

            <p className='text-lg text-gray-300 max-w-xl mx-auto md:mx-0 leading-relaxed font-light'>
              Stop forgetting your travel stories. Build structured itineraries, share them with a community of explorers, and get inspired for your next adventure.
            </p>

            <div className='flex flex-col sm:flex-row items-center gap-4 pt-4'>
              <button
                onClick={handleActionClick}
                className='px-8 py-4 bg-[#EA6100] hover:bg-[#F86F0A] text-white rounded-full font-semibold text-lg transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/30 hover:-translate-y-1 w-full sm:w-auto'
              >
                Start Exploring
              </button>

              <button
                onClick={handleScrollToIntroduction}
                className='px-8 py-4 bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 text-white rounded-full font-medium text-lg transition-all duration-300 hover:-translate-y-1 w-full sm:w-auto flex items-center justify-center gap-2'
              >
                <span>What's Quest ?</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {showAuthModal && <OnboardingModal onClose={() => setShowAuthModal(false)} />}
    </>
  );
};

export default Hero;
