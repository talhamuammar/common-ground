'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Users, UserPlus, UserCheck, Search, Compass, MapPin } from 'lucide-react';
import { API_URL, mediaUrl } from '../../lib/api';
import { useAuth } from '../../components/auth-provider';
import { useAuthModal } from '../../components/auth-modal';
import { UserAvatar } from '../../components/user-avatar';
import { VerifiedBadge } from '../../components/verified-badge';
import { RightSidebar } from '../../components/right-sidebar';
import { broadcastFollowChange, SYNC_FOLLOW_EVENT, FollowChangeEvent } from '../../lib/realtime';

type ConnectionUser = {
  id: number;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  location?: string | null;
  isVerified?: boolean;
  followersCount?: number;
  isFollowing?: boolean;
};

type ConnectionsData = {
  friends: ConnectionUser[];
  following: ConnectionUser[];
  followers: ConnectionUser[];
  suggestions: ConnectionUser[];
};

function FriendsPageContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const { user, token, ready } = useAuth();
  const { openAuthModal } = useAuthModal();

  const [activeTab, setActiveTab] = useState<'friends' | 'suggestions' | 'following' | 'followers'>(() => {
    if (tabParam && ['friends', 'suggestions', 'following', 'followers'].includes(tabParam)) {
      return tabParam as 'friends' | 'suggestions' | 'following' | 'followers';
    }
    return 'friends';
  });

  useEffect(() => {
    if (tabParam && ['friends', 'suggestions', 'following', 'followers'].includes(tabParam)) {
      setActiveTab(tabParam as 'friends' | 'suggestions' | 'following' | 'followers');
    }
  }, [tabParam]);

  const [data, setData] = useState<ConnectionsData>({
    friends: [],
    following: [],
    followers: [],
    suggestions: [],
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [followingMap, setFollowingMap] = useState<Record<number, boolean>>({});
  const [actionId, setActionId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);

    if (token) {
      fetch(`${API_URL}/users/me/connections`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((resData: ConnectionsData | null) => {
          if (!active) return;
          if (resData) {
            setData(resData);
            const initialMap: Record<number, boolean> = {};
            resData.following.forEach((u) => { initialMap[u.id] = true; });
            resData.friends.forEach((u) => { initialMap[u.id] = true; });
            resData.suggestions.forEach((u) => {
              if (u.isFollowing) initialMap[u.id] = true;
            });
            setFollowingMap(initialMap);
            if (!tabParam && resData.friends.length === 0 && resData.suggestions.length > 0) {
              setActiveTab('suggestions');
            }
          }
        })
        .catch(() => {})
        .finally(() => {
          if (active) setLoading(false);
        });
    } else {
      // Guest: load suggestions
      fetch(`${API_URL}/users/suggestions`)
        .then((res) => (res.ok ? res.json() : []))
        .then((sug: ConnectionUser[]) => {
          if (!active) return;
          setData({
            friends: [],
            following: [],
            followers: [],
            suggestions: Array.isArray(sug) ? sug : [],
          });
          setActiveTab('suggestions');
        })
        .catch(() => {})
        .finally(() => {
          if (active) setLoading(false);
        });
    }

    return () => {
      active = false;
    };
  }, [token, tabParam]);

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
        title: 'Connect with friends',
        description: 'Sign up or log in to follow and befriend community members.',
      });
      return;
    }

    const isCurrentlyFollowing = Boolean(followingMap[targetId]);
    const nextState = !isCurrentlyFollowing;
    const delta = nextState ? 1 : -1;

    // Optimistic update
    setFollowingMap((prev) => ({ ...prev, [targetId]: nextState }));
    broadcastFollowChange(delta, targetId, nextState);
    setActionId(targetId);

    try {
      const res = await fetch(`${API_URL}/users/${targetId}/follow`, {
        method: nextState ? 'POST' : 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Follow toggle failed');
    } catch {
      // Revert
      setFollowingMap((prev) => ({ ...prev, [targetId]: isCurrentlyFollowing }));
      broadcastFollowChange(-delta, targetId, isCurrentlyFollowing);
    } finally {
      setActionId(null);
    }
  }

  const filteredList = useMemo(() => {
    const list = data[activeTab] || [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        (u.fullName && u.fullName.toLowerCase().includes(q)) ||
        (u.bio && u.bio.toLowerCase().includes(q)) ||
        (u.location && u.location.toLowerCase().includes(q)),
    );
  }, [data, activeTab, search]);

  const tabs = [
    { id: 'friends' as const, label: 'Friends', count: data.friends.length, icon: Users },
    { id: 'suggestions' as const, label: 'Suggestions', count: data.suggestions.length, icon: Compass },
    { id: 'following' as const, label: 'Following', count: data.following.length, icon: UserCheck },
    { id: 'followers' as const, label: 'Followers', count: data.followers.length, icon: UserPlus },
  ];

  return (
    <div className="grid min-h-[calc(100dvh-56px)] grid-cols-1 min-[1200px]:grid-cols-[minmax(0,1fr)_310px] min-[1450px]:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 w-full bg-[#f7f8f7] px-[18px] pb-12 pt-6 md:p-[34px_36px_60px] min-[1450px]:px-12 dark:bg-[#000000]">
        {/* Header Banner */}
        <header className="mb-6">
          <div className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-lg bg-accent-subtle text-accent-fg">
              <Users size={14} strokeWidth={2.2} />
            </span>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-fg">
              Community Connections
            </p>
          </div>
          <h1 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Friends & Network
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Discover community members, manage mutual friendships, and grow your network.
          </p>
        </header>

        {/* Guest Banner if not signed in */}
        {ready && !user && (
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-accent-subtle-border bg-accent-subtle p-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Join Common Ground to connect
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Create an account or log in to add friends, follow creators, and share stories.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => openAuthModal({ title: 'Log in to connect' })}
                className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-accent-text shadow-2xs hover:bg-accent-hover transition-colors"
              >
                Log in
              </button>
              <Link
                href="/register"
                className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-[#151515] dark:text-slate-200 transition-colors"
              >
                Sign up
              </Link>
            </div>
          </div>
        )}

        {/* Tabs Bar & Search */}
        <div className="mb-6 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3 dark:border-white/[0.08]">
            <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none]">
              {tabs.map((tab) => {
                const TabIcon = tab.icon;
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all whitespace-nowrap ${
                      isSelected
                        ? 'bg-accent text-accent-text shadow-2xs hover:bg-accent-hover'
                        : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:bg-[#0e0e0e] dark:text-slate-400 dark:hover:bg-[#161616] dark:hover:text-slate-200 border border-slate-200/80 dark:border-white/[0.06]'
                    }`}
                  >
                    <TabIcon size={14} strokeWidth={isSelected ? 2.2 : 1.8} />
                    <span>{tab.label}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 text-slate-500 dark:bg-white/[0.08] dark:text-slate-400'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quick Search Input */}
            <div className="relative w-full sm:w-64">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search in ${activeTab}…`}
                className="w-full rounded-xl border border-slate-200/80 bg-white py-1.5 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-accent focus:outline-none dark:border-white/[0.08] dark:bg-[#0e0e0e] dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </div>
          </div>
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="animate-pulse rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-white/[0.08] dark:bg-[#0d0d0d] space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-full bg-slate-200 dark:bg-[#1f1f1f]" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3 w-24 rounded bg-slate-200 dark:bg-[#1f1f1f]" />
                    <div className="h-2.5 w-16 rounded bg-slate-200 dark:bg-[#1f1f1f]" />
                  </div>
                </div>
                <div className="h-2.5 w-full rounded bg-slate-100 dark:bg-[#181818]" />
              </div>
            ))}
          </div>
        ) : filteredList.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredList.map((item) => {
              const isFollowing = Boolean(followingMap[item.id]);
              const isSelf = user?.id === item.id;
              const isBusy = actionId === item.id;

              return (
                <div
                  key={item.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all hover:border-slate-300 dark:border-white/[0.08] dark:bg-[#0d0d0d] dark:hover:border-white/[0.14]"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        href={`/profile/${encodeURIComponent(item.username)}`}
                        className="group flex items-center gap-3"
                      >
                        <UserAvatar
                          src={mediaUrl(item.avatarUrl)}
                          name={item.fullName || item.username}
                          className="size-12 rounded-full border border-slate-200 dark:border-white/10"
                        />
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-bold text-slate-900 group-hover:text-accent-fg dark:text-slate-100 flex items-center gap-1">
                            <span>{item.fullName || item.username}</span>
                            {item.isVerified && <VerifiedBadge size={16} />}
                          </h3>
                          <p className="truncate text-xs text-slate-400 dark:text-slate-500">
                            @{item.username}
                          </p>
                        </div>
                      </Link>
                    </div>

                    {item.bio && (
                      <p className="mt-3 line-clamp-2 text-xs text-slate-600 dark:text-slate-300">
                        {item.bio}
                      </p>
                    )}

                    {item.location && (
                      <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
                        <MapPin size={12} className="text-accent-fg" />
                        <span className="truncate">{item.location}</span>
                      </p>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-white/[0.06]">
                    <Link
                      href={`/profile/${encodeURIComponent(item.username)}`}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                    >
                      View profile
                    </Link>

                    {!isSelf && (
                      <button
                        type="button"
                        onClick={() => handleToggleFollow(item.id)}
                        disabled={isBusy}
                        className={`inline-flex items-center gap-1 rounded-full px-3.5 py-1 text-xs font-semibold transition-all ${
                          isFollowing
                            ? 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 dark:border-white/10 dark:bg-[#161616] dark:text-slate-300 dark:hover:bg-rose-950/40 dark:hover:text-rose-300'
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
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white dark:border-white/[0.08] dark:bg-[#0d0d0d] px-6 py-16 text-center text-sm text-slate-500 dark:text-slate-400">
            <span className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-accent-subtle text-accent-fg">
              <Users size={24} strokeWidth={1.8} />
            </span>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              {search
                ? `No connections matching "${search}"`
                : activeTab === 'friends'
                ? 'No mutual friends yet'
                : activeTab === 'following'
                ? 'Not following anyone yet'
                : activeTab === 'followers'
                ? 'No followers yet'
                : 'No suggestions available'}
            </h3>
            <p className="mb-4 mt-1.5 text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
              {activeTab === 'friends'
                ? 'When you follow community members who follow you back, they will appear here as mutual friends.'
                : activeTab === 'suggestions'
                ? 'Explore the live feed to discover interesting creators and members to follow.'
                : 'Connect with people across Common Ground to grow your circle.'}
            </p>
            {activeTab !== 'suggestions' && (
              <button
                type="button"
                onClick={() => setActiveTab('suggestions')}
                className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-accent-text hover:bg-accent-hover transition-colors"
              >
                Browse Suggested People
              </button>
            )}
          </div>
        )}
      </div>

      {/* Right Sidebar */}
      <Suspense fallback={<aside className="hidden min-[1200px]:block w-[310px] border-l border-slate-200/80 bg-[#fdfdfd] dark:border-white/[0.08] dark:bg-[#080808] p-6" />}>
        <RightSidebar />
      </Suspense>
    </div>
  );
}

export default function FriendsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-canvas" />}>
      <FriendsPageContent />
    </Suspense>
  );
}
