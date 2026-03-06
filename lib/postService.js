import { db, storage } from './firebase.js';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { compressAndUploadImage } from './imageService';
import { notifyPostLike, notifyFollow, notifyPostComment } from './notificationService';
import { canPerformAction } from './rateLimiter';

import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  increment,
  doc,
  getDoc,
  getDocs,
  where,
  limit,
  startAfter,
  writeBatch,
  deleteDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { addXP } from './xpService';

// Post types
export const POST_TYPES = {
  REGULAR: 'regular',
  EVENT: 'event',
  SPONSORED: 'sponsored',
  QUEST_COMPLETION: 'quest_completion'
};

// Content types for regular posts
export const CONTENT_TYPES = {
  TEXT_ONLY: 'text_only',
  PHOTO_ONLY: 'photo_only',
  PHOTO_WITH_TEXT: 'photo_with_text'
};

// In postService.js

export const createPost = async (postData) => {
  try {
    if (!postData.uid) {
      throw new Error('User ID (uid) is required to create a post.');
    }

    // Rate limit check
    const rateCheck = canPerformAction('CREATE_POST', postData.uid);
    if (!rateCheck.allowed) {
      throw new Error(rateCheck.message || 'Too many posts. Please wait before posting again.');
    }

    let photoUrls = []; // <-- Changed to an array
    let contentType = CONTENT_TYPES.TEXT_ONLY;

    // Handle multiple image uploads
    if (postData.imageFiles && postData.imageFiles.length > 0) {
      // Use Promise.all to upload all images in parallel
      photoUrls = await Promise.all(
        postData.imageFiles.map(file =>
          compressAndUploadImage(
            file,
            'post-images', // Corrected path to match storage.rules
            postData.uid
          )
        )
      );
    }

    // Determine content type based on final content
    const hasText = postData.text && postData.text.trim().length > 0;
    const hasPhotos = photoUrls.length > 0;

    if (hasPhotos && hasText) {
      contentType = CONTENT_TYPES.PHOTO_WITH_TEXT;
    } else if (hasPhotos) {
      contentType = CONTENT_TYPES.PHOTO_ONLY;
    }

    const post = {
      uid: postData.uid,
      userName: postData.userName,
      userProfilePic: postData.userProfilePic,
      text: postData.text || '',
      caption: postData.text || '',

      photoUrl: photoUrls.length > 0 ? photoUrls[0] : (postData.photoUrl || ''), // <-- Keep first image as 'photoUrl' for compatibility
      photoUrls: photoUrls.length > 0 ? photoUrls : (postData.photoUrl ? [postData.photoUrl] : []), // <-- NEW: Save the full array

      postType: postData.postType || POST_TYPES.REGULAR,
      contentType: contentType,
      location: postData.location || null,
      topics: postData.topics || [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
      likedBy: [],
      engagementScore: 0, // Initialize engagement score
      isDeleted: false,
      visibility: postData.visibility || 'public',
      stats: {
        likes: 0,
        likedBy: []
      },
      ...(postData.questContext && { questContext: postData.questContext })
    };

    const docRef = await addDoc(collection(db, 'posts'), post);
    const postId = docRef.id;

    const batch = writeBatch(db);
    const userRef = doc(db, 'users', postData.uid);

    batch.update(userRef, {
      postsCount: increment(1),
      updatedAt: serverTimestamp()
    });

    await batch.commit();

    await addXP(postData.uid, 'CREATE_POST', { postId });
    if (post.postType === POST_TYPES.QUEST_COMPLETION) {
      await addXP(postData.uid, 'COMPLETE_QUEST', {
        postId,
        questId: postData.questContext?.questId || '',
      });
    }

    return { id: postId, ...post, authorId: postData.uid, imageUrls: post.photoUrls };

  } catch (error) {
    console.error("Error creating post:", error);
    throw error;
  }
};


// NEW: Get paginated posts
export const getPaginatedPosts = async (lastDoc = null, limitCount = 5) => {
  try {
    let q;
    const constraints = [
      where('isDeleted', '==', false), // Changed from != true to == false for Firestore constraint
      orderBy('engagementScore', 'desc'), // Sort by engagement instead of recency
      orderBy('createdAt', 'desc'), // Secondary sort for posts with same score
      limit(limitCount)
    ];

    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }

    q = query(collection(db, 'posts'), ...constraints);


    const querySnapshot = await getDocs(q);
    const posts = [];
    let lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1] || null;

    const userCache = new Map();

    for (const docc of querySnapshot.docs) {
      const data = docc.data();
      let authorName = 'Anonymous';
      let authorAvatar = '/default-avatar.png';
      let authorTitle = '';
      let authorUsername = '';

      if (data.uid && userCache.has(data.uid)) {
        const userData = userCache.get(data.uid);
        authorName = userData.displayName;
        authorAvatar = userData.photoURL;
        authorTitle = userData.title;
        authorUsername = userData.username;
      } else if (data.uid) {
        try {
          const userDoc = await getDoc(doc(db, 'users', data.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            authorName = userData.displayName || authorName;
            authorAvatar = userData.photoURL || authorAvatar;
            authorTitle = userData.title || '';
            authorUsername = userData.username || '';
            userCache.set(data.uid, {
              displayName: authorName,
              photoURL: authorAvatar,
              title: authorTitle,
              username: authorUsername
            });
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }

      posts.push({
        id: docc.id,
        authorId: data.uid, // Map uid to authorId
        username: authorUsername, // Add root level username for MobilePostCard
        imageUrls: data.photoUrls || (data.photoUrl ? [data.photoUrl] : []), // Map photoUrls to imageUrls
        author: {
          id: data.uid,
          name: authorName,
          username: authorUsername, // Add author level username for DesktopPost
          avatar: authorAvatar,
          title: data.postType === 'sponsored' ? 'Sponsored' : authorTitle
        },
        content: {
          text: data.text,
          images: data.photoUrls || (data.photoUrl ? [data.photoUrl] : [])
        },
        metadata: {
          location: data.location || '',
          createdAt: data.createdAt
        },
        stats: {
          likes: data.likeCount || 0,
          comments: data.commentCount || 0,
          shares: data.shareCount || 0,
          likedBy: data.likedBy || []
        },
        postType: data.postType,
        ...(data.eventDetails && { eventDetails: data.eventDetails }),
        ...(data.questContext && { questContext: data.questContext }),
      });
    }

    return {
      posts,
      lastVisible,
      hasMore: querySnapshot.docs.length === limitCount
    };
  } catch (error) {
    console.error("Error getting paginated posts:", error);
    throw error;
  }
};

export const savePost = async (postId, uid) => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      savedPosts: arrayUnion(postId)
    });

    return { success: true };
  } catch (error) {
    console.error("Error saving post:", error);
    throw error;
  }
};

