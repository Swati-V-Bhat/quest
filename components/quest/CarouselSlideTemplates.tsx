// components/quest/CarouselSlideTemplates.tsx
// Image-Focused Instagram Carousel Templates
'use client';

import React from 'react';
import { MapPin, Calendar, Clock, ArrowRight, User, Navigation, Compass, Sparkles, Star, Camera } from 'lucide-react';

// Instagram 4:5 ratio - 1080x1350
const SLIDE_STYLES = {
    width: 1080,
    height: 1350,
    aspectRatio: '4/5'
};

// ═══════════════════════════════════════════════════════════════════════════════
// COVER SLIDE - Full-Bleed Hero Image with Minimal Text
// ═══════════════════════════════════════════════════════════════════════════════

interface CoverSlideProps {
    title: string;
    creatorName: string;
    creatorProfilePic?: string;
    totalDays: number;
    distance?: string;
    coverImageUrl?: string;
    destination: string;
    segmentIndex?: number;
    segmentTotal?: number;
    dayNumber?: number;
    // Multiple images for collage option
    allImages?: string[];
}

export const CoverSlide: React.FC<CoverSlideProps> = ({
    title,
    creatorName,
    creatorProfilePic,
    totalDays,
    distance,
    coverImageUrl,
    destination,
    segmentIndex,
    segmentTotal,
    dayNumber,
    allImages = []
}) => {
    const isConnectedMode = typeof segmentIndex === 'number' && typeof segmentTotal === 'number' && segmentTotal > 1;

    // Use first 4 images for collage if available
    const collageImages = allImages.length >= 4 ? allImages.slice(0, 4) : [];
    const hasCollage = collageImages.length >= 4;

    return (
        <div
            id="cover-slide"
            className="relative overflow-hidden"
            style={{
                width: SLIDE_STYLES.width,
                height: SLIDE_STYLES.height,
                background: '#0a0a0a'
            }}
        >
            {/* Background - Either Collage or Single Image */}
            {hasCollage ? (
                // 2x2 Image Grid with overlap effect
                <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-1">
                    {collageImages.map((img, idx) => (
                        <div key={idx} className="relative overflow-hidden">
                            <img
                                src={img}
                                alt={`Trip ${idx + 1}`}
                                className="w-full h-full object-cover"
                                style={{ filter: 'brightness(0.85) saturate(1.1)' }}
                                crossOrigin="anonymous"
                            />
                        </div>
                    ))}
                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent" />
                </div>
            ) : coverImageUrl ? (
                <div className="absolute inset-0">
                    <img
                        src={coverImageUrl}
                        alt={title}
                        className="w-full h-full object-cover"
                        style={{
                            filter: 'brightness(0.8) saturate(1.15)',
                            objectPosition: isConnectedMode ? `${(segmentIndex || 0) * 33}% center` : 'center'
                        }}
                        crossOrigin="anonymous"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/40" />
                </div>
            ) : null}

            {/* Content - Minimal overlay text */}
            <div className="relative h-full flex flex-col justify-between p-14">

                {/* Top - Brand & Stats */}
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3 bg-black/40 backdrop-blur-xl px-5 py-3 rounded-2xl border border-white/10">
                        <Compass size={24} className="text-orange-400" />
                        <span className="text-white font-bold text-lg tracking-wide">ONQUEST</span>
                    </div>

                    <div className="flex items-center gap-3 bg-black/40 backdrop-blur-xl px-5 py-3 rounded-2xl border border-white/10">
                        <span className="text-white font-black text-2xl">{totalDays}</span>
                        <span className="text-white/60 text-sm">DAYS</span>
                        {distance && (
                            <>
                                <div className="w-px h-6 bg-white/20" />
                                <span className="text-orange-400 text-sm font-medium">{distance}</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Center - Empty to let image breathe */}
                <div className="flex-1" />

                {/* Bottom - Title & Creator */}
                <div className="space-y-6">
                    {/* Location pill */}
                    <div className="inline-flex items-center gap-2 bg-orange-500/90 backdrop-blur-xl px-5 py-2 rounded-full">
                        <MapPin size={18} className="text-white" />
                        <span className="text-white font-semibold text-lg">{destination}</span>
                    </div>

                    {/* Main Title */}
                    <h1 className="text-6xl font-black text-white leading-[1.1] max-w-4xl drop-shadow-2xl">
                        {title || destination}
                    </h1>

                    {/* Creator Row */}
                    <div className="flex items-center justify-between pt-4">
                        <div className="flex items-center gap-4">
                            {creatorProfilePic ? (
                                <img
                                    src={creatorProfilePic}
                                    alt={creatorName}
                                    className="w-14 h-14 rounded-full object-cover ring-3 ring-white/30"
                                    crossOrigin="anonymous"
                                />
                            ) : (
                                <div className="w-14 h-14 rounded-full bg-orange-500 flex items-center justify-center">
                                    <User size={24} className="text-white" />
                                </div>
                            )}
                            <div>
                                <p className="text-white/60 text-sm">by</p>
                                <p className="text-white font-bold text-xl">{creatorName}</p>
                            </div>
                        </div>

                        {hasCollage && (
                            <div className="flex items-center gap-2 text-white/60">
                                <Camera size={18} />
                                <span className="text-sm">{allImages.length} photos</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Connected Mode Indicator */}
            {isConnectedMode && (
                <div className="absolute top-1/2 right-6 -translate-y-1/2 flex flex-col gap-2">
                    {Array.from({ length: segmentTotal || 0 }).map((_, i) => (
                        <div
                            key={i}
                            className={`w-2 h-8 rounded-full ${i === segmentIndex ? 'bg-orange-400' : 'bg-white/20'}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// DAY SLIDE - Photo Grid Layout with Activities
// ═══════════════════════════════════════════════════════════════════════════════

interface DaySlideProps {
    dayNumber: number;
    dayTitle: string;
    date: string;
    activities: {
        time: string;
        title: string;
        location?: string;
        images?: string[];
    }[];
    primaryImageUrl?: string;
    isLastDay?: boolean;
    // All images for this day
    dayImages?: string[];
}

export const DaySlide: React.FC<DaySlideProps> = ({
    dayNumber,
    dayTitle,
    date,
    activities,
    primaryImageUrl,
    isLastDay,
    dayImages = []
}) => {
    // Get up to 6 images for the grid
    const gridImages = dayImages.length > 0 ? dayImages.slice(0, 6) : (primaryImageUrl ? [primaryImageUrl] : []);
    const imageCount = gridImages.length;

    // Dynamic grid layout based on image count
    const getGridLayout = () => {
        switch (imageCount) {
            case 1:
                return 'grid-cols-1 grid-rows-1';
            case 2:
                return 'grid-cols-2 grid-rows-1';
            case 3:
                return 'grid-cols-2 grid-rows-2'; // 1 large + 2 small
            case 4:
                return 'grid-cols-2 grid-rows-2';
            case 5:
            case 6:
                return 'grid-cols-3 grid-rows-2';
            default:
                return 'grid-cols-1 grid-rows-1';
        }
    };

    return (
        <div
            id={`day-slide-${dayNumber}`}
            className="relative overflow-hidden"
            style={{
                width: SLIDE_STYLES.width,
                height: SLIDE_STYLES.height,
                background: '#0a0a0a'
            }}
        >
            {/* Image Grid - Top 60% of slide */}
            <div className="absolute top-0 left-0 right-0 h-[55%]">
                {imageCount === 0 ? (
                    // Placeholder when no images
                    <div className="w-full h-full bg-gradient-to-br from-orange-500/20 to-rose-500/20 flex items-center justify-center">
                        <Camera size={80} className="text-white/20" />
                    </div>
                ) : imageCount === 1 ? (
                    // Single large image
                    <img
                        src={gridImages[0]}
                        alt={dayTitle}
                        className="w-full h-full object-cover"
                        crossOrigin="anonymous"
                    />
                ) : imageCount === 2 ? (
                    // Two images side by side
                    <div className="grid grid-cols-2 gap-1 h-full">
                        {gridImages.map((img, idx) => (
                            <img
                                key={idx}
                                src={img}
                                alt={`Day ${dayNumber} - ${idx + 1}`}
                                className="w-full h-full object-cover"
                                crossOrigin="anonymous"
                            />
                        ))}
                    </div>
                ) : imageCount === 3 ? (
                    // 1 large left + 2 stacked right
                    <div className="grid grid-cols-2 gap-1 h-full">
                        <img
                            src={gridImages[0]}
                            alt={`Day ${dayNumber} - 1`}
                            className="w-full h-full object-cover"
                            crossOrigin="anonymous"
                        />
                        <div className="grid grid-rows-2 gap-1">
                            {gridImages.slice(1).map((img, idx) => (
                                <img
                                    key={idx}
                                    src={img}
                                    alt={`Day ${dayNumber} - ${idx + 2}`}
                                    className="w-full h-full object-cover"
                                    crossOrigin="anonymous"
                                />
                            ))}
                        </div>
                    </div>
                ) : imageCount === 4 ? (
                    // 2x2 grid
                    <div className="grid grid-cols-2 grid-rows-2 gap-1 h-full">
                        {gridImages.map((img, idx) => (
                            <img
                                key={idx}
                                src={img}
                                alt={`Day ${dayNumber} - ${idx + 1}`}
                                className="w-full h-full object-cover"
                                crossOrigin="anonymous"
                            />
                        ))}
                    </div>
                ) : (
                    // 3x2 grid for 5-6 images
                    <div className="grid grid-cols-3 grid-rows-2 gap-1 h-full">
                        {gridImages.map((img, idx) => (
                            <img
                                key={idx}
                                src={img}
                                alt={`Day ${dayNumber} - ${idx + 1}`}
                                className="w-full h-full object-cover"
                                crossOrigin="anonymous"
                            />
                        ))}
                    </div>
                )}

                {/* Gradient overlay at bottom of images */}
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
            </div>

            {/* Day Badge - Floating over images */}
            <div className="absolute top-6 left-6 flex items-center gap-3">
                <div className="bg-orange-500 px-5 py-3 rounded-xl shadow-lg">
                    <span className="text-white font-black text-2xl">DAY {dayNumber}</span>
                </div>
                <div className="bg-black/60 backdrop-blur-xl px-4 py-2 rounded-xl border border-white/10">
                    <span className="text-white/80 text-sm">{date}</span>
                </div>
            </div>

            {/* Photo count badge */}
            {imageCount > 1 && (
                <div className="absolute top-6 right-6 flex items-center gap-2 bg-black/60 backdrop-blur-xl px-4 py-2 rounded-xl border border-white/10">
                    <Camera size={16} className="text-white/60" />
                    <span className="text-white/80 text-sm">{imageCount} photos</span>
                </div>
            )}

            {/* Content Section - Bottom 45% */}
            <div className="absolute bottom-0 left-0 right-0 h-[45%] p-10">
                {/* Day Title */}
                <h2 className="text-4xl font-bold text-white mb-6 leading-tight">
                    {dayTitle}
                </h2>

                {/* Activities List - Compact */}
                <div className="space-y-3">
                    {activities.slice(0, 4).map((activity, idx) => (
                        <div
                            key={idx}
                            className="flex items-center gap-4 bg-white/5 backdrop-blur-xl rounded-xl px-5 py-3 border border-white/5"
                        >
                            <span className="text-orange-400 font-mono font-bold text-sm min-w-[4rem]">
                                {activity.time}
                            </span>
                            <div className="flex-1">
                                <p className="text-white font-medium text-lg leading-snug">
                                    {activity.title}
                                </p>
                            </div>
                            {activity.images && activity.images.length > 0 && (
                                <div className="flex -space-x-2">
                                    {activity.images.slice(0, 2).map((img, i) => (
                                        <div key={i} className="w-8 h-8 rounded-lg overflow-hidden ring-2 ring-[#0a0a0a]">
                                            <img src={img} alt="" className="w-full h-full object-cover" crossOrigin="anonymous" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}

                    {activities.length > 4 && (
                        <p className="text-white/40 text-sm text-center pt-2">
                            +{activities.length - 4} more activities
                        </p>
                    )}
                </div>

                {/* Footer */}
                <div className="absolute bottom-6 left-10 right-10 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Compass size={16} className="text-orange-400" />
                        <span className="text-white/40 text-xs uppercase tracking-wider">OnQuest</span>
                    </div>
                    {!isLastDay && (
                        <div className="flex items-center gap-2 text-orange-400">
                            <span className="text-sm font-medium">Swipe for Day {dayNumber + 1}</span>
                            <ArrowRight size={16} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAP SLIDE - Route with Photo Thumbnails
// ═══════════════════════════════════════════════════════════════════════════════

interface MapSlideProps {
    mapImageUrl?: string;
    stops: { name: string; lat?: number; lng?: number; image?: string }[];
    totalDays: number;
    dayNumber?: number;
}

export const MapSlide: React.FC<MapSlideProps> = ({
    mapImageUrl,
    stops,
    totalDays,
    dayNumber
}) => {
    return (
        <div
            id="map-slide"
            className="relative overflow-hidden"
            style={{
                width: SLIDE_STYLES.width,
                height: SLIDE_STYLES.height,
                background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)'
            }}
        >
            {/* Map Background */}
            <div className="absolute inset-0">
                {mapImageUrl ? (
                    <>
                        <img
                            src={mapImageUrl}
                            alt="Route Map"
                            className="w-full h-full object-cover opacity-50"
                            crossOrigin="anonymous"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/30" />
                    </>
                ) : (
                    <div className="absolute inset-0 opacity-10" style={{
                        backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                        backgroundSize: '30px 30px'
                    }} />
                )}
            </div>

            {/* Content */}
            <div className="relative h-full flex flex-col p-12">
                {/* Header */}
                <div className="flex justify-between items-start mb-10">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center">
                                <Navigation size={20} className="text-white" />
                            </div>
                            <span className="text-white/40 text-xs uppercase tracking-[0.2em]">Your Route</span>
                        </div>
                        <h2 className="text-5xl font-black text-white">
                            {dayNumber ? `Day ${dayNumber}` : `${totalDays} Days`}
                        </h2>
                    </div>
                </div>

                {/* Stops with Images */}
                <div className="flex-1 flex items-center">
                    <div className="w-full space-y-5">
                        {stops.slice(0, 5).map((stop, idx) => (
                            <div key={idx} className="flex items-center gap-5 group">
                                {/* Number or Image */}
                                {stop.image ? (
                                    <div className="w-20 h-20 rounded-2xl overflow-hidden ring-3 ring-orange-500/50 flex-shrink-0">
                                        <img src={stop.image} alt={stop.name} className="w-full h-full object-cover" crossOrigin="anonymous" />
                                    </div>
                                ) : (
                                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center flex-shrink-0">
                                        <span className="text-white font-black text-2xl">{idx + 1}</span>
                                    </div>
                                )}

                                {/* Stop Name */}
                                <div className="flex-1 bg-white/5 backdrop-blur-xl px-6 py-5 rounded-2xl border border-white/10">
                                    <p className="text-white text-2xl font-semibold">{stop.name}</p>
                                    <p className="text-white/40 text-sm mt-1">Stop {idx + 1}</p>
                                </div>

                                {/* Connector */}
                                {idx < stops.length - 1 && idx < 4 && (
                                    <ArrowRight size={24} className="text-orange-400/50 flex-shrink-0" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-center pt-8">
                    <div className="inline-flex items-center gap-4 bg-gradient-to-r from-orange-500 to-rose-500 px-10 py-4 rounded-2xl">
                        <span className="text-white text-xl font-bold">See Full Itinerary</span>
                        <ArrowRight size={22} className="text-white" />
                    </div>
                </div>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// CTA SLIDE - Photo Mosaic Background
// ═══════════════════════════════════════════════════════════════════════════════

interface CTASlideProps {
    questId: string;
    questTitle: string;
    creatorName: string;
    creatorProfilePic?: string;
    qrCodeDataUrl?: string;
    totalDays: number;
    dayNumber?: number;
    allImages?: string[];
}

export const CTASlide: React.FC<CTASlideProps> = ({
    questId,
    questTitle,
    creatorName,
    creatorProfilePic,
    qrCodeDataUrl,
    totalDays,
    dayNumber,
    allImages = []
}) => {
    // Get images for background mosaic
    const mosaicImages = allImages.slice(0, 9);

    return (
        <div
            id="cta-slide"
            className="relative overflow-hidden"
            style={{
                width: SLIDE_STYLES.width,
                height: SLIDE_STYLES.height,
                background: '#0a0a0a'
            }}
        >
            {/* Photo Mosaic Background */}
            {mosaicImages.length >= 4 ? (
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-1 opacity-30">
                    {mosaicImages.map((img, idx) => (
                        <div key={idx} className="overflow-hidden">
                            <img
                                src={img}
                                alt=""
                                className="w-full h-full object-cover"
                                style={{ filter: 'blur(1px)' }}
                                crossOrigin="anonymous"
                            />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="absolute inset-0">
                    <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-orange-500/20 blur-[120px]" />
                    <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-rose-500/20 blur-[100px]" />
                </div>
            )}

            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black/70" />

            {/* Content */}
            <div className="relative h-full flex flex-col items-center justify-center p-14 text-center">

                {/* Logo */}
                <div className="mb-12">
                    <div className="inline-flex items-center gap-4 bg-white/10 backdrop-blur-xl px-8 py-5 rounded-2xl border border-white/10">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center">
                            <Compass size={28} className="text-white" />
                        </div>
                        <span className="text-white font-black text-3xl tracking-tight">ONQUEST</span>
                    </div>
                </div>

                {/* Main Text */}
                <div className="space-y-5 mb-12 max-w-3xl">
                    <h2 className="text-5xl font-black text-white leading-tight">
                        Get the Complete Itinerary
                    </h2>
                    <p className="text-2xl text-white/60">
                        {totalDays} days • {allImages.length || 'Multiple'} photos • {questTitle}
                    </p>
                </div>

                {/* QR Code */}
                {qrCodeDataUrl && (
                    <div className="relative mb-10">
                        <div className="bg-white p-6 rounded-2xl shadow-2xl">
                            <img src={qrCodeDataUrl} alt="QR Code" className="w-44 h-44" />
                        </div>
                        <p className="text-white/40 text-sm mt-3">Scan to explore</p>
                    </div>
                )}

                {/* URL */}
                <div className="inline-flex items-center gap-3 bg-gradient-to-r from-orange-500 to-rose-500 px-8 py-4 rounded-xl mb-12">
                    <span className="text-white text-xl font-bold">
                        onquest.in/quest/{questId.slice(0, 8)}
                    </span>
                </div>

                {/* Creator */}
                <div className="flex items-center gap-4">
                    {creatorProfilePic ? (
                        <img
                            src={creatorProfilePic}
                            alt={creatorName}
                            className="w-12 h-12 rounded-full object-cover ring-2 ring-orange-400/50"
                            crossOrigin="anonymous"
                        />
                    ) : (
                        <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center">
                            <User size={20} className="text-white" />
                        </div>
                    )}
                    <div className="text-left">
                        <p className="text-white/50 text-sm">Curated by</p>
                        <p className="text-white font-bold text-lg">{creatorName}</p>
                    </div>
                </div>

                {/* Footer */}
                <div className="absolute bottom-10 text-white/30 text-sm tracking-[0.2em] uppercase">
                    Plan • Explore • Share
                </div>
            </div>
        </div>
    );
};

export { SLIDE_STYLES };
