'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { API_URL } from '../lib/api';
import { UserAvatar } from './user-avatar';
import { VerifiedBadge } from './verified-badge';
import { AtSign, Loader2 } from 'lucide-react';
import { useAuth } from './auth-provider';

export interface MentionUser {
  id: number;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  isVerified?: boolean;
}

export interface CaretCoordinates {
  top: number;
  left: number;
}

export function renderEditorBackdrop(
  content: string,
  mentions: MentionUser[],
  underline = false,
) {
  if (!content) return null;

  const validNames = mentions
    .map((m) => m.fullName || m.username)
    .filter((n): n is string => Boolean(n && n.trim().length > 0))
    .sort((a, b) => b.length - a.length);

  const escaped = validNames.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const pattern = escaped
    ? `(@[a-zA-Z0-9_]+|${escaped})`
    : `(@[a-zA-Z0-9_]+)`;
  const regex = new RegExp(pattern, 'gi');
  const parts = content.split(regex);

  const underlineClass = underline
    ? ' underline decoration-accent decoration-2 underline-offset-2'
    : '';

  return (
    <>
      {parts.map((part, i) => {
        const isMention =
          part.startsWith('@') ||
          validNames.some((n) => n.toLowerCase() === part.toLowerCase());

        if (isMention) {
          return (
            <strong
              key={i}
              className={`font-bold text-slate-900 dark:text-white${underlineClass}`}
            >
              {part}
            </strong>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function getCaretCoordinates(
  element: HTMLTextAreaElement | HTMLInputElement,
  position: number,
): CaretCoordinates {
  if (typeof window === 'undefined' || !element) return { top: 32, left: 0 };

  try {
    const div = document.createElement('div');
    const style = window.getComputedStyle(element);

    const properties = [
      'direction',
      'boxSizing',
      'width',
      'height',
      'overflowX',
      'overflowY',
      'borderTopWidth',
      'borderRightWidth',
      'borderBottomWidth',
      'borderLeftWidth',
      'borderStyle',
      'paddingTop',
      'paddingRight',
      'paddingBottom',
      'paddingLeft',
      'fontStyle',
      'fontVariant',
      'fontWeight',
      'fontStretch',
      'fontSize',
      'fontSizeAdjust',
      'lineHeight',
      'fontFamily',
      'textAlign',
      'textTransform',
      'textIndent',
      'textDecoration',
      'letterSpacing',
      'wordSpacing',
      'tabSize',
    ] as const;

    div.style.position = 'absolute';
    div.style.top = '0';
    div.style.left = '-9999px';
    div.style.visibility = 'hidden';
    div.style.whiteSpace = 'pre-wrap';
    div.style.wordWrap = 'break-word';
    div.style.overflowWrap = 'break-word';

    properties.forEach((prop) => {
      div.style[prop as any] = style[prop as any];
    });

    const textBefore = element.value.substring(0, position);
    div.textContent = textBefore;

    const span = document.createElement('span');
    span.textContent = element.value.substring(position) || '.';
    div.appendChild(span);

    document.body.appendChild(div);

    const spanTop = span.offsetTop;
    const spanLeft = span.offsetLeft;
    const parsedLineHeight = parseInt(style.lineHeight, 10);
    const lineHeight = isNaN(parsedLineHeight) ? 26 : parsedLineHeight;

    document.body.removeChild(div);

    // Dropdown placed directly underneath caret on current line with no far gap
    const top = spanTop + lineHeight + 4 - element.scrollTop;
    const maxLeft = Math.max(0, (element.clientWidth || 350) - 295);
    const left = Math.max(0, Math.min(spanLeft, maxLeft));

    return { top, left };
  } catch {
    const textBefore = element.value.substring(0, position);
    const lineIndex = Math.max(0, textBefore.split('\n').length - 1);
    return { top: (lineIndex + 1) * 26 + 6, left: 0 };
  }
}

interface UseMentionAutocompleteProps {
  content: string;
  setContent: (value: string | ((prev: string) => string)) => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export function useMentionAutocomplete({
  content,
  setContent,
  textareaRef,
  inputRef,
}: UseMentionAutocompleteProps) {
  const { token } = useAuth();
  const targetElementRef = (inputRef || textareaRef) as React.RefObject<
    HTMLTextAreaElement | HTMLInputElement | null
  >;
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState<number>(-1);
  const [users, setUsers] = useState<MentionUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [coordinates, setCoordinates] = useState<CaretCoordinates>({ top: 32, left: 0 });
  const [mentionedUsers, setMentionedUsers] = useState<MentionUser[]>([]);

  // Check if caret is currently at a mention trigger (@something)
  const checkMentionTrigger = useCallback(
    (customCaretPos?: number) => {
      const element = targetElementRef.current;
      const fullText = element ? element.value : content;
      const caretPos =
        customCaretPos !== undefined
          ? customCaretPos
          : element?.selectionStart ?? fullText.length;

      const textBeforeCaret = fullText.slice(0, caretPos);

      // Match @username or @[fragment right at cursor
      const match = textBeforeCaret.match(/(?:^|\s)@([a-zA-Z0-9_]*)$/);

      if (match) {
        const queryText = match[1];
        const atPos = textBeforeCaret.lastIndexOf('@');
        setMentionStartIndex(atPos);
        setQuery(queryText);
        setIsOpen(true);
        setSelectedIndex(0);

        if (element) {
          const coords = getCaretCoordinates(element, atPos);
          setCoordinates(coords);
        }
      } else {
        setIsOpen(false);
        setMentionStartIndex(-1);
        setQuery('');
      }
    },
    [content, targetElementRef],
  );

  // Fetch users whenever query or open state changes
  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const headers: Record<string, string> = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const endpoint =
          query.trim().length > 0
            ? `${API_URL}/users/search?q=${encodeURIComponent(query.trim())}&limit=6`
            : `${API_URL}/users/suggestions?limit=6`;

        const res = await fetch(endpoint, { headers });
        if (res.ok && active) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : [];
          setUsers(list);
          setSelectedIndex(0);
        }
      } catch {
        if (active) setUsers([]);
      } finally {
        if (active) setLoading(false);
      }
    }, 120);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [isOpen, query, token]);

  // Select a user and insert just the user's name without @ or brackets
  const selectUser = useCallback(
    (user: MentionUser) => {
      if (mentionStartIndex < 0) return;

      const element = targetElementRef.current;
      const fullText = element ? element.value : content;
      const currentCaret = element?.selectionStart ?? (mentionStartIndex + 1 + query.length);

      const before = fullText.slice(0, mentionStartIndex);
      const after = fullText.slice(currentCaret);
      const displayName = user.fullName || user.username;
      const replacement = `${displayName} `;
      const nextContent = `${before}${replacement}${after}`;
      const nextCaretPos = before.length + replacement.length;

      setMentionedUsers((prev) => {
        if (prev.some((u) => u.id === user.id)) return prev;
        return [...prev, user];
      });

      setContent(nextContent);
      setIsOpen(false);
      setMentionStartIndex(-1);
      setQuery('');

      setTimeout(() => {
        if (element) {
          element.focus();
          element.setSelectionRange(nextCaretPos, nextCaretPos);
        }
      }, 30);
    },
    [content, mentionStartIndex, query.length, setContent, targetElementRef],
  );

  // Keyboard navigation handler to be attached to textarea or input
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      if (!isOpen || users.length === 0) {
        if (e.key === '@') {
          setTimeout(() => checkMentionTrigger(), 10);
        }
        return false;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((prev) => (prev + 1) % users.length);
        return true;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((prev) => (prev - 1 + users.length) % users.length);
        return true;
      }

      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        if (users[selectedIndex]) {
          selectUser(users[selectedIndex]);
          return true;
        }
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(false);
        return true;
      }

      return false;
    },
    [isOpen, users, selectedIndex, selectUser, checkMentionTrigger],
  );

  // Helper to insert @ and open menu
  const triggerMention = useCallback(() => {
    const element = targetElementRef.current;
    const caret = element?.selectionStart ?? content.length;
    const before = content.slice(0, caret);
    const after = content.slice(caret);

    const prefix = before.length === 0 || /\s$/.test(before) ? '@' : ' @';
    const nextContent = `${before}${prefix}${after}`;
    const nextCaretPos = before.length + prefix.length;

    setContent(nextContent);

    setTimeout(() => {
      if (element) {
        element.focus();
        element.setSelectionRange(nextCaretPos, nextCaretPos);
      }
      checkMentionTrigger(nextCaretPos);
    }, 30);
  }, [content, setContent, targetElementRef, checkMentionTrigger]);

  return {
    isOpen,
    users,
    loading,
    selectedIndex,
    query,
    coordinates,
    setSelectedIndex,
    selectUser,
    handleKeyDown,
    checkMentionTrigger,
    triggerMention,
    mentionedUsers,
    setMentionedUsers,
    close: () => setIsOpen(false),
  };
}

