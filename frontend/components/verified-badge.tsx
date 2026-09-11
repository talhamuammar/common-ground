'use client';

import { useId } from 'react';

export function VerifiedBadge({
  size = 18,
  className = '',
  title = 'Verified account',
}: {
  size?: number;
  className?: string;
  title?: string;
}) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const sheenId = `premium-verified-sheen-${id}`;
  const specularId = `premium-verified-specular-${id}`;

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 select-none align-middle ${className}`}
      title={title}
      aria-label={title}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-[0_1.5px_3px_rgba(2,132,199,0.4)] drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]"
      >
        <defs>
          {/* Deep sapphire-to-sky luxury gradient */}
          <linearGradient
            id={sheenId}
            x1="3"
            y1="2"
            x2="21"
            y2="22"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="35%" stopColor="#0284c7" />
            <stop offset="70%" stopColor="#0369a1" />
            <stop offset="100%" stopColor="#075985" />
          </linearGradient>

          {/* 3D Specular highlight for polished jewel/enamel depth */}
          <radialGradient
            id={specularId}
            cx="12"
            cy="7"
            r="10"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
            <stop offset="60%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 12-lobed luxury rosette base */}
        <path
          d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.67-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.34 2.19c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91c-1.31.67-2.19 1.91-2.19 3.34s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z"
          fill={`url(#${sheenId})`}
        />

        {/* Specular enamel overlay */}
        <path
          d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.67-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.34 2.19c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91c-1.31.67-2.19 1.91-2.19 3.34s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z"
          fill={`url(#${specularId})`}
        />

        {/* Polished hairline rim highlight */}
        <path
          d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.67-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.34 2.19c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91c-1.31.67-2.19 1.91-2.19 3.34s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z"
          stroke="#FFFFFF"
          strokeWidth="0.5"
          strokeOpacity="0.35"
        />

        {/* High-visibility solid white geometric checkmark */}
        <path
          d="M10.54 16.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z"
          fill="#FFFFFF"
        />
      </svg>
    </span>
  );
}

