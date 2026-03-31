"use client";
import React, { CSSProperties, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { getUserData, getUserBadges } from '@/lib/firebaseSerive';
import { getUserGamificationData, calculateRankInfo } from '@/lib/qpService';
import { addComment } from '@/lib/postService';
import { savePost, unsavePost, sharePost } from '@/lib/postService';
import Footer from '@/components/phoneComponents/Footer';

import {
  Settings,
  Edit2,
  Calendar,
  SlidersHorizontal,
  HelpCircle,
  MapPin,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreHorizontal,
  Trophy,
  Award,
  Flame,
  Zap,
  Target,
} from 'lucide-react';
import { FaHeartbeat } from 'react-icons/fa';
import { IoChevronForward } from 'react-icons/io5';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc as firestoreDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  increment,
  getDoc,
} from 'firebase/firestore';
import questService from '@/lib/questService';
import { Quest } from '@/app/types';
import NavBar from '@/components/LeftSideNav';
import {
  followUser as followUserService,
  unfollowUser as unfollowUserService,
  getFollowingList,
} from '@/lib/followService';

// Feed components for interactive posts/quests
import MobilePostCard from '@/components/Home/MobilePostCard';
import { MobileQuestPostCard } from '@/components/Home/QuestPostCard';
import ShareModal from '@/components/Home/ShareModal';
import MobilePostMenu from '@/components/Home/PostMenu';
import EditPostModal from '@/components/Home/EditPostModal';

const DESKTOP_MAIN_WIDTH = 60; // percentage of viewport width used for main content
const LEFT_NAV_WIDTH = 280;
const SIDEBAR_GAP = 5;

const styles = `
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
`;

interface UserData {
  uid: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  backgroundURL?: string;
  title?: string;
  bio?: string;
  postsCount?: number;
  followers?: string[];
  following?: string[];
  totalQPs?: number;
  isVerified?: boolean;
  savedPosts?: string[];
}

interface Badge {
  id: string;
  name: string;
  iconUrl: string;
  description: string;
}

interface Post {
  id: string;
  uid: string;
  authorId: string;
  userName: string;
  userProfilePic: string;
  text: string;
  photoUrl?: string | string[];
  createdAt: any;
  likeCount: number;
  commentCount: number;
  shareCount?: number;
  location?: string;
  likedBy?: string[];
  isSaved?: boolean;
  postType?: string;
  questData?: any;
  questContext?: any;
}

