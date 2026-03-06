'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { followUser, unfollowUser } from '@/lib/followService';
import { getUserBadges, getLevelInfo } from '@/lib/firebaseSerive';
import { User as UserType } from '@/app/types/index';
import { UserPlus, UserCheck } from 'lucide-react';

interface RightSidebarProps {
  user: UserType | null;
  userData: any;
}

const generateUsername = (displayName: string | null | undefined): string => {
  if (!displayName) return 'user';
  return displayName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9_]/g, '');
};

const RightSidebar: React.FC<RightSidebarProps> = ({ user, userData }) => {
  const [badges, setBadges] = useState<any[]>([]);
  const [levelInfo, setLevelInfo] = useState<any>(null);
  const [popularUsers, setPopularUsers] = useState<any[]>([]);
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
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, [user, userData]);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, 'users'), orderBy('followers', 'desc')),
      (snapshot) => {
        const usersData = snapshot.docs.map(docc => ({
          id: docc.id,
          ...docc.data(),
          photoURL: docc.data().photoURL || '/default-avatar.png',
          followers: docc.data().followers || []
        }));
        setPopularUsers(usersData.slice(0, 4));
      }
    );

    return () => unsubscribe();
  }, []);

  const handleFollow = async (uid: string) => {
    if (!user?.uid || uid === user.uid) return;

    try {
      const userToFollow = popularUsers.find(u => u.id === uid);
      const isFollowing = userToFollow?.followers?.includes(user.uid);

      if (isFollowing) {
        await unfollowUser(user.uid, uid);
      } else {
        await followUser(user.uid, uid);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  return (
    <div className="fixed right-0 top-0 h-screen w-[380px] border-l border-gray-700 bg-black p-4 overflow-y-auto">
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
            @{generateUsername(user?.displayName)}
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
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push(`/profile/${traveler.id}`)}>
                <img
                  src={traveler.photoURL}
                  alt={traveler.displayName}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <p className="text-white font-medium text-sm">{traveler.displayName}</p>
                  <p className="text-gray-400 text-xs">
                    {traveler.followers?.length || 0} followers
                  </p>
                </div>
              </div>

              {traveler.id !== user?.uid && (
                <button
                  onClick={() => handleFollow(traveler.id)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${traveler.followers?.includes(user?.uid)
                      ? 'bg-gray-700 text-white hover:bg-gray-600'
                      : 'bg-[#F7CEB0] text-black hover:bg-[#EA6100] hover:text-white'
                    }`}
                >
                  {traveler.followers?.includes(user?.uid) ? (
                    <UserCheck className="w-4 h-4" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RightSidebar;