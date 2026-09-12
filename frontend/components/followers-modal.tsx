'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { X, Search, UserPlus, UserCheck, Users } from 'lucide-react';
import { UserAvatar } from './user-avatar';
import { VerifiedBadge } from './verified-badge';
import { useAuth } from './auth-provider';
import { useAuthModal } from './auth-modal';
import { API_URL, mediaUrl } from '../lib/api';
import { broadcastFollowChange, SYNC_FOLLOW_EVENT, FollowChangeEvent } from '../lib/realtime';

export interface FollowerUser {
  id: number;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  bio?: string | null;
  isVerified?: boolean;
}

interface FollowersModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'followers' | 'following';
  profileUsername: string;
  profileFullName?: string | null;
  followers?: FollowerUser[];
  following?: FollowerUser[];
  followersCount?: number;
  followingCount?: number;
}

export function FollowersModal({
  isOpen,
  onClose,
  initialTab = 'following',
  profileUsername,
  profileFullName,
  followers = [],
  following = [],
  followersCount,
  followingCount,
}: FollowersModalProps) {
  const { user: currentUser, token } = useAuth();
  const { openAuthModal } = useAuthModal();

  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [followingMap, setFollowingMap] = useState<Record<number, boolean>>({});
  const [busyMap, setBusyMap] = useState<Record<number, boolean>>({});

  // Synchronize active tab with initialTab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSearchQuery('');
    }
  }, [isOpen, initialTab]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Keep following states synced with global events
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

  // Synchronize follow states whenever modal opens or list changes
  useEffect(() => {
    if (!isOpen) return;

    const isOwnProfile =
      currentUser?.username &&
      profileUsername &&
      currentUser.username.toLowerCase() === profileUsername.toLowerCase();

    // If viewing own profile, everyone in the `following` list is followed by the current user
    if (isOwnProfile && Array.isArray(following) && following.length > 0) {
      const initialMap: Record<number, boolean> = {};
      following.forEach((u) => {
        initialMap[u.id] = true;
      });
      setFollowingMap((prev) => ({ ...initialMap, ...prev }));
    }

    if (!token) return;

    // Fetch current user's following list to prefill buttons accurately
    fetch(`${API_URL}/users/me/connections`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const followedUsers: FollowerUser[] = Array.isArray(data?.following)
          ? data.following
          : Array.isArray(data)
          ? data
          : [];
        if (followedUsers.length > 0) {
          const map: Record<number, boolean> = {};
          followedUsers.forEach((u) => {
            map[u.id] = true;
          });
          setFollowingMap((prev) => ({ ...map, ...prev }));
        }
      })
      .catch(() => {});
  }, [isOpen, token, profileUsername, currentUser?.username, following]);

  const currentList = activeTab === 'followers' ? followers : following;

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return currentList;
    return currentList.filter((u) => {
      const name = (u.fullName || '').toLowerCase();
      const uname = (u.username || '').toLowerCase();
      return name.includes(q) || uname.includes(q);
    });
  }, [currentList, searchQuery]);

  async function handleToggleFollow(targetUser: FollowerUser, e: React.MouseEvent) {
    e.stopPropagation();
    if (!token) {
      openAuthModal({
        title: `Follow ${targetUser.fullName || targetUser.username}`,
        description: 'Sign up or log in to connect with members of Common Ground.',
      });
      return;
    }

    const currentStatus = Boolean(followingMap[targetUser.id]);
    const nextStatus = !currentStatus;
    const delta = nextStatus ? 1 : -1;

    // Optimistic local and global update
    setFollowingMap((prev) => ({ ...prev, [targetUser.id]: nextStatus }));
    broadcastFollowChange(delta, targetUser.id, nextStatus);

    setBusyMap((prev) => ({ ...prev, [targetUser.id]: true }));
    try {
      const method = nextStatus ? 'POST' : 'DELETE';
      await fetch(`${API_URL}/users/${targetUser.id}/follow`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Revert on failure
      setFollowingMap((prev) => ({ ...prev, [targetUser.id]: currentStatus }));
      broadcastFollowChange(-delta, targetUser.id, currentStatus);
    } finally {
      setBusyMap((prev) => ({ ...prev, [targetUser.id]: false }));
    }
  }

  if (!isOpen) return null;

  const totalFollowers = followersCount ?? followers.length;
  const totalFollowing = followingCount ?? following.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${profileFullName || profileUsername}'s connections`}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#121212] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 dark:border-white/[0.08]">
          <div className="min-w-0 pr-2">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate">
              {profileFullName || profileUsername}
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
              @{profileUsername}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={17} />
          </button>
        </div>

        {/* Tab Switcher: Following (left) vs Followers (right) */}
        <div className="grid grid-cols-2 border-b border-slate-100 dark:border-white/[0.08] p-1 bg-slate-50/50 dark:bg-white/[0.02]">
          <button
            type="button"
            onClick={() => {
              setActiveTab('following');
              setSearchQuery('');
            }}
            className={`py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'following'
                ? 'bg-white dark:bg-white/[0.08] text-slate-900 dark:text-white shadow-2xs font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>Following</span>
            <span className={`text-[11px] rounded-full px-1.5 py-0.2 ${
              activeTab === 'following'
                ? 'bg-accent/15 text-accent-fg'
                : 'bg-slate-200/60 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400'
            }`}>
              {totalFollowing}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('followers');
              setSearchQuery('');
            }}
            className={`py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'followers'
                ? 'bg-white dark:bg-white/[0.08] text-slate-900 dark:text-white shadow-2xs font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>Followers</span>
            <span className={`text-[11px] rounded-full px-1.5 py-0.2 ${
              activeTab === 'followers'
                ? 'bg-accent/15 text-accent-fg'
                : 'bg-slate-200/60 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400'
            }`}>
              {totalFollowers}
            </span>
          </button>
        </div>

        {/* Search Input Filter */}
        <div className="p-3 border-b border-slate-100 dark:border-white/[0.06]">
          <div className="relative flex items-center">
            <Search className="absolute left-3 size-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab === 'followers' ? 'followers' : 'following'}…`}
              className="w-full rounded-xl bg-slate-100 dark:bg-white/[0.05] pl-9 pr-8 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1.5 focus:ring-accent/40"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 text-xs"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto p-2 [scrollbar-width:thin] divide-y divide-slate-50 dark:divide-white/[0.03]">
          {filteredUsers.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <div className="mx-auto mb-2.5 grid size-11 place-items-center rounded-2xl bg-slate-100 dark:bg-white/[0.05] text-slate-400">
                <Users size={20} />
              </div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {searchQuery
                  ? `No members found matching "${searchQuery}"`
                  : activeTab === 'followers'
                  ? 'No followers yet'
                  : 'Not following anyone yet'}
              </p>
              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500 max-w-xs mx-auto">
                {searchQuery
                  ? 'Check for spelling errors or try searching for another handle.'
                  : activeTab === 'followers'
                  ? 'When people follow this profile, they will appear here.'
                  : 'When this user follows people, they will appear here.'}
              </p>
            </div>
          ) : (
            filteredUsers.map((item) => {
              const isSelf = currentUser && currentUser.id === item.id;
              const isFollowing = Boolean(followingMap[item.id]);
              const isBusy = Boolean(busyMap[item.id]);

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors"
                >
                  <Link
                    href={`/profile/${encodeURIComponent(item.username)}`}
                    onClick={onClose}
                    className="flex items-center gap-3 min-w-0 flex-1 group"
                  >
                    <UserAvatar
                      src={mediaUrl(item.avatarUrl)}
                      name={item.fullName || item.username}
                      className="size-10 rounded-full shrink-0 ring-1 ring-slate-200/80 dark:ring-white/10"
                      sizes="40px"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="truncate text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-accent-fg transition-colors">
                          {item.fullName || item.username}
                        </span>
                        {item.isVerified && <VerifiedBadge size={13} />}
                      </div>
                      <p className="truncate text-[11px] text-slate-400 dark:text-slate-500">
                        @{item.username}
                      </p>
                      {item.bio && (
                        <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
                          {item.bio}
                        </p>
                      )}
                    </div>
                  </Link>

                  {/* Follow / Following Action Button */}
                  {!isSelf && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={(e) => handleToggleFollow(item, e)}
                      className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                        isFollowing
                          ? 'border border-slate-200 dark:border-white/15 bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:border-rose-300 dark:hover:border-rose-900/40 hover:text-rose-600 dark:hover:text-rose-400'
                          : 'bg-accent text-white shadow-2xs hover:bg-accent-hover active:scale-[0.98]'
                      }`}
                    >
                      {isFollowing ? (
                        <>
                          <UserCheck size={13} />
                          <span>Following</span>
                        </>
                      ) : (
                        <>
                          <UserPlus size={13} />
                          <span>Follow</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
