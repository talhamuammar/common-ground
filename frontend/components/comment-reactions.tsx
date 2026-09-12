'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { API_URL, ReactionType } from '../lib/api';
import { useAuth } from './auth-provider';
import { useAuthModal } from './auth-modal';
import { ReactionIconRenderer } from './premium-reaction-icons';
import { REACTIONS, getReactionMeta } from './reaction-picker';

interface CommentReactionsProps {
  commentId: number;
  initialLikes?: { userId: number; type?: string }[];
  totalLikes?: number;
  onOpenLikesModal: (commentId: number) => void;
  className?: string;
}

export function CommentReactions({
  commentId,
  initialLikes = [],
  totalLikes = 0,
  onOpenLikesModal,
  className = '',
}: CommentReactionsProps) {
  const { user, token } = useAuth();
  const { openAuthModal } = useAuthModal();

  const [currentReaction, setCurrentReaction] = useState<ReactionType | null>(() => {
    if (!user || !initialLikes) return null;
    const userLike = initialLikes.find((l) => l.userId === user.id);
    return userLike ? ((userLike.type as ReactionType) || 'LIKE') : null;
  });
  const [likesCount, setLikesCount] = useState<number>(totalLikes || initialLikes.length || 0);
  const [reactionsList, setReactionsList] = useState(initialLikes);
  const [isDockOpen, setIsDockOpen] = useState(false);
  const [dockOffset, setDockOffset] = useState<number>(0);
  const [hoveredReaction, setHoveredReaction] = useState<ReactionType | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const suppressClickRef = useRef<boolean>(false);

  useEffect(() => {
    if (user && initialLikes) {
      const userLike = initialLikes.find((l) => l.userId === user.id);
      setCurrentReaction(userLike ? ((userLike.type as ReactionType) || 'LIKE') : null);
      setReactionsList(initialLikes);
    }
    setLikesCount(totalLikes || initialLikes.length || 0);
  }, [user, initialLikes, totalLikes]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, []);

  const activeMeta = currentReaction ? getReactionMeta(currentReaction) : null;

  // Extract top reaction types for the summary badge
  const topReactions = useMemo(() => {
    const counts: Record<string, number> = {};
    reactionsList.forEach((l) => {
      const type = (l.type as ReactionType) || 'LIKE';
      counts[type] = (counts[type] || 0) + 1;
    });
    if (Object.keys(counts).length === 0 && likesCount > 0) {
      return [currentReaction || 'LIKE'];
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type]) => type as ReactionType);
  }, [reactionsList, likesCount, currentReaction]);

  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const triggerRect = containerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const estimatedDockWidth = 300;
    const padding = 8;

    let shift = 0;
    if (triggerRect.left + estimatedDockWidth > viewportWidth - padding) {
      shift = (viewportWidth - padding) - (triggerRect.left + estimatedDockWidth);
    }
    if (triggerRect.left + shift < padding) {
      shift = padding - triggerRect.left;
    }
    setDockOffset(shift);
  }, []);

  const openDock = useCallback(() => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    updatePosition();
    setIsDockOpen(true);
  }, [updatePosition]);

  const handleMouseEnter = () => {
    openDock();
  };

  const handleMouseLeave = () => {
    leaveTimeoutRef.current = setTimeout(() => {
      setIsDockOpen(false);
      setHoveredReaction(null);
    }, 200);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    suppressClickRef.current = false;

    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);

    longPressTimerRef.current = setTimeout(() => {
      suppressClickRef.current = true;
      try {
        if ('vibrate' in navigator) navigator.vibrate(15);
      } catch {}
      openDock();
    }, 280);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPosRef.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
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
  };

  // Close dock on outside click
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

  const handleMainButtonClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }

    if (!token) {
      openAuthModal({
        title: 'React to this comment',
        description: 'Sign up or log in to react to comments.',
      });
      return;
    }
    if (isDockOpen) {
      setIsDockOpen(false);
    }
    if (currentReaction) {
      handleRemoveReaction();
    } else {
      handleSelectReaction('LIKE');
    }
  };

  const handleSelectReaction = async (type: ReactionType) => {
    if (!token) {
      openAuthModal({
        title: 'React to this comment',
        description: 'Sign up or log in to react to comments.',
      });
      return;
    }

    setIsDockOpen(false);
    setHoveredReaction(null);

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

    try {
      const response = await fetch(`${API_URL}/posts/comments/${commentId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type }),
      });
      if (!response.ok) {
        throw new Error('Failed to react to comment');
      }
      const data = await response.json();
      if (typeof data.totalLikes === 'number') {
        setLikesCount(data.totalLikes);
      }
      if (Array.isArray(data.likes)) {
        setReactionsList(data.likes);
      }
    } catch {
      setCurrentReaction(prevReaction);
      setLikesCount(prevCount);
      setReactionsList(prevList);
    }
  };

  const handleRemoveReaction = async () => {
    if (!token || !currentReaction) return;

    setIsDockOpen(false);
    setHoveredReaction(null);

    const prevReaction = currentReaction;
    const prevCount = likesCount;
    const prevList = reactionsList;

    const nextCount = Math.max(0, prevCount - 1);
    const nextList = user ? reactionsList.filter((l) => l.userId !== user.id) : reactionsList;

    setCurrentReaction(null);
    setLikesCount(nextCount);
    setReactionsList(nextList);

    try {
      const response = await fetch(`${API_URL}/posts/comments/${commentId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type: prevReaction }),
      });
      if (!response.ok) {
        throw new Error('Failed to remove reaction');
      }
      const data = await response.json();
      if (typeof data.totalLikes === 'number') {
        setLikesCount(data.totalLikes);
      }
      if (Array.isArray(data.likes)) {
        setReactionsList(data.likes);
      }
    } catch {
      setCurrentReaction(prevReaction);
      setLikesCount(prevCount);
      setReactionsList(prevList);
    }
  };

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      {/* Reaction Trigger with Floating Dock */}
      <div
        ref={containerRef}
        className="relative inline-flex items-center"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Floating Reaction Dock Anchor with Horizontal Clamping */}
        <div
          style={{
            transform: `translateX(${dockOffset}px)`,
          }}
          className="absolute bottom-full left-0 mb-1.5 z-40 transition-transform duration-150 ease-out origin-bottom-left"
        >
          {/* Reaction Dock Bar */}
          <div
            className={`flex items-center gap-1 p-1 rounded-full bg-white dark:bg-[#141414] border border-slate-200 dark:border-white/10 shadow-xl transition-all duration-150 ${
              isDockOpen
                ? 'opacity-100 scale-100 pointer-events-auto'
                : 'opacity-0 scale-90 pointer-events-none'
            }`}
            role="toolbar"
            aria-label="Comment reaction options"
          >
            {REACTIONS.map((r) => {
              const isHovered = hoveredReaction === r.key;
              const isSelected = currentReaction === r.key;
              return (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => handleSelectReaction(r.key)}
                  onMouseEnter={() => setHoveredReaction(r.key)}
                  onMouseLeave={() => setHoveredReaction(null)}
                  className={`relative grid size-7 place-items-center transition-transform duration-150 cursor-pointer touch-manipulation ${
                    isHovered
                      ? 'scale-130 z-10 -translate-y-1'
                      : isSelected
                      ? 'scale-110 -translate-y-0.5'
                      : 'hover:scale-125'
                  }`}
                  aria-label={r.label}
                  title={r.label}
                >
                  <ReactionIconRenderer type={r.key} size={20} />
                  {isHovered && (
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-md bg-slate-900 dark:bg-black text-[9px] font-semibold text-white pointer-events-none whitespace-nowrap shadow-md animate-in fade-in duration-100">
                      {r.label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Reaction Action Button */}
        <button
          type="button"
          onClick={handleMainButtonClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          className={`inline-flex items-center gap-1 text-[12px] font-semibold transition-colors cursor-pointer select-none leading-none py-1 px-1.5 rounded hover:bg-slate-200/50 dark:hover:bg-white/[0.06] touch-manipulation ${
            activeMeta
              ? activeMeta.activeColor
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
          aria-label={activeMeta ? `Reacted ${activeMeta.label}` : 'Like comment'}
        >
          {activeMeta ? (
            <>
              <ReactionIconRenderer type={activeMeta.key} size={13} />
              <span>{activeMeta.label}</span>
            </>
          ) : (
            <span>Like</span>
          )}
        </button>
      </div>

      {/* Clickable Reactions Breakdown Badge */}
      {likesCount > 0 && (
        <button
          type="button"
          onClick={() => onOpenLikesModal(commentId)}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200/80 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] text-[10px] font-medium text-slate-600 dark:text-slate-300 transition-colors cursor-pointer select-none"
          title="See who reacted to this comment"
          aria-label={`${likesCount} reactions. Click to view list`}
        >
          <span className="flex items-center -space-x-1">
            {topReactions.map((type, idx) => (
              <span key={idx} className="relative z-10 inline-block size-3 rounded-full bg-white dark:bg-[#181818] shadow-2xs">
                <ReactionIconRenderer type={type} size={12} />
              </span>
            ))}
          </span>
          <span className="font-semibold">{likesCount}</span>
        </button>
      )}
    </div>
  );
}
