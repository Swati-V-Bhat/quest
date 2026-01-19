import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  PhoneAuthProvider,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  sendPasswordResetEmail,
  updatePassword as firebaseUpdatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth';
import { updateProfileInfo, uploadProfilePicture, uploadBackgroundPicture } from './profileService.js';
import { auth, db } from './firebase.js';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { initializeUserGamification, updateUserQPs, QP_VALUES } from '@/lib/qpService';

const GOOGLE_AVATAR_OPTIONS = [
  'https://www.gstatic.com/webp/gallery/1.jpg',
  'https://www.gstatic.com/webp/gallery/2.jpg',
  'https://www.gstatic.com/webp/gallery/3.jpg',
  'https://www.gstatic.com/webp/gallery/4.jpg',
  'https://www.gstatic.com/webp/gallery/5.jpg'
];


// Initialize recaptcha verifier - FIXED VERSION
const setupRecaptcha = (containerId) => {
  try {
    // First, check if we already have a verifier and clean it up
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      } catch (e) {
        console.warn("Failed to clear existing reCAPTCHA", e);
      }
    }

    // Make sure the element exists in the DOM
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container element with ID '${containerId}' not found`);
    }

    // Create a new reCAPTCHA verifier - IMPORTANT: Pass auth as the first parameter
    const verifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: (response) => {
        console.log("reCAPTCHA verified");
      },
      'expired-callback': () => {
        console.log("reCAPTCHA expired");
      }
    });

    window.recaptchaVerifier = verifier;
    return verifier;
  } catch (error) {
    console.error("Error setting up reCAPTCHA:", error);
    throw error;
  }
};


// Email signin
const signInWithEmail = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    localStorage.setItem('uid', JSON.stringify(userCredential.user.email));
    return userCredential.user;
  } catch (error) {
    console.error("Error signing in:", error);
    throw error;
  }
};



// Phone number - send verification code - FIXED VERSION
const sendPhoneVerificationCode = async (phoneNumber, recaptchaContainerId) => {
  try {
    // Setup reCAPTCHA first
    const appVerifier = setupRecaptcha(recaptchaContainerId);
    console.log("reCAPTCHA verifier setup complete");

    // Format phone number if needed
    const formattedPhoneNumber = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
    console.log("Sending verification to:", formattedPhoneNumber);

    // Send the verification code
    const confirmationResult = await signInWithPhoneNumber(auth, formattedPhoneNumber, appVerifier);
    window.confirmationResult = confirmationResult;
    return confirmationResult;
  } catch (error) {
    console.error("Error sending verification code:", error);
    throw error;
  }
};



// Sign out
const signOut = async () => {
  try {
    await auth.signOut();
    // Clear reCAPTCHA if it exists
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
        window.location.href = '/home';
      } catch (e) {
        console.warn("Failed to clear reCAPTCHA on sign out", e);
      }
    }
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
};

// Get current user from Firestore
const getCurrentUserData = async () => {
  try {
    const user = auth.currentUser;
    if (!user) return null;

    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
      const data = { uid: user.uid, ...userDoc.data() };
      console.log("Firestore user data:", data); // Add this line
      return data;
    }
    return null;
  } catch (error) {
    console.error("Error getting user data:", error);
    throw error;
  }
};
const createUserProfile = async (uid, profileData, referralCode = null) => {
  const userRef = doc(db, 'users', uid);
  const { generateReferralCode, trackReferral } = await import('./qpService');

  await setDoc(userRef, {
    ...profileData,
    referralCode: generateReferralCode(uid), // User's own referral code
    referredBy: referralCode || null, // Who referred them
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    followers: [],
    following: [],
    postsCount: 0,
    title: 'Travel Enthusiast',
    isVerified: false,
    // Onboarding fields
    onboardingCompleted: false,
    travelerType: null,
    destinationInterests: [],
    travelBio: '',
    preferences: {
      notifications: true,
      theme: 'light'
    }
  });

  // Track referral if code was provided
  if (referralCode) {
    try {
      await trackReferral(referralCode, uid);
      console.log('Referral tracked for new user:', uid);
    } catch (error) {
      console.error('Error tracking referral:', error);
    }
  }
};

// Update onboarding profile data
const updateOnboardingProfile = async (onboardingData) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user');

    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      ...onboardingData,
      onboardingCompleted: true,
      onboardingCompletedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating onboarding profile:", error);
    throw error;
  }
};


// Email signup
const signUpWithEmail = async (email, password, displayName, selectedAvatar, referralCode = null) => {
  try {
    // Validate inputs
    if (!email || !password || !displayName) {
      throw new Error('All fields are required');
    }
    let avatarUrl = '';
    if (typeof selectedAvatar === 'string') {
      avatarUrl = selectedAvatar;
    } else {
      // Fallback to random Google avatar if invalid
      avatarUrl = GOOGLE_AVATAR_OPTIONS[
        Math.floor(Math.random() * GOOGLE_AVATAR_OPTIONS.length)
      ];
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      .catch(error => {
        // Handle specific Firebase errors
        if (error.code === 'auth/email-already-in-use') {
          throw new Error('Email already in use. Please sign in instead.');
        } else if (error.code === 'auth/weak-password') {
          throw new Error('Password should be at least 6 characters');
        } else if (error.code === 'auth/network-request-failed') {
          throw new Error('Network error. Please check your internet connection.');
        } else {
          throw new Error('Sign up failed. Please try again later.');
        }
      });

    const user = userCredential.user;

    // Update profile with retry logic
    try {
      await updateProfile(user, {
        displayName,
        photoURL: avatarUrl
      });
    } catch (profileError) {
      console.warn("Profile update failed, continuing:", profileError);
    }

    await createUserProfile(user.uid, {
      uid: user.uid,
      displayName,
      email,
      photoURL: avatarUrl,
      authProvider: "email",
      emailVerified: user.emailVerified
    }, referralCode);

    await initializeUserGamification(user.uid);

    await updateUserQPs(user.uid, QP_VALUES.PROFILE_COMPLETE, 'QP_PROFILE_COMPLETE');

    // Complete referral if applicable
    if (referralCode) {
      const { completeReferralIfApplicable } = await import('./qpService');
      await completeReferralIfApplicable(user.uid);
    }


    return user;
  } catch (error) {
    console.error("Auth error:", error);
    throw error;
  }
};
// Google signin/signup
const signInWithGoogle = async () => {
  try {
    const googleProvider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Check if user exists in database
    const userDoc = await getDoc(doc(db, "users", user.uid));

    // If user doesn't exist, create a new document
    if (!userDoc.exists()) {
      // Check for referral code in URL (will be passed from frontend)
      const urlParams = new URLSearchParams(window.location?.search || '');
      const referralCode = urlParams.get('ref');

      await createUserProfile(user.uid, {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        authProvider: "google",
        emailVerified: user.emailVerified
      }, referralCode);

      await initializeUserGamification(user.uid);
      await updateUserQPs(user.uid, QP_VALUES.PROFILE_COMPLETE, 'QP_PROFILE_COMPLETE');

      // Complete referral if applicable
      if (referralCode) {
        const { completeReferralIfApplicable } = await import('./qpService');
        await completeReferralIfApplicable(user.uid);
      }
    }


    return user;
  } catch (error) {
    console.error("Error signing in with Google:", error);
    throw error;
  }
};

// Phone number - verify code and sign in
const verifyPhoneCode = async (verificationCode, displayName) => {
  try {
    if (!window.confirmationResult) {
      throw new Error("No verification was sent. Please request a verification code first.");
    }

    const confirmationResult = window.confirmationResult;
    const userCredential = await confirmationResult.confirm(verificationCode);
    const user = userCredential.user;

    // Generate a default display name if not provided
    const finalDisplayName = displayName || `User${user.uid.substring(0, 5)}`;

    // Update Firebase auth profile if displayName was provided
    if (displayName) {
      await updateProfile(user, { displayName: finalDisplayName });
    }

    // Check if user exists in database
    const userDoc = await getDoc(doc(db, "users", user.uid));

    // If user doesn't exist, create a new document
    if (!userDoc.exists()) {
      // Check for referral code in URL (will be passed from frontend)
      const urlParams = new URLSearchParams(window.location?.search || '');
      const referralCode = urlParams.get('ref');

      await createUserProfile(user.uid, {
        uid: user.uid,
        displayName: finalDisplayName,
        phoneNumber: user.phoneNumber,
        authProvider: "phone",
        emailVerified: false
      }, referralCode);

      await initializeUserGamification(user.uid);
      await updateUserQPs(user.uid, QP_VALUES.PROFILE_COMPLETE, 'QP_PROFILE_COMPLETE');

      // Complete referral if applicable
      if (referralCode) {
        const { completeReferralIfApplicable } = await import('./qpService');
        await completeReferralIfApplicable(user.uid);
      }
    }

    return user;
  } catch (error) {
    console.error("Error verifying code:", error);
    throw error;
  }
};

// Update user profile data
const updateUserProfile = async (uid, profileData) => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      ...profileData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
};

// Send password reset email
const sendPasswordReset = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true, message: 'Password reset email sent successfully' };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

// Update password (requires re-authentication for email users)
const changePassword = async (currentPassword, newPassword) => {
  try {
    const user = auth.currentUser;
    if (!user || !user.email) {
      throw new Error('No authenticated user or user is not email-based');
    }

    // Re-authenticate user before password change
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    // Update password
    await firebaseUpdatePassword(user, newPassword);
    return { success: true, message: 'Password updated successfully' };
  } catch (error) {
    console.error('Error updating password:', error);
    throw error;
  }
};

// Soft delete account - schedules deletion for 30 days
const scheduleAccountDeletion = async () => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user');

    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 30);

    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      isScheduledForDeletion: true,
      scheduledDeletionDate: deletionDate,
      deletionRequestedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Sign out user after scheduling deletion
    await auth.signOut();
    return { success: true, deletionDate: deletionDate.toISOString() };
  } catch (error) {
    console.error('Error scheduling account deletion:', error);
    throw error;
  }
};

// Cancel scheduled account deletion
const cancelAccountDeletion = async () => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user');

    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      isScheduledForDeletion: false,
      scheduledDeletionDate: null,
      deletionRequestedAt: null,
      updatedAt: serverTimestamp()
    });

    return { success: true, message: 'Account deletion cancelled' };
  } catch (error) {
    console.error('Error cancelling account deletion:', error);
    throw error;
  }
};

// Check if account is scheduled for deletion
const checkDeletionStatus = async (uid) => {
  try {
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) return null;

    const data = userDoc.data();
    return {
      isScheduledForDeletion: data.isScheduledForDeletion || false,
      scheduledDeletionDate: data.scheduledDeletionDate?.toDate?.() || data.scheduledDeletionDate || null,
      deletionRequestedAt: data.deletionRequestedAt?.toDate?.() || data.deletionRequestedAt || null
    };
  } catch (error) {
    console.error('Error checking deletion status:', error);
    throw error;
  }
};

// Generate a 6-digit verification code
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send email verification code (stores in Firestore, email sent via Cloud Function trigger)
const sendEmailVerificationCode = async (email) => {
  try {
    const code = generateVerificationCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minute expiry

    // Store verification code in Firestore
    const verificationRef = doc(db, 'emailVerifications', email.toLowerCase());
    await setDoc(verificationRef, {
      code,
      email: email.toLowerCase(),
      expiresAt,
      createdAt: serverTimestamp(),
      verified: false,
      attempts: 0
    });

    // The Cloud Function will listen to this document and send the email
    return { success: true, message: 'Verification code sent to your email' };
  } catch (error) {
    console.error('Error sending verification code:', error);
    throw error;
  }
};

// Verify the email code
const verifyEmailCode = async (email, code) => {
  try {
    const verificationRef = doc(db, 'emailVerifications', email.toLowerCase());
    const verificationDoc = await getDoc(verificationRef);

    if (!verificationDoc.exists()) {
      throw new Error('No verification code found. Please request a new one.');
    }

    const data = verificationDoc.data();

    // Check if code has expired
    const expiresAt = data.expiresAt?.toDate?.() || new Date(data.expiresAt);
    if (new Date() > expiresAt) {
      throw new Error('Verification code has expired. Please request a new one.');
    }

    // Check attempts (max 5)
    if (data.attempts >= 5) {
      throw new Error('Too many attempts. Please request a new code.');
    }

    // Update attempts
    await updateDoc(verificationRef, {
      attempts: data.attempts + 1
    });

    // Verify code
    if (data.code !== code) {
      throw new Error('Invalid verification code. Please try again.');
    }

    // Mark as verified
    await updateDoc(verificationRef, {
      verified: true,
      verifiedAt: serverTimestamp()
    });

    return { success: true, message: 'Email verified successfully' };
  } catch (error) {
    console.error('Error verifying code:', error);
    throw error;
  }
};

// Check if email is verified
const isEmailVerified = async (email) => {
  try {
    const verificationRef = doc(db, 'emailVerifications', email.toLowerCase());
    const verificationDoc = await getDoc(verificationRef);

    if (!verificationDoc.exists()) return false;

    return verificationDoc.data().verified === true;
  } catch (error) {
    console.error('Error checking verification status:', error);
    return false;
  }
};

export {
  signUpWithEmail,
  signInWithEmail,
  signInWithGoogle,
  sendPhoneVerificationCode,
  verifyPhoneCode,
  signOut,
  getCurrentUserData,
  updateUserProfile,
  updateOnboardingProfile,
  createUserProfile,
  updateProfileInfo,
  uploadProfilePicture,
  uploadBackgroundPicture,
  sendPasswordReset,
  changePassword,
  scheduleAccountDeletion,
  cancelAccountDeletion,
  checkDeletionStatus,
  sendEmailVerificationCode,
  verifyEmailCode,
  isEmailVerified
};