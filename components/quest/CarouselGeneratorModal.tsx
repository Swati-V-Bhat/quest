// components/quest/CarouselGeneratorModal.tsx
// Main modal for generating and downloading Instagram carousel images

'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { X, Download, ChevronLeft, ChevronRight, Loader2, Image as ImageIcon, Check, Camera } from 'lucide-react';
import { toPng } from 'html-to-image';
import { CoverSlide, MapSlide, DaySlide, CTASlide, SLIDE_STYLES } from './CarouselSlideTemplates';
import { carouselService, QuestCarouselData } from '@/lib/carouselService';

interface CarouselGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    questData: QuestCarouselData;
}

interface GeneratedSlide {
    type: 'cover' | 'map' | 'day' | 'cta';
    dayNumber?: number;
    dataUrl?: string;
    isGenerating: boolean;
}

export const CarouselGeneratorModal: React.FC<CarouselGeneratorModalProps> = ({
    isOpen,
    onClose,
    questData
}) => {
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [generatedSlides, setGeneratedSlides] = useState<GeneratedSlide[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
    const [downloadProgress, setDownloadProgress] = useState<number>(0);
    const [isDownloading, setIsDownloading] = useState(false);
    const slideContainerRef = useRef<HTMLDivElement>(null);

    const isSingleCarousel = carouselService.shouldBeSingleCarousel(questData.totalDays);

    // Extract ALL images from the quest
    const allQuestImages = useMemo(() => {
        const images: string[] = [];

        // Add cover image first
        if (questData.coverImageUrl) {
            images.push(questData.coverImageUrl);
        }

        // Extract from all days and activities
        questData.itinerary.days.forEach(day => {
            day.activities.forEach(activity => {
                if (activity.media && activity.media.length > 0) {
                    activity.media.forEach(m => {
                        if (m.type === 'image' && m.url) {
                            images.push(m.url);
                        }
                    });
                }
            });
        });

        return images;
    }, [questData]);

    // Get images for a specific day
    const getDayImages = useCallback((dayNumber: number): string[] => {
        const day = questData.itinerary.days.find(d => d.day === dayNumber);
        if (!day) return [];

        const images: string[] = [];
        day.activities.forEach(activity => {
            if (activity.media && activity.media.length > 0) {
                activity.media.forEach(m => {
                    if (m.type === 'image' && m.url) {
                        images.push(m.url);
                    }
                });
            }
        });

        return images;
    }, [questData]);

    // Get stops with their associated images
    const getStopsWithImages = useCallback(() => {
        const stops: { name: string; lat?: number; lng?: number; image?: string }[] = [];
        const seen = new Set<string>();

        questData.itinerary.days.forEach(day => {
            day.activities.forEach(activity => {
                if (activity.location?.name && !seen.has(activity.location.name)) {
                    seen.add(activity.location.name);

                    // Get first image from this activity
                    let image: string | undefined;
                    if (activity.media && activity.media.length > 0) {
                        const imgMedia = activity.media.find(m => m.type === 'image');
                        if (imgMedia) image = imgMedia.url;
                    }

                    stops.push({
                        name: activity.location.name,
                        lat: activity.location.coordinates?.lat,
                        lng: activity.location.coordinates?.lng,
                        image
                    });
                }
            });
        });

        return stops;
    }, [questData]);

    // Generate slides structure based on quest data
    const generateSlidesStructure = useCallback((): GeneratedSlide[] => {
        const slides: GeneratedSlide[] = [];

        // Always add cover slide
        slides.push({ type: 'cover', isGenerating: false });

        // Add map slide
        slides.push({ type: 'map', isGenerating: false });

        // Add day slides
        questData.itinerary.days.forEach((day) => {
            slides.push({ type: 'day', dayNumber: day.day, isGenerating: false });
        });

        // Add CTA slide
        slides.push({ type: 'cta', isGenerating: false });

        return slides;
    }, [questData]);

    // Initialize slides and generate QR code
    useEffect(() => {
        if (isOpen) {
            setGeneratedSlides(generateSlidesStructure());
            setCurrentSlideIndex(0);

            // Generate QR code
            carouselService.generateQRCode(questData.questId).then(setQrCodeUrl);
        }
    }, [isOpen, generateSlidesStructure, questData.questId]);

    // Render current slide based on type
    const renderCurrentSlide = () => {
        const slide = generatedSlides[currentSlideIndex];
        if (!slide) return null;

        switch (slide.type) {
            case 'cover':
                return (
                    <CoverSlide
                        title={questData.title || questData.destination}
                        creatorName={questData.creatorName}
                        creatorProfilePic={questData.creatorProfilePic}
                        totalDays={questData.totalDays}
                        distance={carouselService.calculateTripDistance(questData.itinerary)}
                        coverImageUrl={questData.coverImageUrl}
                        destination={questData.destination}
                        allImages={allQuestImages}
                    />
                );
            case 'map':
                return (
                    <MapSlide
                        stops={getStopsWithImages()}
                        totalDays={questData.totalDays}
                    />
                );
            case 'day':
                const day = questData.itinerary.days.find(d => d.day === slide.dayNumber);
                if (!day) return null;

                // Get all images for this day
                const dayImages = getDayImages(day.day);

                // Get activity images for display
                const activitiesWithImages = day.activities.map(a => ({
                    time: a.time,
                    title: a.title,
                    location: a.location?.name,
                    images: a.media?.filter(m => m.type === 'image').map(m => m.url) || []
                }));

                return (
                    <DaySlide
                        dayNumber={day.day}
                        dayTitle={day.title}
                        date={carouselService.formatDate(day.date)}
                        activities={activitiesWithImages}
                        primaryImageUrl={carouselService.getDayPrimaryImage(day) || undefined}
                        isLastDay={day.day === questData.totalDays}
                        dayImages={dayImages}
                    />
                );
            case 'cta':
                return (
                    <CTASlide
                        questId={questData.questId}
                        questTitle={questData.destination}
                        creatorName={questData.creatorName}
                        creatorProfilePic={questData.creatorProfilePic}
                        qrCodeDataUrl={qrCodeUrl}
                        totalDays={questData.totalDays}
                        allImages={allQuestImages}
                    />
                );
            default:
                return null;
        }
    };

    // Download all slides
    const downloadAllSlides = async () => {
        setIsDownloading(true);
        setDownloadProgress(0);

        const totalSlides = generatedSlides.length;

        for (let i = 0; i < totalSlides; i++) {
            setCurrentSlideIndex(i);

            // Wait for slide to render
            await new Promise(resolve => setTimeout(resolve, 800));

            const slideElement = slideContainerRef.current?.firstElementChild;
            if (slideElement) {
                try {
                    const dataUrl = await toPng(slideElement as HTMLElement, {
                        quality: 1,
                        pixelRatio: 2,
                        cacheBust: true
                    });

                    // Download the image
                    const link = document.createElement('a');
                    const slideType = generatedSlides[i].type;
                    const dayNum = generatedSlides[i].dayNumber;
                    const fileName = slideType === 'day'
                        ? `onquest-${questData.destination.replace(/\s+/g, '-')}-day${dayNum}.png`
                        : `onquest-${questData.destination.replace(/\s+/g, '-')}-${slideType}.png`;

                    link.download = fileName.toLowerCase();
                    link.href = dataUrl;
                    link.click();

                    setDownloadProgress(Math.round(((i + 1) / totalSlides) * 100));
                } catch (error) {
                    console.error(`Error downloading slide ${i}:`, error);
                }
            }
        }

        setIsDownloading(false);
        setDownloadProgress(100);

        // Reset to first slide
        setTimeout(() => {
            setCurrentSlideIndex(0);
            setDownloadProgress(0);
        }, 1000);
    };

    // Download current slide only
    const downloadCurrentSlide = async () => {
        setIsGenerating(true);

        const slideElement = slideContainerRef.current?.firstElementChild;
        if (slideElement) {
            try {
                const dataUrl = await toPng(slideElement as HTMLElement, {
                    quality: 1,
                    pixelRatio: 2,
                    cacheBust: true
                });

                const link = document.createElement('a');
                const slideType = generatedSlides[currentSlideIndex].type;
                const dayNum = generatedSlides[currentSlideIndex].dayNumber;
                const fileName = slideType === 'day'
                    ? `onquest-${questData.destination.replace(/\s+/g, '-')}-day${dayNum}.png`
                    : `onquest-${questData.destination.replace(/\s+/g, '-')}-${slideType}.png`;

                link.download = fileName.toLowerCase();
                link.href = dataUrl;
                link.click();
            } catch (error) {
                console.error('Error downloading slide:', error);
            }
        }

        setIsGenerating(false);
    };

    const nextSlide = () => {
        setCurrentSlideIndex(prev => (prev + 1) % generatedSlides.length);
    };

    const prevSlide = () => {
        setCurrentSlideIndex(prev => (prev - 1 + generatedSlides.length) % generatedSlides.length);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden border border-gray-700 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-r from-orange-500 to-pink-500 p-2 rounded-lg">
                            <ImageIcon size={24} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Generate Instagram Carousel</h2>
                            <p className="text-sm text-gray-400">
                                {generatedSlides.length} slides • {allQuestImages.length} photos
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <X size={24} className="text-gray-400" />
                    </button>
                </div>

                {/* Main Content */}
                <div className="flex flex-col lg:flex-row overflow-y-auto max-h-[calc(95vh-80px)]">
                    {/* Slide Preview */}
                    <div className="flex-1 p-6 flex flex-col items-center">
                        {/* Slide Navigation */}
                        <div className="flex items-center gap-4 mb-4 w-full max-w-md">
                            <button
                                onClick={prevSlide}
                                className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                <ChevronLeft size={24} className="text-white" />
                            </button>

                            <div className="flex-1 text-center">
                                <span className="text-white font-medium">
                                    {generatedSlides[currentSlideIndex]?.type === 'day'
                                        ? `Day ${generatedSlides[currentSlideIndex]?.dayNumber}`
                                        : generatedSlides[currentSlideIndex]?.type?.charAt(0).toUpperCase() +
                                        generatedSlides[currentSlideIndex]?.type?.slice(1)
                                    }
                                </span>
                                <span className="text-gray-400 ml-2">
                                    ({currentSlideIndex + 1} / {generatedSlides.length})
                                </span>
                            </div>

                            <button
                                onClick={nextSlide}
                                className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                <ChevronRight size={24} className="text-white" />
                            </button>
                        </div>

                        {/* Slide Container - Scaled down for preview */}
                        <div
                            className="relative bg-gray-800 rounded-xl overflow-hidden shadow-2xl"
                            style={{
                                width: '100%',
                                maxWidth: '360px',
                                aspectRatio: '4/5'
                            }}
                        >
                            <div
                                ref={slideContainerRef}
                                className="absolute inset-0 origin-top-left"
                                style={{
                                    transform: 'scale(0.333)',
                                    width: SLIDE_STYLES.width,
                                    height: SLIDE_STYLES.height
                                }}
                            >
                                {renderCurrentSlide()}
                            </div>
                        </div>

                        {/* Slide Dots */}
                        <div className="flex gap-2 mt-4 flex-wrap justify-center max-w-md">
                            {generatedSlides.map((slide, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setCurrentSlideIndex(idx)}
                                    className={`w-3 h-3 rounded-full transition-all ${idx === currentSlideIndex
                                        ? 'bg-orange-500 scale-125'
                                        : 'bg-gray-600 hover:bg-gray-500'
                                        }`}
                                    title={slide.type === 'day' ? `Day ${slide.dayNumber}` : slide.type}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Actions Panel */}
                    <div className="lg:w-80 p-6 border-t lg:border-t-0 lg:border-l border-gray-700 bg-gray-800/50">
                        <h3 className="text-lg font-bold text-white mb-4">Download Options</h3>

                        {/* Photo Stats */}
                        <div className="flex items-center gap-3 p-3 bg-orange-500/10 rounded-xl mb-4 border border-orange-500/20">
                            <Camera size={20} className="text-orange-400" />
                            <div>
                                <p className="text-white font-medium">{allQuestImages.length} Photos</p>
                                <p className="text-xs text-gray-400">from your quest</p>
                            </div>
                        </div>

                        {/* Download Progress */}
                        {isDownloading && (
                            <div className="mb-4">
                                <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
                                    <span>Downloading slides...</span>
                                    <span>{downloadProgress}%</span>
                                </div>
                                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-orange-500 to-pink-500 transition-all duration-300"
                                        style={{ width: `${downloadProgress}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="space-y-3">
                            <button
                                onClick={downloadCurrentSlide}
                                disabled={isGenerating || isDownloading}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition-colors font-medium disabled:opacity-50"
                            >
                                {isGenerating ? (
                                    <Loader2 size={20} className="animate-spin" />
                                ) : (
                                    <Download size={20} />
                                )}
                                <span>Download This Slide</span>
                            </button>

                            <button
                                onClick={downloadAllSlides}
                                disabled={isGenerating || isDownloading}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 rounded-xl transition-colors font-bold disabled:opacity-50"
                            >
                                {isDownloading ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin" />
                                        <span>Downloading...</span>
                                    </>
                                ) : downloadProgress === 100 ? (
                                    <>
                                        <Check size={20} />
                                        <span>Downloaded!</span>
                                    </>
                                ) : (
                                    <>
                                        <Download size={20} />
                                        <span>Download All ({generatedSlides.length} slides)</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Tips */}
                        <div className="mt-6 p-4 bg-gray-900/50 rounded-xl">
                            <h4 className="text-sm font-bold text-orange-400 mb-2">📸 Image-First Design</h4>
                            <ul className="text-sm text-gray-400 space-y-2">
                                <li>• Cover shows 4-image collage</li>
                                <li>• Each day displays up to 6 photos</li>
                                <li>• CTA has photo mosaic background</li>
                                <li>• More photos = better carousels!</li>
                            </ul>
                        </div>

                        {/* Slide Info */}
                        <div className="mt-4 text-xs text-gray-500">
                            <p>Slide size: 1080×1350px (4:5 ratio)</p>
                            <p>Optimized for Instagram carousel</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CarouselGeneratorModal;
