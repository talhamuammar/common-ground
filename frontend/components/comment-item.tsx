'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Pencil,
  Trash2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { PostComment, mediaUrl, API_URL, getErrorMessage } from '../lib/api';
import { relativeTime } from '../lib/time';
import { UserAvatar } from './user-avatar';
import { VerifiedBadge } from './verified-badge';
import { CommentReactions } from './comment-reactions';
import { FormattedText } from './formatted-text';
import { useAuth } from './auth-provider';
import { InlineReplyBox } from './inline-reply-box';

interface CommentItemProps {
  comment: PostComment;
  onReply: (parentId: number, username: string, targetId?: number) => void;
  onOpenLikesModal: (commentId: number) => void;
  onTagClick?: (tag: string) => void;
  onCloseParentModal?: () => void;
  onCommentUpdated?: (updated: PostComment) => void;
  onCommentDeleted?: (commentId: number, parentId?: number | null) => void;
  activeReplyTarget?: { parentId: number; targetId: number; username: string } | null;
  onCancelReply?: () => void;
  onSubmitReply?: (parentId: number, text: string, mentionedUsernames: string[]) => Promise<void>;
}

export function CommentItem({
  comment,
  onReply,
  onOpenLikesModal,
  onTagClick,
  onCloseParentModal,
  onCommentUpdated,
  onCommentDeleted,
  activeReplyTarget,
  onCancelReply,
  onSubmitReply,
}: CommentItemProps) {
  const { user, token } = useAuth();
  const replies = comment.replies || [];
  const replyCount = replies.length || (comment._count?.replies ?? 0);
  const [showReplies, setShowReplies] = useState(true);

  // Automatically expand replies if user is replying to something in this thread
  useEffect(() => {
    if (activeReplyTarget?.parentId === comment.id) {
      setShowReplies(true);
    }
  }, [activeReplyTarget, comment.id]);

  // Main comment edit & delete states
  const isAuthor = user?.id === comment.author.id;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const menuRef = useRef<HTMLDivElement | null>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
        setConfirmDelete(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener('pointerdown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
    };
  }, [isMenuOpen]);

  // Focus textarea when editing starts
  useEffect(() => {
    if (isEditing) {
      setEditText(comment.content);
      setTimeout(() => {
        if (editTextareaRef.current) {
          editTextareaRef.current.focus();
          editTextareaRef.current.setSelectionRange(
            editTextareaRef.current.value.length,
            editTextareaRef.current.value.length,
          );
        }
      }, 50);
    }
  }, [isEditing, comment.content]);

  async function handleSaveEdit() {
    const trimmed = editText.trim();
    if (!trimmed) {
      setEditError('Comment cannot be empty');
      return;
    }
    if (!token) return;

    setIsSaving(true);
    setEditError('');
    try {
      const res = await fetch(`${API_URL}/posts/comments/${comment.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: trimmed }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(getErrorMessage(data, 'Failed to update comment'));
      }

      setIsEditing(false);
      if (onCommentUpdated) {
        onCommentUpdated(data as PostComment);
      }
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Could not save comment');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteComment() {
    if (!token) return;
    setIsDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch(`${API_URL}/posts/comments/${comment.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(getErrorMessage(data, 'Failed to delete comment'));
      }

      setIsMenuOpen(false);
      setConfirmDelete(false);
      if (onCommentDeleted) {
        onCommentDeleted(comment.id, comment.parentId ?? null);
      }
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not delete comment');
      setIsDeleting(false);
    }
  }

  return (
    <div id={`comment-${comment.id}`} className="group/comment flex flex-col space-y-2 scroll-mt-24 rounded-xl transition-all">
      {/* Main / Parent Comment */}
      <div className="flex items-start gap-2.5">
        <Link
          href={`/profile/${encodeURIComponent(comment.author.username)}`}
          onClick={onCloseParentModal}
          className="shrink-0 mt-0.5"
        >
          <UserAvatar
            src={mediaUrl(comment.author.avatarUrl)}
            name={comment.author.fullName || comment.author.username}
            className="size-7 sm:size-8 rounded-full text-[10px] font-semibold border border-slate-100 dark:border-white/[0.08]"
            sizes="32px"
          />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="rounded-xl bg-slate-50 dark:bg-[#151515] p-2.5 sm:p-3 border border-slate-100/80 dark:border-white/[0.06] hover:border-slate-200 dark:hover:border-white/[0.1] transition-colors relative">
            {/* Author info & timestamp & options menu */}
            <div className="flex items-center justify-between gap-1 mb-1">
              <div className="flex items-center gap-1 truncate min-w-0">
                <Link
                  href={`/profile/${encodeURIComponent(comment.author.username)}`}
                  onClick={onCloseParentModal}
                  className="group/name text-sm sm:text-[14px] font-bold text-slate-900 dark:text-white inline-flex items-center gap-1 shrink-0"
                >
                  <span className="group-hover/name:underline">{comment.author.fullName || comment.author.username}</span>
                  {comment.author.isVerified && <VerifiedBadge size={13} />}
                </Link>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-normal truncate">
                  @{comment.author.username}
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0 ml-2">
                <time className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500" dateTime={comment.createdAt}>
                  {relativeTime(comment.createdAt)}
                </time>

                {/* Comment author options menu */}
                {isAuthor && !isEditing && (
                  <div ref={menuRef} className="relative inline-flex items-center ml-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(!isMenuOpen);
                        setConfirmDelete(false);
                      }}
                      className="grid size-6 place-items-center rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-white/[0.08] transition-colors cursor-pointer opacity-70 group-hover/comment:opacity-100"
                      aria-label="Comment options"
                    >
                      <MoreHorizontal size={14} />
                    </button>

                    {isMenuOpen && (
                      <div
                        role="menu"
                        className="absolute right-0 top-full mt-1 w-36 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#141414] p-1 shadow-xl z-40 animate-in fade-in zoom-in-95 duration-150"
                      >
                        {!confirmDelete ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setIsMenuOpen(false);
                                setIsEditing(true);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                            >
                              <Pencil size={13} className="text-slate-400 shrink-0" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDelete(true)}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                            >
                              <Trash2 size={13} className="shrink-0" />
                              <span>Delete</span>
                            </button>
                          </>
                        ) : (
                          <div className="p-1 space-y-1">
                            <p className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 px-1">
                              Delete comment?
                            </p>
                            {deleteError && (
                              <p className="text-[10px] text-rose-500 flex items-center gap-0.5">
                                <AlertCircle size={9} /> {deleteError}
                              </p>
                            )}
                            <div className="flex items-center gap-1 pt-0.5">
                              <button
                                type="button"
                                disabled={isDeleting}
                                onClick={handleDeleteComment}
                                className="flex-1 rounded bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold py-1 transition-colors disabled:opacity-50 cursor-pointer"
                              >
                                {isDeleting ? '…' : 'Delete'}
                              </button>
                              <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => setConfirmDelete(false)}
                                className="rounded border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 text-[10px] py-1 px-1.5 transition-colors cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Comment Text OR Inline Editor */}
            {isEditing ? (
              <div className="mt-1 space-y-2">
                <textarea
                  ref={editTextareaRef}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full resize-none rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-[#1a1a1a] p-2 text-xs sm:text-[13px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-accent-fg focus:ring-1 focus:ring-accent-fg leading-relaxed"
                  rows={2}
                />
                {editError && (
                  <p className="text-[11px] text-rose-500">{editError}</p>
                )}
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => {
                      setIsEditing(false);
                      setEditText(comment.content);
                      setEditError('');
                    }}
                    className="rounded-lg border border-slate-200 dark:border-white/10 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isSaving || !editText.trim()}
                    onClick={handleSaveEdit}
                    className="inline-flex items-center gap-1 rounded-lg bg-accent px-3 py-1 text-[11px] font-bold text-accent-text hover:bg-accent-hover transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSaving && <Loader2 size={11} className="animate-spin" />}
                    <span>{isSaving ? 'Saving…' : 'Save'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-slate-700 dark:text-slate-300 text-[13px] sm:text-[13.5px] leading-relaxed [overflow-wrap:anywhere]">
                <FormattedText
                  content={comment.content}
                  mentions={comment.mentions}
                  onTagClick={onTagClick}
                  onMentionClick={onCloseParentModal}
                />
              </p>
            )}

            {/* Actions: Reactions Dock + Reply Button (when not editing) */}
            {!isEditing && (
              <div className="mt-2 flex items-center gap-2">
                <CommentReactions
                  commentId={comment.id}
                  initialLikes={comment.likes}
                  totalLikes={comment._count?.likes ?? comment.likes?.length ?? 0}
                  onOpenLikesModal={onOpenLikesModal}
                />

                <button
                  type="button"
                  onClick={() => onReply(comment.id, comment.author.username, comment.id)}
                  className="inline-flex items-center text-[12px] font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer select-none leading-none py-1 px-1.5 rounded hover:bg-slate-200/50 dark:hover:bg-white/[0.06]"
                >
                  Reply
                </button>
              </div>
            )}
          </div>

          {/* Inline reply composer under parent comment */}
          {activeReplyTarget?.parentId === comment.id && activeReplyTarget?.targetId === comment.id && (
            <InlineReplyBox
              replyToUsername={activeReplyTarget.username}
              onSubmit={(text, mentions) =>
                onSubmitReply ? onSubmitReply(comment.id, text, mentions) : Promise.resolve()
              }
              onCancel={onCancelReply || (() => {})}
            />
          )}

          {/* Toggle replies button if replies exist */}
          {replyCount > 0 && (
            <button
              type="button"
              onClick={() => setShowReplies((prev) => !prev)}
              className="mt-1.5 ml-1 inline-flex items-center gap-1.5 text-xs font-semibold text-accent-fg hover:underline cursor-pointer"
            >
              <div className="w-5 h-[1px] bg-accent-fg/40 mr-0.5" />
              {showReplies ? (
                <>
                  <ChevronUp size={13} />
                  <span>Hide {replyCount === 1 ? 'reply' : `${replyCount} replies`}</span>
                </>
              ) : (
                <>
                  <ChevronDown size={13} />
                  <span>View {replyCount === 1 ? '1 reply' : `${replyCount} replies`}</span>
                </>
              )}
            </button>
          )}

          {/* Nested Replies Thread */}
          {showReplies && replies.length > 0 && (
            <div className="mt-2.5 ml-2 sm:ml-3 pl-3 border-l-2 border-slate-200/80 dark:border-white/[0.1] space-y-2.5">
              {replies.map((reply) => (
                <ReplyItemRow
                  key={reply.id}
                  reply={reply}
                  parentId={comment.id}
                  onReply={onReply}
                  onOpenLikesModal={onOpenLikesModal}
                  onTagClick={onTagClick}
                  onCloseParentModal={onCloseParentModal}
                  onCommentUpdated={onCommentUpdated}
                  onCommentDeleted={onCommentDeleted}
                  activeReplyTarget={activeReplyTarget}
                  onCancelReply={onCancelReply}
                  onSubmitReply={onSubmitReply}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Subcomponent for Nested Replies with edit & delete support
function ReplyItemRow({
  reply,
  parentId,
  onReply,
  onOpenLikesModal,
  onTagClick,
  onCloseParentModal,
  onCommentUpdated,
  onCommentDeleted,
  activeReplyTarget,
  onCancelReply,
  onSubmitReply,
}: {
  reply: PostComment;
  parentId: number;
  onReply: (parentId: number, username: string, targetId?: number) => void;
  onOpenLikesModal: (commentId: number) => void;
  onTagClick?: (tag: string) => void;
  onCloseParentModal?: () => void;
  onCommentUpdated?: (updated: PostComment) => void;
  onCommentDeleted?: (commentId: number, parentId?: number | null) => void;
  activeReplyTarget?: { parentId: number; targetId: number; username: string } | null;
  onCancelReply?: () => void;
  onSubmitReply?: (parentId: number, text: string, mentionedUsernames: string[]) => Promise<void>;
}) {
  const { user, token } = useAuth();
  const isAuthor = user?.id === reply.author.id;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(reply.content);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const menuRef = useRef<HTMLDivElement | null>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
        setConfirmDelete(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener('pointerdown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    if (isEditing) {
      setEditText(reply.content);
      setTimeout(() => {
        if (editTextareaRef.current) {
          editTextareaRef.current.focus();
          editTextareaRef.current.setSelectionRange(
            editTextareaRef.current.value.length,
            editTextareaRef.current.value.length,
          );
        }
      }, 50);
    }
  }, [isEditing, reply.content]);

  async function handleSaveEdit() {
    const trimmed = editText.trim();
    if (!trimmed) {
      setEditError('Reply cannot be empty');
      return;
    }
    if (!token) return;

    setIsSaving(true);
    setEditError('');
    try {
      const res = await fetch(`${API_URL}/posts/comments/${reply.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: trimmed }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(getErrorMessage(data, 'Failed to update reply'));
      }

      setIsEditing(false);
      if (onCommentUpdated) {
        onCommentUpdated(data as PostComment);
      }
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Could not save reply');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteReply() {
    if (!token) return;
    setIsDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch(`${API_URL}/posts/comments/${reply.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(getErrorMessage(data, 'Failed to delete reply'));
      }

      setIsMenuOpen(false);
      setConfirmDelete(false);
      if (onCommentDeleted) {
        onCommentDeleted(reply.id, parentId);
      }
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not delete reply');
      setIsDeleting(false);
    }
  }

  return (
    <div id={`comment-${reply.id}`} className="group/reply flex items-start gap-2 scroll-mt-24 rounded-xl transition-all">
      <Link
        href={`/profile/${encodeURIComponent(reply.author.username)}`}
        onClick={onCloseParentModal}
        className="shrink-0 mt-0.5"
      >
        <UserAvatar
          src={mediaUrl(reply.author.avatarUrl)}
          name={reply.author.fullName || reply.author.username}
          className="size-6 sm:size-6.5 rounded-full text-[9px] font-semibold border border-slate-100 dark:border-white/[0.08]"
          sizes="26px"
        />
      </Link>

      <div className="min-w-0 flex-1">
        <div className="rounded-xl bg-slate-100/70 dark:bg-[#1a1a1a] p-2 sm:p-2.5 border border-slate-200/60 dark:border-white/[0.05] relative">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <div className="flex items-center gap-1 truncate min-w-0">
              <Link
                href={`/profile/${encodeURIComponent(reply.author.username)}`}
                onClick={onCloseParentModal}
                className="group/name text-[12.5px] sm:text-[13px] font-bold text-slate-900 dark:text-white inline-flex items-center gap-1 shrink-0"
              >
                <span className="group-hover/name:underline">{reply.author.fullName || reply.author.username}</span>
                {reply.author.isVerified && <VerifiedBadge size={12} />}
              </Link>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-normal truncate">
                @{reply.author.username}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0 ml-2">
              <time className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500" dateTime={reply.createdAt}>
                {relativeTime(reply.createdAt)}
              </time>

              {/* Reply options menu */}
              {isAuthor && !isEditing && (
                <div ref={menuRef} className="relative inline-flex items-center ml-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(!isMenuOpen);
                      setConfirmDelete(false);
                    }}
                    className="grid size-5 place-items-center rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-white/[0.08] transition-colors cursor-pointer opacity-70 group-hover/reply:opacity-100"
                    aria-label="Reply options"
                  >
                    <MoreHorizontal size={13} />
                  </button>

                  {isMenuOpen && (
                    <div
                      role="menu"
                      className="absolute right-0 top-full mt-1 w-32 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#141414] p-1 shadow-xl z-40 animate-in fade-in zoom-in-95 duration-150"
                    >
                      {!confirmDelete ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setIsMenuOpen(false);
                              setIsEditing(true);
                            }}
                            className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                          >
                            <Pencil size={12} className="text-slate-400 shrink-0" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(true)}
                            className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                          >
                            <Trash2 size={12} className="shrink-0" />
                            <span>Delete</span>
                          </button>
                        </>
                      ) : (
                        <div className="p-1 space-y-1">
                          <p className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 px-0.5">
                            Delete reply?
                          </p>
                          {deleteError && (
                            <p className="text-[9px] text-rose-500 flex items-center gap-0.5">
                              <AlertCircle size={8} /> {deleteError}
                            </p>
                          )}
                          <div className="flex items-center gap-1 pt-0.5">
                            <button
                              type="button"
                              disabled={isDeleting}
                              onClick={handleDeleteReply}
                              className="flex-1 rounded bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold py-0.5 transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              {isDeleting ? '…' : 'Delete'}
                            </button>
                            <button
                              type="button"
                              disabled={isDeleting}
                              onClick={() => setConfirmDelete(false)}
                              className="rounded border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 text-[10px] py-0.5 px-1 transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Reply Text OR Inline Editor */}
          {isEditing ? (
            <div className="mt-1 space-y-1.5">
              <textarea
                ref={editTextareaRef}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full resize-none rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-[#1a1a1a] p-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-accent-fg focus:ring-1 focus:ring-accent-fg leading-relaxed"
                rows={2}
              />
              {editError && (
                <p className="text-[10px] text-rose-500">{editError}</p>
              )}
              <div className="flex items-center justify-end gap-1">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => {
                    setIsEditing(false);
                    setEditText(reply.content);
                    setEditError('');
                  }}
                  className="rounded-md border border-slate-200 dark:border-white/10 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSaving || !editText.trim()}
                  onClick={handleSaveEdit}
                  className="inline-flex items-center gap-1 rounded-md bg-accent px-2.5 py-0.5 text-[10px] font-bold text-accent-text hover:bg-accent-hover transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSaving && <Loader2 size={10} className="animate-spin" />}
                  <span>{isSaving ? 'Saving…' : 'Save'}</span>
                </button>
              </div>
            </div>
          ) : (
            <p className="text-slate-700 dark:text-slate-300 text-xs sm:text-[12.5px] leading-relaxed [overflow-wrap:anywhere]">
              <FormattedText
                content={reply.content}
                mentions={reply.mentions}
                onTagClick={onTagClick}
                onMentionClick={onCloseParentModal}
              />
            </p>
          )}

          {!isEditing && (
            <div className="mt-1.5 flex items-center gap-2">
              <CommentReactions
                commentId={reply.id}
                initialLikes={reply.likes}
                totalLikes={reply._count?.likes ?? reply.likes?.length ?? 0}
                onOpenLikesModal={onOpenLikesModal}
              />

              <button
                type="button"
                onClick={() => onReply(parentId, reply.author.username, reply.id)}
                className="inline-flex items-center text-[12px] font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer select-none leading-none py-1 px-1.5 rounded hover:bg-slate-200/50 dark:hover:bg-white/[0.06]"
              >
                Reply
              </button>
            </div>
          )}
        </div>

        {/* Inline reply composer under this nested reply */}
        {activeReplyTarget?.parentId === parentId && activeReplyTarget?.targetId === reply.id && (
          <InlineReplyBox
            compact
            replyToUsername={activeReplyTarget.username}
            onSubmit={(text, mentions) =>
              onSubmitReply ? onSubmitReply(parentId, text, mentions) : Promise.resolve()
            }
            onCancel={onCancelReply || (() => {})}
          />
        )}
      </div>
    </div>
  );
}
