'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';
import { AccountControls } from './account-controls';
import { BrandLogo } from './brand-logo';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === '/login' || pathname === '/register') return <main id="main-content" className="min-h-dvh bg-white dark:bg-[#000000] text-slate-900 dark:text-slate-100">{children}</main>;
  return (
    <>
      <header className="sticky top-0 z-50 flex h-14 w-full items-center justify-between gap-4 border-b border-slate-200/80 bg-white px-4 dark:border-white/[0.08] dark:bg-black md:px-6">
        <Link href="/" className="group flex items-center shrink-0" aria-label="Common Ground home">
          <BrandLogo size="default" />
        </Link>
        <AccountControls />
      </header>
      <div className="min-h-[calc(100dvh-56px)] w-full bg-[#f7f8f7] dark:bg-[#000000] md:pl-[200px] lg:pl-[220px]">
        <Sidebar />
        <main id="main-content" className="w-full min-w-0 pb-24 md:pb-0">{children}</main>
      </div>
    </>
  );
}
