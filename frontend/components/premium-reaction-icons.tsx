'use client';

import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
}

/**
 * High-fidelity, volumetric 3D Like Icon (Sculpted sapphire-blue sphere badge with glossy white thumbs-up hand, reflections, and ambient shadow)
 */
export function PremiumLikeIcon({ size = 20, className = '' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`transition-transform select-none ${className}`}
      style={{ filter: 'drop-shadow(0 2px 5px rgba(24, 119, 242, 0.45))' }}
    >
      <defs>
        {/* Rich Blue Multi-Stop Spherical Radial Gradient */}
        <radialGradient id="like_radial" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#4da3ff" />
          <stop offset="35%" stopColor="#1877f2" />
          <stop offset="75%" stopColor="#0d65d9" />
          <stop offset="100%" stopColor="#084eb0" />
        </radialGradient>

        {/* Polished Glass Gloss Highlight on Top Arc */}
        <linearGradient id="like_gloss" x1="16" y1="2.5" x2="16" y2="15" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="60%" stopColor="#ffffff" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>

        {/* Subtle Outer Rim Light */}
        <linearGradient id="like_rim" x1="16" y1="2" x2="16" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#033e8c" stopOpacity="0.9" />
        </linearGradient>

        {/* Subtle drop shadow for the white thumbs-up hand inside the badge */}
        <filter id="like_hand_shadow" x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="0" dy="1" stdDeviation="0.8" floodColor="#003580" floodOpacity="0.45" />
        </filter>
      </defs>

      {/* 3D Sphere Badge Base */}
      <circle cx="16" cy="16" r="14" fill="url(#like_radial)" stroke="url(#like_rim)" strokeWidth="0.8" />

      {/* Top Gloss Arc Highlight */}
      <ellipse cx="16" cy="7.5" rx="9" ry="4.5" fill="url(#like_gloss)" />

      {/* Sculpted 3D White Thumbs-Up Hand */}
      <g filter="url(#like_hand_shadow)">
        {/* Wrist Cuff */}
        <rect
          x="7.5"
          y="15.2"
          width="3.2"
          height="8.5"
          rx="1.2"
          fill="#f8fafc"
          stroke="#cbd5e1"
          strokeWidth="0.4"
        />

        {/* Palm, Thumb and Curled Fingers */}
        <path
          d="M10.8 15.6H13.6C14.3 15.6 14.8 15.1 15.1 14.4L16.2 10.2C16.5 9.1 17.4 8.4 18.4 8.5C19.2 8.6 19.8 9.3 19.8 10.1V13.8H22.3C23.3 13.8 24.1 14.7 23.9 15.7L22.7 21.6C22.5 22.5 21.7 23.2 20.8 23.2H10.8V15.6Z"
          fill="#ffffff"
        />

        {/* Finger Creases for realistic sculpted depth */}
        <path d="M14.5 18H20.2" stroke="#94a3b8" strokeWidth="0.7" strokeLinecap="round" opacity="0.6" />
        <path d="M14.5 20.5H19.5" stroke="#94a3b8" strokeWidth="0.7" strokeLinecap="round" opacity="0.6" />

        {/* Specular Glint on Thumb Tip */}
        <circle cx="18.2" cy="9.8" r="0.9" fill="#ffffff" />
      </g>
    </svg>
  );
}

/**
 * High-fidelity, volumetric 3D Love Icon (Polished Ruby Gemstone Heart with dynamic specular reflections)
 */
