'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { X, Send, Bookmark, MessageCircle, CornerDownRight } from 'lucide-react';
import { API_URL, getErrorMessage, mediaUrl, Post, PostComment, ReactionType } from '../lib/api';
import { broadcastReaction, useReactionsSync } from '../lib/reactions-realtime';
import { relativeTime } from '../lib/time';
import { UserAvatar } from './user-avatar';
import { VerifiedBadge } from './verified-badge';
import { ReactionPicker } from './reaction-picker';
import { PostOptionsMenu } from './post-options-menu';
import { LikesModal } from './likes-modal';
import { useAuth } from './auth-provider';
import { useAuthModal } from './auth-modal';
import { PostPhotoCarousel } from './post-photo-carousel';
import { FormattedText } from './formatted-text';
import { CommentItem } from './comment-item';
import { useMentionAutocomplete, MentionSuggestions, renderEditorBackdrop } from './mention-autocomplete';

function FormattedContent({
  content,
  mentions,
  onTagClick,
  onClose,
}: {
  content: string;
  mentions?: import('../lib/api').MentionInfo[];
  onTagClick?: (tag: string) => void;
  onClose?: () => void;
}) {
  return <FormattedText content={content} mentions={mentions} onTagClick={onTagClick} onMentionClick={onClose} />;
}

