'use client';

import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
}

/**
 * Modern Lightweight Like Icon
 * Crisp sapphire-blue circular badge with clean white thumbs-up hand
 */
export function ModernLikeIcon({ size = 20, className = '' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none shrink-0 ${className}`}
    >
      <circle cx="16" cy="16" r="14" fill="#1877F2" />
      <path
        d="M6 13C7 8 11 4.8 16 4.8C21 4.8 25 8 26 13"
        stroke="#93C5FD"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.6"
      />
      {/* Wrist Cuff */}
      <rect x="7.5" y="15.5" width="3" height="8" rx="1.2" fill="#F8FAFC" />
      {/* Thumbs-up palm & thumb */}
      <path
        d="M10.8 15.8H13.6C14.3 15.8 14.8 15.3 15.1 14.6L16.2 10.4C16.5 9.3 17.4 8.6 18.4 8.7C19.2 8.8 19.8 9.5 19.8 10.3V14H22.3C23.3 14 24.1 14.9 23.9 15.9L22.7 21.8C22.5 22.7 21.7 23.4 20.8 23.4H10.8V15.8Z"
        fill="#FFFFFF"
      />
      {/* Subtle finger creases */}
      <path d="M14.5 18H19.5" stroke="#CBD5E1" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M14.5 20.5H19" stroke="#CBD5E1" strokeWidth="0.8" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Modern Lightweight Love Icon
 * Vibrant ruby-rose heart with smooth glossy highlight
 */
export function ModernLoveIcon({ size = 20, className = '' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none shrink-0 ${className}`}
    >
      <path
        d="M16 28C15.4 28 14.8 27.7 14.3 27.2C8.5 21.8 3.5 17.4 3.5 11.5C3.5 6.6 7.2 3 11.9 3C14.7 3 17 4.2 18.4 6.1C19.8 4.2 22.1 3 24.9 3C29.6 3 33.3 6.6 33.3 11.5C33.3 17.4 28.3 21.8 22.5 27.2C22 27.7 21.4 28 20.8 28H16Z"
        transform="scale(0.88) translate(2.2, 1.2)"
        fill="#F43F5E"
      />
      <path
        d="M9 7.5C7.2 9 6.2 11.2 6.5 13.5"
        stroke="#FFFFFF"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.75"
      />
      <circle cx="21" cy="7.5" r="1.3" fill="#FFFFFF" opacity="0.6" />
    </svg>
  );
}

/**
 * Modern Lightweight Celebrate Icon
 * Golden party popper with vibrant colorful confetti bursts
 */
export function ModernCelebrateIcon({ size = 20, className = '' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none shrink-0 ${className}`}
    >
      <path
        d="M3.8 28.2C3.3 27.7 3.5 26.6 4.1 26L18.2 11.8C18.8 11.2 20 11.4 20.5 11.9L22.5 13.9C23 14.4 23.2 15.6 22.6 16.2L8.5 30.3C7.9 30.9 6.8 30.7 6.3 30.2L3.8 28.2Z"
        fill="#F59E0B"
      />
      <path d="M7 25L14 18" stroke="#F43F5E" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M11 27L18 20" stroke="#06B6D4" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M18.5 11.5L23 16" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" opacity="0.8" />
      {/* Confetti sparks */}
      <circle cx="25" cy="5.5" r="2.2" fill="#0EA5E9" />
      <circle cx="15.5" cy="5" r="1.8" fill="#10B981" />
      <circle cx="28.5" cy="12.5" r="2" fill="#F43F5E" />
      <circle cx="19.5" cy="8" r="1.5" fill="#FBBF24" />
      <circle cx="27" cy="21.5" r="1.4" fill="#34D399" />
      <path
        d="M22 18C24 17 25.5 19 27.5 18C28.5 17.5 29.5 16 30 15"
        stroke="#A855F7"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Modern Lightweight Laugh Icon
 * Joyful golden orb with squinting laughing eyes, wide smile & tears of joy
 */
export function ModernLaughIcon({ size = 20, className = '' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none shrink-0 ${className}`}
    >
      <circle cx="16" cy="16" r="14" fill="#FBBF24" />
      {/* Specular forehead shine */}
      <ellipse cx="16" cy="7.5" rx="8" ry="3" fill="#FEF08A" opacity="0.6" />
      {/* Joyful arched squint eyes */}
      <path d="M8.5 12C9.8 9.8 12.5 9.8 13.8 12" stroke="#78350F" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M18.2 12C19.5 9.8 22.2 9.8 23.5 12" stroke="#78350F" strokeWidth="2.2" strokeLinecap="round" />
      {/* Big open laughing mouth */}
      <path d="M9.5 16.5C9.5 21.8 12.5 24.5 16 24.5C19.5 24.5 22.5 21.8 22.5 16.5H9.5Z" fill="#78350F" />
      <path d="M10.8 16.5C11 18.5 13.2 19 16 19C18.8 19 21 18.5 21.2 16.5H10.8Z" fill="#FFFFFF" />
      <path
        d="M13.5 21.5C14.2 20.8 15 20.5 16 20.5C17 20.5 17.8 20.8 18.5 21.5C17.5 23.2 14.5 23.2 13.5 21.5Z"
        fill="#F43F5E"
      />
      {/* Sparkling tears of joy */}
      <path
        d="M6 13.5C5 15 4.5 16.5 5.2 17.8C5.8 18.8 7 19 7.8 18.2C8.6 17.4 8.6 16 7.8 14.8L6 13.5Z"
        fill="#0EA5E9"
      />
      <circle cx="6.5" cy="16.5" r="0.8" fill="#FFFFFF" opacity="0.8" />
      <path
        d="M26 13.5C27 15 27.5 16.5 26.8 17.8C26.2 18.8 25 19 24.2 18.2C23.4 17.4 23.4 16 24.2 14.8L26 13.5Z"
        fill="#0EA5E9"
      />
      <circle cx="25.5" cy="16.5" r="0.8" fill="#FFFFFF" opacity="0.8" />
    </svg>
  );
}

