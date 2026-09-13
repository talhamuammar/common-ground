'use client';

import React from 'react';
import { ReactionIconRenderer } from './premium-reaction-icons';

interface NotificationBadgeProps {
  type: 'LIKE_POST' | 'LIKE_COMMENT' | 'COMMENT_POST' | 'REPLY_COMMENT' | 'FOLLOW' | 'MENTION_POST' | 'MENTION_COMMENT';
  reactionType?: string | null;
  size?: 'sm' | 'md';
}

export function NotificationActionBadge({
  type,
  reactionType,
  size = 'md',
}: NotificationBadgeProps) {
  const isLike = type === 'LIKE_POST' || type === 'LIKE_COMMENT';
  const isComment = type === 'COMMENT_POST' || type === 'REPLY_COMMENT';
  const isFollow = type === 'FOLLOW';
  const isMention = type === 'MENTION_POST' || type === 'MENTION_COMMENT';

  const containerClass =
    size === 'md'
      ? 'size-5 border-2 border-white dark:border-[#0d0d0d]'
      : 'size-4.5 border-[1.5px] border-white dark:border-[#0f0f0f]';

  const iconSize = size === 'md' ? 10 : 9;
  const reactionSize = size === 'md' ? 13 : 11.5;

  if (isLike) {
    // Default to LOVE heart icon like previous, never thumbs-up like icon
    const effectiveType = (!reactionType || reactionType.toUpperCase() === 'LIKE') ? 'LOVE' : reactionType;
    return (
      <span
        className={`absolute -bottom-1 -right-1 grid place-items-center rounded-full bg-white dark:bg-[#161616] shadow-sm select-none shrink-0 ${containerClass}`}
      >
        <ReactionIconRenderer type={effectiveType} size={reactionSize} />
      </span>
    );
  }

  if (isComment) {
    return (
      <span
        className={`absolute -bottom-1 -right-1 grid place-items-center rounded-full bg-gradient-to-tr from-sky-600 to-sky-400 text-white shadow-xs select-none shrink-0 ${containerClass}`}
      >
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 20 20"
          fill="currentColor"
          className="shrink-0"
        >
          <path d="M10 2c-4.418 0-8 3.134-8 7 0 1.76.745 3.37 1.99 4.605-.28 1.488-.934 2.766-.967 2.83a.5.5 0 0 0 .614.67c1.868-.58 3.32-1.378 4.02-1.82.736.204 1.52.315 2.343.315 4.418 0 8-3.134 8-7s-3.582-7-8-7z" />
        </svg>
      </span>
    );
  }

  if (isFollow) {
    return (
      <span
        className={`absolute -bottom-1 -right-1 grid place-items-center rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 text-white shadow-xs select-none shrink-0 ${containerClass}`}
      >
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 20 20"
          fill="currentColor"
          className="shrink-0"
        >
          <path d="M7 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm-5 13a5 5 0 0 1 10 0v1H2v-1zm13-7a.75.75 0 0 1 .75.75V11h1.25a.75.75 0 0 1 0 1.5H15.75v1.25a.75.75 0 0 1-1.5 0V12.5H13a.75.75 0 0 1 0-1.5h1.25V9.75A.75.75 0 0 1 15 9z" />
        </svg>
      </span>
    );
  }

  if (isMention) {
    return (
      <span
        className={`absolute -bottom-1 -right-1 grid place-items-center rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 text-white shadow-xs select-none shrink-0 ${containerClass}`}
      >
        <span className="text-[10px] font-black leading-none select-none">@</span>
      </span>
    );
  }

  return null;
}
