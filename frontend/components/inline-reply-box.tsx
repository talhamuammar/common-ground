'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, CornerDownRight, X, Loader2 } from 'lucide-react';
import { mediaUrl } from '../lib/api';
import { UserAvatar } from './user-avatar';
import { useAuth } from './auth-provider';
import {
  useMentionAutocomplete,
  MentionSuggestions,
  renderEditorBackdrop,
} from './mention-autocomplete';

interface InlineReplyBoxProps {
  replyToUsername: string;
  onSubmit: (text: string, mentionedUsernames: string[]) => Promise<void>;
  onCancel: () => void;
  compact?: boolean;
}

export function InlineReplyBox({
  replyToUsername,
  onSubmit,
  onCancel,
  compact = false,
}: InlineReplyBoxProps) {
  const [text, setText] = useState(`@${replyToUsername} `);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const { user } = useAuth();

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
  } = useMentionAutocomplete({
    content: text,
    setContent: setText,
    inputRef,
  });

  // Prepopulate mentionedUsers and auto-focus with cursor at the end
  useEffect(() => {
    setMentionedUsers([
      { id: 0, username: replyToUsername, fullName: null, avatarUrl: null },
    ]);
    const timer = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const len = inputRef.current.value.length;
        inputRef.current.setSelectionRange(len, len);
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [replyToUsername, setMentionedUsers]);

  const activeMentions = React.useMemo(() => {
    const trimmed = text.trim();
    if (!trimmed) return [];
    return mentionedUsers.filter((u) => {
      const name = u.fullName || u.username;
      return (
        trimmed.toLowerCase().includes(name.toLowerCase()) ||
        trimmed.toLowerCase().includes(`@${u.username.toLowerCase()}`)
      );
    });
  }, [mentionedUsers, text]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || trimmed.toLowerCase() === `@${replyToUsername.toLowerCase()}`) {
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const activeUsernames = Array.from(new Set(mentionedUsers.map((u) => u.username)));
      if (!activeUsernames.some((u) => u.toLowerCase() === replyToUsername.toLowerCase())) {
        activeUsernames.push(replyToUsername);
      }
      await onSubmit(trimmed, activeUsernames);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post reply');
      setSubmitting(false);
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape' && !isMentionOpen) {
      e.preventDefault();
      onCancel();
      return;
    }
    const handled = handleMentionKeyDown(e);
    if (handled) return;
  };

  const isReplyEmpty =
    !text.trim() || text.trim().toLowerCase() === `@${replyToUsername.toLowerCase()}`;

  return (
    <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-150">
      <div className="flex items-center justify-between rounded-t-xl bg-accent-subtle/80 px-2.5 py-1 text-[11px] text-accent-fg border border-b-0 border-accent-subtle-border">
        <div className="flex items-center gap-1.5 truncate">
          <CornerDownRight size={11} className="text-accent-fg shrink-0" />
          <span className="truncate">
            Replying to <span className="font-semibold">@{replyToUsername}</span>
          </span>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="shrink-0 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors"
          title="Cancel reply"
          aria-label="Cancel reply"
        >
          <X size={12} />
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="relative flex items-center gap-2 rounded-b-xl border border-slate-200/90 dark:border-white/[0.08] bg-white dark:bg-[#181818] px-2.5 py-2 shadow-xs transition-all focus-within:ring-1 focus-within:ring-accent/30"
      >
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
          className={`${compact ? 'size-6 text-[9px]' : 'size-7 text-[10px]'} rounded-full font-semibold shrink-0 border border-slate-100 dark:border-white/[0.08]`}
          sizes="28px"
        />

        <div className="relative flex-1 flex items-center min-w-0">
          <div
            ref={backdropRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center overflow-hidden whitespace-pre font-sans text-xs sm:text-[13px] text-slate-800 dark:text-slate-100 select-none p-0 m-0 border-0"
          >
            {renderEditorBackdrop(text, activeMentions)}
          </div>

          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
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
            onKeyDown={onKeyDown}
            placeholder={`Reply to @${replyToUsername}…`}
            className={`relative w-full bg-transparent font-sans text-xs sm:text-[13px] p-0 m-0 border-0 outline-none ${
              (activeMentions.length > 0 || /@[a-zA-Z0-9_]+/i.test(text)) && text
                ? 'text-transparent caret-slate-900 dark:caret-white'
                : 'text-slate-800 dark:text-slate-100'
            } placeholder:text-slate-400 dark:placeholder:text-slate-500`}
            maxLength={300}
          />
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-2 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || isReplyEmpty}
            className="flex items-center gap-1 rounded-md bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-text transition-opacity disabled:opacity-30 hover:bg-accent-hover cursor-pointer"
          >
            {submitting ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <Send size={11} strokeWidth={2} />
            )}
            <span>{submitting ? '…' : 'Reply'}</span>
          </button>
        </div>
      </form>

      {error && (
        <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400 px-1">{error}</p>
      )}
    </div>
  );
}
