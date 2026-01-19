'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getCurrentUserData, sendPasswordReset, changePassword, scheduleAccountDeletion, checkDeletionStatus, cancelAccountDeletion } from '@/lib/authService';
import { ArrowLeft, Lock, Trash2, Mail, Eye, EyeOff, AlertTriangle, Shield, X, CheckCircle } from 'lucide-react';
import NavBar from '@/components/LeftSideNav';
import Footer from '@/components/phoneComponents/Footer';

interface DeletionStatus {
    isScheduledForDeletion: boolean;
    scheduledDeletionDate: Date | null;
    deletionRequestedAt: Date | null;
}

const SecurityPage = () => {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [deletionStatus, setDeletionStatus] = useState<DeletionStatus | null>(null);

    // Password reset states
    const [resetEmail, setResetEmail] = useState('');
    const [resetLoading, setResetLoading] = useState(false);
    const [resetSuccess, setResetSuccess] = useState(false);
    const [resetError, setResetError] = useState('');

    // Change password states
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [changeLoading, setChangeLoading] = useState(false);
    const [changeError, setChangeError] = useState('');
    const [changeSuccess, setChangeSuccess] = useState(false);

    // Delete account states
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                try {
                    const data = await getCurrentUserData();
                    setUserData(data);
                    setResetEmail(currentUser.email || '');

                    const status = await checkDeletionStatus(currentUser.uid);
                    setDeletionStatus(status);
                } catch (error) {
                    console.error('Error fetching user data:', error);
                }
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handlePasswordReset = async () => {
        if (!resetEmail) {
            setResetError('Please enter your email address');
            return;
        }

        setResetLoading(true);
        setResetError('');
        setResetSuccess(false);

        try {
            await sendPasswordReset(resetEmail);
            setResetSuccess(true);
        } catch (error: any) {
            setResetError(error.message || 'Failed to send reset email');
        } finally {
            setResetLoading(false);
        }
    };

    const handleChangePassword = async () => {
        setChangeError('');

        if (!currentPassword || !newPassword || !confirmPassword) {
            setChangeError('Please fill in all fields');
            return;
        }

        if (newPassword !== confirmPassword) {
            setChangeError('New passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            setChangeError('Password must be at least 6 characters');
            return;
        }

        setChangeLoading(true);

        try {
            await changePassword(currentPassword, newPassword);
            setChangeSuccess(true);
            setShowChangePassword(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            if (error.code === 'auth/wrong-password') {
                setChangeError('Current password is incorrect');
            } else {
                setChangeError(error.message || 'Failed to change password');
            }
        } finally {
            setChangeLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== 'DELETE') {
            setDeleteError('Please type DELETE to confirm');
            return;
        }

        setDeleteLoading(true);
        setDeleteError('');

        try {
            await scheduleAccountDeletion();
            router.push('/login?deleted=scheduled');
        } catch (error: any) {
            setDeleteError(error.message || 'Failed to schedule account deletion');
            setDeleteLoading(false);
        }
    };

    const handleCancelDeletion = async () => {
        try {
            await cancelAccountDeletion();
            setDeletionStatus({
                isScheduledForDeletion: false,
                scheduledDeletionDate: null,
                deletionRequestedAt: null
            });
        } catch (error) {
            console.error('Error cancelling deletion:', error);
        }
    };

    const isEmailUser = user?.providerData?.some((p: any) => p.providerId === 'password');

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
                            <h1 className='text-2xl font-bold text-white'>Privacy & Security</h1>
                            <p className='text-gray-400 text-sm'>Manage your account security settings</p>
                        </div>
                    </div>

                    {/* Deletion Warning Banner */}
                    {deletionStatus?.isScheduledForDeletion && (
                        <div className='bg-red-900/30 border border-red-500 rounded-xl p-4 mb-6'>
                            <div className='flex items-start gap-3'>
                                <AlertTriangle className='text-red-500 flex-shrink-0 mt-0.5' size={20} />
                                <div className='flex-1'>
                                    <h3 className='text-red-400 font-semibold'>Account Scheduled for Deletion</h3>
                                    <p className='text-red-300/80 text-sm mt-1'>
                                        Your account will be permanently deleted on{' '}
                                        <strong>
                                            {deletionStatus.scheduledDeletionDate
                                                ? new Date(deletionStatus.scheduledDeletionDate).toLocaleDateString()
                                                : 'soon'}
                                        </strong>
                                        . You can recover your account before this date.
                                    </p>
                                    <button
                                        onClick={handleCancelDeletion}
                                        className='mt-3 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors'
                                    >
                                        Cancel Deletion
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Password Reset Section */}
                    <div className='bg-[#1a1a1a] rounded-xl p-6 mb-6 border border-gray-800'>
                        <div className='flex items-center gap-3 mb-4'>
                            <div className='w-10 h-10 bg-[#EA6100]/20 rounded-lg flex items-center justify-center'>
                                <Mail className='text-[#EA6100]' size={20} />
                            </div>
                            <div>
                                <h2 className='text-lg font-semibold text-white'>Password Reset</h2>
                                <p className='text-gray-400 text-sm'>Send a password reset link to your email</p>
                            </div>
                        </div>

                        <div className='space-y-4'>
                            <input
                                type='email'
                                value={resetEmail}
                                onChange={(e) => setResetEmail(e.target.value)}
                                placeholder='Enter your email'
                                className='w-full bg-[#292929] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#EA6100] transition-colors'
                            />

                            {resetError && (
                                <p className='text-red-400 text-sm'>{resetError}</p>
                            )}

                            {resetSuccess && (
                                <div className='flex items-center gap-2 text-green-400 text-sm'>
                                    <CheckCircle size={16} />
                                    <span>Password reset email sent! Check your inbox.</span>
                                </div>
                            )}

                            <button
                                onClick={handlePasswordReset}
                                disabled={resetLoading}
                                className='w-full bg-[#EA6100] hover:bg-[#d55600] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors'
                            >
                                {resetLoading ? 'Sending...' : 'Send Reset Link'}
                            </button>
                        </div>
                    </div>

                    {/* Change Password Section (only for email users) */}
                    {isEmailUser && (
                        <div className='bg-[#1a1a1a] rounded-xl p-6 mb-6 border border-gray-800'>
                            <div className='flex items-center justify-between mb-4'>
                                <div className='flex items-center gap-3'>
                                    <div className='w-10 h-10 bg-[#EA6100]/20 rounded-lg flex items-center justify-center'>
                                        <Lock className='text-[#EA6100]' size={20} />
                                    </div>
                                    <div>
                                        <h2 className='text-lg font-semibold text-white'>Change Password</h2>
                                        <p className='text-gray-400 text-sm'>Update your account password</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowChangePassword(!showChangePassword)}
                                    className='text-[#EA6100] text-sm font-medium hover:underline'
                                >
                                    {showChangePassword ? 'Cancel' : 'Change'}
                                </button>
                            </div>

                            {changeSuccess && !showChangePassword && (
                                <div className='flex items-center gap-2 text-green-400 text-sm mb-4'>
                                    <CheckCircle size={16} />
                                    <span>Password changed successfully!</span>
                                </div>
                            )}

                            {showChangePassword && (
                                <div className='space-y-4 mt-4 pt-4 border-t border-gray-700'>
                                    <div className='relative'>
                                        <input
                                            type={showCurrentPassword ? 'text' : 'password'}
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            placeholder='Current password'
                                            className='w-full bg-[#292929] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#EA6100] transition-colors pr-12'
                                        />
                                        <button
                                            type='button'
                                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                            className='absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white'
                                        >
                                            {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    </div>

                                    <div className='relative'>
                                        <input
                                            type={showNewPassword ? 'text' : 'password'}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder='New password (min 6 characters)'
                                            className='w-full bg-[#292929] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#EA6100] transition-colors pr-12'
                                        />
                                        <button
                                            type='button'
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                            className='absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white'
                                        >
                                            {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    </div>

                                    <input
                                        type='password'
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder='Confirm new password'
                                        className='w-full bg-[#292929] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#EA6100] transition-colors'
                                    />

                                    {changeError && (
                                        <p className='text-red-400 text-sm'>{changeError}</p>
                                    )}

                                    <button
                                        onClick={handleChangePassword}
                                        disabled={changeLoading}
                                        className='w-full bg-[#EA6100] hover:bg-[#d55600] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors'
                                    >
                                        {changeLoading ? 'Updating...' : 'Update Password'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Delete Account Section */}
                    <div className='bg-[#1a1a1a] rounded-xl p-6 border border-red-900/50'>
                        <div className='flex items-center gap-3 mb-4'>
                            <div className='w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center'>
                                <Trash2 className='text-red-500' size={20} />
                            </div>
                            <div>
                                <h2 className='text-lg font-semibold text-white'>Delete Account</h2>
                                <p className='text-gray-400 text-sm'>Permanently delete your account and all data</p>
                            </div>
                        </div>

                        <div className='bg-red-900/20 rounded-lg p-4 mb-4'>
                            <div className='flex items-start gap-3'>
                                <AlertTriangle className='text-red-400 flex-shrink-0 mt-0.5' size={18} />
                                <div className='text-sm text-red-300/80'>
                                    <p className='font-medium text-red-300 mb-1'>This action cannot be undone</p>
                                    <p>
                                        When you delete your account, you have <strong>30 days</strong> to recover it.
                                        After 30 days, your account and all associated data will be permanently deleted.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowDeleteModal(true)}
                            disabled={deletionStatus?.isScheduledForDeletion}
                            className='w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors'
                        >
                            {deletionStatus?.isScheduledForDeletion ? 'Deletion Already Scheduled' : 'Delete My Account'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className='fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4'>
                    <div className='bg-[#1a1a1a] rounded-2xl max-w-md w-full p-6 border border-gray-800'>
                        <div className='flex items-center justify-between mb-6'>
                            <h3 className='text-xl font-bold text-white'>Confirm Account Deletion</h3>
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setDeleteConfirmText('');
                                    setDeleteError('');
                                }}
                                className='text-gray-400 hover:text-white'
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className='space-y-4'>
                            <div className='bg-red-900/20 rounded-lg p-4'>
                                <p className='text-red-300 text-sm'>
                                    You have <strong>30 days</strong> to recover your account after deletion.
                                    Simply log in again to cancel the deletion.
                                </p>
                            </div>

                            <div>
                                <label className='block text-gray-400 text-sm mb-2'>
                                    Type <strong className='text-white'>DELETE</strong> to confirm
                                </label>
                                <input
                                    type='text'
                                    value={deleteConfirmText}
                                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                                    placeholder='DELETE'
                                    className='w-full bg-[#292929] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors'
                                />
                            </div>

                            {deleteError && (
                                <p className='text-red-400 text-sm'>{deleteError}</p>
                            )}

                            <div className='flex gap-3'>
                                <button
                                    onClick={() => {
                                        setShowDeleteModal(false);
                                        setDeleteConfirmText('');
                                        setDeleteError('');
                                    }}
                                    className='flex-1 bg-[#292929] hover:bg-[#3a3a3a] text-white font-medium py-3 rounded-lg transition-colors'
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteAccount}
                                    disabled={deleteLoading || deleteConfirmText !== 'DELETE'}
                                    className='flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors'
                                >
                                    {deleteLoading ? 'Deleting...' : 'Delete Account'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile Footer */}
            <div className='lg:hidden'>
                <Footer />
            </div>
        </div>
    );
};

export default SecurityPage;
