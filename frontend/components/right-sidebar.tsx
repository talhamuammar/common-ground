'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { API_URL, mediaUrl, Post, SuggestedUser, TrendingTag } from '../lib/api';
import { useAuth } from './auth-provider';
import { useAuthModal } from './auth-modal';
import { UserAvatar } from './user-avatar';
import { VerifiedBadge } from './verified-badge';
import { UserPlus, Flame, MessageSquare, ChevronRight, Check, X, Heart } from 'lucide-react';

export function RightSidebar({ posts = [] }: { posts?: Post[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTag = searchParams.get('tag') || searchParams.get('q') || '';
  const { user, token } = useAuth();
  const { openAuthModal } = useAuthModal();

  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);
  const [trendingTags, setTrendingTags] = useState<TrendingTag[]>([]);
  const [followingStates, setFollowingStates] = useState<Record<number, boolean>>({});
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [loadingTags, setLoadingTags] = useState(true);
  const [sidebarPosts, setSidebarPosts] = useState<Post[]>(posts);

  // Modal tab: 'follow' | 'topics' | 'discussions' | null
  const [modalTab, setModalTab] = useState<'follow' | 'topics' | 'discussions' | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Keyboard navigation and body scroll lock for modal
  useEffect(() => {
    if (!modalTab) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalTab(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [modalTab]);

  // Sync / fetch posts for active discussions
  useEffect(() => {
    if (posts.length > 0) {
      setSidebarPosts(posts);
      return;
    }
    let active = true;
    fetch(`${API_URL}/posts`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (active && Array.isArray(data)) setSidebarPosts(data);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [posts]);

  // Load trending tags from DB (top 10 by post volume)
  useEffect(() => {
    let active = true;
    async function fetchTags() {
      try {
        const res = await fetch(`${API_URL}/posts/trending-tags`);
        if (res.ok) {
          const data: TrendingTag[] = await res.json();
          if (active) setTrendingTags(Array.isArray(data) ? data : []);
        }
      } catch {
        if (active) setTrendingTags([]);
      } finally {
        if (active) setLoadingTags(false);
      }
    }
    fetchTags();
    return () => { active = false; };
  }, [posts.length]);

  // Load suggestions from DB (top 10 followed users)
  useEffect(() => {
    let active = true;
    async function fetchSuggestions() {
      try {
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch(`${API_URL}/users/suggestions`, { headers });
        if (!res.ok) throw new Error('Failed to fetch suggestions');
        const data: SuggestedUser[] = await res.json();
        if (active) {
          const list = Array.isArray(data) ? data : [];
          setSuggestions(list);
          const initialMap: Record<number, boolean> = {};
          list.forEach(u => { initialMap[u.id] = u.isFollowing; });
          setFollowingStates(initialMap);
        }
      } catch {
        if (active) setSuggestions([]);
      } finally {
        if (active) setLoadingSuggestions(false);
      }
    }
    fetchSuggestions();
    return () => { active = false; };
  }, [token, user]);

  async function handleToggleFollow(suggested: SuggestedUser) {
    if (!token) {
      openAuthModal({
        title: `Follow ${suggested.fullName || suggested.username}`,
        description: 'Sign up or log in to follow creators and build your personal feed.',
      });
      return;
    }
    const currentStatus = Boolean(followingStates[suggested.id]);
    const nextStatus = !currentStatus;

    setFollowingStates(prev => ({ ...prev, [suggested.id]: nextStatus }));

    try {
      const method = nextStatus ? 'POST' : 'DELETE';
      await fetch(`${API_URL}/users/${suggested.id}/follow`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      setFollowingStates(prev => ({ ...prev, [suggested.id]: currentStatus }));
    }
  }

  function handleSelectTopic(tag: string) {
    if (activeTag.toLowerCase() === tag.toLowerCase()) {
      router.push('/');
      window.dispatchEvent(new CustomEvent('cg:filter-tag', { detail: '' }));
    } else {
      router.push(`/?tag=${encodeURIComponent(tag)}`);
      window.dispatchEvent(new CustomEvent('cg:filter-tag', { detail: tag }));
    }
  }

  function handleSelectDiscussion(postId: number, e?: React.MouseEvent) {
    if (e) e.preventDefault();

    // 1. Clear any active hashtag/search filter so the post is guaranteed to show
    window.dispatchEvent(new CustomEvent('cg:filter-tag', { detail: '' }));
    window.dispatchEvent(new CustomEvent('cg:focus-post', { detail: postId }));

    // 2. Clean URL to /#post-{id} without keeping the ?tag= query
    router.push(`/#post-${postId}`);

    // 3. Smooth scroll and highlight
    setTimeout(() => {
      const el = document.getElementById(`post-${postId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-accent', 'transition-all');
        setTimeout(() => {
          el.classList.remove('ring-2', 'ring-accent');
        }, 2500);
      }
    }, 150);

    // 4. Close modal if open
    setModalTab(null);
  }

  // Active discussions: top 10 sorted by comment count then likes desc
  const activeDiscussions = [...sidebarPosts]
    .filter(p => (p._count?.comments ?? p.comments?.length ?? 0) > 0 || (p._count?.likes ?? p.likes?.length ?? 0) > 0)
    .sort((a, b) => {
      const aComments = a._count?.comments ?? a.comments?.length ?? 0;
      const bComments = b._count?.comments ?? b.comments?.length ?? 0;
      if (bComments !== aComments) return bComments - aComments;
      const aLikes = a._count?.likes ?? a.likes?.length ?? 0;
      const bLikes = b._count?.likes ?? b.likes?.length ?? 0;
      return bLikes - aLikes;
    })
    .slice(0, 10);

  // Top 10 pools (at most 10, can be empty)
  const topSuggestions = suggestions.slice(0, 10);
  const topTrendingTags = trendingTags.slice(0, 10);

  // Sidebar preview slice (compact, no scrolling needed)
  const displayedSuggestions = suggestions.slice(0, 3);
  const displayedTags = trendingTags.slice(0, 4);
  const displayedDiscussions = activeDiscussions.slice(0, 2);

  return (
    <>
      <aside
        className="sticky top-14 hidden h-[calc(100dvh-56px)] self-start overflow-y-auto border-l border-slate-200/80 bg-[#fdfdfd] p-4 lg:p-5 min-[1200px]:block [scrollbar-width:thin] dark:border-white/[0.08] dark:bg-[#080808]"
        aria-label="Community highlights and discovery"
      >
        <div className="space-y-4">

          {/* 1. Who to follow */}
          <section className="rounded-2xl border border-slate-200/70 bg-white p-3.5 shadow-xs dark:border-white/[0.08] dark:bg-[#0d0d0d]">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">Who to follow</h2>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">Discover people you may know</p>
              </div>
              <span className="grid size-6 place-items-center rounded-full bg-accent-subtle text-accent-fg border border-accent-subtle-border">
                <UserPlus size={13} strokeWidth={2} />
              </span>
            </div>

            <div className="space-y-3">
              {loadingSuggestions ? (
                [1, 2, 3].map(n => (
                  <div key={n} className="flex items-center justify-between gap-3 animate-pulse">
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-full bg-slate-200 dark:bg-neutral-800" />
                      <div className="space-y-1">
                        <div className="h-3 w-20 rounded bg-slate-200 dark:bg-neutral-800" />
                        <div className="h-2.5 w-14 rounded bg-slate-100 dark:bg-neutral-800/60" />
                      </div>
                    </div>
                    <div className="h-6 w-14 rounded-full bg-slate-200 dark:bg-neutral-800" />
                  </div>
                ))
              ) : suggestions.length === 0 ? (
                <p className="py-2 text-center text-xs text-slate-400 dark:text-slate-500">No suggestions right now</p>
              ) : (
                displayedSuggestions.map((item) => {
                  const isFollowing = followingStates[item.id] ?? item.isFollowing;
                  return (
                    <div key={item.id} className="flex items-center justify-between gap-3">
                      <Link href={`/profile/${encodeURIComponent(item.username)}`} className="group flex min-w-0 items-center gap-2.5">
                        <UserAvatar
                          src={mediaUrl(item.avatarUrl)}
                          name={item.fullName || item.username}
                          className="size-8.5 shrink-0 rounded-full border border-slate-100 bg-slate-100 dark:border-white/[0.1] dark:bg-neutral-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-transform group-hover:scale-105"
                          sizes="34px"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-accent-fg flex items-center gap-1">
                            <span>{item.fullName || item.username}</span>
                            {item.isVerified && <VerifiedBadge size={12} />}
                          </p>
                          <p className="truncate text-[10px] text-slate-400 dark:text-slate-500">@{item.username}</p>
                        </div>
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleToggleFollow(item)}
                        className={`shrink-0 rounded-lg px-3 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                          isFollowing
                            ? 'border border-slate-200 bg-white text-slate-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 dark:border-white/[0.1] dark:bg-[#151515] dark:text-slate-300 dark:hover:border-rose-500/50 dark:hover:bg-rose-950/40 dark:hover:text-rose-300'
                            : 'bg-accent text-accent-text hover:bg-accent-hover'
                        }`}
                      >
                        {isFollowing ? 'Following' : 'Follow'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {suggestions.length > 3 && (
              <button
                type="button"
                onClick={() => setModalTab('follow')}
                className="mt-2.5 flex w-full items-center justify-center gap-1 rounded-lg py-1.5 text-center text-xs font-semibold text-accent-fg hover:bg-accent-subtle transition-colors cursor-pointer"
              >
                <span>See more</span>
                <ChevronRight size={13} />
              </button>
            )}
          </section>

          {/* 2. Trending Topics (Real Database Hashtags) */}
          <section className="rounded-2xl border border-slate-200/70 bg-white p-3.5 shadow-xs dark:border-white/[0.08] dark:bg-[#0d0d0d]">
            <div className="mb-2.5 flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">Trending Topics</h2>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">What people are talking about</p>
              </div>
              <span className="grid size-6 place-items-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300">
                <Flame size={13} strokeWidth={2} />
              </span>
            </div>

            <div className="space-y-0.5">
              {loadingTags ? (
                <div className="py-2 space-y-2 animate-pulse">
                  <div className="h-3 w-28 rounded bg-slate-200 dark:bg-neutral-800" />
                  <div className="h-3 w-20 rounded bg-slate-200 dark:bg-neutral-800" />
                </div>
              ) : trendingTags.length === 0 ? (
                <p className="py-2 text-center text-xs text-slate-400 dark:text-slate-500">No trending hashtags yet</p>
              ) : (
                displayedTags.map((topic) => {
                  const isActive = activeTag.toLowerCase() === topic.label.toLowerCase() || activeTag.toLowerCase() === topic.tag.toLowerCase();
                  const countText = `${topic.count} ${topic.count === 1 ? 'post' : 'posts'}`;
                  return (
                    <button
                      key={topic.tag}
                      type="button"
                      onClick={() => handleSelectTopic(topic.label)}
                      className={`flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-left transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-accent-subtle text-accent-fg border border-accent-subtle-border'
                          : 'hover:bg-slate-50 text-slate-700 dark:hover:bg-white/[0.04] dark:text-slate-300'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className={`text-xs font-semibold ${isActive ? 'text-accent-fg' : 'text-slate-800 dark:text-slate-200'}`}>
                          #{topic.label}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">Trending in community</p>
                      </div>
                      <span className={`flex items-center gap-1 text-[10px] font-medium ${isActive ? 'text-accent-fg font-bold' : 'text-slate-400 dark:text-slate-500'}`}>
                        {isActive ? <><Check size={12} strokeWidth={2.5} /> Active</> : countText}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            {trendingTags.length > 4 && (
              <button
                type="button"
                onClick={() => setModalTab('topics')}
                className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg py-1.5 text-center text-xs font-semibold text-accent-fg hover:bg-accent-subtle transition-colors cursor-pointer"
              >
                <span>See all topics</span>
                <ChevronRight size={13} />
              </button>
            )}
          </section>

          {/* 3. Active Discussions (if posts exist) */}
          {activeDiscussions.length > 0 && (
            <section className="rounded-2xl border border-slate-200/70 bg-white p-3.5 shadow-xs dark:border-white/[0.08] dark:bg-[#0d0d0d]">
              <div className="mb-2.5 flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">Active Discussions</h2>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">Conversations happening now</p>
                </div>
                <span className="grid size-6 place-items-center rounded-full bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-300">
                  <MessageSquare size={13} strokeWidth={2} />
                </span>
              </div>

              <div className="space-y-2">
                {displayedDiscussions.map((post) => {
                  const commentCount = post._count?.comments ?? post.comments?.length ?? 0;
                  return (
                    <button
                      key={post.id}
                      type="button"
                      onClick={(e) => handleSelectDiscussion(post.id, e)}
                      className="block w-full text-left rounded-xl border border-slate-100 bg-slate-50/60 p-2 transition-all hover:border-slate-200 hover:bg-slate-50 dark:border-white/[0.06] dark:bg-[#151515]/60 dark:hover:border-white/[0.1] dark:hover:bg-[#151515] cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <UserAvatar
                          src={mediaUrl(post.author.avatarUrl)}
                          name={post.author.fullName || post.author.username}
                          className="size-4.5 rounded-full text-[9px]"
                          sizes="18px"
                        />
                        <span className="truncate text-[11px] font-medium text-slate-700 dark:text-slate-200">
                          {post.author.fullName || post.author.username}
                        </span>
                        <span className="ml-auto flex items-center gap-1 rounded-full bg-white dark:bg-[#0d0d0d] dark:border dark:border-white/[0.08] px-1.5 py-0.5 text-[9px] font-semibold text-slate-500 dark:text-slate-400 shadow-2xs">
                          <MessageSquare size={10} /> {commentCount}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[11px] text-slate-600 dark:text-slate-400 [overflow-wrap:anywhere]">
                        {post.content}
                      </p>
                    </button>
                  );
                })}
              </div>

              {activeDiscussions.length > 2 && (
                <button
                  type="button"
                  onClick={() => setModalTab('discussions')}
                  className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg py-1.5 text-center text-xs font-semibold text-accent-fg hover:bg-accent-subtle transition-colors cursor-pointer"
                >
                  <span>See more</span>
                  <ChevronRight size={13} />
                </button>
              )}
            </section>
          )}

          {/* Minimal Community Footer */}
          <footer className="px-1 text-[10px] leading-relaxed text-slate-400 dark:text-slate-500">
            <div className="flex flex-wrap gap-x-2.5 gap-y-0.5">
              <Link href="/" className="hover:text-slate-600 dark:hover:text-slate-300">About</Link>
              <Link href="/" className="hover:text-slate-600 dark:hover:text-slate-300">Guidelines</Link>
              <Link href="/" className="hover:text-slate-600 dark:hover:text-slate-300">Privacy</Link>
              <Link href="/" className="hover:text-slate-600 dark:hover:text-slate-300">Terms</Link>
              <Link href="/" className="hover:text-slate-600 dark:hover:text-slate-300">Help</Link>
            </div>
            <p className="mt-1.5 text-slate-400 dark:text-slate-500">© {new Date().getFullYear()} Common Ground · All rights reserved.</p>
          </footer>

        </div>
      </aside>

      {/* Top 10 Community Highlights Modal */}
      {mounted && modalTab && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setModalTab(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex flex-col w-full max-w-lg max-h-[85vh] rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#101211] shadow-2xl overflow-hidden"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-white/[0.08] shrink-0">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                  {modalTab === 'follow' && 'Who to follow'}
                  {modalTab === 'topics' && 'Trending Topics'}
                  {modalTab === 'discussions' && 'Active Discussions'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {modalTab === 'follow' && 'Suggested creators and people in the community'}
                  {modalTab === 'topics' && 'Hashtags with the highest post volume'}
                  {modalTab === 'discussions' && 'Community posts ranked by comments and activity'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalTab(null)}
                className="grid size-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X size={17} />
              </button>
            </div>

            {/* Quick Filter Tabs */}
            <div className="flex items-center gap-1 border-b border-slate-100 dark:border-white/[0.08] px-4 pt-1 bg-slate-50/50 dark:bg-[#141615] shrink-0">
              <button
                type="button"
                onClick={() => setModalTab('follow')}
                className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                  modalTab === 'follow'
                    ? 'border-accent text-accent-fg font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <UserPlus size={13} />
                <span>People ({topSuggestions.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setModalTab('topics')}
                className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                  modalTab === 'topics'
                    ? 'border-accent text-accent-fg font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Flame size={13} />
                <span>Trending ({topTrendingTags.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setModalTab('discussions')}
                className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                  modalTab === 'discussions'
                    ? 'border-accent text-accent-fg font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <MessageSquare size={13} />
                <span>Discussions ({activeDiscussions.length})</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5 [scrollbar-width:thin]">
              {/* Tab 1: Top 10 Followed People */}
              {modalTab === 'follow' && (
                topSuggestions.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No suggestions right now</p>
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Check back later as new members join</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {topSuggestions.map((item, index) => {
                      const isFollowing = followingStates[item.id] ?? item.isFollowing;
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 dark:border-white/[0.06] dark:bg-[#151716]"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-xs font-bold text-slate-400 dark:text-slate-600 w-4 text-center">
                              {index + 1}
                            </span>
                            <Link
                              href={`/profile/${encodeURIComponent(item.username)}`}
                              onClick={() => setModalTab(null)}
                              className="group flex min-w-0 items-center gap-2.5"
                            >
                              <UserAvatar
                                src={mediaUrl(item.avatarUrl)}
                                name={item.fullName || item.username}
                                className="size-9.5 shrink-0 rounded-full border border-slate-100 bg-slate-100 dark:border-white/[0.1] dark:bg-neutral-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-transform group-hover:scale-105"
                                sizes="38px"
                              />
                              <div className="min-w-0">
                                <p className="truncate text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-accent-fg flex items-center gap-1">
                                  <span>{item.fullName || item.username}</span>
                                  {item.isVerified && <VerifiedBadge size={13} />}
                                </p>
                                <p className="truncate text-xs text-slate-400 dark:text-slate-500">
                                  @{item.username} · {item.followersCount.toLocaleString()} {item.followersCount === 1 ? 'follower' : 'followers'}
                                </p>
                              </div>
                            </Link>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleToggleFollow(item)}
                            className={`shrink-0 rounded-lg px-3.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                              isFollowing
                                ? 'border border-slate-200 bg-white text-slate-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 dark:border-white/[0.1] dark:bg-[#1c1c1c] dark:text-slate-300 dark:hover:border-rose-500/50 dark:hover:bg-rose-950/40 dark:hover:text-rose-300'
                                : 'bg-accent text-accent-text hover:bg-accent-hover shadow-xs'
                            }`}
                          >
                            {isFollowing ? 'Following' : 'Follow'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )
              )}

              {/* Tab 2: Top 10 Trending Topics */}
              {modalTab === 'topics' && (
                topTrendingTags.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No trending hashtags yet</p>
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Add #hashtags in your posts to start trends</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {topTrendingTags.map((topic, index) => {
                      const isActive = activeTag.toLowerCase() === topic.label.toLowerCase() || activeTag.toLowerCase() === topic.tag.toLowerCase();
                      const countText = `${topic.count} ${topic.count === 1 ? 'post' : 'posts'}`;
                      return (
                        <button
                          key={topic.tag}
                          type="button"
                          onClick={() => {
                            handleSelectTopic(topic.label);
                            setModalTab(null);
                          }}
                          className={`flex w-full items-center justify-between rounded-xl p-2.5 text-left transition-colors cursor-pointer ${
                            isActive
                              ? 'bg-accent-subtle text-accent-fg border border-accent-subtle-border'
                              : 'border border-slate-100 bg-slate-50/50 hover:bg-slate-100 text-slate-700 dark:border-white/[0.06] dark:bg-[#151716] dark:hover:bg-[#1d201e] dark:text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-xs font-bold text-slate-400 dark:text-slate-600 w-4 text-center">
                              {index + 1}
                            </span>
                            <div className="min-w-0">
                              <p className={`text-xs sm:text-sm font-bold ${isActive ? 'text-accent-fg' : 'text-slate-800 dark:text-slate-200'}`}>
                                #{topic.label}
                              </p>
                              <p className="text-[11px] text-slate-400 dark:text-slate-500">Trending in community</p>
                            </div>
                          </div>

                          <span className={`flex items-center gap-1.5 text-xs font-semibold ${isActive ? 'text-accent-fg font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                            {isActive ? <><Check size={13} strokeWidth={2.5} /> Filtered</> : countText}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )
              )}

              {/* Tab 3: Top 10 Discussions */}
              {modalTab === 'discussions' && (
                activeDiscussions.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No active discussions yet</p>
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Start commenting on posts to spark conversation</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {activeDiscussions.map((post, index) => {
                      const commentCount = post._count?.comments ?? post.comments?.length ?? 0;
                      const likeCount = post._count?.likes ?? post.likes?.length ?? 0;
                      return (
                        <button
                          key={post.id}
                          type="button"
                          onClick={(e) => handleSelectDiscussion(post.id, e)}
                          className="block w-full text-left rounded-xl border border-slate-100 bg-slate-50/50 p-3 transition-all hover:border-slate-200 hover:bg-slate-100 dark:border-white/[0.06] dark:bg-[#151716] dark:hover:border-white/[0.1] dark:hover:bg-[#1a1d1b] cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-400 dark:text-slate-600 w-4 text-center shrink-0">
                              {index + 1}
                            </span>
                            <UserAvatar
                              src={mediaUrl(post.author.avatarUrl)}
                              name={post.author.fullName || post.author.username}
                              className="size-5 rounded-full text-[10px]"
                              sizes="20px"
                            />
                            <span className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
                              {post.author.fullName || post.author.username}
                            </span>
                            <span className="text-[11px] text-slate-400 dark:text-slate-500">
                              @{post.author.username}
                            </span>
                            <div className="ml-auto flex items-center gap-2 shrink-0">
                              <span className="flex items-center gap-1 rounded-full bg-white dark:bg-[#0d0d0d] dark:border dark:border-white/[0.08] px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300 shadow-2xs">
                                <MessageSquare size={11} className="text-accent-fg" /> {commentCount}
                              </span>
                              {likeCount > 0 && (
                                <span className="flex items-center gap-1 rounded-full bg-white dark:bg-[#0d0d0d] dark:border dark:border-white/[0.08] px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300 shadow-2xs">
                                  <Heart size={11} className="text-rose-500" /> {likeCount}
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="mt-1.5 line-clamp-2 text-xs text-slate-600 dark:text-slate-400 [overflow-wrap:anywhere] pl-6">
                            {post.content}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
