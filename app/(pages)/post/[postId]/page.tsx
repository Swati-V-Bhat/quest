import { Metadata } from 'next';
import { db } from '@/lib/firebaseAdmin';
import PostClient from './PostClient';

type Props = {
    params: Promise<{ postId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { postId } = await params;

    try {
        const postDoc = await db.collection('posts').doc(postId).get();
        if (postDoc.exists) {
            const post = postDoc.data();
            const imageUrl = post?.photoUrls?.[0] || post?.photoUrl || '/oq_logo.svg';
            const title = post?.userName ? `${post.userName}'s post on OnQuest` : 'Post on OnQuest';
            const description = post?.caption || post?.text || 'Check out this post on OnQuest';

            return {
                title,
                description,
                openGraph: {
                    title,
                    description,
                    images: [imageUrl],
                },
            };
        }
    } catch (error) {
        console.error('Error fetching post metadata:', error);
    }

    return {
        title: 'Post | OnQuest',
        description: 'View this post on OnQuest',
    };
}

export default async function Page({ params }: Props) {
    const { postId } = await params;
    return <PostClient postId={postId} />;
}
