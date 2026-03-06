'use client';

import React, { useState, useEffect } from 'react';
import { X, Copy, Link, Check, MessageCircle, Send } from 'lucide-react';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import chatService from '@/lib/chatService';

interface ShareModalProps {
  post: {
    id: string;
    userName?: string;
    userProfilePic?: string;
    caption?: string;
    text?: string;
    location?: string | null;
    questContext?: {
      questId?: string;
      questTitle?: string;
    };
  };
  onClose: () => void;
}

interface UserResult {
  uid: string;
  displayName: string;
  photoURL: string;
  username?: string;
}

// WhatsApp icon SVG
const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

// X (Twitter) icon SVG
const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.912-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

// Telegram icon SVG
const TelegramIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);

const ShareModal: React.FC<ShareModalProps> = ({ post, onClose }) => {
  const [user] = useAuthState(auth);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [recentChats, setRecentChats] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentUsers, setSentUsers] = useState<Set<string>>(new Set());

  // Determine whether this is a post or quest link
  const isQuest = !!post.questContext?.questId;
  const shareUrl = typeof window !== 'undefined'
    ? isQuest
      ? `${window.location.origin}/quest/${post.questContext!.questId}`
      : `${window.location.origin}/post/${post.id}`
    : '';
  const shareTitle = isQuest
    ? (post.questContext?.questTitle || 'Amazing Quest')
    : (post.caption || post.text || 'Check out this post!');
  const shareText = isQuest
    ? `Check out this Quest: ${shareTitle}`
    : `${post.userName ? `@${post.userName}: ` : ''}${shareTitle}`;

  useEffect(() => {
    fetchRecentChats();
    setSearchQuery('');
    setSearchResults([]);
    setSentUsers(new Set());
  }, [post.id]);

  const fetchRecentChats = async () => {
    if (!user?.uid) return;
    try {
      const chatsRef = collection(db, 'chats');
      const q = query(
        chatsRef,
        where('members', 'array-contains', user.uid),
        orderBy('updatedAt', 'desc'),
        limit(10)
      );
      const snapshot = await getDocs(q);
      const recents: UserResult[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.type === 'one_on_one' && data.memberInfo) {
          const otherId = data.members.find((id: string) => id !== user.uid);
          if (otherId && data.memberInfo[otherId]) {
            recents.push({
              uid: otherId,
              displayName: data.memberInfo[otherId].name || 'User',
              photoURL: data.memberInfo[otherId].photoURL || '',
            });
          }
        }
      });
      setRecentChats(recents);
    } catch (e) {
      // silently fail
    }
  };

  // Debounced user search
  useEffect(() => {
    const run = async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }
      setSearching(true);
      try {
        const usersRef = collection(db, 'users');
        const q = query(
          usersRef,
          where('displayName', '>=', searchQuery),
          where('displayName', '<=', searchQuery + '\uf8ff'),
          limit(5)
        );
        const snapshot = await getDocs(q);
        const results: UserResult[] = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          if (doc.id !== user?.uid) {
            results.push({
              uid: doc.id,
              displayName: data.displayName || 'Unknown',
              photoURL: data.photoURL || '',
              username: data.username,
            });
          }
        });
        setSearchResults(results);
      } catch (e) {
        // silently fail
      } finally {
        setSearching(false);
      }
    };
    const t = setTimeout(run, 400);
    return () => clearTimeout(t);
  }, [searchQuery, user?.uid]);

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sendToUser = async (target: UserResult) => {
    if (!user?.uid) return;
    setSending(true);
    try {
      const chatId = await chatService.getOrCreateOneOnOneChat(
        { uid: user.uid, name: user.displayName || 'User', photoURL: user.photoURL || '' },
        { uid: target.uid, name: target.displayName, photoURL: target.photoURL }
      );
      await chatService.sendMessage(chatId, {
        uid: user.uid,
        text: `${shareText}\n${shareUrl}`,
        authorName: user.displayName || 'User',
        authorPhoto: user.photoURL || '',
      });
      setSentUsers(prev => new Set(prev).add(target.uid));
    } catch (e) {
      console.error('Failed to send', e);
    } finally {
      setSending(false);
    }
  };

  const socialButtons = [
    {
      label: 'WhatsApp',
      color: 'bg-[#25D366]/10 text-[#25D366]',
      href: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`,
      icon: <WhatsAppIcon />,
    },
    {
      label: 'X / Twitter',
      color: 'bg-[#000]/20 text-white',
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      icon: <XIcon />,
    },
    {
      label: 'Telegram',
      color: 'bg-[#2AABEE]/10 text-[#2AABEE]',
      href: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
      icon: <TelegramIcon />,
    },
  ];

  return (
    /* Bottom sheet on mobile, centred card on md+ */
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div
        className="bg-gray-900 w-full md:w-[480px] md:rounded-2xl rounded-t-2xl overflow-hidden border border-gray-800 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* drag pill */}
        <div className="flex justify-center pt-3 md:hidden">
          <div className="w-10 h-1 bg-gray-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h3 className="text-white font-semibold text-lg">Share</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">

          {/* Copy link bar */}
          <div className="flex items-center gap-2 bg-gray-800 rounded-xl px-4 py-3">
            <p className="flex-1 text-gray-300 text-sm truncate">{shareUrl}</p>
            <button
              onClick={copyLink}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${copied ? 'bg-green-500/20 text-green-400' : 'bg-orange-500 text-white hover:bg-orange-600'
                }`}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          {/* Social grid */}
          <div className="grid grid-cols-3 gap-3">
            {socialButtons.map(btn => (
              <a
                key={btn.label}
                href={btn.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 group"
              >
                <div className={`w-14 h-14 ${btn.color} rounded-2xl flex items-center justify-center group-hover:opacity-80 transition-opacity`}>
                  {btn.icon}
                </div>
                <span className="text-xs text-gray-400 text-center leading-tight">{btn.label}</span>
              </a>
            ))}
          </div>

          {/* Recent contacts */}
          {recentChats.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Recent Chats</h4>
              <div className="flex gap-4 overflow-x-auto pb-1">
                {recentChats.map(contact => (
                  <button
                    key={contact.uid}
                    onClick={() => sendToUser(contact)}
                    disabled={sentUsers.has(contact.uid) || sending}
                    className="flex flex-col items-center gap-1.5 min-w-[56px] group"
                  >
                    <div className="relative">
                      <img
                        src={contact.photoURL || '/default-avatar.png'}
                        alt={contact.displayName}
                        className="w-12 h-12 rounded-full object-cover border-2 border-transparent group-hover:border-orange-500 transition-all"
                      />
                      {sentUsers.has(contact.uid) && (
                        <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                          <Check size={14} className="text-green-400" />
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 truncate w-full text-center">
                      {contact.displayName.split(' ')[0]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Send to user search */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Send to User</h4>
            <div className="relative mb-3">
              <input
                type="text"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-gray-800 text-white pl-4 pr-4 py-2.5 rounded-xl border border-gray-700 focus:border-orange-500 focus:outline-none text-sm"
              />
            </div>

            {searching && (
              <p className="text-center text-gray-500 text-sm py-3">Searching…</p>
            )}

            {!searching && searchResults.length > 0 && (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {searchResults.map(result => (
                  <div key={result.uid} className="flex items-center justify-between px-3 py-2 hover:bg-gray-800 rounded-xl transition-colors">
                    <div className="flex items-center gap-3">
                      <img
                        src={result.photoURL || '/default-avatar.png'}
                        alt={result.displayName}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div>
                        <p className="text-white text-sm font-medium">{result.displayName}</p>
                        {result.username && <p className="text-gray-500 text-xs">@{result.username}</p>}
                      </div>
                    </div>
                    <button
                      onClick={() => sendToUser(result)}
                      disabled={sentUsers.has(result.uid) || sending}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${sentUsers.has(result.uid)
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-orange-500 hover:bg-orange-600 text-white'
                        }`}
                    >
                      {sentUsers.has(result.uid) ? (
                        <><Check size={12} /> Sent</>
                      ) : (
                        <><Send size={12} /> Send</>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
              <p className="text-center text-gray-500 text-sm py-3">No users found</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;