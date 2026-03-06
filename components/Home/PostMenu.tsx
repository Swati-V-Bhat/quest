'use client';

import React from 'react';
import { X, Flag, Trash2, Edit, Copy, Share2 } from 'lucide-react';
import { Post, User as UserType } from '@/app/types/index';
import { deletePost, reportPost } from '@/lib/postService';

interface PostMenuProps {
  post: Post;
  user: UserType | null;
  onClose: () => void;
  onDelete: () => void;
  onEdit?: () => void;
  onShareClick?: () => void;
}

const PostMenu: React.FC<PostMenuProps> = ({ post, user, onClose, onDelete, onEdit, onShareClick }) => {
  console.log('PostMenu debug:', {
    userUid: user?.uid,
    postAuthorId: post.authorId,
    isOwnPost: user?.uid === post.authorId
  });
  const isOwnPost = user?.uid === post.authorId;

  const handleDelete = async () => {
    if (!user?.uid) return;

    const confirmed = window.confirm('Are you sure you want to delete this post?');
    if (confirmed) {
      try {
        await deletePost(post.id, user.uid);
        onDelete();
      } catch (error) {
        console.error('Error deleting post:', error);
        alert('Failed to delete post');
      }
    }
  };

  const handleReport = async () => {
    if (!user?.uid) return;

    const reason = window.prompt('Why are you reporting this post?');
    if (reason) {
      try {
        await reportPost(post.id, user.uid, reason);
        alert('Post reported successfully');
        onClose();
      } catch (error) {
        console.error('Error reporting post:', error);
        alert('Failed to report post');
      }
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/post/${post.id}`;
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard!');
    onClose();
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${post.id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${post.userName}'s post`,
          text: post.caption || 'Check out this post!',
          url: url,
        });
        onClose();
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      handleCopyLink();
    }
  };


  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div
        className="bg-gray-900 w-full md:w-96 md:rounded-xl rounded-t-xl overflow-hidden shadow-2xl border border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Mobile only */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-800">
          <h3 className="text-white font-semibold">Post Options</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu Items */}
        <div className="divide-y divide-gray-800">
          {isOwnPost ? (
            <>
              <button
                onClick={() => {
                  onEdit?.();
                  onClose();
                }}
                className="w-full px-4 py-4 flex items-center gap-3 hover:bg-gray-800 transition-colors text-white"
              >
                <Edit className="w-5 h-5" />
                <span className="font-medium">Edit Post</span>
              </button>
              <button
                onClick={handleDelete}
                className="w-full px-4 py-4 flex items-center gap-3 hover:bg-gray-800 transition-colors text-red-500"
              >
                <Trash2 className="w-5 h-5" />
                <span className="font-medium">Delete Post</span>
              </button>
            </>
          ) : (
            <button
              onClick={handleReport}
              className="w-full px-4 py-4 flex items-center gap-3 hover:bg-gray-800 transition-colors text-red-500"
            >
              <Flag className="w-5 h-5" />
              <span className="font-medium">Report Post</span>
            </button>
          )}

          <button
            onClick={() => {
              onClose();
              onShareClick?.();
            }}
            className="w-full px-4 py-4 flex items-center gap-3 hover:bg-gray-800 transition-colors text-white"
          >
            <Share2 className="w-5 h-5" />
            <span className="font-medium">Share Post</span>
          </button>

          <button
            onClick={handleCopyLink}
            className="w-full px-4 py-4 flex items-center gap-3 hover:bg-gray-800 transition-colors text-white"
          >
            <Copy className="w-5 h-5" />
            <span className="font-medium">Copy Link</span>
          </button>

          <button
            onClick={onClose}
            className="w-full px-4 py-4 flex items-center gap-3 hover:bg-gray-800 transition-colors text-gray-400"
          >
            <X className="w-5 h-5" />
            <span className="font-medium">Cancel</span>
          </button>
        </div>
      </div>
    </div>
  );

};

export default PostMenu;