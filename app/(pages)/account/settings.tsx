'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { signOut, getCurrentUserData } from '@/lib/authService';
import {
  User,
  Edit2,
  Bell,
  Shield,
  HelpCircle,
  ChevronRight,
  LogOut,
  ArrowLeft,
} from 'lucide-react';
import NavBar from '@/components/LeftSideNav';
import Footer from '@/components/phoneComponents/Footer';

interface MenuItem {
  icon: React.ElementType;
  title: string;
  description: string;
  route: string;
}

const SettingsPage = () => {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const data = await getCurrentUserData();
          setUserData(data);
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const accountItems: MenuItem[] = [
    {
      icon: Edit2,
      title: 'Edit Profile',
      description: 'Update your profile information',
      route: '/settings/edit-profile',
    },
  ];

  const settingsItems: MenuItem[] = [
    {
      icon: Bell,
      title: 'Notifications',
      description: 'Manage notification preferences',
      route: '/account/notifications',
    },
    {
      icon: Shield,
      title: 'Privacy & Security',
      description: 'Password, account deletion, privacy',
      route: '/account/security',
    },
  ];

  const supportItems: MenuItem[] = [
    {
      icon: HelpCircle,
      title: 'Help & Support',
      description: 'Get help and contact support',
      route: '/account/support',
    },
  ];

  const navigateTo = (path: string) => {
    router.push(path);
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      setSigningOut(false);
    }
  };

  if (loading) {
    return (
      <div className='min-h-screen bg-[#121212] flex items-center justify-center'>
        <div className='w-16 h-16 border-4 border-[#EA6100] border-t-transparent rounded-full animate-spin' />
      </div>
    );
  }

  if (!user) {
    return (
      <div className='min-h-screen bg-[#121212] text-white flex items-center justify-center px-4'>
        <div className='text-center max-w-md'>
          <div className='w-20 h-20 bg-[#EA6100]/10 rounded-full flex items-center justify-center mx-auto mb-4'>
            <User className='w-10 h-10 text-[#EA6100]' />
          </div>
          <h2 className='text-2xl font-bold text-white mb-2'>Sign in required</h2>
          <p className='text-gray-400 mb-6'>Please sign in to access settings</p>
          <button
            onClick={() => navigateTo('/login')}
            className='bg-[#EA6100] hover:bg-[#d55600] text-white px-8 py-3 rounded-lg font-medium transition-colors'
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-[#121212]'>
      {/* Desktop NavBar */}
      <div className='hidden lg:block'>
        <NavBar user={user} onSignOut={handleSignOut} />
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
              <h1 className='text-2xl font-bold text-white'>Settings</h1>
              <p className='text-gray-400 text-sm'>Manage your account and preferences</p>
            </div>
          </div>

          {/* User Info Card */}
          <div className='bg-[#1a1a1a] rounded-xl p-4 mb-6 border border-gray-800'>
            <div className='flex items-center gap-4'>
              <img
                src={userData?.photoURL || user?.photoURL || '/default-avatar.png'}
                alt='Profile'
                className='w-14 h-14 rounded-full object-cover'
              />
              <div className='flex-1'>
                <h2 className='text-white font-semibold'>
                  {userData?.displayName || user?.displayName || 'User'}
                </h2>
                <p className='text-gray-400 text-sm'>{user?.email}</p>
              </div>
              <button
                onClick={() => navigateTo('/account')}
                className='text-[#EA6100] text-sm font-medium hover:underline'
              >
                View Profile
              </button>
            </div>
          </div>

          {/* Account Section */}
          <div className='mb-6'>
            <h3 className='text-gray-400 text-sm font-medium mb-3 px-1'>ACCOUNT</h3>
            <div className='bg-[#1a1a1a] rounded-xl border border-gray-800 overflow-hidden'>
              {accountItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.route}
                    onClick={() => navigateTo(item.route)}
                    className={`w-full flex items-center justify-between p-4 hover:bg-[#292929] transition-colors ${index < accountItems.length - 1 ? 'border-b border-gray-800' : ''
                      }`}
                  >
                    <div className='flex items-center gap-4'>
                      <div className='w-10 h-10 bg-[#292929] rounded-lg flex items-center justify-center'>
                        <Icon className='text-[#EA6100]' size={20} />
                      </div>
                      <div className='text-left'>
                        <h3 className='text-white font-medium'>{item.title}</h3>
                        <p className='text-gray-400 text-sm'>{item.description}</p>
                      </div>
                    </div>
                    <ChevronRight className='text-gray-400' size={20} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Settings Section */}
          <div className='mb-6'>
            <h3 className='text-gray-400 text-sm font-medium mb-3 px-1'>PREFERENCES</h3>
            <div className='bg-[#1a1a1a] rounded-xl border border-gray-800 overflow-hidden'>
              {settingsItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.route}
                    onClick={() => navigateTo(item.route)}
                    className={`w-full flex items-center justify-between p-4 hover:bg-[#292929] transition-colors ${index < settingsItems.length - 1 ? 'border-b border-gray-800' : ''
                      }`}
                  >
                    <div className='flex items-center gap-4'>
                      <div className='w-10 h-10 bg-[#292929] rounded-lg flex items-center justify-center'>
                        <Icon className='text-[#EA6100]' size={20} />
                      </div>
                      <div className='text-left'>
                        <h3 className='text-white font-medium'>{item.title}</h3>
                        <p className='text-gray-400 text-sm'>{item.description}</p>
                      </div>
                    </div>
                    <ChevronRight className='text-gray-400' size={20} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Support Section */}
          <div className='mb-6'>
            <h3 className='text-gray-400 text-sm font-medium mb-3 px-1'>SUPPORT</h3>
            <div className='bg-[#1a1a1a] rounded-xl border border-gray-800 overflow-hidden'>
              {supportItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.route}
                    onClick={() => navigateTo(item.route)}
                    className={`w-full flex items-center justify-between p-4 hover:bg-[#292929] transition-colors ${index < supportItems.length - 1 ? 'border-b border-gray-800' : ''
                      }`}
                  >
                    <div className='flex items-center gap-4'>
                      <div className='w-10 h-10 bg-[#292929] rounded-lg flex items-center justify-center'>
                        <Icon className='text-[#EA6100]' size={20} />
                      </div>
                      <div className='text-left'>
                        <h3 className='text-white font-medium'>{item.title}</h3>
                        <p className='text-gray-400 text-sm'>{item.description}</p>
                      </div>
                    </div>
                    <ChevronRight className='text-gray-400' size={20} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className='w-full bg-red-600/10 hover:bg-red-600/20 border border-red-600/30 text-red-500 font-medium py-4 rounded-xl transition-colors flex items-center justify-center gap-3'
          >
            <LogOut size={20} />
            {signingOut ? 'Signing out...' : 'Sign Out'}
          </button>

          {/* App Version */}
          <p className='text-center text-gray-500 text-sm mt-6'>
            OnQuest v1.0.0
          </p>
        </div>
      </div>

      {/* Mobile Footer */}
      <div className='lg:hidden'>
        <Footer />
      </div>
    </div>
  );
};

export default SettingsPage;