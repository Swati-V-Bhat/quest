// components/quest/StoryGeneratorModal.tsx
// Modal for generating Instagram Story images with scrapbook/decorative style

'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { X, Download, Loader2, Sparkles, Palette, Check } from 'lucide-react';
import html2canvas from 'html2canvas';

// Story canvas dimensions (9:16 for Instagram Stories)
const STORY_DIMENSIONS = {
    width: 1080,
    height: 1920,
};

// Available themes/styles
const STORY_THEMES = [
    {
        id: 'scrapbook',
        name: 'Scrapbook',
        description: 'Vintage journal style',
        bgColor: '#1a1a2e',
        accentColor: '#ff6b6b',
        starColor: '#ffd93d',
    },
    {
        id: 'polaroid',
        name: 'Polaroid',
        description: 'Classic photo style',
        bgColor: '#0f0f23',
        accentColor: '#6c5ce7',
        starColor: '#fff',
    },
    {
        id: 'tropical',
        name: 'Tropical',
        description: 'Vibrant summer vibes',
        bgColor: '#1e3a5f',
        accentColor: '#ff9f43',
        starColor: '#ffe66d',
    },
    {
        id: 'minimal',
        name: 'Minimal',
        description: 'Clean & modern',
        bgColor: '#121212',
        accentColor: '#f39c12',
        starColor: '#ecf0f1',
    },
];

interface StoryGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    questData: {
        questId: string;
        title: string;
        destination: string;
        creatorName: string;
        creatorProfilePic: string;
        startDate: string;
        endDate: string;
        coverImageUrl: string;
        itinerary: {
            days: Array<{
                day: number;
                date: string;
                title: string;
                activities: Array<{
                    title: string;
                    location?: { name: string };
                    media?: Array<{ type: string; url: string }>;
                }>;
            }>;
        };
    };
}

