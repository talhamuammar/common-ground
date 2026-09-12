'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { X, UserPlus, UserCheck } from 'lucide-react';
import { API_URL, mediaUrl, ReactionType } from '../lib/api';
import { useAuth } from './auth-provider';
import { useAuthModal } from './auth-modal';
import { UserAvatar } from './user-avatar';
import { VerifiedBadge } from './verified-badge';
import { ReactionIconRenderer } from './premium-reaction-icons';
import { REACTIONS } from './reaction-picker';
import { broadcastFollowChange, SYNC_FOLLOW_EVENT, FollowChangeEvent } from '../lib/realtime';

export interface LikedUserItem {
  userId: number;
  type: string;
  createdAt: string;
  user: {
    id: number;
    username: string;
    fullName: string | null;
    avatarUrl: string | null;
    bio: string | null;
    isVerified?: boolean;
    location?: string | null;
    followersCount?: number;
    isFollowing?: boolean;
  };
}

interface LikesModalProps {
  postId?: number;
  commentId?: number;
  isOpen: boolean;
  onClose: () => void;
}

export function LikesModal({ postId, commentId, isOpen, onClose }: LikesModalProps) {
  const { user, token } = useAuth();
  const { openAuthModal } = useAuthModal();

  const [likes, setLikes] = useState<LikedUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [followingMap, setFollowingMap] = useState<Record<number, boolean>>({});
  const [busyId, setBusyId] = useState<number | null>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Fetch users who reacted to this post or comment
  useEffect(() => {
    if (!isOpen || (!postId && !commentId)) return;
    let active = true;
    setLoading(true);

    const url = commentId
      ? `${API_URL}/posts/comments/${commentId}/likes`
      : `${API_URL}/posts/${postId}/likes`;

    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    fetch(url, { headers })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: LikedUserItem[]) => {
        if (!active) return;
        if (Array.isArray(data)) {
          setLikes(data);
          const initialMap: Record<number, boolean> = {};
          data.forEach((item) => {
            if (item.user && item.user.isFollowing !== undefined) {
              initialMap[item.user.id] = item.user.isFollowing;
            }
          });
          setFollowingMap((prev) => ({ ...initialMap, ...prev }));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, postId, commentId, token]);

  // Keep follow states synced with global events
  useEffect(() => {
    function handleFollowEvent(e: Event) {
      const customEvent = e as CustomEvent<FollowChangeEvent>;
      if (customEvent.detail && customEvent.detail.targetUserId) {
        setFollowingMap((prev) => ({
          ...prev,
          [customEvent.detail.targetUserId]: customEvent.detail.following,
        }));
      }
    }
    window.addEventListener(SYNC_FOLLOW_EVENT, handleFollowEvent);
    return () => window.removeEventListener(SYNC_FOLLOW_EVENT, handleFollowEvent);
  }, []);

  async function handleToggleFollow(targetId: number) {
    if (!token) {
      openAuthModal({
        title: 'Connect with members',
        description: 'Sign up or log in to follow community members.',
      });
      return;
    }

    const isCurrentlyFollowing = Boolean(followingMap[targetId]);
    const nextState = !isCurrentlyFollowing;
    const delta = nextState ? 1 : -1;

    setFollowingMap((prev) => ({ ...prev, [targetId]: nextState }));
    broadcastFollowChange(delta, targetId, nextState);
    setBusyId(targetId);

    try {
      const res = await fetch(`${API_URL}/users/${targetId}/follow`, {
        method: nextState ? 'POST' : 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Follow toggle failed');
    } catch {
      setFollowingMap((prev) => ({ ...prev, [targetId]: isCurrentlyFollowing }));
      broadcastFollowChange(-delta, targetId, isCurrentlyFollowing);
    } finally {
      setBusyId(null);
    }
  }

  // Count by reaction type for filter tabs
  const filterTabs = useMemo(() => {
    const counts: Record<string, number> = {};
    likes.forEach((item) => {
      const t = item.type || 'LIKE';
      counts[t] = (counts[t] || 0) + 1;
    });

    const list: { key: string; label: string; count: number; icon?: React.ReactNode }[] = [
      { key: 'ALL', label: 'All', count: likes.length },
    ];

    REACTIONS.forEach((r) => {
      if (counts[r.key]) {
        list.push({
          key: r.key,
          label: r.label,
          count: counts[r.key],
          icon: <ReactionIconRenderer type={r.key} size={16} />,
        });
      }
    });

    return list;
  }, [likes]);

  const filteredLikes = useMemo(() => {
    if (selectedFilter === 'ALL') return likes;
    return likes.filter((item) => (item.type || 'LIKE') === selectedFilter);
  }, [likes, selectedFilter]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={commentId ? 'Reactions on this comment' : 'Reactions on this post'}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col w-full max-w-md max-h-[85vh] rounded-2xl border border-slate-200/80 dark:border-white/[0.1] bg-white dark:bg-[#0d0d0d] shadow-2xl overflow-hidden animate-in zoom-in-[0.98] duration-150"
      >
        {/* Header */}
        <header className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/[0.08] shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {commentId ? 'Comment Reactions' : 'Reactions'}
            </h2>
            <span className="rounded-full bg-slate-100 dark:bg-white/[0.08] px-2 py-0.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
              {likes.length}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>

        {/* Reaction Filter Tabs */}
        {filterTabs.length > 2 && (
          <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-slate-100 dark:border-white/[0.06] overflow-x-auto [scrollbar-width:none] shrink-0">
            {filterTabs.map((tab) => {
              const active = selectedFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSelectedFilter(tab.key)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap transition-all ${
                    active
                      ? 'bg-accent text-accent-text shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-[#161616] dark:text-slate-400 dark:hover:bg-[#202020]'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  <span className={`text-[10px] opacity-75`}>{tab.count}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* List of People */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 [scrollbar-width:thin]">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="flex items-center gap-3 animate-pulse">
                  <div className="size-10 rounded-full bg-slate-200 dark:bg-[#1c1c1c]" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 w-28 rounded bg-slate-200 dark:bg-[#1c1c1c]" />
                    <div className="h-2.5 w-16 rounded bg-slate-200 dark:bg-[#1c1c1c]" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredLikes.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
              {filteredLikes.map((item) => {
                const targetUser = item.user;
                const reactionType = (item.type as ReactionType) || 'LIKE';
                const isSelf = user?.id === targetUser.id;
                const isFollowing = Boolean(followingMap[targetUser.id] ?? targetUser.isFollowing);
                const isBusy = busyId === targetUser.id;

                return (
                  <div
                    key={`${targetUser.id}-${item.type}`}
                    className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <Link
                      href={`/profile/${encodeURIComponent(targetUser.username)}`}
                      onClick={onClose}
                      className="group flex items-center gap-3 min-w-0"
                    >
                      {/* Avatar with overlaid reaction badge */}
                      <div className="relative shrink-0">
                        <UserAvatar
                          src={mediaUrl(targetUser.avatarUrl)}
                          name={targetUser.fullName || targetUser.username}
                          className="size-10 rounded-full border border-slate-200 dark:border-white/10"
                        />
                        <span className="absolute -bottom-1 -right-1 grid size-6 place-items-center rounded-full bg-white dark:bg-[#141414] ring-2 ring-white dark:ring-[#0d0d0d] shadow-sm">
                          <ReactionIconRenderer type={reactionType} size={15} />
                        </span>
                      </div>

                      <div className="min-w-0">
                        <h4 className="truncate text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-accent-fg flex items-center gap-1">
                          <span>{targetUser.fullName || targetUser.username}</span>
                          {targetUser.isVerified && <VerifiedBadge size={14} />}
                        </h4>
                        <p className="truncate text-xs text-slate-400 dark:text-slate-500">
                          @{targetUser.username}
                        </p>
                      </div>
                    </Link>

                    {/* Follow Action Button */}
                    {!isSelf && (
                      <button
                        type="button"
                        onClick={() => handleToggleFollow(targetUser.id)}
                        disabled={isBusy}
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-all shrink-0 ${
                          isFollowing
                            ? 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-rose-50 hover:text-rose-600 dark:border-white/10 dark:bg-[#161616] dark:text-slate-300'
                            : 'bg-accent text-accent-text hover:bg-accent-hover'
                        }`}
                      >
                        {isBusy ? (
                          '…'
                        ) : isFollowing ? (
                          <>
                            <UserCheck size={12} />
                            <span>Following</span>
                          </>
                        ) : (
                          <>
                            <UserPlus size={12} />
                            <span>Follow</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-10 text-center text-xs text-slate-400 dark:text-slate-500">
              No reactions in this category.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