interface MentionSuggestionsProps {
  isOpen: boolean;
  users: MentionUser[];
  loading: boolean;
  selectedIndex: number;
  query: string;
  coordinates?: CaretCoordinates;
  onSelectUser: (user: MentionUser) => void;
  onHoverIndex: (index: number) => void;
  className?: string;
  placement?: 'bottom' | 'top';
}

export function MentionSuggestions({
  isOpen,
  users,
  loading,
  selectedIndex,
  query,
  coordinates,
  onSelectUser,
  onHoverIndex,
  className = '',
  placement = 'bottom',
}: MentionSuggestionsProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  if (!isOpen) return null;

  const stylePos: React.CSSProperties =
    placement === 'top'
      ? {
          bottom: 'calc(100% + 8px)',
          left: coordinates ? `${Math.min(Math.max(coordinates.left, 0), 180)}px` : 0,
        }
      : coordinates
      ? { top: `${coordinates.top}px`, left: `${coordinates.left}px` }
      : {};

  return (
    <div
      ref={containerRef}
      role="listbox"
      aria-label="User mention suggestions"
      style={stylePos}
      className={`absolute z-50 w-72 max-w-[calc(100vw-3rem)] rounded-2xl border border-slate-200/90 dark:border-white/[0.12] bg-white/95 dark:bg-[#161817]/95 shadow-2xl overflow-hidden backdrop-blur-md animate-in fade-in-0 zoom-in-95 duration-100 ${className}`}
    >
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/70 dark:bg-white/[0.02]">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <AtSign size={13} className="text-accent-fg" />
          <span>Mention people</span>
        </div>
        {loading && <Loader2 size={12} className="animate-spin text-accent-fg" />}
      </div>

      <div className="max-h-52 overflow-y-auto p-1.5 space-y-0.5 [scrollbar-width:thin]">
        {users.length === 0 && !loading && (
          <div className="py-4 px-3 text-center text-xs text-slate-400 dark:text-slate-500">
            {query.trim() ? `No users matching “@${query}”` : 'No suggested users found'}
          </div>
        )}

        {users.map((u, idx) => {
          const isSelected = idx === selectedIndex;
          return (
            <div
              key={u.id}
              role="option"
              aria-selected={isSelected}
              onMouseEnter={() => onHoverIndex(idx)}
              onClick={() => onSelectUser(u)}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-colors cursor-pointer select-none ${
                isSelected
                  ? 'bg-accent/10 dark:bg-accent/20 text-slate-900 dark:text-white'
                  : 'hover:bg-slate-100/70 dark:hover:bg-white/[0.05] text-slate-700 dark:text-slate-300'
              }`}
            >
              <UserAvatar
                src={u.avatarUrl}
                name={u.fullName || u.username}
                className="size-7 rounded-full text-[10px] font-semibold shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {u.fullName || u.username}
                  </span>
                  {u.isVerified && <VerifiedBadge size={12} />}
                </div>
                <p className="truncate text-[11px] text-slate-400 dark:text-slate-500">
                  @{u.username}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
