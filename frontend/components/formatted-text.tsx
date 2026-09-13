'use client';

import React from 'react';
import Link from 'next/link';
import { MentionInfo } from '../lib/api';
import { VerifiedBadge } from './verified-badge';

interface FormattedTextProps {
  content: string;
  className?: string;
  mentions?: MentionInfo[];
  onTagClick?: (tag: string) => void;
  onMentionClick?: () => void;
}

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function FormattedText({
  content,
  className = '',
  mentions,
  onTagClick,
  onMentionClick,
}: FormattedTextProps) {
  if (!content) return null;

  // Build names to match from mentions (sorted by length descending so longer names match first)
  const validNames = (mentions || [])
    .map((m) => m.fullName || m.username)
    .filter((n): n is string => Boolean(n && n.trim().length > 0));

  const uniqueNames = Array.from(new Set(validNames)).sort((a, b) => b.length - a.length);

  const namesPattern = uniqueNames.length > 0
    ? uniqueNames.map(escapeRegex).join('|')
    : '';

  // Match legacy @[username](name), @username, #hashtag, and plain mentioned names
  const splitRegex = namesPattern
    ? new RegExp(`(@\\[[a-zA-Z0-9_]+\\]\\([^)]+\\)|@[a-zA-Z0-9_]+|#[a-zA-Z0-9_]+|(?:${namesPattern}))`, 'g')
    : /(@\[[a-zA-Z0-9_]+\]\([^)]+\)|@[a-zA-Z0-9_]+|#[a-zA-Z0-9_]+)/g;

  const parts = content.split(splitRegex);

  return (
    <span className={`whitespace-pre-wrap leading-relaxed [overflow-wrap:anywhere] ${className}`}>
      {parts.map((part, index) => {
        if (!part) return null;

        // 1. Handle legacy @[username](DisplayName) -> show bold name with badge, NO @ symbol
        if (part.startsWith('@[') && part.includes('](')) {
          const bracketMatch = part.match(/^@\[([a-zA-Z0-9_]+)\]\(([^)]+)\)$/);
          if (bracketMatch) {
            const username = bracketMatch[1];
            const explicitName = bracketMatch[2];
            const matchedUser = mentions?.find((m) => m.username.toLowerCase() === username.toLowerCase());
            const displayName = matchedUser?.fullName || explicitName;
            const isVerified = matchedUser?.isVerified ?? false;

            return (
              <Link
                key={index}
                href={`/profile/${encodeURIComponent(username)}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onMentionClick) onMentionClick();
                }}
                className="font-bold text-slate-900 dark:text-white hover:text-accent-fg hover:underline inline-flex items-center gap-0.5 align-baseline transition-colors text-[inherit]"
              >
                <span>{displayName}</span>
                {isVerified && <VerifiedBadge size={11.5} />}
              </Link>
            );
          }
        }

        // 2. Handle legacy @username -> resolve display name, show bold name with badge, NO @ symbol
        if (part.startsWith('@') && part.length > 1) {
          const username = part.slice(1);
          const matchedUser = mentions?.find((m) => m.username.toLowerCase() === username.toLowerCase());
          const displayName = matchedUser?.fullName || username;
          const isVerified = matchedUser?.isVerified ?? false;

          return (
            <Link
              key={index}
              href={`/profile/${encodeURIComponent(username)}`}
              onClick={(e) => {
                e.stopPropagation();
                if (onMentionClick) onMentionClick();
              }}
              className="font-bold text-slate-900 dark:text-white hover:text-accent-fg hover:underline inline-flex items-center gap-0.5 align-baseline transition-colors text-[inherit]"
            >
              <span>{displayName}</span>
              {isVerified && <VerifiedBadge size={11.5} />}
            </Link>
          );
        }

        // 3. Handle plain name mention from mentions metadata -> show bold name with badge, NO @ symbol
        if (mentions && mentions.length > 0) {
          const matchedUser = mentions.find(
            (m) =>
              (m.fullName && m.fullName.toLowerCase() === part.toLowerCase()) ||
              m.username.toLowerCase() === part.toLowerCase(),
          );
          if (matchedUser) {
            const displayName = matchedUser.fullName || matchedUser.username;
            return (
              <Link
                key={index}
                href={`/profile/${encodeURIComponent(matchedUser.username)}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onMentionClick) onMentionClick();
                }}
                className="font-bold text-slate-900 dark:text-white hover:text-accent-fg hover:underline inline-flex items-center gap-0.5 align-baseline transition-colors text-[inherit]"
              >
                <span>{displayName}</span>
                {matchedUser.isVerified && <VerifiedBadge size={11.5} />}
              </Link>
            );
          }
        }

        // 4. Handle #hashtag
        if (part.startsWith('#') && part.length > 1) {
          const tag = part.slice(1);
          if (onTagClick) {
            return (
              <button
                key={index}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onTagClick(tag);
                }}
                className="inline-block rounded px-1.5 py-0.5 text-xs font-semibold text-accent-fg bg-accent-subtle hover:bg-accent-subtle-hover border border-accent-subtle-border transition-colors cursor-pointer mr-1 align-baseline"
              >
                #{tag}
              </button>
            );
          }
          return (
            <span
              key={index}
              className="inline-block rounded px-1.5 py-0.5 text-xs font-semibold text-accent-fg bg-accent-subtle border border-accent-subtle-border mr-1 align-baseline"
            >
              #{tag}
            </span>
          );
        }

        return <span key={index}>{part}</span>;
      })}
    </span>
  );
}
