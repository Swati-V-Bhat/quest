'use client';

import React, { useEffect, useState } from 'react';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// ── Types ──────────────────────────────────────────────────────────────────────

type DestinationCard = {
    title: string;
    subtitle: string;
    imageUrl: string;
};

// ── Fallback static data (shown when Firestore has no location data yet) ───────

const STATIC_FALLBACK: DestinationCard[] = [
    { title: 'Catch the Sunrise', subtitle: 'Nandi Hills', imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop' },
    { title: 'Serene Backwaters', subtitle: 'Kerala', imageUrl: 'https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?w=800&h=600&fit=crop' },
    { title: 'Majestic Forts', subtitle: 'Rajasthan', imageUrl: 'https://images.unsplash.com/photo-1500534623283-312aade485b7?w=800&h=600&fit=crop' },
    { title: 'Misty Mountains', subtitle: 'Himachal', imageUrl: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&h=600&fit=crop' },
    { title: 'Golden Sands', subtitle: 'Rann of Kutch', imageUrl: 'https://images.unsplash.com/photo-1494526585095-c41746248156?w=800&h=600&fit=crop' },
    { title: 'Lush Tea Gardens', subtitle: 'Munnar', imageUrl: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=800&h=600&fit=crop' },
];

// Unsplash images keyed by common destination keywords for dynamic cards
const DESTINATION_IMAGES: Record<string, string> = {
    default: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&h=600&fit=crop',
    goa: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800&h=600&fit=crop',
    rajasthan: 'https://images.unsplash.com/photo-1500534623283-312aade485b7?w=800&h=600&fit=crop',
    kerala: 'https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?w=800&h=600&fit=crop',
    himachal: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&h=600&fit=crop',
    manali: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&h=600&fit=crop',
    ladakh: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop',
    munnar: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=800&h=600&fit=crop',
    kashmir: 'https://images.unsplash.com/photo-1505832018823-50331d70d237?w=800&h=600&fit=crop',
    bali: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&h=600&fit=crop',
    thailand: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&h=600&fit=crop',
    europe: 'https://images.unsplash.com/photo-1485081669829-bacb8c7bb1f3?w=800&h=600&fit=crop',
    coorg: 'https://images.unsplash.com/photo-1608848461950-0fe51dfc41cb?w=800&h=600&fit=crop',
    ooty: 'https://images.unsplash.com/photo-1490077476659-074b4bfd3e08?w=800&h=600&fit=crop',
};

function getImageForDestination(location: string): string {
    const key = location.toLowerCase();
    for (const [keyword, url] of Object.entries(DESTINATION_IMAGES)) {
        if (key.includes(keyword)) return url;
    }
    return DESTINATION_IMAGES.default;
}

// ── Card component ─────────────────────────────────────────────────────────────

const DestinationCard = ({ imageUrl, title, subtitle }: DestinationCard) => (
    <div className="relative shrink-0 w-[200px] md:w-[216px] h-[224px] rounded-xl overflow-hidden shadow-md hover:shadow-xl hover:scale-[1.02] transition-all duration-200 cursor-pointer">
        <img src={imageUrl} alt={title} className="absolute h-full w-full object-cover" />
        <div className="absolute bottom-0 w-full h-2/3 bg-gradient-to-t from-black/80 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3 text-white">
            <p className="text-sm font-semibold leading-tight">{title}</p>
            <p className="text-xs text-gray-300 mt-0.5">{subtitle}</p>
        </div>
    </div>
);

const SkeletonCard = () => (
    <div className="relative shrink-0 w-[200px] md:w-[216px] h-[224px] rounded-xl overflow-hidden bg-gray-800 animate-pulse" />
);

// ── Main component ─────────────────────────────────────────────────────────────

const PopularDestinations = () => {
    const [cards, setCards] = useState<DestinationCard[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDestinations = async () => {
            try {
                const postsRef = collection(db, 'posts');
                const q = query(postsRef, orderBy('createdAt', 'desc'), limit(150));
                const snapshot = await getDocs(q);

                // Count how often each location appears across recent posts
                const locationCount: Record<string, number> = {};
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    const location: string | undefined =
                        data.location ||
                        data.questContext?.location ||
                        data.questContext?.destination;
                    if (location?.trim()) {
                        const key = location.trim();
                        locationCount[key] = (locationCount[key] || 0) + 1;
                    }
                });

                const topLocations = Object.entries(locationCount)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 6);

                if (topLocations.length > 0) {
                    // Build dynamic cards from live data
                    const dynamicCards: DestinationCard[] = topLocations.map(([location, count]) => ({
                        title: location,
                        subtitle: `${count} ${count === 1 ? 'quest' : 'quests'}`,
                        imageUrl: getImageForDestination(location),
                    }));
                    setCards(dynamicCards);
                } else {
                    // No location data yet — fall back to curated static cards
                    setCards(STATIC_FALLBACK);
                }
            } catch (error) {
                console.error('Error fetching popular destinations:', error);
                setCards(STATIC_FALLBACK);
            } finally {
                setLoading(false);
            }
        };

        fetchDestinations();
    }, []);

    return (
        <section>
            <div className="mb-4">
                <h2 className="text-xl md:text-3xl font-bold mb-1 md:mb-2 text-white">
                    Popular Destinations
                </h2>
                <p className="text-sm md:text-base text-gray-400">
                    Trending spots from the OnQuest community
                </p>
            </div>

            <div className="flex gap-3 md:gap-4 overflow-x-auto pb-4 scrollbar-none">
                {loading
                    ? [...Array(6)].map((_, i) => <SkeletonCard key={i} />)
                    : cards.map((card, i) => (
                        <DestinationCard key={i} {...card} />
                    ))}
            </div>
        </section>
    );
};

export default PopularDestinations;