export function PremiumLoveIcon({ size = 20, className = '' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`transition-transform select-none ${className}`}
      style={{ filter: 'drop-shadow(0 2px 5px rgba(225, 29, 72, 0.4))' }}
    >
      <defs>
        <radialGradient id="love_radial" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#ff4d6d" />
          <stop offset="35%" stopColor="#f43f5e" />
          <stop offset="70%" stopColor="#e11d48" />
          <stop offset="100%" stopColor="#9f1239" />
        </radialGradient>

        <linearGradient id="love_gloss" x1="7" y1="6" x2="15" y2="18" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>

        <linearGradient id="love_rim" x1="16" y1="4" x2="16" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fda4af" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#881337" stopOpacity="0.8" />
        </linearGradient>
      </defs>

      {/* Main Heart Body */}
      <path
        d="M16 28.5C15.4 28.5 14.8 28.2 14.3 27.7C8.2 22 3 17.5 3 11.2C3 6.1 6.9 2.5 11.8 2.5C14.7 2.5 17.1 3.8 18.5 5.7C19.9 3.8 22.3 2.5 25.2 2.5C30.1 2.5 34 6.1 34 11.2C34 17.5 28.8 22 22.7 27.7C22.2 28.2 21.6 28.5 21 28.5H16Z"
        transform="scale(0.85) translate(2.5, 1.5)"
        fill="url(#love_radial)"
        stroke="url(#love_rim)"
        strokeWidth="1"
      />

      {/* Glossy Specular Highlight on Left Lobe */}
      <path
        d="M10.5 5.5C8 5.5 6.2 7.2 6.2 9.8C6.2 13 9.5 16.5 13.5 20.2L14.2 18.5C11.2 15.5 8.5 12.8 8.5 10C8.5 8.2 9.5 7.2 11 7.2C12.5 7.2 13.8 8.2 14.5 9.8L15.8 9C14.8 6.8 12.8 5.5 10.5 5.5Z"
        fill="url(#love_gloss)"
      />

      {/* Subtle Mini Catchlight on Right Lobe */}
      <circle cx="22" cy="8" r="1.5" fill="#ffffff" opacity="0.4" />
    </svg>
  );
}

/**
 * High-fidelity, volumetric 3D Celebrate Icon (Gleaming Gold Party Popper with sapphire & ruby confetti sparks)
 */
export function PremiumCelebrateIcon({ size = 20, className = '' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`transition-transform select-none ${className}`}
      style={{ filter: 'drop-shadow(0 2px 5px rgba(245, 158, 11, 0.4))' }}
    >
      <defs>
        {/* Golden Cone Gradient */}
        <linearGradient id="celeb_cone" x1="4" y1="28" x2="22" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#d97706" />
          <stop offset="35%" stopColor="#f59e0b" />
          <stop offset="70%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#fef08a" />
        </linearGradient>

        {/* Shiny Foil Stripes */}
        <linearGradient id="celeb_stripe" x1="6" y1="24" x2="18" y2="14" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f43f5e" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>

        <linearGradient id="celeb_stripe2" x1="8" y1="26" x2="16" y2="16" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>

      {/* Popper Cone Body */}
      <path
        d="M3.5 28.5C3 28 3.2 26.8 3.8 26.2L18.2 11.8C18.8 11.2 20 11.4 20.5 11.9L22.5 13.9C23 14.4 23.2 15.6 22.6 16.2L8.2 30.6C7.6 31.2 6.4 31 5.9 30.5L3.5 28.5Z"
        fill="url(#celeb_cone)"
        stroke="#b45309"
        strokeWidth="0.8"
      />

      {/* Decorative Metallic Bands on Cone */}
      <path d="M7 25L14 18" stroke="url(#celeb_stripe)" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M11 27L18 20" stroke="url(#celeb_stripe2)" strokeWidth="2.2" strokeLinecap="round" />

      {/* Specular Highlight Line on Popper Rim */}
      <path d="M18.5 11.5L23 16" stroke="#ffffff" strokeWidth="1.4" strokeLinecap="round" opacity="0.8" />

      {/* 3D Confetti Sparks & Gems */}
      {/* 4-point Sparkle Star - Sapphire */}
      <path
        d="M24 3C24 4.8 25.2 6 27 6C25.2 6 24 7.2 24 9C24 7.2 22.8 6 21 6C22.8 6 24 4.8 24 3Z"
        fill="#38bdf8"
        style={{ filter: 'drop-shadow(0 1px 2px rgba(14, 165, 233, 0.5))' }}
      />

      {/* 4-point Sparkle Star - Emerald */}
      <path
        d="M15 3C15 4.2 15.8 5 17 5C15.8 5 15 5.8 15 7C15 5.8 14.2 5 13 5C14.2 5 15 4.2 15 3Z"
        fill="#10b981"
      />

      {/* Ruby Confetti Disc */}
      <circle cx="28.5" cy="11.5" r="1.8" fill="#f43f5e" />

      {/* Violet Ribbon Streamer */}
      <path
        d="M23 18C25 17 26.5 19 28.5 18C29.5 17.5 30.5 16 31 15"
        stroke="#a855f7"
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      {/* Amber Star Gem */}
      <circle cx="18" cy="8" r="1.4" fill="#fbbf24" />
      <circle cx="27" cy="22" r="1.2" fill="#34d399" />
    </svg>
  );
}

