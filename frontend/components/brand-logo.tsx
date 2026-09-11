'use client';

import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'default' | 'lg' | 'xl';
  variant?: 'lowercase' | 'title';
  className?: string;
}

export function BrandLogo({
  size = 'default',
  variant = 'lowercase',
  className = '',
}: BrandLogoProps) {
  const isTitle = variant === 'title';
  const firstWord = isTitle ? 'Common' : 'common';
  const secondWord = isTitle ? 'Ground' : 'ground';

  const sizeStyles = {
    sm: 'text-[15px]',
    default: 'text-[18px] sm:text-[19px]',
    lg: 'text-[23px] sm:text-[25px]',
    xl: 'text-[28px] sm:text-[32px]',
  }[size];

  return (
    <span
      className={`inline-flex items-baseline font-['Plus_Jakarta_Sans',var(--font-inter),sans-serif] font-black tracking-[-0.045em] leading-none select-none transition-colors ${sizeStyles} ${className}`}
    >
      <span className="text-slate-900 dark:text-white transition-colors duration-200">
        {firstWord}
      </span>
      <span className="text-accent-fg ml-[2px] transition-colors duration-200">
        {secondWord}
      </span>
    </span>
  );
}
