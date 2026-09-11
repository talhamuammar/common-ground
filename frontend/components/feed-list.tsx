'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { API_URL, mediaUrl, Post, SuggestedUser } from '../lib/api';
import { useReactionsSync } from '../lib/reactions-realtime';
import { UserAvatar } from './user-avatar';
import { VerifiedBadge } from './verified-badge';
import { useAuth } from './auth-provider';
import { useAuthModal } from './auth-modal';
import {
  Compass,
  Image as ImageIcon,
  MessageSquare,
  Bookmark,
  X,
  Search,
  SquarePen,
} from 'lucide-react';


import { PostCard } from './post-card';
import { FullscreenPostModal } from './post-modal';
import { CreatePostModal } from './create-post-modal';

// Clean Feed Composer Trigger
function FeedComposerTrigger({
  onOpenModal,
}: {
  onOpenModal: () => void;
}) {
  const { user, token } = useAuth();

  // No post option for logged-out users
  if (!token || !user) {
    return null;
  }

  const firstName = user.fullName?.split(' ')[0] || user.username;

  return (
    <div className="group relative rounded-2xl border border-slate-200/80 bg-white/95 p-4 sm:p-5 shadow-[0_2px_14px_rgba(0,0,0,0.03)] transition-all duration-200 hover:border-slate-300 hover:shadow-[0_8px_26px_rgba(0,0,0,0.05)] dark:border-white/[0.08] dark:bg-[#0d0d0d] dark:shadow-[0_4px_20px_rgba(0,0,0,0.5)] dark:hover:border-white/[0.15]">
      <div className="flex items-center gap-3">
        <UserAvatar
          src={mediaUrl(user.avatarUrl)}
          name={user.fullName || user.username || 'You'}
          className="size-10 rounded-full border border-slate-100 bg-slate-100 text-xs font-semibold text-slate-700 dark:border-white/[0.1] dark:bg-[#151515] dark:text-slate-200 shrink-0"
          sizes="40px"
        />
        <button
          type="button"
          onClick={onOpenModal}
          className="flex-1 text-left rounded-xl bg-slate-100/80 dark:bg-[#161616] px-4 py-2.5 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-[#1c1c1c] hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer select-none truncate"
        >
          Share a thought or story, {firstName}…
        </button>
      </div>

      <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-white/[0.08]">
        <button
          type="button"
          onClick={onOpenModal}
          className="flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
        >
          <ImageIcon size={16} />
          <span>Photo</span>
        </button>

        <button
          type="button"
          onClick={onOpenModal}
          className="inline-flex items-center gap-1.5 rounded-full bg-accent hover:bg-accent-hover px-4 py-1.5 text-xs sm:text-sm font-semibold text-accent-text transition-colors cursor-pointer"
        >
          <SquarePen size={14} />
          <span>Post</span>
        </button>
      </div>
    </div>
  );
}

