'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { checkUsernameAvailability, claimUsername } from '@/lib/userProfileService';
import { Loader2, CheckCircle, XCircle, ArrowRight } from 'lucide-react';

export default function UsernameOnboardingPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [username, setUsername] = useState('');
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Debounce username check
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (username.length >= 3) {
                setIsChecking(true);
                const available = await checkUsernameAvailability(username);
                setIsAvailable(available);
                setIsChecking(false);
            } else {
                setIsAvailable(null);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [username]);

    // Auth check
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                // Check if user already has a username
                const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
                if (userDoc.exists() && userDoc.data().username) {
                    router.replace('/feed');
                }
            } else {
                router.push('/login');
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !isAvailable || username.length < 3) return;

        setIsSubmitting(true);
        setError('');

        const result = await claimUsername(user.uid, username);

        if (result.success) {
            router.push('/feed');
        } else {
            setError(result.error || 'Failed to claim username');
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#EA6100] animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-white mb-2">Choose your username</h1>
                    <p className="text-gray-400">This is how you'll be identified on OnQuest.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500">@</span>
                        </div>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => {
                                setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                                setIsAvailable(null);
                                setError('');
                            }}
                            className={`block w-full pl-8 pr-10 py-4 bg-[#1a1a1a] border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-colors
                ${isAvailable === true ? 'border-green-500 focus:ring-green-500/20' :
                                    isAvailable === false ? 'border-red-500 focus:ring-red-500/20' :
                                        'border-gray-800 focus:border-[#EA6100] focus:ring-[#EA6100]/20'}`}
                            placeholder="username"
                            minLength={3}
                            maxLength={30}
                            required
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            {isChecking ? (
                                <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
                            ) : isAvailable === true ? (
                                <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : isAvailable === false ? (
                                <XCircle className="w-5 h-5 text-red-500" />
                            ) : null}
                        </div>
                    </div>

                    {/* Validation Messages */}
                    <div className="text-sm min-h-[20px]">
                        {isAvailable === false && (
                            <p className="text-red-500">Username is already taken</p>
                        )}
                        {error && (
                            <p className="text-red-500">{error}</p>
                        )}
                        {username.length > 0 && username.length < 3 && (
                            <p className="text-gray-500">Username must be at least 3 characters</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={!isAvailable || isSubmitting || username.length < 3}
                        className="w-full flex items-center justify-center gap-2 bg-[#EA6100] text-black font-bold py-4 rounded-lg hover:bg-[#ff7b1a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                Continue
                                <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