/**
 * Modern Lightweight Wow Icon
 * Expressive amazed golden face with open eyes & surprised 'O' mouth
 */
export function ModernWowIcon({ size = 20, className = '' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none shrink-0 ${className}`}
    >
      <circle cx="16" cy="16" r="14" fill="#FBBF24" />
      <ellipse cx="16" cy="7.5" rx="8" ry="3" fill="#FEF08A" opacity="0.6" />
      {/* High raised eyebrows */}
      <path d="M9 8C10.5 6.8 12.5 6.8 14 8" stroke="#78350F" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M18 8C19.5 6.8 21.5 6.8 23 8" stroke="#78350F" strokeWidth="1.8" strokeLinecap="round" />
      {/* Big expressive round eyes */}
      <circle cx="11.5" cy="13.5" r="3.2" fill="#FFFFFF" />
      <circle cx="11.5" cy="13.5" r="2.2" fill="#451A03" />
      <circle cx="12.3" cy="12.5" r="0.9" fill="#FFFFFF" />
      <circle cx="20.5" cy="13.5" r="3.2" fill="#FFFFFF" />
      <circle cx="20.5" cy="13.5" r="2.2" fill="#451A03" />
      <circle cx="21.3" cy="12.5" r="0.9" fill="#FFFFFF" />
      {/* Surprised open oval mouth */}
      <ellipse cx="16" cy="21.5" rx="3.5" ry="4.5" fill="#451A03" />
    </svg>
  );
}

/**
 * Modern Lightweight Sad Icon
 * Empathetic downturned eyebrows, teary eyes and shining teardrop
 */
export function ModernSadIcon({ size = 20, className = '' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none shrink-0 ${className}`}
    >
      <circle cx="16" cy="16" r="14" fill="#FBBF24" />
      <ellipse cx="16" cy="7.5" rx="8" ry="3" fill="#FEF08A" opacity="0.6" />
      {/* Sad downturned eyebrows */}
      <path d="M9 9.5C10.5 10.8 12.5 10.8 14 9.2" stroke="#78350F" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M23 9.5C21.5 10.8 19.5 10.8 18 9.2" stroke="#78350F" strokeWidth="1.8" strokeLinecap="round" />
      {/* Downcast sympathetic eyes */}
      <circle cx="11.5" cy="14" r="2.4" fill="#451A03" />
      <circle cx="12.3" cy="13.2" r="0.9" fill="#FFFFFF" />
      <circle cx="20.5" cy="14" r="2.4" fill="#451A03" />
      <circle cx="21.3" cy="13.2" r="0.9" fill="#FFFFFF" />
      {/* Sad downturned mouth curve */}
      <path d="M12.5 22.5C13.5 20.8 18.5 20.8 19.5 22.5" stroke="#78350F" strokeWidth="2.2" strokeLinecap="round" />
      {/* Glistening cyan teardrop on left cheek */}
      <path
        d="M8.2 16.5C7.2 18 7 19.5 7.8 20.8C8.5 21.8 9.8 21.8 10.5 21C11.2 20 11 18.5 9.8 17.2L8.2 16.5Z"
        fill="#0EA5E9"
      />
      <circle cx="8.5" cy="19.5" r="0.8" fill="#FFFFFF" opacity="0.85" />
    </svg>
  );
}

/**
 * Modern Lightweight Care Icon
 * Blushing golden face peacefully hugging a glowing rosy heart
 */