/**
 * High-fidelity, volumetric 3D Laugh Icon (Joyful, glossy golden orb with realistic glass tears)
 */
export function PremiumLaughIcon({ size = 20, className = '' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`transition-transform select-none ${className}`}
      style={{ filter: 'drop-shadow(0 2px 5px rgba(234, 179, 8, 0.4))' }}
    >
      <defs>
        {/* Volumetric Sphere Gradient */}
        <radialGradient id="laugh_sphere" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="40%" stopColor="#facc15" />
          <stop offset="75%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#ca8a04" />
        </radialGradient>

        {/* Top Gloss */}
        <linearGradient id="laugh_gloss" x1="16" y1="3" x2="16" y2="14" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>

        {/* Glass Tear Gradient */}
        <linearGradient id="laugh_tear" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7dd3fc" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
      </defs>

      {/* Base 3D Sphere */}
      <circle cx="16" cy="16" r="13.5" fill="url(#laugh_sphere)" stroke="#b45309" strokeWidth="0.8" />

      {/* Top Glass Specular Arc */}
      <ellipse cx="16" cy="7" rx="8" ry="3.5" fill="url(#laugh_gloss)" />

      {/* Joyful Closed Arched Eyes (Crescents) */}
      <path
        d="M8.5 12C9.5 10 12.5 10 13.5 12"
        stroke="#713f12"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M18.5 12C19.5 10 22.5 10 23.5 12"
        stroke="#713f12"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* Happy Big Laughing Mouth with Depth */}
      <path
        d="M10 16.5C10 21.5 13 24 16 24C19 24 22 21.5 22 16.5H10Z"
        fill="#713f12"
      />
      {/* Upper Teeth Row */}
      <path
        d="M11 16.5C11 18 13.5 18.5 16 18.5C18.5 18.5 21 18 21 16.5H11Z"
        fill="#ffffff"
      />
      {/* Tongue */}
      <path
        d="M13.5 21C14.2 20.2 15 20 16 20C17 20 17.8 20.2 18.5 21C17.5 23 14.5 23 13.5 21Z"
        fill="#f43f5e"
      />

      {/* Sparkling Glass Teardrops of Joy */}
      <path
        d="M6 13.5C5 15 4.5 16.5 5 18C5.5 19 6.8 19.5 7.8 18.8C8.8 18 8.8 16.5 8 15L6 13.5Z"
        fill="url(#laugh_tear)"
      />
      <circle cx="6.2" cy="16.5" r="0.8" fill="#ffffff" opacity="0.8" />

      <path
        d="M26 13.5C27 15 27.5 16.5 27 18C26.5 19 25.2 19.5 24.2 18.8C23.2 18 23.2 16.5 24 15L26 13.5Z"
        fill="url(#laugh_tear)"
      />
      <circle cx="25.8" cy="16.5" r="0.8" fill="#ffffff" opacity="0.8" />
    </svg>
  );
}

/**
 * High-fidelity, volumetric 3D Wow Icon (Expressive dimensional golden orb with catchlight eyes & open mouth)
 */
export function PremiumWowIcon({ size = 20, className = '' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`transition-transform select-none ${className}`}
      style={{ filter: 'drop-shadow(0 2px 5px rgba(234, 179, 8, 0.4))' }}
    >
      <defs>
        <radialGradient id="wow_sphere" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="40%" stopColor="#facc15" />
          <stop offset="75%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#ca8a04" />
        </radialGradient>

        <linearGradient id="wow_gloss" x1="16" y1="3" x2="16" y2="14" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>

        <radialGradient id="wow_mouth" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#451a03" />
          <stop offset="100%" stopColor="#1e0a01" />
        </radialGradient>
      </defs>

      {/* 3D Sphere */}
      <circle cx="16" cy="16" r="13.5" fill="url(#wow_sphere)" stroke="#b45309" strokeWidth="0.8" />

      {/* Top Gloss */}
      <ellipse cx="16" cy="7" rx="8" ry="3.5" fill="url(#wow_gloss)" />

      {/* Raised Eyebrows */}
      <path d="M9 8C10.5 6.8 12.5 6.8 14 8" stroke="#713f12" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M18 8C19.5 6.8 21.5 6.8 23 8" stroke="#713f12" strokeWidth="1.6" strokeLinecap="round" />

      {/* Big Expressive Eye Left */}
      <circle cx="11.5" cy="13" r="3" fill="#ffffff" />
      <circle cx="11.5" cy="13" r="2" fill="#291204" />
      <circle cx="12.2" cy="12.2" r="0.8" fill="#ffffff" />

      {/* Big Expressive Eye Right */}
      <circle cx="20.5" cy="13" r="3" fill="#ffffff" />
      <circle cx="20.5" cy="13" r="2" fill="#291204" />
      <circle cx="21.2" cy="12.2" r="0.8" fill="#ffffff" />

      {/* Surprised Open Oval Mouth */}
      <ellipse cx="16" cy="21.5" rx="3.5" ry="4.5" fill="url(#wow_mouth)" stroke="#854d0e" strokeWidth="0.8" />
    </svg>
  );
}

