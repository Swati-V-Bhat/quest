/**
 * Engagement Service
 * 
 * Centralized engagement score management for posts.
 * Handles calculation, updates, and batch operations.
 */

import { doc, updateDoc, runTransaction, writeBatch, getDocs, collection, query, limit, getDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Engagement score weights
 * - Likes: 1x (low effort, passive engagement)
 * - Comments: 2x (medium effort, active discussion)
 * - Shares: 3x (high effort, strong endorsement)
 */
const WEIGHTS = {
    LIKE: 1,
    COMMENT: 2,
    SHARE: 3
};

/**
 * Time-decay configuration
 * - Half-life: 24 hours (content loses half its temporal boost every 24h)
 * - Max boost: 2x for brand new content
 */
const TIME_DECAY_CONFIG = {
    HALF_LIFE_HOURS: 24,
    MAX_BOOST: 2.0,
    MIN_BOOST: 1.0
};

/**
 * Calculate time decay multiplier using exponential decay
 * Newer posts get higher scores, gradually decreasing over time
 */
const calculateTimeDecay = (createdAt: Date): number => {
    const now = new Date();
    const ageInHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

    // Exponential decay formula: boost = MAX_BOOST * (0.5 ^ (age / half_life))
    const decayFactor = Math.pow(0.5, ageInHours / TIME_DECAY_CONFIG.HALF_LIFE_HOURS);
    const boost = TIME_DECAY_CONFIG.MIN_BOOST +
        (TIME_DECAY_CONFIG.MAX_BOOST - TIME_DECAY_CONFIG.MIN_BOOST) * decayFactor;

    return Math.max(TIME_DECAY_CONFIG.MIN_BOOST, Math.min(TIME_DECAY_CONFIG.MAX_BOOST, boost));
};

/**
 * Calculate engagement score from interaction counts
 * Basic score without time decay
 */
export const calculateEngagementScore = (
    likeCount: number = 0,
    commentCount: number = 0,
    shareCount: number = 0
): number => {
    return (likeCount * WEIGHTS.LIKE) +
        (commentCount * WEIGHTS.COMMENT) +
        (shareCount * WEIGHTS.SHARE);
};

/**
 * Calculate engagement score WITH time decay
 * Balances engagement activity with recency
 */
export const calculateEngagementScoreWithDecay = (
    likeCount: number = 0,
    commentCount: number = 0,
    shareCount: number = 0,
    createdAt: Date
): number => {
    const baseScore = calculateEngagementScore(likeCount, commentCount, shareCount);
    const timeMultiplier = calculateTimeDecay(createdAt);

    // Boost newer content while still rewarding engagement
    return baseScore * timeMultiplier;
};

/**
 * Update engagement score for a post (atomic transaction)
 */
export const updateEngagementScore = async (postId: string): Promise<number> => {
    const postRef = doc(db, 'posts', postId);

    return runTransaction(db, async (transaction) => {
        const postDoc = await transaction.get(postRef);

        if (!postDoc.exists()) {
            throw new Error('Post not found');
        }

        const data = postDoc.data();
        const newScore = calculateEngagementScore(
            data.likeCount || 0,
            data.commentCount || 0,
            data.shareCount || 0
        );

        transaction.update(postRef, { engagementScore: newScore });

        return newScore;
    });
};

/**
 * Batch recalculate engagement scores
 * Useful for migrations or fixing data inconsistencies
 */
export const batchRecalculateScores = async (
    postIds?: string[],
    batchSize: number = 500
): Promise<{ updated: number; errors: number }> => {
    let updated = 0;
    let errors = 0;

    try {
        let postsToUpdate;

        if (postIds && postIds.length > 0) {
            // Specific posts
            postsToUpdate = postIds;
        } else {
            // All posts - fetch in batches
            const postsQuery = query(collection(db, 'posts'), limit(1000));
            const snapshot = await getDocs(postsQuery);
            postsToUpdate = snapshot.docs.map(doc => doc.id);
        }

        // Process in batches
        for (let i = 0; i < postsToUpdate.length; i += batchSize) {
            const batch = writeBatch(db);
            const batchIds = postsToUpdate.slice(i, i + batchSize);

            for (const postId of batchIds) {
                try {
                    const postRef = doc(db, 'posts', postId);
                    const postDoc = await getDoc(postRef);

                    if (postDoc.exists()) {
                        const data = postDoc.data();
                        const newScore = calculateEngagementScore(
                            data.likeCount || 0,
                            data.commentCount || 0,
                            data.shareCount || 0
                        );

                        batch.update(postRef, { engagementScore: newScore });
                        updated++;
                    }
                } catch (error) {
                    console.error(`Error processing post ${postId}:`, error);
                    errors++;
                }
            }

            await batch.commit();
        }

    } catch (error) {
        console.error('Batch recalculation error:', error);
        throw error;
    }

    return { updated, errors };
};

/**
 * Get engagement breakdown for analytics
 */
export const getEngagementBreakdown = (
    likeCount: number,
    commentCount: number,
    shareCount: number
) => {
    const total = calculateEngagementScore(likeCount, commentCount, shareCount);

    return {
        total,
        breakdown: {
            likes: {
                count: likeCount,
                score: likeCount * WEIGHTS.LIKE,
                percentage: total > 0 ? (likeCount * WEIGHTS.LIKE / total) * 100 : 0
            },
            comments: {
                count: commentCount,
                score: commentCount * WEIGHTS.COMMENT,
                percentage: total > 0 ? (commentCount * WEIGHTS.COMMENT / total) * 100 : 0
            },
            shares: {
                count: shareCount,
                score: shareCount * WEIGHTS.SHARE,
                percentage: total > 0 ? (shareCount * WEIGHTS.SHARE / total) * 100 : 0
            }
        }
    };
};

/**
 * Time-decay function for future Phase 2 implementation
 * Formula: score / (age_in_hours + 2)^gravity
 */
export const calculateTimeDecayedScore = (
    engagementScore: number,
    createdAt: Date,
    gravity: number = 1.8
): number => {
    const now = new Date();
    const ageInHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

    return engagementScore / Math.pow(ageInHours + 2, gravity);
};

/**
 * Predict future engagement (for ML features)
 */
export const predictEngagement = (
    currentScore: number,
    ageInHours: number,
    averageGrowthRate: number = 0.1
): number => {
    // Simple linear prediction - can be enhanced with ML model
    return currentScore * (1 + averageGrowthRate * ageInHours);
};
