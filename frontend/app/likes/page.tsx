'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Heart, Search, ArrowRight } from 'lucide-react';
import { API_URL, Post } from '../../lib/api';
import { useReactionsSync } from '../../lib/reactions-realtime';
import { useAuth } from '../../components/auth-provider';
import { useAuthModal } from '../../components/auth-modal';
import { PostCard } from '../../components/post-card';
import { FullscreenPostModal } from '../../components/post-modal';
import { RightSidebar } from '../../components/right-sidebar';
import { Suspense } from 'react';

export default function LikedPostsPage() {
  const { user, token, ready } = useAuth();
  const { openAuthModal } = useAuthModal();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [savedPostIds, setSavedPostIds] = useState<number[]>([]);
  const [activeModalPost, setActiveModalPost] = useState<Post | null>(null);

  useEffect(() => {
    let active = true;
    if (!token) {
      setLoading(false);
      setPosts([]);
      return;
    }

    setLoading(true);

    // Fetch liked posts and saved post IDs in parallel
    Promise.all([
      fetch(`${API_URL}/posts/liked`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => (res.ok ? res.json() : [])),
      fetch(`${API_URL}/posts/bookmarks`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => (res.ok ? res.json() : [])),
    ])
      .then(([likedData, bookmarksData]) => {
        if (!active) return;
        if (Array.isArray(likedData)) setPosts(likedData);
        if (Array.isArray(bookmarksData)) setSavedPostIds(bookmarksData.map((b: Post) => b.id));
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  // Live real-time reaction synchronization across liked posts
  useReactionsSync(
    useCallback(
      (event) => {
        // If current user unliked, remove from list immediately
        if (user && event.userId === user.id && !event.liked) {
          setPosts((prev) => prev.filter((p) => p.id !== event.postId));
          return;
        }

        // If current user liked a new post that is not yet in posts, load it
        setPosts((prev) => {
          const exists = prev.some((p) => p.id === event.postId);
          if (!exists && user && event.userId === user.id && event.liked) {
            fetch(`${API_URL}/posts/${event.postId}`)
              .then((res) => (res.ok ? res.json() : null))
              .then((newPost: Post | null) => {
                if (newPost) {
                  setPosts((current) =>
                    current.some((p) => p.id === newPost.id) ? current : [newPost, ...current],
                  );
                }
              })
              .catch(() => {});
            return prev;
          }

          return prev.map((p) => {
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
                comments: p._count?.comments ?? 0,
              },
              likes: nextLikes,
            };
          });
        });

        if (activeModalPost?.id === event.postId) {
          setActiveModalPost((curr) => {
            if (!curr || curr.id !== event.postId) return curr;
            const nextLikes = event.likes || (
              event.liked
                ? [...(curr.likes || []).filter((l) => l.userId !== event.userId), { userId: event.userId, type: event.type || 'LIKE' }]
                : (curr.likes || []).filter((l) => l.userId !== event.userId)
            );
            return {
              ...curr,
              _count: {
                ...curr._count,
                likes: event.totalLikes,
                comments: curr._count?.comments ?? 0,
              },
              likes: nextLikes,
            };
          });
        }
      },
      [user, activeModalPost?.id],
    ),
  );

  async function handleToggleSave(postId: number) {
    if (!token) return;
    const wasSaved = savedPostIds.includes(postId);
    setSavedPostIds((prev) =>
      wasSaved ? prev.filter((id) => id !== postId) : [...prev, postId],
    );

    try {
      await fetch(`${API_URL}/posts/${postId}/bookmark`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      setSavedPostIds((prev) =>
        wasSaved ? [...prev, postId] : prev.filter((id) => id !== postId),
      );
    }
  }

  function handlePostDeleted(deletedId: number) {
    setPosts((prev) => prev.filter((p) => p.id !== deletedId));
  }

  const filteredPosts = useMemo(() => {
    if (!search.trim()) return posts;
    const q = search.toLowerCase();
    return posts.filter(
      (p) =>
        p.content.toLowerCase().includes(q) ||
        p.author.username.toLowerCase().includes(q) ||
        (p.author.fullName && p.author.fullName.toLowerCase().includes(q)),
    );
  }, [posts, search]);

  return (
    <div className="grid min-h-[calc(100dvh-56px)] grid-cols-1 min-[1200px]:grid-cols-[minmax(0,1fr)_310px] min-[1450px]:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 w-full bg-[#f7f8f7] px-[18px] pb-12 pt-6 md:p-[34px_36px_60px] min-[1450px]:px-12 dark:bg-[#000000]">
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
              <Heart size={14} strokeWidth={2.2} fill="currentColor" />
            </span>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-fg">
              Your Reactions
            </p>
          </div>
          <h1 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Liked Stories & Moments
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Discussions, stories, and visual highlights you have liked and supported.
          </p>
        </header>

        {/* Guest Banner */}
        {ready && !user && (
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-rose-200/80 bg-rose-50/60 p-5 dark:border-rose-900/40 dark:bg-rose-950/20">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Log in to see stories you&apos;ve liked
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Sign in to like posts, react to visual stories, and keep track of your favorites.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => openAuthModal({ title: 'Log in to view liked posts' })}
                className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-accent-text hover:bg-accent-hover transition-colors"
              >
                Log in
              </button>
              <Link
                href="/register"
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-[#151515] dark:text-slate-200 transition-colors"
              >
                Sign up
              </Link>
            </div>
          </div>
        )}

        {/* Search Bar if has posts */}
        {posts.length > 0 && (
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="relative w-full max-w-sm">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search liked stories…"
                className="w-full rounded-xl border border-slate-200/80 bg-white py-2 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-accent focus:outline-none dark:border-white/[0.08] dark:bg-[#0e0e0e] dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
              {filteredPosts.length} liked
            </span>
          </div>
        )}

        {/* Posts List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="animate-pulse rounded-2xl border border-slate-200/80 bg-white p-5 dark:border-white/[0.08] dark:bg-[#0d0d0d] space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-slate-200 dark:bg-[#1f1f1f]" />
                  <div className="space-y-1 flex-1">
                    <div className="h-3 w-28 rounded bg-slate-200 dark:bg-[#1f1f1f]" />
                    <div className="h-2.5 w-16 rounded bg-slate-200 dark:bg-[#1f1f1f]" />
                  </div>
                </div>
                <div className="h-4 w-3/4 rounded bg-slate-100 dark:bg-[#181818]" />
              </div>
            ))}
          </div>
        ) : filteredPosts.length > 0 ? (
          <div className="space-y-4">
            {filteredPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                isSaved={savedPostIds.includes(post.id)}
                onToggleSave={handleToggleSave}
                onDeleted={handlePostDeleted}
                onOpenModal={() => setActiveModalPost(post)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white dark:border-white/[0.08] dark:bg-[#0d0d0d] px-6 py-16 text-center text-sm text-slate-500 dark:text-slate-400">
            <span className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-500 dark:text-rose-400">
              <Heart size={24} strokeWidth={1.8} />
            </span>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              {search ? `No liked stories matching "${search}"` : 'No liked posts yet'}
            </h3>
            <p className="mb-5 mt-1.5 text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
              {search
                ? 'Try a different keyword or clear your search to see all your liked stories.'
                : 'Click like or react to stories and photos on your feed to revisit them anytime.'}
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full bg-accent px-5 py-2 text-xs font-semibold text-accent-text hover:bg-accent-hover transition-colors"
            >
              <span>Explore Community Feed</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        )}
      </div>

      {/* Fullscreen Post Modal */}
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
        />
      )}

      {/* Right Sidebar */}
      <Suspense fallback={<aside className="hidden min-[1200px]:block w-[310px] border-l border-slate-200/80 bg-[#fdfdfd] dark:border-white/[0.08] dark:bg-[#080808] p-6" />}>
        <RightSidebar />
      </Suspense>
    </div>
  );
}
