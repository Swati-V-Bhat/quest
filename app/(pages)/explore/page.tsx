'use client';

import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, getDoc, doc as firestoreDoc, limit, orderBy, query, where } from 'firebase/firestore';
import { ChevronRight, Search, X, MapPin, Award, TrendingUp, Trophy, Crown, Medal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Post, User as UserType } from '@/app/types';
import { auth, db } from '@/lib/firebase';


import TrendingQuestCard from '@/components/Explore/TrendingQuestCard';
import PopularDestinations from '@/components/Explore/PopularDestinations';
import Footer from '@/components/phoneComponents/Footer';
import Header from '@/components/phoneComponents/header';
import NavBar from '@/components/LeftSideNav';
import { getCurrentUserData } from '@/lib/authService';
import { getUserBadges } from '@/lib/firebaseSerive';
import {
  getUserGamificationData,
  calculateRankInfo,
} from '@/lib/qpService';
import useResponsive from '@/hooks/useResponsive';

// Helper function to generate username
const generateUsername = (displayName: string | null | undefined): string => {
  if (!displayName) return 'user';
  return displayName
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9_]/g, '');
};

// Right Sidebar Component (similar to Feed)
const ExploreRightSidebar = ({ user, userData, style }: any) => {
  const [badges, setBadges] = useState<any[]>([]);
  const [rankInfo, setRankInfo] = useState<any>(null);
  const [trendingLocations, setTrendingLocations] = useState<any[]>([]);
  const [topQuesters, setTopQuesters] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.uid) return;

      try {
        const userBadges = await getUserBadges(user.uid);
        setBadges(userBadges.slice(0, 3));

        const gData = await getUserGamificationData(user.uid);
        setRankInfo(calculateRankInfo(gData));
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, [user, userData]);

  useEffect(() => {
    // Fetch trending locations from posts
    const fetchTrendingLocations = async () => {
      try {
        const postsRef = collection(db, 'posts');
        const q = query(postsRef, orderBy('createdAt', 'desc'), limit(100));
        const snapshot = await getDocs(q);

        const locationCount: Record<string, number> = {};
        snapshot.forEach((doc) => {
          const data = doc.data();
          const location = data.location || data.questContext?.location;
          if (location) {
            locationCount[location] = (locationCount[location] || 0) + 1;
          }
        });

        const trending = Object.entries(locationCount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([location, count]) => ({ location, count }));

        setTrendingLocations(trending);
      } catch (error) {
        console.error('Error fetching trending locations:', error);
      }
    };

    fetchTrendingLocations();
  }, []);

  useEffect(() => {
    const fetchTopQuesters = async () => {
      try {
        const q = query(collection(db, 'gamification'), orderBy('totalQPs', 'desc'), limit(5));
        const snapshot = await getDocs(q);
        const results = await Promise.all(
          snapshot.docs.map(async (d) => {
            const data = d.data();
            const userDoc = await getDoc(firestoreDoc(db, 'users', d.id));
            const u = userDoc.exists() ? userDoc.data() : null;
            return {
              uid: d.id,
              displayName: u?.displayName || 'Anonymous',
              photoURL: u?.photoURL || '/default-avatar.png',
              totalQPs: data.totalQPs || 0,
              rankTitle: data.rankTitle || 'Newcomer',
            };
          })
        );
        setTopQuesters(results);
      } catch (e) {
        console.error('Error fetching leaderboard:', e);
      }
    };
    fetchTopQuesters();
  }, []);

  return (
    <div className='hidden xl:block fixed right-0 top-0 h-screen w-[380px] border-l border-gray-700 bg-black p-4 overflow-y-auto' style={style}>
      {/* User Stats Card */}
      <div className='bg-gray-900 rounded-xl border border-gray-700 overflow-hidden mb-4'>
        <div className='h-24 bg-gradient-to-r from-[#F7CEB0] to-[#EA6100]'></div>

        <div className='px-4 pb-4'>
          <img
            src={user?.photoURL || '/default-avatar.png'}
            alt={user?.displayName}
            className='w-20 h-20 rounded-full border-4 border-gray-900 -mt-10 mb-3 object-cover cursor-pointer hover:opacity-80 transition-opacity'
            onClick={() => router.push(`/profile/${user?.uid}`)}
          />

          <h3
            className='text-white text-lg font-bold mb-1 cursor-pointer hover:underline'
            onClick={() => router.push(`/profile/${user?.uid}`)}
          >
            {user?.displayName || 'User'}
          </h3>
          <p className='text-gray-400 text-sm mb-3'>
            @{generateUsername(user?.displayName)}
          </p>

          {/* Stats */}
          <div className='grid grid-cols-2 gap-3 mb-4'>
            <div className='bg-gray-800 rounded-lg p-3'>
              <div className='flex items-center gap-2 mb-1'>
                <Award className='w-4 h-4 text-[#F7CEB0]' />
                <span className='text-gray-400 text-xs'>Total QP</span>
              </div>
              {/* *** UPDATED QP DISPLAY *** */}
              <span className='text-white font-bold text-lg'>
                {rankInfo?.totalQPs || 0}
              </span>
              {/* *** END UPDATED QP DISPLAY *** */}
            </div>
            <div className='bg-gray-800 rounded-lg p-3'>
              <div className='flex items-center gap-2 mb-1'>
                <TrendingUp className='w-4 h-4 text-[#F7CEB0]' />
                <span className='text-gray-400 text-xs'>Quests</span>
              </div>
              {/* *** UPDATED QUESTS DISPLAY *** */}
              <span className='text-white font-bold text-lg'>
                {rankInfo?.publishedQuests || 0}
              </span>
              {/* *** END UPDATED QUESTS DISPLAY *** */}
            </div>
          </div>

          {/* Level Progress */}
          {/* *** UPDATED RANK PROGRESS *** */}
          {rankInfo && (
            <div className='mb-4'>
              <div className='flex items-center justify-between mb-2'>
                <span className='text-[#F7CEB0] font-medium text-sm'>
                  {rankInfo.rankTitle}
                </span>
                {rankInfo.nextRankTitle !== 'Max Rank' && (
                  <span className='text-gray-400 text-xs'>
                    {rankInfo.qpToNextRank} QP to next
                  </span>
                )}
              </div>
              <div className='w-full bg-gray-800 rounded-full h-2'>
                <div
                  className='bg-gradient-to-r from-[#F7CEB0] to-[#EA6100] h-2 rounded-full transition-all'
                  style={{ width: `${(rankInfo.qpProgress || 0) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
          {/* *** END UPDATED RANK PROGRESS *** */}

          {/* Badges */}
          {badges.length > 0 && (
            <div>
              <div className='flex items-center justify-between mb-3'>
                <h4 className='text-white font-medium text-sm'>Recent Badges</h4>
                <button
                  onClick={() => router.push(`/account`)} // Go to account page
                  className='text-[#F7CEB0] text-xs hover:underline'
                >
                  View All
                </button>
              </div>
              <div className='flex gap-2'>
                {badges.map((badge) => (
                  <div
                    key={badge.id}
                    className='bg-[#F8EBE2] rounded-lg p-2 flex flex-col items-center min-w-[70px] cursor-pointer'
                    title={badge.description}
                    onClick={() => router.push('/gamification')} // Link to hub
                  >
                    <img
                      src={badge.iconUrl}
                      alt={badge.name}
                      className='w-10 h-10 object-contain mb-1'
                    />
                    <span className='text-[#402B09] text-[10px] font-semibold text-center'>
                      {badge.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {/* End User Stats Card */}

      {/* Trending Locations */}
      <div className='bg-gray-900 rounded-xl border border-gray-700 p-4 mb-4'>
        <div className='flex items-center gap-2 mb-4'>
          <MapPin className='w-5 h-5 text-[#F7CEB0]' />
          <h4 className='text-white font-medium text-base'>
            Trending Destinations
          </h4>
        </div>
        <div className='space-y-3'>
          {trendingLocations.length > 0 ? (
            trendingLocations.map((item, index) => (
              <div key={index} className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <div className='w-8 h-8 bg-[#F7CEB0] rounded-full flex items-center justify-center'>
                    <span className='text-black font-bold text-sm'>
                      {index + 1}
                    </span>
                  </div>
                  <div>
                    <h5 className='text-white text-sm font-medium'>
                      {item.location}
                    </h5>
                    <p className='text-gray-400 text-xs'>{item.count} posts</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className='text-gray-400 text-sm text-center'>
              No trending locations yet
            </p>
          )}
        </div>
      </div>

      {/* Mini Leaderboard */}
      <div className='bg-gray-900 rounded-xl border border-gray-700 overflow-hidden'>
        <div className='bg-gradient-to-r from-[#EA6100] to-[#f97316] px-4 py-3 flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Trophy className='w-4 h-4 text-black' />
            <h4 className='text-black font-bold text-sm'>Top Questers</h4>
          </div>
          <button
            onClick={() => router.push('/gamification/leaderboard')}
            className='text-black/70 text-xs font-medium hover:text-black transition-colors flex items-center gap-1'
          >
            View All <ChevronRight className='w-3 h-3' />
          </button>
        </div>
        <div className='divide-y divide-gray-800'>
          {topQuesters.map((player, index) => (
            <div
              key={player.uid}
              className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-800 transition-colors cursor-pointer ${
                player.uid === user?.uid ? 'bg-[#EA6100]/10 border-l-2 border-[#EA6100]' : ''
              }`}
              onClick={() => router.push(`/profile/${player.uid}`)}
            >
              <span className='text-gray-500 text-xs font-bold w-4 text-center'>
                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
              </span>
              <img
                src={player.photoURL}
                alt={player.displayName}
                className='w-8 h-8 rounded-full object-cover border border-gray-700'
              />
              <div className='flex-1 min-w-0'>
                <p className='text-white text-sm font-medium truncate'>
                  {player.displayName}
                  {player.uid === user?.uid && (
                    <span className='ml-1 text-[10px] bg-[#EA6100] text-black px-1.5 py-0.5 rounded-full'>You</span>
                  )}
                </p>
                <p className='text-gray-500 text-xs'>{player.rankTitle}</p>
              </div>
              <span className='text-[#EA6100] font-bold text-sm whitespace-nowrap'>
                {player.totalQPs.toLocaleString()} QP
              </span>
            </div>
          ))}
          {topQuesters.length === 0 && (
            <p className='text-gray-500 text-sm text-center py-6'>No data yet</p>
          )}
        </div>
      </div>
    </div>


  );
};

