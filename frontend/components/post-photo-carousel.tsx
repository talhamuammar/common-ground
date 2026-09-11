'use client';

import React, { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PostPhotoCarouselProps {
  imageUrls: string[];
  onPhotoClick?: (index: number) => void;
  className?: string;
  containerHeightClass?: string;
}

export function PostPhotoCarousel({
  imageUrls,
  onPhotoClick,
  className = '',
  containerHeightClass = 'h-[380px] sm:h-[480px] md:h-[540px] lg:h-[580px]',
}: PostPhotoCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef<number>(0);

  if (!imageUrls || imageUrls.length === 0) return null;

  const total = imageUrls.length;
  const isMulti = total > 1;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev < total - 1 ? prev + 1 : prev));
  };

  const handleDotClick = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setCurrentIndex(index);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null) return;
    const threshold = 40;
    if (touchDeltaX.current > threshold && currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    } else if (touchDeltaX.current < -threshold && currentIndex < total - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
    touchStartX.current = null;
    touchDeltaX.current = 0;
  };

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden bg-slate-100/80 dark:bg-[#121212] border border-slate-200/80 dark:border-white/[0.08] select-none group/carousel cursor-pointer ${className}`}
      onClick={() => onPhotoClick?.(currentIndex)}
      onTouchStart={isMulti ? handleTouchStart : undefined}
      onTouchMove={isMulti ? handleTouchMove : undefined}
      onTouchEnd={isMulti ? handleTouchEnd : undefined}
    >
      <div className={`relative w-full overflow-hidden ${containerHeightClass}`}>
        {/* Horizontal Sliding Track */}
        <div
          className="flex h-full w-full transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {imageUrls.map((url, idx) => (
            <div
              key={idx}
              className="relative w-full h-full shrink-0 flex items-center justify-center overflow-hidden bg-transparent"
            >
              {/* Rich ambient blurred background filling entire box smoothly without dark corner falloff */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  aria-hidden="true"
                  className="absolute -inset-24 w-[calc(100%+192px)] h-[calc(100%+192px)] object-cover filter blur-3xl opacity-75 dark:opacity-60 scale-150 pointer-events-none"
                />
              </div>

              {/* Main Photo (contained, elevated with clean subtle shadow) */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Photo ${idx + 1}`}
                className="relative z-10 max-h-full max-w-full object-contain pointer-events-none select-none drop-shadow-sm dark:drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)]"
                loading={idx === 0 ? 'eager' : 'lazy'}
                draggable={false}
              />
            </div>
          ))}
        </div>

        {/* Counter Pill (Top Right): e.g. 1/3 */}
        {isMulti && (
          <div className="absolute top-2.5 right-2.5 z-20 rounded-full bg-black/60 backdrop-blur-md px-2 py-0.5 text-[10.5px] font-medium text-white tracking-wide shadow-xs pointer-events-none border border-white/10">
            {currentIndex + 1}/{total}
          </div>
        )}

        {/* Left Arrow Navigator */}
        {isMulti && currentIndex > 0 && (
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 grid size-8 sm:size-8.5 place-items-center rounded-full bg-black/60 hover:bg-black/85 text-white backdrop-blur-md shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95 border border-white/10"
            title="Previous photo"
            aria-label="Previous photo"
          >
            <ChevronLeft size={17} strokeWidth={2.5} />
          </button>
        )}

        {/* Right Arrow Navigator */}
        {isMulti && currentIndex < total - 1 && (
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 grid size-8 sm:size-8.5 place-items-center rounded-full bg-black/60 hover:bg-black/85 text-white backdrop-blur-md shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95 border border-white/10"
            title="Next photo"
            aria-label="Next photo"
          >
            <ChevronRight size={17} strokeWidth={2.5} />
          </button>
        )}

        {/* Dot Navigator (Bottom Center) - Sleek, Small Instagram Style */}
        {isMulti && (
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10 shadow-xs">
            {imageUrls.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => handleDotClick(e, idx)}
                className={`transition-all duration-200 rounded-full cursor-pointer ${idx === currentIndex
                  ? 'size-1.5 bg-white scale-110 shadow-xs'
                  : 'size-1 bg-white/50 hover:bg-white/80'
                  }`}
                aria-label={`Go to photo ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
