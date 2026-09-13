'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import type { ReactionType } from '../lib/api';
import {
  ModernLikeIcon,
  ModernLoveIcon,
  ModernCelebrateIcon,
  ModernLaughIcon,
  ModernWowIcon,
  ModernSadIcon,
  ModernCareIcon,
  ModernBitingLipIcon,
  ReactionIconRenderer,
} from './premium-reaction-icons';

export interface ReactionMeta {
  key: ReactionType;
  label: string;
  renderIcon: (size?: number, className?: string) => React.ReactNode;
  activeColor: string;
}

export const REACTIONS: ReactionMeta[] = [
  { key: 'LIKE', label: 'Like', renderIcon: (s, c) => <ModernLikeIcon size={s} className={c} />, activeColor: 'text-[#1877f2] dark:text-[#388af6]' },
  { key: 'LOVE', label: 'Love', renderIcon: (s, c) => <ModernLoveIcon size={s} className={c} />, activeColor: 'text-rose-500 dark:text-rose-400' },
  { key: 'CELEBRATE', label: 'Celebrate', renderIcon: (s, c) => <ModernCelebrateIcon size={s} className={c} />, activeColor: 'text-amber-500 dark:text-amber-400' },
  { key: 'LAUGH', label: 'Haha', renderIcon: (s, c) => <ModernLaughIcon size={s} className={c} />, activeColor: 'text-yellow-500 dark:text-yellow-400' },
  { key: 'WOW', label: 'Wow', renderIcon: (s, c) => <ModernWowIcon size={s} className={c} />, activeColor: 'text-purple-500 dark:text-purple-400' },
  { key: 'SAD', label: 'Sad', renderIcon: (s, c) => <ModernSadIcon size={s} className={c} />, activeColor: 'text-sky-500 dark:text-sky-400' },
  { key: 'SUPPORT', label: 'Care', renderIcon: (s, c) => <ModernCareIcon size={s} className={c} />, activeColor: 'text-pink-500 dark:text-pink-400' },
  { key: 'BITING_LIP', label: 'Bite', renderIcon: (s, c) => <ModernBitingLipIcon size={s} className={c} />, activeColor: 'text-red-500 dark:text-red-400' },
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
  const [dockOffset, setDockOffset] = useState<number>(0);
  const [hoveredReaction, setHoveredReaction] = useState<ReactionType | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const suppressClickRef = useRef<boolean>(false);
  const isTouchInteractionRef = useRef<boolean>(false);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, []);

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

  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const triggerRect = containerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const estimatedDockWidth = 328; // 8 items (~36px each + padding)
    const padding = 8;

    // Vertical placement calculation
    if (dockDirection === 'down') {
      setPlacement('down');
    } else if (dockDirection === 'up') {
      setPlacement('up');
    } else {
      const scrollParent = containerRef.current.closest('.overflow-y-auto, .overflow-auto');
      if (scrollParent) {
        const parentRect = scrollParent.getBoundingClientRect();
        const spaceAbove = triggerRect.top - parentRect.top;
        setPlacement(spaceAbove < 95 ? 'down' : 'up');
      } else {
        setPlacement(triggerRect.top < 120 ? 'down' : 'up');
      }
    }

    // Horizontal viewport clamping so dock never overflows phone screen
    let shift = 0;
    if (triggerRect.left + estimatedDockWidth > viewportWidth - padding) {
      shift = (viewportWidth - padding) - (triggerRect.left + estimatedDockWidth);
    }
    if (triggerRect.left + shift < padding) {
      shift = padding - triggerRect.left;
    }
    setDockOffset(shift);
  }, [dockDirection]);

  const openDock = useCallback(() => {
    if (disabled) return;
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    updatePosition();
    setIsDockOpen(true);
  }, [disabled, updatePosition]);

  const closeDock = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    setIsDockOpen(false);
    setHoveredReaction(null);
  }, []);

  const handleButtonMouseEnter = () => {
    if (disabled || isTouchInteractionRef.current) return;
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      openDock();
    }, 250);
  };

  const handleButtonMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
    }
    leaveTimeoutRef.current = setTimeout(() => {
      setIsDockOpen(false);
      setHoveredReaction(null);
    }, 250);
  };

  const handleDockMouseEnter = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
  };

  const handleDockMouseLeave = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
    }
    leaveTimeoutRef.current = setTimeout(() => {
      setIsDockOpen(false);
      setHoveredReaction(null);
    }, 250);
  };

  // Touch and Long-press handlers for mobile phone browser
  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    isTouchInteractionRef.current = true;
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    suppressClickRef.current = false;

    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);

    // 250ms touch-and-hold opens the reaction dock smoothly on phones
    longPressTimerRef.current = setTimeout(() => {
      suppressClickRef.current = true;
      try {
        if ('vibrate' in navigator) navigator.vibrate(15);
      } catch {}
      openDock();
    }, 250);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPosRef.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
    // If user scrolled/moved finger > 8px, cancel long-press
    if (dx > 8 || dy > 8) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setTimeout(() => {
      isTouchInteractionRef.current = false;
    }, 400);
  };

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

    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    // If click was triggered right after a long-press opened the dock, ignore it
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }

    if (isDockOpen) {
      closeDock();
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
    closeDock();
    if (currentReaction === type) {
      onRemoveReaction();
    } else {
      onSelectReaction(type);
    }
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      {/* Reaction Action Trigger & Hover/Touch Dock */}
      <div
        ref={containerRef}
        className="group/picker relative inline-flex items-center"
      >
        {/* Floating Reactions Dock on Hover / Touch with Viewport Clamping */}
        <div
          role="dialog"
          aria-label="Reaction options"
          onMouseEnter={handleDockMouseEnter}
          onMouseLeave={handleDockMouseLeave}
          style={{
            transform: `translateX(${dockOffset}px) ${
              isDockOpen
                ? 'translateY(0) scale(1)'
                : placement === 'down'
                ? 'translateY(-4px) scale(0.92)'
                : 'translateY(4px) scale(0.92)'
            }`,
          }}
          className={`absolute left-0 flex items-center gap-1 rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-[#141414] px-2 py-1.5 shadow-xl z-50 transition-all duration-150 ${
            placement === 'down'
              ? 'top-full mt-2 origin-top-left after:absolute after:-top-3 after:left-0 after:right-0 after:h-4 after:content-[\'\']'
              : 'bottom-full mb-2 origin-bottom-left after:absolute after:-bottom-3 after:left-0 after:right-0 after:h-4 after:content-[\'\']'
          } ${
            isDockOpen
              ? 'opacity-100 pointer-events-auto'
              : 'opacity-0 pointer-events-none'
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
                className={`group/emoji relative p-1.5 sm:p-1 transition-transform duration-150 ease-out hover:scale-130 hover:-translate-y-1.5 active:scale-105 touch-manipulation cursor-pointer ${
                  isSelected ? 'scale-115 -translate-y-0.5' : ''
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

        {/* Main Reaction Trigger Button: Hover triggers only with 250ms deliberate delay */}
        <button
          type="button"
          onClick={handleMainButtonClick}
          onMouseEnter={handleButtonMouseEnter}
          onMouseLeave={handleButtonMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          disabled={disabled}
          className={`group/btn relative flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-all active:scale-95 select-none touch-manipulation cursor-pointer ${
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

      {/* Clickable Overlapping Badges + Total Count: Opens Likes Modal */}
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