export const unsavePost = async (postId, uid) => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      savedPosts: arrayRemove(postId)
    });

    return { success: true };
  } catch (error) {
    console.error("Error unsaving post:", error);
    throw error;
  }
};

export const checkUserSavedPost = async (postId, uid) => {
  try {
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const savedPosts = userDoc.data().savedPosts || [];
      return savedPosts.includes(postId);
    }
    return false;
  } catch (error) {
    console.error("Error checking save status:", error);
    return false;
  }
};

export const getSavedPosts = async (uid) => {
  try {
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return [];
    }

    const savedPostIds = userDoc.data().savedPosts || [];

    if (savedPostIds.length === 0) {
      return [];
    }

    // Fetch posts in parallel
    const postPromises = savedPostIds.map(postId => getDoc(doc(db, 'posts', postId)));
    const postSnapshots = await Promise.all(postPromises);

    const posts = postSnapshots
      .filter(doc => doc.exists() && !doc.data().isDeleted)
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

    return posts;
  } catch (error) {
    console.error("Error getting saved posts:", error);
    throw error;
  }
};

export const sharePost = async (postId, uid) => {
  try {
    // Use centralized counter service (handles engagement score automatically)
    const { incrementShare } = await import('./counterService');
    await incrementShare(postId);

    await addXP(uid, 'SHARE_POST', { postId });

    return { success: true };
  } catch (error) {
    console.error("Error sharing post:", error);
    throw error;
  }
};

/**
 * Toggle like on a post and fire a notification to the post owner (on like only).
 * Returns { liked: boolean, likeCount: number }
 */
