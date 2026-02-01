"use client";
import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { getUserData, getUserBadges } from '@/lib/firebaseSerive';
import { calculateLevel } from '@/lib/xpService';
import { addComment, savePost, unsavePost, sharePost, followUser, unfollowUser } from '@/lib/postService';
import Footer from '@/components/phoneComponents/Footer';
import { MapPin, UserPlus, UserMinus, MessageCircle } from 'lucide-react';
import { collection, query, where, orderBy, getDocs, getDoc, doc as firestoreDoc } from 'firebase/firestore';
import questService from '@/lib/questService';
import { Quest } from '@/app/types';

// Add scrollbar-hide styles
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
  totalXP?: number;
  isVerified?: boolean;
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
}

const PublicProfilePage = () => {
  const router = useRouter();
  const params = useParams();
  const profileUserId = params?.userId as string;

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profileUser, setProfileUser] = useState<UserData | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [publicQuests, setPublicQuests] = useState<Quest[]>([]);
  const [levelInfo, setLevelInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setCurrentUser(authUser);

      if (profileUserId) {
        try {
          // Parallel data fetching for 3x faster loading!
          const [data, userBadges] = await Promise.all([
            getUserData(profileUserId),
            getUserBadges(profileUserId)
          ]);

          setProfileUser(data as UserData);
          setBadges(userBadges.slice(0, 3));

          // Check if current user is following
          if (authUser && data?.followers) {
            setIsFollowing(data.followers.includes(authUser.uid));
          }

          // Calculate level info
          const xp = data?.totalXP || 0;
          const level = calculateLevel(xp);
          setLevelInfo(level);

          // Fetch posts and quests in parallel
          await Promise.all([
            fetchUserPosts(profileUserId),
            fetchPublicQuests(profileUserId)
          ]);
        } catch (error) {
          console.error("Error fetching profile data:", error);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profileUserId]);

  const fetchUserPosts = async (uid: string) => {
    try {
      const postsRef = collection(db, 'posts');
      const q = query(
        postsRef,
        where('uid', '==', uid),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);

      // Filter out quest completion posts
      const posts: Post[] = querySnapshot.docs
        .filter(doc => {
          const data = doc.data();
          // Exclude quest posts (postType or questContext)
          return data.postType !== 'quest_completion' && !data.questContext;
        })
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            uid: data.uid || uid,
            userName: data.userName || profileUser?.displayName || 'User',
            userProfilePic: data.userProfilePic || profileUser?.photoURL || '/default-avatar.png',
            text: data.text || '',
            photoUrl: data.photoUrl || '',
            createdAt: data.createdAt,
            likeCount: data.likeCount || 0,
            commentCount: data.commentCount || 0,
            shareCount: data.shareCount || 0,
            location: data.location || '',
          };
        });

      setPosts(posts);
    } catch (error) {
      console.error('Error fetching user posts:', error);
    }
  };

  const fetchPublicQuests = async (uid: string) => {
    try {
      const allQuests = await questService.getUserQuests(uid);
      const publicQuestsOnly = allQuests.filter(q => q.isPublic);
      setPublicQuests(publicQuestsOnly);
    } catch (error) {
      console.error('Error fetching public quests:', error);
    }
  };

  const handleFollowToggle = async () => {
    if (!currentUser?.uid || !profileUserId) return;

    try {
      if (isFollowing) {
        await unfollowUser(currentUser.uid, profileUserId);
        setIsFollowing(false);
        setProfileUser(prev => prev ? {
          ...prev,
          followers: prev.followers?.filter(id => id !== currentUser.uid) || []
        } : null);
      } else {
        await followUser(currentUser.uid, profileUserId);
        setIsFollowing(true);
        setProfileUser(prev => prev ? {
          ...prev,
          followers: [...(prev.followers || []), currentUser.uid]
        } : null);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  const handleMessageUser = () => {
    router.push(`/messages/${profileUserId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#EA6100] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">User not found</p>
          <button
            onClick={() => router.back()}
            className="bg-[#EA6100] text-black px-6 py-2 rounded-lg font-medium hover:bg-[#f5c094] transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Check if viewing own profile
  const isOwnProfile = currentUser?.uid === profileUserId;

  return (
    <div className="min-h-screen bg-[#121212]">
      <style>{styles}</style>

      {/* Header with Back Button */}
      <div className='h-[60px] w-full bg-black flex items-center px-5 border-b border-gray-700'>
        <button
          onClick={() => router.back()}
          className='text-white mr-4'
        >
          ←
        </button>
        <p className='text-xl font-semibold text-white'>{profileUser.displayName || 'Profile'}</p>
      </div>

      <div className='text-white pb-20'>
        {/* Profile Header - No Edit/Settings buttons for public view */}
        <div className='relative'>
          <div className='h-32 w-full relative overflow-hidden'>
            <img
              src={profileUser.backgroundURL || "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800"}
              alt="Cover"
              className='w-full h-full object-cover'
            />
          </div>

          <div className='px-5 -mt-12'>
            <img
              src={profileUser.photoURL || 'https://via.placeholder.com/150'}
              alt={profileUser.displayName}
              className='w-24 h-24 rounded-full border-4 border-[#121212] object-cover'
            />
          </div>
        </div>

        {/* User Info */}
        <div className='px-5 mt-3'>
          <div className='flex items-center gap-2 mb-2'>
            <h2 className='text-2xl font-bold text-white'>{profileUser.displayName || 'User'}</h2>
            {profileUser.isVerified && (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#1DA1F2">
                <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.056-2.13c-.293-.303-.288-.694.018-.985.307-.29.718-.286 1.011.017l1.298 1.342 3.682-5.53c.12-.183.32-.29.526-.29.357 0 .688.291.688.612 0 .124-.065.249-.677.35z" />
              </svg>
            )}
          </div>

          <p className='text-gray-400 text-sm'>@{profileUser.displayName?.toLowerCase().replace(/\s/g, '') || 'user'}</p>

          {profileUser.title && (
            <p className='text-[#F7CEB0] text-sm mt-1'>{profileUser.title}</p>
          )}

          {profileUser.bio && (
            <p className='text-gray-300 text-sm mt-2 leading-relaxed'>{profileUser.bio}</p>
          )}

          {/* Stats */}
          <div className='flex gap-5 mt-4 text-sm'>
            <div>
              <span className='text-white font-bold'>{profileUser.postsCount || posts.length}</span>
              <span className='text-gray-400 ml-1'>Posts</span>
            </div>
            <div>
              <span className='text-white font-bold'>{profileUser.followers?.length || 0}</span>
              <span className='text-gray-400 ml-1'>Followers</span>
            </div>
            <div>
              <span className='text-white font-bold'>{profileUser.following?.length || 0}</span>
              <span className='text-gray-400 ml-1'>Following</span>
            </div>
          </div>

          {/* Action Buttons - Only show if not own profile */}
          {!isOwnProfile && currentUser && (
            <div className='flex gap-3 mt-4'>
              <button
                onClick={handleFollowToggle}
                className={`flex-1 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${isFollowing
                    ? 'bg-[#292929] text-white border border-gray-600 hover:bg-[#3a3a3a]'
                    : 'bg-[#F7CEB0] text-black hover:bg-[#e5bca0]'
                  }`}
              >
                {isFollowing ? (
                  <>
                    <UserMinus size={18} />
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={18} />
                    <span>Follow</span>
                  </>
                )}
              </button>

              <button
                onClick={handleMessageUser}
                className='px-6 py-2 rounded-lg font-medium bg-[#292929] text-white border border-gray-600 hover:bg-[#3a3a3a] transition-colors flex items-center justify-center gap-2'
              >
                <MessageCircle size={18} />
                <span>Message</span>
              </button>
            </div>
          )}

          {/* If viewing own profile, show link to account page */}
          {isOwnProfile && (
            <button
              onClick={() => router.push('/account')}
              className='w-full mt-4 py-2 rounded-lg font-medium bg-[#F7CEB0] text-black hover:bg-[#e5bca0] transition-colors'
            >
              Edit Profile
            </button>
          )}

          {/* Level Progress */}
          {levelInfo && (
            <div className='mt-5 bg-[#292929] p-4 rounded-xl'>
              <div className='flex items-center justify-between mb-2'>
                <span className='text-[#F7CEB0] font-semibold text-sm'>
                  {levelInfo.currentLevel?.name || 'Scout'}
                </span>
                {levelInfo.nextLevel && (
                  <span className='text-gray-400 text-xs'>
                    {levelInfo.xpToNext} XP to {levelInfo.nextLevel.name}
                  </span>
                )}
              </div>
              <div className='w-full bg-gray-700 rounded-full h-2.5'>
                <div
                  className='bg-gradient-to-r from-[#F7CEB0] to-[#e5bca0] h-2.5 rounded-full transition-all duration-300'
                  style={{ width: `${(levelInfo.progress || 0) * 100}%` }}
                ></div>
              </div>
              <p className='text-gray-400 text-xs mt-2'>
                {profileUser.totalXP || 0} XP Total
              </p>
            </div>
          )}

          {/* Badges */}
          {badges.length > 0 && (
            <div className='mt-5'>
              <h3 className='text-white font-semibold text-lg mb-3'>Earned Badges</h3>
              <div className='flex gap-3 overflow-x-auto pb-2 scrollbar-hide'>
                {badges.map(badge => (
                  <div
                    key={badge.id}
                    className='bg-[#F8EBE2] rounded-lg p-3 flex flex-col items-center min-w-[90px] flex-shrink-0'
                  >
                    <img
                      src={badge.iconUrl}
                      alt={badge.name}
                      className='w-12 h-12 object-contain mb-2'
                    />
                    <span className='text-[#402B09] text-xs font-semibold text-center'>
                      {badge.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Posts */}
          {posts.length > 0 && (
            <div className='mt-6'>
              <div className='flex items-center justify-between mb-3'>
                <h3 className='text-white font-semibold text-lg'>Posts</h3>
                {posts.length > 5 && (
                  <button
                    onClick={() => router.push(`/profile/${profileUserId}/posts`)}
                    className='text-[#F7CEB0] text-sm hover:underline'
                  >
                    View All
                  </button>
                )}
              </div>

              <div className='flex gap-4 overflow-x-auto pb-4 -mx-5 px-5 scrollbar-hide'>
                {posts.slice(0, 5).map(post => (
                  <CompactPostCard
                    key={post.id}
                    post={post}
                    onClick={() => router.push(`/post/${post.id}`)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Public Quests Only */}
          {publicQuests.length > 0 && (
            <div className='mt-6'>
              <div className='flex items-center justify-between mb-3'>
                <h3 className='text-white font-semibold text-lg'>Public Quests</h3>
                {publicQuests.length > 5 && (
                  <button
                    onClick={() => router.push(`/profile/${profileUserId}/quests`)}
                    className='text-[#F7CEB0] text-sm hover:underline'
                  >
                    View All
                  </button>
                )}
              </div>

              <div className='flex gap-4 overflow-x-auto pb-4 -mx-5 px-5 scrollbar-hide'>
                {publicQuests.slice(0, 5).map(quest => (
                  <QuestCard
                    key={quest.id}
                    quest={quest}
                    onClick={() => router.push(`/quest/${quest.id}`)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty States */}
          {posts.length === 0 && publicQuests.length === 0 && (
            <div className='mt-8 text-center py-8 bg-[#292929] rounded-xl'>
              <p className='text-gray-400'>No public content yet</p>
            </div>
          )}
        </div>

        <Footer />
      </div>
    </div>
  );
};

// Compact Post Card
const CompactPostCard: React.FC<{ post: Post; onClick: () => void }> = ({ post, onClick }) => {
  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div
      onClick={onClick}
      className='bg-[#292929] rounded-xl overflow-hidden cursor-pointer hover:bg-[#3a3a3a] transition-colors border border-gray-700 min-w-[300px] flex-shrink-0'
    >
      {post.photoUrl && (
        <div className='relative h-48'>
          <img
            src={Array.isArray(post.photoUrl) ? post.photoUrl[0] : post.photoUrl}
            alt="Post"
            className='w-full h-full object-cover'
          />
        </div>
      )}
      <div className='p-3'>
        <p className='text-white text-sm line-clamp-2 mb-2'>{post.text}</p>
        <div className='flex items-center justify-between text-xs text-gray-400'>
          <span>{formatTime(post.createdAt)}</span>
          <div className='flex items-center gap-3'>
            <span>❤️ {post.likeCount || 0}</span>
            <span>💬 {post.commentCount || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Quest Card
const QuestCard: React.FC<{ quest: Quest; onClick: () => void }> = ({ quest, onClick }) => {
  return (
    <div
      onClick={onClick}
      className='bg-[#292929] rounded-xl overflow-hidden cursor-pointer hover:bg-[#3a3a3a] transition-colors border border-gray-700 min-w-[280px] flex-shrink-0'
    >
      <div className='relative h-40'>
        <img
          src={quest.coverImageUrl as any || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600'}
          alt={quest.title}
          className='w-full h-full object-cover'
        />
        <div className='absolute inset-0 bg-gradient-to-t from-black/70 to-transparent' />
        <div className='absolute bottom-0 left-0 right-0 p-4'>
          <h4 className='text-white font-bold text-lg mb-1'>{quest.title}</h4>
          <div className='flex items-center gap-2 text-gray-300 text-sm'>
            <MapPin size={14} />
            <span>{quest.destination}</span>
          </div>
        </div>
      </div>
      <div className='p-4'>
        <div className='flex items-center justify-between text-sm'>
          <span className='text-gray-400'>
            {new Date(quest.startDate).toLocaleDateString()}
          </span>
          <span className='text-[#F7CEB0] font-medium'>Public</span>
        </div>
      </div>
    </div>
  );
};

export default PublicProfilePage;