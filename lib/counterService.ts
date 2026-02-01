/**
 * Centralized Counter Service
 * 
 * Single source of truth for all counter updates across the app.
 * Handles: likes, comments, shares, followers, following, etc.
 * 
 * Benefits:
 * - Consistent behavior everywhere
 * - Easier to optimize and add analytics
 * - Atomic operations with engagement score updates
 * - Type-safe counter management
 */

import {
    doc,
    writeBatch,
    increment,
    arrayUnion,
    arrayRemove,
    getDoc,
    updateDoc,
    runTransaction
} from 'firebase/firestore';
import { db } from './firebase';
import { calculateEngagementScore } from './engagementService';

export const COUNTER_TYPES = {
    LIKE: 'like',
    COMMENT: 'comment',
    SHARE: 'share',
    FOLLOWER: 'follower',
    FOLLOWING: 'following',
    ATTENDEE: 'attendee'
};

export const ENTITY_TYPES = {
    POST: 'posts',
    USER: 'users',
    QUEST: 'quest'
};

/**
 * Update a counter atomically
 * 
 * @param entityType - Collection name ('posts', 'users', etc.)
 * @param entityId - Document ID
 * @param counterType - Type of counter ('like', 'comment', etc.)
 * @param delta - Change amount (+1 for increment, -1 for decrement)
 * @param userId - User ID for tracking who performed the action
 * @returns Promise<void>
 */
export const updateCounter = async (
    entityType: string,
    entityId: string,
    counterType: string,
    delta: number,
    userId?: string
) => {
    const entityRef = doc(db, entityType, entityId);

    try {
        // Use transaction for atomic updates
        await runTransaction(db, async (transaction) => {
            const entityDoc = await transaction.get(entityRef);

            if (!entityDoc.exists()) {
                throw new Error(`${entityType} not found`);
            }

            const data = entityDoc.data();
            const updates: any = {
                [`${counterType}Count`]: increment(delta)
            };

            // Add user tracking if provided
            if (userId) {
                const trackingField = `${counterType}dBy`;
                updates[trackingField] = delta > 0
                    ? arrayUnion(userId)
                    : arrayRemove(userId);
            }

            // Calculate and update engagement score for posts
            if (entityType === ENTITY_TYPES.POST &&
                [COUNTER_TYPES.LIKE, COUNTER_TYPES.COMMENT, COUNTER_TYPES.SHARE].includes(counterType)) {

                const newScore = calculateEngagementScore(
                    (data.likeCount || 0) + (counterType === COUNTER_TYPES.LIKE ? delta : 0),
                    (data.commentCount || 0) + (counterType === COUNTER_TYPES.COMMENT ? delta : 0),
                    (data.shareCount || 0) + (counterType === COUNTER_TYPES.SHARE ? delta : 0)
                );

                updates.engagementScore = newScore;
            }

            transaction.update(entityRef, updates);
        });

    } catch (error) {
        console.error(`Error updating ${counterType} counter:`, error);
        throw error;
    }
};

/**
 * Batch update multiple counters (for efficiency)
 */
export const batchUpdateCounters = async (
    updates: Array<{
        entityType: string;
        entityId: string;
        counterType: string;
        delta: number;
        userId?: string;
    }>
) => {
    const batch = writeBatch(db);

    for (const update of updates) {
        const entityRef = doc(db, update.entityType, update.entityId);

        const updateData: any = {
            [`${update.counterType}Count`]: increment(update.delta)
        };

        if (update.userId) {
            const trackingField = `${update.counterType}dBy`;
            updateData[trackingField] = update.delta > 0
                ? arrayUnion(update.userId)
                : arrayRemove(update.userId);
        }

        batch.update(entityRef, updateData);
    }

    await batch.commit();
};

/**
 * Get current counter value
 */
export const getCounterValue = async (
    entityType: string,
    entityId: string,
    counterType: string
): Promise<number> => {
    const entityRef = doc(db, entityType, entityId);
    const entityDoc = await getDoc(entityRef);

    if (!entityDoc.exists()) {
        return 0;
    }

    return entityDoc.data()[`${counterType}Count`] || 0;
};

/**
 * Check if user has performed action
 */
export const hasUserPerformedAction = async (
    entityType: string,
    entityId: string,
    counterType: string,
    userId: string
): Promise<boolean> => {
    const entityRef = doc(db, entityType, entityId);
    const entityDoc = await getDoc(entityRef);

    if (!entityDoc.exists()) {
        return false;
    }

    const trackingField = `${counterType}dBy`;
    const users = entityDoc.data()[trackingField] || [];
    return users.includes(userId);
};

// Convenience methods for common operations

export const incrementLike = (postId: string, userId: string) =>
    updateCounter(ENTITY_TYPES.POST, postId, COUNTER_TYPES.LIKE, 1, userId);

export const decrementLike = (postId: string, userId: string) =>
    updateCounter(ENTITY_TYPES.POST, postId, COUNTER_TYPES.LIKE, -1, userId);

export const incrementComment = (postId: string) =>
    updateCounter(ENTITY_TYPES.POST, postId, COUNTER_TYPES.COMMENT, 1);

export const decrementComment = (postId: string) =>
    updateCounter(ENTITY_TYPES.POST, postId, COUNTER_TYPES.COMMENT, -1);

export const incrementShare = (postId: string) =>
    updateCounter(ENTITY_TYPES.POST, postId, COUNTER_TYPES.SHARE, 1);

export const incrementFollower = (userId: string, followerId: string) =>
    updateCounter(ENTITY_TYPES.USER, userId, COUNTER_TYPES.FOLLOWER, 1, followerId);

export const decrementFollower = (userId: string, followerId: string) =>
    updateCounter(ENTITY_TYPES.USER, userId, COUNTER_TYPES.FOLLOWER, -1, followerId);

export const incrementFollowing = (userId: string, followingId: string) =>
    updateCounter(ENTITY_TYPES.USER, userId, COUNTER_TYPES.FOLLOWING, 1, followingId);

export const decrementFollowing = (userId: string, followingId: string) =>
    updateCounter(ENTITY_TYPES.USER, userId, COUNTER_TYPES.FOLLOWING, -1, followingId);
