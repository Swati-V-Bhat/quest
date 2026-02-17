'use client';

import React, { useState, useEffect, Key, useRef } from 'react';
import { Plus, MessageCircle, Heart, Bookmark, Search, MoreHorizontal, X, Send, Share2, Flag, Trash2, Edit, Copy, BookmarkCheck, Home, Calendar, User, Bell, Mail, Settings, LogOut, UserPlus, UserCheck } from 'lucide-react';
import { subscribeToPosts, addComment, sharePost, reportPost, deletePost, savePost, unsavePost } from '@/lib/postService';
import { followUser as followUserService, unfollowUser as unfollowUserService, getFollowingList } from '@/lib/followService';
import { getCurrentUserData } from '@/lib/authService';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import CreatePostModal from '@/components/Home/CreatePostModal';
import PostCard from '@/components/Home/PostCard';
import { User as UserType, Post } from '@/app/types/index';
import Header from '@/components/phoneComponents/header';
import Footer from '@/components/phoneComponents/Footer';
import useResponsive from '@/hooks/useResponsive';
import { collection, query, orderBy, onSnapshot, updateDoc, doc as firestoreDoc, arrayUnion, arrayRemove, increment, getDocs } from 'firebase/firestore';
import { getDoc, doc } from 'firebase/firestore';
import { FaPlus, FaHeart, FaHeartbeat, FaRegCommentDots, FaShareSquare, FaBookmark, FaRegBookmark } from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import { QuestFeedGrid } from '@/components/quest/QuestFeedCard';
import questService from '@/lib/questService';
import { MobileQuestPostCard, QuestPostCard } from '@/components/Home/QuestPostCard';
import { getPaginatedPosts } from '../../../lib/postService';
import NavBar from '@/components/LeftSideNav';

const DESKTOP_MAIN_WIDTH = 40; // percentage of viewport width
const LEFT_NAV_WIDTH = 280;
const RIGHT_SIDEBAR_WIDTH = 380;
const SIDEBAR_GAP = 2;

const TRIP_BANNER_SRC = '/green_modern_travel_banner.svg';
const AI_PLANNER_BANNER_SRC = '/aiTripPlanner.svg';
import CommentModal from '@/components/Home/CommentModal';
import EditPostModal from '@/components/Home/EditPostModal';
import MobilePostMenu from '@/components/Home/PostMenu';
import { getLevelInfo, getUserBadges } from '@/lib/firebaseSerive';
import CommentSection from '@/components/feed/CommentSection';
import LazyImage from '@/components/LazyImage';


// Helper function to generate username from display name
const generateUsername = (displayName: string | null | undefined, username?: string): string => {
  if (username) return username;
  if (!displayName) return 'user';
  return displayName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9_]/g, '');
};

// Create Post Trigger Component
const CreatePostTrigger = ({ user }: { user: UserType | null }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);

  if (!user) return null;


  return (
    <>
      <div className="px-4 py-4 border-b border-gray-700">
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 flex items-center gap-3 hover:bg-gray-700 transition-colors"
        >
          <Plus className="text-[#F7CEB0] w-5 h-5 shrink-0" />
          <span className="text-gray-300 text-sm md:text-base">What's on your mind?</span>
        </button>
      </div>

      {showCreateModal && user && (
        <CreatePostModal
          onClose={() => setShowCreateModal(false)}
          user={user}
        />
      )}
    </>
  );
};

// Responsive wrapper
const ResponsiveFeedPage = () => {
  const isDesktop = useResponsive(768);

  if (isDesktop) {
    return <Feed />;
  }

  return <MobileFeedPage />;
};

