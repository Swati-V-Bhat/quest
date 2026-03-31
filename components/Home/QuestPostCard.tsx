// File: components/Feed/QuestPostCard.tsx
// YouTube Shorts style Quest post for feed - WITH FOLLOW FUNCTIONALITY

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, MessageCircle, Share2, Bookmark, MoreVertical, HeartPulse, UserPlus, UserCheck } from 'lucide-react';
import { FaPlus, FaHeart, FaRegCommentDots, FaShareSquare, FaBookmark, FaRegBookmark } from 'react-icons/fa';

interface QuestPostCardProps {
  post: {
    id: string;
    authorId?: string;
    uid?: string;
    userName: string;
    userProfilePic: string;
    text: string; // Quest description
    photoUrl: string; // Cover image
    createdAt: any;
    likeCount: number;
    commentCount: number;
    shareCount: number;
    likedBy: string[];
    questContext?: {
      questId: string;
      questTitle: string;
      description: string;
      type?: string; // 'ai_generated' for AI quests
      isAiGenerated?: boolean;
    };
    username?: string; // Added username field
  };
  currentUser: any;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onSave: () => void;
  onMenu: (e: React.MouseEvent<HTMLButtonElement>) => void;
  isSaved?: boolean;
  followingList?: string[];
  onFollow?: (userId: string) => void;
}