export function FullscreenPostModal({
  post,
  onClose,
  isSaved,
  onToggleSave,
  onDeleted,
  onTagClick,
}: {
  post: Post;
  onClose: () => void;
  isSaved: boolean;
  onToggleSave: (postId: number) => void;
  onDeleted?: (postId: number) => void;
  onTagClick?: (tag: string) => void;
}) {
  const { user, token } = useAuth();
  const { openAuthModal } = useAuthModal();

  const [currentReaction, setCurrentReaction] = useState<ReactionType | null>(() => {
    if (!user || !post.likes) return null;
    const userLike = post.likes.find((l) => l.userId === user.id);
    return userLike ? ((userLike.type as ReactionType) || 'LIKE') : null;
  });
  const [likesCount, setLikesCount] = useState<number>(post._count?.likes ?? post.likes?.length ?? 0);
  const [reactionsList, setReactionsList] = useState(post.likes || []);
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [activeCommentLikesId, setActiveCommentLikesId] = useState<number | null>(null);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<PostComment[]>(post.comments || []);
  const [replyingTo, setReplyingTo] = useState<{ commentId: number; username: string } | null>(null);
  const commentInputRef = useRef<HTMLInputElement | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState('');

  const {
    isOpen: isMentionOpen,
    users: mentionUsers,
    loading: mentionLoading,
    selectedIndex: mentionSelectedIndex,
    query: mentionQuery,
    coordinates: mentionCoordinates,
    setSelectedIndex: setMentionSelectedIndex,
    selectUser: selectMentionUser,
    handleKeyDown: handleMentionKeyDown,
    checkMentionTrigger,
    mentionedUsers,
    setMentionedUsers,
    close: closeMention,
  } = useMentionAutocomplete({
    content: commentText,
    setContent: setCommentText,
    inputRef: commentInputRef,
  });

  const backdropRef = useRef<HTMLDivElement | null>(null);

  const activeMentions = React.useMemo(() => {
    const trimmed = commentText.trim();
    if (!trimmed) return [];
    return mentionedUsers.filter((u) => {
      const name = u.fullName || u.username;
      return (
        trimmed.toLowerCase().includes(name.toLowerCase()) ||
        trimmed.toLowerCase().includes(`@${u.username.toLowerCase()}`)
      );
    });
  }, [mentionedUsers, commentText]);

  const rawUrls: string[] = (
    post.imageUrls && post.imageUrls.length > 0
      ? post.imageUrls
      : (post.imageUrl ? [post.imageUrl] : [])
  ).map((url) => mediaUrl(url)).filter(Boolean) as string[];
  const imageUrls = Array.from(new Set(rawUrls));

  // Close on escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Sync reactions if user or post changes
  useEffect(() => {
    if (user && post.likes) {
      const userLike = post.likes.find((l) => l.userId === user.id);
      setCurrentReaction(userLike ? ((userLike.type as ReactionType) || 'LIKE') : null);
      setReactionsList(post.likes);
    }
    setLikesCount(post._count?.likes ?? post.likes?.length ?? 0);
  }, [user, post.likes, post._count?.likes]);

  // Keep comments in sync with post prop and fetch freshest comments with full mentions on open
  useEffect(() => {
    if (post.comments) {
      setComments(post.comments);
    }
  }, [post.id, post.comments]);

  useEffect(() => {
    let active = true;
    async function fetchFreshComments() {
      try {
        const res = await fetch(`${API_URL}/posts/${post.id}/comments`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) return;
        const data = await res.json();
        if (active && Array.isArray(data)) {
          setComments(data);
        }
      } catch {
        // Fallback to initial comments
      }
    }
    fetchFreshComments();
    return () => {
      active = false;
    };
  }, [post.id, token]);

  // Real-time synchronization across all tabs and components
  useReactionsSync(
    useCallback(
      (event) => {
        if (event.postId === post.id) {
          setLikesCount(event.totalLikes);
          if (event.likes) {
            setReactionsList(event.likes);
          } else {
            setReactionsList((prev) =>
              event.liked
                ? [...prev.filter((l) => l.userId !== event.userId), { userId: event.userId, type: event.type || 'LIKE' }]
                : prev.filter((l) => l.userId !== event.userId),
            );
          }
          if (user && event.userId === user.id) {
            setCurrentReaction(event.liked && event.type ? (event.type as ReactionType) : null);
          }
        }
      },
      [post.id, user],
    ),
  );

  async function handleSelectReaction(type: ReactionType) {
    if (!token) {
      openAuthModal({
        title: 'React to this story',
        description: 'Sign up or log in to react and connect with authors.',
      });
      return;
    }
    const prevReaction = currentReaction;
    const prevCount = likesCount;
    const prevList = reactionsList;

    const nextCount = prevReaction ? prevCount : prevCount + 1;
    const nextList = user
      ? [...reactionsList.filter((l) => l.userId !== user.id), { userId: user.id, type }]
      : reactionsList;

    setCurrentReaction(type);
    setLikesCount(nextCount);
    setReactionsList(nextList);

    // Broadcast immediately so background card updates in real-time
    if (user) {
      broadcastReaction({
        postId: post.id,
        userId: user.id,
        type,
        liked: true,
        totalLikes: nextCount,
        likes: nextList,
      });
    }

    try {
      const response = await fetch(`${API_URL}/posts/${post.id}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(getErrorMessage(data, 'Could not update reaction'));
      if (data.liked && data.type) {
        setCurrentReaction(data.type as ReactionType);
        if (typeof data.totalLikes === 'number') {
          setLikesCount(data.totalLikes);
        }
      }
    } catch {
      setCurrentReaction(prevReaction);
      setLikesCount(prevCount);
      setReactionsList(prevList);
      if (user) {
        broadcastReaction({
          postId: post.id,
          userId: user.id,
          type: prevReaction,
          liked: Boolean(prevReaction),
          totalLikes: prevCount,
          likes: prevList,
        });
      }
    }
  }

  async function handleRemoveReaction() {
    if (!token) {
      openAuthModal({
        title: 'React to this story',
        description: 'Sign up or log in to react and connect with authors.',
      });
      return;
    }
    const prevReaction = currentReaction;
    const prevCount = likesCount;
    const prevList = reactionsList;

    const nextCount = Math.max(0, prevCount - 1);
    const nextList = user
      ? reactionsList.filter((l) => l.userId !== user.id)
      : reactionsList;

    setCurrentReaction(null);
    setLikesCount(nextCount);
    setReactionsList(nextList);

    if (user) {
      broadcastReaction({
        postId: post.id,
        userId: user.id,
        type: null,
        liked: false,
        totalLikes: nextCount,
        likes: nextList,
      });
    }

    try {
      const response = await fetch(`${API_URL}/posts/${post.id}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type: prevReaction || 'LIKE' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(getErrorMessage(data, 'Could not update reaction'));
    } catch {
      setCurrentReaction(prevReaction);
      setLikesCount(prevCount);
      setReactionsList(prevList);
      if (user) {
        broadcastReaction({
          postId: post.id,
          userId: user.id,
          type: prevReaction,
          liked: Boolean(prevReaction),
          totalLikes: prevCount,
          likes: prevList,
        });
      }
    }
  }

  const handleStartReply = (commentId: number, username: string) => {
    if (!token) {
      openAuthModal({
        title: 'Join the discussion',
        description: 'Sign up or log in to reply to this comment.',
      });
      return;
    }
    setReplyingTo({ commentId, username });
    setCommentText((prev) => {
      const mention = `@${username} `;
      if (prev.startsWith(mention)) return prev;
      return `${mention}${prev}`;
    });
    setMentionedUsers((prev) => {
      if (prev.some((u) => u.username.toLowerCase() === username.toLowerCase())) return prev;
      return [...prev, { id: 0, username, fullName: null, avatarUrl: null }];
    });
    setTimeout(() => {
      commentInputRef.current?.focus();
    }, 50);
  };

  const handleCancelReply = () => {
    if (replyingTo) {
      setCommentText((prev) => prev.replace(new RegExp(`^@${replyingTo.username}\\s*`), ''));
      setMentionedUsers((prev) => prev.filter((u) => u.username.toLowerCase() !== replyingTo.username.toLowerCase()));
      setReplyingTo(null);
    }
  };

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    if (!token) {
      openAuthModal({
        title: 'Join the discussion',
        description: 'Sign up or log in to reply to this post.',
      });
      return;
    }

    setSubmittingComment(true);
    setCommentError('');
    try {
      const activeUsernames = Array.from(new Set(mentionedUsers.map((u) => u.username)));
      if (replyingTo && !activeUsernames.some((u) => u.toLowerCase() === replyingTo.username.toLowerCase())) {
        activeUsernames.push(replyingTo.username);
      }

      const response = await fetch(`${API_URL}/posts/${post.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: commentText.trim(),
          parentId: replyingTo?.commentId,
          mentionedUsernames: activeUsernames,
        }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error(getErrorMessage(payload, 'Could not post comment'));

      const createdComment = payload as PostComment;
      if (replyingTo) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === replyingTo.commentId
              ? {
                  ...c,
                  replies: [...(c.replies || []), createdComment],
                  _count: {
                    ...c._count,
                    likes: c._count?.likes ?? 0,
                    replies: (c.replies?.length ?? c._count?.replies ?? 0) + 1,
                  },
                }
              : c
          )
        );
      } else {
        setComments((prev) => [...prev, createdComment]);
      }
      setCommentText('');
      setMentionedUsers([]);
      closeMention();
      setReplyingTo(null);
    } catch (cause) {
      setCommentError(cause instanceof Error ? cause.message : 'Could not post comment');
    } finally {
      setSubmittingComment(false);
    }
  }

  const totalCommentsCount = comments.reduce(
    (acc, c) => acc + 1 + (c.replies?.length || c._count?.replies || 0),
    0
  );

  const hasPhotos = imageUrls.length > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Full post view"
      className={`fixed top-14 inset-x-0 bottom-0 z-40 flex items-center justify-center bg-black/85 backdrop-blur-xs animate-in fade-in duration-200 ${
        hasPhotos ? 'p-0 md:p-4 lg:p-6' : 'p-3 sm:p-4 md:p-6'
      }`}
      onClick={onClose}
    >
      {/* Top Bar Cross Close Button for photo posts (desktop only - mobile uses header close button) */}
      {hasPhotos && (
        <button
          type="button"
          onClick={onClose}
          className="hidden md:grid absolute right-4 top-4 z-50 size-10 place-items-center rounded-full bg-black/75 text-white shadow-xl hover:bg-black hover:scale-105 border border-white/20 transition-all cursor-pointer"
          aria-label="Close full post view"
        >
          <X size={20} strokeWidth={2.2} />
        </button>
      )}

      {/* Main Modal Window */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={
          hasPhotos
            ? 'relative flex flex-col md:flex-row w-full h-[calc(100dvh-3.5rem)] md:h-full md:max-h-[calc(100dvh-80px)] max-w-6xl rounded-none md:rounded-2xl border-0 md:border border-slate-200/80 dark:border-white/[0.1] bg-white dark:bg-[#0d0d0d] shadow-2xl overflow-hidden animate-in zoom-in-[0.98] duration-150'
            : 'relative flex flex-col w-full max-w-xl sm:max-w-2xl max-h-[88dvh] rounded-2xl border border-slate-200/80 dark:border-white/[0.1] bg-white dark:bg-[#121212] shadow-2xl overflow-hidden animate-in zoom-in-[0.98] duration-150 my-auto'
        }
      >
        {/* Left Side: Photo Carousel with Instagram Navigator */}
        {hasPhotos && (
          <div className="w-full md:w-3/5 lg:w-[64%] h-[32vh] sm:h-[40vh] md:h-full bg-black flex items-center justify-center select-none overflow-hidden relative shrink-0">
            <PostPhotoCarousel
              imageUrls={imageUrls}
              className="w-full h-full rounded-none border-0 bg-transparent"
              containerHeightClass="h-full"
            />
          </div>
        )}

        {/* Post Metadata, Discussion & Interactions */}
        <div
          className={`flex flex-col bg-white dark:bg-[#121212] overflow-hidden flex-1 min-h-0 ${
            hasPhotos
              ? 'w-full md:w-2/5 lg:w-[36%] md:h-full border-t md:border-t-0 md:border-l border-slate-200 dark:border-white/[0.08]'
              : 'w-full'
          }`}
        >
          {/* Header */}
          <header className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-white/[0.08] shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <Link href={`/profile/${encodeURIComponent(post.author.username)}`} onClick={onClose}>
                <UserAvatar
                  src={mediaUrl(post.author.avatarUrl)}
                  name={post.author.fullName || post.author.username}
                  className="size-10 rounded-full shrink-0 text-xs font-semibold"
                  sizes="40px"
                />
              </Link>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Link
                    href={`/profile/${encodeURIComponent(post.author.username)}`}
                    onClick={onClose}
                    className="truncate text-sm font-bold text-slate-800 dark:text-slate-100 hover:underline flex items-center gap-1"
                  >
                    <span>{post.author.fullName || post.author.username}</span>
                    {post.author.isVerified && <VerifiedBadge size={14} />}
                  </Link>
                </div>
                <time className="text-xs text-slate-400 dark:text-slate-500" dateTime={post.createdAt}>
                  {relativeTime(post.createdAt)}
                </time>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <PostOptionsMenu
                postId={post.id}
                authorId={post.author.id}
                currentUserId={user?.id}
                token={token}
                onDeleted={(id) => {
                  if (onDeleted) onDeleted(id);
                  onClose();
                }}
              />
              <button
                type="button"
                onClick={onClose}
                className="grid size-8 place-items-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-white/[0.08] transition-colors cursor-pointer ml-1"
                aria-label="Close modal"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>
          </header>

          {/* Scrollable Body: Post Content & Comments Thread */}
          <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-5 space-y-4 [scrollbar-width:thin]">
            {/* Post Content */}
            {post.content && post.content.trim().length > 0 && (
              <div className="text-[15px] sm:text-[16px] leading-relaxed text-slate-800 dark:text-slate-200 [overflow-wrap:anywhere]">
                <FormattedContent
                  content={post.content}
                  mentions={post.mentions}
                  onTagClick={(tag) => {
                    onClose();
                    if (onTagClick) onTagClick(tag);
                  }}
                  onClose={onClose}
                />
              </div>
            )}

            {/* Post Reactions & Save Engagement Bar (Upper of Comments) */}
            <div className="flex items-center justify-between gap-2 border-y border-slate-100 dark:border-white/[0.08] py-2 my-2">
              <div className="flex items-center gap-2">
                <ReactionPicker
                  currentReaction={currentReaction}
                  reactionsList={reactionsList}
                  totalCount={likesCount}
                  onSelectReaction={handleSelectReaction}
                  onRemoveReaction={handleRemoveReaction}
                  onOpenLikesModal={() => setShowLikesModal(true)}
                  dockDirection="down"
                />

                <span className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-semibold text-slate-600 dark:text-slate-400">
                  <MessageCircle size={16} strokeWidth={1.9} />
                  <span>{totalCommentsCount}</span>
                </span>
              </div>

              <button
                type="button"
                onClick={() => onToggleSave(post.id)}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-medium transition-colors cursor-pointer ${isSaved
                    ? 'text-accent-fg bg-accent-subtle border border-accent-subtle-border font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06]'
                  }`}
              >
                <Bookmark size={16} fill={isSaved ? 'currentColor' : 'none'} strokeWidth={isSaved ? 0 : 1.9} />
                <span>{isSaved ? 'Saved' : 'Save'}</span>
              </button>
            </div>

            {/* Comments Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Comments ({totalCommentsCount})
              </h4>

              {comments.length > 0 ? (
                <div className="space-y-3">
                  {comments.map((c) => (
                    <CommentItem
                      key={c.id}
                      comment={c}
                      onReply={handleStartReply}
                      onOpenLikesModal={(cid) => setActiveCommentLikesId(cid)}
                      onTagClick={(tag) => {
                        onClose();
                        if (onTagClick) onTagClick(tag);
                      }}
                      onCloseParentModal={onClose}
                    />
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-slate-400 dark:text-slate-500">
                  No comments yet. Start the conversation!
                </p>
              )}
            </div>
          </div>

          {/* Sticky Footer: Reply / Comment Input */}
          <footer className="border-t border-slate-100 dark:border-white/[0.08] p-3 sm:p-3.5 bg-slate-50/50 dark:bg-[#0f0f0f] shrink-0">
            {/* Comment Form in Modal */}
            {token ? (
              <div className="flex flex-col">
                {replyingTo && (
                  <div className="flex items-center justify-between rounded-lg bg-accent-subtle px-2.5 py-1 text-xs text-accent-fg mb-2 border border-accent-subtle-border animate-in fade-in duration-150">
                    <div className="flex items-center gap-1.5 truncate">
                      <CornerDownRight size={13} className="text-accent-fg shrink-0" />
                      <span className="truncate">
                        Replying to <span className="font-semibold">@{replyingTo.username}</span>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCancelReply}
                      className="shrink-0 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      title="Cancel reply"
                      aria-label="Cancel reply"
                    >
                      <X size={13} />
                    </button>
                  </div>
                )}

                <form onSubmit={handleAddComment} className="flex items-center gap-2 relative">
                  <MentionSuggestions
                    isOpen={isMentionOpen}
                    users={mentionUsers}
                    loading={mentionLoading}
                    selectedIndex={mentionSelectedIndex}
                    query={mentionQuery}
                    coordinates={mentionCoordinates}
                    onSelectUser={selectMentionUser}
                    onHoverIndex={setMentionSelectedIndex}
                    placement="top"
                  />

                  <UserAvatar
                    src={mediaUrl(user?.avatarUrl)}
                    name={user?.fullName || user?.username || 'U'}
                    className="size-8 rounded-full text-xs shrink-0"
                    sizes="32px"
                  />
                  <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-1.5 focus-within:ring-1 focus-within:ring-accent/30 dark:border-white/[0.08] dark:bg-[#181818] dark:focus-within:ring-accent/30 transition-all">
                    <div className="relative flex-1 flex items-center min-w-0">
                      {/* Highlight backdrop: shows mentions in bold text in real-time inside the comment box */}
                      <div
                        ref={backdropRef}
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 flex items-center overflow-hidden whitespace-pre font-sans text-sm text-slate-800 dark:text-slate-100 select-none p-0 m-0 border-0"
                      >
                        {renderEditorBackdrop(commentText, activeMentions)}
                      </div>

                      <input
                        ref={commentInputRef}
                        type="text"
                        value={commentText}
                        onChange={(e) => {
                          setCommentText(e.target.value);
                          checkMentionTrigger();
                          if (backdropRef.current) {
                            backdropRef.current.scrollLeft = e.target.scrollLeft;
                          }
                        }}
                        onSelect={(e) => {
                          if (backdropRef.current) {
                            backdropRef.current.scrollLeft = (e.target as HTMLInputElement).scrollLeft;
                          }
                        }}
                        onScroll={(e) => {
                          if (backdropRef.current) {
                            backdropRef.current.scrollLeft = e.currentTarget.scrollLeft;
                          }
                        }}
                        onKeyDown={(e) => {
                          const handled = handleMentionKeyDown(e);
                          if (handled) return;
                        }}
                        placeholder={replyingTo ? `Reply to @${replyingTo.username}…` : 'Write a thoughtful reply…'}
                        className={`relative w-full bg-transparent font-sans text-sm p-0 m-0 border-0 outline-none ${
                          (activeMentions.length > 0 || /@[a-zA-Z0-9_]+/i.test(commentText)) && commentText
                            ? 'text-transparent caret-slate-900 dark:caret-white'
                            : 'text-slate-800 dark:text-slate-100'
                        } placeholder:text-slate-400 dark:placeholder:text-slate-500`}
                        maxLength={300}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submittingComment || !commentText.trim()}
                      className="flex items-center gap-1 shrink-0 rounded-lg bg-accent px-3.5 py-1.5 text-xs font-semibold text-accent-text transition-opacity disabled:opacity-30 hover:bg-accent-hover cursor-pointer"
                    >
                      <Send size={12} strokeWidth={2} />
                      <span>{submittingComment ? '…' : replyingTo ? 'Reply' : 'Post'}</span>
                    </button>
                  </div>
                </form>

                {/* Active Mentions Chips */}
                {activeMentions.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1.5 px-0.5 animate-in fade-in duration-150">
                    <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Mentioned:
                    </span>
                    {activeMentions.map((u) => (
                      <span
                        key={u.username}
                        className="inline-flex items-center gap-1 pl-1.5 pr-2 py-0.5 rounded-full bg-accent/10 dark:bg-accent/20 border border-accent/25 text-accent-fg text-[11px] font-bold shadow-xs"
                      >
                        <UserAvatar
                          src={mediaUrl(u.avatarUrl)}
                          name={u.fullName || u.username}
                          className="size-3.5 rounded-full text-[8px]"
                          sizes="14px"
                        />
                        <span>{u.fullName || u.username}</span>
                        {u.isVerified && <VerifiedBadge size={10} />}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200/80 bg-slate-100/60 p-3 text-center dark:border-white/[0.08] dark:bg-[#151515]">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                  Sign in to reply and join the discussion.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    openAuthModal({
                      title: 'Join the discussion',
                      description: 'Sign up or log in to reply to this post.',
                    })
                  }
                  className="rounded-lg bg-accent px-3.5 py-1.5 text-xs font-semibold text-accent-text hover:bg-accent-hover transition-colors cursor-pointer"
                >
                  Log in or Sign up
                </button>
              </div>
            )}

            {commentError && <p className="text-xs text-rose-600 dark:text-rose-400">{commentError}</p>}
          </footer>
        </div>
      </div>

      {/* Post Likes Modal */}
      {showLikesModal && (
        <LikesModal
          postId={post.id}
          isOpen={showLikesModal}
          onClose={() => setShowLikesModal(false)}
        />
      )}

      {/* Comment Likes Modal */}
      {activeCommentLikesId !== null && (
        <LikesModal
          commentId={activeCommentLikesId}
          isOpen={activeCommentLikesId !== null}
          onClose={() => setActiveCommentLikesId(null)}
        />
      )}
    </div>
  );
}
