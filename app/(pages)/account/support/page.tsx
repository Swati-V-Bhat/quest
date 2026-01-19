'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { ArrowLeft, HelpCircle, MessageCircle, Mail, ExternalLink, ChevronRight } from 'lucide-react';
import NavBar from '@/components/LeftSideNav';
import Footer from '@/components/phoneComponents/Footer';

const SupportPage = () => {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const faqItems = [
    {
      question: 'How do I create a Quest?',
      answer: 'Go to the Create Quest page from the navigation menu and follow the step-by-step guide to create your adventure.',
    },
    {
      question: 'How do I earn Quest Points (QP)?',
      answer: 'You can earn QP by completing quests, posting photos, getting likes and comments, and referring friends.',
    },
    {
      question: 'Can I delete my account?',
      answer: 'Yes, go to Settings > Privacy & Security and click "Delete My Account". You have 30 days to recover your account after deletion.',
    },
    {
      question: 'How do I reset my password?',
      answer: 'Go to Settings > Privacy & Security and click "Send Reset Link". Check your email for the password reset link.',
    },
  ];

  if (loading) {
    return (
      <div className='min-h-screen bg-[#121212] flex items-center justify-center'>
        <div className='w-16 h-16 border-4 border-[#EA6100] border-t-transparent rounded-full animate-spin' />
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-[#121212]'>
      {/* Desktop NavBar */}
      <div className='hidden lg:block'>
        <NavBar user={user} onSignOut={() => router.push('/login')} />
      </div>

      {/* Main Content */}
      <div className='lg:ml-[280px] pb-20 lg:pb-8'>
        <div className='max-w-2xl mx-auto px-4 py-6'>
          {/* Header */}
          <div className='flex items-center gap-4 mb-8'>
            <button
              onClick={() => router.back()}
              className='p-2 hover:bg-[#292929] rounded-lg transition-colors'
            >
              <ArrowLeft className='text-white' size={24} />
            </button>
            <div>
              <h1 className='text-2xl font-bold text-white'>Help & Support</h1>
              <p className='text-gray-400 text-sm'>Get help with OnQuest</p>
            </div>
          </div>

          {/* Contact Options */}
          <div className='bg-[#1a1a1a] rounded-xl p-6 mb-6 border border-gray-800'>
            <h2 className='text-lg font-semibold text-white mb-4'>Contact Us</h2>

            <a
              href='mailto:support@onquest.app'
              className='flex items-center justify-between p-4 bg-[#292929] rounded-lg hover:bg-[#3a3a3a] transition-colors mb-3'
            >
              <div className='flex items-center gap-4'>
                <div className='w-10 h-10 bg-[#EA6100]/20 rounded-lg flex items-center justify-center'>
                  <Mail className='text-[#EA6100]' size={20} />
                </div>
                <div>
                  <h3 className='text-white font-medium'>Email Support</h3>
                  <p className='text-gray-400 text-sm'>support@onquest.app</p>
                </div>
              </div>
              <ExternalLink className='text-gray-400' size={18} />
            </a>

            <a
              href='https://instagram.com/onquest.app'
              target='_blank'
              rel='noopener noreferrer'
              className='flex items-center justify-between p-4 bg-[#292929] rounded-lg hover:bg-[#3a3a3a] transition-colors'
            >
              <div className='flex items-center gap-4'>
                <div className='w-10 h-10 bg-[#EA6100]/20 rounded-lg flex items-center justify-center'>
                  <MessageCircle className='text-[#EA6100]' size={20} />
                </div>
                <div>
                  <h3 className='text-white font-medium'>Message on Instagram</h3>
                  <p className='text-gray-400 text-sm'>@onquest.app</p>
                </div>
              </div>
              <ExternalLink className='text-gray-400' size={18} />
            </a>
          </div>

          {/* FAQ Section */}
          <div className='bg-[#1a1a1a] rounded-xl p-6 border border-gray-800'>
            <div className='flex items-center gap-3 mb-4'>
              <HelpCircle className='text-[#EA6100]' size={24} />
              <h2 className='text-lg font-semibold text-white'>Frequently Asked Questions</h2>
            </div>

            <div className='space-y-4'>
              {faqItems.map((item, index) => (
                <details
                  key={index}
                  className='group bg-[#292929] rounded-lg overflow-hidden'
                >
                  <summary className='flex items-center justify-between p-4 cursor-pointer list-none'>
                    <span className='text-white font-medium pr-4'>{item.question}</span>
                    <ChevronRight className='text-gray-400 transition-transform group-open:rotate-90' size={18} />
                  </summary>
                  <div className='px-4 pb-4 text-gray-400 text-sm'>
                    {item.answer}
                  </div>
                </details>
              ))}
            </div>
          </div>

          {/* App Info */}
          <div className='mt-6 text-center text-gray-500 text-sm'>
            <p>OnQuest v1.0.0</p>
            <p className='mt-1'>Made with ❤️ for adventurers</p>
          </div>
        </div>
      </div>

      {/* Mobile Footer */}
      <div className='lg:hidden'>
        <Footer />
      </div>
    </div>
  );
};

export default SupportPage;