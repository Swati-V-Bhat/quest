import { MetadataRoute } from 'next';
import questService from '@/lib/questService';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://onquest.in';

    // Static routes
    const routes = [
        '',
        '/explore',
        '/login',
    ].map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: 1,
    }));

    // Dynamic routes (Public Quests)
    const questIds = await questService.getAllPublicQuestIds();

    const questRoutes = questIds.map((id) => ({
        url: `${baseUrl}/quest/${id}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
    }));

    return [...routes, ...questRoutes];
}
