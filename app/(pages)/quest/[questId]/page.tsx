import { Metadata } from 'next';
import questService from '@/lib/questService';
import QuestClient from './QuestClient';

// Props type for the page - Next.js 15 requires params to be a Promise
type Props = {
  params: Promise<{ questId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

// Generate Metadata for SEO
export async function generateMetadata(
  props: Props,
): Promise<Metadata> {
  const params = await props.params;
  const questId = params.questId;
  const quest = await questService.getQuestById(questId);

  if (!quest) {
    return {
      title: 'Quest Not Found',
    };
  }

  const title = quest.title || `Quest to ${quest.destination}`;
  const description = quest.description || `Check out this amazing quest to ${quest.destination} on OnQuest!`;
  const images = quest.coverImageUrl ? [quest.coverImageUrl] : [];

  return {
    title: title,
    description: description,
    openGraph: {
      title: title,
      description: description,
      images: images,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: description,
      images: images,
    },
  };
}

// Server Component
export default async function QuestPage(props: Props) {
  const params = await props.params;
  const questId = params.questId;
  const quest = await questService.getQuestById(questId);

  // Prepare JSON-LD
  let jsonLd = null;
  if (quest) {
    jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'TouristAttraction', // Or 'TravelAction', 'Course', etc. depending on context. TouristAttraction is generic enough for destinations.
      name: quest.title || quest.destination,
      description: quest.description || `Explore ${quest.destination}`,
      image: quest.coverImageUrl ? [quest.coverImageUrl] : [],
      url: `https://onquest.in/quest/${questId}`,
      location: {
        '@type': 'Place',
        name: quest.destination,
      },
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
      },
    };
  }

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <QuestClient />
    </>
  );
}