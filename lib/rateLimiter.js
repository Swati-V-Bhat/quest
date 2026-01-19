// lib/rateLimiter.js
// Simple client-side rate limiter to prevent spam

const rateLimitStore = new Map();

/**
 * Rate limiter for client-side actions
 * @param {string} actionKey - Unique key for the action (e.g., 'createPost', 'likePost')
 * @param {string} userId - User ID to track
 * @param {number} maxActions - Maximum actions allowed in the time window
 * @param {number} windowMs - Time window in milliseconds (default: 60000ms = 1 minute)
 * @returns {Object} { allowed: boolean, remainingActions: number, resetTime: number }
 */
export function checkRateLimit(actionKey, userId, maxActions = 5, windowMs = 60000) {
    const key = `${actionKey}:${userId}`;
    const now = Date.now();

    if (!rateLimitStore.has(key)) {
        rateLimitStore.set(key, { count: 1, windowStart: now });
        return { allowed: true, remainingActions: maxActions - 1, resetTime: now + windowMs };
    }

    const record = rateLimitStore.get(key);

    // Check if window has expired
    if (now - record.windowStart >= windowMs) {
        rateLimitStore.set(key, { count: 1, windowStart: now });
        return { allowed: true, remainingActions: maxActions - 1, resetTime: now + windowMs };
    }

    // Within window, check count
    if (record.count >= maxActions) {
        return {
            allowed: false,
            remainingActions: 0,
            resetTime: record.windowStart + windowMs
        };
    }

    // Increment and allow
    record.count++;
    rateLimitStore.set(key, record);
    return {
        allowed: true,
        remainingActions: maxActions - record.count,
        resetTime: record.windowStart + windowMs
    };
}

/**
 * Rate limit configurations for different actions
 */
export const RATE_LIMITS = {
    CREATE_POST: { maxActions: 5, windowMs: 60000 },      // 5 posts per minute
    CREATE_COMMENT: { maxActions: 10, windowMs: 60000 },  // 10 comments per minute
    LIKE_POST: { maxActions: 30, windowMs: 60000 },       // 30 likes per minute
    FOLLOW_USER: { maxActions: 20, windowMs: 60000 },     // 20 follows per minute
    SEND_MESSAGE: { maxActions: 30, windowMs: 60000 },    // 30 messages per minute
};

/**
 * Wrapper function for rate-limited actions
 * @param {string} actionType - Key from RATE_LIMITS
 * @param {string} userId - User performing the action
 * @returns {Object} { allowed: boolean, message?: string }
 */
export function canPerformAction(actionType, userId) {
    if (!userId) {
        return { allowed: false, message: 'User not authenticated' };
    }

    const config = RATE_LIMITS[actionType];
    if (!config) {
        console.warn(`Unknown rate limit action type: ${actionType}`);
        return { allowed: true };
    }

    const result = checkRateLimit(actionType, userId, config.maxActions, config.windowMs);

    if (!result.allowed) {
        const resetInSeconds = Math.ceil((result.resetTime - Date.now()) / 1000);
        return {
            allowed: false,
            message: `Too many actions. Please wait ${resetInSeconds} seconds.`
        };
    }

    return { allowed: true, remainingActions: result.remainingActions };
}
