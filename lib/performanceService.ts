/**
 * Performance Monitoring Service
 * Tracks page loads, API calls, and custom metrics
 */

// Simple performance tracking (no Firebase SDK needed initially)
export class PerformanceTracker {
    private metrics: Map<string, number> = new Map();

    /**
     * Track page load time
     */
    trackPageLoad(pageName: string): () => void {
        const startTime = performance.now();

        return () => {
            const duration = performance.now() - startTime;
            this.logMetric(`page_load_${pageName}`, duration);
        };
    }

    /**
     * Track API call duration
     */
    async trackApiCall<T>(name: string, fn: () => Promise<T>): Promise<T> {
        const startTime = performance.now();
        try {
            return await fn();
        } finally {
            const duration = performance.now() - startTime;
            this.logMetric(`api_${name}`, duration);
        }
    }

    /**
     * Track custom metric
     */
    trackMetric(name: string, value: number) {
        this.logMetric(name, value);
    }

    /**
     * Log metric (console in dev, analytics in prod)
     */
    private logMetric(name: string, value: number) {
        this.metrics.set(name, value);

        if (process.env.NODE_ENV === 'development') {
            console.log(`[PERF] ${name}: ${value.toFixed(2)}ms`);
        }

        // In production, send to analytics
        if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
            // Can integrate with Vercel Analytics, Google Analytics, etc.
            (window as any).gtag?.('event', 'performance', {
                metric_name: name,
                value: Math.round(value),
            });
        }
    }

    /**
     * Get all metrics
     */
    getMetrics() {
        return Object.fromEntries(this.metrics);
    }

    /**
     * Clear metrics
     */
    clear() {
        this.metrics.clear();
    }
}

// Singleton instance
export const performanceTracker = new PerformanceTracker();

/**
 * React hook for tracking component render time
 */
export const usePerformanceTracking = (componentName: string) => {
    if (typeof window === 'undefined') return;

    const startTime = performance.now();

    return () => {
        const duration = performance.now() - startTime;
        performanceTracker.trackMetric(`component_${componentName}`, duration);
    };
};