export function ModernCareIcon({ size = 20, className = '' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none shrink-0 ${className}`}
    >
      <circle cx="16" cy="15" r="13.5" fill="#FBBF24" />
      <ellipse cx="16" cy="7" rx="7.5" ry="2.8" fill="#FEF08A" opacity="0.6" />
      {/* Blushing rosy cheeks */}
      <circle cx="8" cy="16.5" r="2.5" fill="#FB7185" opacity="0.65" />
      <circle cx="24" cy="16.5" r="2.5" fill="#FB7185" opacity="0.65" />
      {/* Peaceful smiling eyes */}
      <path d="M9.5 12.5C10.5 11 12.5 11 13.5 12.5" stroke="#78350F" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M18.5 12.5C19.5 11 21.5 11 22.5 12.5" stroke="#78350F" strokeWidth="1.8" strokeLinecap="round" />
      {/* Mini smiling mouth */}
      <path d="M14.5 16C15.2 17 16.8 17 17.5 16" stroke="#78350F" strokeWidth="1.5" strokeLinecap="round" />
      {/* Cradled Ruby Heart */}
      <path
        d="M16 28C15.5 28 15 27.7 14.5 27.2C10.5 23.2 7.5 20.2 7.5 16.5C7.5 13.5 9.8 11.5 12.8 11.5C14.5 11.5 15.5 12.2 16 13C16.5 12.2 17.5 11.5 19.2 11.5C22.2 11.5 24.5 13.5 24.5 16.5C24.5 20.2 21.5 23.2 17.5 27.2C17 27.7 16.5 28 16 28Z"
        transform="scale(0.58) translate(11.5, 14.5)"
        fill="#F43F5E"
      />
      {/* Hugging hands */}
      <ellipse cx="11.5" cy="24" rx="2.4" ry="1.8" fill="#FDE68A" stroke="#D97706" strokeWidth="0.8" />
      <ellipse cx="20.5" cy="24" rx="2.4" ry="1.8" fill="#FDE68A" stroke="#D97706" strokeWidth="0.8" />
    </svg>
  );
}

/**
 * Modern Lightweight Biting Lip Icon (🫦)
 * Voluptuous glossy crimson lips with white teeth gently biting down
 */
/**
 * Modern Authentic Biting Lip Emoji (🫦)
 * Uses native Unicode 14.0 biting lip emoji glyph, delivering the exact authentic design
 * on iOS (Apple), Android (Google), Windows (Fluent), and across all modern browsers.
 */
export function ModernBitingLipIcon({ size = 20, className = '' }: IconProps) {
  const scaledSize = Math.round(size * 0.88);
  return (
    <span
      role="img"
      aria-label="🫦"
      className={`inline-flex items-center justify-center leading-none select-none shrink-0 ${className}`}
      style={{
        fontSize: `${scaledSize}px`,
        width: `${size}px`,
        height: `${size}px`,
        lineHeight: 1,
        fontFamily:
          '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Twemoji", "Android Emoji", sans-serif',
      }}
    >
      🫦
    </span>
  );
}

// Full backwards compatibility aliases
export const PremiumLikeIcon = ModernLikeIcon;
export const PremiumLoveIcon = ModernLoveIcon;
export const PremiumCelebrateIcon = ModernCelebrateIcon;
export const PremiumLaughIcon = ModernLaughIcon;
export const PremiumWowIcon = ModernWowIcon;
export const PremiumSadIcon = ModernSadIcon;
export const PremiumCareIcon = ModernCareIcon;
export const PremiumBitingLipIcon = ModernBitingLipIcon;

/**
 * Universal Reaction Icon Dispatcher
 */
export function ReactionIconRenderer({
  type,
  size = 18,
  className = '',
}: {
  type?: string | null;
  size?: number;
  className?: string;
}) {
  switch (type?.toUpperCase()) {
    case 'LOVE':
    case 'HEART':
      return <ModernLoveIcon size={size} className={className} />;
    case 'CELEBRATE':
      return <ModernCelebrateIcon size={size} className={className} />;
    case 'LAUGH':
      return <ModernLaughIcon size={size} className={className} />;
    case 'WOW':
      return <ModernWowIcon size={size} className={className} />;
    case 'SAD':
    case 'CRY':
      return <ModernSadIcon size={size} className={className} />;
    case 'CARE':
    case 'SUPPORT':
      return <ModernCareIcon size={size} className={className} />;
    case 'BITING_LIP':
    case 'LIP_BITE':
    case 'LIPS':
    case 'BITE':
      return <ModernBitingLipIcon size={size} className={className} />;
    case 'LIKE':
    default:
      return <ModernLikeIcon size={size} className={className} />;
  }
}
