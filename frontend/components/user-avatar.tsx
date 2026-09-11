'use client';

import { useState } from 'react';
import { mediaUrl } from '../lib/api';

export function UserAvatar({
  src,
  name,
  className,
  shape = 'circle',
}: {
  src?: string | null;
  name?: string | null;
  className: string;
  sizes?: string;
  shape?: 'circle' | 'square';
}) {
  const [imageError, setImageError] = useState(false);
  const url = mediaUrl(src);
  const initial = (name || 'CG').trim().slice(0, 1).toUpperCase() || 'C';
  const roundedClass = shape === 'square' ? 'rounded-2xl sm:rounded-[26px]' : 'rounded-full';

  return (
    <span
      className={`relative grid select-none place-items-center overflow-hidden ${roundedClass} bg-slate-100 text-slate-700 dark:bg-[#181818] dark:text-slate-200 font-bold ${className}`}
      aria-hidden="true"
    >
      {url && !imageError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          className="size-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <span>{initial}</span>
      )}
    </span>
  );
}
