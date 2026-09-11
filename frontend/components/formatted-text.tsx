'use client';

import React from 'react';
import Link from 'next/link';

interface FormattedTextProps {
  content: string;
  className?: string;
  onTagClick?: (tag: string) => void;
  onMentionClick?: () => void;
}

export function FormattedText({
  content,
  className = '',
  onTagClick,
  onMentionClick,
}: FormattedTextProps) {
  if (!content) return null;

  // Split content matching @username or #hashtag, capturing them
  const parts = content.split(/(@[a-zA-Z0-9_]+|#[a-zA-Z0-9_]+)/g);

  return (
    <span className={`whitespace-pre-wrap leading-relaxed [overflow-wrap:anywhere] ${className}`}>
      {parts.map((part, index) => {
        if (part.startsWith('@') && part.length > 1) {
          const username = part.slice(1);
          return (
            <Link
              key={index}
              href={`/profile/${encodeURIComponent(username)}`}
              onClick={(e) => {
                e.stopPropagation();
                if (onMentionClick) onMentionClick();
              }}
              className="font-semibold text-accent-fg hover:underline inline-flex items-baseline"
            >
              @{username}
            </Link>
          );
        }

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
