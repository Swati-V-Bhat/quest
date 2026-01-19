'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ArrowLeft, Bell, Mail, MessageSquare, Users, Heart, Award, CheckCircle } from 'lucide-react';
import NavBar from '@/components/LeftSideNav';
import Footer from '@/components/phoneComponents/Footer';

interface NotificationSettings {
    pushEnabled: boolean;
    emailEnabled: boolean;
    questUpdates: boolean;
    followerActivity: boolean;
    likes: boolean;
    comments: boolean;
    achievements: boolean;
    marketing: boolean;
}

const NotificationsPage = () => {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [settings, setSettings] = useState<NotificationSettings>({
        pushEnabled: true,
        emailEnabled: true,
        questUpdates: true,
        followerActivity: true,
        likes: true,
        comments: true,
        achievements: true,
        marketing: false,
    });

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                try {
                    const userRef = doc(db, 'users', currentUser.uid);
                    const userDoc = await getDoc(userRef);
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        if (data.notificationSettings) {
                            setSettings({ ...settings, ...data.notificationSettings });
                        }
                    }
                } catch (error) {
                    console.error('Error fetching notification settings:', error);
                }
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleToggle = (key: keyof NotificationSettings) => {
        setSettings(prev => ({ ...prev, [key]: !prev[key] }));
        setSaved(false);
    };

    const handleSave = async () => {
        if (!user) return;

        setSaving(true);
        try {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                notificationSettings: settings,
                updatedAt: serverTimestamp(),
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (error) {
            console.error('Error saving notification settings:', error);
        } finally {
            setSaving(false);
        }
    };

    const ToggleSwitch = ({ enabled, onChange }: { enabled: boolean; onChange: () => void }) => (
        <button
            onClick={onChange}
            className={`relative w-12 h-6 rounded-full transition-colors ${enabled ? 'bg-[#EA6100]' : 'bg-gray-600'
                }`}
        >
            <div
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${enabled ? 'translate-x-7' : 'translate-x-1'
                    }`}
            />
        </button>
    );

    const NotificationItem = ({
        icon: Icon,
        title,
        description,
        settingKey,
    }: {
        icon: React.ElementType;
        title: string;
        description: string;
        settingKey: keyof NotificationSettings;
    }) => (
        <div className='flex items-center justify-between py-4 border-b border-gray-800 last:border-0'>
            <div className='flex items-center gap-4'>
                <div className='w-10 h-10 bg-[#292929] rounded-lg flex items-center justify-center'>
                    <Icon className='text-[#EA6100]' size={20} />
                </div>
                <div>
                    <h3 className='text-white font-medium'>{title}</h3>
                    <p className='text-gray-400 text-sm'>{description}</p>
                </div>
            </div>
            <ToggleSwitch enabled={settings[settingKey]} onChange={() => handleToggle(settingKey)} />
        </div>
    );

    if (loading) {
        return (
            <div className='min-h-screen bg-[#121212] flex items-center justify-center'>
                <div className='w-16 h-16 border-4 border-[#EA6100] border-t-transparent rounded-full animate-spin' />
            </div>
        );
    }

    if (!user) {
        router.push('/login');
        return null;
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
                            <h1 className='text-2xl font-bold text-white'>Notifications</h1>
                            <p className='text-gray-400 text-sm'>Manage your notification preferences</p>
                        </div>
                    </div>

                    {/* General Settings */}
                    <div className='bg-[#1a1a1a] rounded-xl p-6 mb-6 border border-gray-800'>
                        <h2 className='text-lg font-semibold text-white mb-4'>General</h2>

                        <NotificationItem
                            icon={Bell}
                            title='Push Notifications'
                            description='Receive push notifications on your device'
                            settingKey='pushEnabled'
                        />

                        <NotificationItem
                            icon={Mail}
                            title='Email Notifications'
                            description='Receive important updates via email'
                            settingKey='emailEnabled'
                        />
                    </div>

                    {/* Activity Notifications */}
                    <div className='bg-[#1a1a1a] rounded-xl p-6 mb-6 border border-gray-800'>
                        <h2 className='text-lg font-semibold text-white mb-4'>Activity</h2>

                        <NotificationItem
                            icon={Heart}
                            title='Likes'
                            description='When someone likes your posts or quests'
                            settingKey='likes'
                        />

                        <NotificationItem
                            icon={MessageSquare}
                            title='Comments'
                            description='When someone comments on your content'
                            settingKey='comments'
                        />

                        <NotificationItem
                            icon={Users}
                            title='Followers'
                            description='When someone follows you'
                            settingKey='followerActivity'
                        />
                    </div>

                    {/* Quest & Achievement Notifications */}
                    <div className='bg-[#1a1a1a] rounded-xl p-6 mb-6 border border-gray-800'>
                        <h2 className='text-lg font-semibold text-white mb-4'>Quests & Achievements</h2>

                        <NotificationItem
                            icon={Bell}
                            title='Quest Updates'
                            description='Updates on quests you have saved or joined'
                            settingKey='questUpdates'
                        />

                        <NotificationItem
                            icon={Award}
                            title='Achievements'
                            description='When you earn badges or reach milestones'
                            settingKey='achievements'
                        />
                    </div>

                    {/* Marketing */}
                    <div className='bg-[#1a1a1a] rounded-xl p-6 mb-6 border border-gray-800'>
                        <h2 className='text-lg font-semibold text-white mb-4'>Marketing</h2>

                        <NotificationItem
                            icon={Mail}
                            title='Promotional Emails'
                            description='Receive news, tips, and special offers'
                            settingKey='marketing'
                        />
                    </div>

                    {/* Save Button */}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className='w-full bg-[#EA6100] hover:bg-[#d55600] disabled:opacity-50 text-white font-medium py-4 rounded-xl transition-colors flex items-center justify-center gap-2'
                    >
                        {saving ? (
                            'Saving...'
                        ) : saved ? (
                            <>
                                <CheckCircle size={20} />
                                Saved
                            </>
                        ) : (
                            'Save Changes'
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile Footer */}
            <div className='lg:hidden'>
                <Footer />
            </div>
        </div>
    );
};

export default NotificationsPage;
