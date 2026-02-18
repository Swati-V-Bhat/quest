import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: [
                '/',
                '/explore',
                '/quest/*',
            ],
            disallow: [
                '/api/',
                '/admin/',
                '/account/',
                '/settings/',
                '/*?*', // Block query parameters to prevent duplicate content/crawl traps
            ],
        },
        sitemap: 'https://onquest.in/sitemap.xml',
    };
}
