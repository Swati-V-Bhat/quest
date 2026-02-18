'use client';

import { useAuth } from './useAuth';
import { EXPERIMENTS, getExperimentVariant } from '@/lib/abTesting';
import { useMemo } from 'react';

/**
 * Hook to get the assigned experiment variant for the current user.
 * 
 * Usage:
 * const { variant, loading } = useExperiment('QUEST_CREATION_FLOW');
 * 
 * if (variant === EXPERIMENTS.QUEST_CREATION_FLOW.variants.VIDEO) { ... }
 */
export const useExperiment = (experimentId: keyof typeof EXPERIMENTS) => {
    const { user, loading } = useAuth();

    const variant = useMemo(() => {
        if (loading) return null;

        // Select the experiment definition
        const experiment = EXPERIMENTS[experimentId];

        if (!experiment) {
            console.warn(`Experiment ${experimentId} not found`);
            return null;
        }

        return getExperimentVariant(user?.uid, experiment);
    }, [user, loading, experimentId]);

    return {
        variant,
        loading,
        // Helper booleans for cleaner JSX
        isCarousel: variant === EXPERIMENTS.QUEST_CREATION_FLOW.variants.CAROUSEL,
        isStory: variant === EXPERIMENTS.QUEST_CREATION_FLOW.variants.STORY,
        isVideo: variant === EXPERIMENTS.QUEST_CREATION_FLOW.variants.VIDEO,
    };
};