export const togglePostLike = async (postId, likerId, likerName, likerPhoto) => {
  try {
    const postRef = doc(db, 'posts', postId);
    const postDoc = await getDoc(postRef);
    if (!postDoc.exists()) throw new Error('Post not found');

    const postData = postDoc.data();
    const likedBy = postData.likedBy || [];
    const isCurrentlyLiked = likedBy.includes(likerId);

    if (isCurrentlyLiked) {
      // Unlike
      await updateDoc(postRef, {
        likedBy: arrayRemove(likerId),
        likeCount: increment(-1),
      });
    } else {
      // Like
      await updateDoc(postRef, {
        likedBy: arrayUnion(likerId),
        likeCount: increment(1),
      });

      // Notify the post author (skip self-likes — notifyPostLike already handles this)
      try {
        await notifyPostLike(postId, postData.uid, likerId, likerName, likerPhoto);
      } catch (e) {
        console.warn('Like notification failed (non-fatal):', e);
      }
    }

    // Recalculate engagement score
    const { calculateEngagementScore } = await import('./engagementService');
    const updated = await getDoc(postRef);
    if (updated.exists()) {
      const d = updated.data();
      const newScore = calculateEngagementScore(d.likeCount || 0, d.commentCount || 0, d.shareCount || 0);
      await updateDoc(postRef, { engagementScore: newScore });
    }

    const final = await getDoc(postRef);
    const d = final.data();
    return { liked: !isCurrentlyLiked, likeCount: d?.likeCount ?? 0 };
  } catch (error) {
    console.error('Error toggling like:', error);
    throw error;
  }
};

export const reportPost = async (postId, uid, reason, description = '') => {
  try {
    const reportsRef = collection(db, 'reports');

    await addDoc(reportsRef, {
      postId,
      reportedBy: uid,
      reason,
      description,
      status: 'pending',
      createdAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error("Error reporting post:", error);
    throw error;
  }
};

export const addComment = async (postId, commentData, commentText) => {
  try {
    const postRef = doc(db, 'posts', postId);
    const commentsRef = collection(postRef, 'comments');

    // Get post data for notification
    const postDoc = await getDoc(postRef);
    if (!postDoc.exists()) {
      throw new Error('Post not found');
    }
    const postData = postDoc.data();

    const comment = {
      uid: commentData.uid,
      userName: commentData.userName,
      userProfilePic: commentData.userProfilePic,
      text: commentData.text,
      createdAt: serverTimestamp(),
      isDeleted: false,
    };

    // Add comment and update counter atomically
    const newCommentRef = doc(commentsRef);
    await addDoc(commentsRef, comment);

    // Use centralized counter service (handles engagement score)
    const { incrementComment } = await import('./counterService');
    await incrementComment(postId);

    // Send notification (don't block on failure)
    const postAuthorId = postData.uid;
    if (postAuthorId !== commentData.uid) {
      try {
        await notifyPostComment(
          postId,
          postAuthorId,
          commentData.uid,
          commentData.userName,
          commentData.userProfilePic,
          commentData.text
        );
      } catch (notifError) {
        console.warn('Failed to send comment notification:', notifError);
      }
    }

    return { id: newCommentRef.id, ...comment };

  } catch (error) {
    console.error("Error adding comment:", error);
    throw error;
  }
};

export const subscribeToPosts = (callback, options = {}) => {
  const {
    limit: queryLimit = 20,
  } = options;

  const q = query(
    collection(db, 'posts'),
    where('isDeleted', '!=', true),
    orderBy('createdAt', 'desc'),
    limit(queryLimit)
  );


  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const posts = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        authorId: data.uid, // Map uid to authorId
        imageUrls: data.photoUrls || (data.photoUrl ? [data.photoUrl] : []), // Map photoUrls to imageUrls
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt, // Ensure serializable date
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      };
    });
    callback(posts);
  }, (error) => {
    console.error("Error in post subscription:", error);
  });

  return unsubscribe;
};




