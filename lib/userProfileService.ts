import { doc, getDoc, getDocs, query, collection, where, documentId } from 'firebase/firestore';
import { db } from './firebase';

interface UserProfile {
    uid: string;
    name: string;
    email?: string;
    photoURL?: string;
    bio?: string;
    followersCount?: number;
    followingCount?: number;
    totalQPs?: number;
    level?: number;
    rankTitle?: string;
    onboardingCompleted?: boolean;
    [key: string]: any;
}

interface CacheEntry {
    data: UserProfile;
    timestamp: number;
}

class UserProfileCache {
    private cache = new Map<string, CacheEntry>();
    private readonly TTL = 5 * 60 * 1000; // 5 minutes
    private readonly MAX_SIZE = 1000; // Max cached users

    set(uid: string, data: UserProfile) {
        // LRU: Remove oldest if at capacity
        if (this.cache.size >= this.MAX_SIZE) {
            const oldestKey = this.cache.keys().next().value;
            if (oldestKey) {
                this.cache.delete(oldestKey);
            }
        }

        this.cache.set(uid, {
            data,
            timestamp: Date.now()
        });
    }

    get(uid: string): UserProfile | null {
        const entry = this.cache.get(uid);

        if (!entry) {
            return null;
        }

        // Check if expired
        if (Date.now() - entry.timestamp > this.TTL) {
            this.cache.delete(uid);
            return null;
        }

        return entry.data;
    }

    invalidate(uid: string) {
        this.cache.delete(uid);
    }

    clear() {
        this.cache.clear();
    }

    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.MAX_SIZE,
            ttl: this.TTL
        };
    }
}

const userCache = new UserProfileCache();

/**
 * Get user profile with caching
 */
export const getUserProfile = async (
    uid: string,
    options: { skipCache?: boolean } = {}
): Promise<UserProfile | null> => {
    const { skipCache = false } = options;

    // Check cache first
    if (!skipCache) {
        const cached = userCache.get(uid);
        if (cached) {
            return cached;
        }
    }

    try {
        // Fetch from Firestore
        const userDoc = await getDoc(doc(db, 'users', uid));

        if (!userDoc.exists()) {
            return null;
        }

        const data = userDoc.data();
        const userData: UserProfile = {
            uid,
            name: data.name,
            email: data.email ?? undefined, // Ensure null is converted to undefined for optional fields
            photoURL: data.photoURL ?? undefined,
            bio: data.bio ?? undefined,
            followersCount: data.followersCount ?? undefined,
            followingCount: data.followingCount ?? undefined,
            totalQPs: data.totalQPs ?? undefined,
            level: data.level ?? undefined,
            rankTitle: data.rankTitle ?? undefined,
            onboardingCompleted: data.onboardingCompleted ?? undefined,
            ...data // Spread any other fields not explicitly listed
        };

        // Cache it
        if (uid) {
            userCache.set(uid, userData);
        }

        return userData;
    } catch (error) {
        console.error(`Error fetching user profile ${uid}:`, error);
        return null;
    }
};

/**
 * Batch fetch multiple user profiles (efficient)
 */
export const batchGetUserProfiles = async (
    uids: string[],
    options: { skipCache?: boolean } = {}
): Promise<Map<string, UserProfile>> => {
    const { skipCache = false } = options;
    const result = new Map<string, UserProfile>();
    const uncachedUids: string[] = [];

    // Check cache for each UID
    for (const uid of uids) {
        if (!skipCache) {
            const cached = userCache.get(uid);
            if (cached) {
                result.set(uid, cached);
                continue;
            }
        }
        uncachedUids.push(uid);
    }

    // Fetch uncached users in batches (Firestore 'in' query limit is 10)
    if (uncachedUids.length > 0) {
        const batchSize = 10;

        for (let i = 0; i < uncachedUids.length; i += batchSize) {
            const batchUids = uncachedUids.slice(i, i + batchSize);

            try {
                const q = query(
                    collection(db, 'users'),
                    where(documentId(), 'in', batchUids)
                );

                const snapshot = await getDocs(q);

                snapshot.forEach(doc => {
                    const userData = { uid: doc.id, ...doc.data() } as UserProfile;
                    result.set(doc.id, userData);
                    userCache.set(doc.id, userData);
                });
            } catch (error) {
                console.error('Error batch fetching users:', error);
            }
        }
    }

    return result;
};

/**
 * Invalidate user cache (call after updates)
 */
export const invalidateUserCache = (uid: string) => {
    userCache.invalidate(uid);
};

/**
 * Clear entire cache
 */
export const clearUserCache = () => {
    userCache.clear();
};

/**
 * Get cache statistics (for monitoring)
 */
export const getUserCacheStats = () => {
    return userCache.getStats();
};

/**
 * Prefetch users for better UX (call this on page load)
 */
export const prefetchUsers = async (uids: string[]) => {
    // Fire and forget - don't await
    batchGetUserProfiles(uids).catch(error => {
        console.warn('Prefetch users failed:', error);
    });
};

/**
 * Get minimal user info (for displaying in lists)
 */
export const getMinimalUserInfo = async (uid: string) => {
    const user = await getUserProfile(uid);

    if (!user) {
        return null;
    }

    return {
        uid: user.uid,
        name: user.name,
        photoURL: user.photoURL,
        rankTitle: user.rankTitle
    };
};

/**
 * Get multiple minimal user infos (for feed rendering)
 */
export const batchGetMinimalUserInfo = async (uids: string[]) => {
    const users = await batchGetUserProfiles(uids);
    const result = new Map();

    users.forEach((user, uid) => {
        result.set(uid, {
            uid: user.uid,
            name: user.name,
            photoURL: user.photoURL,
            rankTitle: user.rankTitle
        });
    });

    return result;
};
