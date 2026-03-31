// lib/qpService.js
import { db } from './firebase';
import {
  doc,
  updateDoc,
  increment,
  serverTimestamp,
  collection,
  addDoc,
  getDoc,
  setDoc,
  arrayUnion,
  arrayRemove,
  runTransaction
} from 'firebase/firestore';

// Quest Point (QP) values for different actions
export const QP_VALUES = {
  PROFILE_COMPLETE: 10,
  SPECIALTY_BADGE: 30,
  REFERRAL_SUCCESS: 10,
  REFERRED_BONUS: 5,
  NEW_QUEST_SUBMIT: 25, // Base reward
  DAILY_CHECKIN: 1,
  DAILY_GAME_WIN: 1,
  STREAK_7_DAY: 5,
  STREAK_14_DAY: 8,
  STREAK_30_DAY: 12,
  STREAK_100_DAY: 20
};

// Tiered Quest Submission Bonuses
export const TIER_BONUSES = {
  1: 0,  // Wayfinder
  2: 1,  // Cartographer
  3: 2,  // Explorer
  4: 5,  // Questsmith
  5: 5,  // Voyage Master
  6: 5   // Master Guide
};

// Rank Thresholds
export const RANK_THRESHOLDS = [
  {
    level: 1,
    title: 'Wayfinder',
    qpRequired: 50,
    questsRequired: 0,
    color: '#9CA3AF' // Gray
  },
  {
    level: 2,
    title: 'Cartographer',
    qpRequired: 250,
    questsRequired: 5,
    color: '#10B981' // Green
  },
  {
    level: 3,
    title: 'Explorer',
    qpRequired: 500,
    questsRequired: 15,
    color: '#3B82F6' // Blue
  },
  {
    level: 4,
    title: 'Questsmith',
    qpRequired: 1000,
    questsRequired: 25,
    color: '#8B5CF6' // Purple
  },
  {
    level: 5,
    title: 'Voyage Master',
    qpRequired: 1500,
    questsRequired: 40,
    color: '#F59E0B' // Amber
  },
  {
    level: 6,
    title: 'Master Guide',
    qpRequired: 2000,
    questsRequired: 50,
    color: '#EA6100' // OnQuest Orange
  }
];

// Streak Buyback Costs
export const STREAK_BUYBACK_COSTS = {
  '0-7': 5,
  '7-14': 10,
  '14-30': 20,
  '30-100': 35,
  '100+': 50
};

// Streak Milestones - QP bonuses for hitting streak milestones
export const STREAK_MILESTONES = {
  7: { qp: 5 },
  14: { qp: 8 },
  30: { qp: 12 },
  100: { qp: 20 }
};

// Specialty Badges Configuration
export const SPECIALTY_BADGES = {
  FOODIE_ADVENTURER: {
    id: 'FOODIE_ADVENTURER',
    name: 'Foodie Adventurer',
    description: '50+ contributions related to local cuisine/restaurants',
    iconUrl: '/badges/foodie.png',
    qpReward: 30,
    criteria: { type: 'cuisine_contributions', count: 50 }
  },
  COASTAL_VOYAGER: {
    id: 'COASTAL_VOYAGER',
    name: 'Coastal Voyager',
    description: '5+ Quests focused on beach/island/coastal destinations',
    iconUrl: '/badges/coastal.png',
    qpReward: 30,
    criteria: { type: 'coastal_quests', count: 5 }
  },
  PEAK_CONQUEROR: {
    id: 'PEAK_CONQUEROR',
    name: 'Peak Conqueror',
    description: '5+ Quests focused on mountains/high-altitude terrain',
    iconUrl: '/badges/peak.png',
    qpReward: 30,
    criteria: { type: 'mountain_quests', count: 5 }
  },
  CONSISTENCY_MASTER: {
    id: 'CONSISTENCY_MASTER',
    name: 'Consistency Master',
    description: '100-day streak OR three 30-day streaks',
    iconUrl: '/badges/consistency.png',
    qpReward: 30,
    criteria: { type: 'streak_milestone' }
  },
  COMMUNITY_CHAMPION: {
    id: 'COMMUNITY_CHAMPION',
    name: 'Community Champion',
    description: 'Successfully refer 5 new users',
    iconUrl: '/badges/community.png',
    qpReward: 30,
    criteria: { type: 'referrals', count: 5 }
  }
};

/**
 * Initialize gamification data for a new user
 */