export const StoryGeneratorModal: React.FC<StoryGeneratorModalProps> = ({
    isOpen,
    onClose,
    questData,
}) => {
    const [selectedTheme, setSelectedTheme] = useState(STORY_THEMES[0]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isDownloaded, setIsDownloaded] = useState(false);
    const storyRef = useRef<HTMLDivElement>(null);

    // Extract all images from the quest
    const allImages = useMemo(() => {
        const images: string[] = [];

        if (questData.coverImageUrl) {
            images.push(questData.coverImageUrl);
        }

        questData.itinerary.days.forEach((day) => {
            day.activities.forEach((activity) => {
                if (activity.media) {
                    activity.media.forEach((m) => {
                        if (m.type === 'image' && m.url) {
                            images.push(m.url);
                        }
                    });
                }
            });
        });

        return images;
    }, [questData]);

    // Get random images for the collage (max 6) - initialize once
    const [selectedImages, setSelectedImages] = useState<string[]>([]);

    // Initialize selected images when modal opens
    useEffect(() => {
        if (isOpen && selectedImages.length === 0 && allImages.length > 0) {
            // Pick first 6 images by default
            setSelectedImages(allImages.slice(0, Math.min(6, allImages.length)));
        }
    }, [isOpen, allImages]);

    // Toggle image selection
    const toggleImage = (imageUrl: string) => {
        setSelectedImages(prev => {
            if (prev.includes(imageUrl)) {
                return prev.filter(img => img !== imageUrl);
            } else if (prev.length < 6) {
                return [...prev, imageUrl];
            }
            return prev; // Max 6 images
        });
    };

    // Wait for all images in container to load
    const waitForImages = useCallback(async (container: HTMLElement): Promise<void> => {
        const images = container.querySelectorAll('img');
        const promises = Array.from(images).map((img) => {
            if (img.complete) return Promise.resolve();
            return new Promise<void>((resolve) => {
                img.onload = () => resolve();
                img.onerror = () => resolve(); // Don't block on error
            });
        });
        await Promise.all(promises);
    }, []);

    // Convert image URL to base64 data URL
    const imageToBase64 = useCallback(async (url: string): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                    resolve(canvas.toDataURL('image/jpeg', 0.9));
                } else {
                    resolve(url); // Fallback to original URL
                }
            };
            img.onerror = () => resolve(url); // Fallback on error
            img.src = url;
        });
    }, []);

    // Convert all selected images to base64 for export
    const [base64Images, setBase64Images] = useState<Record<string, string>>({});

    // Pre-convert images when they change
    useEffect(() => {
        const convertImages = async () => {
            const converted: Record<string, string> = {};
            for (const url of selectedImages) {
                if (!base64Images[url]) {
                    converted[url] = await imageToBase64(url);
                } else {
                    converted[url] = base64Images[url];
                }
            }
            setBase64Images(converted);
        };
        if (selectedImages.length > 0) {
            convertImages();
        }
    }, [selectedImages, imageToBase64]);

    // Download the story image
    const downloadStory = useCallback(async () => {
        if (!storyRef.current) return;

        setIsGenerating(true);
        try {
            // Use html2canvas which has better CORS handling
            const canvas = await html2canvas(storyRef.current, {
                useCORS: true,
                allowTaint: true,
                scale: 2,
                backgroundColor: null,
                logging: false,
            });

            const dataUrl = canvas.toDataURL('image/png', 1.0);

            const link = document.createElement('a');
            link.download = `onquest-story-${questData.destination.replace(/\s+/g, '-').toLowerCase()}.png`;
            link.href = dataUrl;
            link.click();

            setIsDownloaded(true);
            setTimeout(() => setIsDownloaded(false), 2000);
        } catch (error) {
            console.error('Error generating story:', error);
            alert('Failed to generate. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    }, [questData.destination]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-2 md:p-4">
            <div className="bg-gray-900 rounded-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden border border-gray-700 shadow-2xl flex flex-col">
                {/* Header - Fixed */}
                <div className="flex items-center justify-between p-4 border-b border-gray-700 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-r from-pink-500 to-purple-500 p-2 rounded-lg">
                            <Sparkles size={20} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Instagram Story</h2>
                            <p className="text-xs text-gray-400">
                                {selectedImages.length}/6 photos selected
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto">
                    <div className="flex flex-col lg:flex-row">

                        {/* LEFT: Story Preview */}
                        <div className="lg:flex-1 p-4 lg:p-6 flex flex-col items-center bg-gray-950/50">
                            <p className="text-xs text-gray-500 mb-3">Preview</p>

                            {/* Story Container - Responsive sizing */}
                            <div
                                className="relative rounded-xl overflow-hidden shadow-2xl border border-gray-700"
                                style={{
                                    width: 'min(200px, 50vw)',
                                    aspectRatio: '9/16',
                                }}
                            >
                                {/* The actual story canvas (scaled down for preview) */}
                                <div
                                    ref={storyRef}
                                    className="absolute top-0 left-0 origin-top-left"
                                    style={{
                                        width: STORY_DIMENSIONS.width,
                                        height: STORY_DIMENSIONS.height,
                                        transform: `scale(${200 / STORY_DIMENSIONS.width})`,
                                        backgroundColor: selectedTheme.bgColor,
                                    }}
                                >
                                    {/* Background stars/decorations */}
                                    <div className="absolute inset-0 overflow-hidden">
                                        {/* Scattered stars */}
                                        {[...Array(20)].map((_, i) => (
                                            <svg
                                                key={i}
                                                className="absolute"
                                                style={{
                                                    top: `${5 + Math.random() * 90}%`,
                                                    left: `${5 + Math.random() * 90}%`,
                                                    width: 12 + Math.random() * 20,
                                                    height: 12 + Math.random() * 20,
                                                    opacity: 0.6 + Math.random() * 0.4,
                                                    transform: `rotate(${Math.random() * 45}deg)`,
                                                }}
                                                viewBox="0 0 24 24"
                                                fill={selectedTheme.starColor}
                                            >
                                                <polygon points="12,2 15,10 24,10 17,15 20,24 12,18 4,24 7,15 0,10 9,10" />
                                            </svg>
                                        ))}

                                        {/* Sparkle dots */}
                                        {[...Array(30)].map((_, i) => (
                                            <div
                                                key={`dot-${i}`}
                                                className="absolute rounded-full"
                                                style={{
                                                    top: `${Math.random() * 100}%`,
                                                    left: `${Math.random() * 100}%`,
                                                    width: 2 + Math.random() * 4,
                                                    height: 2 + Math.random() * 4,
                                                    backgroundColor: selectedTheme.starColor,
                                                    opacity: 0.3 + Math.random() * 0.5,
                                                }}
                                            />
                                        ))}
                                    </div>

                                    {/* Title Header */}
                                    <div
                                        className="absolute top-0 left-0 right-0 text-center py-12 px-8"
                                        style={{ fontFamily: 'Georgia, serif' }}
                                    >
                                        <h1
                                            className="font-bold tracking-wide"
                                            style={{
                                                fontSize: 64,
                                                color: selectedTheme.accentColor,
                                                textShadow: '2px 2px 8px rgba(0,0,0,0.5)',
                                            }}
                                        >
                                            {questData.title || questData.destination}
                                        </h1>
                                    </div>

                                    {/* Photo Collage - Scrapbook Style */}
                                    <div className="absolute top-44 left-0 right-0 bottom-44 px-8 flex items-center justify-center">
                                        {/* Center divider/binding */}
                                        <div
                                            className="absolute left-1/2 top-0 bottom-0 w-8 -translate-x-1/2 z-30"
                                            style={{
                                                background: 'linear-gradient(90deg, rgba(0,0,0,0.3), rgba(0,0,0,0.5), rgba(0,0,0,0.3))',
                                            }}
                                        >
                                            {/* Spiral binding holes */}
                                            {[...Array(12)].map((_, i) => (
                                                <div
                                                    key={i}
                                                    className="absolute left-1/2 -translate-x-1/2 w-6 h-6 rounded-full"
                                                    style={{
                                                        top: `${5 + i * 8}%`,
                                                        background: 'linear-gradient(135deg, #b8860b 0%, #daa520 50%, #cd853f 100%)',
                                                        boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.3), 2px 2px 4px rgba(0,0,0,0.2)',
                                                    }}
                                                />
                                            ))}
                                        </div>

                                        {/* Left page photos */}
                                        <div className="absolute left-6 top-0 bottom-0 w-[calc(50%-24px)] flex flex-col gap-4 py-4">
                                            {selectedImages.slice(0, Math.ceil(selectedImages.length / 2)).map((img, idx) => (
                                                <div
                                                    key={idx}
                                                    className="relative flex-1 rounded-lg overflow-hidden shadow-xl"
                                                    style={{
                                                        transform: `rotate(${-3 + Math.random() * 6}deg)`,
                                                        border: '8px solid white',
                                                        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                                                    }}
                                                >
                                                    <img
                                                        src={img}
                                                        alt=""
                                                        className="w-full h-full object-cover"
                                                        crossOrigin="anonymous"
                                                    />
                                                </div>
                                            ))}
                                        </div>

                                        {/* Right page photos */}
                                        <div className="absolute right-6 top-0 bottom-0 w-[calc(50%-24px)] flex flex-col gap-4 py-4">
                                            {selectedImages.slice(Math.ceil(selectedImages.length / 2)).map((img, idx) => (
                                                <div
                                                    key={idx}
                                                    className="relative flex-1 rounded-lg overflow-hidden shadow-xl"
                                                    style={{
                                                        transform: `rotate(${-3 + Math.random() * 6}deg)`,
                                                        border: '8px solid white',
                                                        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                                                    }}
                                                >
                                                    <img
                                                        src={img}
                                                        alt=""
                                                        className="w-full h-full object-cover"
                                                        crossOrigin="anonymous"
                                                    />
                                                </div>
                                            ))}
                                        </div>

                                        {/* Decorative hearts */}
                                        <svg
                                            className="absolute bottom-8 left-12"
                                            width="80"
                                            height="80"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke={selectedTheme.accentColor}
                                            strokeWidth="1"
                                            style={{ opacity: 0.8 }}
                                        >
                                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                        </svg>
                                    </div>

                                    {/* Bottom decorative star */}
                                    <div className="absolute bottom-8 right-12">
                                        <svg
                                            width="60"
                                            height="60"
                                            viewBox="0 0 24 24"
                                            fill={selectedTheme.starColor}
                                        >
                                            <polygon points="12,0 14,10 24,12 14,14 12,24 10,14 0,12 10,10" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Theme Quick Switch - Mobile friendly */}
                            <div className="flex gap-2 mt-4">
                                {STORY_THEMES.map((theme) => (
                                    <button
                                        key={theme.id}
                                        onClick={() => setSelectedTheme(theme)}
                                        className={`w-8 h-8 rounded-full border-2 transition-all ${selectedTheme.id === theme.id
                                            ? 'border-pink-500 scale-110'
                                            : 'border-gray-600'
                                            }`}
                                        style={{ backgroundColor: theme.bgColor }}
                                        title={theme.name}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* RIGHT: Controls */}
                        <div className="lg:w-72 p-4 lg:p-6 border-t lg:border-t-0 lg:border-l border-gray-700">

                            {/* Photo Selection */}
                            <div className="mb-4">
                                <h4 className="text-sm font-medium text-white mb-2 flex items-center justify-between">
                                    <span>Select Photos</span>
                                    <span className="text-pink-400">{selectedImages.length}/6</span>
                                </h4>
                                <div className="grid grid-cols-4 gap-1.5 max-h-32 overflow-y-auto p-1 bg-gray-800/50 rounded-lg">
                                    {allImages.map((img, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => toggleImage(img)}
                                            className={`relative aspect-square rounded overflow-hidden border-2 transition-all ${selectedImages.includes(img)
                                                ? 'border-pink-500 ring-1 ring-pink-500/50'
                                                : 'border-transparent hover:border-gray-500'
                                                }`}
                                        >
                                            <img
                                                src={img}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                            {selectedImages.includes(img) && (
                                                <div className="absolute inset-0 bg-pink-500/40 flex items-center justify-center">
                                                    <Check size={12} className="text-white" />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Tap to select/deselect</p>
                            </div>

                            {/* Theme Selection - Compact for desktop */}
                            <div className="hidden lg:block mb-4">
                                <h4 className="text-sm font-medium text-white mb-2">Theme</h4>
                                <div className="space-y-1.5">
                                    {STORY_THEMES.map((theme) => (
                                        <button
                                            key={theme.id}
                                            onClick={() => setSelectedTheme(theme)}
                                            className={`w-full flex items-center gap-2 p-2 rounded-lg transition-all text-sm ${selectedTheme.id === theme.id
                                                ? 'bg-pink-500/20 border border-pink-500'
                                                : 'bg-gray-800/50 border border-transparent hover:bg-gray-700'
                                                }`}
                                        >
                                            <div
                                                className="w-6 h-6 rounded-full flex items-center justify-center"
                                                style={{ backgroundColor: theme.bgColor }}
                                            >
                                                <div
                                                    className="w-2.5 h-2.5 rounded-full"
                                                    style={{ backgroundColor: theme.accentColor }}
                                                />
                                            </div>
                                            <span className="text-white">{theme.name}</span>
                                            {selectedTheme.id === theme.id && (
                                                <Check size={14} className="text-pink-400 ml-auto" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Download Button */}
                            <button
                                onClick={downloadStory}
                                disabled={isGenerating || selectedImages.length === 0}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 rounded-xl transition-colors font-bold disabled:opacity-50"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        <span>Generating...</span>
                                    </>
                                ) : isDownloaded ? (
                                    <>
                                        <Check size={18} />
                                        <span>Downloaded!</span>
                                    </>
                                ) : (
                                    <>
                                        <Download size={18} />
                                        <span>Download Story</span>
                                    </>
                                )}
                            </button>

                            {/* Info */}
                            <p className="text-xs text-gray-500 text-center mt-3">
                                1080×1920px • 9:16 ratio
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StoryGeneratorModal;
