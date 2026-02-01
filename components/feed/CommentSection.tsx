'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { batchGetUserProfiles } from '@/lib/userProfileService';
import { useRouter } from 'next/navigation';

interface Comment {
    id: string;
    text: string;
    createdAt: any;
    author: {
        name: string;
        avatar: string;
        uid: string;
    };
    isPending?: boolean;
}

interface CommentSectionProps {
    postId: string;
    currentUser: any;
    initialCommentCount?: number;
    onCommentAdded?: () => void;
}

export default function CommentSection({
    postId,
    currentUser,
    initialCommentCount = 0,
    onCommentAdded
}: CommentSectionProps) {
    const router = useRouter();
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [showComments, setShowComments] = useState(false);

    /**
     * Load comments with BATCH user fetching (eliminates N+1 query)
     */
    const loadComments = async () => {
        if (!postId) return;

        setLoading(true);
        try {
            const commentsRef = collection(db, 'posts', postId, 'comments');
            const commentsQuery = query(commentsRef, orderBy('createdAt', 'desc'));
            const commentsSnapshot = await getDocs(commentsQuery);

            // Collect all comment data first
            const commentsData = commentsSnapshot.docs.map(commentDoc => ({
                id: commentDoc.id,
                ...commentDoc.data()
            }));

            // Batch fetch all comment authors (20x faster!)
            const authorIds = [...new Set(commentsData.map((c: any) => c.uid).filter(Boolean))];
            let authorsMap = new Map();

            if (authorIds.length > 0) {
                authorsMap = await batchGetUserProfiles(authorIds);
            }

            // Map comments with author data
            const enrichedComments = commentsData.map((commentData: any) => {
                const author = authorsMap.get(commentData.uid);
                return {
                    id: commentData.id,
                    text: commentData.text || '',
                    createdAt: commentData.createdAt,
                    author: {
                        name: author?.name || commentData.userName || 'Anonymous',
                        avatar: author?.photoURL || commentData.userProfilePic || '/default-avatar.png',
                        uid: commentData.uid
                    }
                };
            });

            setComments(enrichedComments);
        } catch (error) {
            console.error('Error loading comments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleComments = () => {
        if (!showComments) {
            loadComments();
        }
        setShowComments(!showComments);
    };

    const handleSubmitComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim() || !currentUser) return;

        const tempComment: Comment = {
            id: `temp-${Date.now()}`,
            text: commentText.trim(),
            createdAt: new Date(),
            author: {
                name: currentUser.displayName || 'Anonymous',
                avatar: currentUser.photoURL || '/default-avatar.png',
                uid: currentUser.uid
            },
            isPending: true
        };

        // Optimistic update - show immediately
        setComments(prev => [tempComment, ...prev]);
        const textToSubmit = commentText.trim();
        setCommentText('');

        try {
            // Import and call the comment function
            const { addComment } = await import('@/lib/postService');
            await addComment(postId, {
                uid: currentUser.uid,
                userName: currentUser.displayName || 'Anonymous',
                userProfilePic: currentUser.photoURL || '',
                text: textToSubmit
            });

            // Reload to get real comment
            setTimeout(() => loadComments(), 500);
            onCommentAdded?.();
        } catch (error) {
            console.error('Comment failed:', error);
            // Remove failed comment and restore text
            setComments(prev => prev.filter(c => c.id !== tempComment.id));
            setCommentText(textToSubmit);
        }
    };

    const formatTimeAgo = (timestamp: any) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <div className="mt-3 border-t border-gray-700 pt-3">
            <button
                onClick={handleToggleComments}
                className="text-gray-400 hover:text-[#F7CEB0] text-sm font-medium mb-3 transition-colors"
            >
                {showComments ? 'Hide' : 'View'} Comments ({initialCommentCount})
            </button>

            {showComments && (
                <div className="space-y-3">
                    {/* Comment Form */}
                    <form onSubmit={handleSubmitComment} className="flex items-start gap-3">
                        <img
                            src={currentUser?.photoURL || '/default-avatar.png'}
                            alt="You"
                            className="w-8 h-8 rounded-full object-cover"
                        />
                        <div className="flex-1">
                            <textarea
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder="Write a comment..."
                                className="w-full bg-gray-800 text-white rounded-lg p-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#F7CEB0]"
                                rows={2}
                            />
                            <button
                                type="submit"
                                disabled={!commentText.trim()}
                                className="mt-2 px-4 py-1 bg-[#F7CEB0] text-gray-900 rounded-lg text-sm font-medium hover:bg-[#e5bca0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Comment
                            </button>
                        </div>
                    </form>

                    {/* Comments List */}
                    {loading && comments.length === 0 ? (
                        <div className="text-center text-gray-400 text-sm py-4">Loading comments...</div>
                    ) : comments.length === 0 ? (
                        <div className="text-center text-gray-400 text-sm py-4">No comments yet</div>
                    ) : (
                        <div className="space-y-2">
                            {comments.map((comment) => (
                                <div
                                    key={comment.id}
                                    className={`flex items-start gap-3 p-2 rounded-lg ${comment.isPending ? 'opacity-60 bg-gray-800/50' : ''
                                        }`}
                                >
                                    <div className="relative">
                                        <img
                                            src={comment.author.avatar}
                                            alt={comment.author.name}
                                            className="w-8 h-8 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                                            onClick={() => !comment.isPending && router.push(`/profile/${comment.author.uid}`)}
                                        />
                                        {comment.isPending && (
                                            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="bg-gray-800 rounded-lg p-2">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4
                                                    className="text-xs font-medium text-white cursor-pointer hover:underline"
                                                    onClick={() => !comment.isPending && router.push(`/profile/${comment.author.uid}`)}
                                                >
                                                    {comment.author.name}
                                                </h4>
                                                <span className="text-gray-400 text-xs">·</span>
                                                <span className="text-gray-400 text-xs">
                                                    {formatTimeAgo(comment.createdAt)}
                                                </span>
                                            </div>
                                            <p className="text-white text-sm">{comment.text}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
