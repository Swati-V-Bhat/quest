"use client";
import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { getUserData, getUserBadges } from '@/lib/firebaseSerive';
import { getUserGamificationData, calculateRankInfo } from '@/lib/qpService';
import { savePost, unsavePost } from '@/lib/postService';
import Footer from '@/components/phoneComponents/Footer';
import {
  Settings,
  Edit2,
  Calendar,
  SlidersHorizontal,
  HelpCircle,
  MapPin,
  MessageCircle,
  Share2,
  Bookmark,
  MoreHorizontal,
  Trophy,
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
import { getFollowingList } from '@/lib/followService';

// Feed components for interactive posts/quests
import MobilePostCard from '@/components/Home/MobilePostCard';
import { MobileQuestPostCard } from '@/components/Home/QuestPostCard';
import ShareModal from '@/components/Home/ShareModal';
import MobilePostMenu from '@/components/Home/PostMenu';
import EditPostModal from '@/components/Home/EditPostModal';

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
  photoUrl: string;
  createdAt: any;
  likeCount: number;
  commentCount: number;
  shareCount?: number;
  location?: string;
  likedBy: string[];
  isSaved?: boolean;
  postType?: 'regular' | 'quest_completion' | 'event' | 'sponsored';
  questData?: any;
  questContext?: any;
}

