'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { PostComment, mediaUrl } from '../lib/api';
import { relativeTime } from '../lib/time';
import { UserAvatar } from './user-avatar';
import { VerifiedBadge } from './verified-badge';
import { CommentReactions } from './comment-reactions';
import { FormattedText } from './formatted-text';

interface CommentItemProps {
  comment: PostComment;
  onReply: (parentId: number, username: string) => void;
  onOpenLikesModal: (commentId: number) => void;
  onTagClick?: (tag: string) => void;
  onCloseParentModal?: () => void;
}

export function CommentItem({
  comment,
  onReply,
  onOpenLikesModal,
  onTagClick,
  onCloseParentModal,
}: CommentItemProps) {
  const replies = comment.replies || [];
  const replyCount = replies.length || (comment._count?.replies ?? 0);
  const [showReplies, setShowReplies] = useState(true);

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
          <div className="rounded-xl bg-slate-50 dark:bg-[#151515] p-2.5 sm:p-3 border border-slate-100/80 dark:border-white/[0.06] hover:border-slate-200 dark:hover:border-white/[0.1] transition-colors">
            {/* Author info & timestamp */}
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
              <time className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 shrink-0 ml-2" dateTime={comment.createdAt}>
                {relativeTime(comment.createdAt)}
              </time>
            </div>

            {/* Comment Text with Mentions and Hashtags */}
            <p className="text-slate-700 dark:text-slate-300 text-[13px] sm:text-[13.5px] leading-relaxed [overflow-wrap:anywhere]">
              <FormattedText
                content={comment.content}
                mentions={comment.mentions}
                onTagClick={onTagClick}
                onMentionClick={onCloseParentModal}
              />
            </p>

            {/* Actions: Reactions Dock + Reply Button */}
            <div className="mt-2 flex items-center gap-2">
              <CommentReactions
                commentId={comment.id}
                initialLikes={comment.likes}
                totalLikes={comment._count?.likes ?? comment.likes?.length ?? 0}
                onOpenLikesModal={onOpenLikesModal}
              />

              <button
                type="button"
                onClick={() => onReply(comment.id, comment.author.username)}
                className="inline-flex items-center text-[12px] font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer select-none leading-none py-1 px-1.5 rounded hover:bg-slate-200/50 dark:hover:bg-white/[0.06]"
              >
                Reply
              </button>
            </div>
          </div>

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
                <div key={reply.id} id={`comment-${reply.id}`} className="flex items-start gap-2 scroll-mt-24 rounded-xl transition-all">
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
                    <div className="rounded-xl bg-slate-100/70 dark:bg-[#1a1a1a] p-2 sm:p-2.5 border border-slate-200/60 dark:border-white/[0.05]">
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
                        <time className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 shrink-0 ml-2" dateTime={reply.createdAt}>
                          {relativeTime(reply.createdAt)}
                        </time>
                      </div>

                      <p className="text-slate-700 dark:text-slate-300 text-xs sm:text-[12.5px] leading-relaxed [overflow-wrap:anywhere]">
                        <FormattedText
                          content={reply.content}
                          mentions={reply.mentions}
                          onTagClick={onTagClick}
                          onMentionClick={onCloseParentModal}
                        />
                      </p>

                      <div className="mt-1.5 flex items-center gap-2">
                        <CommentReactions
                          commentId={reply.id}
                          initialLikes={reply.likes}
                          totalLikes={reply._count?.likes ?? reply.likes?.length ?? 0}
                          onOpenLikesModal={onOpenLikesModal}
                        />

                        <button
                          type="button"
                          onClick={() => onReply(comment.id, reply.author.username)}
                          className="inline-flex items-center text-[12px] font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer select-none leading-none py-1 px-1.5 rounded hover:bg-slate-200/50 dark:hover:bg-white/[0.06]"
                        >
                          Reply
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
