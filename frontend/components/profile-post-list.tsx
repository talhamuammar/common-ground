'use client';

import React, { useState, useCallback } from 'react';
import { Post } from '../lib/api';
import { useReactionsSync } from '../lib/reactions-realtime';
import { PostCard } from './post-card';
import { FullscreenPostModal } from './post-modal';

export function ProfilePostList({
  posts,
  onPostDeleted,
  savedPostIds = [],
  onToggleSave,
  onTagClick,
}: {
  posts: Post[];
  onPostDeleted?: (postId: number) => void;
  savedPostIds?: number[];
  onToggleSave?: (postId: number) => void;
  onTagClick?: (tag: string) => void;
}) {
  const [activeModalPost, setActiveModalPost] = useState<Post | null>(null);

  // Live real-time reaction synchronization across cards and modals
  useReactionsSync(
    useCallback((event) => {
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

  if (!posts.length) {
    return (
      <div className="ultranet-card p-10 text-center text-xs text-slate-500 dark:text-slate-400">
        No posts yet.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onTagClick={onTagClick}
            isSaved={savedPostIds.includes(post.id)}
            onToggleSave={onToggleSave}
            onDeleted={onPostDeleted}
            onOpenModal={(p) => setActiveModalPost(p)}
          />
        ))}
      </div>

      {/* Fullscreen Post Modal (Except Top Bar with Cross Button) */}
      {activeModalPost && (
        <FullscreenPostModal
          post={activeModalPost}
          onClose={() => setActiveModalPost(null)}
          isSaved={savedPostIds.includes(activeModalPost.id)}
          onToggleSave={onToggleSave ?? (() => { })}
          onDeleted={(id) => {
            onPostDeleted?.(id);
            setActiveModalPost(null);
          }}
          onTagClick={(tag) => {
            setActiveModalPost(null);
            onTagClick?.(tag);
          }}
        />
      )}
    </>
  );
}
