'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { ReactionType } from '../lib/api';
import {
  PremiumLikeIcon,
  PremiumLoveIcon,
  PremiumCelebrateIcon,
  PremiumLaughIcon,
  PremiumWowIcon,
  PremiumCareIcon,
  ReactionIconRenderer,
} from './premium-reaction-icons';

export interface ReactionMeta {
  key: ReactionType;
  label: string;
  renderIcon: (size?: number, className?: string) => React.ReactNode;
  activeColor: string;
}

export const REACTIONS: ReactionMeta[] = [
  { key: 'LIKE', label: 'Like', renderIcon: (s, c) => <PremiumLikeIcon size={s} className={c} />, activeColor: 'text-[#1877f2] dark:text-[#388af6]' },
  { key: 'LOVE', label: 'Love', renderIcon: (s, c) => <PremiumLoveIcon size={s} className={c} />, activeColor: 'text-rose-500 dark:text-rose-400' },
  { key: 'CELEBRATE', label: 'Celebrate', renderIcon: (s, c) => <PremiumCelebrateIcon size={s} className={c} />, activeColor: 'text-amber-500 dark:text-amber-400' },
  { key: 'LAUGH', label: 'Haha', renderIcon: (s, c) => <PremiumLaughIcon size={s} className={c} />, activeColor: 'text-yellow-500 dark:text-yellow-400' },
  { key: 'WOW', label: 'Wow', renderIcon: (s, c) => <PremiumWowIcon size={s} className={c} />, activeColor: 'text-purple-500 dark:text-purple-400' },
  { key: 'SUPPORT', label: 'Care', renderIcon: (s, c) => <PremiumCareIcon size={s} className={c} />, activeColor: 'text-pink-500 dark:text-pink-400' },
];

export function getReactionMeta(key?: string | null): ReactionMeta {
  return REACTIONS.find(r => r.key === key) || REACTIONS[0];
}

interface ReactionPickerProps {
  currentReaction: ReactionType | null;
  totalCount: number;
  reactionsList?: { userId: number; type?: string }[];
  onSelectReaction: (type: ReactionType) => void;
  onRemoveReaction: () => void;
  onOpenLikesModal?: () => void;
  disabled?: boolean;
  dockDirection?: 'up' | 'down' | 'auto';
}

