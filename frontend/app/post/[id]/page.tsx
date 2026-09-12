'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, AlertCircle, Home } from 'lucide-react';
import { API_URL, Post } from '../../../lib/api';
import { PostCard } from '../../../components/post-card';
import { FullscreenPostModal } from '../../../components/post-modal';
import { useAuth } from '../../../components/auth-provider';
import { useAuthModal } from '../../../components/auth-modal';

export default function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const postId = Number(resolvedParams.id);
  const router = useRouter();
  const { token } = useAuth();
  const { openAuthModal } = useAuthModal();

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedPostIds, setSavedPostIds] = useState<number[]>([]);
  const [activeModalPost, setActiveModalPost] = useState<Post | null>(null);

  // Fetch the post
  useEffect(() => {
    if (!postId || isNaN(postId)) {
      setError('Invalid post link');
      setLoading(false);
      return;
    }

    let isMounted = true;
    async function loadPost() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/posts/${postId}`);
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error('This post could not be found. It may have been deleted or the link is incorrect.');
          }
          throw new Error('Could not load this post.');
        }
        const data: Post = await res.json();
        if (isMounted) {
          setPost(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load post');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadPost();
    return () => {
      isMounted = false;
    };
  }, [postId]);

  // Fetch user's saved posts list if logged in
  useEffect(() => {
    if (!token) {
      setSavedPostIds([]);
      return;
    }
    fetch(`${API_URL}/posts/bookmarks`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((savedPosts: Post[]) => {
        if (Array.isArray(savedPosts)) {
          setSavedPostIds(savedPosts.map((p) => p.id));
        }
      })
      .catch(() => {});
  }, [token]);

  // Scroll to comment if URL has #comment-{id}
  useEffect(() => {
    if (!post || typeof window === 'undefined') return;
    const hash = window.location.hash;
    if (hash && hash.startsWith('#comment-')) {
      setTimeout(() => {
        const commentId = hash.slice(1);
        const el = document.getElementById(commentId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-accent', 'transition-all');
          setTimeout(() => el.classList.remove('ring-2', 'ring-accent'), 2500);
        }
      }, 350);
    }
  }, [post]);

  async function handleToggleSave(id: number) {
    if (!token) {
      openAuthModal({
        title: 'Save to your collection',
        description: 'Create an account or sign in to save stories and posts.',
      });
      return;
    }

    const wasSaved = savedPostIds.includes(id);
    setSavedPostIds((prev) => (wasSaved ? prev.filter((pId) => pId !== id) : [...prev, id]));

    try {
      await fetch(`${API_URL}/posts/${id}/bookmark`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Revert on error
      setSavedPostIds((prev) => (wasSaved ? [...prev, id] : prev.filter((pId) => pId !== id)));
    }
  }

  function handlePostDeleted() {
    router.push('/');
  }

  return (
    <div className="min-h-[calc(100dvh-56px)] w-full bg-[#f7f8f7] dark:bg-[#000000] text-slate-900 dark:text-slate-100 antialiased">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
        {/* Top Breadcrumb Navigation */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0c0f0d] px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs hover:border-slate-300 dark:hover:border-white/20 hover:text-slate-900 dark:hover:text-white transition-all"
          >
            <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
            <span>Back to community</span>
          </Link>

          <span className="text-xs text-slate-400 dark:text-slate-500">
            Post #{postId}
          </span>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0d0d0d] p-5 sm:p-6 shadow-xs animate-pulse">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-full bg-slate-200 dark:bg-[#1a1a1a]" />
                <div className="space-y-2 flex-1">
                  <div className="h-3.5 w-32 rounded bg-slate-200 dark:bg-[#1a1a1a]" />
                  <div className="h-2.5 w-20 rounded bg-slate-200 dark:bg-[#1a1a1a]" />
                </div>
              </div>
              <div className="mt-4 space-y-2.5">
                <div className="h-4 w-full rounded bg-slate-200 dark:bg-[#1a1a1a]" />
                <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-[#1a1a1a]" />
              </div>
              <div className="mt-6 h-10 w-full rounded-xl bg-slate-100 dark:bg-[#141414]" />
            </div>
          </div>
        )}

        {/* Error / 404 State */}
        {!loading && error && (
          <div className="rounded-2xl border border-slate-200/90 dark:border-white/[0.08] bg-white dark:bg-[#0c100d] p-8 sm:p-12 text-center shadow-xs">
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 mb-4">
              <AlertCircle size={24} />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Post not found
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              {error}
            </p>
            <div className="mt-6">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-xl bg-accent text-accent-text px-4 py-2.5 text-xs font-semibold shadow-xs hover:bg-accent-hover transition-colors"
              >
                <Home size={15} />
                <span>Return to Feed</span>
              </Link>
            </div>
          </div>
        )}

        {/* Success Post Render */}
        {!loading && post && (
          <div className="space-y-6">
            <PostCard
              post={post}
              isSaved={savedPostIds.includes(post.id)}
              onToggleSave={handleToggleSave}
              onDeleted={handlePostDeleted}
              onOpenModal={(p) => setActiveModalPost(p)}
              defaultShowComments={true}
            />
          </div>
        )}
      </div>

      {/* Lightbox / Modal for photos */}
      {activeModalPost && (
        <FullscreenPostModal
          post={activeModalPost}
          onClose={() => setActiveModalPost(null)}
          isSaved={savedPostIds.includes(activeModalPost.id)}
          onToggleSave={handleToggleSave}
          onDeleted={handlePostDeleted}
        />
      )}
    </div>
  );
}