export const initializeUserGamification = async (uid) => {
  try {
    const gamificationRef = doc(db, 'gamification', uid);

    const initialData = {
      userId: uid,
      totalQPs: 0,
      currentRankTier: 0,
      rankTitle: 'Novice',
      publishedQuests: 0,
      referralsCompleted: 0,
      badgeStatus: Object.keys(SPECIALTY_BADGES).reduce((acc, key) => {
        acc[key] = {
          isAchieved: false,
          progressCount: 0
        };
        return acc;
      }, {}),
      streak: {
        currentStreakDays: 0,
        lastCheckInDate: null,
        hasStreakFreeze: false,
        threeThirtyDayStreaks: 0,
        milestonesClaimed: []
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(gamificationRef, initialData);
    console.log('Initialized gamification data for user:', uid);
    return initialData;
  } catch (error) {
    console.error('Error initializing gamification:', error);
    throw error;
  }
};

/**
 * Get user's gamification data
 */
export const getUserGamificationData = async (uid) => {
  try {
    const gamificationRef = doc(db, 'gamification', uid);
    const gamificationDoc = await getDoc(gamificationRef);

    if (!gamificationDoc.exists()) {
      // Initialize if doesn't exist
      try {
        return await initializeUserGamification(uid);
      } catch (initError) {
        console.warn('Could not initialize gamification (likely viewing another user)', initError);
        // Return default data to display on profile instead of throwing
        return {
          userId: uid,
          totalQPs: 0,
          currentRankTier: 0,
          rankTitle: 'Novice',
          publishedQuests: 0,
          referralsCompleted: 0,
          badgeStatus: {},
          streak: {
            currentStreakDays: 0,
            hasStreakFreeze: false
          }
        };
      }
    }

    return gamificationDoc.data();
  } catch (error) {
    console.error('Error getting gamification data:', error);
    throw error;
  }
};

/**
 * Update User QPs - Core transactional function
 */
export const updateUserQPs = async (uid, amount, eventType, metadata = {}) => {
  try {
    const gamificationRef = doc(db, 'gamification', uid);

    return await runTransaction(db, async (transaction) => {
      const gamificationDoc = await transaction.get(gamificationRef);

      if (!gamificationDoc.exists()) {
        throw new Error('Gamification data not found');
      }

      const userData = gamificationDoc.data();

      // Check for insufficient QPs (for sinks like Kudos/Buyback)
      if (amount < 0 && userData.totalQPs + amount < 0) {
        throw new Error('Insufficient QPs');
      }

      // Update QPs
      const newTotalQPs = userData.totalQPs + amount;
      transaction.update(gamificationRef, {
        totalQPs: newTotalQPs,
        updatedAt: serverTimestamp()
      });

      // Log the transaction
      const logRef = doc(collection(db, 'qp_transactions'));
      transaction.set(logRef, {
        uid,
        eventType,
        amount,
        metadata,
        timestamp: serverTimestamp()
      });

      // Check and update rank
      const newRank = await checkAndUpdateRank(transaction, gamificationRef, {
        ...userData,
        totalQPs: newTotalQPs
      });

      console.log(`QP Update: ${eventType} - ${amount} QPs for user ${uid}`);

      return {
        success: true,
        newTotalQPs,
        qpChange: amount,
        newRank
      };
    });
  } catch (error) {
    console.error('Error updating QPs:', error);
    throw error;
  }
};

/**
 * Check and update user rank based on current metrics
 */
const checkAndUpdateRank = async (transaction, gamificationRef, userData) => {
  let targetRank = 0;

  // Find highest achievable rank
  for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
    const rank = RANK_THRESHOLDS[i];
    if (userData.totalQPs >= rank.qpRequired &&
      userData.publishedQuests >= rank.questsRequired) {
      targetRank = rank.level;
      break;
    }
  }

  // Update if rank changed
  if (targetRank !== userData.currentRankTier) {
    const newRankData = RANK_THRESHOLDS.find(r => r.level === targetRank);

    transaction.update(gamificationRef, {
      currentRankTier: targetRank,
      rankTitle: newRankData.title,
      updatedAt: serverTimestamp()
    });

    // Log rank change
    const logRef = doc(collection(db, 'rank_changes'));
    transaction.set(logRef, {
      uid: userData.userId,
      oldRank: userData.currentRankTier,
      newRank: targetRank,
      oldTitle: userData.rankTitle,
      newTitle: newRankData.title,
      timestamp: serverTimestamp()
    });

    console.log(`Rank ${targetRank > userData.currentRankTier ? 'Promotion' : 'Demotion'}: ${newRankData.title}`);

    return newRankData;
  }

  return RANK_THRESHOLDS.find(r => r.level === userData.currentRankTier);
};

/**
 * Process Daily Check-in
 */
export const processDailyCheckIn = async (uid) => {
  try {
    const gamificationRef = doc(db, 'gamification', uid);
    const gamificationDoc = await getDoc(gamificationRef);

    if (!gamificationDoc.exists()) {
      console.log('Gamification data missing for daily check-in, initializing...');
      await initializeUserGamification(uid);
      // Re-fetch after initialization
      gamificationDoc = await getDoc(gamificationRef);
      if (!gamificationDoc.exists()) {
        throw new Error('Failed to initialize gamification data');
      }
    }

    const userData = gamificationDoc.data();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastCheckIn = userData.streak.lastCheckInDate?.toDate();

    // Check if already checked in today
    if (lastCheckIn && isSameDay(lastCheckIn, today)) {
      return { success: false, message: 'Already checked in today' };
    }

    const timeDelta = lastCheckIn ? today - lastCheckIn : null;
    const hoursElapsed = timeDelta ? timeDelta / (1000 * 60 * 60) : null;

    let streakBroken = false;
    let freezeUsed = false;

    // Check if streak broken (>48 hours)
    if (hoursElapsed && hoursElapsed > 48) {
      if (userData.streak.hasStreakFreeze) {
        // Use freeze automatically
        freezeUsed = true;
        await updateDoc(gamificationRef, {
          'streak.hasStreakFreeze': false,
          updatedAt: serverTimestamp()
        });

        // Log freeze usage
        await addDoc(collection(db, 'qp_transactions'), {
          uid,
          eventType: 'STREAK_FREEZE_CONSUMED',
          amount: 0,
          metadata: { streakDays: userData.streak.currentStreakDays },
          timestamp: serverTimestamp()
        });
      } else {
        // Hard break
        streakBroken = true;
        const oldStreak = userData.streak.currentStreakDays;

        await updateDoc(gamificationRef, {
          'streak.currentStreakDays': 0,
          'streak.hasStreakFreeze': false,
          'streak.lastCheckInDate': serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        // Log streak break
        await addDoc(collection(db, 'qp_transactions'), {
          uid,
          eventType: 'STREAK_BROKEN',
          amount: 0,
          metadata: { oldStreak },
          timestamp: serverTimestamp()
        });

        return {
          success: true,
          streakBroken: true,
          message: 'Streak broken. Start a new one!',
          oldStreak
        };
      }
    }

    // Maintain/increment streak
    const newStreakDays = userData.streak.currentStreakDays + 1;

    await updateDoc(gamificationRef, {
      'streak.currentStreakDays': newStreakDays,
      'streak.lastCheckInDate': serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Award 1 QP for check-in
    await updateUserQPs(uid, QP_VALUES.DAILY_CHECKIN, 'QP_DAILY_CHECKIN');

    // Check for milestone bonuses
    const milestones = [7, 14, 30, 100];
    let milestoneReached = null;

    for (const milestone of milestones) {
      if (newStreakDays === milestone &&
        !userData.streak.milestonesClaimed.includes(milestone)) {
        const bonus = QP_VALUES[`STREAK_${milestone}_DAY`];
        await updateUserQPs(uid, bonus, 'QP_STREAK_BONUS', { milestone });

        await updateDoc(gamificationRef, {
          'streak.milestonesClaimed': arrayUnion(milestone)
        });

        milestoneReached = { milestone, bonus };
      }
    }

    // Check for streak freeze unlock/reactivation
    if (newStreakDays >= 14 && !userData.streak.hasStreakFreeze) {
      await updateDoc(gamificationRef, {
        'streak.hasStreakFreeze': true
      });
    }

    // Track 30-day streaks for Consistency Master badge
    if (newStreakDays === 30) {
      await updateDoc(gamificationRef, {
        'streak.threeThirtyDayStreaks': increment(1)
      });

      await checkForBadgeCompletion(uid, 'CONSISTENCY_MASTER');
    }

    return {
      success: true,
      streakDays: newStreakDays,
      freezeUsed,
      milestoneReached,
      message: `Day ${newStreakDays} streak!`
    };
  } catch (error) {
    console.error('Error processing daily check-in:', error);
    throw error;
  }
};

/**
 * Helper function to check if two dates are the same day
 */
const isSameDay = (date1, date2) => {
  return date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate();
};

/**
 * Purchase streak buyback
 */
export const purchaseStreakBuyback = async (uid) => {
  try {
    const gamificationRef = doc(db, 'gamification', uid);
    const gamificationDoc = await getDoc(gamificationRef);

    if (!gamificationDoc.exists()) {
      throw new Error('Gamification data not found');
    }

    const userData = gamificationDoc.data();
    const streakDays = userData.streak.currentStreakDays;

    // Determine buyback cost
    let cost;
    if (streakDays <= 7) cost = STREAK_BUYBACK_COSTS['0-7'];
    else if (streakDays <= 14) cost = STREAK_BUYBACK_COSTS['7-14'];
    else if (streakDays <= 30) cost = STREAK_BUYBACK_COSTS['14-30'];
    else if (streakDays <= 100) cost = STREAK_BUYBACK_COSTS['30-100'];
    else cost = STREAK_BUYBACK_COSTS['100+'];

    // Check if user has enough QPs
    if (userData.totalQPs < cost) {
      throw new Error('Insufficient QPs for buyback');
    }

    // Deduct QPs
    await updateUserQPs(uid, -cost, 'STREAK_BUYBACK', { streakDays, cost });

    // Restore streak continuation
    await updateDoc(gamificationRef, {
      'streak.lastCheckInDate': serverTimestamp()
    });

    return {
      success: true,
      cost,
      message: `Streak restored! ${cost} QPs spent.`
    };
  } catch (error) {
    console.error('Error purchasing streak buyback:', error);
    throw error;
  }
};

/**
 * Send Kudos (QP Sink mechanism)
 */
export const sendKudos = async (senderUid, recipientUid, questId = null) => {
  try {
    const senderRef = doc(db, 'gamification', senderUid);
    const senderDoc = await getDoc(senderRef);

    if (!senderDoc.exists()) {
      throw new Error('Sender gamification data not found');
    }

    const senderData = senderDoc.data();

    // Check if user is Tier 1 or above
    if (senderData.currentRankTier < 1) {
      throw new Error('Must be Wayfinder (Tier 1) or above to send Kudos');
    }

    // Check if user has QPs (1 QP = 1 Kudos)
    if (senderData.totalQPs < 1) {
      throw new Error('Insufficient QPs to send Kudos');
    }

    // Deduct 1 QP from sender
    await updateUserQPs(senderUid, -1, 'KUDOS_SENT', {
      recipientUid,
      questId
    });

    // Add kudos to recipient's profile (not QPs, just kudos count)
    const recipientStatsRef = doc(db, 'user_stats', recipientUid);
    await updateDoc(recipientStatsRef, {
      totalKudosReceived: increment(1),
      updatedAt: serverTimestamp()
    });

    // If kudos is for a specific quest, update quest kudos count
    if (questId) {
      const questRef = doc(db, 'quests', questId);
      await updateDoc(questRef, {
        kudosCount: increment(1)
      });
    }

    // Log the kudos transaction
    await addDoc(collection(db, 'kudos_transactions'), {
      senderUid,
      recipientUid,
      questId,
      timestamp: serverTimestamp()
    });

    return {
      success: true,
      message: 'Kudos sent successfully!'
    };
  } catch (error) {
    console.error('Error sending Kudos:', error);
    throw error;
  }
};

/**
 * Award QPs for new quest submission
 */
export const awardQuestSubmissionQPs = async (uid, questId) => {
  try {
    const gamificationRef = doc(db, 'gamification', uid);
    const gamificationDoc = await getDoc(gamificationRef);

    if (!gamificationDoc.exists()) {
      throw new Error('Gamification data not found');
    }

    const userData = gamificationDoc.data();
    const userTier = userData.currentRankTier;

    // Calculate total QPs (base + tier bonus)
    const baseQP = QP_VALUES.NEW_QUEST_SUBMIT;
    const tierBonus = TIER_BONUSES[userTier] || 0;
    const totalQP = baseQP + tierBonus;

    // Award QPs
    await updateUserQPs(uid, totalQP, 'QP_QUEST_SUBMIT', {
      questId,
      baseQP,
      tierBonus
    });

    // Increment published quests count
    await updateDoc(gamificationRef, {
      publishedQuests: increment(1)
    });

    return {
      success: true,
      qpAwarded: totalQP,
      breakdown: { baseQP, tierBonus }
    };
  } catch (error) {
    console.error('Error awarding quest submission QPs:', error);
    throw error;
  }
};

/**
 * Check for badge completion
 */
export const checkForBadgeCompletion = async (uid, badgeId) => {
  try {
    const gamificationRef = doc(db, 'gamification', uid);
    const gamificationDoc = await getDoc(gamificationRef);

    if (!gamificationDoc.exists()) {
      throw new Error('Gamification data not found');
    }

    const userData = gamificationDoc.data();
    const badgeStatus = userData.badgeStatus[badgeId];

    if (badgeStatus?.isAchieved) {
      return { alreadyAchieved: true };
    }

    let isBadgeCriteriaMet = false;

    switch (badgeId) {
      case 'CONSISTENCY_MASTER':
        isBadgeCriteriaMet =
          userData.streak.currentStreakDays >= 100 ||
          userData.streak.threeThirtyDayStreaks >= 3;
        break;

      case 'COMMUNITY_CHAMPION':
        isBadgeCriteriaMet = userData.referralsCompleted >= 5;
        break;

      case 'FOODIE_ADVENTURER':
      case 'COASTAL_VOYAGER':
      case 'PEAK_CONQUEROR':
        // These require checking quest content/tags - implement based on your quest structure
        isBadgeCriteriaMet = badgeStatus.progressCount >= SPECIALTY_BADGES[badgeId].criteria.count;
        break;
    }

    if (isBadgeCriteriaMet) {
      // Award badge
      await updateDoc(gamificationRef, {
        [`badgeStatus.${badgeId}.isAchieved`]: true,
        [`badgeStatus.${badgeId}.achievedOn`]: serverTimestamp()
      });

      // Award QPs
      const qpReward = SPECIALTY_BADGES[badgeId].qpReward;
      await updateUserQPs(uid, qpReward, 'QP_BADGE_EARNED', { badgeId });

      return {
        success: true,
        badgeAwarded: SPECIALTY_BADGES[badgeId],
        qpReward
      };
    }

    return { success: false, criteriaMet: false };
  } catch (error) {
    console.error('Error checking badge completion:', error);
    throw error;
  }
};

/**
 * Process referral completion
 */
export const processReferralCompletion = async (referrerUid, referredUid) => {
  try {
    // Award referrer
    await updateUserQPs(referrerUid, QP_VALUES.REFERRAL_SUCCESS, 'QP_REFERRAL_SUCCESS', {
      referredUid
    });

    // Award referred user
    await updateUserQPs(referredUid, QP_VALUES.REFERRED_BONUS, 'QP_REFERRED_BONUS', {
      referrerUid
    });

    // Increment referral count
    const referrerGamificationRef = doc(db, 'gamification', referrerUid);
    await updateDoc(referrerGamificationRef, {
      referralsCompleted: increment(1)
    });

    // Check for Community Champion badge
    await checkForBadgeCompletion(referrerUid, 'COMMUNITY_CHAMPION');

    return {
      success: true,
      referrerQP: QP_VALUES.REFERRAL_SUCCESS,
      referredQP: QP_VALUES.REFERRED_BONUS
    };
  } catch (error) {
    console.error('Error processing referral:', error);
    throw error;
  }
};

/**
 * Generate a short referral code from UID
 */
export const generateReferralCode = (uid) => {
  if (!uid) return null;
  return uid.substring(0, 8).toUpperCase();
};

/**
 * Find user by referral code
 */
export const findUserByReferralCode = async (referralCode) => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('referralCode', '==', referralCode));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    const userDoc = querySnapshot.docs[0];
    return {
      uid: userDoc.id,
      ...userDoc.data()
    };
  } catch (error) {
    console.error('Error finding user by referral code:', error);
    throw error;
  }
};

/**
 * Track a new referral relationship
 */
export const trackReferral = async (referralCode, referredUid) => {
  try {
    if (!referralCode || !referredUid) {
      throw new Error('Referral code and referred UID are required');
    }

    // Find referrer by code
    const referrer = await findUserByReferralCode(referralCode);

    if (!referrer) {
      console.warn('Invalid referral code:', referralCode);
      return { success: false, error: 'Invalid referral code' };
    }

    // Don't allow self-referral
    if (referrer.uid === referredUid) {
      console.warn('User attempted self-referral');
      return { success: false, error: 'Cannot refer yourself' };
    }

    // Create referral document
    const referralRef = doc(collection(db, 'referrals'));
    await setDoc(referralRef, {
      referrerId: referrer.uid,
      referredId: referredUid,
      referralCode: referralCode,
      status: 'pending',
      createdAt: serverTimestamp()
    });

    // Update referred user document
    const userRef = doc(db, 'users', referredUid);
    await updateDoc(userRef, {
      referredBy: referralCode
    });

    console.log(`Referral tracked: ${referrer.uid} -> ${referredUid}`);

    return {
      success: true,
      referrerId: referrer.uid
    };
  } catch (error) {
    console.error('Error tracking referral:', error);
    throw error;
  }
};

/**
 * Complete referral and award QPs
 * Call this when the referred user completes their profile or first quest
 */
export const completeReferralIfApplicable = async (referredUid) => {
  try {
    // Check if user has a pending referral
    const referralsRef = collection(db, 'referrals');
    const q = query(
      referralsRef,
      where('referredId', '==', referredUid),
      where('status', '==', 'pending')
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return { success: false, message: 'No pending referral found' };
    }

    const referralDoc = querySnapshot.docs[0];
    const referralData = referralDoc.data();

    // Process referral completion (awards QPs)
    await processReferralCompletion(referralData.referrerId, referredUid);

    // Update referral status
    await updateDoc(doc(db, 'referrals', referralDoc.id), {
      status: 'completed',
      completedAt: serverTimestamp()
    });

    console.log(`Referral completed for user ${referredUid}`);

    return {
      success: true,
      referrerId: referralData.referrerId,
      bonusAwarded: QP_VALUES.REFERRED_BONUS
    };
  } catch (error) {
    console.error('Error completing referral:', error);
    throw error;
  }
};

/**
 * Get user's referral stats
 */
export const getUserReferralStats = async (uid) => {
  try {
    const gamificationRef = doc(db, 'gamification', uid);
    const gamificationDoc = await getDoc(gamificationRef);

    if (!gamificationDoc.exists()) {
      return {
        referralCode: generateReferralCode(uid),
        referralsCompleted: 0,
        totalQPEarned: 0
      };
    }

    const data = gamificationDoc.data();
    const referralsCompleted = data.referralsCompleted || 0;

    return {
      referralCode: generateReferralCode(uid),
      referralsCompleted,
      totalQPEarned: referralsCompleted * QP_VALUES.REFERRAL_SUCCESS
    };
  } catch (error) {
    console.error('Error getting referral stats:', error);
    throw error;
  }
};


/**
 * Calculate current rank display info
 */
export const calculateRankInfo = (userData) => {
  const currentRank = RANK_THRESHOLDS.find(r => r.level === userData.currentRankTier) || {
    level: 0,
    title: 'Novice',
    qpRequired: 0,
    questsRequired: 0,
    color: '#6B7280'
  };
  const nextRank = RANK_THRESHOLDS.find(r => r.level === (userData.currentRankTier || 0) + 1);

  let qpProgress = 0;
  let questProgress = 0;

  if (nextRank) {
    const qpRange = nextRank.qpRequired - currentRank.qpRequired;
    qpProgress = qpRange > 0 ? (userData.totalQPs - currentRank.qpRequired) / qpRange : 1;
    
    const questRange = nextRank.questsRequired - currentRank.questsRequired;
    questProgress = questRange > 0 ? (userData.publishedQuests - currentRank.questsRequired) / questRange : 1;
  } else {
    qpProgress = 1;
    questProgress = 1;
  }

  return {
    currentRank,
    nextRank,
    qpProgress: Math.min(Math.max(qpProgress, 0), 1),
    questProgress: Math.min(Math.max(questProgress, 0), 1),
    qpToNext: nextRank ? nextRank.qpRequired - userData.totalQPs : 0,
    questsToNext: nextRank ? nextRank.questsRequired - userData.publishedQuests : 0
  };
};

/**
 * Get user's QP transaction history
 */
export const getQPHistory = async (uid, limit = 20) => {
  try {
    const { getDocs, query, where, orderBy, limit: limitQuery } = await import('firebase/firestore');

    const qpLogRef = collection(db, 'qp_transactions');
    const q = query(
      qpLogRef,
      where('uid', '==', uid),
      orderBy('timestamp', 'desc'),
      limitQuery(limit)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate()
    }));
  } catch (error) {
    console.error('Error getting QP history:', error);
    throw error;
  }
};