export function ReactionPicker({
  currentReaction,
  totalCount,
  reactionsList = [],
  onSelectReaction,
  onRemoveReaction,
  onOpenLikesModal,
  disabled = false,
  dockDirection = 'auto',
}: ReactionPickerProps) {
  const [isDockOpen, setIsDockOpen] = useState(false);
  const [placement, setPlacement] = useState<'up' | 'down'>('up');
  const [hoveredReaction, setHoveredReaction] = useState<ReactionType | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const activeMeta = currentReaction ? getReactionMeta(currentReaction) : null;

  // Extract distinct top reaction types from list for overlapping micro badges
  const topReactions = useMemo(() => {
    const counts: Record<string, number> = {};
    reactionsList.forEach(l => {
      const type = (l.type as ReactionType) || 'LIKE';
      counts[type] = (counts[type] || 0) + 1;
    });
    if (Object.keys(counts).length === 0 && totalCount > 0) {
      return [currentReaction || 'LIKE'];
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type]) => type as ReactionType);
  }, [reactionsList, totalCount, currentReaction]);

  const handleMouseEnter = () => {
    if (disabled) return;
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }

    if (dockDirection === 'down') {
      setPlacement('down');
    } else if (dockDirection === 'up') {
      setPlacement('up');
    } else if (containerRef.current) {
      const scrollParent = containerRef.current.closest('.overflow-y-auto, .overflow-auto');
      const triggerRect = containerRef.current.getBoundingClientRect();
      if (scrollParent) {
        const parentRect = scrollParent.getBoundingClientRect();
        const spaceAbove = triggerRect.top - parentRect.top;
        setPlacement(spaceAbove < 95 ? 'down' : 'up');
      } else {
        setPlacement(triggerRect.top < 120 ? 'down' : 'up');
      }
    }

    setIsDockOpen(true);
  };

  const handleMouseLeave = () => {
    if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    leaveTimeoutRef.current = setTimeout(() => {
      setIsDockOpen(false);
      setHoveredReaction(null);
    }, 180);
  };

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    };
  }, []);

  // Handle outside click to close reaction dock
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDockOpen(false);
      }
    }
    if (isDockOpen) {
      document.addEventListener('pointerdown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
    };
  }, [isDockOpen]);

  function handleMainButtonClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (disabled) return;
    if (isDockOpen) {
      setIsDockOpen(false);
    }
    if (currentReaction) {
      onRemoveReaction();
    } else {
      onSelectReaction('LIKE');
    }
  }

  function handlePick(e: React.MouseEvent, type: ReactionType) {
    e.stopPropagation();
    if (disabled) return;
    if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    setIsDockOpen(false);
    if (currentReaction === type) {
      onRemoveReaction();
    } else {
      onSelectReaction(type);
    }
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      {/* Reaction Action Trigger & Hover Dock (Only hovering here opens reaction dock) */}
      <div
        ref={containerRef}
        className="group/picker relative inline-flex items-center"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Floating Reactions Dock on Hover (Solid opaque - zero glass effect) */}
        <div
          role="dialog"
          aria-label="Reaction options"
          className={`absolute left-0 flex items-center gap-1 rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-[#141414] px-2 py-1.5 shadow-xl z-50 transition-all duration-200 ${
            placement === 'down'
              ? 'top-full mt-2 origin-top-left after:absolute after:-top-3 after:left-0 after:right-0 after:h-4 after:content-[\'\']'
              : 'bottom-full mb-2 origin-bottom-left after:absolute after:-bottom-3 after:left-0 after:right-0 after:h-4 after:content-[\'\']'
          } ${
            isDockOpen
              ? 'opacity-100 scale-100 pointer-events-auto translate-y-0'
              : placement === 'down'
                ? 'opacity-0 scale-90 pointer-events-none -translate-y-1'
                : 'opacity-0 scale-90 pointer-events-none translate-y-1'
          }`}
        >
          {REACTIONS.map((item) => {
            const isSelected = currentReaction === item.key;
            const isHovered = hoveredReaction === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={(e) => handlePick(e, item.key)}
                onMouseEnter={() => setHoveredReaction(item.key)}
                onMouseLeave={() => setHoveredReaction(null)}
                className={`group/emoji relative rounded-full p-1.5 transition-all duration-150 ease-out hover:scale-130 hover:-translate-y-1.5 active:scale-105 ${
                  isSelected
                    ? 'scale-115 -translate-y-0.5 bg-slate-100 dark:bg-white/10 ring-1.5 ring-slate-400/50 dark:ring-white/40'
                    : 'hover:bg-slate-100 dark:hover:bg-white/10'
                }`}
                aria-label={`React with ${item.label}`}
              >
                <span className="block">{item.renderIcon(24)}</span>
                {/* Floating Tooltip with Reaction Name */}
                {isHovered && (
                  <span
                    className={`pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-full bg-slate-900/95 dark:bg-white px-2 py-0.5 text-[10px] font-bold text-white dark:text-slate-950 shadow-md whitespace-nowrap z-60 animate-in fade-in zoom-in-95 duration-100 ${
                      placement === 'down' ? '-top-7' : '-top-7.5'
                    }`}
                  >
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Main Reaction Trigger Button */}
        <button
          type="button"
          onClick={handleMainButtonClick}
          disabled={disabled}
          className={`group/btn relative flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-all active:scale-95 select-none ${
            activeMeta
              ? activeMeta.key === 'LIKE'
                ? 'bg-blue-50/90 dark:bg-blue-950/40 text-[#1877f2] dark:text-[#388af6] font-bold border border-blue-200/90 dark:border-blue-800/50 shadow-2xs'
                : 'bg-slate-100 dark:bg-white/[0.08] text-slate-900 dark:text-slate-100 font-semibold border border-slate-300/80 dark:border-white/[0.15]'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent'
          }`}
          aria-label={activeMeta ? `Reacted: ${activeMeta.label}` : 'Like or react to post'}
        >
          {/* Reaction Icon */}
          <span className={`grid place-items-center transition-transform group-hover/btn:scale-110 ${activeMeta ? activeMeta.activeColor : 'text-slate-500 dark:text-slate-400 group-hover/btn:text-slate-800 dark:group-hover/btn:text-slate-200'}`}>
            {activeMeta ? (
              activeMeta.renderIcon(18)
            ) : (
              <ReactionIconRenderer type="LIKE" size={18} className="opacity-70 group-hover/btn:opacity-100" />
            )}
          </span>

          {/* Reaction Name Tooltip on Hover (only when dock is closed) */}
          {!isDockOpen && (
            <span className="pointer-events-none absolute -top-7.5 left-1/2 -translate-x-1/2 rounded-md bg-slate-900/95 dark:bg-white px-1.5 py-0.5 text-[10px] font-bold text-white dark:text-slate-950 opacity-0 transition-opacity duration-150 group-hover/btn:opacity-100 shadow-sm whitespace-nowrap z-30">
              {activeMeta ? activeMeta.label : 'Like'}
            </span>
          )}
        </button>
      </div>

      {/* Clickable Overlapping Badges + Total Count: Opens Likes Modal (Hover does not open dock) */}
      {totalCount > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenLikesModal?.();
          }}
          className="flex items-center gap-1.5 rounded-full px-2 py-1 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer select-none"
          title="See who reacted to this post"
          aria-label="See who reacted to this post"
        >
          {topReactions.length > 0 && (
            <span className="flex items-center -space-x-1.5">
              {topReactions.map((rtype, idx) => (
                <span
                  key={idx}
                  className="inline-grid size-5.5 place-items-center rounded-full bg-white dark:bg-[#121212] ring-1.5 ring-white dark:ring-[#1a1a1a] shadow-xs"
                  style={{ zIndex: 3 - idx }}
                >
                  <ReactionIconRenderer type={rtype} size={15} />
                </span>
              ))}
            </span>
          )}
          <span className="font-semibold text-xs sm:text-[13px]">{totalCount}</span>
        </button>
      )}
    </div>
  );
}
