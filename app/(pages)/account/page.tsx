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
  const [activePostTab, setActivePostTab] = useState<'your-posts' | 'saved-posts'>('your-posts');
  const [yourPosts, setYourPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  // Quests state
  const [activeQuestTab, setActiveQuestTab] = useState<'public-quests' | 'private-quests' | 'saved-quests'>('public-quests');
  const [myQuests, setMyQuests] = useState<Quest[]>([]);
  const [savedQuests, setSavedQuests] = useState<Quest[]>([]);
  const [loadingQuests, setLoadingQuests] = useState(false);
  const [followingList, setFollowingList] = useState<string[]>([]);

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
                  onClick={() => navigateTo('/gamification')}
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

          {/* Content */}
          <div className='mt-8 px-5 lg:px-8 pb-20 lg:pb-8'>
            {/* Quests Section */}
            <div className='bg-[#1a1a1a] rounded-xl p-5 lg:p-6 mb-6'>
              <div className='flex items-center justify-between mb-4'>
                <h2 className='text-2xl font-bold text-white'>Quests</h2>
                <button
                  onClick={() => navigateTo('/account/all-quests')}
                  className='text-[#EA6100] text-sm font-medium hover:underline'
                >
                  View All
                </button>
              </div>

              <div className='flex gap-3 mb-6 overflow-x-auto scrollbar-hide'>
                <button
                  onClick={() => setActiveQuestTab('public-quests')}
                  className={`py-2 px-4 rounded-lg font-medium transition-colors whitespace-nowrap ${activeQuestTab === 'public-quests'
                    ? 'bg-[#EA6100] text-black'
                    : 'bg-[#292929] text-gray-400 hover:bg-[#3a3a3a]'
                    }`}
                >
                  Public
                </button>
                <button
                  onClick={() => setActiveQuestTab('private-quests')}
                  className={`py-2 px-4 rounded-lg font-medium transition-colors whitespace-nowrap ${activeQuestTab === 'private-quests'
                    ? 'bg-[#EA6100] text-black'
                    : 'bg-[#292929] text-gray-400 hover:bg-[#3a3a3a]'
                    }`}
                >
                  Private
                </button>
                <button
                  onClick={() => setActiveQuestTab('saved-quests')}
                  className={`py-2 px-4 rounded-lg font-medium transition-colors whitespace-nowrap ${activeQuestTab === 'saved-quests'
                    ? 'bg-[#EA6100] text-black'
                    : 'bg-[#292929] text-gray-400 hover:bg-[#3a3a3a]'
                    }`}
                >
                  Saved Quests
                </button>
              </div>

              {loadingQuests ? (
                <div className='text-center py-8'>
                  <div className='text-gray-400'>Loading quests...</div>
                </div>
              ) : (
                <div className='flex overflow-x-auto gap-4 pb-4 scrollbar-hide snap-x'>
                  {(activeQuestTab === 'public-quests'
                    ? myQuests.filter((q) => q.isPublic)
                    : activeQuestTab === 'private-quests'
                      ? myQuests.filter((q) => !q.isPublic)
                      : savedQuests
                  ).slice(0, 5).map((quest) => (
                    <div key={quest.id} className='min-w-[280px] w-[280px] snap-start'>
                      <QuestCard
                        quest={quest}
                        onClick={() => navigateTo(`/quest/${quest.id}`)}
                      />
                    </div>
                  ))}
                  {(activeQuestTab === 'public-quests'
                    ? myQuests.filter((q) => q.isPublic)
                    : activeQuestTab === 'private-quests'
                      ? myQuests.filter((q) => !q.isPublic)
                      : savedQuests
                  ).length === 0 && (
                      <div className='w-full text-center py-8 bg-[#292929] rounded-lg'>
                        <p className='text-gray-400'>No quests found</p>
                        {activeQuestTab !== 'saved-quests' && (
                          <button
                            onClick={() => navigateTo('/quest/create')}
                            className='mt-3 bg-[#EA6100] text-black px-6 py-2 rounded-lg font-medium hover:bg-[#f5c094] transition-colors'
                          >
                            Create Quest
                          </button>
                        )}
                      </div>
                    )}
                  {(activeQuestTab === 'public-quests'
                    ? myQuests.filter((q) => q.isPublic)
                    : activeQuestTab === 'private-quests'
                      ? myQuests.filter((q) => !q.isPublic)
                      : savedQuests
                  ).length > 5 && (
                      <div className='min-w-[150px] flex items-center justify-center'>
                        <button
                          onClick={() => navigateTo('/account/quests')}
                          className='flex flex-col items-center gap-2 text-gray-400 hover:text-[#EA6100] transition-colors'
                        >
                          <div className='w-12 h-12 rounded-full bg-[#292929] flex items-center justify-center'>
                            <IoChevronForward size={24} />
                          </div>
                          <span className='font-medium'>View All</span>
                        </button>
                      </div>
                    )}
                </div>
              )}
            </div>

            <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>

              {/* Left Column - Posts */}
              <div className='lg:col-span-2 space-y-6 '>
                {/* Posts Section */}
                <div className='bg-[#1a1a1a] rounded-xl p-5 lg:p-6'>
                  <div className='flex items-center justify-between mb-4'>
                    <h2 className='text-2xl font-bold text-white'>Posts</h2>
                    <button
                      onClick={() => navigateTo('/account/posts')}
                      className='text-[#EA6100] text-sm font-medium hover:underline'
                    >
                      View All
                    </button>
                  </div>

                  <div className='flex gap-3 mb-6 overflow-x-auto scrollbar-hide'>
                    <button
                      onClick={() => setActivePostTab('your-posts')}
                      className={`py-2 px-4 rounded-lg font-medium transition-colors whitespace-nowrap ${activePostTab === 'your-posts'
                        ? 'bg-[#EA6100] text-black'
                        : 'bg-[#292929] text-gray-400 hover:bg-[#3a3a3a]'
                        }`}
                    >
                      Your Posts ({yourPosts.length})
                    </button>
                    <button
                      onClick={() => setActivePostTab('saved-posts')}
                      className={`py-2 px-4 rounded-lg font-medium transition-colors whitespace-nowrap ${activePostTab === 'saved-posts'
                        ? 'bg-[#EA6100] text-black'
                        : 'bg-[#292929] text-gray-400 hover:bg-[#3a3a3a]'
                        }`}
                    >
                      Saved Posts ({savedPosts.length})
                    </button>
                  </div>

                  {loadingPosts ? (
                    <div className='text-center py-8'>
                      <div className='text-gray-400'>Loading posts...</div>
                    </div>
                  ) : (
                    <div className='flex overflow-x-auto gap-4 pb-4 scrollbar-hide snap-x'>
                      {(activePostTab === 'your-posts' ? yourPosts : savedPosts).slice(0, 5).map((post) => (
                        <div key={post.id} className='min-w-[300px] w-[300px] snap-start'>
                          <PostCard
                            post={post}
                            currentUser={user}
                            onLike={() => handleLike(post.id)}
                            onSave={() => handleSave(post.id, post.isSaved || false)}
                            onClick={() => navigateTo(`/post/${post.id}`)}
                          />
                        </div>
                      ))}
                      {(activePostTab === 'your-posts' ? yourPosts : savedPosts).length === 0 && (
                        <div className='w-full text-center py-8 bg-[#292929] rounded-lg'>
                          <p className='text-gray-400'>No posts yet</p>
                          {activePostTab === 'your-posts' && (
                            <button
                              onClick={() => navigateTo('/create-post')}
                              className='mt-3 bg-[#EA6100] text-black px-6 py-2 rounded-lg font-medium hover:bg-[#f5c094] transition-colors'
                            >
                              Create Your First Post
                            </button>
                          )}
                        </div>
                      )}
                      {(activePostTab === 'your-posts' ? yourPosts : savedPosts).length > 5 && (
                        <div className='min-w-[150px] flex items-center justify-center'>
                          <button
                            onClick={() => navigateTo('/account/posts')}
                            className='flex flex-col items-center gap-2 text-gray-400 hover:text-[#EA6100] transition-colors'
                          >
                            <div className='w-12 h-12 rounded-full bg-[#292929] flex items-center justify-center'>
                              <IoChevronForward size={24} />
                            </div>
                            <span className='font-medium'>View All</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                </div>


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

// Post Card Component with Read More
const PostCard: React.FC<{
  post: Post;
  currentUser: any;
  onLike: () => void;
  onSave: () => void;
  onClick: () => void;
}> = ({ post, currentUser, onLike, onSave, onClick }) => {
  const [liked, setLiked] = useState(
    post.likedBy?.includes(currentUser?.uid) || false
  );
  const [showFullText, setShowFullText] = useState(false);

  useEffect(() => {
    setLiked(post.likedBy?.includes(currentUser?.uid) || false);
  }, [post.likedBy, currentUser?.uid]);

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate
      ? timestamp.toDate()
      : new Date(timestamp.seconds * 1000);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800)
      return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onLike();
  };

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSave();
  };

  const textLimit = 150;
  const needsReadMore = post.text.length > textLimit;

  return (
    <div className='bg-[#292929] rounded-xl overflow-hidden hover:bg-[#3a3a3a] transition-colors border border-gray-800'>
      <div className='flex items-center justify-between p-4 border-b border-gray-800'>
        <div
          className='flex items-center gap-3 cursor-pointer'
          onClick={onClick}
        >
          <img
            src={post.userProfilePic || '/default-avatar.png'}
            alt={post.userName}
            className='w-10 h-10 rounded-full object-cover'
          />
          <div>
            <span className='text-white font-medium block'>{post.userName}</span>
            <span className='text-gray-400 text-sm'>
              {formatTime(post.createdAt)}
            </span>
          </div>
        </div>
        <button
          className='text-gray-400 hover:text-white'
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal size={20} />
        </button>
      </div>

      {post.photoUrl && (
        <div
          className='relative w-full aspect-square cursor-pointer'
          onClick={onClick}
        >
          <img
            src={Array.isArray(post.photoUrl) ? post.photoUrl[0] : post.photoUrl}
            alt='Post'
            className='w-full h-full object-cover'
          />
        </div>
      )}

      <div className='p-4'>
        <div className='mb-3'>
          <p className='text-white'>
            {needsReadMore && !showFullText
              ? `${post.text.slice(0, textLimit)}...`
              : post.text}
          </p>
          {needsReadMore && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowFullText(!showFullText);
              }}
              className='text-[#EA6100] text-sm mt-1 hover:underline'
            >
              {showFullText ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>

        <div className='flex items-center justify-between pt-3 border-t border-gray-800'>
          <div className='flex items-center gap-4'>
            <button
              onClick={handleLikeClick}
              className={`flex items-center gap-2 transition-colors ${liked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
                }`}
            >
              <FaHeartbeat size={22} className={liked ? 'fill-current' : ''} />
              <span className='text-sm font-medium'>{post.likeCount || 0}</span>
            </button>
            <button
              className='flex items-center gap-2 text-gray-400 hover:text-white transition-colors'
              onClick={onClick}
            >
              <MessageCircle size={22} />
              <span className='text-sm font-medium'>
                {post.commentCount || 0}
              </span>
            </button>
            <button
              className='text-gray-400 hover:text-white transition-colors'
              onClick={(e) => e.stopPropagation()}
            >
              <Share2 size={22} />
            </button>
          </div>
          <button
            onClick={handleSaveClick}
            className={`transition-colors ${post.isSaved ? 'text-[#EA6100]' : 'text-gray-400 hover:text-[#EA6100]'
              }`}
          >
            <Bookmark size={22} className={post.isSaved ? 'fill-current' : ''} />
          </button>
        </div>
      </div>
    </div>
  );
};

// Quest Card Component
const QuestCard: React.FC<{ quest: Quest; onClick: () => void }> = ({
  quest,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className='bg-[#292929] rounded-xl overflow-hidden cursor-pointer hover:bg-[#3a3a3a] transition-colors border border-gray-800 hover:border-[#EA6100]'
    >
      <div className='relative h-48'>
        <img
          src={
            (quest.coverImageUrl as any) ||
            'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600'
          }
          alt={quest.title}
          className='w-full h-full object-cover'
        />
        <div className='absolute inset-0 bg-gradient-to-t from-black/70 to-transparent' />
        <div className='absolute bottom-0 left-0 right-0 p-4'>
          <h4 className='text-white font-bold text-lg mb-1 line-clamp-1'>
            {quest.title}
          </h4>
          <div className='flex items-center gap-2 text-gray-300 text-sm'>
            <MapPin size={14} />
            <span className='line-clamp-1'>{quest.destination}</span>
          </div>
        </div>
      </div>
      <div className='p-4'>
        <div className='flex items-center justify-between text-sm'>
          <span className='text-gray-400 text-xs'>
            {new Date(quest.startDate).toLocaleDateString()} -{' '}
            {new Date(quest.endDate).toLocaleDateString()}
          </span>
          <span className='text-[#EA6100] font-medium text-xs'>
            {quest.isPublic ? 'Public' : 'Private'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AccountPage;