export const QuestPostCard = ({
  post,
  currentUser,
  onLike,
  onComment,
  onShare,
  onSave,
  onMenu,
  isSaved = false,
  followingList = [],
  onFollow
}: QuestPostCardProps) => {
  const router = useRouter();
  const isLiked = post.likedBy?.includes(currentUser?.uid);

  // 🔥 FOLLOW FUNCTIONALITY
  const computedAuthorId = post.authorId || post.uid;
  const isFollowingUser = followingList?.includes(computedAuthorId || '') || false;
  const isOwnPost = currentUser?.uid === computedAuthorId;

  const handleQuestClick = () => {
    if (post.questContext?.questId) {
      router.push(`/quest/${post.questContext.questId}`);
    }
  };

  const handleFollowClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!currentUser?.uid || !computedAuthorId || computedAuthorId === currentUser.uid) {
      return;
    }

    if (onFollow) {
      onFollow(computedAuthorId);
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <article className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mb-4">
      {/* Post Header - WITH FOLLOW BUTTON */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3 flex-1">
          <img
            src={post.userProfilePic || '/default-avatar.png'}
            alt={post.userName}
            className="w-10 h-10 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => router.push(`/profile/${computedAuthorId}`)}
          />
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <h3
                className="text-white font-medium text-sm cursor-pointer hover:underline"
                onClick={() => router.push(`/profile/${computedAuthorId}`)}
              >
                @{post.username || post.userName.toLowerCase().replace(/\s+/g, '')}
              </h3>
            </div>
            <p className="text-gray-400 text-xs">Shared a Quest · {formatTime(post.createdAt)}</p>
          </div>
        </div>

        {/* 🔥 FOLLOW BUTTON + MENU */}
        <div className="flex items-center gap-2">
          {!isOwnPost && onFollow && (
            <button
              onClick={handleFollowClick}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${isFollowingUser
                ? 'bg-gray-700 text-white hover:bg-gray-600'
                : 'bg-[#F7CEB0] text-black hover:bg-[#f5c094]'
                }`}
            >
              {isFollowingUser ? (
                <div className="flex items-center gap-1">
                  <UserCheck size={16} />
                  <span>Following</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <UserPlus size={16} />
                  <span>Follow</span>
                </div>
              )}
            </button>
          )}

          <button
            onClick={onMenu}
            className="p-2 hover:bg-gray-800 rounded-full transition-colors"
          >
            <MoreVertical size={20} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* Quest Description */}
      {post.text && (
        <div className="px-4 pb-3">
          <p className="text-white text-sm">{post.text}</p>
        </div>
      )}

      {/* YouTube Shorts Style Image with Quest Title */}
      <div
        className="relative cursor-pointer group"
        onClick={handleQuestClick}
        style={{ height: '60vh', minHeight: '400px' }}
      >
        <img
          src={post.photoUrl || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800'}
          alt={post.questContext?.questTitle || 'Quest'}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800';
          }}
        />

        {/* Gradient Overlay - YouTube Shorts Style */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-80" />

        {/* AI Generated Badge */}
        {post.questContext?.isAiGenerated && (
          <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md border border-white/20 px-3 py-1 rounded-full flex items-center gap-2 z-10">
            <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            <span className="text-xs font-medium text-white">AI Generated</span>
          </div>
        )}

        {/* Quest Tag - Gen Z Style with AI TRIP variant */}
        <div className="absolute top-4 right-4 z-10">
          <div className="relative group">
            {post.questContext?.type === 'ai_generated' || post.questContext?.isAiGenerated ? (
              <>
                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
                <div className="relative px-4 py-1.5 bg-black/50 backdrop-blur-md rounded-full border border-purple-500/50 flex items-center gap-2">
                  <span className="text-base animate-pulse">✨</span>
                  <span className="text-xs font-bold text-white tracking-widest uppercase drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">
                    AI TRIP
                  </span>
                </div>
              </>
            ) : (
              <div className="px-3 py-1.5 bg-orange-500 rounded-full flex items-center gap-2">
                <span className="text-xs font-bold text-white tracking-widest uppercase">
                  QUEST
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Quest Title at Bottom - YouTube Shorts Style */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-end justify-between">
            <div className="flex-1">
              <h2 className="text-white font-bold text-xl md:text-2xl drop-shadow-lg">
                {post.questContext?.questTitle || 'Untitled Quest'}
              </h2>
              {post.questContext?.description && (
                <p className="text-gray-200 text-sm mt-1 drop-shadow-md line-clamp-2">
                  {post.questContext.description}
                </p>
              )}
            </div>

            {/* View Quest Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleQuestClick();
              }}
              className="ml-3 bg-white text-black px-4 py-2 rounded-full font-semibold text-sm hover:bg-gray-200 transition-colors shadow-lg"
            >
              View Quest
            </button>
          </div>
        </div>

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity" />
      </div>

      {/* Action Buttons - Same as regular post */}
      <div className="border-t border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={onLike}
              className={`flex items-center gap-2 transition-colors ${isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
                }`}
            >
              <FaHeart size={22} className={isLiked ? 'fill-current' : ''} />
              <span className="text-sm font-medium">{post.likeCount || 0}</span>
            </button>

            <button
              onClick={onComment}
              className="flex items-center gap-2 text-gray-400 hover:text-[#F7CEB0] transition-colors"
            >
              <FaRegCommentDots size={22} />
              <span className="text-sm font-medium">{post.commentCount || 0}</span>
            </button>

            <button
              onClick={onShare}
              className="flex items-center gap-2 text-gray-400 hover:text-[#F7CEB0] transition-colors"
            >
              <FaShareSquare size={22} />
              <span className="text-sm font-medium">{post.shareCount || 0}</span>
            </button>
          </div>

          <button
            onClick={onSave}
            className={`transition-colors ${isSaved ? 'text-[#F7CEB0]' : 'text-gray-400 hover:text-[#F7CEB0]'
              }`}
          >
            {isSaved ? (
              <FaBookmark size={22} className="fill-white" />
            ) : (
              <FaRegBookmark size={22} className="fill-white" />
            )}
          </button>
        </div>
      </div>
    </article>
  );
};

// Mobile version - even more YouTube Shorts style WITH FOLLOW
export const MobileQuestPostCard = ({
  post,
  currentUser,
  onLike,
  onComment,
  onShare,
  onSave,
  onMenu,
  isSaved = false,
  followingList = [],
  onFollow
}: QuestPostCardProps) => {
  const router = useRouter();
  const isLiked = post.likedBy?.includes(currentUser?.uid);

  // 🔥 FOLLOW FUNCTIONALITY
  const computedAuthorId = post.authorId || post.uid;
  const isFollowingUser = followingList?.includes(computedAuthorId || '') || false;
  const isOwnPost = currentUser?.uid === computedAuthorId;

  const handleQuestClick = () => {
    if (post.questContext?.questId) {
      router.push(`/quest/${post.questContext.questId}`);
    }
  };

  const handleFollowClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!currentUser?.uid || !computedAuthorId || computedAuthorId === currentUser.uid) {
      return;
    }

    if (onFollow) {
      onFollow(computedAuthorId);
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <article className="bg-black border-b border-gray-800">
      {/* User Info - WITH FOLLOW BUTTON */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <img
            src={post.userProfilePic || '/default-avatar.png'}
            alt={post.userName}
            className="w-8 h-8 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
            onClick={() => router.push(`/profile/${computedAuthorId}`)}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 truncate">
              <span
                className="text-white font-medium text-sm cursor-pointer hover:underline truncate block"
                onClick={() => router.push(`/profile/${computedAuthorId}`)}
              >
                @{post.username || post.userName.toLowerCase().replace(/\s+/g, '')}
              </span>
            </div>
            <p className="text-gray-400 text-xs truncate mt-0.5">
              Shared a Quest · {formatTime(post.createdAt)}
            </p>
          </div>
        </div>

        {/* 🔥 FOLLOW BUTTON + MENU */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {!isOwnPost && onFollow && (
            <button
              onClick={handleFollowClick}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${isFollowingUser
                ? 'bg-gray-700 text-white'
                : 'bg-[#F7CEB0] text-black'
                }`}
            >
              {isFollowingUser ? 'Following' : 'Follow'}
            </button>
          )}

          <button onClick={onMenu} className="p-2 flex-shrink-0">
            <MoreVertical size={18} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* Description */}
      {post.text && (
        <div className="px-3 pb-2">
          <p className="text-white text-sm">{post.text}</p>
        </div>
      )}

      {/* YouTube Shorts Style Image */}
      <div
        className="relative"
        onClick={handleQuestClick}
        style={{ height: '60vh' }}
      >
        <img
          src={post.photoUrl || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800'}
          alt={post.questContext?.questTitle}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800';
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />

        {/* Quest Tag - Gen Z Style (Mobile) with AI TRIP variant */}
        <div className="absolute top-4 right-4 z-10">
          <div className="relative group">
            {post.questContext?.type === 'ai_generated' || post.questContext?.isAiGenerated ? (
              <>
                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 rounded-full blur opacity-75 animate-pulse"></div>
                <div className="relative px-3 py-1 bg-black/40 backdrop-blur-md rounded-full border border-purple-500/60 flex items-center gap-1.5">
                  <span className="text-sm animate-pulse">✨</span>
                  <span className="text-[10px] font-bold text-white tracking-widest uppercase">
                    AI TRIP
                  </span>
                </div>
              </>
            ) : (
              <div className="px-2.5 py-1 bg-orange-500 rounded-full flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-white tracking-widest uppercase">
                  QUEST
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Quest Title Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h2 className="text-white font-bold text-xl drop-shadow-lg mb-1">
            {post.questContext?.questTitle || 'Untitled Quest'}
          </h2>
          {post.questContext?.description && (
            <p className="text-gray-200 text-sm drop-shadow-md line-clamp-2 mb-2">
              {post.questContext.description}
            </p>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleQuestClick();
            }}
            className="bg-white text-black px-4 py-2 rounded-full font-semibold text-sm mt-2"
          >
            View Quest
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between p-3 border-t border-gray-800">
        <div className="flex items-center gap-5">
          <button
            onClick={onLike}
            className={`transition-colors ${isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
              }`}
          >
            <div className="flex items-center gap-2">
              <FaHeart size={24} className={isLiked ? 'fill-current' : ''} />
              <span className="text-sm font-medium">{post.likeCount || 0}</span>
            </div>
          </button>
          <button
            onClick={onComment}
            className="flex items-center gap-2 text-gray-400 hover:text-[#F7CEB0] transition-colors"
          >
            <FaRegCommentDots size={24} />
            <span className="text-sm font-medium">{post.commentCount || 0}</span>
          </button>
          <button
            onClick={onShare}
            className="text-gray-400 hover:text-[#F7CEB0] transition-colors"
          >
            <FaShareSquare size={24} />
          </button>
        </div>
        <button
          onClick={onSave}
          className={`transition-colors ${isSaved ? 'text-[#F7CEB0]' : 'text-gray-400 hover:text-[#F7CEB0]'
            }`}
        >
          {isSaved ? (
            <FaBookmark size={24} className="fill-white" />
          ) : (
            <FaRegBookmark size={24} />
          )}
        </button>
      </div>
    </article>
  );
};