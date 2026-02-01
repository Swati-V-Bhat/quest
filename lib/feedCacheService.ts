/**
 * Feed Cache Service
 * 
 * Caches feed queries and provides optimistic updates for instant UI
 * Reduces Firestore reads and improves perceived performance
 */

import { getPaginatedPosts } from './postService';

interface CachedFeed {
    posts: any[];
    lastVisible: any;
    hasMore: boolean;
    timestamp: number;
}

class FeedCacheService {
    private cache = new Map<string, CachedFeed>();
    private readonly TTL = 60 * 1000; // 1 minute

    /**
     * Get cached feed or fetch from Firestore
     */
    async getFeed(userId: string, cursor: any = null, limit: number = 5) {
        const cacheKey = `${userId}:${cursor || 'initial'}`;

        // Check cache
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.TTL) {
            return cached;
        }

        // Fetch from Firestore
        const result = await getPaginatedPosts(cursor, limit);

        const feedData = {
            posts: result.posts,
            lastVisible: result.lastVisible,
            hasMore: result.hasMore,
            timestamp: Date.now()
        };

        this.cache.set(cacheKey, feedData);
        return feedData;
    }

    /**
     * Invalidate cache on new post
     */
    invalidate(userId: string) {
        this.cache.delete(`${userId}:initial`);
    }

    /**
     * Clear all cache
     */
    clear() {
        this.cache.clear();
    }
}

export const feedCache = new FeedCacheService();

/**
 * Optimistic Updates Manager
 * Provides instant UI updates while background operations complete
 */

export interface OptimisticComment {
    id: string;
    text: string;
    userName: string;
    userProfilePic: string;
    uid: string;
    createdAt: Date;
    isPending?: boolean;
    error?: boolean;
}

class OptimisticUpdateManager {
    private pendingUpdates = new Map<string, any>();

    /**
     * Add optimistic comment
     * Returns temporary comment object for immediate UI display
     */
    createOptimisticComment(
        postId: string,
        text: string,
        user: { uid: string; name: string; photoURL: string }
    ): OptimisticComment {
        const tempId = `temp-${Date.now()}-${Math.random()}`;

        const optimisticComment: OptimisticComment = {
            id: tempId,
            text,
            userName: user.name,
            userProfilePic: user.photoURL,
            uid: user.uid,
            createdAt: new Date(),
            isPending: true
        };

        this.pendingUpdates.set(tempId, { postId, comment: optimisticComment });

        return optimisticComment;
    }

    /**
     * Replace optimistic comment with real one
     */
    resolveOptimisticComment(tempId: string, realComment: any) {
        this.pendingUpdates.delete(tempId);
        return realComment;
    }

    /**
     * Mark optimistic comment as failed
     */
    failOptimisticComment(tempId: string) {
        const update = this.pendingUpdates.get(tempId);
        if (update) {
            update.comment.error = true;
            update.comment.isPending = false;
        }
    }

    /**
     * Check if update is pending
     */
    isPending(tempId: string) {
        return this.pendingUpdates.has(tempId);
    }
}

export const optimisticUpdates = new OptimisticUpdateManager();

/**
 * Session Storage for Pagination
 * Persists scroll position and pagination cursor
 */

export const saveFeedCursor = (cursor: any) => {
    try {
        sessionStorage.setItem('feed_cursor', JSON.stringify(cursor));
    } catch (error) {
        console.warn('Failed to save feed cursor:', error);
    }
};

export const loadFeedCursor = () => {
    try {
        const stored = sessionStorage.getItem('feed_cursor');
        return stored ? JSON.parse(stored) : null;
    } catch (error) {
        console.warn('Failed to load feed cursor:', error);
        return null;
    }
};

export const clearFeedCursor = () => {
    try {
        sessionStorage.removeItem('feed_cursor');
    } catch (error) {
        console.warn('Failed to clear feed cursor:', error);
    }
};

/**
 * Save scroll position
 */
export const saveFeedScrollPosition = (position: number) => {
    try {
        sessionStorage.setItem('feed_scroll', position.toString());
    } catch (error) {
        console.warn('Failed to save scroll position:', error);
    }
};

export const loadFeedScrollPosition = (): number => {
    try {
        const stored = sessionStorage.getItem('feed_scroll');
        return stored ? parseInt(stored, 10) : 0;
    } catch (error) {
        console.warn('Failed to load scroll position:', error);
        return 0;
    }
};
