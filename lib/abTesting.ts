/**
 * A/B Testing Utility
 * 
 * Defines experiment variants and assigns users to groups deterministically
 * based on their User ID.
 */

// Define available experiments and their variants
export const EXPERIMENTS = {
    QUEST_CREATION_FLOW: {
        id: 'quest_creation_flow',
        variants: {
            CAROUSEL: 'carousel', // Group 0
            STORY: 'story',       // Group 1
            VIDEO: 'video',       // Group 2
        }
    }
} as const;

export type ExperimentId = keyof typeof EXPERIMENTS;

/**
 * Deterministically gets the variant for a user based on their ID.
 * 
 * Logic: Take the ASCII code of the last character of the userId, mod 3.
 * 0 -> CAROUSEL
 * 1 -> STORY
 * 2 -> VIDEO
 */
export const getExperimentVariant = (userId: string | null | undefined, experiment: typeof EXPERIMENTS.QUEST_CREATION_FLOW) => {
    if (!userId) {
        return experiment.variants.CAROUSEL;
    }

    // DJB2 Hash Algorithm for better distribution
    let hash = 5381;
    for (let i = 0; i < userId.length; i++) {
        // hash * 33 + c
        hash = ((hash << 5) + hash) + userId.charCodeAt(i);
    }

    // Ensure positive integer
    const positiveHash = Math.abs(hash);

    // Modulo 3 to get 0, 1, or 2
    const remainder = positiveHash % 3;

    switch (remainder) {
        case 0:
            return experiment.variants.CAROUSEL;
        case 1:
            return experiment.variants.STORY;
        case 2:
            return experiment.variants.VIDEO;
        default:
            return experiment.variants.CAROUSEL;
    }
};

/**
 * Debug helper to see distribution for list of IDs
 */
export const debugDistribution = (ids: string[]) => {
    const counts = { carousel: 0, story: 0, video: 0 };
    ids.forEach(id => {
        const variant = getExperimentVariant(id, EXPERIMENTS.QUEST_CREATION_FLOW);
        counts[variant as keyof typeof counts]++;
    });
    return counts;
};
