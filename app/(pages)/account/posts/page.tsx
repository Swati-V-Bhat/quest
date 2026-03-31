"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { getUserData } from '@/lib/firebaseSerive';
import { addComment, savePost, unsavePost, sharePost } from '@/lib/postService';
import MobilePostCard from '@/components/Home/MobilePostCard';
import { ArrowLeft } from 'lucide-react';
import { collection, query, where, orderBy, getDocs, doc as firestoreDoc, updateDoc, arrayUnion, arrayRemove, increment, getDoc } from 'firebase/firestore';
import { Post } from '@/app/types';

// Local Post interface removed to use global type from @/app/types

const AllPostsPage = () => {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'your-posts' | 'saved-posts'>('your-posts');
  const [yourPosts, setYourPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPostForMenu, setSelectedPostForMenu] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        try {
          const data = await getUserData(currentUser.uid);
          setUserData(data);

          await fetchUserPosts(currentUser.uid);
          
          if (data?.savedPosts && data.savedPosts.length > 0) {
            await fetchSavedPosts(data.savedPosts);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const fetchUserPosts = async (uid: string) => {
    try {
      const postsRef = collection(db, 'posts');
      const q = query(
        postsRef,
        where('uid', '==', uid),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      const posts: Post[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          uid: data.uid || uid,
          authorId: data.authorId || data.uid || '',
          userName: data.userName || userData?.displayName || 'User',
          userProfilePic: data.userProfilePic || userData?.photoURL || '/default-avatar.png',
          text: data.text || '',
          photoUrl: Array.isArray(data.photoUrl) ? data.photoUrl[0] : data.photoUrl || '',
          createdAt: data.createdAt,
          likeCount: data.likeCount || 0,
          commentCount: data.commentCount || 0,
          shareCount: data.shareCount || 0,
          location: data.location || '',
          likedBy: data.likedBy || [],
          isSaved: userData?.savedPosts?.includes(doc.id) || false,
          postType: data.postType || 'regular',
          questData: data.questData || null,
          questContext: data.questContext || null,
        };
      });
      
      setYourPosts(posts);
    } catch (error) {
      console.error('Error fetching user posts:', error);
    }
  };

  const fetchSavedPosts = async (savedPostIds: string[]) => {
    try {
      const posts: Post[] = [];
      
      for (const postId of savedPostIds) {
        const postDoc = await getDoc(firestoreDoc(db, 'posts', postId));
        if (postDoc.exists()) {
          const data = postDoc.data();
          posts.push({
            id: postDoc.id,
            uid: data.uid || '',
            userName: data.userName || 'User',
            authorId: data.authorId || '',
            userProfilePic: data.userProfilePic || '/default-avatar.png',
            text: data.text || '',
            photoUrl: Array.isArray(data.photoUrl) ? data.photoUrl[0] : data.photoUrl || '',
            createdAt: data.createdAt,
            likeCount: data.likeCount || 0,
            commentCount: data.commentCount || 0,
            shareCount: data.shareCount || 0,
            location: data.location || '',
            likedBy: data.likedBy || [],
            isSaved: true,
            postType: data.postType || 'regular',
            questData: data.questData || null,
            questContext: data.questContext || null,
          });
        }
      }
      
      setSavedPosts(posts);
    } catch (error) {
      console.error('Error fetching saved posts:', error);
    }
  };

  const handleLikePost = async (postId: string) => {
    if (!user?.uid) return;
    
    try {
      const updatePosts = (posts: Post[]) => posts.map(p => {
        if (p.id === postId) {
          const isLiked = p.likedBy?.includes(user.uid);
          return {
            ...p,
            likeCount: isLiked ? (p.likeCount || 0) - 1 : (p.likeCount || 0) + 1,
            likedBy: isLiked 
              ? (p.likedBy || []).filter((uid: string) => uid !== user.uid)
              : [...(p.likedBy || []), user.uid]
          };
        }
        return p;
      });

      setYourPosts(updatePosts);
      setSavedPosts(updatePosts);
      
      const post = [...yourPosts, ...savedPosts].find(p => p.id === postId);
      if (!post) return;
      
      const isLiked = post.likedBy?.includes(user.uid);
      const postRef = firestoreDoc(db, 'posts', postId);
      
      if (isLiked) {
        await updateDoc(postRef, {
          likedBy: arrayRemove(user.uid),
          likeCount: increment(-1)
        });
      } else {
        await updateDoc(postRef, {
          likedBy: arrayUnion(user.uid),
          likeCount: increment(1)
        });
      }
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleSavePost = async (postId: string) => {
    if (!user?.uid) return;
    
    try {
      const updatePosts = (posts: Post[]) => posts.map(p => 
        p.id === postId ? { ...p, isSaved: !p.isSaved } : p
      );

      const post = [...yourPosts, ...savedPosts].find(p => p.id === postId);
      const isSaved = post?.isSaved;

      setYourPosts(updatePosts);
      setSavedPosts(updatePosts);
      
      if (isSaved) {
        await unsavePost(postId, user.uid);
        setSavedPosts(prev => prev.filter(p => p.id !== postId));
      } else {
        await savePost(postId, user.uid);
      }
    } catch (error) {
      console.error('Error toggling save:', error);
    }
  };

  const handleSharePost = async (postId: string) => {
    if (user?.uid) {
      try {
        await sharePost(postId, user.uid);
        
        const updatePosts = (posts: Post[]) => posts.map(p => 
          p.id === postId ? { ...p, shareCount: (p.shareCount || 0) + 1 } : p
        );
        
        setYourPosts(updatePosts);
        setSavedPosts(updatePosts);
      } catch (error) {
        console.error('Error sharing post:', error);
      }
    }
  };

  const handleAddComment = async (postId: string, commentText: string) => {
    if (!user?.uid || !commentText.trim()) return;
    
    try {
      await addComment(postId, {
        uid: user.uid,
        userName: user.displayName || 'Anonymous',
        userProfilePic: user.photoURL || '',
        text: commentText.trim()
      });
      
      const updatePosts = (posts: Post[]) => posts.map(post => 
        post.id === postId ? { ...post, commentCount: (post.commentCount || 0) + 1 } : post
      );

      setYourPosts(updatePosts);
      setSavedPosts(updatePosts);
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#EA6100] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const currentPosts = activeTab === 'your-posts' ? yourPosts : savedPosts;

  return (
    <div className="min-h-screen bg-[#121212]">
      {/* Header */}
      <div className='sticky top-0 z-10 bg-black border-b border-gray-700'>
        <div className='flex items-center gap-4 px-5 py-4'>
          <button 
            onClick={() => router.back()}
            className='text-white hover:text-[#EA6100] transition-colors'
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className='text-2xl font-semibold text-white'>All Posts</h1>
        </div>

        {/* Tabs */}
        <div className='flex gap-2 px-5 pb-3'>
          <button
            onClick={() => setActiveTab('your-posts')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              activeTab === 'your-posts'
                ? 'bg-[#EA6100] text-black'
                : 'bg-[#292929] text-gray-400 hover:bg-[#3a3a3a]'
            }`}
          >
            Your Posts ({yourPosts.length})
          </button>
          <button
            onClick={() => setActiveTab('saved-posts')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              activeTab === 'saved-posts'
                ? 'bg-[#EA6100] text-black'
                : 'bg-[#292929] text-gray-400 hover:bg-[#3a3a3a]'
            }`}
          >
            Saved Posts ({savedPosts.length})
          </button>
        </div>
      </div>

      {/* Posts List */}
      <div className='pb-20'>
        {currentPosts.length > 0 ? (
          currentPosts.map(post => (
            <MobilePostCard
              key={post.id}
              post={post}
              currentUser={user}
              onLike={() => handleLikePost(post.id)}
              onComment={(text) => handleAddComment(post.id, text)}
              onSave={() => handleSavePost(post.id)}
              onShare={() => handleSharePost(post.id)}
              onMenuClick={() => setSelectedPostForMenu(post)}
            />
          ))
        ) : (
          <div className='text-center py-12 px-5'>
            <div className='bg-[#292929] rounded-xl p-8'>
              <p className='text-gray-400 text-lg mb-2'>
                {activeTab === 'your-posts' ? 'No posts yet' : 'No saved posts'}
              </p>
              <p className='text-gray-500 text-sm'>
                {activeTab === 'your-posts' 
                  ? 'Share your first adventure!' 
                  : 'Save posts to view them here'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllPostsPage;