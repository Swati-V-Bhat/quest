"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, orderBy, limit, getDocs, getDoc, doc as firestoreDoc } from 'firebase/firestore';
import { getUserKudosLeaderboard } from '@/lib/kudosService';
import { ArrowLeft, Trophy, Crown, Medal, Star, TrendingUp, Flame } from 'lucide-react';
// // import { RankBadge } from '@/components/gamification/RankComponents';
import NavBar from '@/components/LeftSideNav';
import Footer from '@/components/phoneComponents/Footer';

const LeaderboardPage = () => {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('qp'); // qp, quests, kudos, streaks
  const [leaderboardData, setLeaderboardData] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    loadLeaderboard();
  }, [activeTab]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      let data = [];

      switch (activeTab) {
        case 'qp':
          data = await getQPLeaderboard();
          break;
        case 'quests':
          data = await getQuestsLeaderboard();
          break;
        case 'kudos':
          data = await getUserKudosLeaderboard(20);
          break;
        case 'streaks':
          data = await getStreaksLeaderboard();
          break;
      }

      setLeaderboardData(data);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getQPLeaderboard = async () => {
    const gamificationRef = collection(db, 'gamification');
    const q = query(gamificationRef, orderBy('totalQPs', 'desc'), limit(20));
    const snapshot = await getDocs(q);

    return await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();
        // Fetch user profile by exact UID
        const userDoc = await getDoc(firestoreDoc(db, 'users', doc.id));
        const userData = userDoc.exists() ? userDoc.data() : null;

        return {
          uid: doc.id,
          displayName: userData?.displayName || 'Anonymous',
          photoURL: userData?.photoURL || '/default-avatar.png',
          value: data.totalQPs || 0,
          rankTier: data.currentRankTier || 0,
          rankTitle: data.rankTitle || 'Newcomer'
        };
      })
    );
  };

  const getQuestsLeaderboard = async () => {
    const gamificationRef = collection(db, 'gamification');
    const q = query(gamificationRef, orderBy('publishedQuests', 'desc'), limit(20));
    const snapshot = await getDocs(q);

    return await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();
        const userDoc = await getDoc(firestoreDoc(db, 'users', doc.id));
        const userData = userDoc.exists() ? userDoc.data() : null;

        return {
          uid: doc.id,
          displayName: userData?.displayName || 'Anonymous',
          photoURL: userData?.photoURL || '/default-avatar.png',
          value: data.publishedQuests || 0,
          rankTier: data.currentRankTier || 0,
          rankTitle: data.rankTitle || 'Newcomer'
        };
      })
    );
  };

  const getStreaksLeaderboard = async () => {
    const gamificationRef = collection(db, 'gamification');
    const q = query(gamificationRef, limit(100)); // Get all and sort client-side
    const snapshot = await getDocs(q);

    const data = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();
        const userDoc = await getDoc(firestoreDoc(db, 'users', doc.id));
        const userData = userDoc.exists() ? userDoc.data() : null;

        return {
          uid: doc.id,
          displayName: userData?.displayName || 'Anonymous',
          photoURL: userData?.photoURL || '/default-avatar.png',
          value: data.streak?.currentStreakDays || 0,
          rankTier: data.currentRankTier || 0,
          rankTitle: data.rankTitle || 'Newcomer'
        };
      })
    );

    return data.sort((a, b) => b.value - a.value).slice(0, 20);
  };

  const getTabIcon = () => {
    switch (activeTab) {
      case 'qp': return <Trophy className="text-[#EA6100]" size={24} />;
      case 'quests': return <Medal className="text-blue-500" size={24} />;
      case 'kudos': return <Star className="text-yellow-500" size={24} />;
      case 'streaks': return <Flame className="text-orange-500" size={24} />;
    }
  };

  const getTabLabel = () => {
    switch (activeTab) {
      case 'qp': return 'Quest Points';
      case 'quests': return 'Quests Published';
      case 'kudos': return 'Kudos Received';
      case 'streaks': return 'Current Streaks';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-[#EA6100] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212]">
      <div className="hidden lg:block">
        <NavBar user={user} onSignOut={() => auth.signOut()} />
      </div>

      <div className="lg:ml-[280px]">
        <div className="max-w-4xl mx-auto px-4 py-6 lg:px-8 pb-20 lg:pb-8">

          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Back</span>
            </button>

            <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <Trophy className="text-[#EA6100]" />
              Leaderboards
            </h1>
            <p className="text-gray-400">See who's leading the quest!</p>
          </div>

          {/* Tab Selector */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
            <TabButton active={activeTab === 'qp'} onClick={() => setActiveTab('qp')}>
              <Trophy size={18} />
              <span>Top QP</span>
            </TabButton>
            <TabButton active={activeTab === 'quests'} onClick={() => setActiveTab('quests')}>
              <Medal size={18} />
              <span>Top Questers</span>
            </TabButton>
            <TabButton active={activeTab === 'kudos'} onClick={() => setActiveTab('kudos')}>
              <Star size={18} />
              <span>Most Kudos</span>
            </TabButton>
            <TabButton active={activeTab === 'streaks'} onClick={() => setActiveTab('streaks')}>
              <Flame size={18} />
              <span>Hot Streaks</span>
            </TabButton>
          </div>

          {/* Leaderboard */}
          <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden">

            {/* Header */}
            <div className="bg-gradient-to-r from-[#EA6100] to-[#f97316] p-6 flex items-center gap-3">
              {getTabIcon()}
              <div>
                <h2 className="text-xl font-bold text-black">{getTabLabel()}</h2>
                <p className="text-black/70 text-sm">Top 20 players</p>
              </div>
            </div>

            {/* Podium - Top 3 */}
            {leaderboardData.length >= 3 && (
              <div className="grid grid-cols-3 gap-4 p-6 bg-[#121212] border-b border-gray-800">
                {/* 2nd Place */}
                <PodiumCard
                  rank={2}
                  player={leaderboardData[1]}
                  type={activeTab}
                />

                {/* 1st Place */}
                <PodiumCard
                  rank={1}
                  player={leaderboardData[0]}
                  type={activeTab}
                  isWinner
                />

                {/* 3rd Place */}
                <PodiumCard
                  rank={3}
                  player={leaderboardData[2]}
                  type={activeTab}
                />
              </div>
            )}

            {/* Rest of List */}
            <div className="divide-y divide-gray-800">
              {leaderboardData.slice(3).map((player, index) => (
                <LeaderboardRow
                  key={player.uid}
                  rank={index + 4}
                  player={player}
                  type={activeTab}
                  isCurrentUser={player.uid === user?.uid}
                />
              ))}
            </div>

            {leaderboardData.length === 0 && (
              <div className="text-center py-16">
                <Trophy size={48} className="mx-auto text-gray-600 mb-4" />
                <div className="text-gray-400">No data available yet</div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:hidden">
          <Footer />
        </div>
      </div>

      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

const TabButton = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold whitespace-nowrap transition-all ${active
        ? 'bg-[#EA6100] text-black'
        : 'bg-[#292929] text-gray-400 hover:bg-[#3a3a3a]'
      }`}
  >
    {children}
  </button>
);

const PodiumCard = ({ rank, player, type, isWinner = false }) => {
  const medals = {
    1: { icon: '🥇', color: '#FFD700', height: 'h-32' },
    2: { icon: '🥈', color: '#C0C0C0', height: 'h-28' },
    3: { icon: '🥉', color: '#CD7F32', height: 'h-24' }
  };

  const medal = medals[rank];

  return (
    <div className={`text-center ${rank === 1 ? 'order-2' : rank === 2 ? 'order-1' : 'order-3'}`}>
      <div className={`${medal.height} bg-[#1a1a1a] rounded-t-2xl flex items-end justify-center pb-4 mb-3 relative overflow-hidden`}>
        <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: medal.color }}></div>
        <img
          src={player.photoURL}
          alt={player.displayName}
          className="w-16 h-16 rounded-full border-4 border-[#121212] object-cover"
        />
      </div>
      <div className="text-3xl mb-2">{medal.icon}</div>
      <div className="text-white font-bold text-sm mb-1 truncate px-2">
        {player.displayName}
      </div>
      {/* <RankBadge rankTier={player.rankTier} size="sm" /> */}
      <div className="mt-2 text-xl font-bold" style={{ color: medal.color }}>
        {player.value.toLocaleString()}
      </div>
    </div>
  );
};

const LeaderboardRow = ({ rank, player, type, isCurrentUser }) => (
  <div className={`flex items-center justify-between p-4 hover:bg-[#292929] transition-colors ${isCurrentUser ? 'bg-[#EA6100]/10 border-l-4 border-[#EA6100]' : ''
    }`}>
    <div className="flex items-center gap-4 flex-1">
      <div className="w-8 text-center">
        <span className="text-gray-400 font-bold">{rank}</span>
      </div>

      <img
        src={player.photoURL}
        alt={player.displayName}
        className="w-12 h-12 rounded-full object-cover"
      />

      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-white font-semibold">{player.displayName}</span>
          {isCurrentUser && (
            <span className="bg-[#EA6100] text-black text-xs px-2 py-0.5 rounded-full font-semibold">
              You
            </span>
          )}
        </div>
        {/* <RankBadge rankTier={player.rankTier} size="sm" /> */}
      </div>
    </div>

    <div className="text-right">
      <div className="text-xl font-bold text-[#EA6100]">
        {player.value.toLocaleString()}
      </div>
      <div className="text-gray-400 text-xs">
        {type === 'qp' && 'QP'}
        {type === 'quests' && 'Quests'}
        {type === 'kudos' && 'Kudos'}
        {type === 'streaks' && 'Days'}
      </div>
    </div>
  </div>
);

export default LeaderboardPage;