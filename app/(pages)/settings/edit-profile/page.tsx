"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db, storage } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { checkUsernameAvailability, claimUsername } from '@/lib/userProfileService';
import { ArrowLeft, Camera, X, Loader2, CheckCircle, XCircle } from 'lucide-react';
import NavBar from '@/components/LeftSideNav';
import Footer from '@/components/phoneComponents/Footer';
import Image from 'next/image';

interface UserData {
  displayName?: string;
  username?: string;
  email?: string;
  photoURL?: string;
  backgroundURL?: string;
  title?: string;
  bio?: string;
  location?: string;
  website?: string;
  twitter?: string;
  instagram?: string;
  linkedin?: string;
}

const EditProfilePage = () => {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);

  // Username check state
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);
  const [originalUsername, setOriginalUsername] = useState('');

  // Form data
  const [formData, setFormData] = useState<UserData>({
    displayName: '',
    username: '',
    email: '',
    photoURL: '',
    backgroundURL: '',
    title: '',
    bio: '',
    location: '',
    website: '',
    twitter: '',
    instagram: '',
    linkedin: '',
  });

  // Preview URLs for images
  const [profilePreview, setProfilePreview] = useState<string>('');
  const [backgroundPreview, setBackgroundPreview] = useState<string>('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await fetchUserData(currentUser.uid);
      } else {
        router.push('/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const fetchUserData = async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const data = userDoc.data() as UserData;
        setFormData({
          displayName: data.displayName || '',
          username: (data as any).username || '', // Handle cases where username might not exist on type yet
          email: data.email || '',
          photoURL: data.photoURL || '',
          backgroundURL: data.backgroundURL || '',
          title: data.title || '',
          bio: data.bio || '',
          location: data.location || '',
          website: data.website || '',
          twitter: data.twitter || '',
          instagram: data.instagram || '',
          linkedin: data.linkedin || '',
        });
        setProfilePreview(data.photoURL || '');
        setBackgroundPreview(data.backgroundURL || '');
        setOriginalUsername((data as any).username || '');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name === 'username') {
      // Sanitize username
      const sanitized = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
      setFormData(prev => ({ ...prev, [name]: sanitized }));
      setIsUsernameAvailable(null);
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Debounce username check
  useEffect(() => {
    const checkUsername = async () => {
      if (!formData.username || formData.username === originalUsername) {
        setIsUsernameAvailable(null);
        return;
      }

      if (formData.username.length < 3) {
        setIsUsernameAvailable(null);
        return;
      }

      setIsCheckingUsername(true);
      const available = await checkUsernameAvailability(formData.username);
      setIsUsernameAvailable(available);
      setIsCheckingUsername(false);
    };

    const timer = setTimeout(checkUsername, 500);
    return () => clearTimeout(timer);
  }, [formData.username, originalUsername]);

  const handleProfileImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingProfile(true);
    try {
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to Firebase Storage
      const storageRef = ref(storage, `profile-images/${user.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      setFormData(prev => ({ ...prev, photoURL: downloadURL }));
    } catch (error) {
      console.error('Error uploading profile image:', error);
      alert('Failed to upload profile image. Please try again.');
    } finally {
      setUploadingProfile(false);
    }
  };

  const handleBackgroundImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingBackground(true);
    try {
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setBackgroundPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to Firebase Storage
      const storageRef = ref(storage, `background-images/${user.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      setFormData(prev => ({ ...prev, backgroundURL: downloadURL }));
    } catch (error) {
      console.error('Error uploading background image:', error);
      alert('Failed to upload background image. Please try again.');
    } finally {
      setUploadingBackground(false);
    }
  };

  const handleRemoveProfileImage = () => {
    setFormData(prev => ({ ...prev, photoURL: '' }));
    setProfilePreview('');
  };

  const handleRemoveBackgroundImage = () => {
    setFormData(prev => ({ ...prev, backgroundURL: '' }));
    setBackgroundPreview('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Prevent submit if username is invalid or taken (only if changed)
    if (formData.username !== originalUsername) {
      if (isUsernameAvailable === false || (formData.username && formData.username.length < 3)) {
        alert('Please select a valid available username');
        return;
      }
    }

    setSaving(true);
    try {
      // Handle username change separately if needed
      if (formData.username && formData.username !== originalUsername) {
        const result = await claimUsername(user.uid, formData.username);
        if (!result.success) {
          throw new Error(result.error || 'Failed to update username');
        }
      }

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName: formData.displayName,
        photoURL: formData.photoURL,
        backgroundURL: formData.backgroundURL,
        title: formData.title,
        bio: formData.bio,
        location: formData.location,
        website: formData.website,
        twitter: formData.twitter,
        instagram: formData.instagram,
        linkedin: formData.linkedin,
        updatedAt: new Date(),
      });

      alert('Profile updated successfully!');
      router.push('/account');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      alert(error.message || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className='min-h-screen bg-[#121212] flex items-center justify-center'>
        <div className='w-16 h-16 border-4 border-[#EA6100] border-t-transparent rounded-full animate-spin'></div>
      </div>
    );
  }

  // Layout constants matching quest page
  const QUEST_LEFT_NAV_WIDTH = 280;
  const QUEST_SIDEBAR_GAP = 16;
  const QUEST_DESKTOP_MAIN_WIDTH = 60;

  const containerStartExpression = `calc((100vw - (${QUEST_LEFT_NAV_WIDTH}px + ${QUEST_DESKTOP_MAIN_WIDTH}vw + ${QUEST_SIDEBAR_GAP}px)) / 2)`;
  const mainLeftExpression = `calc(${containerStartExpression} + ${QUEST_LEFT_NAV_WIDTH + QUEST_SIDEBAR_GAP}px)`;

  const mainWidthStyle: React.CSSProperties = {
    width: `${QUEST_DESKTOP_MAIN_WIDTH}vw`,
    marginLeft: mainLeftExpression,
    marginRight: 'auto',
  };

  return (
    <div className='min-h-screen bg-black'>
      {/* Desktop Navbar */}
      <div className="hidden lg:block">
        <NavBar
          user={user}
          onSignOut={() => { }}
          style={{
            left: containerStartExpression,
            right: 'auto',
            width: `${QUEST_LEFT_NAV_WIDTH}px`,
          }}
        />
      </div>

      {/* Desktop Main Content */}
      <div className='hidden lg:block' style={mainWidthStyle}>
        <div className='w-full max-w-[65vw]'>

          {/* Header */}
          <div className='sticky top-0 z-10 bg-[#121212] border-b border-gray-700'>
            <div className='flex items-center justify-between px-5 lg:px-8 py-4'>
              <div className='flex items-center gap-4'>
                <button
                  onClick={() => router.back()}
                  className='text-white hover:text-[#EA6100] transition-colors'
                >
                  <ArrowLeft size={24} />
                </button>
                <h1 className='text-2xl font-bold text-white'>Edit Profile</h1>
              </div>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className='bg-[#EA6100] text-black px-6 py-2 rounded-lg font-medium hover:bg-[#f5c094] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2'
              >
                {saving ? (
                  <>
                    <Loader2 size={18} className='animate-spin' />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className='px-5 lg:px-8 py-8 pb-20 lg:pb-8'>

            {/* Background Image */}
            <div className='mb-8'>
              <label className='block text-white font-semibold mb-3'>Background Image</label>
              <div className='relative h-48 lg:h-64 bg-[#1a1a1a] rounded-xl overflow-hidden group'>
                {backgroundPreview ? (
                  <>
                    <img
                      src={backgroundPreview}
                      alt='Background'
                      className='w-full h-full object-cover'
                    />
                    <div className='absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3'>
                      <label className='bg-[#EA6100] text-black px-4 py-2 rounded-lg font-medium cursor-pointer hover:bg-[#f5c094] transition-colors flex items-center gap-2'>
                        <Camera size={18} />
                        <span>Change</span>
                        <input
                          type='file'
                          accept='image/*'
                          onChange={handleBackgroundImageChange}
                          className='hidden'
                          disabled={uploadingBackground}
                        />
                      </label>
                      <button
                        type='button'
                        onClick={handleRemoveBackgroundImage}
                        className='bg-red-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-600 transition-colors flex items-center gap-2'
                      >
                        <X size={18} />
                        <span>Remove</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <label className='w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-[#292929] transition-colors'>
                    <Camera size={48} className='text-gray-400 mb-2' />
                    <span className='text-gray-400 font-medium'>Upload Background Image</span>
                    <span className='text-gray-500 text-sm mt-1'>Recommended: 1200x400px</span>
                    <input
                      type='file'
                      accept='image/*'
                      onChange={handleBackgroundImageChange}
                      className='hidden'
                      disabled={uploadingBackground}
                    />
                  </label>
                )}
                {uploadingBackground && (
                  <div className='absolute inset-0 bg-black/70 flex items-center justify-center'>
                    <Loader2 size={48} className='text-[#EA6100] animate-spin' />
                  </div>
                )}
              </div>
            </div>

            {/* Profile Image */}
            <div className='mb-8'>
              <label className='block text-white font-semibold mb-3'>Profile Picture</label>
              <div className='flex items-center gap-6'>
                <div className='relative w-32 h-32 bg-[#1a1a1a] rounded-full overflow-hidden group'>
                  {profilePreview ? (
                    <>
                      <img
                        src={profilePreview}
                        alt='Profile'
                        className='w-full h-full object-cover'
                      />
                      <div className='absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center'>
                        <label className='bg-[#EA6100] text-black p-2 rounded-full cursor-pointer hover:bg-[#f5c094] transition-colors'>
                          <Camera size={20} />
                          <input
                            type='file'
                            accept='image/*'
                            onChange={handleProfileImageChange}
                            className='hidden'
                            disabled={uploadingProfile}
                          />
                        </label>
                      </div>
                    </>
                  ) : (
                    <label className='w-full h-full flex items-center justify-center cursor-pointer hover:bg-[#292929] transition-colors'>
                      <Camera size={32} className='text-gray-400' />
                      <input
                        type='file'
                        accept='image/*'
                        onChange={handleProfileImageChange}
                        className='hidden'
                        disabled={uploadingProfile}
                      />
                    </label>
                  )}
                  {uploadingProfile && (
                    <div className='absolute inset-0 bg-black/70 flex items-center justify-center'>
                      <Loader2 size={32} className='text-[#EA6100] animate-spin' />
                    </div>
                  )}
                </div>
                <div>
                  <p className='text-white font-medium mb-1'>Profile Photo</p>
                  <p className='text-gray-400 text-sm mb-3'>Recommended: Square image, at least 400x400px</p>
                  <div className='flex gap-2'>
                    <label className='bg-[#292929] text-white px-4 py-2 rounded-lg text-sm cursor-pointer hover:bg-[#3a3a3a] transition-colors'>
                      Upload Photo
                      <input
                        type='file'
                        accept='image/*'
                        onChange={handleProfileImageChange}
                        className='hidden'
                        disabled={uploadingProfile}
                      />
                    </label>
                    {profilePreview && (
                      <button
                        type='button'
                        onClick={handleRemoveProfileImage}
                        className='bg-[#292929] text-red-400 px-4 py-2 rounded-lg text-sm hover:bg-[#3a3a3a] transition-colors'
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Basic Information */}
            <div className='bg-[#1a1a1a] rounded-xl p-6 mb-6'>
              <h2 className='text-xl font-bold text-white mb-4'>Basic Information</h2>

              <div className='space-y-4'>
                <div>
                  <label className='block text-white font-medium mb-2'>Display Name *</label>
                  <input
                    type='text'
                    name='displayName'
                    value={formData.displayName}
                    onChange={handleInputChange}
                    required
                    maxLength={50}
                    className='w-full bg-[#292929] text-white px-4 py-3 rounded-lg border border-gray-700 focus:border-[#EA6100] focus:outline-none transition-colors'
                    placeholder='Your display name'
                  />
                  <p className='text-gray-500 text-sm mt-1'>{(formData.displayName ?? '').length}/50 characters</p>
                </div>

                <div>
                  <label className='block text-white font-medium mb-2'>Username</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500">@</span>
                    </div>
                    <input
                      type='text'
                      name='username'
                      value={formData.username}
                      onChange={handleInputChange}
                      minLength={3}
                      maxLength={30}
                      className={`w-full bg-[#292929] text-white pl-8 pr-10 py-3 rounded-lg border focus:outline-none transition-colors
                        ${isUsernameAvailable === true ? 'border-green-500 focus:border-green-500' :
                          isUsernameAvailable === false ? 'border-red-500 focus:border-red-500' :
                            'border-gray-700 focus:border-[#EA6100]'}`}
                      placeholder='username'
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      {isCheckingUsername ? (
                        <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
                      ) : isUsernameAvailable === true ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : isUsernameAvailable === false ? (
                        <XCircle className="w-5 h-5 text-red-500" />
                      ) : null}
                    </div>
                  </div>
                  <div className="text-sm mt-1 min-h-[20px]">
                    {isUsernameAvailable === false && (
                      <p className="text-red-500">Username is already taken</p>
                    )}
                    {formData.username !== originalUsername && isUsernameAvailable === true && (
                      <p className="text-green-500">Username is available</p>
                    )}
                    <p className="text-gray-500">3-30 characters, letters, numbers, and underscores only</p>
                  </div>
                </div>

                <div>
                  <label className='block text-white font-medium mb-2'>Email Address</label>
                  <input
                    type='email'
                    name='email'
                    value={formData.email}
                    disabled
                    className='w-full bg-[#1f1f1f] text-gray-500 px-4 py-3 rounded-lg border border-gray-700 cursor-not-allowed'
                  />
                  <p className='text-gray-500 text-sm mt-1'>Email cannot be changed</p>
                </div>

                <div>
                  <label className='block text-white font-medium mb-2'>Title / Tagline</label>
                  <input
                    type='text'
                    name='title'
                    value={formData.title}
                    onChange={handleInputChange}
                    maxLength={60}
                    className='w-full bg-[#292929] text-white px-4 py-3 rounded-lg border border-gray-700 focus:border-[#EA6100] focus:outline-none transition-colors'
                    placeholder='e.g., Adventure Seeker, Travel Photographer'
                  />
                  <p className='text-gray-500 text-sm mt-1'>{(formData.title ?? '').length}/60 characters</p>
                </div>

                <div>
                  <label className='block text-white font-medium mb-2'>Bio</label>
                  <textarea
                    name='bio'
                    value={formData.bio}
                    onChange={handleInputChange}
                    maxLength={300}
                    rows={4}
                    className='w-full bg-[#292929] text-white px-4 py-3 rounded-lg border border-gray-700 focus:border-[#EA6100] focus:outline-none transition-colors resize-none'
                    placeholder='Tell us about yourself...'
                  />
                  <p className='text-gray-500 text-sm mt-1'>{(formData.bio ?? '').length}/300 characters</p>
                </div>

                <div>
                  <label className='block text-white font-medium mb-2'>Location</label>
                  <input
                    type='text'
                    name='location'
                    value={formData.location}
                    onChange={handleInputChange}
                    maxLength={50}
                    className='w-full bg-[#292929] text-white px-4 py-3 rounded-lg border border-gray-700 focus:border-[#EA6100] focus:outline-none transition-colors'
                    placeholder='e.g., San Francisco, CA'
                  />
                </div>
              </div>
            </div>

            {/* Social Links */}
            <div className='bg-[#1a1a1a] rounded-xl p-6 mb-6'>
              <h2 className='text-xl font-bold text-white mb-4'>Social Links</h2>

              <div className='space-y-4'>
                <div>
                  <label className='block text-white font-medium mb-2'>Website</label>
                  <input
                    type='url'
                    name='website'
                    value={formData.website}
                    onChange={handleInputChange}
                    className='w-full bg-[#292929] text-white px-4 py-3 rounded-lg border border-gray-700 focus:border-[#EA6100] focus:outline-none transition-colors'
                    placeholder='https://yourwebsite.com'
                  />
                </div>

                <div>
                  <label className='block text-white font-medium mb-2'>Twitter</label>
                  <div className='flex items-center bg-[#292929] rounded-lg border border-gray-700 focus-within:border-[#EA6100]'>
                    <span className='text-gray-400 px-4'>@</span>
                    <input
                      type='text'
                      name='twitter'
                      value={formData.twitter}
                      onChange={handleInputChange}
                      className='flex-1 bg-transparent text-white py-3 pr-4 focus:outline-none'
                      placeholder='username'
                    />
                  </div>
                </div>

                <div>
                  <label className='block text-white font-medium mb-2'>Instagram</label>
                  <div className='flex items-center bg-[#292929] rounded-lg border border-gray-700 focus-within:border-[#EA6100]'>
                    <span className='text-gray-400 px-4'>@</span>
                    <input
                      type='text'
                      name='instagram'
                      value={formData.instagram}
                      onChange={handleInputChange}
                      className='flex-1 bg-transparent text-white py-3 pr-4 focus:outline-none'
                      placeholder='username'
                    />
                  </div>
                </div>

                <div>
                  <label className='block text-white font-medium mb-2'>LinkedIn</label>
                  <input
                    type='url'
                    name='linkedin'
                    value={formData.linkedin}
                    onChange={handleInputChange}
                    className='w-full bg-[#292929] text-white px-4 py-3 rounded-lg border border-gray-700 focus:border-[#EA6100] focus:outline-none transition-colors'
                    placeholder='https://linkedin.com/in/username'
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className='flex gap-4'>
              <button
                type='button'
                onClick={() => router.back()}
                className='flex-1 bg-[#292929] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#3a3a3a] transition-colors'
              >
                Cancel
              </button>
              <button
                type='submit'
                disabled={saving}
                className='flex-1 bg-[#EA6100] text-black px-6 py-3 rounded-lg font-medium hover:bg-[#f5c094] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
              >
                {saving ? (
                  <>
                    <Loader2 size={18} className='animate-spin' />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            </div>
          </form>

          <div className='lg:hidden'>
            <Footer />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProfilePage;