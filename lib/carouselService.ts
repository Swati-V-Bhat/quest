// lib/carouselService.ts
// Service for generating Instagram carousel images from Quest data

import QRCode from 'qrcode';

export interface CarouselSlide {
    type: 'cover' | 'map' | 'day' | 'cta';
    title?: string;
    subtitle?: string;
    dayNumber?: number;
    date?: string;
    activities?: {
        time: string;
        title: string;
        location?: string;
    }[];
    imageUrl?: string;
    route?: {
        lat: number;
        lng: number;
    }[];
}

export interface QuestCarouselData {
    questId: string;
    title: string;
    destination: string;
    creatorName: string;
    creatorProfilePic: string;
    startDate: string;
    endDate: string;
    coverImageUrl?: string;
    totalDays: number;
    itinerary: {
        days: {
            day: number;
            date: string;
            title: string;
            activities: {
                time: string;
                title: string;
                description?: string;
                location?: { name: string; coordinates?: { lat: number; lng: number } };
                media?: { url: string; type: string }[];
            }[];
        }[];
    };
}

export interface CarouselGenerationResult {
    slides: {
        type: string;
        dataUrl: string;
    }[];
    isSingleCarousel: boolean;
}

class CarouselService {
    private readonly SLIDE_WIDTH = 1080;
    private readonly SLIDE_HEIGHT = 1350;
    private readonly BASE_URL = 'https://onquest.in';

    /**
     * Generate QR code as data URL
     */
    async generateQRCode(questId: string): Promise<string> {
        const url = `${this.BASE_URL}/quest/${questId}`;
        try {
            return await QRCode.toDataURL(url, {
                width: 200,
                margin: 2,
                color: {
                    dark: '#FFFFFF',
                    light: '#00000000'
                }
            });
        } catch (error) {
            console.error('Error generating QR code:', error);
            return '';
        }
    }

    /**
     * Calculate total trip distance (placeholder - actual implementation would use routing API)
     */
    calculateTripDistance(itinerary: QuestCarouselData['itinerary']): string {
        // For now, return a placeholder. Could integrate with Google Directions API
        const dayCount = itinerary.days.length;
        // Rough estimate based on typical day distances
        const estimatedKm = dayCount * 150; // avg 150km per day
        return `~${estimatedKm} km`;
    }

    /**
     * Determine if quest should be single or multi carousel
     */
    shouldBeSingleCarousel(totalDays: number): boolean {
        return totalDays <= 2;
    }

    /**
     * Get primary image for a day (first activity with media, or fallback)
     */
    getDayPrimaryImage(day: QuestCarouselData['itinerary']['days'][0]): string | null {
        for (const activity of day.activities) {
            if (activity.media && activity.media.length > 0) {
                const imageMedia = activity.media.find(m => m.type === 'image');
                if (imageMedia) return imageMedia.url;
            }
        }
        return null;
    }

    /**
     * Extract all coordinates from itinerary for map generation
     */
    extractRouteCoordinates(itinerary: QuestCarouselData['itinerary']): { lat: number; lng: number }[] {
        const coordinates: { lat: number; lng: number }[] = [];

        for (const day of itinerary.days) {
            for (const activity of day.activities) {
                if (activity.location?.coordinates) {
                    coordinates.push(activity.location.coordinates);
                }
            }
        }

        return coordinates;
    }

    /**
     * Generate static map URL using Google Static Maps API
     */
    generateStaticMapUrl(coordinates: { lat: number; lng: number }[], apiKey?: string): string {
        if (coordinates.length === 0) return '';

        // Create markers for each point
        const markers = coordinates.map((coord, idx) =>
            `markers=color:orange%7Clabel:${idx + 1}%7C${coord.lat},${coord.lng}`
        ).join('&');

        // Create path for route line
        const pathPoints = coordinates.map(c => `${c.lat},${c.lng}`).join('|');
        const path = `path=color:0xF97316%7Cweight:4%7C${pathPoints}`;

        // Calculate center and zoom
        const center = this.calculateMapCenter(coordinates);

        const baseUrl = 'https://maps.googleapis.com/maps/api/staticmap';
        const params = [
            `center=${center.lat},${center.lng}`,
            'zoom=8',
            `size=${this.SLIDE_WIDTH}x800`,
            'maptype=roadmap',
            'style=feature:all|element:geometry|color:0x1F2937',
            'style=feature:water|element:geometry|color:0x374151',
            markers,
            path
        ];

        if (apiKey) {
            params.push(`key=${apiKey}`);
        }

        return `${baseUrl}?${params.join('&')}`;
    }

    /**
     * Calculate center point of coordinates
     */
    private calculateMapCenter(coordinates: { lat: number; lng: number }[]): { lat: number; lng: number } {
        if (coordinates.length === 0) return { lat: 0, lng: 0 };

        const sum = coordinates.reduce(
            (acc, coord) => ({ lat: acc.lat + coord.lat, lng: acc.lng + coord.lng }),
            { lat: 0, lng: 0 }
        );

        return {
            lat: sum.lat / coordinates.length,
            lng: sum.lng / coordinates.length
        };
    }

    /**
     * Truncate text to fit within bounds
     */
    truncateText(text: string, maxLength: number): string {
        if (text.length <= maxLength) return text;
        return text.slice(0, maxLength - 3) + '...';
    }

    /**
     * Format date for display
     */
    formatDate(dateString: string): string {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    /**
     * Get bullet points for activities (max 5)
     */
    getActivityBullets(activities: QuestCarouselData['itinerary']['days'][0]['activities']): string[] {
        return activities
            .slice(0, 5)
            .filter(a => !a.title?.toLowerCase().includes('travel from'))
            .map(a => this.truncateText(a.title, 40));
    }
}

export const carouselService = new CarouselService();
export default carouselService;
