import { db } from './firebase';
import {
  doc,
  updateDoc,
  increment,
  serverTimestamp,
  writeBatch,
  getDoc,
  setDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { notifyFollow } from './notificationService';
import { addXP } from './xpService';

/**
 * Get the list of user IDs that the current user is following
 */
export const getFollowingList = async (userId: string): Promise<string[]> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      return userData.following || [];
    }
    return [];
  } catch (error) {
    console.error('Error getting following list:', error);
    return [];
  }
};

/**
 * Get the list of user IDs that are following the specified user
 */
export const getFollowersList = async (userId: string): Promise<string[]> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      return userData.followers || [];
    }
    return [];
  } catch (error) {
    console.error('Error getting followers list:', error);
    return [];
  }
};

/**
 * Check if currentUser is following targetUser
 */
export const isFollowing = async (currentUserId: string, targetUserId: string): Promise<boolean> => {
  try {
    const followingList = await getFollowingList(currentUserId);
    return followingList.includes(targetUserId);
  } catch (error) {
    console.error('Error checking follow status:', error);
    return false;
  }
};

/**
 * Follow a user - Updates both users' documents with arrays
 */
export const followUser = async (currentUserId: string, targetUserId: string): Promise<{ success: boolean; alreadyFollowing?: boolean }> => {
  try {
    if (!currentUserId || !targetUserId) {
      throw new Error("Both user IDs are required.");
    }

    if (currentUserId === targetUserId) {
      throw new Error("You cannot follow yourself.");
    }

    // Check if already following
    const alreadyFollowing = await isFollowing(currentUserId, targetUserId);
    if (alreadyFollowing) {
      console.log("Already following this user");
      return { success: true, alreadyFollowing: true };
    }

    const batch = writeBatch(db);

    // Update current user's document - add to following array
    const currentUserRef = doc(db, 'users', currentUserId);
    batch.update(currentUserRef, {
      following: arrayUnion(targetUserId),
      followingCount: increment(1),
      updatedAt: serverTimestamp()
    });

    // Update target user's document - add to followers array
    const targetUserRef = doc(db, 'users', targetUserId);
    batch.update(targetUserRef, {
      followers: arrayUnion(currentUserId),
      followersCount: increment(1),
      updatedAt: serverTimestamp()
    });

    // Also maintain subcollections for detailed info
    const followerDocRef = doc(db, 'users', targetUserId, 'followers', currentUserId);
    batch.set(followerDocRef, {
      followedAt: serverTimestamp()
    });

    const followingDocRef = doc(db, 'users', currentUserId, 'following', targetUserId);
    batch.set(followingDocRef, {
      followedAt: serverTimestamp()
    });

    await batch.commit();

    // Award XP
    try {
      await addXP(currentUserId, 'FOLLOW_USER', { targetUserId });
    } catch (e) {
      console.warn('Failed to add XP for following:', e);
    }

    // Notify the followed user (fire-and-forget)
    getDoc(doc(db, 'users', currentUserId)).then((snap) => {
      if (snap.exists()) {
        const d = snap.data();
        notifyFollow(
          currentUserId,
          d.displayName || 'Someone',
          d.photoURL || '',
          targetUserId
        ).catch((e) => console.warn('Follow notification failed (non-fatal):', e));
      }
    }).catch(() => { });

    return { success: true };
  } catch (error) {
    console.error("Error following user:", error);
    throw error;
  }
};

/**
 * Unfollow a user - Updates both users' documents with arrays
 */
export const unfollowUser = async (currentUserId: string, targetUserId: string): Promise<{ success: boolean; notFollowing?: boolean }> => {
  try {
    if (!currentUserId || !targetUserId) {
      throw new Error("Both user IDs are required.");
    }

    if (currentUserId === targetUserId) {
      throw new Error("You cannot unfollow yourself.");
    }

    // Check if currently following
    const currentlyFollowing = await isFollowing(currentUserId, targetUserId);
    if (!currentlyFollowing) {
      console.log("Not following this user");
      return { success: true, notFollowing: true };
    }

    const batch = writeBatch(db);

    // Update current user's document - remove from following array
    const currentUserRef = doc(db, 'users', currentUserId);
    batch.update(currentUserRef, {
      following: arrayRemove(targetUserId),
      followingCount: increment(-1),
      updatedAt: serverTimestamp()
    });

    // Update target user's document - remove from followers array
    const targetUserRef = doc(db, 'users', targetUserId);
    batch.update(targetUserRef, {
      followers: arrayRemove(currentUserId),
      followersCount: increment(-1),
      updatedAt: serverTimestamp()
    });

    // Also remove from subcollections
    const followerDocRef = doc(db, 'users', targetUserId, 'followers', currentUserId);
    batch.delete(followerDocRef);

    const followingDocRef = doc(db, 'users', currentUserId, 'following', targetUserId);
    batch.delete(followingDocRef);

    await batch.commit();

    return { success: true };
  } catch (error) {
    console.error("Error unfollowing user:", error);
    throw error;
  }
};