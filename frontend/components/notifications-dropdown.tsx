'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from './auth-provider';
import { API_URL } from '../lib/api';
import { UserAvatar } from './user-avatar';
import { NotificationActionBadge } from './notification-badge';
import { broadcastNotificationSync, SYNC_NOTIFICATION_EVENT, NotificationSyncEvent } from '../lib/realtime';

export interface NotificationItem {
  id: number;
  recipientId: number;
  actorId: number;
  type: 'LIKE_POST' | 'LIKE_COMMENT' | 'COMMENT_POST' | 'REPLY_COMMENT' | 'FOLLOW';
  postId: number | null;
  commentId: number | null;
  content: string | null;
  read: boolean;
  createdAt: string;
  actor: {
    id: number;
    username: string;
    fullName: string | null;
    avatarUrl: string | null;
    isVerified: boolean;
  };
  post?: {
    id: number;
    content: string;
    imageUrl?: string | null;
    imageUrls?: string[];
  } | null;
  comment?: {
    id: number;
    content: string;
  } | null;
}

function formatRelativeTime(dateString: string): string {
  const now = Date.now();
  const date = new Date(dateString).getTime();
  const diffInSeconds = Math.max(0, Math.floor((now - date) / 1000));

  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function NotificationsDropdown() {
  const router = useRouter();
  const { token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!token || isOpen) return;
    try {
      const res = await fetch(`${API_URL}/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (!isOpen) {
          setUnreadCount(typeof data.unreadCount === 'number' ? data.unreadCount : 0);
        }
      }
    } catch {
      // Ignore background network error
    }
  }, [token, isOpen]);

  // Fetch notifications list
  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      // Ensure backend marks all as read
      await fetch(`${API_URL}/notifications/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});

      const res = await fetch(`${API_URL}/notifications?limit=25`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        // Since dropdown is open, all notifications are shown as read
        const items = (data.items || []).map((n: NotificationItem) => ({ ...n, read: true }));
        setNotifications(items);
        setUnreadCount(0);
        broadcastNotificationSync(0, { readAll: true });
      }
    } catch {
      // Ignore fetch error
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Initial and periodic polling for unread count
  useEffect(() => {
    if (!token) {
      setUnreadCount(0);
      setNotifications([]);
      return;
    }

    fetchUnreadCount();

    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<NotificationSyncEvent>;
      if (customEvent.detail && typeof customEvent.detail.unreadCount === 'number') {
        setUnreadCount(customEvent.detail.unreadCount);
        if (customEvent.detail.readAll) {
          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        } else if (customEvent.detail.notificationId) {
          setNotifications((prev) =>
            prev.map((n) => (n.id === customEvent.detail.notificationId ? { ...n, read: true } : n)),
          );
        }
      }
    };

    window.addEventListener(SYNC_NOTIFICATION_EVENT, handleSync);
    const interval = setInterval(fetchUnreadCount, 12000);

    function handleFocus() {
      fetchUnreadCount();
    }
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener(SYNC_NOTIFICATION_EVENT, handleSync);
    };
  }, [token, fetchUnreadCount]);

  // Fetch full list when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  function handleToggleDropdown() {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);

    if (nextOpen && token) {
      // Opening top dropdown immediately marks all read across entire website
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      broadcastNotificationSync(0, { readAll: true });
    }
  }

  // Close dropdown on outside click or escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);


  async function handleMarkAllAsRead() {
    if (!token || unreadCount === 0) return;

    // Optimistic update across website
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    broadcastNotificationSync(0, { readAll: true });

    try {
      await fetch(`${API_URL}/notifications/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Ignore error
    }
  }

  function handleNotificationClick(item: NotificationItem) {
    // Opening any notification makes unread count zero across website
    setUnreadCount(0);
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)),
    );
    broadcastNotificationSync(0, { notificationId: item.id });

    if (!item.read && token) {
      fetch(`${API_URL}/notifications/${item.id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }

    setIsOpen(false);

    if (item.type === 'FOLLOW') {
      router.push(`/profile/${encodeURIComponent(item.actor.username)}`);
      return;
    }

    if (item.postId) {
      if (item.commentId) {
        router.push(`/post/${item.postId}#comment-${item.commentId}`);
      } else {
        router.push(`/post/${item.postId}`);
      }
    }
  }

  const displayedNotifications = notifications.filter((n) => {
    if (filter === 'UNREAD') return !n.read;
    return true;
  });

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={handleToggleDropdown}
        className={`relative p-2 rounded-xl transition-all cursor-pointer ${
          isOpen
            ? 'bg-slate-100 dark:bg-white/[0.1] text-slate-900 dark:text-white'
            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100/60 dark:hover:bg-white/[0.04]'
        }`}
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <Bell className="size-4.5" strokeWidth={1.8} />

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex min-w-4 h-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white shadow-xs animate-in zoom-in-50 duration-200">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div
          className="fixed inset-x-2.5 top-15 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-[390px] max-w-[calc(100vw-1.25rem)] rounded-2xl border border-slate-200/90 dark:border-white/[0.1] bg-white/95 dark:bg-[#0f0f0f]/95 backdrop-blur-md shadow-2xl z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150"
          role="region"
          aria-label="Notifications popover"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.06] p-3.5 sm:px-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent-fg">
                  {unreadCount} new
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0}
              className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition-colors ${
                unreadCount > 0
                  ? 'text-accent-fg hover:bg-accent-subtle cursor-pointer'
                  : 'text-slate-400 dark:text-slate-600 opacity-60 cursor-not-allowed'
              }`}
            >
              <CheckCheck size={13} />
              <span>Mark all read</span>
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 px-3.5 pt-2.5 pb-1.5 bg-slate-50/50 dark:bg-white/[0.02]">
            <button
              type="button"
              onClick={() => setFilter('ALL')}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                filter === 'ALL'
                  ? 'bg-white dark:bg-white/[0.1] text-slate-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilter('UNREAD')}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                filter === 'UNREAD'
                  ? 'bg-white dark:bg-white/[0.1] text-slate-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Unread {unreadCount > 0 && `(${unreadCount})`}
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100/80 dark:divide-white/[0.04]">
            {loading && notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400 dark:text-slate-500">
                <div className="size-5 animate-spin rounded-full border-2 border-accent border-t-transparent mb-2" />
                <span className="text-xs">Loading notifications…</span>
              </div>
            ) : displayedNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <div className="grid size-12 place-items-center rounded-2xl bg-slate-100 dark:bg-white/[0.05] mb-2.5">
                  {filter === 'UNREAD' ? (
                    <CheckCheck size={20} className="text-accent-fg" />
                  ) : (
                    <Bell size={20} className="text-slate-400 dark:text-slate-500" />
                  )}
                </div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {filter === 'UNREAD' ? 'No unread notifications' : 'No notifications yet'}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500 max-w-[220px]">
                  {filter === 'UNREAD'
                    ? 'You have caught up with everything!'
                    : "When people interact with your posts or follow you, you'll see them here."}
                </p>
              </div>
            ) : (
              displayedNotifications.map((item) => {
                const isLike = item.type === 'LIKE_POST' || item.type === 'LIKE_COMMENT';
                const isComment = item.type === 'COMMENT_POST';
                const isReply = item.type === 'REPLY_COMMENT';
                const isFollow = item.type === 'FOLLOW';

                return (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className={`group relative flex items-start gap-3 p-3.5 transition-colors cursor-pointer ${
                      item.read
                        ? 'hover:bg-slate-50/80 dark:hover:bg-white/[0.03]'
                        : 'bg-accent/[0.03] dark:bg-accent/[0.05] hover:bg-accent/[0.07]'
                    }`}
                  >
                    {/* Actor Avatar with Action Badge */}
                    <div className="relative shrink-0">
                      <UserAvatar
                        src={item.actor.avatarUrl}
                        name={item.actor.fullName || item.actor.username}
                        className="size-10 text-xs font-semibold"
                      />
                      <NotificationActionBadge
                        type={item.type}
                        reactionType={item.content}
                        size="sm"
                      />
                    </div>

                    {/* Notification Content */}
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-slate-800 dark:text-slate-200 leading-snug">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {item.actor.fullName || item.actor.username}
                        </span>{' '}
                        <span className="text-slate-600 dark:text-slate-300">
                          {isLike && (item.type === 'LIKE_POST' ? 'reacted to your post' : 'reacted to your comment')}
                          {isComment && 'commented on your post'}
                          {isReply && 'replied to your comment'}
                          {isFollow && 'started following you'}
                        </span>
                      </p>

                      {/* For LIKE_COMMENT: show the comment that was reacted to */}
                      {item.type === 'LIKE_COMMENT' && item.comment?.content && (
                        <p className="mt-1 line-clamp-2 rounded-lg bg-slate-100/80 dark:bg-white/[0.05] px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200">
                          “{item.comment.content}”
                        </p>
                      )}

                      {/* For LIKE_POST: show snippet of the post */}
                      {item.type === 'LIKE_POST' && item.post?.content && (
                        <p className="mt-1 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
                          {item.post.content}
                        </p>
                      )}

                      {/* For COMMENT_POST or REPLY_COMMENT: show the comment/reply text */}
                      {(item.type === 'COMMENT_POST' || item.type === 'REPLY_COMMENT') && item.content && (
                        <p className="mt-1 line-clamp-2 rounded-lg bg-slate-100/80 dark:bg-white/[0.05] px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200">
                          “{item.content}”
                        </p>
                      )}

                      <span className="mt-1.5 block text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>

                    {/* Unread indicator dot */}
                    {!item.read && (
                      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer View All Link */}
          <div className="border-t border-slate-100 dark:border-white/[0.06] bg-slate-50/70 dark:bg-white/[0.02] p-2 text-center">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center justify-center gap-1.5 w-full rounded-xl py-1.5 text-xs font-semibold text-accent-fg hover:bg-accent-subtle transition-colors"
            >
              <span>View all notifications</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