const DesktopLoadingSkeleton = () => (
  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
    {[...Array(6)].map((_, i) => (
      <div key={i} className="relative w-full h-[224px] rounded-lg overflow-hidden bg-gray-800 animate-pulse">
        <div className="absolute bottom-2 left-2 w-3/4 space-y-2">
          <div className="h-4 bg-gray-700 rounded w-full" />
          <div className="h-3 bg-gray-700 rounded w-2/3" />
        </div>
      </div>
    ))}
  </div>
);



const DESKTOP_MAIN_WIDTH = 50; // percentage of viewport width used for main content
const LEFT_NAV_WIDTH = 280;
const RIGHT_SIDEBAR_WIDTH = 380;
const SIDEBAR_GAP = 5;

const DesktopExplore = () => {
  const [trendingPosts, setTrendingPosts] = useState<Post[]>([]);
  const [recommendedPosts, setRecommendedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserType | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Post[]>([]);
  const [searching, setSearching] = useState(false);

  const router = useRouter();


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser({
          uid: currentUser.uid,
          displayName: currentUser.displayName ?? undefined,
          email: currentUser.email ?? undefined,
          photoURL: currentUser.photoURL ?? undefined,
        });

        try {
          const userDetails = await getCurrentUserData();
          setUserData(userDetails);
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      } else {
        setUser(null);
        setUserData(null);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchQuestPosts = async () => {
      try {
        setLoading(true);

        const postsRef = collection(db, 'posts');
        const q = query(postsRef, where('postType', '==', 'quest_completion'), orderBy('createdAt', 'desc'), limit(24));

        const querySnapshot = await getDocs(q);
        const posts: Post[] = [];

        querySnapshot.forEach((doc) => {
          posts.push({
            id: doc.id,
            ...doc.data(),
          } as Post);
        });

        setTrendingPosts(posts.slice(0, 12));

        const remaining = posts.slice(12);
        const shuffled = remaining.sort(() => Math.random() - 0.5);
        setRecommendedPosts(shuffled.slice(0, 12));
      } catch (error) {
        console.error('Error fetching quest posts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestPosts();
  }, []);

  const handleSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    try {
      const postsRef = collection(db, 'posts');
      const results: Post[] = [];
      const querySnapshot = await getDocs(query(postsRef, limit(100)));

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const searchLower = searchTerm.toLowerCase();

        const questTitle = data.questContext?.questTitle?.toLowerCase() || '';
        const questDescription =
          data.questContext?.description?.toLowerCase() || '';
        const postText = data.text?.toLowerCase() || '';
        const location = data.location?.toLowerCase() || '';
        const userName = data.userName?.toLowerCase() || '';

        if (
          questTitle.includes(searchLower) ||
          questDescription.includes(searchLower) ||
          postText.includes(searchLower) ||
          location.includes(searchLower) ||
          userName.includes(searchLower)
        ) {
          results.push({
            id: doc.id,
            ...data,
          } as Post);
        }
      });

      setSearchResults(results);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
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

  return (
    <div className="min-h-screen bg-black text-white relative overflow-x-hidden">
      <NavBar
        user={user}
        onSignOut={handleSignOut}
        style={{ left: containerStartExpression, right: 'auto', width: `${LEFT_NAV_WIDTH}px` }}
      />

      <main className="relative min-h-screen bg-black" style={mainWidthStyle}>
        <div className="max-w-4xl mx-auto md:border-x border-gray-700 min-h-screen">

          <div className="relative bg-[url('https://images.unsplash.com/photo-1521336575822-6da63fb45455?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8YWR2ZW50dXJlfGVufDB8fDB8fHww')] bg-no-repeat bg-cover bg-center h-[360px] overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/40 to-transparent" />
            <div className="absolute top-4 left-0 w-full px-6">
              <div className="relative">
                <Search className="absolute text-white left-4 top-1/2 -translate-y-1/2 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    handleSearch(e.target.value);
                  }}
                  placeholder="Search quests, locations, or travelers..."
                  className="w-full bg-black/60 text-white pl-12 pr-12 py-3 rounded-full border border-gray-700 focus:ring-2 focus:ring-[#F7CEB0] focus:border-transparent focus:outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
            <div className="absolute bottom-24 md:bottom-42 left-0 w-full px-6">
              <h1 className="text-xl sm:text-2xl font-bold mb-3 text-white text-center">
                Not sure Where to Start?
              </h1>
              <p className="text-xs sm:text-sm text-gray-200 mb-6 text-center">
                Let AI guide your journey form first idea to final itinerary
              </p>
            </div>

            <div className="absolute bottom-0 left-0 p-6 w-full flex justify-center">
              <button
                onClick={() => router.push('/aitrip')}
                className="group relative bg-white text-black px-8 py-3.5 rounded-full font-semibold text-base sm:text-lg hover:bg-gray-100 transition-all duration-300 flex items-center gap-3 shadow-lg hover:shadow-xl hover:scale-105"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                <span>Plan Your Trip with AI</span>
                <svg
                  className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-1 transition-transform duration-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-6 w-full border-b border-gray-700">
            {searchQuery && (
              <div>
                {searching ? (
                  <div className='text-center py-8'>
                    <p className='text-gray-400'>Searching...</p>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div>
                    <h3 className='text-white font-semibold text-lg mb-3'>Search Results ({searchResults.length})</h3>
                    <div className='grid grid-cols-2 lg:grid-cols-3 gap-4'>
                      {searchResults.map((post) => (
                        <TrendingQuestCard
                          key={post.id}
                          postId={post.id}
                          questId={post.questContext?.questId || ''}
                          cardTitle={
                            post.questContext?.questTitle || 'Untitled Quest'
                          }
                          cardContent={
                            post.questContext?.description || post.text || ''
                          }
                          cardALT={post.questContext?.questTitle || 'Quest'}
                          cardURL={
                            post.photoUrl ||
                            post.imageUrls?.[0] ||
                            'https://images.unsplash.com/photo-1506744038136-46273834b3fb'
                          }
                          ownerName={post.userName || 'Anonymous'}
                          ownerPhoto={post.userProfilePic || ''}
                          xpEarned={post.questContext?.xpEarned}
                          difficulty={post.questContext?.difficulty}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className='text-center py-8'>
                    <p className='text-gray-400'>
                      No results found for "{searchQuery}"
                    </p>
                    <p className='text-gray-500 text-sm mt-2'>
                      Try searching with different keywords
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {!searchQuery && (
            <div className="p-6">
              <div className="mb-8">
                <div className="mb-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className='font-semibold text-2xl'>
                        Trending Quests
                      </h3>
                      <p className='text-gray-400 text-sm'>
                        What other travelers are up to this week
                      </p>
                    </div>
                    <button className='cursor-pointer hover:bg-gray-800 p-2 rounded-full transition-colors'>
                      <ChevronRight className='font-bold w-6 h-6 text-gray-400' />
                    </button>
                  </div>
                </div>

                {loading ? (
                  <DesktopLoadingSkeleton />
                ) : trendingPosts.length > 0 ? (
                  <div className='grid grid-cols-2 lg:grid-cols-3 gap-4'>
                    {trendingPosts.map((post) => (
                      <TrendingQuestCard
                        key={post.id}
                        postId={post.id}
                        questId={post.questContext?.questId || ''}
                        cardTitle={
                          post.questContext?.questTitle || 'Untitled Quest'
                        }
                        cardContent={
                          post.questContext?.description || post.text || ''
                        }
                        cardALT={post.questContext?.questTitle || 'Quest'}
                        cardURL={
                          post.photoUrl ||
                          post.imageUrls?.[0] ||
                          'https://images.unsplash.com/photo-1506744038136-46273834b3fb'
                        }
                        ownerName={post.userName || 'Anonymous'}
                        ownerPhoto={post.userProfilePic || ''}
                        xpEarned={post.questContext?.xpEarned}
                        difficulty={post.questContext?.difficulty}
                      />
                    ))}
                  </div>
                ) : (
                  <div className='text-center py-12'>
                    <p className='text-gray-400'>
                      No trending quests available yet
                    </p>
                    <p className='text-gray-500 text-sm mt-2'>
                      Be the first to share your quest!
                    </p>
                  </div>
                )}
              </div>

              <div className="mb-8">
                <div className="mb-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className='font-semibold text-2xl'>
                        Recommended for You
                      </h3>
                      <p className='text-gray-400 text-sm'>
                        Handpicked just for you
                      </p>
                    </div>
                    <button className='cursor-pointer hover:bg-gray-800 p-2 rounded-full transition-colors'>
                      <ChevronRight className='font-bold w-6 h-6 text-gray-400' />
                    </button>
                  </div>
                </div>

                {loading ? (
                  <DesktopLoadingSkeleton />
                ) : recommendedPosts.length > 0 ? (
                  <div className='grid grid-cols-2 lg:grid-cols-3 gap-4'>
                    {recommendedPosts.map((post) => (
                      <TrendingQuestCard
                        key={post.id}
                        postId={post.id}
                        questId={post.questContext?.questId || ''}
                        cardTitle={
                          post.questContext?.questTitle || 'Untitled Quest'
                        }
                        cardContent={
                          post.questContext?.description || post.text || ''
                        }
                        cardALT={post.questContext?.questTitle || 'Quest'}
                        cardURL={
                          post.photoUrl ||
                          post.imageUrls?.[0] ||
                          'https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0'
                        }
                        ownerName={post.userName || 'Anonymous'}
                        ownerPhoto={post.userProfilePic || ''}
                        xpEarned={post.questContext?.xpEarned}
                        difficulty={post.questContext?.difficulty}
                      />
                    ))}
                  </div>
                ) : (
                  <div className='text-center py-12'>
                    <p className='text-gray-400'>
                      No recommendations available yet
                    </p>
                    <p className='text-gray-500 text-sm mt-2'>
                      Explore more quests to get personalized recommendations
                    </p>
                  </div>
                )}
              </div>

              <div className="mb-8">
                <PopularDestinations />
              </div>
            </div>
          )}
        </div>
      </main>

      <ExploreRightSidebar
        user={user}
        userData={userData}
        style={{ left: rightSidebarLeftExpression, right: 'auto', width: `${RIGHT_SIDEBAR_WIDTH}px` }}
      />
    </div>
  );
};

// Mobile Explore Component (keeps original mobile design)
const MobileExplore = () => {
  const [trendingPosts, setTrendingPosts] = useState<Post[]>([]);
  const [recommendedPosts, setRecommendedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [topQuesters, setTopQuesters] = useState<any[]>([]);
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Post[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    try {
      const postsRef = collection(db, 'posts');
      const results: Post[] = [];
      const querySnapshot = await getDocs(query(postsRef, limit(100)));

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const searchLower = searchTerm.toLowerCase();

        const questTitle = data.questContext?.questTitle?.toLowerCase() || '';
        const questDescription =
          data.questContext?.description?.toLowerCase() || '';
        const postText = data.text?.toLowerCase() || '';
        const location = data.location?.toLowerCase() || '';
        const userName = data.userName?.toLowerCase() || '';

        if (
          questTitle.includes(searchLower) ||
          questDescription.includes(searchLower) ||
          postText.includes(searchLower) ||
          location.includes(searchLower) ||
          userName.includes(searchLower)
        ) {
          results.push({
            id: doc.id,
            ...data,
          } as Post);
        }
      });

      setSearchResults(results);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchTopQuesters = async () => {
      try {
        const q = query(collection(db, 'gamification'), orderBy('totalQPs', 'desc'), limit(5));
        const snapshot = await getDocs(q);
        const results = await Promise.all(
          snapshot.docs.map(async (d) => {
            const data = d.data();
            const userDoc = await getDoc(firestoreDoc(db, 'users', d.id));
            const u = userDoc.exists() ? userDoc.data() : null;
            return {
              uid: d.id,
              displayName: u?.displayName || 'Anonymous',
              photoURL: u?.photoURL || '/default-avatar.png',
              totalQPs: data.totalQPs || 0,
              rankTitle: data.rankTitle || 'Newcomer',
            };
          })
        );
        setTopQuesters(results);
      } catch (e) {
        console.error('Error fetching leaderboard:', e);
      }
    };
    fetchTopQuesters();
  }, []);

  useEffect(() => {
    const fetchQuestPosts = async () => {
      try {
        setLoading(true);

        const postsRef = collection(db, 'posts');
        const q = query(
          postsRef,
          where('postType', '==', 'quest_completion'),
          orderBy('createdAt', 'desc'),
          limit(24)
        );

        const querySnapshot = await getDocs(q);
        const posts: Post[] = [];

        querySnapshot.forEach((doc) => {
          posts.push({
            id: doc.id,
            ...doc.data(),
          } as Post);
        });

        setTrendingPosts(posts.slice(0, 12));

        const remaining = posts.slice(12);
        const shuffled = remaining.sort(() => Math.random() - 0.5);
        setRecommendedPosts(shuffled.slice(0, 12));
      } catch (error) {
        console.error('Error fetching quest posts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestPosts();
  }, []);

  const LoadingSkeleton = () => (
    <div className='flex space-x-3 overflow-x-scroll scrollbar-none'>
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className='relative flex-shrink-0 w-[216px] h-[224px] rounded-lg overflow-hidden bg-gray-800 animate-pulse mr-3'
        >
          <div className='absolute bottom-2 left-2 w-3/4 space-y-2'>
            <div className='h-4 bg-gray-700 rounded w-full'></div>
            <div className='h-3 bg-gray-700 rounded w-2/3'></div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      <div className='bg-black text-white min-h-screen'>
        <Header />

        <div className="relative bg-[url('https://images.unsplash.com/photo-1521336575822-6da63fb45455?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8YWR2ZW50dXJlfGVufDB8fDB8fHww')] mb-5 bg-no-repeat bg-cover bg-center h-[420px] sm:h-[460px] pt-4 pb-24 overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/40 to-transparent" />
          <div className="absolute top-2 w-full px-4">
            <div className="relative">
              <Search className="absolute text-white left-4 top-1/2 -translate-y-1/2 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  handleSearch(e.target.value);
                }}
                placeholder="Search quests, locations, or travelers..."
                className="w-full bg-black/60 text-white pl-12 pr-12 py-3 rounded-full border border-gray-700 focus:ring-2 focus:ring-[#F7CEB0] focus:border-transparent focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
          <div className="absolute bottom-0 left-0 p-4 w-full flex justify-center">
            <button
              onClick={() => router.push('/aitrip')}
              className='group relative bg-white text-black px-8 py-3.5 rounded-full font-semibold text-base sm:text-lg hover:bg-gray-100 transition-all duration-300 flex items-center gap-3 shadow-lg hover:shadow-xl hover:scale-105'
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              <span>Plan Your Trip with AI</span>
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-1 transition-transform duration-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        </div>

        <div className="m-6 pt-4">
          {searchQuery && (
            <div className="mb-6">
              {searching ? (
                <div className="text-center py-6">
                  <p className="text-gray-400">Searching...</p>
                </div>
              ) : searchResults.length > 0 ? (
                <div>
                  <h3 className="text-white font-semibold text-lg mb-3">Search Results ({searchResults.length})</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {searchResults.map((post) => (
                      <TrendingQuestCard
                        key={post.id}
                        postId={post.id}
                        questId={post.questContext?.questId || ''}
                        cardTitle={post.questContext?.questTitle || 'Untitled Quest'}
                        cardContent={post.questContext?.description || post.text || ''}
                        cardALT={post.questContext?.questTitle || 'Quest'}
                        cardURL={post.photoUrl || post.imageUrls?.[0] || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb'}
                        ownerName={post.userName || 'Anonymous'}
                        ownerPhoto={post.userProfilePic || ''}
                        xpEarned={post.questContext?.xpEarned}
                        difficulty={post.questContext?.difficulty}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-gray-400">No results found for "{searchQuery}"</p>
                  <p className="text-gray-500 text-sm mt-2">Try searching with different keywords</p>
                </div>
              )}
            </div>
          )}

          <div className='mb-8'>
            <div className='mb-3'>
              <div className='flex justify-between items-center'>
                <div>
                  <h3 className='font-semibold text-2xl'>Trending Quests</h3>
                  <p className='text-gray-400 text-sm'>
                    What other travelers are up to this week
                  </p>
                </div>
                <div className='cursor-pointer hover:bg-gray-800 p-2 rounded-full transition-colors'>
                  <ChevronRight className='font-bold size-6 sm:size-8 text-gray-400' />
                </div>
              </div>
            </div>

            {loading ? (
              <LoadingSkeleton />
            ) : trendingPosts.length > 0 ? (
              <div className='flex space-x-3 overflow-x-scroll scrollbar-none pb-4'>
                {trendingPosts.map((post) => (
                  <TrendingQuestCard
                    key={post.id}
                    postId={post.id}
                    questId={post.questContext?.questId || ''}
                    cardTitle={
                      post.questContext?.questTitle || 'Untitled Quest'
                    }
                    cardContent={
                      post.questContext?.description || post.text || ''
                    }
                    cardALT={post.questContext?.questTitle || 'Quest'}
                    cardURL={
                      post.photoUrl ||
                      post.imageUrls?.[0] ||
                      'https://images.unsplash.com/photo-1506744038136-46273834b3fb'
                    }
                    ownerName={post.userName || 'Anonymous'}
                    ownerPhoto={post.userProfilePic || ''}
                    xpEarned={post.questContext?.xpEarned}
                    difficulty={post.questContext?.difficulty}
                  />
                ))}
              </div>
            ) : (
              <div className='text-center py-12'>
                <p className='text-gray-400'>
                  No trending quests available yet
                </p>
                <p className='text-gray-500 text-sm mt-2'>
                  Be the first to share your quest!
                </p>
              </div>
            )}
          </div>

          <div className='mb-8'>
            <div className='mb-3'>
              <div className='flex justify-between items-center'>
                <div>
                  <h3 className='font-semibold text-2xl'>
                    Recommended for You
                  </h3>
                  <p className='text-gray-400 text-sm'>
                    Handpicked just for you
                  </p>
                </div>
                <div className='cursor-pointer hover:bg-gray-800 p-2 rounded-full transition-colors'>
                  <ChevronRight className='font-bold size-6 sm:size-8 text-gray-400' />
                </div>
              </div>
            </div>

            {loading ? (
              <LoadingSkeleton />
            ) : recommendedPosts.length > 0 ? (
              <div className='flex space-x-3 overflow-x-scroll scrollbar-none pb-4'>
                {recommendedPosts.map((post) => (
                  <TrendingQuestCard
                    key={post.id}
                    postId={post.id}
                    questId={post.questContext?.questId || ''}
                    cardTitle={
                      post.questContext?.questTitle || 'Untitled Quest'
                    }
                    cardContent={
                      post.questContext?.description || post.text || ''
                    }
                    cardALT={post.questContext?.questTitle || 'Quest'}
                    cardURL={
                      post.photoUrl ||
                      post.imageUrls?.[0] ||
                      'https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0'
                    }
                    ownerName={post.userName || 'Anonymous'}
                    ownerPhoto={post.userProfilePic || ''}
                    xpEarned={post.questContext?.xpEarned}
                    difficulty={post.questContext?.difficulty}
                  />
                ))}
              </div>
            ) : (
              <div className='text-center py-12'>
                <p className='text-gray-400'>
                  No recommendations available yet
                </p>
                <p className='text-gray-500 text-sm mt-2'>
                  Explore more quests to get personalized recommendations
                </p>
              </div>
            )}
          </div>

          {/* Leaderboard Section */}
          <div className='mb-8'>
            <div className='flex justify-between items-center mb-4'>
              <div>
                <h3 className='font-semibold text-2xl flex items-center gap-2'>
                  <Trophy className='w-6 h-6 text-[#EA6100]' />
                  Top Questers
                </h3>
                <p className='text-gray-400 text-sm'>Quest Points leaderboard</p>
              </div>
              <button
                onClick={() => router.push('/gamification/leaderboard')}
                className='flex items-center gap-1 text-[#EA6100] text-sm font-medium hover:underline'
              >
                View All <ChevronRight className='w-4 h-4' />
              </button>
            </div>

            <div className='bg-[#1a1a1a] rounded-2xl overflow-hidden border border-gray-800'>
              {/* Top 3 Podium */}
              {topQuesters.length >= 3 && (
                <div className='grid grid-cols-3 gap-2 p-4 bg-gradient-to-b from-[#EA6100]/10 to-transparent border-b border-gray-800'>
                  {/* 2nd */}
                  <div className='text-center'>
                    <img src={topQuesters[1]?.photoURL} alt={topQuesters[1]?.displayName} className='w-12 h-12 rounded-full border-2 border-gray-500 object-cover mx-auto mb-1' />
                    <div className='text-2xl'>🥈</div>
                    <p className='text-white text-xs font-medium truncate'>{topQuesters[1]?.displayName}</p>
                    <p className='text-[#EA6100] text-xs font-bold'>{topQuesters[1]?.totalQPs} QP</p>
                  </div>
                  {/* 1st */}
                  <div className='text-center -mt-2'>
                    <div className='text-2xl text-center mb-1'>👑</div>
                    <img src={topQuesters[0]?.photoURL} alt={topQuesters[0]?.displayName} className='w-14 h-14 rounded-full border-2 border-[#EA6100] object-cover mx-auto mb-1' />
                    <div className='text-2xl'>🥇</div>
                    <p className='text-white text-xs font-bold truncate'>{topQuesters[0]?.displayName}</p>
                    <p className='text-[#EA6100] text-xs font-bold'>{topQuesters[0]?.totalQPs} QP</p>
                  </div>
                  {/* 3rd */}
                  <div className='text-center'>
                    <img src={topQuesters[2]?.photoURL} alt={topQuesters[2]?.displayName} className='w-12 h-12 rounded-full border-2 border-[#CD7F32] object-cover mx-auto mb-1' />
                    <div className='text-2xl'>🥉</div>
                    <p className='text-white text-xs font-medium truncate'>{topQuesters[2]?.displayName}</p>
                    <p className='text-[#EA6100] text-xs font-bold'>{topQuesters[2]?.totalQPs} QP</p>
                  </div>
                </div>
              )}
              {/* Remaining rows (4th & 5th) */}
              <div className='divide-y divide-gray-800'>
                {topQuesters.slice(3).map((player, i) => (
                  <div
                    key={player.uid}
                    className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-800 transition-colors cursor-pointer ${
                      player.uid === user?.uid ? 'bg-[#EA6100]/10 border-l-2 border-[#EA6100]' : ''
                    }`}
                    onClick={() => router.push(`/profile/${player.uid}`)}
                  >
                    <span className='text-gray-500 text-sm font-bold w-5 text-center'>{i + 4}</span>
                    <img src={player.photoURL} alt={player.displayName} className='w-9 h-9 rounded-full object-cover border border-gray-700' />
                    <div className='flex-1 min-w-0'>
                      <p className='text-white text-sm font-medium truncate'>
                        {player.displayName}
                        {player.uid === user?.uid && <span className='ml-1 text-[10px] bg-[#EA6100] text-black px-1.5 py-0.5 rounded-full'>You</span>}
                      </p>
                      <p className='text-gray-500 text-xs'>{player.rankTitle}</p>
                    </div>
                    <span className='text-[#EA6100] font-bold text-sm'>{player.totalQPs.toLocaleString()} QP</span>
                  </div>
                ))}
              </div>
              {topQuesters.length === 0 && <p className='text-gray-500 text-sm text-center py-8'>No data yet</p>}
            </div>
          </div>

          <div className='mb-20'>
            <PopularDestinations />
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};
// Main Responsive Component
const ExplorePage = () => {
  const isDesktop = useResponsive(768);

  if (isDesktop) {
    return <DesktopExplore />;
  }

  return <MobileExplore />;
};

export default ExplorePage;