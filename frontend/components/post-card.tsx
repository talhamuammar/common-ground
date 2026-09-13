'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Bookmark, MessageCircle, Send, CornerDownRight, X } from 'lucide-react';
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

export function PostCard({
  post,
  onTagClick,
  isSaved,
  onToggleSave,
  onDeleted,
  onOpenModal,
  defaultShowComments = false,
}: {
  post: Post;
  onTagClick?: (tag: string) => void;
  isSaved?: boolean;
  onToggleSave?: (postId: number) => void;
  onDeleted?: (postId: number) => void;
  onOpenModal?: (post: Post) => void;
  defaultShowComments?: boolean;
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
  const [showComments, setShowComments] = useState(defaultShowComments);
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

  useEffect(() => {
    if (user && post.likes) {
      const userLike = post.likes.find((l) => l.userId === user.id);
      setCurrentReaction(userLike ? ((userLike.type as ReactionType) || 'LIKE') : null);
      setReactionsList(post.likes);
    }
    setLikesCount(post._count?.likes ?? post.likes?.length ?? 0);
  }, [user, post.likes, post._count?.likes]);

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
        description: 'Sign up or log in to react, connect with authors, and share your perspective.',
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

    // Broadcast immediately so all other cards/modals update with zero latency
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
        description: 'Sign up or log in to react, connect with authors, and share your perspective.',
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
    setShowComments(true);
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
        description: 'Sign up or log in to reply to this post and share your thoughts.',
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

  const handlePhotoClick = () => {
    if (onOpenModal) {
      onOpenModal(post);
    } else {
      setShowComments(true);
    }
  };

  const totalCommentsCount = comments.reduce(
    (acc, c) => acc + 1 + (c.replies?.length || c._count?.replies || 0),
    0
  );

  const rawUrls: string[] = (
    post.imageUrls && post.imageUrls.length > 0
      ? post.imageUrls
      : (post.imageUrl ? [post.imageUrl] : [])
  ).map((url) => mediaUrl(url)).filter(Boolean) as string[];
  const imageUrls = Array.from(new Set(rawUrls));

  return (
    <article
      id={'post-' + post.id}
      className="group relative scroll-mt-20 rounded-2xl border border-slate-200/80 bg-white/95 p-4 sm:p-5 shadow-[0_2px_14px_rgba(0,0,0,0.03)] transition-all duration-200 hover:border-slate-300 hover:shadow-[0_8px_26px_rgba(0,0,0,0.05)] dark:border-white/[0.08] dark:bg-[#0d0d0d] dark:shadow-[0_4px_20px_rgba(0,0,0,0.5)] dark:hover:border-white/[0.15]"
    >
      {/* Post Header */}
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={`/profile/${encodeURIComponent(post.author.username)}`}
            className="relative shrink-0"
            aria-label={`View ${post.author.username}'s profile`}
          >
            <UserAvatar
              src={post.author.avatarUrl}
              name={post.author.fullName || post.author.username}
              className="size-10 rounded-full border border-slate-100 bg-slate-100 text-xs font-semibold text-slate-700 dark:border-white/[0.1] dark:bg-[#151515] dark:text-slate-200"
            />
          </Link>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link
                href={`/profile/${encodeURIComponent(post.author.username)}`}
                className="truncate text-[15px] sm:text-[16px] font-bold text-slate-800 hover:text-accent-fg dark:text-slate-100 hover:underline flex items-center gap-1"
              >
                <span>{post.author.fullName || post.author.username}</span>
                {post.author.isVerified && <VerifiedBadge size={15} />}
              </Link>
            </div>
            <p className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
              <Link
                href={`/post/${post.id}`}
                className="hover:underline hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                title="View direct post link"
              >
                <time dateTime={post.createdAt}>{relativeTime(post.createdAt)}</time>
              </Link>
              <span>·</span>
              <span>Community</span>
            </p>
          </div>
        </div>

        <PostOptionsMenu
          postId={post.id}
          authorId={post.author.id}
          currentUserId={user?.id}
          token={token}
          onDeleted={onDeleted}
        />
      </header>

      {/* Post Text Content */}
      {post.content && post.content.trim().length > 0 && (
        <div className="my-3.5 text-[15px] sm:text-[16px] leading-relaxed text-slate-800 dark:text-slate-100 [overflow-wrap:anywhere]">
          <FormattedText content={post.content} mentions={post.mentions} onTagClick={onTagClick} />
        </div>
      )}

      {/* Attached Photos: Instagram-style Carousel with Navigator */}
      {imageUrls.length > 0 && (
        <div className="my-3 w-full">
          <PostPhotoCarousel
            imageUrls={imageUrls}
            onPhotoClick={handlePhotoClick}
          />
        </div>
      )}

      {/* Engagement Footer */}
      <footer className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-white/[0.08]">
        <div className="flex items-center gap-1 sm:gap-2">
          {/* 3D Reaction Dock (Like, Love, Celebrate, Haha, Wow, Care) */}
          <ReactionPicker
            currentReaction={currentReaction}
            reactionsList={reactionsList}
            totalCount={likesCount}
            onSelectReaction={handleSelectReaction}
            onRemoveReaction={handleRemoveReaction}
            onOpenLikesModal={() => setShowLikesModal(true)}
          />

          {/* Comment Button */}
          <button
            type="button"
            onClick={() => {
              if (onOpenModal) {
                onOpenModal(post);
              } else {
                setShowComments((prev) => !prev);
              }
            }}
            className={`flex items-center gap-1.5 rounded-full px-2.5 sm:px-3 py-1 text-sm font-semibold transition-colors cursor-pointer ${showComments
                ? 'bg-slate-100 text-slate-900 dark:bg-white/[0.08] dark:text-slate-100'
                : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-slate-200'
              }`}
            aria-label="View comments"
          >
            <MessageCircle size={16} strokeWidth={1.9} />
            <span>{totalCommentsCount}</span>
          </button>
        </div>

        {/* Save / Bookmark Button */}
        {onToggleSave && (
          <button
            type="button"
            onClick={() => onToggleSave(post.id)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs sm:text-[13px] transition-colors cursor-pointer ${isSaved
                ? 'text-accent-fg bg-accent-subtle border border-accent-subtle-border font-bold'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            title={isSaved ? 'Remove from saved' : 'Save post'}
            aria-label={isSaved ? 'Remove from saved' : 'Save post'}
          >
            <Bookmark size={15} fill={isSaved ? 'currentColor' : 'none'} strokeWidth={isSaved ? 0 : 1.9} />
            <span className="hidden sm:inline font-medium">{isSaved ? 'Saved' : 'Save'}</span>
          </button>
        )}
      </footer>

      {/* Expandable Comments Drawer */}
      {showComments && (
        <div className="mt-3.5 border-t border-slate-100 dark:border-white/[0.08] pt-3">
          {/* Comment Form */}
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

              <form onSubmit={handleAddComment} className="flex items-center gap-2.5 relative">
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
                  src={user?.avatarUrl}
                  name={user?.fullName || user?.username || 'U'}
                  className="size-8 rounded-full text-xs shrink-0"
                />
                <div className="flex flex-1 items-center gap-2 rounded-xl border border-transparent bg-slate-100/80 px-3 py-1.5 focus-within:bg-white focus-within:ring-1 focus-within:ring-accent/30 dark:border-white/[0.08] dark:bg-[#151515] dark:focus-within:bg-[#1c1c1c] dark:focus-within:ring-accent/30 transition-all">
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
                      placeholder={replyingTo ? `Reply to @${replyingTo.username}…` : 'Write a thoughtful comment or reply…'}
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
                    className="flex items-center gap-1 shrink-0 rounded-lg bg-accent px-3 py-1 text-xs font-semibold text-accent-text transition-opacity disabled:opacity-30 hover:bg-accent-hover cursor-pointer"
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
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 text-center dark:border-white/[0.08] dark:bg-[#151515]">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Join the conversation to share your reply.
              </p>
              <div className="mt-2 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    openAuthModal({
                      title: 'Join the discussion',
                      description: 'Sign up or log in to reply to this post and share your thoughts.',
                    })
                  }
                  className="rounded-lg bg-accent px-3.5 py-1.5 text-xs font-semibold text-accent-text hover:bg-accent-hover transition-colors cursor-pointer"
                >
                  Log in or Sign up
                </button>
              </div>
            </div>
          )}

          {commentError && <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{commentError}</p>}

          {/* Comment List */}
          {comments.length > 0 && (
            <div className="mt-3.5 space-y-3 pl-1">
              {comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  onReply={handleStartReply}
                  onOpenLikesModal={(cid) => setActiveCommentLikesId(cid)}
                  onTagClick={onTagClick}
                />
              ))}
            </div>
          )}
        </div>
      )}

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
    </article>
  );
}