const AccountPage = () => {
  const router = useRouter();
  const params = useParams();
  const profileUserId = params?.userId as string; // The profile we're viewing

  const [user, setUser] = useState<any>(null); // Currently logged-in user
  const [userData, setUserData] = useState<UserData | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [gamificationInfo, setGamificationInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  // Posts state
  // Posts state
  const [yourPosts, setYourPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [questPosts, setQuestPosts] = useState<Post[]>([]); // Quest completion posts
  const [loadingPosts, setLoadingPosts] = useState(false);

  // Quests state
  // Quests state
  const [myQuests, setMyQuests] = useState<Quest[]>([]);
  const [savedQuests, setSavedQuests] = useState<Quest[]>([]);
  const [loadingQuests, setLoadingQuests] = useState(false);
  const [followingList, setFollowingList] = useState<string[]>([]);

  // New Unified Tab State
  const [activeMainTab, setActiveMainTab] = useState<'quests' | 'posts' | 'drafts' | 'collections'>('quests');

  // Interactive Card States
  const [selectedPostForMenu, setSelectedPostForMenu] = useState<Post | null>(null);
  const [selectedPostForShare, setSelectedPostForShare] = useState<Post | null>(null);
  const [selectedPostForEdit, setSelectedPostForEdit] = useState<Post | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsLoggedIn(!!currentUser);

      // Check if this is the user's own profile
      const isOwn = currentUser?.uid === profileUserId;
      setIsOwnProfile(isOwn);

      if (profileUserId) {
        try {
          // Fetch the profile owner's data (not necessarily the logged-in user)
          const data = await getUserData(profileUserId);
          setUserData(data as UserData);

          const following = await getFollowingList(profileUserId);
          setFollowingList(following);

          const userBadges = await getUserBadges(profileUserId);
          setBadges(userBadges.slice(0, 3));

          // Updated gamification logic
          const gData = await getUserGamificationData(profileUserId);
          const rankInfo = calculateRankInfo(gData);
          setGamificationInfo(rankInfo);

          // Get logged-in user's data for saved posts check
          let loggedInUserData = null;
          if (currentUser && currentUser.uid !== profileUserId) {
            loggedInUserData = await getUserData(currentUser.uid);
          } else if (currentUser) {
            loggedInUserData = data;
          }

          await fetchUserPosts(profileUserId, data as UserData, loggedInUserData?.savedPosts || []);

          // Only fetch saved posts if viewing own profile
          if (isOwn && data?.savedPosts && data.savedPosts.length > 0) {
            await fetchSavedPosts(data.savedPosts);
          }

          await fetchUserQuests(profileUserId);
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profileUserId]);

  const fetchUserPosts = async (uid: string, profileData: UserData, savedPostIds: string[] = []) => {
    setLoadingPosts(true);
    try {
      const postsRef = collection(db, 'posts');
      const q = query(
        postsRef,
        where('uid', '==', uid),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);

      const allPosts: Post[] = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          uid: data.uid || uid,
          authorId: data.uid || uid,
          userName: data.userName || profileData?.displayName || 'User',
          userProfilePic: data.userProfilePic || profileData?.photoURL || '/default-avatar.png',
          text: data.text || '',
          photoUrl: Array.isArray(data.photoUrl) ? data.photoUrl[0] : (data.photoUrl || ''),
          createdAt: data.createdAt,
          likeCount: data.likeCount || 0,
          commentCount: data.commentCount || 0,
          shareCount: data.shareCount || 0,
          location: data.location || '',
          likedBy: data.likedBy || [],
          isSaved: savedPostIds.includes(doc.id),
          postType: data.postType || 'regular',
          questData: data.questData || null,
          questContext: data.questContext || null,
        };
      });


      // Filter out quest_completion posts - they should only appear in Quests section
      const normalPosts = allPosts.filter(post => post.postType !== 'quest_completion');

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
            authorId: data.uid || '',
            userName: data.userName || 'User',
            userProfilePic: data.userProfilePic || '/default-avatar.png',
            text: data.text || '',
            photoUrl: Array.isArray(data.photoUrl) ? data.photoUrl[0] : (data.photoUrl || ''),
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
      const quests = await questService.getUserQuestsWithPermissions(uid);
      console.log('Fetched quests for profile:', quests.length);
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

  const formatQuestAsPost = (quest: any) => {
    return {
      id: quest.id,
      uid: quest.creatorId || userData?.uid || '',
      authorId: quest.creatorId || userData?.uid || '',
      userName: userData?.displayName || 'User',
      username: userData?.displayName?.toLowerCase().replace(/\s+/g, '') || '',
      userProfilePic: userData?.photoURL || '/default-avatar.png',
      text: quest.title || '',
      photoUrl: quest.coverImageUrl || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600',
      createdAt: quest.createdAt || new Date(),
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
      likedBy: [],
      questContext: {
        questId: quest.id,
        questTitle: quest.title,
        description: quest.description || '',
      }
    };
  };

  if (loading) {
    return (
      <div className='min-h-screen bg-[#121212] flex items-center justify-center'>
        <div className='w-16 h-16 border-4 border-[#EA6100] border-t-transparent rounded-full animate-spin'></div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-[#121212]'>
      <style>{styles}</style>

      <div className='hidden lg:block'>
        <NavBar user={user} onSignOut={handleSignOut} />
      </div>

      <div className='lg:ml-[280px]'>
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
            </div>

            {/* Profile Info */}
            <div className='relative px-5 lg:px-8 -mt-16 lg:-mt-20'>
              <div className='flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4'>
                <div className='flex flex-col lg:flex-row items-center lg:items-end gap-4 lg:gap-6'>
                  <div className='relative'>
                    <img
                      src={userData?.photoURL || '/default-avatar.png'}
                      alt='Profile'
                      className='w-32 h-32 lg:w-40 lg:h-40 rounded-full border-4 border-[#121212] object-cover'
                    />
                    {/* Updated Rank Display */}
                    {gamificationInfo && (
                      <div
                        className='absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#EA6100] text-black px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap cursor-pointer hover:scale-105 transition-transform'
                        onClick={() => navigateTo('/gamification')}
                        title='View Gamification Hub'
                      >
                        {gamificationInfo.rankTitle}
                      </div>
                    )}
                  </div>
                  <div className='text-center lg:text-left lg:mb-4'>
                    <div className='flex items-center gap-2 justify-center lg:justify-start'>
                      <h1 className='text-2xl lg:text-3xl font-bold text-white'>
                        {userData?.displayName || 'User'}
                      </h1>
                      {userData?.isVerified && (
                        <span className='text-[#EA6100] text-xl'>✓</span>
                      )}
                    </div>
                    <p className='text-gray-400 mt-1'>
                      @{userData?.displayName?.toLowerCase().replace(/\s+/g, '') || 'user'}
                    </p>
                    {userData?.title && (
                      <p className='text-gray-500 text-sm mt-1'>{userData.title}</p>
                    )}
                  </div>
                </div>

                {isOwnProfile && (
                  <div className='hidden lg:flex lg:mb-4'>
                    <button
                      onClick={() => navigateTo('/settings/edit-profile')}
                      className='flex items-center gap-2 bg-[#292929] hover:bg-[#3a3a3a] text-white px-6 py-2.5 rounded-lg transition-colors'
                    >
                      <Edit2 size={18} />
                      <span>Edit Profile</span>
                    </button>
                  </div>
                )}
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
                {/* Updated QP Display */}
                {gamificationInfo && (
                  <div className='col-span-3 lg:col-span-1'>
                    <div className='text-xl lg:text-2xl font-bold text-[#EA6100]'>
                      {gamificationInfo.totalQPs} QP
                    </div>
                    <div className='text-gray-400 text-sm'>Quest Points</div>
                  </div>
                )}
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
                        <h3 className='text-white font-semibold'>Quest Progress</h3>
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
              {['quests', 'posts', ...(isOwnProfile ? ['drafts', 'collections'] : [])].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveMainTab(tab as any)}
                  className={`py-3 px-1 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${activeMainTab === tab
                    ? 'border-[#EA6100] text-white'
                    : 'border-transparent text-gray-500 hover:text-gray-300'
                    }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className='px-5 lg:px-8 mt-6 pb-20'>
            <div className={`grid grid-cols-1 ${isOwnProfile ? 'lg:grid-cols-3' : ''} gap-6`}>

              {/* Left Column - Main Content (Vertical List) */}
              <div className={`${isOwnProfile ? 'lg:col-span-2' : ''} space-y-6`}>

                {/* Quests Tab */}
                {activeMainTab === 'quests' && (
                  <div>
                    {loadingQuests ? (
                      <div className='text-center py-8 text-gray-400'>Loading quests...</div>
                    ) : (
                      <div className='flex flex-col gap-4'>
                        {myQuests.filter(q => q.isPublic).length === 0 ? (
                          <div className='text-center py-12 bg-[#1a1a1a] rounded-xl border border-gray-800'>
                            <p className='text-gray-400'>No quests found</p>
                            {isOwnProfile && (
                              <button
                                onClick={() => navigateTo('/quest/create')}
                                className='mt-4 bg-[#EA6100] text-black px-6 py-2 rounded-lg font-medium hover:bg-[#f5c094] transition-colors'
                              >
                                Create Quest
                              </button>
                            )}
                          </div>
                        ) : (
                          myQuests.filter(q => q.isPublic).map(quest => (
                            <MobileQuestPostCard
                              key={quest.id}
                              post={formatQuestAsPost(quest) as any}
                              currentUser={user}
                              onLike={() => { }}
                              onSave={() => { }}
                              onMenu={() => { }}
                              onShare={() => {
                                setSelectedPostForShare(formatQuestAsPost(quest) as any);
                              }}
                              onComment={() => navigateTo(`/quest/${quest.id}`)}
                            />
                          ))
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
                            {isOwnProfile && (
                              <button
                                onClick={() => navigateTo('/create-post')}
                                className='mt-4 bg-[#EA6100] text-black px-6 py-2 rounded-lg font-medium hover:bg-[#f5c094] transition-colors'
                              >
                                Create Your First Post
                              </button>
                            )}
                          </div>
                        ) : (
                          yourPosts.map(post => (
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
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Drafts Tab (Owner only) */}
                {isOwnProfile && activeMainTab === 'drafts' && (
                  <div>
                    {loadingQuests ? (
                      <div className='text-center py-8 text-gray-400'>Loading drafts...</div>
                    ) : (
                      <div className='flex flex-col gap-4'>
                        {myQuests.filter(q => !q.isPublic).length === 0 ? (
                          <div className='text-center py-12 bg-[#1a1a1a] rounded-xl border border-gray-800'>
                            <p className='text-gray-400'>No drafts found</p>
                          </div>
                        ) : (
                          myQuests.filter(q => !q.isPublic).map(quest => (
                            <MobileQuestPostCard
                              key={quest.id}
                              post={formatQuestAsPost(quest) as any}
                              currentUser={user}
                              onLike={() => { }}
                              onSave={() => { }}
                              onMenu={() => { }}
                              onShare={() => { }}
                              onComment={() => navigateTo(`/quest/${quest.id}`)}
                            />
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Collections Tab (Owner only) */}
                {isOwnProfile && activeMainTab === 'collections' && (
                  <div>
                    {loadingPosts || loadingQuests ? (
                      <div className='text-center py-8 text-gray-400'>Loading collections...</div>
                    ) : (
                      <div className='flex flex-col gap-4'>
                        {savedPosts.length === 0 && savedQuests.length === 0 ? (
                          <div className='text-center py-12 bg-[#1a1a1a] rounded-xl border border-gray-800'>
                            <p className='text-gray-400'>Nothing saved yet</p>
                          </div>
                        ) : (
                          <>
                            {savedQuests.map(quest => (
                              <MobileQuestPostCard
                                key={`saved-quest-${quest.id}`}
                                post={formatQuestAsPost(quest) as any}
                                currentUser={user}
                                onLike={() => { }}
                                onSave={() => { }}
                                onMenu={() => { }}
                                onShare={() => { }}
                                onComment={() => navigateTo(`/quest/${quest.id}`)}
                              />
                            ))}
                            {savedPosts.map(post => (
                              <MobilePostCard
                                key={`saved-post-${post.id}`}
                                post={post}
                                currentUser={user}
                                onLike={() => handleLike(post.id)}
                                onSave={() => handleSave(post.id, true)}
                                onComment={() => navigateTo(`/post/${post.id}`)}
                                onShare={() => setSelectedPostForShare(post)}
                                onMenuClick={() => setSelectedPostForMenu(post)}
                              />
                            ))}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column - Quick Actions */}
              {isOwnProfile && (
                <div className='lg:col-span-1 space-y-6'>
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
              )}
            </div>
          </div>
        </div>

        <div className='lg:hidden'>
          <Footer />
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
          onPostUpdated={async (updatedPost: any) => {
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