/**
 * High-fidelity, volumetric 3D Care Icon (Warm golden-peach orb holding a glossy ruby heart)
 */
export function PremiumCareIcon({ size = 20, className = '' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`transition-transform select-none ${className}`}
      style={{ filter: 'drop-shadow(0 2px 5px rgba(244, 63, 94, 0.35))' }}
    >
      <defs>
        <radialGradient id="care_sphere" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#fed7aa" />
          <stop offset="40%" stopColor="#fbcfe8" />
          <stop offset="75%" stopColor="#f472b6" />
          <stop offset="100%" stopColor="#db2777" />
        </radialGradient>

        <linearGradient id="care_gloss" x1="16" y1="3" x2="16" y2="13" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>

        <radialGradient id="care_heart" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#ff4d6d" />
          <stop offset="100%" stopColor="#be123c" />
        </radialGradient>
      </defs>

      {/* 3D Sphere */}
      <circle cx="16" cy="15" r="13" fill="url(#care_sphere)" stroke="#be185d" strokeWidth="0.8" />

      {/* Top Gloss */}
      <ellipse cx="16" cy="6.5" rx="7.5" ry="3.2" fill="url(#care_gloss)" />

      {/* Blushing Soft Cheeks */}
      <circle cx="8" cy="16" r="2.8" fill="#fb7185" opacity="0.6" />
      <circle cx="24" cy="16" r="2.8" fill="#fb7185" opacity="0.6" />

      {/* Smiling Peaceful Eyes */}
      <path d="M10 12C11 10.5 13 10.5 14 12" stroke="#831843" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M18 12C19 10.5 21 10.5 22 12" stroke="#831843" strokeWidth="1.8" strokeLinecap="round" />

      {/* Mini Smiling Mouth */}
      <path d="M14.5 16C15.2 16.8 16.8 16.8 17.5 16" stroke="#831843" strokeWidth="1.4" strokeLinecap="round" />

      {/* Cradled Ruby Heart */}
      <path
        d="M16 27.5C15.6 27.5 15.2 27.3 14.8 26.9C10.5 22.8 7 19.5 7 15.5C7 12 9.5 9.5 13 9.5C15 9.5 16.5 10.5 17.5 11.8C18.5 10.5 20 9.5 22 9.5C25.5 9.5 28 12 28 15.5C28 19.5 24.5 22.8 20.2 26.9C19.8 27.3 19.4 27.5 19 27.5H16Z"
        transform="scale(0.55) translate(6.5, 12)"
        fill="url(#care_heart)"
        stroke="#9f1239"
        strokeWidth="1"
        style={{ filter: 'drop-shadow(0 2px 4px rgba(159, 18, 57, 0.45))' }}
      />
      <circle cx="14" cy="20.5" r="0.8" fill="#ffffff" opacity="0.7" />

      {/* Soft Hugging Hands holding the heart */}
      <ellipse cx="11.5" cy="23.5" rx="2.5" ry="1.8" fill="#fed7aa" stroke="#db2777" strokeWidth="0.8" />
      <ellipse cx="20.5" cy="23.5" rx="2.5" ry="1.8" fill="#fed7aa" stroke="#db2777" strokeWidth="0.8" />
    </svg>
  );
}

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
  switch (type) {
    case 'LOVE':
      return <PremiumLoveIcon size={size} className={className} />;
    case 'CELEBRATE':
      return <PremiumCelebrateIcon size={size} className={className} />;
    case 'LAUGH':
      return <PremiumLaughIcon size={size} className={className} />;
    case 'WOW':
      return <PremiumWowIcon size={size} className={className} />;
    case 'CARE':
    case 'SUPPORT':
      return <PremiumCareIcon size={size} className={className} />;
    case 'LIKE':
    default:
      return <PremiumLikeIcon size={size} className={className} />;
  }
}
