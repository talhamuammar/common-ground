'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { X, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { mediaUrl } from '../lib/api';
import { UserAvatar } from './user-avatar';
import { VerifiedBadge } from './verified-badge';

export interface FullscreenMediaModalProps {
  src?: string;
  images?: string[];
  initialIndex?: number;
  title: string;
  subtitle?: string;
  author?: {
    username: string;
    fullName?: string | null;
    avatarUrl?: string | null;
    isVerified?: boolean;
  };
  onClose: () => void;
}

export function FullscreenMediaModal({
  src,
  images = [],
  initialIndex = 0,
  title,
  subtitle,
  author,
  onClose,
}: FullscreenMediaModalProps) {
  // Normalize photo list
  const photoList = images.length > 0 ? images : src ? [src] : [];
  const [currentIndex, setCurrentIndex] = useState(() => {
    if (initialIndex >= 0 && initialIndex < photoList.length) return initialIndex;
    return 0;
  });

  const currentSrc = photoList[currentIndex] || src || '';
  const fullUrl = mediaUrl(currentSrc) || currentSrc;

  const handlePrev = useCallback(() => {
    if (photoList.length <= 1) return;
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photoList.length - 1));
  }, [photoList.length]);

  const handleNext = useCallback(() => {
    if (photoList.length <= 1) return;
    setCurrentIndex((prev) => (prev < photoList.length - 1 ? prev + 1 : 0));
  }, [photoList.length]);

  // Listen for keyboard navigation
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, handlePrev, handleNext]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xs p-2 sm:p-4 md:p-6 animate-in fade-in duration-200"
    >
      {/* Top Bar Close Button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-50 grid size-10 place-items-center rounded-full bg-black/80 text-white shadow-2xl hover:bg-black hover:scale-105 border border-white/25 transition-all cursor-pointer"
        aria-label="Close photo view"
      >
        <X size={20} strokeWidth={2.2} />
      </button>

      {/* Main Image Container Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col w-full h-full max-w-5xl rounded-2xl border border-white/[0.1] bg-[#0d0d0d] shadow-2xl overflow-hidden animate-in zoom-in-[0.98] duration-150"
      >
        {/* Modal Header */}
        <header className="flex items-center justify-between gap-3 border-b border-white/[0.08] bg-[#121212] px-4 py-3 sm:px-6 shrink-0">
          <div className="flex min-w-0 items-center gap-3">
            {author && (
              <Link
                href={`/profile/${encodeURIComponent(author.username)}`}
                onClick={onClose}
                className="shrink-0"
              >
                <UserAvatar
                  src={author.avatarUrl}
                  name={author.fullName || author.username}
                  className="size-9 rounded-full border border-white/10"
                />
              </Link>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                {author ? (
                  <>
                    <Link
                      href={`/profile/${encodeURIComponent(author.username)}`}
                      onClick={onClose}
                      className="truncate text-xs sm:text-sm font-bold text-white hover:text-accent-fg hover:underline flex items-center gap-1"
                    >
                      <span>{author.fullName || author.username}</span>
                      {author.isVerified && <VerifiedBadge size={14} />}
                    </Link>
                    <span className="text-[11px] text-slate-400">@{author.username}</span>
                  </>
                ) : (
                  <span className="text-xs sm:text-sm font-bold text-white">{title}</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-accent-fg bg-accent-subtle px-2 py-0.5 rounded-full border border-accent-subtle-border">
                  <ImageIcon size={10} />
                  <span>{title}</span>
                </span>
                {photoList.length > 1 && (
                  <span className="text-[11px] font-semibold text-white/80 bg-white/10 px-2 py-0.5 rounded-full">
                    {currentIndex + 1} / {photoList.length}
                  </span>
                )}
                {subtitle && <span className="text-[10px] text-slate-400">{subtitle}</span>}
              </div>
            </div>
          </div>

        </header>

        {/* Center Canvas: Full High-Resolution Image + Navigation Controls */}
        <div className="flex-1 flex items-center justify-center p-2 sm:p-4 bg-black overflow-hidden relative select-none">
          {/* Ambient blurred background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={`blur-${fullUrl}`}
              src={fullUrl}
              alt=""
              aria-hidden="true"
              className="absolute -inset-20 w-[calc(100%+160px)] h-[calc(100%+160px)] object-cover filter blur-3xl opacity-50 scale-150 pointer-events-none"
            />
          </div>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={fullUrl}
            src={fullUrl}
            alt={`${title} - photo ${currentIndex + 1}`}
            className="relative z-10 max-h-full max-w-full object-contain rounded-lg shadow-2xl transition-opacity duration-150 animate-in fade-in drop-shadow-[0_8px_30px_rgba(0,0,0,0.8)]"
          />

          {/* Navigation Arrows (if multiple photos) */}
          {photoList.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 grid size-10 place-items-center rounded-full bg-black/60 hover:bg-black/90 text-white/90 border border-white/10 hover:border-white/25 shadow-xl transition-all cursor-pointer"
                title="Previous photo (←)"
                aria-label="Previous photo"
              >
                <ChevronLeft size={22} strokeWidth={2.2} />
              </button>

              <button
                type="button"
                onClick={handleNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 grid size-10 place-items-center rounded-full bg-black/60 hover:bg-black/90 text-white/90 border border-white/10 hover:border-white/25 shadow-xl transition-all cursor-pointer"
                title="Next photo (→)"
                aria-label="Next photo"
              >
                <ChevronRight size={22} strokeWidth={2.2} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