const AccountPage = () => {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [gamificationInfo, setGamificationInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Posts state
  const [yourPosts, setYourPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  // Quests state
  const [myQuests, setMyQuests] = useState<Quest[]>([]);
  const [savedQuests, setSavedQuests] = useState<Quest[]>([]);
  const [loadingQuests, setLoadingQuests] = useState(false);
  const [followingList, setFollowingList] = useState<string[]>([]);

  // Interactive Modal States
  const [selectedPostForMenu, setSelectedPostForMenu] = useState<Post | null>(null);
  const [selectedPostForShare, setSelectedPostForShare] = useState<Post | null>(null);
  const [selectedPostForEdit, setSelectedPostForEdit] = useState<Post | null>(null);

  // New main tab state (Instagram style)
  const [activeMainTab, setActiveMainTab] = useState<'quests' | 'posts' | 'saved'>('quests');
  
  // View More state limiters
  const [visibleQuestsCount, setVisibleQuestsCount] = useState(5);
  const [visiblePostsCount, setVisiblePostsCount] = useState(5);
  const [visibleSavedCount, setVisibleSavedCount] = useState(5);

  const formatQuestAsPost = (quest: any) => {
    return {
      ...quest,
      id: quest.id,
      questData: quest,
      userName: quest.userName || userData?.displayName || 'User',
      userProfilePic: quest.userProfilePic || userData?.photoURL || '/default-avatar.png',
      createdAt: quest.createdAt,
      likeCount: quest.stats?.likes || 0,
      commentCount: quest.stats?.comments || 0,
      likedBy: quest.likedBy || [],
      postType: 'quest_completion',
      text: quest.description || '',
      photoUrl: quest.coverImageUrl || '',
      uid: quest.owner || '',
      authorId: quest.owner || ''
    };
  };

  // Effect 1: Load critical profile data first (shows page immediately)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsLoggedIn(!!currentUser);

      if (currentUser) {
        try {
          // Load only essential profile data to show the page quickly
          const [data, following] = await Promise.all([
            getUserData(currentUser.uid),
            getFollowingList(currentUser.uid)
          ]);

          setUserData(data as UserData);
          setFollowingList(following);
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
      setLoading(false); // ✅ Show page immediately after profile loads
    });

    return () => unsubscribe();
  }, []);

  // Effect 2: Load badges & gamification data after initial render (non-blocking)
  useEffect(() => {
    if (!user) return;

    async function loadSecondaryData() {
      try {
        const [userBadges, gData] = await Promise.all([
          getUserBadges(user.uid),
          getUserGamificationData(user.uid)
        ]);

        setBadges(userBadges.slice(0, 3));
        const rankInfo = calculateRankInfo(gData);
        setGamificationInfo(rankInfo);
      } catch (error) {
        console.error('Error fetching badges/gamification:', error);
      }
    }

    loadSecondaryData();
  }, [user]);

  // Effect 3: Load posts & quests in parallel with deferred execution
  useEffect(() => {
    if (!user || !userData) return;

    // Small delay to prioritize profile render
    const timer = setTimeout(() => {
      // Load posts and quests in parallel (not blocking each other)
      const loadPosts = async () => {
        await fetchUserPosts(user.uid);
        if (userData.savedPosts && userData.savedPosts.length > 0) {
          await fetchSavedPosts(userData.savedPosts);
        }
      };

      const loadQuests = async () => {
        await fetchUserQuests(user.uid);
      };

      // Execute both in parallel
      Promise.all([loadPosts(), loadQuests()]);
    }, 100); // 100ms delay to let profile render first

    return () => clearTimeout(timer);
  }, [user, userData]);

  const fetchUserPosts = async (uid: string) => {
    setLoadingPosts(true);
    try {
      const postsRef = collection(db, 'posts');
      const q = query(
        postsRef,
        where('uid', '==', uid),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);

      const posts: Post[] = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          uid: data.uid || uid,
          authorId: data.authorId || data.uid || uid,
          userName: data.userName || userData?.displayName || 'User',
          userProfilePic: data.userProfilePic || userData?.photoURL || '/default-avatar.png',
          text: data.text || '',
          photoUrl: data.photoUrl || '',
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

      // Filter out quest_completion posts - they should only appear in Quests section
      const normalPosts = posts.filter(post => post.postType !== 'quest_completion');

      setYourPosts(normalPosts);
    } catch (error) {
      console.error('Error fetching user posts:', error);
    } finally {
      setLoadingPosts(false);
    }
  };

  const fetchSavedPosts = async (savedPostIds: string[]) => {
    setLoadingPosts(true);
    try {
      const posts: Post[] = [];

      for (const postId of savedPostIds) {
        const postDoc = await getDoc(firestoreDoc(db, 'posts', postId));
        if (postDoc.exists()) {
          const data = postDoc.data();
          posts.push({
            id: postDoc.id,
            uid: data.uid || '',
            authorId: data.authorId || data.uid || '',
            userName: data.userName || 'User',
            userProfilePic: data.userProfilePic || '/default-avatar.png',
            text: data.text || '',
            photoUrl: data.photoUrl || '',
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

      // Filter out quest_completion posts from saved posts too
      const normalSavedPosts = posts.filter(post => post.postType !== 'quest_completion');

      setSavedPosts(normalSavedPosts);
    } catch (error) {
      console.error('Error fetching saved posts:', error);
    } finally {
      setLoadingPosts(false);
    }
  };

  const fetchUserQuests = async (uid: string) => {
    setLoadingQuests(true);
    try {
      const quests = await questService.getUserQuests(uid);
      setMyQuests(quests);

      const savedQuestItems: any[] = (await questService.getUserSavedQuests(uid)) || [];
      const savedQuestIds: string[] = savedQuestItems
        .map((item: any) => (typeof item === 'string' ? item : item?.id))
        .filter(Boolean);
      const savedQuestsData = await Promise.all(
        savedQuestIds.map((id: string) => questService.getQuestById(id))
      );
      setSavedQuests(savedQuestsData.filter(Boolean) as Quest[]);
    } catch (error) {
      console.error('Error fetching quests:', error);
    } finally {
      setLoadingQuests(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!user) return;
    try {
      const postRef = firestoreDoc(db, 'posts', postId);
      const postDoc = await getDoc(postRef);
      if (!postDoc.exists()) return;

      const likedBy = postDoc.data().likedBy || [];
      const isLiked = likedBy.includes(user.uid);

      if (isLiked) {
        await updateDoc(postRef, {
          likedBy: arrayRemove(user.uid),
          likeCount: increment(-1),
        });
      } else {
        await updateDoc(postRef, {
          likedBy: arrayUnion(user.uid),
          likeCount: increment(1),
        });
      }

      const updatePosts = (posts: Post[]) =>
        posts.map((post) =>
          post.id === postId
            ? {
              ...post,
              likedBy: isLiked
                ? post.likedBy?.filter((id) => id !== user.uid)
                : [...(post.likedBy || []), user.uid],
              likeCount: isLiked ? post.likeCount - 1 : post.likeCount + 1,
            }
            : post
        );

      setYourPosts(updatePosts);
      setSavedPosts(updatePosts);
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleSave = async (postId: string, isSaved: boolean) => {
    if (!user) return;
    try {
      if (isSaved) {
        await unsavePost(postId, user.uid);
      } else {
        await savePost(postId, user.uid);
      }
      const updatePosts = (posts: Post[]) =>
        posts.map((post) =>
          post.id === postId ? { ...post, isSaved: !isSaved } : post
        );
      setYourPosts(updatePosts);
      setSavedPosts(updatePosts);
    } catch (error) {
      console.error('Error saving post:', error);
    }
  };

  const navigateTo = (path: string) => {
    router.push(path);
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className='min-h-screen bg-[#121212] flex items-center justify-center'>
        <div className='w-16 h-16 border-4 border-[#EA6100] border-t-transparent rounded-full animate-spin'></div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className='min-h-screen bg-[#121212] text-white flex items-center justify-center px-4'>
        <div className='text-center max-w-md'>
          <h2 className='text-3xl font-bold text-[#EA6100] mb-4'>Welcome to OnQuest</h2>
          <p className='text-gray-400 mb-6'>Please log in to view your profile</p>
          <button
            onClick={() => navigateTo('/login')}
            className='bg-[#EA6100] text-black px-8 py-3 rounded-lg font-medium hover:bg-[#f5c094] transition-colors'
          >
            Log In
          </button>
        </div>
      </div>
    );
  }

  const containerStartExpression = `calc((100vw - (${LEFT_NAV_WIDTH}px + ${SIDEBAR_GAP}px + ${DESKTOP_MAIN_WIDTH}vw)) / 2)`;
  const mainLeftExpression = `calc(${containerStartExpression} + ${LEFT_NAV_WIDTH + SIDEBAR_GAP}px)`;
  const layoutStyles = `
    @media (min-width: 1024px) {
      .account-desktop-main {
        width: ${DESKTOP_MAIN_WIDTH}vw;
        margin-left: ${mainLeftExpression};
        margin-right: auto;
      }
    }
  `;

  return (
    <div className='min-h-screen bg-black'>
      <style>{styles}</style>
      <style jsx>{layoutStyles}</style>

      <div className='hidden lg:block'>
        <NavBar
          user={user}
          onSignOut={handleSignOut}
          style={{ left: containerStartExpression, right: 'auto', width: `${LEFT_NAV_WIDTH}px` }}
        />
      </div>

      <div className='account-desktop-main lg:relative'>
        <div className='max-w-7xl mx-auto'>
          {/* Profile Header */}
          <div className='relative'>
            {/* Background Image */}
            <div className='h-48 lg:h-64 relative overflow-hidden'>
              <img
                src={userData?.backgroundURL || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200'}
                alt='Profile Background'
                className='w-full h-full object-cover'
              />
              <div className='absolute inset-0 bg-gradient-to-b from-transparent to-[#121212]'></div>

              {/* Settings Icon - Top Right (Mobile & Desktop) */}
              <button
                onClick={() => navigateTo('/settings')}
                className='absolute top-4 right-4 lg:top-6 lg:right-6 w-10 h-10 bg-black/50 backdrop-blur-sm hover:bg-black/70 rounded-full flex items-center justify-center transition-colors border border-white/10'
                title='Settings'
              >
                <Settings size={20} className='text-white' />
              </button>
            </div>

            {/* Profile Info */}
            <div className='relative px-5 lg:px-8 -mt-16 lg:-mt-20'>
              {/* Mobile: Horizontal Layout | Desktop: Flex Row */}
              <div className='flex items-center lg:items-end justify-between gap-3 lg:gap-4'>
                {/* Left: Profile Picture + Info */}
                <div className='flex items-center lg:items-end gap-3 lg:gap-6 flex-1 min-w-0'>
                  <div className='relative flex-shrink-0'>
                    <img
                      src={userData?.photoURL || '/default-avatar.png'}
                      alt='Profile'
                      className='w-24 h-24 lg:w-40 lg:h-40 rounded-full border-4 border-[#121212] object-cover'
                    />
                    {/* Rank Display */}
                    {gamificationInfo && (
                      <div
                        className='absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#EA6100] text-black px-2 lg:px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap cursor-pointer hover:scale-105 transition-transform'
                        onClick={() => navigateTo('/gamification')}
                        title='View Gamification Hub'
                      >
                        {gamificationInfo.rankTitle}
                      </div>
                    )}
                  </div>

                  {/* Username & Display Name */}
                  <div className='text-left flex-1 min-w-0 lg:mb-4'>
                    <div className='flex items-center gap-2'>
                      <h1 className='text-xl lg:text-3xl font-bold text-white truncate'>
                        {userData?.displayName || 'User'}
                      </h1>
                      {userData?.isVerified && (
                        <span className='text-[#EA6100] text-lg lg:text-xl flex-shrink-0'>✓</span>
                      )}
                    </div>
                    <p className='text-gray-400 text-sm lg:text-base mt-0.5 truncate'>
                      @{userData?.displayName?.toLowerCase().replace(/\s+/g, '') || 'user'}
                    </p>
                    {userData?.title && (
                      <p className='text-gray-500 text-xs lg:text-sm mt-0.5 truncate'>{userData.title}</p>
                    )}
                  </div>
                </div>

                {/* Right: Edit Profile Button (Mobile & Desktop) */}
                <div className='flex-shrink-0 lg:mb-4'>
                  <button
                    onClick={() => navigateTo('/settings/edit-profile')}
                    className='flex items-center gap-1.5 lg:gap-2 bg-[#292929] hover:bg-[#3a3a3a] text-white px-3 lg:px-6 py-2 lg:py-2.5 rounded-lg transition-colors text-sm lg:text-base font-medium'
                  >
                    <Edit2 size={16} className='lg:w-[18px] lg:h-[18px]' />
                    <span className='hidden sm:inline'>Edit Profile</span>
                    <span className='sm:hidden'>Edit</span>
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className='mt-6 grid grid-cols-3 lg:flex lg:gap-8 gap-4 text-center lg:text-left'>
                <div>
                  <div className='text-xl lg:text-2xl font-bold text-white'>
                    {userData?.postsCount || yourPosts.length}
                  </div>
                  <div className='text-gray-400 text-sm'>Posts</div>
                </div>
                <div>
                  <div className='text-xl lg:text-2xl font-bold text-white'>
                    {userData?.followers?.length || 0}
                  </div>
                  <div className='text-gray-400 text-sm'>Followers</div>
                </div>
                <div>
                  <div className='text-xl lg:text-2xl font-bold text-white'>
                    {followingList.length}
                  </div>
                  <div className='text-gray-400 text-sm'>Following</div>
                </div>
              </div>

              {/* Bio */}
              {userData?.bio && (
                <div className='mt-4 text-gray-300 max-w-3xl'>
                  {userData.bio}
                </div>
              )}

              {/* Gamification Preview */}
              {gamificationInfo && (
                <div
                  className='mt-6 bg-[#1a1a1a] rounded-xl p-5 cursor-pointer hover:bg-[#292929] transition-colors border border-gray-800'
                  onClick={() => navigateTo('/gamification/leaderboard')}
                >
                  <div className='flex items-center justify-between mb-4'>
                    <div className='flex items-center gap-3'>
                      <Trophy className='text-[#EA6100]' size={24} />
                      <div>
                        <h3 className='text-white font-semibold'>Your Progress</h3>
                        <p className='text-gray-400 text-sm'>View your full stats and achievements</p>
                      </div>
                    </div>
                    <div className='text-[#EA6100]'>
                      <IoChevronForward size={20} />
                    </div>
                  </div>

                  {/* <div className='grid grid-cols-3 gap-4'>
                    <div className='text-center'>
                      <div className='flex items-center justify-center gap-2 mb-2'>
                        <Award className='text-[#EA6100]' size={16} />
                        <span className='text-white font-bold text-lg'>{gamificationInfo.totalQPs}</span>
                      </div>
                      <span className='text-gray-400 text-xs'>Total QP</span>
                    </div>
                    <div className='text-center'>
                      <div className='flex items-center justify-center gap-2 mb-2'>
                        <Target className='text-[#EA6100]' size={16} />
                        <span className='text-white font-bold text-lg'>{gamificationInfo.publishedQuests}</span>
                      </div>
                      <span className='text-gray-400 text-xs'>Quests</span>
                    </div>
                    <div className='text-center'>
                      <div className='flex items-center justify-center gap-2 mb-2'>
                        <Flame className='text-[#EA6100]' size={16} />
                        <span className='text-white font-bold text-lg'>0</span>
                      </div>
                      <span className='text-gray-400 text-xs'>Streak</span>
                    </div>
                  </div> */}

                  <div className='mt-4'>
                    <div className='flex justify-between text-sm mb-2'>
                      <span className='text-gray-400'>Progress to {gamificationInfo.nextRankTitle}</span>
                      <span className='text-[#EA6100]'>{Math.round(gamificationInfo.qpProgress * 100)}%</span>
                    </div>
                    <div className='w-full bg-gray-700 rounded-full h-2'>
                      <div
                        className='bg-gradient-to-r from-[#EA6100] to-[#ff9a50] h-2 rounded-full transition-all'
                        style={{ width: `${gamificationInfo.qpProgress * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Badges */}
              {badges.length > 0 && (
                <div className='mt-6'>
                  <h3 className='text-white font-semibold mb-3'>Badges</h3>
                  <div className='flex gap-3 overflow-x-auto pb-2 scrollbar-hide'>
                    {badges.map((badge) => (
                      <div
                        key={badge.id}
                        className='flex-shrink-0 bg-[#292929] rounded-lg p-3 hover:bg-[#3a3a3a] transition-colors cursor-pointer'
                        title={badge.description}
                        onClick={() => navigateTo('/gamification')}
                      >
                        <img
                          src={badge.iconUrl}
                          alt={badge.name}
                          className='w-12 h-12 object-contain'
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Tabs Navigation */}
          <div className='px-5 lg:px-8 mt-6'>
            <div className='flex gap-4 border-b border-gray-800 overflow-x-auto scrollbar-hide'>
              {['quests', 'posts', 'saved'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveMainTab(tab as any)}
                  className={`py-3 px-1 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                    activeMainTab === tab
                      ? 'border-[#EA6100] text-white'
                      : 'border-transparent text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className='mt-6 px-5 lg:px-8 pb-20 lg:pb-8'>
            <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
              {/* Left Column - Main Content (Vertical List) */}
              <div className='lg:col-span-2 space-y-6'>
                {/* Quests Tab */}
                {activeMainTab === 'quests' && (
                  <div>
                    {loadingQuests ? (
                      <div className='text-center py-8 text-gray-400'>Loading quests...</div>
                    ) : (
                      <div className='flex flex-col gap-4'>
                        {myQuests.length === 0 ? (
                          <div className='text-center py-12 bg-[#1a1a1a] rounded-xl border border-gray-800'>
                            <p className='text-gray-400'>No quests found</p>
                            <button
                              onClick={() => navigateTo('/quest/create')}
                              className='mt-4 bg-[#EA6100] text-black px-6 py-2 rounded-lg font-medium hover:bg-[#f5c094] transition-colors'
                            >
                              Create Quest
                            </button>
                          </div>
                        ) : (
                          <>
                            {myQuests.slice(0, visibleQuestsCount).map(quest => (
                              <MobileQuestPostCard
                                key={quest.id}
                                post={formatQuestAsPost(quest) as any}
                                currentUser={user}
                                onLike={() => { }}
                                onSave={() => { }}
                                onMenu={() => { }}
                                onShare={() => setSelectedPostForShare(formatQuestAsPost(quest) as any)}
                                onComment={() => navigateTo(`/quest/${quest.id}`)}
                              />
                            ))}
                            {myQuests.length > visibleQuestsCount && (
                              <button
                                onClick={() => setVisibleQuestsCount(prev => prev + 5)}
                                className="w-full py-3 mt-2 text-center text-[#EA6100] font-medium bg-[#1a1a1a] rounded-lg border border-gray-800 hover:bg-[#292929] transition-colors"
                              >
                                View More
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Posts Tab */}
                {activeMainTab === 'posts' && (
                  <div>
                    {loadingPosts ? (
                      <div className='text-center py-8 text-gray-400'>Loading posts...</div>
                    ) : (
                      <div className='flex flex-col gap-4'>
                        {yourPosts.length === 0 ? (
                          <div className='text-center py-12 bg-[#1a1a1a] rounded-xl border border-gray-800'>
                            <p className='text-gray-400'>No posts yet</p>
                            <button
                              onClick={() => navigateTo('/create-post')}
                              className='mt-4 bg-[#EA6100] text-black px-6 py-2 rounded-lg font-medium hover:bg-[#f5c094] transition-colors'
                            >
                              Create Your First Post
                            </button>
                          </div>
                        ) : (
                          <>
                            {yourPosts.slice(0, visiblePostsCount).map(post => (
                              <MobilePostCard
                                key={post.id}
                                post={post}
                                currentUser={user}
                                onLike={() => handleLike(post.id)}
                                onSave={() => handleSave(post.id, post.isSaved || false)}
                                onComment={() => navigateTo(`/post/${post.id}`)}
                                onShare={() => setSelectedPostForShare(post)}
                                onMenuClick={() => setSelectedPostForMenu(post)}
                              />
                            ))}
                            {yourPosts.length > visiblePostsCount && (
                              <button
                                onClick={() => setVisiblePostsCount(prev => prev + 5)}
                                className="w-full py-3 mt-2 text-center text-[#EA6100] font-medium bg-[#1a1a1a] rounded-lg border border-gray-800 hover:bg-[#292929] transition-colors"
                              >
                                View More
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Saved Tab */}
                {activeMainTab === 'saved' && (
                  <div>
                    {loadingPosts || loadingQuests ? (
                      <div className='text-center py-8 text-gray-400'>Loading saved items...</div>
                    ) : (
                      <div className='flex flex-col gap-4'>
                        {savedPosts.length === 0 && savedQuests.length === 0 ? (
                          <div className='text-center py-12 bg-[#1a1a1a] rounded-xl border border-gray-800'>
                            <p className='text-gray-400'>Nothing saved yet</p>
                          </div>
                        ) : (
                          <>
                            {[...savedQuests.map(q => formatQuestAsPost(q)), ...savedPosts]
                              .sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis())
                              .slice(0, visibleSavedCount)
                              .map((item: any) => (
                                item.postType === 'quest_completion' ? (
                                  <MobileQuestPostCard
                                    key={`saved-quest-${item.id}`}
                                    post={item}
                                    currentUser={user}
                                    onLike={() => { }}
                                    onSave={() => { }}
                                    onMenu={() => { }}
                                    onShare={() => setSelectedPostForShare(item)}
                                    onComment={() => navigateTo(`/quest/${item.id}`)}
                                  />
                                ) : (
                                  <MobilePostCard
                                    key={`saved-post-${item.id}`}
                                    post={item}
                                    currentUser={user}
                                    onLike={() => handleLike(item.id)}
                                    onSave={() => handleSave(item.id, true)}
                                    onComment={() => navigateTo(`/post/${item.id}`)}
                                    onShare={() => setSelectedPostForShare(item)}
                                    onMenuClick={() => setSelectedPostForMenu(item)}
                                  />
                                )
                              ))}
                            
                            {(savedQuests.length + savedPosts.length) > visibleSavedCount && (
                              <button
                                onClick={() => setVisibleSavedCount(prev => prev + 5)}
                                className="w-full py-3 mt-2 text-center text-[#EA6100] font-medium bg-[#1a1a1a] rounded-lg border border-gray-800 hover:bg-[#292929] transition-colors"
                              >
                                View More
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column - Quick Actions (Desktop Only) */}
              <div className='hidden lg:block lg:col-span-1 space-y-6'>
                <div className='bg-[#1a1a1a] rounded-xl p-5 lg:p-6 lg:sticky lg:top-6'>
                  <h3 className='text-xl font-semibold text-[#EA6100] mb-4'>
                    Quick Actions
                  </h3>

                  <div className='space-y-2'>
                    <MenuOption
                      icon={<Trophy className='text-[#EA6100]' size={20} />}
                      label='Gamification Hub'
                      onClick={() => navigateTo('/gamification')}
                    />
                    <MenuOption
                      icon={<Settings className='text-[#EA6100]' size={20} />}
                      label='Settings'
                      onClick={() => navigateTo('/settings')}
                    />
                    <MenuOption
                      icon={<Edit2 className='text-[#EA6100]' size={20} />}
                      label='Edit Profile'
                      onClick={() => navigateTo('/settings/edit-profile')}
                    />
                    <MenuOption
                      icon={<Calendar className='text-[#EA6100]' size={20} />}
                      label='Upcoming Quests'
                      onClick={() => navigateTo('/account/upcoming-quests')}
                    />
                    <MenuOption
                      icon={<SlidersHorizontal className='text-[#EA6100]' size={20} />}
                      label='Preferences'
                      onClick={() => navigateTo('/account/preferences')}
                    />
                    <MenuOption
                      icon={<HelpCircle className='text-[#EA6100]' size={20} />}
                      label='Support'
                      onClick={() => navigateTo('/account/support')}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className='lg:hidden'>
            <Footer />
          </div>
        </div>
      </div>

      {/* Modals for Interactive Cards */}
      {selectedPostForMenu && (
        <MobilePostMenu
          post={selectedPostForMenu as any}
          user={user}
          onClose={() => setSelectedPostForMenu(null)}
          onDelete={() => {
            setYourPosts(prev => prev.filter(p => p.id !== selectedPostForMenu.id));
            setSavedPosts(prev => prev.filter(p => p.id !== selectedPostForMenu.id));
            setSelectedPostForMenu(null);
          }}
          onEdit={() => {
            setSelectedPostForEdit(selectedPostForMenu);
            setSelectedPostForMenu(null);
          }}
          onShareClick={() => {
            setSelectedPostForShare(selectedPostForMenu);
            setSelectedPostForMenu(null);
          }}
        />
      )}

      {selectedPostForShare && (
        <ShareModal
          post={selectedPostForShare as any}
          onClose={() => setSelectedPostForShare(null)}
        />
      )}

      {selectedPostForEdit && user && (
        <EditPostModal
          user={user}
          onClose={() => setSelectedPostForEdit(null)}
          post={selectedPostForEdit as any}
          onPostUpdated={async (updatedPost) => {
            setYourPosts(prev => prev.map(p => p.id === updatedPost.id ? { ...p, ...updatedPost } : p));
            setSavedPosts(prev => prev.map(p => p.id === updatedPost.id ? { ...p, ...updatedPost } : p));
          }}
        />
      )}
    </div>
  );
};

// Menu Option Component
const MenuOption: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}> = ({ icon, label, onClick }) => (
  <div
    onClick={onClick}
    className='flex justify-between items-center py-3 px-4 rounded-lg hover:bg-[#292929] cursor-pointer transition-colors group'
  >
    <div className='flex gap-3 items-center'>
      <div className='flex-shrink-0'>{icon}</div>
      <div className='text-white group-hover:text-[#EA6100] transition-colors'>
        {label}
      </div>
    </div>
    <div className='text-[#EA6100] opacity-0 group-hover:opacity-100 transition-opacity'>
      <IoChevronForward size={20} />
    </div>
  </div>
);



export default AccountPage;