export const getPostsByFilter = async (filters = {}) => {
  try {
    const {
      postType,
      userId,
      contentType,
      location,
      topics = [],
      limit: queryLimit = 20
    } = filters;

    let q = query(
      collection(db, 'posts'),
      orderBy('createdAt', 'desc')
    );

    if (postType) {
      q = query(q, where('postType', '==', postType));
    }

    if (userId) {
      q = query(q, where('uid', '==', userId));
    }

    if (contentType) {
      q = query(q, where('contentType', '==', contentType));
    }

    if (location) {
      q = query(q, where('location', '==', location));
    }

    if (topics.length > 0) {
      q = query(q, where('topics', 'array-contains-any', topics));
    }

    if (queryLimit) {
      q = query(q, limit(queryLimit));
    }

    const querySnapshot = await getDocs(q);
    const posts = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (!data.isDeleted) {
        posts.push({
          id: doc.id,
          ...data,
          authorId: data.uid, // Map uid to authorId
          imageUrls: data.photoUrls || (data.photoUrl ? [data.photoUrl] : []), // Map photoUrls to imageUrls
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        });
      }
    });

    return posts;
  } catch (error) {
    console.error("Error getting posts by filter:", error);
    throw error;
  }
};

export const getTrendingPosts = async (timeframe = '24h', limitCount = 10) => {
  try {
    const now = new Date();
    let startTime;

    switch (timeframe) {
      case '1h':
        startTime = new Date(now.getTime() - (1 * 60 * 60 * 1000));
        break;
      case '24h':
        startTime = new Date(now.getTime() - (24 * 60 * 60 * 1000));
        break;
      case '7d':
        startTime = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        break;
      default:
        startTime = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    }

    const q = query(
      collection(db, 'posts'),
      where('createdAt', '>=', startTime),
      where('isDeleted', '==', false),
      orderBy('createdAt', 'desc'),
      limit(limitCount * 3)
    );

    const querySnapshot = await getDocs(q);
    const posts = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const engagementScore = (data.likeCount || 0) + (data.commentCount || 0) * 2 + (data.shareCount || 0) * 3;

      posts.push({
        id: doc.id,
        ...data,
        authorId: data.uid, // Map uid to authorId
        imageUrls: data.photoUrls || (data.photoUrl ? [data.photoUrl] : []), // Map photoUrls to imageUrls
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
        engagementScore
      });
    });

    return posts
      .sort((a, b) => b.engagementScore - a.engagementScore)
      .slice(0, limitCount);

  } catch (error) {
    console.error("Error getting trending posts:", error);
    throw error;
  }
};

export const joinEvent = async (postId, uid, userData) => {
  try {
    const eventRef = doc(db, 'posts', postId);
    const eventDoc = await getDoc(eventRef);

    if (!eventDoc.exists() || eventDoc.data().postType !== POST_TYPES.EVENT) {
      throw new Error('Event not found');
    }

    const attendeesRef = collection(db, 'posts', postId, 'attendees');
    await addDoc(attendeesRef, {
      uid: uid,
      userName: userData.userName,
      userProfilePic: userData.userProfilePic,
      joinedAt: serverTimestamp()
    });

    await updateDoc(eventRef, {
      attendeesCount: increment(1),
      updatedAt: serverTimestamp()
    });

    await addXP(uid, 'JOIN_EVENT', { postId });

    return { success: true };
  } catch (error) {
    console.error("Error joining event:", error);
    throw error;
  }
};

export const getPostById = async (postId) => {
  try {
    const postRef = doc(db, 'posts', postId);
    const postDoc = await getDoc(postRef);

    if (postDoc.exists()) {
      const data = postDoc.data();
      return {
        id: postDoc.id,
        ...data,
        authorId: data.uid, // Map uid to authorId
        imageUrls: data.photoUrls || (data.photoUrl ? [data.photoUrl] : []), // Map photoUrls to imageUrls
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate()
      };
    }
    return null;
  } catch (error) {
    console.error("Error getting post:", error);
    throw error;
  }
};

export const updatePost = async (postId, updates) => {
  try {
    const postRef = doc(db, 'posts', postId);
    await updateDoc(postRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error("Error updating post:", error);
    throw error;
  }
};

export const deletePost = async (postId, uid) => {
  try {
    const postRef = doc(db, 'posts', postId);
    const postDoc = await getDoc(postRef);

    if (!postDoc.exists()) {
      throw new Error('Post not found');
    }

    const postData = postDoc.data();

    if (postData.uid !== uid) {
      throw new Error('Unauthorized: Only the post author can delete this post');
    }

    await updateDoc(postRef, {
      isDeleted: true,
      updatedAt: serverTimestamp()
    });

    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      postsCount: increment(-1),
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting post:", error);
    throw error;
  }
};