// RIGHT SIDEBAR
const FeedRightSidebar = ({ user, userData, style }: any) => {
  const [badges, setBadges] = useState<any[]>([]);
  const [levelInfo, setLevelInfo] = useState<any>(null);
  const [popularUsers, setPopularUsers] = useState<any[]>([]);
  const [followingList, setFollowingList] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.uid) return;

      try {
        const userBadges = await getUserBadges(user.uid);
        setBadges(userBadges.slice(0, 3));

        const xp = userData?.totalXP || 0;
        const level = getLevelInfo(xp);
        setLevelInfo(level);

        // Get following list
        const following = await getFollowingList(user.uid);
        setFollowingList(following);
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, [user, userData]);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, 'users'), orderBy('followersCount', 'desc')),
      (snapshot) => {
        const usersData = snapshot.docs
          .map(docc => ({
            id: docc.id,
            ...docc.data(),
            photoURL: docc.data().photoURL || '/default-avatar.png',
            followers: docc.data().followers || [],
            followersCount: docc.data().followersCount || 0
          }))
          .filter(u => u.id !== user?.uid); // Don't show yourself

        setPopularUsers(usersData.slice(0, 4));
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const handleFollow = async (targetUserId: string) => {
    if (!user?.uid || targetUserId === user.uid) return;

    try {
      const isFollowing = followingList.includes(targetUserId);

      // Optimistically update UI
      setFollowingList(prev =>
        isFollowing
          ? prev.filter(id => id !== targetUserId)
          : [...prev, targetUserId]
      );

      if (isFollowing) {
        await unfollowUserService(user.uid, targetUserId);
      } else {
        await followUserService(user.uid, targetUserId);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      // Revert optimistic update
      const following = await getFollowingList(user.uid);
      setFollowingList(following);
    }
  };

  return (
    <div className="hidden xl:block fixed top-0 h-screen border-l border-gray-700 bg-black p-4 overflow-y-auto" style={style}>
      {/* User Profile Card */}
      <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden mb-4">
        <div className="h-24 bg-gradient-to-r from-[#F7CEB0] to-[#EA6100]"></div>

        <div className="px-4 pb-4">
          <img
            src={user?.photoURL || '/default-avatar.png'}
            alt={user?.displayName}
            className="w-20 h-20 rounded-full border-4 border-gray-900 -mt-10 mb-3 object-cover cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => router.push(`/profile/${user?.uid}`)}
          />

          <h3 className="text-white text-lg font-bold mb-1 cursor-pointer hover:underline" onClick={() => router.push(`/profile/${user?.uid}`)}>
            {user?.displayName || 'User'}
          </h3>
          <p className="text-gray-400 text-sm mb-3">
            @{generateUsername(user?.displayName, (userData as any)?.username)}
          </p>

          {userData?.bio && (
            <p className="text-gray-300 text-sm mb-3 line-clamp-2">
              {userData.bio}
            </p>
          )}

          {/* Stats */}
          <div className="flex gap-4 mb-4">
            <div>
              <span className="text-white font-bold">{userData?.followingCount || 0}</span>
              <span className="text-gray-400 text-sm ml-1">Following</span>
            </div>
            <div>
              <span className="text-white font-bold">{userData?.followersCount || 0}</span>
              <span className="text-gray-400 text-sm ml-1">Followers</span>
            </div>
          </div>

          {/* Level Progress */}
          {levelInfo && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#F7CEB0] font-medium text-sm">
                  {levelInfo.currentLevel.name}
                </span>
                {levelInfo.nextLevel && (
                  <span className="text-gray-400 text-xs">
                    {levelInfo.xpToNext} XP to {levelInfo.nextLevel.name}
                  </span>
                )}
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-[#F7CEB0] to-[#EA6100] h-2 rounded-full transition-all"
                  style={{ width: `${(levelInfo.progress || 0) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Badges */}
          {badges.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-white font-medium text-sm">Earned Badges</h4>
                <button
                  onClick={() => router.push(`/profile/${user?.uid}#badges`)}
                  className="text-[#F7CEB0] text-xs hover:underline"
                >
                  View All
                </button>
              </div>
              <div className="flex gap-2">
                {badges.map(badge => (
                  <div
                    key={badge.id}
                    className="bg-[#F8EBE2] rounded-lg p-2 flex flex-col items-center min-w-[70px]"
                    title={badge.description}
                  >
                    <img
                      src={badge.iconUrl}
                      alt={badge.name}
                      className="w-10 h-10 object-contain mb-1"
                    />
                    <span className="text-[#402B09] text-[10px] font-semibold text-center">
                      {badge.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Popular Travelers */}
      <div className="bg-gray-900 rounded-xl border border-gray-700 p-4">
        <h4 className="text-white font-medium text-base mb-4">Popular Travelers</h4>
        <div className="space-y-3">
          {popularUsers.map((traveler) => (
            <div key={traveler.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3 cursor-pointer flex-1 min-w-0" onClick={() => router.push(`/profile/${traveler.id}`)}>
                <img
                  src={traveler.photoURL}
                  alt={traveler.displayName}
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h5 className="text-white text-sm font-medium hover:underline truncate">
                    {traveler.displayName}
                  </h5>
                  <p className="text-gray-400 text-xs truncate">
                    {traveler.followersCount} followers
                  </p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleFollow(traveler.id);
                }}
                className={`text-xs px-3 py-1 rounded-full transition-colors flex-shrink-0 ml-2 ${followingList.includes(traveler.id)
                  ? 'bg-gray-700 text-white hover:bg-gray-600'
                  : 'bg-[#F7CEB0] text-black hover:bg-[#f5c094]'
                  }`}
              >
                {followingList.includes(traveler.id) ? 'Following' : 'Follow'}
              </button>
            </div>
          ))}
        </div>
        <button className="text-[#F7CEB0] text-sm font-medium mt-4 hover:underline w-full text-left">
          Explore more
        </button>
      </div>
    </div>
  );
};



// Share Modal
const ShareModal = ({ post, onClose }: any) => {
  const postUrl = `${window.location.origin}/post/${post.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(postUrl);
    alert('Link copied to clipboard!');
  };

  const handleShare = async (platform: string) => {
    let shareUrl = '';
    const text = encodeURIComponent(post.content?.text || post.text || 'Check out this post!');

    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(postUrl)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${text}%20${encodeURIComponent(postUrl)}`;
        break;
      case 'telegram':
        shareUrl = `https://t.me/share/url?url=${encodeURIComponent(postUrl)}&text=${text}`;
        break;
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-900 rounded-xl w-full max-w-md border border-gray-700 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="text-lg font-bold text-white">Share Post</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-800 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="p-4">
          <div className="bg-gray-800 p-3 rounded-lg mb-4 flex items-center gap-2">
            <input
              type="text"
              value={postUrl}
              readOnly
              className="flex-1 bg-transparent text-gray-300 text-sm outline-none"
            />
            <button
              onClick={handleCopyLink}
              className="bg-[#F7CEB0] text-black px-3 py-1 rounded text-sm font-medium hover:bg-[#f5c094] transition-colors"
            >
              Copy
            </button>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <button
              onClick={() => handleShare('twitter')}
              className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"></path>
                </svg>
              </div>
              <span className="text-xs text-gray-300">Twitter</span>
            </button>

            <button
              onClick={() => handleShare('facebook')}
              className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"></path>
                </svg>
              </div>
              <span className="text-xs text-gray-300">Facebook</span>
            </button>

            <button
              onClick={() => handleShare('whatsapp')}
              className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"></path>
                </svg>
              </div>
              <span className="text-xs text-gray-300">WhatsApp</span>
            </button>

            <button
              onClick={() => handleShare('telegram')}
              className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <div className="w-12 h-12 bg-blue-400 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"></path>
                </svg>
              </div>
              <span className="text-xs text-gray-300">Telegram</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


// DESKTOP FEED COMPONENT
const Feed = () => {
  const [user, setUser] = useState<UserType | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [selectedPostForMenu, setSelectedPostForMenu] = useState<any>(null);
  const [selectedPostForShare, setSelectedPostForShare] = useState<any>(null);
  const [selectedPostForComments, setSelectedPostForComments] = useState<any>(null);
  const [selectedPostForEdit, setSelectedPostForEdit] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [menuAnchorRef, setMenuAnchorRef] = useState<HTMLButtonElement | null>(null);
  const router = useRouter();

  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [followingList, setFollowingList] = useState<string[]>([]);
  const isShowingSearchResults = searchPerformed && searchQuery.trim().length > 0;

  // Banner carousel state
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [bannersLoaded, setBannersLoaded] = useState(false);
  const banners = [
    AI_PLANNER_BANNER_SRC,
    TRIP_BANNER_SRC
  ];

  // Preload banners
  useEffect(() => {
    let loadedCount = 0;
    const totalBanners = banners.length;

    banners.forEach((banner) => {
      const img = new Image();
      img.src = banner;
      img.onload = () => {
        loadedCount++;
        if (loadedCount === totalBanners) setBannersLoaded(true);
      };
      img.onerror = () => {
        console.error('Failed to preload banner:', banner);
        loadedCount++;
        if (loadedCount === totalBanners) setBannersLoaded(true);
      };
    });
  }, []);

  // Auto-rotation
  useEffect(() => {
    if (!bannersLoaded) return;
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
    }, 10000); // 10 seconds
    return () => clearInterval(interval);
  }, [banners.length, bannersLoaded]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser({
          uid: currentUser.uid,
          displayName: currentUser.displayName ?? undefined,
          email: currentUser.email ?? undefined,
          photoURL: currentUser.photoURL ?? undefined
        });
        setLoading(false); // Show UI immediately after auth

        // Start loading posts immediately (parallel with user data)
        loadInitialPosts();

        try {
          // Fetch user data and following list in parallel
          const [userDetails, following] = await Promise.all([
            getCurrentUserData(),
            getFollowingList(currentUser.uid)
          ]);

          setUserData(userDetails);
          setFollowingList(following);

          // Update saved status once we have userData
          if ((userDetails as any)?.savedPosts) {
            setPosts(prev => prev.map(post => ({
              ...post,
              isSaved: (userDetails as any).savedPosts.includes(post.id) || false
            })));
          }

          // Check for missing username and redirect
          if ((userDetails as any) && !(userDetails as any).username) {
            router.replace('/onboarding/username');
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        setUser(null);
        setUserData(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const withSavedStatus = (incomingPosts: any[]) =>
    incomingPosts.map((post) => ({
      ...post,
      isSaved: userData?.savedPosts?.includes(post.id) || false,
    }));

  const resetSearch = () => {
    setSearchPerformed(false);
    setSearchResults([]);
  };

  const handleNameSearch = async () => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) {
      resetSearch();
      return;
    }

    try {
      setSearchLoading(true);
      const result = await getPaginatedPosts(null, 50);
      const normalizedQuery = trimmedQuery.toLowerCase();
      const matches = result.posts.filter((post) => {
        const authorName = post.author?.name || post.userName || post.metadata?.authorName || '';
        return authorName.toLowerCase().includes(normalizedQuery);
      });

      setSearchResults(withSavedStatus(matches));
      setSearchPerformed(true);
    } catch (error) {
      console.error('Error searching posts by name:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  // Move loadInitialPosts to component scope so it can be called from callbacks
  const loadInitialPosts = async (savedPosts?: string[]) => {
    try {
      setInitialLoading(true);
      const result = await getPaginatedPosts(null, 5);

      // Use passed savedPosts or current userData
      const saved = savedPosts || userData?.savedPosts || [];
      const postsWithSavedStatus = result.posts.map((post: any) => ({
        ...post,
        isSaved: saved.includes(post.id) || false,
      }));

      setPosts(postsWithSavedStatus);
      setLastVisible(result.lastVisible);
      setHasMore(result.hasMore);
    } catch (error) {
      console.error('Error loading initial posts:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const loadMorePosts = async () => {
    if (!hasMore || loadingMore || !lastVisible) return;

    try {
      setLoadingMore(true);
      const result = await getPaginatedPosts(lastVisible, 5);

      const postsWithSavedStatus = withSavedStatus(result.posts);

      setPosts(prev => [...prev, ...postsWithSavedStatus]);
      setLastVisible(result.lastVisible);
      setHasMore(result.hasMore);
    } catch (error) {
      console.error('Error loading more posts:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMorePosts();
        }
      },
      { threshold: 0.1 }
    );

    const sentinel = document.getElementById('scroll-sentinel');
    if (sentinel) {
      observer.observe(sentinel);
    }

    return () => {
      if (sentinel) {
        observer.unobserve(sentinel);
      }
    };
  }, [hasMore, loadingMore, lastVisible]);

  const handleLike = async (postId: string) => {
    if (!user?.uid) return;

    try {
      const post = posts.find(p => p.id === postId);
      if (!post) return;

      const isLiked = post.stats?.likedBy?.includes(user.uid);
      const postRef = firestoreDoc(db, 'posts', postId);

      setPosts(prev => prev.map(p =>
        p.id === postId
          ? {
            ...p,
            stats: {
              ...p.stats,
              likes: isLiked ? p.stats.likes - 1 : p.stats.likes + 1,
              likedBy: isLiked
                ? p.stats.likedBy.filter((uid: string) => uid !== user.uid)
                : [...p.stats.likedBy, user.uid]
            }
          }
          : p
      ));

      if (isLiked) {
        await updateDoc(postRef, {
          likedBy: arrayRemove(user.uid),
          likeCount: increment(-1)
        });

        // Recalculate engagement score
        const updatedPost = await getDoc(postRef);
        if (updatedPost.exists()) {
          const data = updatedPost.data();
          const { calculateEngagementScore } = await import('@/lib/engagementService');
          const newScore = calculateEngagementScore(
            data.likeCount || 0,
            data.commentCount || 0,
            data.shareCount || 0
          );
          await updateDoc(postRef, { engagementScore: newScore });
        }
      } else {
        await updateDoc(postRef, {
          likedBy: arrayUnion(user.uid),
          likeCount: increment(1)
        });

        // Recalculate engagement score
        const updatedPost = await getDoc(postRef);
        if (updatedPost.exists()) {
          const data = updatedPost.data();
          const { calculateEngagementScore } = await import('@/lib/engagementService');
          const newScore = calculateEngagementScore(
            data.likeCount || 0,
            data.commentCount || 0,
            data.shareCount || 0
          );
          await updateDoc(postRef, { engagementScore: newScore });
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      const postDoc = await getDoc(firestoreDoc(db, 'posts', postId));
      if (postDoc.exists()) {
        const data = postDoc.data();
        setPosts(prev => prev.map(p =>
          p.id === postId
            ? {
              ...p,
              stats: {
                ...p.stats,
                likes: data.likeCount || 0,
                likedBy: data.likedBy || []
              }
            }
            : p
        ));
      }
    }
  };

  const handleSave = async (postId: string) => {
    if (!user?.uid) return;

    try {
      const post = posts.find(p => p.id === postId);
      const isSaved = post?.isSaved;

      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, isSaved: !isSaved } : p
      ));

      if (isSaved) {
        await unsavePost(postId, user.uid);
      } else {
        await savePost(postId, user.uid);
      }
    } catch (error) {
      console.error('Error toggling save:', error);
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, isSaved: !p.isSaved } : p
      ));
    }
  };

  const handleShare = async (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (post) {
      setSelectedPostForShare(post);

      if (user?.uid) {
        try {
          await sharePost(postId, user.uid);
          setPosts(prev => prev.map(p =>
            p.id === postId
              ? { ...p, stats: { ...p.stats, shares: (p.stats.shares || 0) + 1 } }
              : p
          ));
        } catch (error) {
          console.error('Error sharing post:', error);
        }
      }
    }
  };

  const handleCommentSubmit = async (postId: string, commentText: string) => {
    if (!user?.uid || !commentText.trim()) return;

    try {
      await addComment(postId, {
        uid: user.uid,
        userName: user.displayName || 'Anonymous',
        userProfilePic: user.photoURL || '',
        text: commentText.trim(),
        createdAt: new Date()
      });

      setPosts(prev => prev.map(post =>
        post.id === postId
          ? {
            ...post,
            stats: {
              ...post.stats,
              comments: (post.stats.comments || 0) + 1
            }
          }
          : post
      ));

      const postRef = firestoreDoc(db, 'posts', postId);
      const postDoc = await getDoc(postRef);
      if (postDoc.exists()) {
        const data = postDoc.data();
        setPosts(prev => prev.map(post =>
          post.id === postId
            ? {
              ...post,
              stats: {
                ...post.stats,
                comments: data.commentCount || 0
              }
            }
            : post
        ));
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      setPosts(prev => prev.map(post =>
        post.id === postId
          ? {
            ...post,
            stats: {
              ...post.stats,
              comments: Math.max(0, (post.stats.comments || 1) - 1)
            }
          }
          : post
      ));
    }
  };

  // 🔥 ADD THIS ENTIRE FUNCTION
  const handleFollow = async (targetUserId: string) => {
    if (!user?.uid || !targetUserId || targetUserId === user.uid) {
      console.error('Invalid follow attempt', {
        currentUserId: user?.uid,
        targetUserId
      });
      return;
    }

    try {
      const isFollowing = followingList.includes(targetUserId);

      // Optimistically update UI
      setFollowingList(prev =>
        isFollowing
          ? prev.filter(id => id !== targetUserId)
          : [...prev, targetUserId]
      );

      if (isFollowing) {
        await unfollowUserService(user.uid, targetUserId);
      } else {
        await followUserService(user.uid, targetUserId);
      }

      // Refresh user data to update counts
      const userDetails = await getCurrentUserData();
      setUserData(userDetails);
    } catch (error) {
      console.error('Error toggling follow:', error);
      // Revert optimistic update
      const following = await getFollowingList(user.uid);
      setFollowingList(following);
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = new Date(timestamp.seconds * 1000);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      router.push('/');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const totalFixedWidth = LEFT_NAV_WIDTH + RIGHT_SIDEBAR_WIDTH + SIDEBAR_GAP * 2;
  const containerStartExpression = `calc((100vw - (${totalFixedWidth}px + ${DESKTOP_MAIN_WIDTH}vw)) / 2)`;
  const mainLeftExpression = `calc(${containerStartExpression} + ${LEFT_NAV_WIDTH + SIDEBAR_GAP}px)`;
  const rightSidebarLeftExpression = `calc(${containerStartExpression} + ${LEFT_NAV_WIDTH + SIDEBAR_GAP}px + ${DESKTOP_MAIN_WIDTH}vw + ${SIDEBAR_GAP}px)`;
  const mainWidthStyle: React.CSSProperties = {
    width: `${DESKTOP_MAIN_WIDTH}vw`,
    marginLeft: mainLeftExpression,
    marginRight: 'auto',
  };

  const DesktopPost = ({ post, user }: { post: any, user: UserType | null }) => {
    const isLiked = post.stats?.likedBy?.includes(user?.uid);
    const isSaved = post.isSaved;
    const authorId = post.author?.id || post.uid;
    const isFollowingUser = followingList.includes(authorId);
    const isOwnPost = user?.uid === authorId;

    const postText = post.content?.text || post.text;
    const postImages = post.content?.images || post.photoUrls || [];
    const [currentImageIdx, setCurrentImageIdx] = useState(0);
    const [showQuestComments, setShowQuestComments] = useState(false);
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;

    // Handle Query Params (scrollTo & openComments)
    useEffect(() => {
      if (!posts.length || !searchParams) return;

      const scrollToId = searchParams.get('scrollTo');
      const openComments = searchParams.get('openComments') === 'true';

      if (scrollToId) {
        const element = document.getElementById(`post-${scrollToId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });

          if (openComments) {
            const post = posts.find(p => p.id === scrollToId);
            if (post) {
              setSelectedPostForComments(post);
              // Clear params to prevent reopening on refresh
              window.history.replaceState({}, '', '/feed');
            }
          }
        }
      }
    }, [posts, searchParams]);

    // ... (inside DesktopPost)
    if (post.postType === 'quest_completion' || post.questContext) {
      return (
        <div id={`post-${post.id}`}>
          <QuestPostCard
            post={{
              id: post.id,
              uid: post.author.id,
              userName: post.author.name,
              userProfilePic: post.author.avatar,
              text: post.content.text || '',
              photoUrl: post.content.images?.[0] || '',
              createdAt: post.metadata.createdAt,
              likeCount: post.stats.likes || 0,
              commentCount: post.stats.comments || 0,
              shareCount: post.stats.shares || 0,
              likedBy: post.stats.likedBy || [],
              questContext: post.questContext,
              username: post.author.username // Pass username
            }}
            currentUser={user}
            onLike={() => handleLike(post.id)}
            onComment={() => setShowQuestComments(!showQuestComments)}
            onShare={() => handleShare(post.id)}
            onSave={() => handleSave(post.id)}
            onMenu={(e) => {
              setMenuAnchorRef(e.currentTarget);
              setSelectedPostForMenu(post);
            }}
            isSaved={isSaved}
            followingList={followingList}
            onFollow={handleFollow}
          />
          <div className="px-4 pb-4">
            <CommentSection
              postId={post.id}
              currentUser={user}
              initialCommentCount={post.stats?.comments || 0}
              onCommentAdded={() => loadInitialPosts()}
            />
          </div>
        </div>
      );
    }

    return (
      <article className="border bg-gray-900 mb-4 rounded-xl border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3 flex-1">
            <img
              src={post.author.avatar}
              alt={post.author.name}
              className="w-10 h-10 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => router.push(`/profile/${post.author.id}`)}
            />
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <h3 className="text-base font-medium text-white cursor-pointer hover:underline" onClick={() => router.push(`/profile/${post.author.id}`)}>
                  @{generateUsername(post.author.name, post.author.username)}
                </h3>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-gray-400 text-xs">{formatTime(post.metadata.createdAt)} · {post.metadata.location}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isOwnPost && (
              <button
                onClick={() => handleFollow(authorId)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${isFollowingUser
                  ? 'bg-gray-700 text-white hover:bg-gray-600'
                  : 'bg-[#F7CEB0] text-black hover:bg-[#f5c094]'
                  }`}
              >
                {isFollowingUser ? (
                  <div className="flex items-center gap-1">
                    <UserCheck size={16} />
                    <span>Following</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <UserPlus size={16} />
                    <span>Follow</span>
                  </div>
                )}
              </button>
            )}

            <button
              onClick={(e) => {
                setMenuAnchorRef(e.currentTarget);
                setSelectedPostForMenu(post);
              }}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-800 transition-colors"
            >
              <MoreHorizontal className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {postText && (
          <p className="px-4 pb-3 text-white text-sm">{postText}</p>
        )}

        {postImages && postImages.length > 0 && (
          <div className="px-4 pb-3 relative">
            <LazyImage
              src={postImages[currentImageIdx]?.large || postImages[currentImageIdx]}
              alt={`Post content ${currentImageIdx + 1}`}
              className="w-full rounded-lg object-contain max-h-[500px] bg-gray-800"
            />

            {postImages.length > 1 && (
              <>
                <button
                  onClick={() => setCurrentImageIdx(prev => (prev - 1 + postImages.length) % postImages.length)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-opacity"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                  </svg>
                </button>
                <button
                  onClick={() => setCurrentImageIdx(prev => (prev + 1) % postImages.length)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-opacity"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {postImages.map((_: any, index: number) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full ${index === currentImageIdx ? 'bg-white' : 'bg-white/50'}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <div className="border-t border-gray-700 px-4 py-3">
          <div className="flex items-center gap-6">
            <button
              onClick={() => handleLike(post.id)}
              className={`flex items-center gap-2 transition-colors ${isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
                }`}
            >
              <FaHeart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
              <span className="text-sm font-medium">{post.stats.likes || 0}</span>
            </button>

            <button
              onClick={() => handleCommentSubmit(post.id, '')}
              className="flex items-center gap-2 text-gray-400 hover:text-[#F7CEB0] transition-colors"
            >
              <FaRegCommentDots className="w-5 h-5" />
              <span className="text-sm font-medium">{post.stats.comments || 0}</span>
            </button>

            <button
              onClick={() => handleShare(post.id)}
              className="flex items-center gap-2 text-gray-400 hover:text-[#F7CEB0] transition-colors"
            >
              <FaShareSquare className="w-5 h-5" />
              <span className="text-sm font-medium">{post.stats.shares || 0}</span>
            </button>

            <button
              onClick={() => handleSave(post.id)}
              className={`ml-auto transition-colors ${isSaved ? 'text-[#F7CEB0]' : 'text-gray-400 hover:text-[#F7CEB0]'
                }`}
            >
              {isSaved ? <FaBookmark className="w-5 h-5 fill-current" /> : <FaRegBookmark className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <CommentSection
          postId={post.id}
          currentUser={user}
          initialCommentCount={post.stats?.comments || 0}
          onCommentAdded={() => loadInitialPosts()}
        />
      </article>
    );
  };

  if (loading) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className=" min-h-screen bg-black text-white">
      <NavBar
        user={user}
        onSignOut={handleSignOut}
        style={{
          left: containerStartExpression,
          right: 'auto',
          width: `${LEFT_NAV_WIDTH}px`
        }}
      />

      <main
        className="relative min-h-screen bg-black"
        style={mainWidthStyle}
      >
        <div className="max-w-2xl mx-auto md:border-x border-gray-700 min-h-screen">
          <div className="p-4">
            <div className="space-y-4 mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleNameSearch();
                    }
                  }}
                  placeholder="Search travelers by name..."
                  className="w-full bg-gray-900 text-white pl-12 pr-12 py-3 rounded-full border border-gray-700 focus:ring-2 focus:ring-[#F7CEB0] focus:border-transparent focus:outline-none text-sm md:text-base"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      resetSearch();
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="w-full overflow-hidden relative rounded-xl border border-gray-800">
                {!bannersLoaded ? (
                  <div className="w-full h-32 bg-gray-900 flex items-center justify-center">
                    <div className="text-gray-400 text-sm">Loading...</div>
                  </div>
                ) : (
                  <>
                    <div
                      className="flex transition-transform duration-[2000ms] ease-in-out will-change-transform"
                      style={{
                        width: `${banners.length * 100}%`,
                        transform: `translateX(-${currentBannerIndex * (100 / banners.length)}%)`
                      }}
                    >
                      {banners.map((banner, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => router.push('/quest')}
                          className="relative w-full"
                          style={{ width: `${100 / banners.length}%` }}
                          aria-label="Plan your AI-powered trip"
                        >
                          <img
                            src={banner}
                            alt="Plan your next adventure with AI"
                            className="w-full h-auto object-cover hover:opacity-95 transition-opacity cursor-pointer"
                          />
                        </button>
                      ))}
                    </div>

                    {/* Banner Dots Indicator */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                      {banners.map((_, index) => (
                        <div
                          key={index}
                          className={`w-2 h-2 rounded-full transition-all duration-300 ${index === currentBannerIndex ? 'bg-white scale-110' : 'bg-white/40'
                            }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {isShowingSearchResults ? (
              <>
                {searchLoading ? (
                  <div className="border bg-gray-900 p-6 rounded-xl border-gray-700 text-center">
                    <div className="text-gray-400">Searching travelers...</div>
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((post) => (
                    <DesktopPost key={post.id} post={post} user={user} />
                  ))
                ) : (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-lg">No travelers matched “{searchQuery}”.</div>
                    <div className="text-gray-500 text-sm mt-2">Try a different name.</div>
                  </div>
                )}
              </>
            ) : initialLoading ? (
              <div className="border bg-gray-900 p-6 rounded-xl border-gray-700 text-center">
                <div className="text-gray-400">Loading posts...</div>
              </div>
            ) : (
              <>
                {posts.length > 0 ? (
                  posts.map((post) => (
                    <DesktopPost key={post.id} post={post} user={user} />
                  ))
                ) : (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-lg">No posts yet</div>
                    <div className="text-gray-500 text-sm mt-2">Be the first to share something!</div>
                  </div>
                )}

                {hasMore && (
                  <div id="scroll-sentinel" className="py-4">
                    {loadingMore && (
                      <div className="border bg-gray-900 p-6 rounded-xl border-gray-700 text-center">
                        <div className="text-gray-400">Loading more posts...</div>
                      </div>
                    )}
                  </div>
                )}

                {!hasMore && posts.length > 0 && (
                  <div className="border bg-gray-900 p-6 rounded-xl border-gray-700 text-center">
                    <p className="text-gray-400">You've reached the end!</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <FeedRightSidebar
        user={user}
        userData={userData}
        style={{
          left: rightSidebarLeftExpression,
          right: 'auto',
          width: `${RIGHT_SIDEBAR_WIDTH}px`
        }}
      />



      {selectedPostForMenu && (
        <MobilePostMenu
          post={selectedPostForMenu}
          user={user}
          onClose={() => {
            setSelectedPostForMenu(null);
            setMenuAnchorRef(null);
          }}
          onDelete={() => {
            setPosts(prev => prev.filter(p => p.id !== selectedPostForMenu.id));
            setSelectedPostForMenu(null);
            setMenuAnchorRef(null);
          }}
          onEdit={() => {
            setSelectedPostForEdit(selectedPostForMenu);
            setSelectedPostForMenu(null);
            setMenuAnchorRef(null);
          }}
        />
      )}

      {selectedPostForShare && (
        <ShareModal
          post={selectedPostForShare}
          onClose={() => setSelectedPostForShare(null)}
        />
      )}

      {selectedPostForComments && (
        <CommentModal
          post={selectedPostForComments}
          user={user}
          onClose={() => setSelectedPostForComments(null)}
          onCommentSubmit={handleCommentSubmit}
        />
      )}

      {selectedPostForEdit && user && (
        <EditPostModal
          post={selectedPostForEdit}
          user={user}
          onClose={() => setSelectedPostForEdit(null)}
          onPostUpdated={(updatedPost) => {
            setPosts(prev => prev.map(p => p.id === updatedPost.id ? { ...p, ...updatedPost } : p));
            setSelectedPostForEdit(null);
          }}
        />
      )}
    </div>
  );
};

// Mobile Post Card Component
const MobilePostCard = ({
  post,
  currentUser,
  onLike,
  onComment,
  onSave,
  onShare,
  onMenuClick,
  followingList,
  onFollow
}: any) => {
  const router = useRouter();

  const isLiked = post.likedBy?.includes(currentUser.uid);
  const isSaved = post.isSaved;
  const authorId = post.uid;
  const isFollowingUser = followingList.includes(authorId);
  const isOwnPost = currentUser?.uid === authorId;

  const postImages = post.imageUrls || post.photoUrls || (post.photoUrl ? [post.photoUrl] : []);
  const [currentImageIdx, setCurrentImageIdx] = useState(0);

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };



  if (post.postType === 'quest_completion' || post.questContext) {
    return (
      <>
        <MobileQuestPostCard
          post={{
            id: post.id,
            uid: post.uid,
            userName: post.userName,
            userProfilePic: post.userProfilePic,
            text: post.text || '',
            photoUrl: post.photoUrl || '',
            createdAt: post.createdAt,
            likeCount: post.likeCount || 0,
            commentCount: post.commentCount || 0,
            shareCount: post.shareCount || 0,
            likedBy: post.likedBy || [],
            questContext: post.questContext,
            username: post.username // Pass username
          }}
          currentUser={currentUser}
          onLike={onLike}
          onComment={onComment}
          onShare={onShare}
          onSave={onSave}
          onMenu={onMenuClick}
          isSaved={post.isSaved}
        />


        <div className="p-4">
          <CommentSection
            postId={post.id}
            currentUser={currentUser}
            initialCommentCount={post.commentCount || 0}
          />
        </div>
      </>
    );
  }

  return (
    <article className="border-b border-gray-800 bg-black p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <img
            src={post.userProfilePic || '/default-avatar.png'}
            alt={post.userName}
            className="w-10 h-10 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity shrink-0"
            onClick={() => router.push(`/profile/${post.authorId}`)}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 truncate">
              <h3 className="text-sm font-medium text-white cursor-pointer hover:underline truncate" onClick={() => router.push(`/profile/${post.authorId}`)}>
                @{generateUsername(post.userName, post.username)}
              </h3>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-400 truncate mt-0.5">
              {post.location && (
                <>
                  <span className="truncate max-w-[150px]">
                    {post.location.length > 25 ? `${post.location.slice(0, 25)}...` : post.location}
                  </span>
                  <span>·</span>
                </>
              )}
              <span className="shrink-0">{formatTime(post.createdAt)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isOwnPost && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onFollow(authorId);
              }}
              className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${isFollowingUser
                ? 'bg-gray-700 text-white'
                : 'bg-[#F7CEB0] text-black'
                }`}
            >
              {isFollowingUser ? 'Following' : 'Follow'}
            </button>
          )}

          <button
            onClick={onMenuClick}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-800 transition-colors"
          >
            <MoreHorizontal className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {post.text && (
        <p className="text-white text-sm mb-3">{post.text}</p>
      )}

      {postImages && postImages.length > 0 && (
        <div className="mb-3 relative rounded-lg overflow-hidden">
          <LazyImage
            src={postImages[currentImageIdx]?.large || postImages[currentImageIdx]}
            alt={`Post content ${currentImageIdx + 1}`}
            className="w-full object-contain max-h-[70vh] bg-gray-800"
          />

          {postImages.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setCurrentImageIdx(prev => (prev - 1 + postImages.length) % postImages.length); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-1.5 rounded-full hover:bg-black/70 transition-opacity"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setCurrentImageIdx(prev => (prev + 1) % postImages.length); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-1.5 rounded-full hover:bg-black/70 transition-opacity"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {postImages.map((_: any, index: number) => (
                  <div
                    key={index}
                    className={`w-1.5 h-1.5 rounded-full ${index === currentImageIdx ? 'bg-white' : 'bg-white/50'}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div className="flex items-center pt-2 border-t border-gray-800 gap-3">
        <button
          onClick={onLike}
          className={`flex items-center gap-1 transition-colors ${isLiked ? 'text-red-500' : 'text-gray-400'
            }`}
        >
          <FaHeart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
          <span className="text-xs font-medium">{post.likeCount || 0}</span>
        </button>

        <button
          onClick={onComment}
          className="flex items-center gap-1 text-gray-400 hover:text-[#F7CEB0] transition-colors"
        >
          <FaRegCommentDots className="w-5 h-5" />
          <span className="text-xs font-medium">{post.commentCount || 0}</span>
        </button>

        <button
          onClick={onShare}
          className="flex items-center gap-1 text-gray-400 hover:text-[#F7CEB0] transition-colors"
        >
          <FaShareSquare className="w-5 h-5" />
          <span className="text-xs font-medium">{post.shareCount || 0}</span>
        </button>

        <button
          onClick={onSave}
          className={`ml-auto transition-colors ${isSaved ? 'text-[#F7CEB0]' : 'text-gray-400 hover:text-[#F7CEB0]'
            }`}
        >
          {isSaved ? <FaBookmark className="w-5 h-5 fill-current" /> : <FaRegBookmark className="w-5 h-5" />}
        </button>
      </div>

      <CommentSection
        postId={post.id}
        currentUser={currentUser}
        initialCommentCount={post.commentCount || 0}
      />
    </article>
  );
};

// MOBILE FEED PAGE
const MobileFeedPage = () => {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserType | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [selectedPostForMenu, setSelectedPostForMenu] = useState<any>(null);
  const [selectedPostForShare, setSelectedPostForShare] = useState<any>(null);
  const [selectedPostForEdit, setSelectedPostForEdit] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [followingList, setFollowingList] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Post[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);

  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const isShowingSearchResults = searchPerformed && searchQuery.trim().length > 0;

  // Banner carousel state
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [bannersLoaded, setBannersLoaded] = useState(false);
  const banners = [
    AI_PLANNER_BANNER_SRC,
    TRIP_BANNER_SRC
  ];

  const updateMobileCollections = (postId: string, updater: (post: Post) => Post) => {
    setPosts(prev => prev.map(post => (post.id === postId ? updater(post) : post)));
    setSearchResults(prev => prev.map(post => (post.id === postId ? updater(post) : post)));
  };

  const formatPostForMobile = (post: any) => ({
    id: post.id,
    authorId: post.uid || post.authorId,
    uid: post.uid,
    userName: post.userName || post.author?.name,
    userProfilePic: post.userProfilePic || post.author?.avatar,
    text: post.text || post.content?.text || '',
    photoUrl: post.photoUrl || post.content?.images?.[0] || '',
    imageUrls: post.content?.images || (post.photoUrl ? [post.photoUrl] : []) || [],
    location: post.location || post.metadata?.location || '',
    createdAt: post.createdAt || post.metadata?.createdAt,
    likeCount: post.likeCount ?? post.stats?.likes ?? 0,
    commentCount: post.commentCount ?? post.stats?.comments ?? 0,
    shareCount: post.shareCount ?? post.stats?.shares ?? 0,
    likedBy: post.likedBy || post.stats?.likedBy || [],
    isSaved: userData?.savedPosts?.includes(post.id) || false,
    postType: post.postType || 'regular',
    questData: post.questData || post.questContext || null,
    questContext: post.questContext || null,
    username: post.username || post.author?.username, // Extract username
  });

  const resetSearch = () => {
    setSearchPerformed(false);
    setSearchResults([]);
  };

  const handleMobileNameSearch = async () => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) {
      resetSearch();
      return;
    }

    try {
      setSearchLoading(true);
      const result = await getPaginatedPosts(null, 50);
      const normalizedQuery = trimmedQuery.toLowerCase();
      const matches = result.posts.filter((post) => {
        const authorName = post.author?.name || post.userName || post.metadata?.authorName || '';
        return authorName.toLowerCase().includes(normalizedQuery);
      });

      setSearchResults(matches.map(formatPostForMobile));
      setSearchPerformed(true);
    } catch (error) {
      console.error('Error searching travelers:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        const basicUser = {
          uid: authUser.uid,
          displayName: authUser.displayName ?? 'Anonymous',
          email: authUser.email ?? 'Anonymous',
          photoURL: authUser.photoURL ?? '',
        };
        setUser(basicUser);

        // Start loading posts immediately (parallel with user data)
        try {
          const result = await getPaginatedPosts(null, 5);
          const postsData = result.posts.map(formatPostForMobile);
          setPosts(postsData);
          setLastVisible(result.lastVisible);
          setHasMore(result.hasMore);
        } catch (error) {
          console.error('Error loading initial posts:', error);
        } finally {
          setLoading(false);
        }

        try {
          // Fetch user data and following list in parallel
          const [userDetails, following] = await Promise.all([
            getCurrentUserData(),
            getFollowingList(authUser.uid)
          ]);

          if (userDetails) {
            setUser(userDetails);
            setUserData(userDetails);
          }
          setFollowingList(following);

          // Update saved status once we have userData
          if ((userDetails as any)?.savedPosts) {
            setPosts(prev => prev.map(post => ({
              ...post,
              isSaved: (userDetails as any).savedPosts.includes(post.id) || false
            })));
          }
        } catch (error) {
          console.error('Error getting user data:', error);
        }
      } else {
        setUser(null);
        setUserData(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const loadMorePosts = async () => {
    if (!hasMore || loadingMore || !lastVisible || !user) return;
    try {
      setLoadingMore(true);
      const result = await getPaginatedPosts(lastVisible, 5);
      const postsData = result.posts.map(formatPostForMobile);

      setPosts(prev => [...prev, ...postsData]);
      setLastVisible(result.lastVisible);
      setHasMore(result.hasMore);
    } catch (error) {
      console.error('Error loading more posts:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (isShowingSearchResults) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMorePosts();
        }
      },
      { threshold: 0.1 }
    );

    const sentinel = document.getElementById('mobile-scroll-sentinel');
    if (sentinel) {
      observer.observe(sentinel);
    }

    return () => {
      if (sentinel) {
        observer.unobserve(sentinel);
      }
    };
  }, [hasMore, loadingMore, lastVisible, isShowingSearchResults]);

  const handleLikePost = async (postId: string) => {
    if (!user?.uid) return;

    try {
      const post = posts.find(p => p.id === postId) || searchResults.find(p => p.id === postId);
      if (!post) return;

      const isLiked = post.likedBy?.includes(user.uid);
      const postRef = firestoreDoc(db, 'posts', postId);

      updateMobileCollections(postId, (p) => ({
        ...p,
        likeCount: isLiked ? (p.likeCount || 1) - 1 : (p.likeCount || 0) + 1,
        likedBy: isLiked
          ? (p.likedBy || []).filter((uid: string) => uid !== user.uid)
          : [...(p.likedBy || []), user.uid],
      }));

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
      const postDoc = await getDoc(firestoreDoc(db, 'posts', postId));
      if (postDoc.exists()) {
        const data = postDoc.data();
        updateMobileCollections(postId, (p) => ({
          ...p,
          likeCount: data.likeCount || 0,
          likedBy: data.likedBy || [],
        }));
      }
    }
  };

  const handleSavePost = async (postId: string) => {
    if (!user?.uid) return;

    try {
      const post = posts.find(p => p.id === postId) || searchResults.find(p => p.id === postId);
      const isSaved = post?.isSaved;

      updateMobileCollections(postId, (p) => ({ ...p, isSaved: !isSaved }));

      if (isSaved) {
        await unsavePost(postId, user.uid);
      } else {
        await savePost(postId, user.uid);
      }
    } catch (error) {
      console.error('Error toggling save:', error);
      updateMobileCollections(postId, (p) => ({ ...p, isSaved: !p.isSaved }));
    }
  };

  const handleSharePost = async (postId: string) => {
    const post = posts.find(p => p.id === postId) || searchResults.find(p => p.id === postId);
    if (post) {
      setSelectedPostForShare(post);

      if (user?.uid) {
        try {
          await sharePost(postId, user.uid);
          updateMobileCollections(postId, (p) => ({
            ...p,
            shareCount: (p.shareCount || 0) + 1,
          }));
        } catch (error) {
          console.error('Error sharing post:', error);
        }
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

      updateMobileCollections(postId, (post) => ({
        ...post,
        commentCount: (post.commentCount || 0) + 1,
      }));

      const postRef = firestoreDoc(db, 'posts', postId);
      const postDoc = await getDoc(postRef);
      if (postDoc.exists()) {
        const data = postDoc.data();
        updateMobileCollections(postId, (post) => ({
          ...post,
          commentCount: data.commentCount || 0,
        }));
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      updateMobileCollections(postId, (post) => ({
        ...post,
        commentCount: Math.max(0, (post.commentCount || 1) - 1),
      }));
    }
  };

  // 🔥 ADD THIS ENTIRE FUNCTION
  const handleFollow = async (targetUserId: string) => {
    if (!user?.uid || !targetUserId || targetUserId === user.uid) {
      console.error('Invalid follow attempt', {
        currentUserId: user?.uid,
        targetUserId
      });
      return;
    }

    try {
      const isFollowing = followingList.includes(targetUserId);

      // Optimistically update UI
      setFollowingList(prev =>
        isFollowing
          ? prev.filter(id => id !== targetUserId)
          : [...prev, targetUserId]
      );

      if (isFollowing) {
        await unfollowUserService(user.uid, targetUserId);
      } else {
        await followUserService(user.uid, targetUserId);
      }

      // Silently refresh user data in background
      const userDetails = await getCurrentUserData();
      setUserData(userDetails);
    } catch (error) {
      console.error('Error toggling follow:', error);
      // Revert optimistic update on error
      const following = await getFollowingList(user.uid);
      setFollowingList(following);
    }
  };

  // Preload all banner images and wait for both to load
  useEffect(() => {
    let loadedCount = 0;
    const totalBanners = banners.length;

    const bannerUrls = [AI_PLANNER_BANNER_SRC, TRIP_BANNER_SRC];
    bannerUrls.forEach((banner) => {
      const img = new Image();
      img.src = banner;
      img.onload = () => {
        loadedCount++;
        console.log('Banner preloaded:', banner, `(${loadedCount}/${totalBanners})`);
        if (loadedCount === totalBanners) {
          setBannersLoaded(true);
        }
      };
      img.onerror = () => {
        console.error('Failed to preload banner:', banner);
        loadedCount++;
        if (loadedCount === totalBanners) {
          setBannersLoaded(true);
        }
      };
    });
  }, []);

  // Banner carousel auto-rotation - every 5 seconds
  useEffect(() => {
    if (!bannersLoaded) return;

    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, [banners.length, bannersLoaded]);

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart === null || touchEnd === null) return;

    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance) {
      // Swipe left - next banner
      setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
    } else if (distance < -minSwipeDistance) {
      // Swipe right - previous banner
      setCurrentBannerIndex((prev) => (prev - 1 + banners.length) % banners.length);
    }

    // Reset touch positions
    setTouchStart(null);
    setTouchEnd(null);
  };

  if (!user && !loading) {
    return (
      <div className="w-full min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl mb-4">Please sign in to view the feed</h2>
          <button
            onClick={() => window.location.href = '/auth'}
            className="bg-[#F7CEB0] text-black px-6 py-2 rounded-lg font-medium hover:bg-[#f5c094] transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-black text-white">
        <div className="flex items-center justify-center h-screen">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-black text-white">
      <div className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-md border-b border-gray-700">
        <Header />

        {/* <div className="px-4 py-3">
          <h1 className="text-xl font-medium text-white">
            New day, <span className="text-[#F7CEB0]"> new Quest</span> — let's go!
          </h1>
        </div> */}
      </div>

      {/* <CreatePostTrigger user={user} /> */}

      <div className="px-4 pt-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleMobileNameSearch();
              }
            }}
            placeholder="Search travelers by name..."
            className="w-full bg-gray-900 text-white pl-12 pr-12 py-3 rounded-full border border-gray-800 focus:ring-2 focus:ring-[#F7CEB0] focus:border-transparent focus:outline-none text-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                resetSearch();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="w-screen overflow-hidden relative py-2" style={{ marginLeft: 'calc(-50vw + 50%)', marginRight: 'calc(-50vw + 50%)' }}>
        {!bannersLoaded ? (
          <div className="w-full h-48 bg-black flex items-center justify-center">
            <div className="text-gray-400">Loading banners...</div>
          </div>
        ) : (
          <>
            <div
              className="flex transition-transform duration-[2000ms] ease-in-out will-change-transform"
              style={{
                transform: `translateX(-${currentBannerIndex * 100}vw)`,
                width: `${banners.length * 100}vw`
              }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {banners.map((banner, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => window.location.href = '/quest'}
                  className="shrink-0 flex justify-center items-center bg-black"
                  style={{ width: '100vw', minHeight: '200px' }}
                  aria-label="Plan your AI-powered trip"
                >
                  <img
                    src={banner}
                    alt="Plan your next adventure with AI"
                    className="w-full h-full object-contain hover:opacity-95 transition-opacity cursor-pointer"
                    style={{ maxHeight: '50vh', width: '100%' }}
                    onError={(e) => {
                      console.error('Failed to load banner:', banner, 'at index:', index);
                      e.currentTarget.style.opacity = '0.5';
                    }}
                    onLoad={(e) => {
                      e.currentTarget.style.display = 'block';
                      e.currentTarget.style.opacity = '1';
                    }}
                  />
                </button>
              ))}
            </div>

            {/* Banner Dots Indicator */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
              {banners.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${index === currentBannerIndex ? 'bg-white scale-110' : 'bg-white/40'
                    }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="pb-20">
        {isShowingSearchResults ? (
          searchLoading ? (
            <div className="text-center py-12 px-4">
              <div className="text-gray-400 text-base">Searching travelers...</div>
            </div>
          ) : searchResults.length > 0 ? (
            searchResults.map((post) => (
              <MobilePostCard
                key={post.id}
                post={post}
                currentUser={user!}
                onLike={() => handleLikePost(post.id)}
                onComment={(text: string) => handleAddComment(post.id, text)}
                onSave={() => handleSavePost(post.id)}
                onShare={() => handleSharePost(post.id)}
                onMenuClick={() => setSelectedPostForMenu(post)}
                followingList={followingList}
                onFollow={handleFollow}
              />
            ))
          ) : (
            <div className="text-center py-12 px-4">
              <div className="text-gray-400 text-base">No travelers matched “{searchQuery}”.</div>
              <div className="text-gray-500 text-sm mt-2">Try a different name.</div>
            </div>
          )
        ) : posts.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="text-gray-400 text-base">No posts yet</div>
            <div className="text-gray-500 text-sm mt-2">Be the first to share something!</div>
          </div>
        ) : (
          <>
            {posts.map((post) => (
              <MobilePostCard
                key={post.id}
                post={post}
                currentUser={user!}
                onLike={() => handleLikePost(post.id)}
                onComment={(text: string) => handleAddComment(post.id, text)}
                onSave={() => handleSavePost(post.id)}
                onShare={() => handleSharePost(post.id)}
                onMenuClick={() => setSelectedPostForMenu(post)}
                followingList={followingList}
                onFollow={handleFollow}
              />
            ))}

            {hasMore && (
              <div id="mobile-scroll-sentinel" className="py-4">
                {loadingMore && (
                  <div className="text-center py-4">
                    <div className="text-gray-400 text-sm">Loading more posts...</div>
                  </div>
                )}
              </div>
            )}

            {!hasMore && posts.length > 0 && (
              <div className="text-center py-8 px-4">
                <p className="text-gray-400 text-sm">You've reached the end!</p>
              </div>
            )}
          </>
        )}
      </div>

      {selectedPostForMenu && (
        <MobilePostMenu
          post={selectedPostForMenu}
          user={user}
          onClose={() => setSelectedPostForMenu(null)}
          onDelete={() => {
            setPosts(prev => prev.filter(p => p.id !== selectedPostForMenu.id));
            setSelectedPostForMenu(null);
          }}
          onEdit={() => {
            setSelectedPostForEdit(selectedPostForMenu);
            setSelectedPostForMenu(null);
          }}
        />
      )}

      {selectedPostForShare && (
        <ShareModal
          post={selectedPostForShare}
          onClose={() => setSelectedPostForShare(null)}
        />
      )}

      {selectedPostForEdit && user && (
        <EditPostModal
          post={selectedPostForEdit}
          user={user}
          onClose={() => setSelectedPostForEdit(null)}
          onPostUpdated={(updatedPost) => {
            setPosts(prev => prev.map(p => p.id === updatedPost.id ? { ...p, ...updatedPost } : p));
            setSearchResults(prev => prev.map(p => p.id === updatedPost.id ? { ...p, ...updatedPost } : p));
            setSelectedPostForEdit(null);
          }}
        />
      )}


      <Footer />
    </div>
  );
};

export default ResponsiveFeedPage;