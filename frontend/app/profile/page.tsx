'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../components/auth-provider';

export default function ProfilePage() {
  const router = useRouter();
  const { user, token, ready } = useAuth();

  useEffect(() => {
    if (!ready) return;
    if (user) router.replace(`/profile/${encodeURIComponent(user.username)}`);
  }, [ready, router, user]);

  if (!ready || user) return <div className="p-8 text-sm text-slate-500 dark:text-slate-400" role="status">Opening your profile…</div>;
  if (!token) return (
    <div className="m-6 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0d0d0d] p-8 shadow-xs text-slate-900 dark:text-slate-100">
      <h1 className="text-2xl font-semibold">Your profile</h1>
      <p className="my-4 text-slate-500 dark:text-slate-400">Log in to view your profile.</p>
      <Link href="/login" className="inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-accent-text hover:bg-accent-hover transition-colors">
        Log in
      </Link>
    </div>
  );
  return <div className="p-8 text-sm text-red-700 dark:text-rose-400">Unable to load your profile.</div>;
}