// Main FeedList Component
export function FeedList({ posts: initialPosts }: { posts: Post[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useAuth();
  const { openAuthModal } = useAuthModal();
  const urlTag = searchParams.get('tag') || searchParams.get('q') || '';
  const [query, setQuery] = useState(urlTag);
  const [feedMode, setFeedMode] = useState<'all' | 'visuals' | 'discussions' | 'saved'>('all');
  const [sort, setSort] = useState<'latest' | 'popular'>('latest');
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [savedPostIds, setSavedPostIds] = useState<number[]>([]);
  const [toastMessage, setToastMessage] = useState('');
  const [activeModalPost, setActiveModalPost] = useState<Post | null>(null);
  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
  const [suggestedContributors, setSuggestedContributors] = useState<SuggestedUser[]>([]);

  // Fetch community suggestions to guarantee top 5 contributors
  useEffect(() => {
    let active = true;
    fetch(`${API_URL}/users/suggestions?limit=10`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (active && Array.isArray(data)) {
          setSuggestedContributors(data);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Sync external search params
  useEffect(() => {
    setQuery(urlTag);
  }, [urlTag]);

  // Sync posts when prop updates
  useEffect(() => {
    setPosts(initialPosts);
  }, [initialPosts]);

  // Listen for posts created globally (e.g. from Sidebar Create Post modal)
  useEffect(() => {
    const handleGlobalPostCreated = (e: Event) => {
      const customEvent = e as CustomEvent<Post>;
      if (customEvent.detail) {
        setPosts((prev) => {
          if (prev.some((p) => p.id === customEvent.detail.id)) return prev;
          return [customEvent.detail, ...prev];
        });
        setToastMessage('Story shared with the community!');
        setTimeout(() => setToastMessage(''), 3000);
      }
    };
    window.addEventListener('post-created', handleGlobalPostCreated);
    return () => window.removeEventListener('post-created', handleGlobalPostCreated);
  }, []);

  // Live real-time reaction synchronization across cards and modals
  useReactionsSync(
    useCallback((event) => {
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== event.postId) return p;
          const nextLikes = event.likes || (
            event.liked
              ? [...(p.likes || []).filter((l) => l.userId !== event.userId), { userId: event.userId, type: event.type || 'LIKE' }]
              : (p.likes || []).filter((l) => l.userId !== event.userId)
          );
          return {
            ...p,
            _count: {
              ...p._count,
              likes: event.totalLikes,
              comments: p._count?.comments ?? (p.comments?.length ?? 0),
            },
            likes: nextLikes,
          };
        }),
      );
      setActiveModalPost((current) => {
        if (!current || current.id !== event.postId) return current;
        const nextLikes = event.likes || (
          event.liked
            ? [...(current.likes || []).filter((l) => l.userId !== event.userId), { userId: event.userId, type: event.type || 'LIKE' }]
            : (current.likes || []).filter((l) => l.userId !== event.userId)
        );
        return {
          ...current,
          _count: {
            ...current._count,
            likes: event.totalLikes,
            comments: current._count?.comments ?? (current.comments?.length ?? 0),
          },
          likes: nextLikes,
        };
      });
    }, []),
  );

  // Load saved posts from DB bookmarks
  useEffect(() => {
    let active = true;
    if (!token) {
      setSavedPostIds([]);
      return;
    }
    fetch(`${API_URL}/posts/bookmarks`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (active && Array.isArray(data)) {
          setSavedPostIds(data.map((p: Post) => p.id));
        }
      })
      .catch(() => { });
    return () => {
      active = false;
    };
  }, [token]);

  // Listen for tag click from sidebar or hashtags
  useEffect(() => {
    function handleFilterTag(e: Event) {
      const custom = e as CustomEvent<string>;
      if (custom.detail !== undefined) {
        setQuery(custom.detail);
      }
    }
    window.addEventListener('cg:filter-tag', handleFilterTag);
    return () => window.removeEventListener('cg:filter-tag', handleFilterTag);
  }, []);

  // Listen for discussion click from sidebar/modal: clears active filters and scrolls smoothly to target post
  useEffect(() => {
    function handleFocusPost(e: Event) {
      const custom = e as CustomEvent<number>;
      const postId = custom.detail;
      if (!postId) return;

      // Clear search/hashtag filter and reset to 'all' so post is guaranteed to render
      setQuery('');
      setFeedMode('all');

      setTimeout(() => {
        const el = document.getElementById(`post-${postId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-accent', 'transition-all');
          setTimeout(() => el.classList.remove('ring-2', 'ring-accent'), 2500);
        }
      }, 150);
    }

    window.addEventListener('cg:focus-post', handleFocusPost);
    return () => window.removeEventListener('cg:focus-post', handleFocusPost);
  }, []);

  // Scroll to post if URL has #post-{id} on initial load or mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash;
    if (hash && hash.startsWith('#post-')) {
      const postId = hash.replace('#post-', '');
      setTimeout(() => {
        const el = document.getElementById(`post-${postId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-accent', 'transition-all');
          setTimeout(() => el.classList.remove('ring-2', 'ring-accent'), 2500);
        }
      }, 300);
    }
  }, [posts]);

  async function handleToggleSave(postId: number) {
    if (!token) {
      openAuthModal({
        title: 'Save to your library',
        description: 'Sign up or log in to bookmark stories and photos to your personal collection.',
      });
      return;
    }
    const wasSaved = savedPostIds.includes(postId);
    const next = wasSaved
      ? savedPostIds.filter((id) => id !== postId)
      : [...savedPostIds, postId];
    setSavedPostIds(next);

    setToastMessage(!wasSaved ? 'Post saved to your collection' : 'Post removed from saved');
    setTimeout(() => setToastMessage(''), 2500);

    try {
      const res = await fetch(`${API_URL}/posts/${postId}/bookmark`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Bookmark toggle failed');
    } catch {
      // Revert optimistic update
      setSavedPostIds((prev) =>
        wasSaved ? [...prev, postId] : prev.filter((id) => id !== postId),
      );
      setToastMessage('Failed to update bookmark');
      setTimeout(() => setToastMessage(''), 2500);
    }
  }

  function handlePostCreated(newPost: Post) {
    setPosts(prev => [newPost, ...prev]);
    setToastMessage('Story shared with the community!');
    setTimeout(() => setToastMessage(''), 3000);
  }

  function handlePostDeleted(deletedId: number) {
    setPosts(prev => prev.filter(p => p.id !== deletedId));
    setToastMessage('Post deleted successfully');
    setTimeout(() => setToastMessage(''), 2500);
  }

  function handleTagSelect(tag: string) {
    setQuery(tag);
    router.push(`/?tag=${encodeURIComponent(tag)}`);
  }

  // Calculate Top 5 Contributors based on Engagement (posts, reactions, comments)
  const topContributors = useMemo(() => {
    const authorMap = new Map<
      number,
      {
        id: number;
        username: string;
        fullName: string | null;
        avatarUrl: string | null;
        isVerified: boolean;
        postsCount: number;
        likesCount: number;
        commentsCount: number;
      }
    >();

    // 1. Gather engagement from all feed posts
    posts.forEach((post) => {
      if (!post.author) return;
      const authorId = post.author.id;
      const likes = post._count?.likes ?? post.likes?.length ?? 0;
      const comments = post._count?.comments ?? post.comments?.length ?? 0;

      const existing = authorMap.get(authorId);
      if (existing) {
        existing.postsCount += 1;
        existing.likesCount += likes;
        existing.commentsCount += comments;
      } else {
        authorMap.set(authorId, {
          id: authorId,
          username: post.author.username,
          fullName: post.author.fullName || null,
          avatarUrl: post.author.avatarUrl || null,
          isVerified: Boolean(post.author.isVerified),
          postsCount: 1,
          likesCount: likes,
          commentsCount: comments,
        });
      }
    });

    // 2. Build list of ranked contributors
    const list: {
      id: number;
      username: string;
      fullName: string | null;
      avatarUrl: string | null;
      isVerified: boolean;
      postsCount: number;
      likesCount: number;
      engagementScore: number;
      metricLabel: string;
    }[] = [];

    authorMap.forEach((author) => {
      // Engagement formula: posts * 10 + likes * 3 + comments * 4
      const score = author.postsCount * 10 + author.likesCount * 3 + author.commentsCount * 4;
      const metricLabel =
        author.likesCount > 0
          ? `${author.likesCount} ${author.likesCount === 1 ? 'reaction' : 'reactions'}`
          : `${author.postsCount} ${author.postsCount === 1 ? 'story' : 'stories'}`;

      list.push({
        ...author,
        engagementScore: score,
        metricLabel,
      });
    });

    // 3. If fewer than 5 active posting authors, supplement with top community suggestions
    if (list.length < 5 && suggestedContributors.length > 0) {
      for (const s of suggestedContributors) {
        if (!authorMap.has(s.id)) {
          const postsCount = s.postsCount || 0;
          const followersCount = s.followersCount || 0;
          const score = postsCount * 10 + followersCount * 2 + 1;
          const metricLabel =
            postsCount > 0
              ? `${postsCount} ${postsCount === 1 ? 'story' : 'stories'}`
              : followersCount > 0
              ? `${followersCount} ${followersCount === 1 ? 'follower' : 'followers'}`
              : 'Active member';

          list.push({
            id: s.id,
            username: s.username,
            fullName: s.fullName || null,
            avatarUrl: s.avatarUrl || null,
            isVerified: Boolean(s.isVerified),
            postsCount,
            likesCount: 0,
            engagementScore: score,
            metricLabel,
          });

          if (list.length >= 5) break;
        }
      }
    }

    // Sort descending by engagement and guarantee top 5
    return list.sort((a, b) => b.engagementScore - a.engagementScore).slice(0, 5);
  }, [posts, suggestedContributors]);

  // Filter posts
  const filtered = posts.filter(post => {
    // Text / Tag query match
    const isAll = !query || query.toLowerCase() === 'all';
    const matchQuery = isAll || (post.content + ' ' + post.author.username).toLowerCase().includes(query.toLowerCase());
    if (!matchQuery) return false;

    // Mode match
    if (feedMode === 'visuals') return Boolean(post.imageUrl);
    if (feedMode === 'discussions') return (post._count?.comments ?? post.comments?.length ?? 0) > 0;
    if (feedMode === 'saved') return savedPostIds.includes(post.id);
    return true;
  });

  // Sort posts
  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'popular') {
      const likesA = a._count?.likes ?? a.likes?.length ?? 0;
      const likesB = b._count?.likes ?? b.likes?.length ?? 0;
      return likesB - likesA;
    }
    return Date.parse(b.createdAt) - Date.parse(a.createdAt);
  });

  const visualsCount = posts.filter(p => p.imageUrl).length;
  const discussionsCount = posts.filter(p => (p._count?.comments ?? p.comments?.length ?? 0) > 0).length;

  return (
    <section aria-label="Community feed" className="space-y-6">

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl bg-accent px-4 py-2.5 text-xs font-semibold text-accent-text shadow-xl animate-in fade-in slide-in-from-bottom-3 duration-200">
          {toastMessage}
        </div>
      )}

      {/* 1. Feed Composer Trigger (Hidden for logged out users) */}
      <FeedComposerTrigger onOpenModal={() => setIsCreatePostModalOpen(true)} />

      {/* 2. Community Voices: Enclosed in a Box */}
      {topContributors.length > 0 && (
        <section
          aria-label="Community voices"
          className="rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-xs dark:border-white/[0.08] dark:bg-[#0d0d0d]"
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Community Voices
            </h3>
          </div>

          <div className="grid grid-cols-5 gap-2 sm:gap-4">
            {topContributors.map((c, index) => {
              const rank = index + 1;
              const isFirst = rank === 1;
              const isSecond = rank === 2;
              const isThird = rank === 3;

              const rankBadgeClass = isFirst
                ? 'bg-amber-500 text-white font-black shadow-xs'
                : isSecond
                ? 'bg-slate-300 dark:bg-slate-200 text-slate-900 font-extrabold shadow-xs'
                : isThird
                ? 'bg-amber-700 text-white font-extrabold shadow-xs'
                : 'bg-slate-200 dark:bg-[#252525] text-slate-600 dark:text-slate-300 font-bold';

              const avatarRingClass = isFirst
                ? 'ring-2 ring-amber-400 dark:ring-amber-400'
                : isSecond
                ? 'ring-2 ring-slate-300 dark:ring-slate-500'
                : isThird
                ? 'ring-2 ring-amber-700/70'
                : 'ring-1 ring-slate-200 dark:ring-white/10';

              return (
                <Link
                  key={c.id}
                  href={`/profile/${encodeURIComponent(c.username)}`}
                  className="group flex flex-col items-center text-center transition-transform hover:scale-105"
                  title={`View ${c.fullName || c.username}'s profile (#${rank})`}
                >
                  <div className="relative inline-block">
                    <div className={`rounded-full p-0.5 ${avatarRingClass} transition-all`}>
                      <UserAvatar
                        src={mediaUrl(c.avatarUrl)}
                        name={c.fullName || c.username}
                        className="size-11 sm:size-12 rounded-full object-cover"
                        sizes="48px"
                      />
                    </div>
                    {/* Clear Overlapping Rank Badge with solid cutout ring */}
                    <span
                      className={`absolute -bottom-1 -right-1 flex h-4 min-w-4.5 items-center justify-center rounded-full px-1 text-[9px] leading-none ring-2 ring-white dark:ring-[#0d0d0d] ${rankBadgeClass}`}
                    >
                      {`#${rank}`}
                    </span>
                  </div>

                  {/* Name + Verified Rosette */}
                  <div className="mt-1.5 flex items-center justify-center gap-0.5 w-full px-1">
                    <span className="truncate text-[11px] sm:text-xs font-medium text-slate-800 dark:text-slate-200 group-hover:text-accent-fg transition-colors">
                      {c.fullName?.split(' ')[0] || c.username}
                    </span>
                    {c.isVerified && <VerifiedBadge size={10} />}
                  </div>

                  {/* Normal handle */}
                  <span className="truncate text-[10px] text-slate-400 dark:text-slate-500 w-full px-1">
                    @{c.username}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* 3. Feed Navigation & Filter Bar */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Feed Mode Tabs with Professional Lucide Vector Icons */}
          <div className="flex items-center gap-1 overflow-x-auto rounded-xl bg-slate-200/60 dark:bg-[#151515] dark:border dark:border-white/[0.06] p-1 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] max-w-full">
            <button
              type="button"
              onClick={() => setFeedMode('all')}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${feedMode === 'all'
                  ? 'bg-accent-subtle text-accent-fg border border-accent-subtle-border shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
            >
              <Compass size={15} strokeWidth={2} className="shrink-0" />
              <span>Explore</span>
              <span className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500">({posts.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setFeedMode('visuals')}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${feedMode === 'visuals'
                  ? 'bg-accent-subtle text-accent-fg border border-accent-subtle-border shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
            >
              <ImageIcon size={15} strokeWidth={2} className="shrink-0" />
              <span>Visuals</span>
              <span className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500">({visualsCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFeedMode('discussions')}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${feedMode === 'discussions'
                  ? 'bg-accent-subtle text-accent-fg border border-accent-subtle-border shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
            >
              <MessageSquare size={15} strokeWidth={2} className="shrink-0" />
              <span>Discussions</span>
              <span className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500">({discussionsCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFeedMode('saved')}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${feedMode === 'saved'
                  ? 'bg-accent-subtle text-accent-fg border border-accent-subtle-border shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
            >
              <Bookmark size={15} strokeWidth={2} className="shrink-0" />
              <span>Saved</span>
              <span className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500">({savedPostIds.length})</span>
            </button>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500">Sort:</span>
            <div className="flex rounded-lg bg-slate-200/60 dark:bg-[#151515] dark:border dark:border-white/[0.06] p-0.5">
              <button
                type="button"
                onClick={() => setSort('latest')}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${sort === 'latest' ? 'bg-accent text-accent-text shadow-2xs' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                  }`}
              >
                Latest
              </button>
              <button
                type="button"
                onClick={() => setSort('popular')}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${sort === 'popular' ? 'bg-accent text-accent-text shadow-2xs' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                  }`}
              >
                Top Liked
              </button>
            </div>
          </div>
        </div>

        {/* Search & Active Tag Filter Row */}
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex max-w-sm flex-1 items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 text-slate-400 focus-within:border-accent/40 focus-within:ring-1 focus-within:ring-accent/30 dark:border-white/[0.08] dark:bg-[#0d0d0d]">
            <Search size={16} strokeWidth={2} className="shrink-0 text-slate-400 dark:text-slate-500" />
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search posts or #tags…"
              className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none dark:text-slate-100 dark:placeholder-slate-500"
            />
          </label>

          {query && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-subtle px-3 py-1 text-xs font-semibold text-accent-fg border border-accent-subtle-border">
              <span>Filter: #{query.replace(/^#/, '')}</span>
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  router.push('/');
                }}
                className="ml-1 text-slate-400 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                aria-label="Clear active filter"
              >
                <X size={12} strokeWidth={2.5} />
              </button>
            </span>
          )}
        </div>
      </div>

      {/* 4. Posts Stream */}
      <div className="space-y-4">
        {sorted.map(post => (
          <PostCard
            key={post.id}
            post={post}
            onTagClick={handleTagSelect}
            isSaved={savedPostIds.includes(post.id)}
            onToggleSave={handleToggleSave}
            onDeleted={handlePostDeleted}
            onOpenModal={(p) => setActiveModalPost(p)}
          />
        ))}

        {sorted.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/[0.08] bg-white/50 dark:bg-[#0c0c0c] py-14 px-6 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-100 dark:bg-white/[0.05] text-slate-400 dark:text-slate-500 mb-3.5">
              {feedMode === 'saved' ? (
                <Bookmark size={22} strokeWidth={1.75} />
              ) : feedMode === 'visuals' ? (
                <ImageIcon size={22} strokeWidth={1.75} />
              ) : (
                <Compass size={22} strokeWidth={1.75} />
              )}
            </div>
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">
              {feedMode === 'saved'
                ? 'No saved posts yet'
                : feedMode === 'visuals'
                  ? 'No visual stories yet'
                  : query
                    ? 'No matching stories'
                    : 'No posts in this feed yet'}
            </h3>
            <p className="mb-4 mt-1.5 text-sm text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
              {feedMode === 'saved'
                ? 'Click the bookmark icon on any post to keep it in your saved collection.'
                : query
                  ? `No stories matched "${query}". Try exploring other tags or clear search.`
                  : 'Be the first to share a perspective or thought with the community!'}
            </p>
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(''); router.push('/'); }}
                className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-text hover:bg-accent-hover transition-colors"
              >
                Clear filter
              </button>
            )}
          </div>
        )}
      </div>

      {/* Fullscreen Post Modal (Except Top Bar with Cross Button) */}
      {activeModalPost && (
        <FullscreenPostModal
          post={activeModalPost}
          onClose={() => setActiveModalPost(null)}
          isSaved={savedPostIds.includes(activeModalPost.id)}
          onToggleSave={handleToggleSave}
          onDeleted={(id) => {
            handlePostDeleted(id);
            setActiveModalPost(null);
          }}
          onTagClick={(tag) => {
            setActiveModalPost(null);
            handleTagSelect(tag);
          }}
        />
      )}

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={isCreatePostModalOpen}
        onClose={() => setIsCreatePostModalOpen(false)}
        onPostCreated={handlePostCreated}
      />
    </section>
  );
}
