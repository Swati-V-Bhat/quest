'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getPostById, unsavePost, savePost, addComment } from '@/lib/postService';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { getCurrentUserData } from '@/lib/authService';
import PostCard from '@/components/Home/PostCard';
import { QuestPostCard } from '@/components/Home/QuestPostCard';
import NavBar from '@/components/LeftSideNav';
import Header from '@/components/phoneComponents/header';
import Footer from '@/components/phoneComponents/Footer';
import useResponsive from '@/hooks/useResponsive';
import { doc, updateDoc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import { User as UserType } from '@/app/types/index';

interface PostClientProps {
    postId: string;
}

export default function PostClient({ postId }: PostClientProps) {
    const router = useRouter();
    const isDesktop = useResponsive(1024); // NavBar usually takes over at lg (1024px)
    const [post, setPost] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<UserType | null>(null);
    const [userData, setUserData] = useState<any>(null);

    useEffect(() => {
        const fetchPost = async (currentUserInfo: any) => {
            try {
                if (postId) {
                    const fetchedPost = await getPostById(postId);
                    if (fetchedPost) {
                        setPost({
                            ...fetchedPost,
                            isSaved: currentUserInfo?.savedPosts?.includes(postId) || false
                        });
                    }
                }
            } catch (error) {
                console.error("Error fetching post data:", error);
            } finally {
                setLoading(false);
            }
        };

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                const u = {
                    uid: currentUser.uid,
                    displayName: currentUser.displayName ?? undefined,
                    email: currentUser.email ?? undefined,
                    photoURL: currentUser.photoURL ?? undefined
                };
                setUser(u);

                try {
                    const userDetails = await getCurrentUserData();
                    setUserData(userDetails);
                    await fetchPost(userDetails);
                } catch (error) {
                    console.error("Error fetching user data:", error);
                    await fetchPost(null);
                }
            } else {
                setUser(null);
                setUserData(null);
                await fetchPost(null);
            }
        });

        return () => unsubscribe();
    }, [postId]);

    const handleLike = async () => {
        if (!user?.uid || !post) return;
        try {
            const isLiked = post.stats?.likedBy?.includes(user.uid) || post.likedBy?.includes(user.uid);
            const postRef = doc(db, 'posts', post.id);

            // Optimistic update
            setPost((prev: any) => ({
                ...prev,
                stats: {
                    ...prev.stats,
                    likes: Math.max(0, (prev.stats?.likes || prev.likeCount || 0) + (isLiked ? -1 : 1)),
                    likedBy: isLiked
                        ? (prev.stats?.likedBy || prev.likedBy || []).filter((uid: string) => uid !== user.uid)
                        : [...(prev.stats?.likedBy || prev.likedBy || []), user.uid]
                },
                likedBy: isLiked
                    ? (prev.likedBy || []).filter((uid: string) => uid !== user.uid)
                    : [...(prev.likedBy || []), user.uid],
                likeCount: Math.max(0, (prev.likeCount || 0) + (isLiked ? -1 : 1))
            }));

            if (isLiked) {
                await updateDoc(postRef, {
                    likedBy: arrayRemove(user.uid),
                    likeCount: increment(-1)
                });
            } else {
                await updateDoc(postRef, {
                    likedBy: arrayUnion(user.uid),
                    likeCount: increment(1)
                });
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleSave = async () => {
        if (!user?.uid || !post) return;
        try {
            const isSaved = post.isSaved;
            setPost((p: any) => ({ ...p, isSaved: !isSaved }));

            if (isSaved) {
                await unsavePost(post.id, user.uid);
            } else {
                await savePost(post.id, user.uid);
            }
        } catch (error) {
            console.error(error);
            setPost((p: any) => ({ ...p, isSaved: post.isSaved })); // Revert on err
        }
    };

    const handleShare = async () => {
        const url = `${window.location.origin}/post/${post.id}`;
        if (navigator.share) {
            navigator.share({
                title: 'Check out this post on OnQuest',
                url: url,
            }).catch(console.error);
        } else {
            navigator.clipboard.writeText(url);
            alert('Link copied to clipboard!');
        }
    };

    const handleCommentSubmit = async (text: string) => {
        if (!user?.uid || !post) return;
        try {
            await addComment(post.id, {
                uid: user.uid,
                userName: user.displayName || 'Anonymous',
                userProfilePic: user.photoURL || '',
                text: text.trim(),
                createdAt: new Date()
            }, text);

            setPost((p: any) => ({
                ...p,
                stats: {
                    ...p.stats,
                    comments: (p.stats?.comments || p.commentCount || 0) + 1
                },
                commentCount: (p.commentCount || 0) + 1
            }));
        } catch (error) {
            console.error(error);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-[#121212] flex-col w-full">
                <div className="w-16 h-16 border-4 border-[#EA6100] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!post) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-[#121212] flex-col w-full">
                <h2 className="text-white text-xl">Post not found</h2>
                <button
                    onClick={() => router.push('/feed')}
                    className="mt-4 bg-[#EA6100] text-black px-4 py-2 rounded font-medium hover:bg-[#ff7a1a] transition-colors"
                >
                    Go to Feed
                </button>
            </div>
        );
    }

    const content = (
        <div className="w-full max-w-2xl mx-auto pt-6 px-4 pb-20 md:pb-6">
            <button
                onClick={() => router.back()}
                className="mb-6 text-gray-400 hover:text-white flex items-center gap-2 transition-colors font-medium"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                Back
            </button>

            {post.postType === 'quest_completion' ? (
                <QuestPostCard
                    post={post}
                    currentUser={user as any}
                    onLike={handleLike}
                    onComment={() => {
                        // QuestPostCard doesn't take comment text directly, it might need a modal or different handling
                        // For now, we fallback to prompting or just logging
                        const text = window.prompt("Enter your comment:");
                        if (text) handleCommentSubmit(text);
                    }}
                    onSave={handleSave}
                    onShare={handleShare}
                    onMenu={() => { }}
                />
            ) : (
                <PostCard
                    post={post}
                    currentUser={user as any}
                    onLike={handleLike}
                    onComment={handleCommentSubmit}
                    onSave={handleSave}
                    onShare={handleShare}
                    onMenuClick={() => { }}
                />
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-[#121212] flex flex-col w-full">
            <div className="hidden lg:block">
                <NavBar user={user} onSignOut={() => auth.signOut()} />
            </div>
            <div className="lg:hidden">
                <Header />
            </div>

            <main className="flex-1 lg:ml-[280px] w-full lg:w-[calc(100%-280px)] overflow-y-auto mt-[60px] lg:mt-0">
                {content}
            </main>

            <div className="lg:hidden">
                <Footer />
            </div>
        </div>
    );
}
