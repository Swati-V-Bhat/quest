'use client';

import React, { useState } from 'react';
import { MessageCircle, Heart, Bookmark, MoreHorizontal, MapPin, BookmarkCheck } from 'lucide-react';
import { FaHeart } from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import { Post, User as UserType } from '@/app/types/index';

interface MobilePostCardProps {
  post: Post;
  currentUser: UserType;
  onLike: () => void;
  onComment: (text: string) => void;
  onSave: () => void;
  onShare: () => void;
  onMenuClick: () => void;
}

const MobilePostCard: React.FC<MobilePostCardProps> = ({
  post,
  currentUser,
  onLike,
  onComment,
  onSave,
  onShare,
  onMenuClick
}) => {
  const router = useRouter();
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const isLiked = post.likedBy?.includes(currentUser.uid);
  const isSaved = post.isSaved;

  // Derived handle from userName
  const handle = `@${post.userName.toLowerCase().replace(/\s+/g, '')}`;

  const handleSubmitComment = () => {
    if (commentText.trim()) {
      onComment(commentText);
      setCommentText('');
      setShowCommentInput(false);
    }
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';

    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now.getTime() - date.getTime();

      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 7) {
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
      }

      if (days > 0) return `${days}d ago`;
      if (hours > 0) return `${hours}h ago`;
      if (minutes > 0) return `${minutes}m ago`;
      return 'Just now';
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="bg-black border-b border-gray-800 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div
          className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
          onClick={() => router.push(`/profile/${post.authorId}`)}
        >
          <img
            src={post.userProfilePic || '/default-avatar.png'}
            alt={post.userName}
            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
            onError={(e) => {
              e.currentTarget.src = '/default-avatar.png';
            }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 truncate">
              <p className="text-white font-semibold text-sm truncate">{post.userName || 'User'}</p>
              <p className="text-gray-500 text-xs truncate">{handle}</p>
            </div>
            <div className="flex items-center gap-1 text-gray-400 text-xs truncate mt-0.5">
              {post.location && (
                <>
                  <span className="truncate max-w-[150px]">
                    {post.location.length > 25 ? `${post.location.slice(0, 25)}...` : post.location}
                  </span>
                  <span>·</span>
                </>
              )}
              <span className="flex-shrink-0">{formatDate(post.createdAt)}</span>
            </div>
          </div>
        </div>
        <button onClick={onMenuClick} className="text-gray-400 hover:text-white flex-shrink-0 ml-2">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Image */}
      {post.imageUrls && (
        <div className="w-full aspect-square bg-gray-900 relative">
          {imageLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-[#F7CEB0] border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}

          {!imageError ? (
            <img
              src={post.imageUrls}
              alt="Post content"
              onClick={() => router.push(`/post/${post.id}`)}
              className={`w-full h-full object-cover cursor-pointer ${imageLoading ? 'opacity-0' : 'opacity-100'} transition-opacity`}
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageError(true);
                setImageLoading(false);
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-800">
              <div className="text-center text-gray-500">
                <p className="text-sm">Image unavailable</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="px-4 pt-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <button
              onClick={onLike}
              className="hover:opacity-70 transition-opacity"
            >
              <FaHeart
                className={`w-6 h-6 ${isLiked ? 'fill-[#EA6100] text-[#EA6100]' : 'text-white'}`}
              />
            </button>
            <button
              onClick={() => setShowCommentInput(!showCommentInput)}
              className="hover:opacity-70 transition-opacity"
            >
              <MessageCircle className="w-6 h-6 text-white" />
            </button>
          </div>
          <button
            onClick={onSave}
            className="hover:opacity-70 transition-opacity"
          >
            {isSaved ? (
              <BookmarkCheck className="w-6 h-6 text-[#F7CEB0]" />
            ) : (
              <Bookmark className="w-6 h-6 text-white" />
            )}
          </button>
        </div>

        {/* Likes Count */}
        {(post.likeCount || 0) > 0 && (
          <p className="text-white font-semibold text-sm mb-2">
            {formatCount(post.likeCount || 0)} {post.likeCount === 1 ? 'like' : 'likes'}
          </p>
        )}

        {/* Caption */}
        {post.caption && (
          <div className="text-sm mb-2">
            <span className="text-white font-semibold mr-2">{post.userName}</span>
            {post.caption.length > 100 && !showFullCaption ? (
              <>
                <span className="text-white">{post.caption.slice(0, 100)}...</span>
                <button
                  onClick={() => setShowFullCaption(true)}
                  className="text-gray-400 ml-1 hover:text-gray-300"
                >
                  more
                </button>
              </>
            ) : (
              <span className="text-white">{post.caption}</span>
            )}
            {/* @ts-ignore - updatedAt might not be in the type definition yet but we added it to the update payload */}
            {post.updatedAt && post.createdAt && post.updatedAt !== post.createdAt && (
              <span className="text-gray-500 text-xs ml-2">(edited)</span>
            )}
          </div>
        )}

        {/* Comments Count */}
        {(post.commentCount || 0) > 0 && (
          <button
            onClick={() => router.push(`/post/${post.id}`)}
            className="text-gray-400 text-sm mb-2 hover:text-gray-300 block"
          >
            View all {post.commentCount} {post.commentCount === 1 ? 'comment' : 'comments'}
          </button>
        )}
      </div>

      {/* Comment Input */}
      {showCommentInput && (
        <div className="px-4 pt-3 border-t border-gray-800 mt-3">
          <div className="flex items-center gap-2">
            <img
              src={currentUser.photoURL || '/default-avatar.png'}
              alt="Your avatar"
              className="w-8 h-8 rounded-full object-cover"
              onError={(e) => {
                e.currentTarget.src = '/default-avatar.png';
              }}
            />
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 bg-transparent border-none outline-none text-white text-sm placeholder-gray-500"
              onKeyPress={(e) => e.key === 'Enter' && handleSubmitComment()}
            />
            {commentText.trim() && (
              <button
                onClick={handleSubmitComment}
                className="text-[#F7CEB0] font-semibold text-sm hover:text-[#EA6100] transition-colors"
              >
                Post
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MobilePostCard;