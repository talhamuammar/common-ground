'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Icon } from './icons';

export function FeedRetry() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <button type="button" disabled={pending} onClick={() => startTransition(() => router.refresh())} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-zinc-200 px-5 text-sm font-semibold hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50">{pending ? 'Trying again…' : 'Try again'}<Icon name="arrow" size={16}/></button>;
}
