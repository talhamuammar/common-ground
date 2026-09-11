import { Suspense } from 'react';
import { Feed } from '../components/feed';
import { RightSidebar } from '../components/right-sidebar';

export default function HomePage() {
  return (
    <div className="grid min-h-[calc(100dvh-56px)] grid-cols-1 min-[1200px]:grid-cols-[minmax(0,1fr)_310px] min-[1450px]:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 w-full bg-[#f7f8f7] px-[18px] pb-8 pt-6 md:p-[34px_36px_60px] min-[1450px]:px-12 dark:bg-[#000000]">
        <header className="mb-6">
          <div className="flex items-center gap-2">
            <span className="inline-block size-2 rounded-full bg-accent animate-pulse" />
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-fg">Live Community Feed</p>
          </div>
          <h1 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Common ground, shared stories.
          </h1>
        </header>
        <Suspense fallback={<div className="rounded-2xl border border-zinc-100 bg-white dark:border-white/[0.08] dark:bg-[#0d0d0d] animate-pulse p-8 text-sm text-muted dark:text-slate-400">Loading your community…</div>}>
          <Feed />
        </Suspense>
      </div>
      <Suspense fallback={<aside className="hidden min-[1200px]:block w-[310px] border-l border-slate-200/80 bg-[#fdfdfd] dark:border-white/[0.08] dark:bg-[#080808] p-6" />}>
        <RightSidebar />
      </Suspense>
    </div>
  );
}
