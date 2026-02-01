/**
 * Lazy Loading Image Component
 * Uses Intersection Observer for performance
 */

'use client';

import { useState, useEffect, useRef } from 'react';

interface LazyImageProps {
    src: string | string[];
    alt: string;
    className?: string;
    placeholder?: string;
    onLoad?: () => void;
}

export const LazyImage: React.FC<LazyImageProps> = ({
    src,
    alt,
    className = '',
    placeholder = '/placeholder.png',
    onLoad
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isInView, setIsInView] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    // Handle array of URLs (take first)
    const imageSrc = Array.isArray(src) ? src[0] : src;

    useEffect(() => {
        if (!imgRef.current) return;

        // Intersection Observer for lazy loading
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                    observer.disconnect();
                }
            },
            {
                rootMargin: '50px', // Start loading 50px before image enters viewport
                threshold: 0.01
            }
        );

        observer.observe(imgRef.current);

        return () => observer.disconnect();
    }, []);

    const handleLoad = () => {
        setIsLoaded(true);
        onLoad?.();
    };

    return (
        <img
            ref={imgRef}
            src={isInView ? imageSrc : placeholder}
            alt={alt}
            className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
            onLoad={handleLoad}
            loading="lazy" // Native lazy loading as fallback
        />
    );
};

export default LazyImage;
