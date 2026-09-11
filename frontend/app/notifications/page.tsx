'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  Heart,
  MessageSquare,
  UserPlus,
  Trash2,
  ArrowLeft,
  Check,
} from 'lucide-react';
import { useAuth } from '../../components/auth-provider';
import { useAuthModal } from '../../components/auth-modal';
import { API_URL } from '../../lib/api';
import { UserAvatar } from '../../components/user-avatar';
import { RightSidebar } from '../../components/right-sidebar';
import { NotificationItem } from '../../components/notifications-dropdown';

function formatDetailedTime(dateString: string): string {
  const date = new Date(dateString);
  const now = Date.now();
  const diffInSeconds = Math.max(0, Math.floor((now - date.getTime()) / 1000));

  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
}

export default function NotificationsPage() {
  const router = useRouter();
  const { token } = useAuth();
  const { openAuthModal } = useAuthModal();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'LIKES' | 'COMMENTS' | 'FOLLOWS'>('ALL');

  const fetchNotifications = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setNotifications([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/notifications?limit=60`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.items || []);
        if (typeof data.unreadCount === 'number') {
          setUnreadCount(data.unreadCount);
        }
      }
    } catch {
      // Ignore network error
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  async function handleMarkAsRead(id: number, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!token) return;

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await fetch(`${API_URL}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Ignore error
    }
  }

  async function handleMarkAllAsRead() {
    if (!token || unreadCount === 0) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);

    try {
      await fetch(`${API_URL}/notifications/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Ignore error
    }
  }

  async function handleDelete(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (!token) return;

    const itemToDelete = notifications.find((n) => n.id === id);
    if (!itemToDelete) return;

    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (!itemToDelete.read) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    try {
      await fetch(`${API_URL}/notifications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Ignore error
    }
  }

  function handleCardClick(item: NotificationItem) {
    if (!item.read) {
      handleMarkAsRead(item.id);
    }

    if (item.type === 'FOLLOW') {
      router.push(`/profile/${encodeURIComponent(item.actor.username)}`);
      return;
    }

    if (item.postId) {
      router.push(`/#post-${item.postId}`);
    }
  }

  const filteredNotifications = notifications.filter((item) => {
    if (filter === 'UNREAD') return !item.read;
    if (filter === 'LIKES') return item.type === 'LIKE_POST' || item.type === 'LIKE_COMMENT';
    if (filter === 'COMMENTS') return item.type === 'COMMENT_POST' || item.type === 'REPLY_COMMENT';
    if (filter === 'FOLLOWS') return item.type === 'FOLLOW';
    return true;
  });

  return (
    <div className="grid min-h-[calc(100dvh-56px)] grid-cols-1 min-[1200px]:grid-cols-[minmax(0,1fr)_310px] min-[1450px]:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 w-full bg-[#f7f8f7] px-[18px] pb-12 pt-6 md:p-[34px_36px_60px] min-[1450px]:px-12 dark:bg-[#000000]">
        <div className="mx-auto max-w-3xl">
          {/* Header */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-accent-fg transition-colors mb-2"
              >
                <ArrowLeft size={13} />
                <span>Back to feed</span>
              </Link>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Notifications
                </h1>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-white shadow-2xs">
                    {unreadCount} unread
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Stay updated with activity, likes, comments, and new followers.
              </p>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="inline-flex items-center gap-1.5 self-start rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121212] px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors shadow-2xs cursor-pointer"
              >
                <CheckCheck size={14} className="text-accent-fg" />
                <span>Mark all as read</span>
              </button>
            )}
          </div>

          {/* Filter Chips */}
          <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-slate-200/80 dark:border-white/[0.08] pb-3">
            <button
              type="button"
              onClick={() => setFilter('ALL')}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                filter === 'ALL'
                  ? 'bg-accent text-white font-semibold shadow-xs'
                  : 'bg-white dark:bg-[#111] text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-white/[0.08] hover:bg-slate-50 dark:hover:bg-white/[0.04]'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilter('UNREAD')}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                filter === 'UNREAD'
                  ? 'bg-accent text-white font-semibold shadow-xs'
                  : 'bg-white dark:bg-[#111] text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-white/[0.08] hover:bg-slate-50 dark:hover:bg-white/[0.04]'
              }`}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    filter === 'UNREAD'
                      ? 'bg-white/20 text-white'
                      : 'bg-accent-subtle text-accent-fg'
                  }`}
                >
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setFilter('LIKES')}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                filter === 'LIKES'
                  ? 'bg-accent text-white font-semibold shadow-xs'
                  : 'bg-white dark:bg-[#111] text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-white/[0.08] hover:bg-slate-50 dark:hover:bg-white/[0.04]'
              }`}
            >
              <Heart size={12} className={filter === 'LIKES' ? 'fill-current' : 'text-rose-500'} />
              <span>Likes</span>
            </button>
            <button
              type="button"
              onClick={() => setFilter('COMMENTS')}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                filter === 'COMMENTS'
                  ? 'bg-accent text-white font-semibold shadow-xs'
                  : 'bg-white dark:bg-[#111] text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-white/[0.08] hover:bg-slate-50 dark:hover:bg-white/[0.04]'
              }`}
            >
              <MessageSquare size={12} className={filter === 'COMMENTS' ? '' : 'text-sky-500'} />
              <span>Comments</span>
            </button>
            <button
              type="button"
              onClick={() => setFilter('FOLLOWS')}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                filter === 'FOLLOWS'
                  ? 'bg-accent text-white font-semibold shadow-xs'
                  : 'bg-white dark:bg-[#111] text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-white/[0.08] hover:bg-slate-50 dark:hover:bg-white/[0.04]'
              }`}
            >
              <UserPlus size={12} className={filter === 'FOLLOWS' ? '' : 'text-emerald-500'} />
              <span>Follows</span>
            </button>
          </div>

          {/* List Area */}
          {!token ? (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0d0d0d] p-10 text-center">
              <div className="grid size-12 place-items-center rounded-2xl bg-slate-100 dark:bg-white/[0.05] text-slate-400 mx-auto mb-3">
                <Bell size={22} />
              </div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Sign in to view notifications
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Log in or create an account to see when people like your posts, comment on discussions, and follow your profile.
              </p>
              <button
                type="button"
                onClick={() =>
                  openAuthModal({
                    title: 'Stay connected with notifications',
                    description: 'Log in to track interactions and replies across your network.',
                  })
                }
                className="mt-4 inline-flex items-center rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-accent/90 transition-colors cursor-pointer"
              >
                Log in / Sign up
              </button>
            </div>
          ) : loading && notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 text-center text-slate-400 dark:text-slate-500">
              <div className="size-6 animate-spin rounded-full border-2 border-accent border-t-transparent mb-3" />
              <span className="text-xs font-medium">Loading notifications…</span>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="rounded-2xl border border-slate-200/70 dark:border-white/[0.08] bg-white dark:bg-[#0d0d0d] p-12 text-center">
              <div className="grid size-12 place-items-center rounded-2xl bg-slate-100 dark:bg-white/[0.05] mx-auto mb-3">
                {filter === 'COMMENTS' ? (
                  <MessageSquare size={22} className="text-sky-500" />
                ) : filter === 'LIKES' ? (
                  <Heart size={22} className="text-rose-500" />
                ) : filter === 'FOLLOWS' ? (
                  <UserPlus size={22} className="text-emerald-500" />
                ) : filter === 'UNREAD' ? (
                  <CheckCheck size={22} className="text-accent-fg" />
                ) : (
                  <Bell size={22} className="text-slate-400 dark:text-slate-500" />
                )}
              </div>
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {filter === 'UNREAD'
                  ? 'You are all caught up!'
                  : filter === 'LIKES'
                  ? 'No likes yet'
                  : filter === 'COMMENTS'
                  ? 'No comments yet'
                  : filter === 'FOLLOWS'
                  ? 'No new followers yet'
                  : 'No notifications yet'}
              </h2>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
                {filter === 'UNREAD'
                  ? 'No unread notifications right now. Check back later!'
                  : 'Interactions from other members of Common Ground will appear right here.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredNotifications.map((item) => {
                const isLike = item.type === 'LIKE_POST' || item.type === 'LIKE_COMMENT';
                const isComment = item.type === 'COMMENT_POST';
                const isReply = item.type === 'REPLY_COMMENT';
                const isFollow = item.type === 'FOLLOW';

                return (
                  <div
                    key={item.id}
                    onClick={() => handleCardClick(item)}
                    className={`group relative flex items-start justify-between gap-3.5 rounded-2xl border p-4 transition-all cursor-pointer ${
                      item.read
                        ? 'border-slate-200/80 dark:border-white/[0.07] bg-white dark:bg-[#0d0d0d] hover:border-slate-300 dark:hover:border-white/[0.15]'
                        : 'border-accent/30 dark:border-accent/40 bg-accent/[0.03] dark:bg-accent/[0.06] hover:bg-accent/[0.06] shadow-xs'
                    }`}
                  >
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      {/* Avatar with Badged Icon */}
                      <div className="relative shrink-0">
                        <UserAvatar
                          src={item.actor.avatarUrl}
                          name={item.actor.fullName || item.actor.username}
                          className="size-10 text-xs"
                        />
                        <span
                          className={`absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full border-2 border-white dark:border-[#0d0d0d] text-white shadow-xs ${
                            isLike
                              ? 'bg-rose-500'
                              : isComment || isReply
                              ? 'bg-sky-500'
                              : 'bg-emerald-500'
                          }`}
                        >
                          {isLike ? (
                            <Heart size={10} className="fill-current" />
                          ) : isComment || isReply ? (
                            <MessageSquare size={10} />
                          ) : (
                            <UserPlus size={10} />
                          )}
                        </span>
                      </div>

                      {/* Content Area */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                          <Link
                            href={`/profile/${encodeURIComponent(item.actor.username)}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white hover:text-accent-fg hover:underline"
                          >
                            {item.actor.fullName || item.actor.username}
                          </Link>
                          <span className="text-xs text-slate-600 dark:text-slate-300">
                            {isLike &&
                              (item.type === 'LIKE_POST'
                                ? 'liked your post'
                                : 'liked your comment')}
                            {isComment && 'commented on your post'}
                            {isReply && 'replied to your comment'}
                            {isFollow && 'started following you'}
                          </span>
                        </div>

                        {/* Comment or preview content */}
                        {item.content && (
                          <div className="mt-1.5 rounded-xl border border-slate-200/60 dark:border-white/[0.06] bg-slate-50/70 dark:bg-white/[0.02] p-2 text-xs text-slate-700 dark:text-slate-300 italic">
                            “{item.content}”
                          </div>
                        )}

                        {/* Post snippet */}
                        {item.post && !item.content && (
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                            {item.post.content}
                          </p>
                        )}

                        <span className="mt-2 block text-[11px] text-slate-400 dark:text-slate-500">
                          {formatDetailedTime(item.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Right-side status & actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {!item.read && (
                        <button
                          type="button"
                          onClick={(e) => handleMarkAsRead(item.id, e)}
                          title="Mark as read"
                          className="grid size-7 place-items-center rounded-lg text-slate-400 hover:text-accent-fg hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
                        >
                          <Check size={14} />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => handleDelete(item.id, e)}
                        title="Delete notification"
                        className="grid size-7 place-items-center rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer opacity-70 group-hover:opacity-100"
                      >
                        <Trash2 size={13} />
                      </button>

                      {!item.read && (
                        <span className="size-2 rounded-full bg-accent shrink-0 ml-1" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Suspense fallback={<aside className="hidden min-[1200px]:block w-[310px] border-l border-slate-200/80 bg-[#fdfdfd] dark:border-white/[0.08] dark:bg-[#080808] p-6" />}>
        <RightSidebar />
      </Suspense>
    </div>
  );
}
